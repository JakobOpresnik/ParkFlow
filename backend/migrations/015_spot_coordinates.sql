-- 015_spot_coordinates.sql
-- Coordinates mapped reliably by spot number and lot name based on manual UI adjustments.
-- Includes: correct lot names (Klet -1 / Klet -2), spot renumbering (#6→#7, #8→#12),
-- label and EV-type assignments, and updated coordinates for moved spots.

DO $$
DECLARE
  lot_0 UUID := (SELECT id FROM parking_lots WHERE name = 'Klet -1');
  lot_1 UUID := (SELECT id FROM parking_lots WHERE name = 'Klet -2');
  lot_z UUID := (SELECT id FROM parking_lots WHERE name = 'Zunanje parkirišče');
BEGIN
  -- Klet -1 -> Spot 2 (Urška Krivc): label=1VP54, type=ev
  UPDATE spots SET label = '1VP54', type = 'ev',
    coordinates = '{"x": 0.5808333333333333, "y": 0.23, "width": 0.05333333333333334, "height": 0.04, "rotation": 135, "labelPosition": "top", "labelRotation": 180}'::jsonb
    WHERE lot_id = lot_0 AND number = 2;

  -- Klet -1 -> Spot 3 (Mitja Gornik): label=1VP53
  UPDATE spots SET label = '1VP53',
    coordinates = '{"x": 0.5183333333333333, "y": 0.23285714285714285, "width": 0.05, "height": 0.04285714285714286, "rotation": 45, "labelPosition": "top", "labelRotation": 0}'::jsonb
    WHERE lot_id = lot_0 AND number = 3;

  -- Klet -1 -> Spot 4 (Petra Jakovac): label=1VP52
  UPDATE spots SET label = '1VP52',
    coordinates = '{"x": 0.44416666666666665, "y": 0.23142857142857143, "width": 0.051666666666666666, "height": 0.04, "rotation": 45, "labelPosition": "top", "labelRotation": 0}'::jsonb
    WHERE lot_id = lot_0 AND number = 4;

  -- Klet -1 -> Spot 5 (Tesla S): label=1VP51, type=ev
  UPDATE spots SET label = '1VP51', type = 'ev',
    coordinates = '{"x": 0.36666666666666664, "y": 0.2342857142857143, "width": 0.051666666666666666, "height": 0.04285714285714286, "rotation": 45, "labelPosition": "top", "labelRotation": 0}'::jsonb
    WHERE lot_id = lot_0 AND number = 5;

  -- Klet -1 -> Spot 6 (Tesla X): renumbered to 7, label=1VP55, type=ev, moved
  UPDATE spots SET number = 7, label = '1VP55', type = 'ev',
    coordinates = '{"x": 0.6175, "y": 0.23285714285714285, "width": 0.051666666666666666, "height": 0.04285714285714286, "rotation": 315, "labelPosition": "top", "labelRotation": 0}'::jsonb
    WHERE lot_id = lot_0 AND number = 6;

  -- Klet -1 -> Spot 8 (oddano v najem: MIK): label=K1-8, moved
  -- Handles both fresh DB (number=8) and old DB that had it renumbered to 12.
  UPDATE spots SET number = 8, label = 'K1-8',
    coordinates = '{"x": 0.17583333333333334, "y": 0.41571428571428577, "width": 0.04833333333333333, "height": 0.037142857142857144, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb
    WHERE lot_id = lot_0 AND (number = 8 OR number = 12);

  -- Klet -1 -> Spot 9 (Borut Mrak)
  UPDATE spots SET coordinates = '{"x": 0.17583333333333334, "y": 0.4542857142857143, "width": 0.05, "height": 0.04, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb
    WHERE lot_id = lot_0 AND number = 9;

  -- Klet -1 -> Spot 10 (Marko Stijepić)
  UPDATE spots SET coordinates = '{"x": 0.17583333333333334, "y": 0.4957142857142857, "width": 0.05, "height": 0.04, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb
    WHERE lot_id = lot_0 AND number = 10;

  -- Klet -1 -> Spot 11 (Bernard Sovdat)
  UPDATE spots SET coordinates = '{"x": 0.17583333333333334, "y": 0.5442857142857143, "width": 0.05, "height": 0.037142857142857144, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb
    WHERE lot_id = lot_0 AND number = 11;

  -- Klet -1 -> Spot 18 (Iztok Kavkler / Jan Grošelj)
  UPDATE spots SET coordinates = '{"x": 0.4525, "y": 0.4957142857142857, "width": 0.05, "height": 0.04, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb
    WHERE lot_id = lot_0 AND number = 18;

  -- Klet -1 -> Spot 19 (Primož Lukšič): type=ev
  UPDATE spots SET type = 'ev',
    coordinates = '{"x": 0.4525, "y": 0.5371428571428571, "width": 0.05, "height": 0.04, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb
    WHERE lot_id = lot_0 AND number = 19;

  -- Klet -1 -> Spot 20 (Tilen Šarlah): type=ev
  UPDATE spots SET type = 'ev',
    coordinates = '{"x": 0.4525, "y": 0.5885714285714285, "width": 0.05, "height": 0.04, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb
    WHERE lot_id = lot_0 AND number = 20;

  -- Klet -1 -> Spot 23 (No Owner)
  UPDATE spots SET coordinates = '{"x": 0.5033333333333333, "y": 0.45285714285714285, "width": 0.05, "height": 0.04, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb
    WHERE lot_id = lot_0 AND number = 23;

  -- Klet -1 -> Spot 24 (Tadeja Gornik)
  UPDATE spots SET coordinates = '{"x": 0.5033333333333333, "y": 0.4957142857142857, "width": 0.05, "height": 0.04, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb
    WHERE lot_id = lot_0 AND number = 24;

  -- Klet -1 -> Spot 25 (Marko Boben): type=ev
  UPDATE spots SET type = 'ev',
    coordinates = '{"x": 0.5033333333333333, "y": 0.5357142857142857, "width": 0.05, "height": 0.04, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb
    WHERE lot_id = lot_0 AND number = 25;

  -- Klet -1 -> Spot 26 (Boris Horvat): type=ev
  UPDATE spots SET type = 'ev',
    coordinates = '{"x": 0.5033333333333333, "y": 0.5871428571428572, "width": 0.05, "height": 0.04, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb
    WHERE lot_id = lot_0 AND number = 26;

  -- Klet -1 -> Spot 28 (Barbara Kepic): type=ev
  UPDATE spots SET type = 'ev',
    coordinates = '{"x": 0.6675, "y": 0.45714285714285713, "width": 0.05, "height": 0.04, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb
    WHERE lot_id = lot_0 AND number = 28;

  -- Klet -1 -> Spot 29 (No Owner): type=ev
  UPDATE spots SET type = 'ev',
    coordinates = '{"x": 0.6675, "y": 0.49857142857142855, "width": 0.05, "height": 0.04, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb
    WHERE lot_id = lot_0 AND number = 29;

  -- Klet -1 -> Spot 32 (Alen Orbanić)
  UPDATE spots SET coordinates = '{"x": 0.7775, "y": 0.4157142857142857, "width": 0.051666666666666666, "height": 0.04, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb
    WHERE lot_id = lot_0 AND number = 32;

  -- Klet -1 -> Spot 33 (ARHEA)
  UPDATE spots SET coordinates = '{"x": 0.7783333333333333, "y": 0.45571428571428574, "width": 0.05, "height": 0.04, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb
    WHERE lot_id = lot_0 AND number = 33;

  -- Klet -1 -> Spot 34 (Katarina Rakar)
  UPDATE spots SET coordinates = '{"x": 0.7783333333333333, "y": 0.49714285714285716, "width": 0.05, "height": 0.04, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb
    WHERE lot_id = lot_0 AND number = 34;

  -- Klet -1 -> Spot 35 (ARHEA)
  UPDATE spots SET coordinates = '{"x": 0.7783333333333333, "y": 0.5385714285714286, "width": 0.05, "height": 0.04, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb
    WHERE lot_id = lot_0 AND number = 35;

  -- Klet -1 -> Spot 36 (Miha Burgar)
  UPDATE spots SET coordinates = '{"x": 0.7783333333333333, "y": 0.5885714285714285, "width": 0.05, "height": 0.04, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb
    WHERE lot_id = lot_0 AND number = 36;

  -- Klet -1 -> Spot 38 (No Owner)
  UPDATE spots SET coordinates = '{"x": 0.7783333333333333, "y": 0.6814285714285714, "width": 0.05, "height": 0.04, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb
    WHERE lot_id = lot_0 AND number = 38;

  -- Klet -1 -> Spot 46 (REDUXI - Tomaž Buh)
  UPDATE spots SET coordinates = '{"x": 0.32416666666666666, "y": 0.7171428571428572, "width": 0.051666666666666666, "height": 0.04, "rotation": 42, "labelPosition": "top", "labelRotation": 0}'::jsonb
    WHERE lot_id = lot_0 AND number = 46;

  -- Klet -1 -> Spot 47 (REDUXI - Primož Bečan)
  UPDATE spots SET coordinates = '{"x": 0.30583333333333335, "y": 0.75, "width": 0.051666666666666666, "height": 0.04285714285714286, "rotation": 41, "labelPosition": "top", "labelRotation": 0}'::jsonb
    WHERE lot_id = lot_0 AND number = 47;

  -- Klet -1 -> Spot 999 (Jernej Borlinić): label=C - 1VP57, updated coordinates
  UPDATE spots SET label = 'C - 1VP57',
    coordinates = '{"x": 0.6625, "y": 0.6842857142857143, "width": 0.051666666666666666, "height": 0.037142857142857144, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb
    WHERE lot_id = lot_0 AND number = 999;

  -- Klet -2 -> Spot 50 (Evgenija Burger): label=2VP50
  UPDATE spots SET label = '2VP50',
    coordinates = '{"x": 0.3925, "y": 0.23714285714285716, "width": 0.05, "height": 0.04285714285714286, "rotation": 52, "labelPosition": "top", "labelRotation": 0}'::jsonb
    WHERE lot_id = lot_1 AND number = 50;

  -- Klet -2 -> Spot 56 (Tilen Marc / Demijan Lesjak / Timotej Vesel)
  UPDATE spots SET coordinates = '{"x": 0.7783333333333333, "y": 0.27, "width": 0.05, "height": 0.037142857142857144, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb
    WHERE lot_id = lot_1 AND number = 56;

  -- Klet -2 -> Spot 95 (Boštjan Kovač / Aljaž Konečnik)
  UPDATE spots SET coordinates = '{"x": 0.7791666666666667, "y": 0.74, "width": 0.04833333333333333, "height": 0.04, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb
    WHERE lot_id = lot_1 AND number = 95;

  -- Klet -2 -> Spot 101 (K2-101)
  UPDATE spots SET coordinates = '{"x": 0.665, "y": 0.8628571428571428, "width": 0.04833333333333333, "height": 0.037142857142857144, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb
    WHERE lot_id = lot_1 AND number = 101;

  -- Zunanje parkirišče -> Spot 0 (kontejner - prenova): label=Z-0
  UPDATE spots SET coordinates = '{"x": 0.42916666666666664, "y": 0.7828571428571428, "width": 0.03, "height": 0.03571428571428571, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb
    WHERE lot_id = lot_z AND number = 0;

  -- Zunanje parkirišče -> Spot 3 (ACEX - kdor prej pride, prej melje): label=Z-3
  UPDATE spots SET coordinates = '{"x": 0.42916666666666664, "y": 0.6571428571428571, "width": 0.03, "height": 0.03428571428571429, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb
    WHERE lot_id = lot_z AND number = 3;

  -- Zunanje parkirišče -> Spot 4 (ACEX - kdor prej pride, prej melje): label=Z-4
  UPDATE spots SET coordinates = '{"x": 0.42916666666666664, "y": 0.62, "width": 0.03, "height": 0.03428571428571429, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb
    WHERE lot_id = lot_z AND number = 4;

  -- Zunanje parkirišče -> Spot 5 (ACEX - kdor prej pride, prej melje): label=Z-5
  UPDATE spots SET coordinates = '{"x": 0.42916666666666664, "y": 0.5828571428571429, "width": 0.03, "height": 0.03428571428571429, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb
    WHERE lot_id = lot_z AND number = 5;

  -- Zunanje parkirišče -> Spot 9 (ACEX - kdor prej pride, prej melje): label=Z-9
  UPDATE spots SET coordinates = '{"x": 0.42916666666666664, "y": 0.43714285714285717, "width": 0.03, "height": 0.03428571428571429, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb
    WHERE lot_id = lot_z AND number = 9;

  -- Zunanje parkirišče -> Spot 11 (ACEX - kdor prej pride, prej melje): label=Z-11
  UPDATE spots SET coordinates = '{"x": 0.42916666666666664, "y": 0.36428571428571427, "width": 0.03, "height": 0.03428571428571429, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb
    WHERE lot_id = lot_z AND number = 11;
END $$;
