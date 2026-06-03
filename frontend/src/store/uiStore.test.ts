import { describe, expect, it } from 'vitest'

import { resolveInitialDate } from './uiStore'

// Mon–Fri of the week containing "today" (2026-06-02, a Tuesday).
const WEEK = [
  '2026-06-01',
  '2026-06-02',
  '2026-06-03',
  '2026-06-04',
  '2026-06-05',
]
const TODAY = '2026-06-02'

describe('resolveInitialDate', () => {
  it('uses today for a bot deep-link (?spot= with no date), ignoring a stale stored date', () => {
    // The link "where is spot X" means today — not whatever day this browser
    // last had selected. This is the reported bug: stored 2026-06-05 must not win.
    expect(resolveInitialDate('?spot=abc-123', '2026-06-05', TODAY, WEEK)).toBe(
      TODAY,
    )
  })

  it('keeps the stored date on a normal load (no spot param)', () => {
    expect(resolveInitialDate('', '2026-06-05', TODAY, WEEK)).toBe('2026-06-05')
  })

  it('falls back to today when the stored date is outside the current week', () => {
    expect(resolveInitialDate('', '2026-05-20', TODAY, WEEK)).toBe(TODAY)
  })

  it('does not force today when the deep-link carries an explicit valid date', () => {
    // An explicit ?date= is applied by the map page deep-link effect, so init
    // leaves the in-week stored date alone rather than clobbering it to today.
    expect(
      resolveInitialDate(
        '?spot=abc-123&date=2026-06-03',
        '2026-06-05',
        TODAY,
        WEEK,
      ),
    ).toBe('2026-06-05')
  })
})
