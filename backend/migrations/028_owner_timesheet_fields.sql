-- Store each owner's timesheet identity (employee id, email, assigned spot).
-- owners.id stays a UUID; the 2026-08-04 backfill is re-synced live by ownerSync.ts.

ALTER TABLE owners ADD COLUMN IF NOT EXISTS timesheet_user_id INTEGER;
ALTER TABLE owners ADD COLUMN IF NOT EXISTS parking_spot TEXT;

-- Partial, so any number of rows may carry no timesheet identity.
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
-- Non-employee rows: a placeholder-owned spot (1VP55 is "Tesla X" in seed data)
-- would otherwise be handed a real person's email. Mirrors NOT_ACEX_OWNERS.
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
-- Pass 1 — by spot label (the API's parking_spot is exactly our spots.label), so
-- name spelling drift doesn't matter and shared rows still resolve.
by_spot AS (
  SELECT DISTINCT ON (sp.owner_id)
         sp.owner_id, s.user_id, s.email, s.parking_spot
  FROM snapshot s
  JOIN spots sp ON sp.label = s.parking_spot
  WHERE sp.owner_id IS NOT NULL
    AND sp.owner_id NOT IN (SELECT id FROM excluded)
  ORDER BY sp.owner_id, s.user_id
),
-- Pass 2 — by name, for employees whose spot has no owner attached yet (K1-23 /
-- K1-29 / K1-38 in seed data). Matches a whole name or one "A / B" segment.
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
-- One row per employee and per owner, so the unique index can't be violated.
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
