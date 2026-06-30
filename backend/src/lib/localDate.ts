// Single source of truth for "which calendar day is it in Slovenia" — used
// wherever a UTC instant must be reduced to the local (Europe/Ljubljana) day.
// Using toISOString().slice(0,10) instead gives the UTC day, which is wrong for
// the 1–2 h after local midnight and for any booking whose timestamp sits near
// the UTC date boundary. Always go through this helper.
export function ljubljanaDate(at: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Ljubljana',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at)
}
