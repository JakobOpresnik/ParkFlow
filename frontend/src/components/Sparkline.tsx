// Minimal inline-SVG sparkline: a single polyline with a soft area fill and an
// end dot. Color comes from `currentColor`, so the parent controls it via text
// color. Renders nothing for fewer than two points.
interface SparklineProps {
  readonly values: readonly number[]
  readonly width?: number
  readonly height?: number
  readonly className?: string
}

const PAD = 3

export function Sparkline({
  values,
  width = 96,
  height = 28,
  className,
}: SparklineProps) {
  if (values.length < 2) return null

  const max = Math.max(1, ...values)
  const stepX = width / (values.length - 1)
  const innerH = height - PAD * 2

  const pts = values.map((v, i) => ({
    x: i * stepX,
    y: PAD + innerH - (v / max) * innerH,
  }))
  const line = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ')
  const last = pts[pts.length - 1]!
  const area = `${line} L${width},${height} L0,${height} Z`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
      aria-hidden
    >
      <path d={area} fill="currentColor" opacity={0.12} />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last.x} cy={last.y} r={2} fill="currentColor" />
    </svg>
  )
}
