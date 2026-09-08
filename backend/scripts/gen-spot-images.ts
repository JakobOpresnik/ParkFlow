// One-off generator: renders a cropped, app-styled PNG of every spot's location
// on its floor plan into frontend/public/spots/<spot_id>.png. Never runs in
// prod — the bot's morning DM just links these static files.
// Re-run after changing spot coordinates or a floor plan: bun run gen:spot-images
import { readFileSync, writeFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

import { Resvg } from '@resvg/resvg-js'
import { Pool } from 'pg'

const PLAN_DIR = resolve(import.meta.dirname, '../../frontend/public')
const OUT_DIR = resolve(PLAN_DIR, 'spots')
const OUT_WIDTH = 900
const CROP_ASPECT = 4 / 3
// How much floor plan to show around the spot, as a multiple of its longest side.
const CROP_ZOOM = 9
// Width the whole plan is rasterized at before cropping — roughly OUT_WIDTH
// times the zoom, so a crop still looks sharp.
const PLAN_RASTER_WIDTH = 3600

interface Coords {
  x: number
  y: number
  width: number
  height: number
  rotation: number
  labelPosition: 'top' | 'bottom' | 'left' | 'right'
  labelRotation: number
}

export interface Row {
  id: string
  label: string | null
  number: number
  coordinates: Coords | null
  image_filename: string
  image_width: number
  image_height: number
}

// Same back-compat rule as the frontend map: values <= 1 are relative to the
// plan size, anything larger is legacy absolute viewBox pixels.
function toAbsolute(c: Coords, iw: number, ih: number): Coords {
  if (c.x > 1 || c.y > 1 || c.width > 1 || c.height > 1) return c
  return {
    ...c,
    x: c.x * iw,
    y: c.y * ih,
    width: c.width * iw,
    height: c.height * ih,
  }
}

// The plan is rasterized ONCE per lot and embedded as a data URI. Inlining the
// SVG instead makes resvg abort the process on some CAD exports as soon as the
// outer viewBox crops into them, and re-parsing a 5 MB plan per spot is slow.
const planCache = new Map<string, string>()

function planDataUri(filename: string): string {
  const cached = planCache.get(filename)
  if (cached) return cached
  const png = new Resvg(readFileSync(resolve(PLAN_DIR, filename), 'utf8'), {
    fitTo: { mode: 'width', value: PLAN_RASTER_WIDTH },
  })
    .render()
    .asPng()
  const uri = `data:image/png;base64,${png.toString('base64')}`
  planCache.set(filename, uri)
  return uri
}

function spotRect(c: Coords, label: string | null): string {
  const cx = c.x + c.width / 2
  const cy = c.y + c.height / 2
  const box = `x="${c.x}" y="${c.y}" width="${c.width}" height="${c.height}"`
  if (label === null) {
    return `<g transform="rotate(${c.rotation}, ${cx}, ${cy})"><rect ${box} fill="rgba(0,0,0,0.04)" stroke="rgba(0,0,0,0.35)" stroke-width="1.5"/></g>`
  }
  const fontSize = Math.max(10, Math.min(22, c.height * 0.45))
  const lp = labelAnchor(c, fontSize)
  return `<g transform="rotate(${c.rotation}, ${cx}, ${cy})">
    <rect ${box} fill="none" stroke="white" stroke-width="8"/>
    <rect ${box} fill="rgba(59,130,246,0.45)" stroke="rgba(37,99,235,0.95)" stroke-width="3"/>
    <text x="${lp.x}" y="${lp.y}" text-anchor="${lp.anchor}" dominant-baseline="middle"
      font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700"
      fill="#FFF" stroke="rgba(0,0,0,0.5)" stroke-width="3" paint-order="stroke"
      transform="${c.labelRotation ? `rotate(${c.labelRotation}, ${lp.x}, ${lp.y})` : ''}">${label}</text>
  </g>`
}

function labelAnchor(
  c: Coords,
  fontSize: number,
): { x: number; y: number; anchor: string } {
  const cx = c.x + c.width / 2
  const cy = c.y + c.height / 2
  switch (c.labelPosition) {
    case 'top':
      return { x: cx, y: c.y + fontSize, anchor: 'middle' }
    case 'bottom':
      return { x: cx, y: c.y + c.height - 4, anchor: 'middle' }
    case 'left':
      return { x: c.x + 4, y: cy, anchor: 'start' }
    default:
      return { x: c.x + c.width - 4, y: cy, anchor: 'end' }
  }
}

// Blueprint grid + off-white ground, matching BLUEPRINT_LIGHT on the map page.
const GRID = `<defs>
  <pattern id="g-minor" width="20" height="20" patternUnits="userSpaceOnUse">
    <path d="M20 0H0V20" fill="none" stroke="rgba(0,0,0,0.025)" stroke-width="1"/>
  </pattern>
  <pattern id="g-major" width="100" height="100" patternUnits="userSpaceOnUse">
    <rect width="100" height="100" fill="url(#g-minor)"/>
    <path d="M100 0H0V100" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="1"/>
  </pattern>
</defs>`

// Degenerate geometry (a NULL lot dimension, a zero-size rect) makes resvg
// abort the whole process instead of throwing, so it is rejected up front.
export function cropOf(
  target: Row,
): { vx: number; vy: number; cw: number; ch: number } | string {
  const { image_width: iw, image_height: ih } = target
  const c = target.coordinates
  if (!c) return 'no coordinates'
  const nums = [iw, ih, c.x, c.y, c.width, c.height]
  if (!nums.every((n) => typeof n === 'number' && Number.isFinite(n))) {
    return `non-numeric geometry (lot ${iw}x${ih}, rect ${JSON.stringify(c)})`
  }
  if (iw <= 0 || ih <= 0) return `lot has no size (${iw}x${ih})`
  const a = toAbsolute(c, iw, ih)
  if (a.width <= 0 || a.height <= 0) {
    return `spot has no size (${a.width}x${a.height})`
  }
  const span = Math.max(a.width, a.height) * CROP_ZOOM
  const cw = Math.min(span * CROP_ASPECT, iw)
  const ch = Math.min(span, ih)
  if (cw <= 0 || ch <= 0) return `empty crop (${cw}x${ch})`
  return {
    vx: Math.max(0, Math.min(a.x + a.width / 2 - cw / 2, iw - cw)),
    vy: Math.max(0, Math.min(a.y + a.height / 2 - ch / 2, ih - ch)),
    cw,
    ch,
  }
}

export function buildSvg(target: Row, siblings: Row[]): string {
  const { image_width: iw, image_height: ih } = target
  const c = toAbsolute(target.coordinates!, iw, ih)
  const crop = cropOf(target)
  if (typeof crop === 'string') throw new Error(crop)
  const { cw, ch } = crop
  const { vx, vy } = crop
  const others = siblings
    .filter((s) => s.id !== target.id && s.coordinates)
    .map((s) => spotRect(toAbsolute(s.coordinates!, iw, ih), null))
    .join('\n')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${cw} ${ch}" width="${OUT_WIDTH}" height="${Math.round(OUT_WIDTH / CROP_ASPECT)}">
  ${GRID}
  <rect x="${vx}" y="${vy}" width="${cw}" height="${ch}" fill="#fafafa"/>
  <rect x="${vx}" y="${vy}" width="${cw}" height="${ch}" fill="url(#g-major)"/>
  <image x="0" y="0" width="${iw}" height="${ih}" preserveAspectRatio="xMidYMid meet" href="${planDataUri(target.image_filename)}"/>
  ${others}
  ${spotRect(c, target.label ?? String(target.number))}
</svg>`
}

if (import.meta.main) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  const { rows } = await pool.query<Row>(`
    SELECT s.id::text, s.label, s.number, s.coordinates,
           l.image_filename, l.image_width, l.image_height
    FROM spots s
    JOIN parking_lots l ON l.id = s.lot_id
    WHERE s.coordinates IS NOT NULL
    ORDER BY l.sort_order, s.number
  `)
  await pool.end()

  await mkdir(OUT_DIR, { recursive: true })
  const byLot = new Map<string, Row[]>()
  for (const r of rows) {
    byLot.set(r.image_filename, [...(byLot.get(r.image_filename) ?? []), r])
  }

  const verbose = process.argv.includes('--verbose')
  let written = 0
  let skipped = 0
  for (const [filename, lotRows] of byLot) {
    for (const row of lotRows) {
      const bad = cropOf(row)
      if (typeof bad === 'string') {
        console.warn(`  skip ${row.label ?? row.number} (${row.id}): ${bad}`)
        skipped++
        continue
      }
      // resvg panics abort the process, so name the spot before rendering it.
      if (verbose) console.warn(`  ${row.label ?? row.number} ${row.id}`)
      const png = new Resvg(buildSvg(row, lotRows), {
        fitTo: { mode: 'width', value: OUT_WIDTH },
        font: { loadSystemFonts: true },
      })
        .render()
        .asPng()
      writeFileSync(resolve(OUT_DIR, `${row.id}.png`), png)
      written++
    }
    console.log(`${filename}: ${lotRows.length} spot image(s)`)
  }
  console.log(
    `wrote ${written} PNG(s) to ${OUT_DIR}${skipped ? ` (${skipped} skipped)` : ''}`,
  )
}
