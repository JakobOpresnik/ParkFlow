// Owner-name classification shared across the chat integration and the owners
// API. The `owners` roster mixes real ACEX staff with the public pool,
// placeholders/vehicles, and external companies/rentals. There is no DB flag
// for this distinction, so the exclusion list is maintained by hand — add new
// external/placeholder owner names here as they are created (see
// migrations/005_real_parking_data.sql for the seed set).

// The ACEX company pool ("first come, first served") — public, not a personal spot.
export const ACEX_OWNER_NAME = 'ACEX - kdor prej pride, prej melje';

// Owner rows that are NOT ACEX employees — the public pool, placeholders/
// vehicles, and external companies/rentals. Excluded from employee-only views.
export const NOT_ACEX_OWNERS = new Set<string>([
  ACEX_OWNER_NAME,
  'kontejner - prenova',
  'Tesla S',
  'Tesla X',
  'oddano v najem: MIK',
  'ARHEA',
  'Reduxi',
]);
