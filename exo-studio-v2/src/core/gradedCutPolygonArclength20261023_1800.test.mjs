import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {gradeProject} from './grading.js'
import {projectToDxf} from './dxf.js'
import {edgeLength, edgePointAt, samplePieceBoundary, seamAllowanceBoundary} from './project.js'

// Independent, deliberately small R12 group-code decoder. No application DXF parser.
function decodeWire(raw) {
  const lines = raw.trim().split(/\r?\n/)
  assert.equal(lines.length % 2, 0)
  const groups = []
  for (let i = 0; i < lines.length; i += 2) groups.push([Number(lines[i]), lines[i + 1]])
  const entities = []
  let section = ''
  for (let i = 0; i < groups.length;) {
    const [code, value] = groups[i]
    if (code === 0 && value === 'SECTION') {
      section = groups[i + 1]?.[1] === 'ENTITIES' ? 'ENTITIES' : ''
      i += 2
      continue
    }
    if (code === 0 && value === 'ENDSEC') { section = ''; i++; continue }
    if (section !== 'ENTITIES' || code !== 0 || !['POLYLINE', 'LINE'].includes(value)) { i++; continue }
    const entity = {type: value, layer: '', vertices: [], closed: false}
    let current = entity
    i++
    while (i < groups.length) {
      const [key, datum] = groups[i]
      if (key === 0) {
        if (value === 'POLYLINE' && datum === 'VERTEX') {
          current = {}
          entity.vertices.push(current)
          i++
          continue
        }
        if (value === 'POLYLINE' && datum === 'SEQEND') { i++; break }
        break
      }
      if (key === 8 && current === entity) entity.layer = datum
      if (key === 70 && current === entity) entity.closed = (Number(datum) & 1) !== 0
      if ([10, 20, 11, 21].includes(key)) current[key] = Number(datum)
      i++
    }
    if (value === 'POLYLINE') entity.vertices = entity.vertices.map(p => ({x:p[10], y:p[20]}))
    else { entity.a = {x:entity[10], y:entity[20]}; entity.b = {x:entity[11], y:entity[21]} }
    entities.push(entity)
  }
  return {groups, entities}
}

const mm = point => ({x: point.x * 10, y: point.y * 10})
const delta = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
const token = name => String(name).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 48).toUpperCase()
const LIMIT_MM = 0.019 // deliberately strictly below 0.02 mm
function near(actual, expected, context) {
  assert.ok(Number.isFinite(actual.x) && Number.isFinite(actual.y), context + ': finite coordinates')
  assert.ok(delta(actual, expected) < LIMIT_MM, `${context}: displacement ${delta(actual, expected).toFixed(6)} mm`)
}

function matchGeometry(expected, actual, label) {
  assert.equal(actual.length, expected.length, `${label}: no missing/reordered/extra vertices`)
  for (let i = 0; i < expected.length; i++) near(actual[i], expected[i], `${label} vertex ${i}`)
}

// The station is calculated on the sampled *sewn* edge in arclength units.
// The equivalent CUT point uses the same edge-local interval on the offset polygon.
function expectedStation(piece, notch, fraction, polygon) {
  const edgePaths = samplePieceBoundary(piece, 12).edgePaths
  const path = edgePaths[notch.edgeIndex]
  assert.ok(path && path.length > 1, `${piece.id}: valid edge path`)
  const lengths = [0]
  for (let i = 1; i < path.length; i++) lengths.push(lengths[i - 1] + delta(path[i], path[i - 1]))
  const total = lengths.at(-1)
  assert.ok(total > 0)
  const target = fraction * total
  let segment = 0
  while (segment < lengths.length - 2 && lengths[segment + 1] < target) segment++
  const span = lengths[segment + 1] - lengths[segment]
  assert.ok(span > 0)
  const ratio = (target - lengths[segment]) / span
  const offset = edgePaths.slice(0, notch.edgeIndex).reduce((sum, edge) => sum + edge.length - 1, 0)
  const a = polygon[(offset + segment) % polygon.length]
  const b = polygon[(offset + segment + 1) % polygon.length]
  const anchor = {x:a.x + ratio * (b.x - a.x), y:a.y + ratio * (b.y - a.y)}
  const stitch = edgePointAt(piece, notch.edgeIndex, fraction, 64).point
  const vector = {x:stitch.x - anchor.x, y:stitch.y - anchor.y}
  const distance = Math.hypot(vector.x, vector.y)
  assert.ok(distance > 1e-5)
  const depth = notch.depthCm ?? 0.45
  return {
    anchor,
    endpoint: {x:anchor.x + vector.x * depth / distance, y:anchor.y + vector.y * depth / distance},
  }
}

function assertManufacturingWire(source, wireOverride) {
  const snapshot = JSON.stringify(source)
  let vertices = 0
  let stations = 0
  let curvedStations = 0
  let doubleStations = 0
  for (const size of source.grading.sizes) {
    const graded = gradeProject(source, size)
    const wire = decodeWire(wireOverride?.(size, graded) ?? projectToDxf(graded, size, {cutlineMode:'manufacturing'}))
    const ins = wire.groups.findIndex(([code, value]) => code === 9 && value === '$INSUNITS')
    assert.ok(ins >= 0)
    assert.deepEqual(wire.groups[ins + 1], [70, '4'], `${size}: DXF in millimetres`)
    let xOffset = 0
    for (const piece of graded.pieces) {
      const sampled = samplePieceBoundary(piece, 12).points
      const polygon = seamAllowanceBoundary(piece, 12)
      const minX = Math.min(...sampled.map(p => p.x))
      const maxX = Math.max(...sampled.map(p => p.x))
      const translate = point => mm({x:point.x - minX + xOffset, y:point.y})
      const layer = `CUT_${token(piece.name)}_${token(size)}`
      const cuts = wire.entities.filter(entity => entity.type === 'POLYLINE' && entity.layer === layer)
      assert.equal(cuts.length, 1, `${size}/${piece.id}: one physical CUT contour`)
      assert.equal(cuts[0].closed, true)
      matchGeometry(polygon.map(translate), cuts[0].vertices, `${size}/${piece.id} CUT`)
      vertices += polygon.length
      const marks = wire.entities.filter(entity => entity.type === 'LINE' && entity.layer === `NOTCH_${token(piece.name)}`)
      const expected = []
      for (const notch of piece.notches ?? []) {
        const gap = Math.min(0.045, 0.38 / edgeLength(piece, notch.edgeIndex))
        const fractions = notch.type === 'double' ? [notch.t - gap, notch.t + gap] : [notch.t ?? 0.5]
        for (const fraction of fractions) {
          const station = expectedStation(piece, notch, fraction, polygon)
          expected.push({a:translate(station.anchor), b:translate(station.endpoint), id:notch.id})
          stations++
          if (piece.curves?.[notch.edgeIndex]) curvedStations++
          if (notch.type === 'double') doubleStations++
        }
      }
      assert.equal(marks.length, expected.length, `${size}/${piece.id}: exact authored notch count`)
      // Compare in emitted authoring order: each mark must be at its own station,
      // not merely somewhere on the CUT polygon or at a swapped notch station.
      for (let i = 0; i < expected.length; i++) {
        near(marks[i].a, expected[i].a, `${size}/${piece.id}/${expected[i].id} CUT anchor`)
        near(marks[i].b, expected[i].b, `${size}/${piece.id}/${expected[i].id} depth direction`)
      }
      xOffset += maxX - minX + 10
    }
  }
  assert.equal(JSON.stringify(source), snapshot, 'grading and DXF export preserve source bytes')
  return {vertices, stations, curvedStations, doubleStations}
}

test('Foundation Tee six sizes: physical CUT vertices and arclength notch stations agree with exported DXF to <0.02 mm', () => {
  const source = createTeeTemplate()
  const result = assertManufacturingWire(source)
  assert.ok(result.vertices > 500, JSON.stringify(result))
  assert.equal(result.stations, 72, JSON.stringify(result))
  assert.ok(result.curvedStations > 0, JSON.stringify(result))
  assert.ok(result.doubleStations > 0, JSON.stringify(result))
})

test('negative mutation: a 0.05 mm CUT vertex drift and arclength station drift are detected', () => {
  const source = createTeeTemplate()
  const original = JSON.stringify(source)
  const alter = (targetLayer, amountMm) => (size, graded) => {
    const raw = projectToDxf(graded, size, {cutlineMode:'manufacturing'})
    if (size !== 'M') return raw
    const rows = raw.split('\n')
    let inEntity = false, inVertex = false, layer = '', changed = false
    for (let i = 0; i < rows.length - 1; i += 2) {
      const code = Number(rows[i]), value = rows[i + 1]
      if (code === 0 && value === 'POLYLINE') { inEntity = true; inVertex = false; layer = '' }
      else if (code === 0 && value === 'LINE') { inEntity = true; inVertex = false; layer = '' }
      else if (code === 0 && value === 'VERTEX') inVertex = true
      else if (code === 0) { inEntity = false; inVertex = false }
      if (inEntity && code === 8 && !inVertex) layer = value
      if (!changed && inEntity && code === 10 && layer === targetLayer && (inVertex || targetLayer.startsWith('NOTCH_'))) {
        rows[i + 1] = String(Number(value) + amountMm)
        changed = true
      }
    }
    assert.ok(changed, `mutation found ${targetLayer}`)
    return rows.join('\n')
  }
  assert.throws(() => assertManufacturingWire(source, alter('CUT_FRONT_M', 0.05)), /CUT.*displacement/)
  assert.throws(() => assertManufacturingWire(source, alter('NOTCH_FRONT', 0.05)), /CUT anchor.*displacement/)
  assert.equal(JSON.stringify(source), original)
})
