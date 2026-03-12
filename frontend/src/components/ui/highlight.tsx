export function Highlight({
  text,
  query,
}: {
  readonly text: string
  readonly query: string
}) {
  if (!query.trim()) return <>{text}</>
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark
            key={i}
            className="rounded-sm bg-yellow-200 px-0.5 text-yellow-900 dark:bg-yellow-500/30 dark:text-yellow-300"
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  )
}
