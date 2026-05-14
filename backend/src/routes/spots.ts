import { Router } from 'express';

import { pool } from '../db/pool.js';
import { broadcast } from '../lib/broadcast.js';
import {
  optionalAuth,
  requireAdmin,
  requireAuth,
  requireNonGuest,
} from '../middleware/auth.js';

const router = Router();

const ACEX_OWNER_NAME = 'ACEX - kdor prej pride, prej melje';
const validTypes = ['standard', 'ev', 'handicap', 'compact'];

// Base effective status: ACEX-owned spots are masked as 'free' regardless of stored status.
// 'spotted' is layered on top: when the base resolves to 'free' AND there's an active
// (non-cleared, non-expired) user report, the API returns 'spotted' instead.
const SPOT_SELECT = `
  SELECT
    s.id,
    s.number,
    s.label,
    s.floor,
    s.lot_id,
    CASE
      WHEN o.name = '${ACEX_OWNER_NAME}' AND sr.id IS NOT NULL THEN 'spotted'
      WHEN o.name = '${ACEX_OWNER_NAME}' THEN 'free'
      WHEN s.status = 'free' AND sr.id IS NOT NULL THEN 'spotted'
      ELSE s.status
    END AS status,
    s.type,
    s.coordinates,
    s.created_at,
    o.id            AS owner_id,
    o.name          AS owner_name,
    o.email         AS owner_email,
    o.phone         AS owner_phone,
    o.vehicle_plate AS owner_vehicle_plate,
    o.user_id       AS owner_user_id,
    o.notes         AS owner_notes,
    b.id               AS active_booking_id,
    b.user_id          AS active_booking_user_id,
    b.reserved_by      AS active_booking_reserved_by,
    b.starts_at        AS active_booking_starts_at,
    b.expires_at       AS active_booking_expires_at,
    b.booked_by_owner  AS active_booking_booked_by_owner,
    sr.reported_at     AS spotted_reported_at,
    sr.expires_at      AS spotted_expires_at
  FROM spots s
  LEFT JOIN owners o ON s.owner_id = o.id
  LEFT JOIN bookings b ON b.spot_id = s.id AND b.status = 'active'
  LEFT JOIN spot_spotted_reports sr
    ON sr.spot_id = s.id AND sr.cleared_at IS NULL AND sr.expires_at > now()
`;

// Strip owner contact details and booker identity from spot rows before
// returning them to a guest caller. Owner name + active booking timing remain
// so the map still shows occupancy state correctly.
function scrubSpotForGuest<T extends Record<string, unknown>>(row: T): T {
  return {
    ...row,
    owner_email: null,
    owner_phone: null,
    owner_vehicle_plate: null,
    owner_user_id: null,
    owner_notes: null,
    active_booking_user_id: null,
    active_booking_reserved_by: null,
    active_booking_booked_by_owner: null,
  };
}

// POST /api/spots/:id/spotted — user reports that a free spot is actually taken.
// Returns 412 if the spot is not currently free (already reserved/occupied/spotted/etc).
router.post(
  '/:id/spotted',
  requireAuth,
  requireNonGuest,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const spotResult = await client.query(
          `SELECT s.id, s.status, o.name AS owner_name
           FROM spots s
           LEFT JOIN owners o ON s.owner_id = o.id
           WHERE s.id = $1
           FOR UPDATE OF s`,
          [id],
        );
        if (spotResult.rows.length === 0) {
          await client.query('ROLLBACK');
          res.status(404).json({ error: 'Spot not found' });
          return;
        }
        const spotRow = spotResult.rows[0] as {
          id: string;
          status: string;
          owner_name: string | null;
        };

        // Map's effective base status: ACEX-owned spots always read as 'free'.
        const baseStatus =
          spotRow.owner_name === ACEX_OWNER_NAME ? 'free' : spotRow.status;
        if (baseStatus !== 'free') {
          await client.query('ROLLBACK');
          res
            .status(412)
            .json({ error: 'Only free spots can be reported as taken' });
          return;
        }

        // An active booking on the spot today means it's actually reserved, even
        // if status hasn't been refreshed yet — block reports in that case too.
        const bookingCheck = await client.query(
          `SELECT 1 FROM bookings
           WHERE spot_id = $1 AND status = 'active'
             AND expires_at::date = (now() AT TIME ZONE 'UTC')::date
           LIMIT 1`,
          [id],
        );
        if (bookingCheck.rows.length > 0) {
          await client.query('ROLLBACK');
          res
            .status(412)
            .json({ error: 'Only free spots can be reported as taken' });
          return;
        }

        // Existing active report? Idempotent — return it.
        const existing = await client.query(
          `SELECT id, reported_at, expires_at FROM spot_spotted_reports
           WHERE spot_id = $1 AND cleared_at IS NULL AND expires_at > now()
           LIMIT 1`,
          [id],
        );
        if (existing.rows.length > 0) {
          await client.query('COMMIT');
          res.json(existing.rows[0]);
          return;
        }

        // Clear any stale (expired but not cleared) report so the unique index allows insert.
        await client.query(
          `UPDATE spot_spotted_reports
           SET cleared_at = now(), cleared_by = 'system:expired'
           WHERE spot_id = $1 AND cleared_at IS NULL`,
          [id],
        );

        const inserted = await client.query(
          `INSERT INTO spot_spotted_reports (spot_id, reported_by, expires_at)
           VALUES ($1, $2, now() + interval '4 hours')
           RETURNING id, reported_at, expires_at`,
          [id, req.user!.username],
        );

        await client.query('COMMIT');
        broadcast();
        res.status(201).json(inserted.rows[0]);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/spots/:id/spotted — clear the active report (anyone authenticated may clear).
router.delete(
  '/:id/spotted',
  requireAuth,
  requireNonGuest,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `UPDATE spot_spotted_reports
         SET cleared_at = now(), cleared_by = $2
         WHERE spot_id = $1 AND cleared_at IS NULL AND expires_at > now()
         RETURNING id`,
        [id, req.user!.username],
      );

      if (result.rowCount === 0) {
        res.status(404).json({ error: 'No active report to clear' });
        return;
      }

      broadcast();
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/spots/day-overrides?date=YYYY-MM-DD — all per-day overrides for a date
router.get('/day-overrides', async (req, res, next) => {
  try {
    const { date } = req.query as { date?: string };
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'date query param required (YYYY-MM-DD)' });
      return;
    }
    const result = await pool.query(
      `SELECT id, spot_id, date, status, set_by
       FROM spot_day_status
       WHERE date = $1::date`,
      [date],
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// BE-1: GET /api/spots — all spots, optionally filtered by ?lot_id=
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { lot_id } = req.query as { lot_id?: string };

    let query = SPOT_SELECT;
    const params: string[] = [];

    if (lot_id) {
      query += ' WHERE s.lot_id = $1';
      params.push(lot_id);
    }
    query += ' ORDER BY s.number';

    const result = await pool.query(query, params);
    const rows =
      req.user?.role === 'guest'
        ? result.rows.map(scrubSpotForGuest)
        : result.rows;
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// BE-2: GET /api/spots/:number — single spot by number (first match across lots)
router.get('/:number', optionalAuth, async (req, res, next) => {
  try {
    const numberParam = req.params.number as string;
    const number = Number.parseInt(numberParam, 10);
    if (Number.isNaN(number)) {
      res.status(400).json({ error: 'Spot number must be an integer' });
      return;
    }

    const result = await pool.query(
      SPOT_SELECT + ' WHERE s.number = $1 ORDER BY s.number LIMIT 1',
      [number],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: `Spot ${number} not found` });
      return;
    }

    const row =
      req.user?.role === 'guest'
        ? scrubSpotForGuest(result.rows[0])
        : result.rows[0];
    res.json(row);
  } catch (err) {
    next(err);
  }
});

// GET /api/spots/:id/bookings — booking history for a specific spot.
// Guests see only the current active booking with minimal fields
// (no booker identity, no past activity).
router.get('/:id/bookings', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit } = req.query as { limit?: string };
    const maxRows = Math.min(Number.parseInt(limit ?? '50', 10) || 50, 200);

    if (req.user?.role === 'guest') {
      const guestResult = await pool.query(
        `SELECT b.id, b.status, b.starts_at, b.expires_at
         FROM bookings b
         WHERE b.spot_id = $1 AND b.status = 'active'
         ORDER BY b.booked_at DESC
         LIMIT 1`,
        [id],
      );
      res.json(guestResult.rows);
      return;
    }

    const result = await pool.query(
      `SELECT
        b.id,
        b.status,
        b.reserved_by,
        b.booked_at,
        b.starts_at,
        b.expires_at,
        b.ended_at,
        b.cancelled_by,
        b.user_id
      FROM bookings b
      WHERE b.spot_id = $1
      ORDER BY b.booked_at DESC
      LIMIT $2`,
      [id, maxRows],
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// Admin: POST /api/spots — create a new spot
router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { number, label, lot_id, status, type } = req.body as {
      number?: number;
      label?: string;
      lot_id?: string;
      status?: string;
      type?: string;
    };

    if (typeof number !== 'number' || !Number.isInteger(number) || number < 1) {
      res.status(400).json({ error: 'number must be a positive integer' });
      return;
    }
    if (!lot_id) {
      res.status(400).json({ error: 'lot_id is required' });
      return;
    }

    const validStatuses = ['free', 'occupied', 'reserved'];
    const spotStatus =
      status && validStatuses.includes(status) ? status : 'free';
    const spotType = type && validTypes.includes(type) ? type : 'standard';

    const result = await pool.query(
      `INSERT INTO spots (number, label, lot_id, status, type)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, number, label, floor, lot_id, status, type, coordinates, created_at`,
      [number, label?.trim() ?? null, lot_id, spotStatus, spotType],
    );
    broadcast();
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Admin: PUT /api/spots/:id — full update of a spot
router.put('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { number, label, lot_id, status, type } = req.body as {
      number?: number;
      label?: string;
      lot_id?: string;
      status?: string;
      type?: string;
    };

    const validStatuses = ['free', 'occupied', 'reserved'];
    if (status && !validStatuses.includes(status)) {
      res
        .status(400)
        .json({ error: `status must be one of: ${validStatuses.join(', ')}` });
      return;
    }
    if (type && !validTypes.includes(type)) {
      res
        .status(400)
        .json({ error: `type must be one of: ${validTypes.join(', ')}` });
      return;
    }

    const result = await pool.query(
      `UPDATE spots
       SET number = COALESCE($1, number),
           label  = COALESCE($2, label),
           lot_id = COALESCE($3, lot_id),
           status = COALESCE($4, status),
           type   = COALESCE($5, type)
       WHERE id = $6
       RETURNING id, number, label, floor, lot_id, status, type, coordinates, created_at`,
      [
        number ?? null,
        label !== undefined ? label?.trim() || null : null,
        lot_id ?? null,
        status ?? null,
        type ?? null,
        id,
      ],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Spot not found' });
      return;
    }
    broadcast();
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Admin: DELETE /api/spots/:id — delete a spot
router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM spots WHERE id = $1 RETURNING id',
      [id],
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Spot not found' });
      return;
    }
    broadcast();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// MAP-EDITOR: PATCH /api/spots/:id/coordinates — save or clear coordinates
router.patch(
  '/:id/coordinates',
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { coordinates } = req.body as {
        coordinates: {
          x: number;
          y: number;
          width: number;
          height: number;
          rotation: number;
          labelPosition: string;
        } | null;
      };

      if (coordinates !== null && coordinates !== undefined) {
        const { x, y, width, height, rotation } = coordinates;
        if (
          typeof x !== 'number' ||
          typeof y !== 'number' ||
          typeof width !== 'number' ||
          typeof height !== 'number' ||
          typeof rotation !== 'number'
        ) {
          res.status(400).json({
            error:
              'coordinates must have numeric x, y, width, height, rotation',
          });
          return;
        }
      }

      const result = await pool.query(
        `UPDATE spots SET coordinates = $1 WHERE id = $2
       RETURNING id, number, label, floor, lot_id, status, coordinates`,
        [coordinates != null ? JSON.stringify(coordinates) : null, id],
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Spot not found' });
        return;
      }
      broadcast();
      res.json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  },
);

// BE-3: PATCH /api/spots/:id/owner — assign or unassign owner
router.patch(
  '/:id/owner',
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { owner_id } = req.body as { owner_id: string | null };

      if (owner_id !== null && typeof owner_id !== 'string') {
        res
          .status(400)
          .json({ error: 'owner_id must be a UUID string or null' });
        return;
      }

      if (owner_id !== null) {
        const ownerCheck = await pool.query(
          'SELECT id FROM owners WHERE id = $1',
          [owner_id],
        );
        if (ownerCheck.rows.length === 0) {
          res.status(404).json({ error: 'Owner not found' });
          return;
        }
      }

      // Fetch old owner for audit log
      const before = await pool.query(
        'SELECT owner_id FROM spots WHERE id = $1',
        [id],
      );
      if (before.rows.length === 0) {
        res.status(404).json({ error: 'Spot not found' });
        return;
      }
      const oldOwnerId = before.rows[0].owner_id as string | null;

      const result = await pool.query(
        `UPDATE spots SET owner_id = $1
       WHERE id = $2
       RETURNING id, number, label, floor, lot_id, status, owner_id, coordinates`,
        [owner_id, id],
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Spot not found' });
        return;
      }

      // Audit log
      const changeType = owner_id ? 'owner_assigned' : 'owner_unassigned';
      await pool
        .query(
          `INSERT INTO spot_changes (spot_id, change_type, old_value, new_value)
       VALUES ($1, $2, $3, $4)`,
          [id, changeType, oldOwnerId, owner_id],
        )
        .catch(() => {
          /* audit log failure is non-fatal */
        });

      broadcast();
      res.json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  },
);

// BE-4: PATCH /api/spots/:id/status — update status with enum validation
router.patch(
  '/:id/status',
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body as { status: string };

      const validStatuses = ['free', 'occupied', 'reserved'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          error: `status must be one of: ${validStatuses.join(', ')}`,
        });
        return;
      }

      // Fetch old status for audit log
      const before = await pool.query(
        'SELECT status FROM spots WHERE id = $1',
        [id],
      );
      if (before.rows.length === 0) {
        res.status(404).json({ error: 'Spot not found' });
        return;
      }
      const oldStatus = before.rows[0].status as string;

      const result = await pool.query(
        `UPDATE spots SET status = $1
       WHERE id = $2
       RETURNING id, number, label, floor, lot_id, status, owner_id, coordinates`,
        [status, id],
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Spot not found' });
        return;
      }

      // Audit log
      await pool
        .query(
          `INSERT INTO spot_changes (spot_id, change_type, old_value, new_value)
       VALUES ($1, 'status_changed', $2, $3)`,
          [id, oldStatus, status],
        )
        .catch(() => {
          /* audit log failure is non-fatal */
        });

      broadcast();
      res.json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/spots/:id/type — update spot type with enum validation
router.patch('/:id/type', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type } = req.body as { type: string };

    if (!validTypes.includes(type)) {
      res
        .status(400)
        .json({ error: `type must be one of: ${validTypes.join(', ')}` });
      return;
    }

    // Fetch old type for audit log
    const before = await pool.query('SELECT type FROM spots WHERE id = $1', [
      id,
    ]);
    if (before.rows.length === 0) {
      res.status(404).json({ error: 'Spot not found' });
      return;
    }
    const oldType = before.rows[0].type as string;

    const result = await pool.query(
      `UPDATE spots SET type = $1
       WHERE id = $2
       RETURNING id, number, label, floor, lot_id, status, type, owner_id, coordinates`,
      [type, id],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Spot not found' });
      return;
    }

    // Audit log
    await pool
      .query(
        `INSERT INTO spot_changes (spot_id, change_type, old_value, new_value)
       VALUES ($1, 'type_changed', $2, $3)`,
        [id, oldType, type],
      )
      .catch(() => {
        /* audit log failure is non-fatal */
      });

    broadcast();
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
