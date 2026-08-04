-- 028_owner_timesheet_fields.sql
-- Store each parking-spot owner's AI uprava timesheet identity on their owner
-- row: the numeric employee id (`user_id` from
-- https://ai-uprava.matheo.si/api/v1/timesheet/entries), their work email, and
-- the parking spot the timesheet app has them assigned to.
--
-- owners.id deliberately stays a UUID: spots.owner_id foreign-keys to it, and
-- owner rows are not 1:1 with employees — shared spots keep 2-3 co-owners in a
-- single row, while the ACEX pool, placeholders (Tesla S/X) and external rentals
-- (ARHEA, MIK, Reduxi) have no employee at all.
--
-- The backfill below is a snapshot of the 21 employees the API returned on
-- 2026-08-04. lib/ownerSync.ts re-syncs these three columns from the live API on
-- every poll, so this only has to make the database correct at deploy time.

ALTER TABLE owners ADD COLUMN IF NOT EXISTS timesheet_user_id INTEGER;
ALTER TABLE owners ADD COLUMN IF NOT EXISTS parking_spot TEXT;

-- Partial unique index rather than a UNIQUE constraint: one owner row per
-- employee, but any number of rows may carry no timesheet identity at all.
CREATE UNIQUE INDEX IF NOT EXISTS idx_owners_timesheet_user_id
  ON owners (timesheet_user_id) WHERE timesheet_user_id IS NOT NULL;

WITH snapshot (user_id, email, parking_spot, name) AS (
  VALUES
    (1::int, 'ales.por@abelium.com'::text,      'K1-38'::text,     'Aleš Por'::text),
    (2,      'bernard.sovdat@abelium.com',      '1VP55',           'Bernard Sovdat'),
    (3,      'boris.horvat@abelium.com',        'K1-26',           'Boris Horvat'),
    (6,      'iztok.kavkler@abelium.com',       'K1-18',           'Iztok Kavkler'),
    (8,      'jernej.borlinic@abelium.com',     'C - 1VP57',       'Jernej Borlinić'),
    (11,     'marko.boben@abelium.com',         'K1-25',           'Marko Boben'),
    (12,     'marko.stijepic@abelium.com',      'K1-10',           'Marko Stijepić'),
    (14,     'miha.burgar@abelium.com',         'K1-36',           'Miha Burgar'),
    (16,     'mitja.gornik@abelium.com',        '1VP52',           'Mitja Gornik'),
    (18,     'petra.jakovac@abelium.com',       '1VP53',           'Petra Jakovac'),
    (21,     'urska.krivc@abelium.com',         '1VP51',           'Urška Krivc'),
    (24,     'nejc.frumen@opten.si',            'K1-11',           'Nejc Frumen'),
    (26,     'alen.orbanic@abelium.com',        'K1-32',           'Alen Orbanić'),
    (28,     'barbara.kepic@acex.si',           'K1-23',           'Barbara Kepic'),
    (29,     'bostjan.kovac@abelium.com',       'K1-29',           'Boštjan Kovač'),
    (32,     'evgenija.burger@acex.si',         '2VP50',           'Evgenija Burger'),
    (36,     'katarina.rakar@acex.si',          'K1-34',           'Katarina Rakar'),
    (40,     'tadeja.gornik@acex.si',           'K1-24',           'Tadeja Gornik'),
    (41,     'tilen.sarlah@acex.si',            'K1-20',           'Tilen Šarlah'),
    (42,     'timotej.vesel@acex.si',           'K2-56',           'Timotej Vesel'),
    (173,    'primoz@abelium.com',              'K1-19',           'Primož Lukšič')
),
-- Owner rows that are not employees must never receive a timesheet identity:
-- the public pool, placeholders/vehicles and external rentals. Without this a
-- spot still parked on a placeholder row (1VP55 is owned by "Tesla X" in the
-- seed data) would be handed a real person's email. Keep in sync with
-- NOT_ACEX_OWNERS in src/lib/acexOwners.ts.
excluded AS (
  SELECT id FROM owners WHERE name IN (
    'ACEX - kdor prej pride, prej melje',
    'kontejner - prenova',
    'Tesla S',
    'Tesla X',
    'oddano v najem: MIK',
    'ARHEA',
    'Reduxi'
  )
),
-- Pass 1 — by spot: the API's parking_spot values are exactly our spots.label,
-- so this survives diacritic/spelling drift in names and still resolves shared
-- rows ("Iztok Kavkler / Jan Grošelj" owns K1-18).
by_spot AS (
  SELECT DISTINCT ON (sp.owner_id)
         sp.owner_id, s.user_id, s.email, s.parking_spot
  FROM snapshot s
  JOIN spots sp ON sp.label = s.parking_spot
  WHERE sp.owner_id IS NOT NULL
    AND sp.owner_id NOT IN (SELECT id FROM excluded)
  ORDER BY sp.owner_id, s.user_id
),
-- Pass 2 — by name, for employees whose spot has no owner row attached yet
-- (K1-23 / K1-29 / K1-38 are unassigned in the seed data). Matches a whole name
-- or one segment of a shared "A / B" row.
by_name AS (
  SELECT DISTINCT ON (o.id)
         o.id AS owner_id, s.user_id, s.email, s.parking_spot
  FROM snapshot s
  JOIN owners o ON LOWER(s.name) IN (
    SELECT TRIM(LOWER(n)) FROM unnest(string_to_array(o.name, '/')) AS t(n)
  )
  WHERE o.id NOT IN (SELECT id FROM excluded)
    AND o.id NOT IN (SELECT owner_id FROM by_spot)
    AND s.user_id NOT IN (SELECT user_id FROM by_spot)
  ORDER BY o.id, s.user_id
),
-- One row per employee AND one per owner, so neither the unique index above nor
-- an arbitrary-winner UPDATE can bite.
matched AS (
  SELECT DISTINCT ON (user_id) owner_id, user_id, email, parking_spot
  FROM (SELECT * FROM by_spot UNION ALL SELECT * FROM by_name) u
  ORDER BY user_id, owner_id
)
UPDATE owners o
SET timesheet_user_id = m.user_id,
    email             = m.email,
    parking_spot      = m.parking_spot
FROM matched m
WHERE o.id = m.owner_id;
