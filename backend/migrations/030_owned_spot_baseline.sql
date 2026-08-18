-- Booking cycles left owned (non-ACEX) spots stored as 'free'; restore their 'occupied' baseline
UPDATE spots s
SET status = 'occupied'
FROM owners o
WHERE o.id = s.owner_id
  AND o.name <> 'ACEX - kdor prej pride, prej melje'
  AND s.status = 'free';
