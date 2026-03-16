import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../app.js";

vi.mock("../db/pool.js", () => ({
  pool: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}));

const { pool } = await import("../db/pool.js");
const mockQuery = pool.query as ReturnType<typeof vi.fn>;
const mockConnect = pool.connect as ReturnType<typeof vi.fn>;

const TEST_USER = { userId: "user-1", username: "admin", role: "admin" };
const AUTH_HEADER = "Bearer dummy-authentik-token";

function stubAuthFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sub: TEST_USER.userId,
        preferred_username: TEST_USER.username,
        groups: ["parkflow-admins"],
      }),
    }),
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  stubAuthFetch();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const app = createApp();

describe("POST /api/bookings", () => {
  it("returns 401 without token", async () => {
    vi.unstubAllGlobals(); // no fetch stub — no auth header sent
    const res = await request(app)
      .post("/api/bookings")
      .send({ spot_id: "spot-1" });
    expect(res.status).toBe(401);
  });

  it("returns 400 when spot_id is missing", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // expire stale

    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", AUTH_HEADER)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/spot_id/);
  });

  it("auto-cancels existing booking and creates new one", async () => {
    const mockClient = {
      query: vi
        .fn()
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              id: "spot-1",
              status: "free",
              number: 5,
              label: "A5",
              floor: "P1",
              owner_name: null,
            },
          ],
        }) // SELECT spot FOR UPDATE
        .mockResolvedValueOnce({
          rows: [{ id: "old-booking", spot_id: "spot-2" }],
        }) // SELECT existing booking FOR UPDATE
        .mockResolvedValueOnce({}) // UPDATE bookings cancel old
        .mockResolvedValueOnce({ rows: [] }) // SELECT other active for old spot
        .mockResolvedValueOnce({}) // UPDATE spots free old spot
        .mockResolvedValueOnce({ rows: [] }) // SELECT booking conflict
        .mockResolvedValueOnce({ rows: [] }) // SELECT spot_day_status
        .mockResolvedValueOnce({}) // UPDATE spots reserved
        .mockResolvedValueOnce({
          rows: [
            {
              id: "booking-2",
              status: "active",
              booked_at: new Date().toISOString(),
              starts_at: null,
              expires_at: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
              ended_at: null,
            },
          ],
        }) // INSERT booking
        .mockResolvedValueOnce({}), // COMMIT
      release: vi.fn(),
    };

    mockQuery.mockResolvedValueOnce({ rows: [] }); // expire stale
    mockConnect.mockResolvedValueOnce(mockClient);

    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", AUTH_HEADER)
      .send({ spot_id: "spot-1" });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("active");
    expect(mockClient.release).toHaveBeenCalled();
  });

  it("returns 409 when spot is not free", async () => {
    const mockClient = {
      query: vi
        .fn()
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              id: "spot-1",
              status: "occupied",
              number: 5,
              label: null,
              floor: 1,
              owner_name: null,
            },
          ],
        }) // SELECT spot FOR UPDATE
        .mockResolvedValueOnce({ rows: [] }) // SELECT existing booking
        .mockResolvedValueOnce({ rows: [] }) // SELECT booking conflict
        .mockResolvedValueOnce({ rows: [] }) // SELECT spot_day_status
        .mockResolvedValueOnce({}), // ROLLBACK
      release: vi.fn(),
    };

    mockQuery.mockResolvedValueOnce({ rows: [] }); // expire stale
    mockConnect.mockResolvedValueOnce(mockClient);

    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", AUTH_HEADER)
      .send({ spot_id: "spot-1" });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/not available/);
  });

  it("returns 201 and creates booking for a free spot", async () => {
    const mockClient = {
      query: vi
        .fn()
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              id: "spot-1",
              status: "free",
              number: 5,
              label: "A5",
              floor: "P1",
              owner_name: null,
            },
          ],
        }) // SELECT spot FOR UPDATE
        .mockResolvedValueOnce({ rows: [] }) // SELECT existing booking
        .mockResolvedValueOnce({ rows: [] }) // SELECT booking conflict
        .mockResolvedValueOnce({ rows: [] }) // SELECT spot_day_status
        .mockResolvedValueOnce({}) // UPDATE spots reserved
        .mockResolvedValueOnce({
          rows: [
            {
              id: "booking-1",
              status: "active",
              booked_at: new Date().toISOString(),
              starts_at: null,
              expires_at: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
              ended_at: null,
            },
          ],
        }) // INSERT booking
        .mockResolvedValueOnce({}), // COMMIT
      release: vi.fn(),
    };

    mockQuery.mockResolvedValueOnce({ rows: [] }); // expire stale
    mockConnect.mockResolvedValueOnce(mockClient);

    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", AUTH_HEADER)
      .send({ spot_id: "spot-1" });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("active");
    expect(res.body.spot_number).toBe(5);
  });
});

describe("PATCH /api/bookings/:id/cancel", () => {
  it("returns 401 without token", async () => {
    vi.unstubAllGlobals();
    const res = await request(app).patch("/api/bookings/booking-1/cancel");
    expect(res.status).toBe(401);
  });

  it("returns 404 for non-existent booking", async () => {
    const mockClient = {
      query: vi
        .fn()
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // SELECT booking JOIN spots LEFT JOIN owners
        .mockResolvedValueOnce({}), // ROLLBACK
      release: vi.fn(),
    };
    mockConnect.mockResolvedValueOnce(mockClient);

    const res = await request(app)
      .patch("/api/bookings/non-existent/cancel")
      .set("Authorization", AUTH_HEADER);

    expect(res.status).toBe(404);
  });

  it("returns 409 when booking is already cancelled", async () => {
    const mockClient = {
      query: vi
        .fn()
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              id: "b1",
              user_id: TEST_USER.userId,
              spot_id: "s1",
              status: "cancelled",
              spot_owner_username: null,
            },
          ],
        }) // SELECT booking
        .mockResolvedValueOnce({}), // ROLLBACK
      release: vi.fn(),
    };
    mockConnect.mockResolvedValueOnce(mockClient);

    const res = await request(app)
      .patch("/api/bookings/b1/cancel")
      .set("Authorization", AUTH_HEADER);

    expect(res.status).toBe(409);
  });

  it("cancels an active booking successfully", async () => {
    const mockClient = {
      query: vi
        .fn()
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              id: "b1",
              user_id: TEST_USER.userId,
              spot_id: "s1",
              status: "active",
              spot_owner_username: null,
            },
          ],
        }) // SELECT booking JOIN spots LEFT JOIN owners FOR UPDATE
        .mockResolvedValueOnce({}) // UPDATE bookings cancel
        .mockResolvedValueOnce({ rows: [] }) // SELECT remaining active bookings
        .mockResolvedValueOnce({}) // UPDATE spots free
        .mockResolvedValueOnce({}), // COMMIT
      release: vi.fn(),
    };
    mockConnect.mockResolvedValueOnce(mockClient);

    const res = await request(app)
      .patch("/api/bookings/b1/cancel")
      .set("Authorization", AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe("GET /api/bookings/my", () => {
  it("returns 401 without token", async () => {
    vi.unstubAllGlobals();
    const res = await request(app).get("/api/bookings/my");
    expect(res.status).toBe(401);
  });

  it("returns bookings array for authenticated user", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // expire stale
      .mockResolvedValueOnce({
        rows: [
          {
            id: "b1",
            status: "active",
            booked_at: new Date().toISOString(),
            expires_at: new Date().toISOString(),
            ended_at: null,
            spot_id: "s1",
            spot_number: 3,
            spot_label: "A3",
            spot_floor: "P1",
          },
        ],
      });

    const res = await request(app)
      .get("/api/bookings/my")
      .set("Authorization", AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].spot_number).toBe(3);
  });
});
