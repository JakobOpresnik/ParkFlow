-- 015_spot_coordinates.sql
-- Coordinates mapped reliably by spot number and lot name based on manual UI adjustments.

DO $$
DECLARE
  lot_0 UUID := (SELECT id FROM parking_lots WHERE name = 'Klet -1');
  lot_1 UUID := (SELECT id FROM parking_lots WHERE name = 'Klet -2');
BEGIN
  -- Klet -1 -> Spot 2 (Urška Krivc)
  UPDATE spots SET coordinates = '{"x": 0.5808333333333333, "y": 0.23, "width": 0.05333333333333334, "height": 0.04, "rotation": 135, "labelPosition": "top", "labelRotation": 180}'::jsonb WHERE lot_id = lot_0 AND number = 2;
  -- Klet -1 -> Spot 3 (Mitja Gornik)
  UPDATE spots SET coordinates = '{"x": 0.5183333333333333, "y": 0.23285714285714285, "width": 0.05, "height": 0.04285714285714286, "rotation": 45, "labelPosition": "top", "labelRotation": 0}'::jsonb WHERE lot_id = lot_0 AND number = 3;
  -- Klet -1 -> Spot 4 (Petra Jakovac)
  UPDATE spots SET coordinates = '{"x": 0.44416666666666665, "y": 0.23142857142857143, "width": 0.051666666666666666, "height": 0.04, "rotation": 45, "labelPosition": "top", "labelRotation": 0}'::jsonb WHERE lot_id = lot_0 AND number = 4;
  -- Klet -1 -> Spot 5 (Tesla S)
  UPDATE spots SET coordinates = '{"x": 0.37, "y": 0.2342857142857143, "width": 0.05, "height": 0.04285714285714286, "rotation": 44, "labelPosition": "top", "labelRotation": 0}'::jsonb WHERE lot_id = lot_0 AND number = 5;
  -- Klet -1 -> Spot 6 (Tesla X)
  UPDATE spots SET coordinates = '{"x": 0.2983333333333333, "y": 0.22428571428571428, "width": 0.051666666666666666, "height": 0.04285714285714286, "rotation": 347, "labelPosition": "top", "labelRotation": 0}'::jsonb WHERE lot_id = lot_0 AND number = 6;
  -- Klet -1 -> Spot 8 (Borut Mrak)
  UPDATE spots SET coordinates = '{"x": 0.20166666666666666, "y": 0.33285714285714285, "width": 0.05, "height": 0.04285714285714286, "rotation": 135, "labelPosition": "top", "labelRotation": 180}'::jsonb WHERE lot_id = lot_0 AND number = 8;
  -- Klet -1 -> Spot 9 (oddano v najem: MIK)
  UPDATE spots SET coordinates = '{"x": 0.17583333333333334, "y": 0.4542857142857143, "width": 0.05, "height": 0.04, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb WHERE lot_id = lot_0 AND number = 9;
  -- Klet -1 -> Spot 10 (Marko Stijepić)
  UPDATE spots SET coordinates = '{"x": 0.17583333333333334, "y": 0.4957142857142857, "width": 0.05, "height": 0.04, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb WHERE lot_id = lot_0 AND number = 10;
  -- Klet -1 -> Spot 11 (Bernard Sovdat)
  UPDATE spots SET coordinates = '{"x": 0.17583333333333334, "y": 0.5442857142857143, "width": 0.05, "height": 0.037142857142857144, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb WHERE lot_id = lot_0 AND number = 11;
  -- Klet -1 -> Spot 18 (Iztok Kavkler / Jan Grošelj)
  UPDATE spots SET coordinates = '{"x": 0.4525, "y": 0.4957142857142857, "width": 0.05, "height": 0.04, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb WHERE lot_id = lot_0 AND number = 18;
  -- Klet -1 -> Spot 19 (Primož Lukšič)
  UPDATE spots SET coordinates = '{"x": 0.4525, "y": 0.5371428571428571, "width": 0.05, "height": 0.04, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb WHERE lot_id = lot_0 AND number = 19;
  -- Klet -1 -> Spot 20 (Tilen Šarlah)
  UPDATE spots SET coordinates = '{"x": 0.4525, "y": 0.5885714285714285, "width": 0.05, "height": 0.04, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb WHERE lot_id = lot_0 AND number = 20;
  -- Klet -1 -> Spot 23 (No Owner)
  UPDATE spots SET coordinates = '{"x": 0.5033333333333333, "y": 0.45285714285714285, "width": 0.05, "height": 0.04, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb WHERE lot_id = lot_0 AND number = 23;
  -- Klet -1 -> Spot 24 (Tadeja Gornik)
  UPDATE spots SET coordinates = '{"x": 0.5033333333333333, "y": 0.4957142857142857, "width": 0.05, "height": 0.04, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb WHERE lot_id = lot_0 AND number = 24;
  -- Klet -1 -> Spot 25 (Marko Boben)
  UPDATE spots SET coordinates = '{"x": 0.5033333333333333, "y": 0.5357142857142857, "width": 0.05, "height": 0.04, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb WHERE lot_id = lot_0 AND number = 25;
  -- Klet -1 -> Spot 26 (Boris Horvat)
  UPDATE spots SET coordinates = '{"x": 0.5033333333333333, "y": 0.5871428571428572, "width": 0.05, "height": 0.04, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb WHERE lot_id = lot_0 AND number = 26;
  -- Klet -1 -> Spot 27 (Barbara Kepic)
  UPDATE spots SET coordinates = '{"x": 0.6675, "y": 0.41714285714285715, "width": 0.05, "height": 0.04, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb WHERE lot_id = lot_0 AND number = 27;
  -- Klet -1 -> Spot 28 (No Owner)
  UPDATE spots SET coordinates = '{"x": 0.6675, "y": 0.45714285714285713, "width": 0.05, "height": 0.04, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb WHERE lot_id = lot_0 AND number = 28;
  -- Klet -1 -> Spot 29 (No Owner)
  UPDATE spots SET coordinates = '{"x": 0.6675, "y": 0.49857142857142855, "width": 0.05, "height": 0.04, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb WHERE lot_id = lot_0 AND number = 29;
  -- Klet -1 -> Spot 32 (Alen Orbanić)
  UPDATE spots SET coordinates = '{"x": 0.7775, "y": 0.4157142857142857, "width": 0.051666666666666666, "height": 0.04, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb WHERE lot_id = lot_0 AND number = 32;
  -- Klet -1 -> Spot 33 (ARHEA)
  UPDATE spots SET coordinates = '{"x": 0.7783333333333333, "y": 0.45571428571428574, "width": 0.05, "height": 0.04, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb WHERE lot_id = lot_0 AND number = 33;
  -- Klet -1 -> Spot 34 (Katarina Rakar)
  UPDATE spots SET coordinates = '{"x": 0.7783333333333333, "y": 0.49714285714285716, "width": 0.05, "height": 0.04, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb WHERE lot_id = lot_0 AND number = 34;
  -- Klet -1 -> Spot 35 (ARHEA)
  UPDATE spots SET coordinates = '{"x": 0.7783333333333333, "y": 0.5385714285714286, "width": 0.05, "height": 0.04, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb WHERE lot_id = lot_0 AND number = 35;
  -- Klet -1 -> Spot 36 (Miha Burgar)
  UPDATE spots SET coordinates = '{"x": 0.7783333333333333, "y": 0.5885714285714285, "width": 0.05, "height": 0.04, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb WHERE lot_id = lot_0 AND number = 36;
  -- Klet -1 -> Spot 38 (No Owner)
  UPDATE spots SET coordinates = '{"x": 0.7783333333333333, "y": 0.6814285714285714, "width": 0.05, "height": 0.04, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb WHERE lot_id = lot_0 AND number = 38;
  -- Klet -1 -> Spot 46 (REDUXI - Tomaž Buh)
  UPDATE spots SET coordinates = '{"x": 0.32416666666666666, "y": 0.7171428571428572, "width": 0.051666666666666666, "height": 0.04, "rotation": 42, "labelPosition": "top", "labelRotation": 0}'::jsonb WHERE lot_id = lot_0 AND number = 46;
  -- Klet -1 -> Spot 47 (REDUXI - Primož Bečan)
  UPDATE spots SET coordinates = '{"x": 0.30583333333333335, "y": 0.75, "width": 0.051666666666666666, "height": 0.04285714285714286, "rotation": 41, "labelPosition": "top", "labelRotation": 0}'::jsonb WHERE lot_id = lot_0 AND number = 47;
  -- Klet -1 -> Spot 999 (Jernej Borlinić)
  UPDATE spots SET coordinates = '{"x": 0.6633333333333333, "y": 0.6814285714285714, "width": 0.051666666666666666, "height": 0.04285714285714286, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb WHERE lot_id = lot_0 AND number = 999;
  -- Klet -2 -> Spot 50 (Evgenija Burger)
  UPDATE spots SET coordinates = '{"x": 0.3925, "y": 0.23714285714285716, "width": 0.05, "height": 0.04285714285714286, "rotation": 52, "labelPosition": "top", "labelRotation": 0}'::jsonb WHERE lot_id = lot_1 AND number = 50;
  -- Klet -2 -> Spot 56 (Tilen Marc / Demijan Lesjak / Timotej Vesel)
  UPDATE spots SET coordinates = '{"x": 0.7783333333333333, "y": 0.27, "width": 0.05, "height": 0.037142857142857144, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb WHERE lot_id = lot_1 AND number = 56;
  -- Klet -2 -> Spot 95 (Boštjan Kovač / Aljaž Konečnik)
  UPDATE spots SET coordinates = '{"x": 0.7791666666666667, "y": 0.74, "width": 0.04833333333333333, "height": 0.04, "rotation": 0, "labelPosition": "top", "labelRotation": 0}'::jsonb WHERE lot_id = lot_1 AND number = 95;
END $$;
