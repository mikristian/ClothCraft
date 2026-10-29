import test from 'node:test'
import assert from 'node:assert/strict'
import { createTeeTemplate } from '../data/templates.js'
import { projectToDxf } from './dxf.js'
import { getEdgeSeamAllowance, samplePieceBoundary } from './project.js'

// Parse the emitted wire format independently from the production DXF importer.
function parse(text) {
  const pairs = text.trim().split(/\r?\n/)
  const rows = []
  let entity = null
  let vertex = null
  for (let i = 0; i < pairs.length; i += 2) {
    const code = Number(pairs[i]), value = pairs[i + 1]
    if (code === 0) {
      if (value === 'LINE' || value === 'POLYLINE') {
        entity = { type: value, layer: '', vertices: [] }
        rows.push(entity)
        vertex = null
      } else if (value === 'VERTEX' && entity?.type === 'POLYLINE') {
        vertex = {}
        entity.vertices.push(vertex)
      } else if (value !== 'SEQEND') { entity = null; vertex = null }
    } else if (entity) {
      if (code === 8 && !entity.layer) entity.layer = value
      const destination = vertex || entity
      if ([10, 20, 11, 21].includes(code)) destination[code] = Number(value)
    }
  }
  return rows
}

function fixture(type = 'single', t = .37, depthCm = .3) {
  const project = createTeeTemplate()
  for (const piece of project.pieces) piece.notches = []
  const piece = project.pieces.find(p => Object.keys(p.curves || {}).some(k => getEdgeSeamAllowance(p, Number(k)) > .6))
  assert.ok(piece, 'curved seam with physical allowance')
  const edgeIndex = Number(Object.keys(piece.curves).find(k => getEdgeSeamAllowance(piece, Number(k)) > .6))
  piece.notches.push({ id: 'test-physical', edgeIndex, t, type, depthCm })
  return { project, piece, edgeIndex }
}

function output(type, fraction, depth = .3) {
  const { project, piece, edgeIndex } = fixture(type, fraction, depth)
  const result = parse(projectToDxf(project, 'M', { cutlineMode: 'manufacturing' }))
  return { piece, edgeIndex,
    lines: result.filter(x => x.type === 'LINE' && x.layer === `NOTCH_${piece.name.toUpperCase().replace(/[^A-Z0-9_-]/g, '_')}`),
    cut: result.find(x => x.type === 'POLYLINE' && x.layer === `CUT_${piece.name.toUpperCase().replace(/[^A-Z0-9_-]/g, '_')}_M`),
    result }
}

const xy = (row, x, y) => ({ x: row[x], y: row[y] })
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
function segmentDistance(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y
  const lengthSquared = dx * dx + dy * dy
  const t = lengthSquared ? Math.max(0, Math.min(1, ((p.x-a.x)*dx+(p.y-a.y)*dy)/lengthSquared)) : 0
  return dist(p, { x: a.x + t*dx, y: a.y + t*dy })
}
function distanceToPolygon(p, poly) {
  return Math.min(...poly.vertices.map((v, i) => segmentDistance(p, xy(v, 10, 20), xy(poly.vertices[(i+1)%poly.vertices.length], 10, 20))))
}

test('physical single notch at curved arclength station is anchored on CUT, measured in mm', () => {
  const { piece, edgeIndex, lines, cut } = output('single', .37)
  assert.equal(lines.length, 1)
  assert.ok(cut)
  const line = lines[0], a = xy(line, 10, 20), b = xy(line, 11, 21)
  assert.ok(distanceToPolygon(a, cut) < .011, 'notch origin is on physical CUT')
  assert.ok(Math.abs(dist(a, b) - 3) < .011, '3mm depth in exported millimetres')
  const { edgePaths } = samplePieceBoundary(piece, 12)
  const path = edgePaths[edgeIndex]
  const distances = path.slice(1).map((p, i) => dist(p, path[i]))
  const total = distances.reduce((x, y) => x + y, 0)
  let previous = 0, station = 0
  for (let i = 0; i < distances.length; i++) {
    if (previous + distances[i] >= total * .37) { station = i; break }
    previous += distances[i]
  }
  const offset = edgePaths.slice(0, edgeIndex).reduce((n, p) => n + p.length - 1, 0)
  const p = xy(cut.vertices[offset + station], 10, 20)
  const q = xy(cut.vertices[(offset + station + 1) % cut.vertices.length], 10, 20)
  assert.ok(segmentDistance(a, p, q) < .011, 'notch starts at the correct curved-edge CUT segment')
})

test('double notch creates two separate anchored, 3mm cuts on the same CUT edge', () => {
  const { lines, cut } = output('double', .37)
  assert.equal(lines.length, 2)
  for (const line of lines) {
    const a = xy(line, 10, 20), b = xy(line, 11, 21)
    assert.ok(distanceToPolygon(a, cut) < .011)
    assert.ok(Math.abs(dist(a, b) - 3) < .011)
  }
  assert.ok(dist(xy(lines[0], 10, 20), xy(lines[1], 10, 20)) > .1)
})

test('physical endpoint stations at t=0 and t=1 stay on cutter outline', () => {
  for (const t of [0, 1]) {
    const { lines, cut } = output('single', t)
    assert.equal(lines.length, 1)
    assert.ok(distanceToPolygon(xy(lines[0], 10, 20), cut) < .011, `endpoint ${t}`)
    assert.ok(Math.abs(dist(xy(lines[0], 10, 20), xy(lines[0], 11, 21)) - 3) < .011)
  }
})

function cutterStation(piece, edgeIndex, cut, pointMm) {
  const paths = samplePieceBoundary(piece, 12).edgePaths
  const offset = paths.slice(0, edgeIndex).reduce((sum, path) => sum + path.length - 1, 0)
  const count = paths[edgeIndex].length - 1
  const segments = Array.from({ length: count }, (_, i) => {
    const a = xy(cut.vertices[offset + i], 10, 20)
    const b = xy(cut.vertices[(offset + i + 1) % cut.vertices.length], 10, 20)
    return { a, b, length: dist(a, b) }
  })
  const total = segments.reduce((sum, s) => sum + s.length, 0)
  let travelled = 0, best = { distance: Infinity, fraction: NaN }
  for (const s of segments) {
    const vx = s.b.x-s.a.x, vy = s.b.y-s.a.y
    const t = s.length ? Math.max(0, Math.min(1, ((pointMm.x-s.a.x)*vx+(pointMm.y-s.a.y)*vy)/(s.length*s.length))) : 0
    const projected = { x: s.a.x+t*vx, y: s.a.y+t*vy }
    const distance = dist(pointMm, projected)
    if (distance < best.distance) best = { distance, fraction: (travelled+t*s.length)/total, displacementMm: travelled+t*s.length, totalMm:total }
    travelled += s.length
  }
  return best
}

for (const requested of [0, 1]) {
  test(`double endpoint t=${requested} fails closed instead of shifting its authored station`, () => {
    const { project } = fixture('double', requested)
    assert.throws(() => projectToDxf(project, 'M', {cutlineMode:'manufacturing'}), /manufacturing double-notch endpoint clearance/i)
  })
}

test('manufacturing exporter rejects unsupported physical notch types', () => {
  for (const type of ['triple', 'v-notch', '']) {
    const { project } = fixture(type)
    assert.throws(() => projectToDxf(project, 'M', { cutlineMode: 'manufacturing' }), /notch type|notch kind|unsupported/i, `type ${String(type)}`)
  }
})

test('legacy unspecified notch type retains single-mark behavior', () => {
  for (const type of [null, undefined]) {
    const { project } = fixture(type)
    const rows = parse(projectToDxf(project, 'M', { cutlineMode:'manufacturing' }))
    assert.equal(rows.filter(row => row.type === 'LINE' && row.layer.startsWith('NOTCH_')).length, 1)
  }
})

test('manufacturing exporter rejects invalid physical edge indices', () => {
  for (const edgeIndex of [-1, 999, 1.25, 'wrong-edge']) {
    const { project, piece } = fixture()
    piece.notches[0].edgeIndex = edgeIndex
    assert.throws(() => projectToDxf(project, 'M', { cutlineMode: 'manufacturing' }), /notch edgeIndex|notch edge/i)
  }
})

test('depth cannot cross seam allowance and physical CUT layer has millimetre units', () => {
  const { project, piece, edgeIndex } = fixture()
  piece.notches[0].depthCm = getEdgeSeamAllowance(piece, edgeIndex)
  assert.throws(() => projectToDxf(project, 'M', { cutlineMode: 'manufacturing' }), /Unsafe manufacturing notch/)
  const { result } = output('single', .5, .3)
  assert.ok(result.some(e => e.type === 'POLYLINE' && e.layer.startsWith('CUT_')))
  assert.ok(result.some(e => e.type === 'POLYLINE' && e.layer.startsWith('STITCH_')))
})
