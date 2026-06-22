// Deterministic per-user avatar tint: hashes a seed (e.g. username) to a stable
// bg + text class pair from a fixed palette, so the same person always gets the
// same color across the app. Entries are full literal class names (so Tailwind
// can see them) and each carries a dark-mode variant.
const AVATAR_PALETTE = [
  'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400',
  'bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400',
  'bg-teal-500/15 text-teal-700 dark:text-teal-400',
] as const

export function avatarColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length]!
}
