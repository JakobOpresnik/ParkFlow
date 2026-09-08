// Sends yourself the exact morning-reminder DM, with the spot image served from
// this machine so you can see how RocketChat renders it before deploying.
//   bun run scripts/test-spot-dm.ts --sample          # no DB needed
//   bun run scripts/test-spot-dm.ts --spot <spot_id>  # after gen:spot-images
// Ctrl+C to stop the static server once the image has loaded in RocketChat.
import { existsSync, readdirSync, writeFileSync } from 'node:fs'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { Resvg } from '@resvg/resvg-js'

import { buildSvg, type Row } from './gen-spot-images.ts'

const arg = (name: string): string | undefined => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? undefined : process.argv[i + 1]
}

const HANDLE = arg('handle') ?? 'jakobo'
const PORT = Number(arg('port') ?? 8765)
const SPOTS_DIR = resolve(import.meta.dirname, '../../frontend/public/spots')

const SAMPLE: Row = {
  id: 'sample',
  label: 'A12',
  number: 12,
  coordinates: {
    x: 0.4,
    y: 0.45,
    width: 0.045,
    height: 0.085,
    rotation: 0,
    labelPosition: 'top',
    labelRotation: 0,
  },
  image_filename: 'klet_1.svg',
  image_width: 792,
  image_height: 612,
}

let dir: string
let file: string
let label: string

if (process.argv.includes('--sample')) {
  dir = mkdtempSync(join(tmpdir(), 'parkflow-spot-'))
  file = 'sample.png'
  label = SAMPLE.label ?? 'spot'
  const png = new Resvg(buildSvg(SAMPLE, [SAMPLE]), {
    fitTo: { mode: 'width', value: 900 },
    font: { loadSystemFonts: true },
  })
    .render()
    .asPng()
  writeFileSync(join(dir, file), png)
} else {
  dir = SPOTS_DIR
  const spot = arg('spot')
  // Images are named by spot_id (UUID) — that is what the bot has. A prefix is
  // enough to pick one by hand; labels like "Z-0" won't match.
  const pngs = existsSync(dir)
    ? readdirSync(dir).filter((f) => f.endsWith('.png'))
    : []
  if (pngs.length === 0) {
    throw new Error(
      `no PNGs in ${dir} — run "bun run gen:spot-images" first, or pass --sample`,
    )
  }
  const picked = spot ? pngs.find((f) => f.startsWith(spot)) : pngs[0]
  if (!picked) {
    throw new Error(
      `no spot id starting with "${spot}" — pass a spot_id (UUID), not a label. Available: ${pngs.slice(0, 3).join(', ')} ...`,
    )
  }
  file = picked
  label = arg('label') ?? 'your spot'
}

// localhost is a trustworthy origin, so RocketChat's HTTPS page loads this
// image without mixed-content blocking. Prod serves the same path off the SPA.
const url = `http://localhost:${PORT}/${file}`
const body = `You have a reservation today for ${label} (Klet -1).`
const text = `🅿️ ${body}\n![${label}](${url})`

const hook = process.env.ROCKETCHAT_INCOMING_WEBHOOK_URL
if (!hook) throw new Error('ROCKETCHAT_INCOMING_WEBHOOK_URL is not set')

Bun.serve({
  port: PORT,
  fetch: (req) =>
    new Response(Bun.file(join(dir, new URL(req.url).pathname.slice(1)))),
})

const res = await fetch(hook, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ channel: `@${HANDLE}`, text }),
})
console.log(`@${HANDLE} <- ${url}: ${res.status} ${await res.text()}`)
console.log('serving until Ctrl+C')
