import { Resvg } from '@resvg/resvg-js'
import { describe, expect, it } from 'vitest'

import { buildSvg, type Row } from './gen-spot-images.ts'

const row: Row = {
  id: 'test-spot',
  label: 'A12',
  number: 12,
  coordinates: {
    x: 0.4,
    y: 0.45,
    width: 0.05,
    height: 0.09,
    rotation: 0,
    labelPosition: 'top',
    labelRotation: 0,
  },
  image_filename: 'klet_1.svg',
  image_width: 792,
  image_height: 612,
}

describe('buildSvg', () => {
  it('crops around the spot and stays inside the plan bounds', () => {
    const vb = /viewBox="([\d.\- ]+)"/.exec(buildSvg(row, [row]))?.[1]
    const [vx, vy, vw, vh] = (vb ?? '').split(' ').map(Number)
    expect(vx).toBeGreaterThanOrEqual(0)
    expect(vy).toBeGreaterThanOrEqual(0)
    expect(vx! + vw!).toBeLessThanOrEqual(792)
    expect(vy! + vh!).toBeLessThanOrEqual(612)
  })

  it('rasterizes to a real PNG with the plan inlined', () => {
    const png = new Resvg(buildSvg(row, [row]), {
      fitTo: { mode: 'width', value: 900 },
    })
      .render()
      .asPng()
    expect(png.subarray(1, 4).toString()).toBe('PNG')
    expect(png.byteLength).toBeGreaterThan(5_000)
  })
})
