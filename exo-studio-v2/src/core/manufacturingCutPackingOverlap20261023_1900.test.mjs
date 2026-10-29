import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {gradeProject} from './grading.js'
import {projectToDxf} from './dxf.js'

// Independent group-code reader: the product DXF importer is not used.
function cutPolylines(wire) {
  const rows = wire.replace(/\r/g, '').trimEnd().split('\n')
  assert.equal(rows.length % 2, 0, 'complete DXF group codes')
  const pairs = []
  for (let i = 0; i < rows.length; i += 2) {
    assert.match(rows[i], /^\d+$/, 'numeric group code')
    pairs.push([Number(rows[i]), rows[i + 1]])
  }
  const cuts = []
  let inEntities = false
  for (let i = 0; i < pairs.length; i++) {
    const [code, value] = pairs[i]
    if (code === 0 && value === 'SECTION' && pairs[i + 1]?.[0] === 2 && pairs[i + 1][1] === 'ENTITIES') inEntities = true
    else if (code === 0 && value === 'ENDSEC') inEntities = false
    if (!inEntities || code !== 0 || value !== 'POLYLINE') continue
    let layer = ''
    let closed = false
    const vertices = []
    let j = i + 1
    while (j < pairs.length) {
      if (pairs[j][0] === 0 && pairs[j][1] === 'SEQEND') break
      if (pairs[j][0] === 0 && pairs[j][1] === 'POLYLINE') throw new Error('nested POLYLINE')
      if (pairs[j][0] === 0 && pairs[j][1] === 'VERTEX') {
        const vertex = {}
        j++
        while (j < pairs.length && pairs[j][0] !== 0) {
          if (pairs[j][0] === 10) vertex.x = Number(pairs[j][1])
          if (pairs[j][0] === 20) vertex.y = Number(pairs[j][1])
          j++
        }
        assert.ok(Number.isFinite(vertex.x) && Number.isFinite(vertex.y), 'finite CUT coordinates')
        vertices.push(vertex)
        continue
      }
      if (vertices.length === 0 && pairs[j][0] === 8) layer = pairs[j][1]
      if (vertices.length === 0 && pairs[j][0] === 70) closed = (Number(pairs[j][1]) & 1) !== 0
      j++
    }
    assert.ok(j < pairs.length, 'terminated POLYLINE')
    if (layer.startsWith('CUT_')) {
      assert.ok(closed && vertices.length >= 3, `closed CUT polygon: ${layer}`)
      cuts.push({layer, vertices})
    }
    i = j
  }
  return cuts
}

const EPS = 1e-7 // mm, strictly interior contact only
function cross(a, b, c) { return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) }
function bounds(poly) {
  return {minX: Math.min(...poly.map(p => p.x)), maxX: Math.max(...poly.map(p => p.x)),
    minY: Math.min(...poly.map(p => p.y)), maxY: Math.max(...poly.map(p => p.y))}
}
function strictlyInside(point, poly) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[j], b = poly[i]
    const c = cross(a, b, point)
    if (Math.abs(c) <= EPS && point.x >= Math.min(a.x, b.x) - EPS &&
        point.x <= Math.max(a.x, b.x) + EPS && point.y >= Math.min(a.y, b.y) - EPS &&
        point.y <= Math.max(a.y, b.y) + EPS) return false
    if ((a.y > point.y) !== (b.y > point.y) &&
        point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}
function properIntersection(a, b, c, d) {
  const abC = cross(a, b, c), abD = cross(a, b, d)
  const cdA = cross(c, d, a), cdB = cross(c, d, b)
  return ((abC > EPS && abD < -EPS) || (abC < -EPS && abD > EPS)) &&
         ((cdA > EPS && cdB < -EPS) || (cdA < -EPS && cdB > EPS))
}
function area(poly) {
  let doubled = 0
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length]
    doubled += a.x * b.y - a.y * b.x
  }
  return Math.abs(doubled) / 2
}
function interiorOverlap(a, b) {
  const ba = bounds(a), bb = bounds(b)
  if (Math.min(ba.maxX, bb.maxX) - Math.max(ba.minX, bb.minX) <= EPS ||
      Math.min(ba.maxY, bb.maxY) - Math.max(ba.minY, bb.minY) <= EPS) return false
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      if (properIntersection(a[i], a[(i + 1) % a.length], b[j], b[(j + 1) % b.length])) return true
    }
  }
  if (a.some(point => strictlyInside(point, b)) || b.some(point => strictlyInside(point, a))) return true
  // Coincident outlines can share an entire region with no strictly interior
  // vertices or proper crossings. Check the midpoint of each polygon edge.
  for (const [inner, outer] of [[a, b], [b, a]]) {
    for (let i = 0; i < inner.length; i++) {
      const p = inner[i], q = inner[(i + 1) % inner.length]
      if (strictlyInside({x: (p.x + q.x) / 2, y: (p.y + q.y) / 2}, outer)) return true
    }
  }
  // Identical polygons (including reversed orientation) have no interior
  // boundary samples; centroid of triangles formed by each vertex triple.
  for (const [inner, outer] of [[a, b], [b, a]]) {
    for (let i = 1; i < inner.length - 1; i++) {
      const p = {x: (inner[0].x + inner[i].x + inner[i + 1].x) / 3,
        y: (inner[0].y + inner[i].y + inner[i + 1].y) / 3}
      if (strictlyInside(p, inner) && strictlyInside(p, outer)) return true
    }
  }
  return false
}
function overlaps(polys) {
  const found = []
  for (let i = 0; i < polys.length; i++) for (let j = i + 1; j < polys.length; j++) {
    if (interiorOverlap(polys[i].vertices, polys[j].vertices))
      found.push([polys[i].layer, polys[j].layer])
  }
  return found
}
function square(x1, y1, x2, y2) {
  return [{x: x1, y: y1}, {x: x2, y: y1}, {x: x2, y: y2}, {x: x1, y: y2}]
}

test('independent CUT-overlap checker detects crossing, containment and coincident contours', () => {
  assert.equal(interiorOverlap(square(0, 0, 5, 5), square(4, 2, 7, 7)), true)
  assert.equal(interiorOverlap(square(0, 0, 5, 5), square(1, 1, 2, 2)), true)
  assert.equal(interiorOverlap(square(0, 0, 5, 5), square(0, 0, 5, 5)), true)
  assert.equal(interiorOverlap(square(0, 0, 5, 5), square(5, 0, 10, 5)), false, 'touching edge has zero overlap')
  assert.equal(interiorOverlap(square(0, 0, 5, 5), square(5, 5, 10, 10)), false, 'touching point has zero overlap')
  assert.equal(interiorOverlap(square(0, 0, 5, 5), square(5.001, 0, 10, 5)), false)
})

test('all six actual graded Foundation Tee manufacturing DXFs have separate physical CUT contours', () => {
  const source = createTeeTemplate()
  assert.deepEqual(source.grading.sizes, ['XS', 'S', 'M', 'L', 'XL', 'XXL'])
  const observations = []
  for (const size of source.grading.sizes) {
    const graded = gradeProject(source, size)
    const exported = projectToDxf(graded, size, {cutlineMode: 'manufacturing'})
    const cut = cutPolylines(exported)
    assert.equal(cut.length, graded.pieces.length, `${size}: all pieces have physical CUT outlines`)
    assert.equal(new Set(cut.map(c => c.layer)).size, cut.length, `${size}: distinct CUT layer names`)
    for (const contour of cut) assert.ok(area(contour.vertices) > EPS, `${size}: ${contour.layer} has positive area`)
    const intersections = overlaps(cut)
    observations.push({size, pieces: cut.length, overlapPairs: intersections})
  }
  assert.deepEqual(observations.map(o => o.pieces), [4, 4, 4, 4, 4, 4])
  assert.deepEqual(observations.flatMap(o => o.overlapPairs.map(pair => ({size: o.size, pair}))), [],
    `actual physical CUT overlap found: ${JSON.stringify(observations)}`)
})

test('exporter packing stress: two valid rectangles with allowances exceeding half its stitch gap', () => {
  const base = createTeeTemplate()
  const makeRectangle = (name, id) => ({
    ...structuredClone(base.pieces[0]),
    id, name,
    points: square(0, 0, 20, 20),
    curves: {},
    seamAllowance: 6,
    edgeSeamAllowances: {},
    notches: [],
    internalLines: [],
    buttonholes: [],
  })
  const project = {...base, pieces: [makeRectangle('Packing A', 'packing-a'), makeRectangle('Packing B', 'packing-b')], seams: []}
  let wire
  try {
    wire = projectToDxf(project, 'M', {cutlineMode: 'manufacturing'})
  } catch (error) {
    assert.match(String(error?.message), /unsafe factory cut|invalid factory cutting geometry|overlap|packing|spacing/i,
      `exporter must explicitly reject unsafe geometry/packing: ${error?.message}`)
    return
  }
  const cut = cutPolylines(wire)
  assert.equal(cut.length, 2, 'two physical CUT polylines exported')
  assert.deepEqual(cut.map(c => c.layer), ['CUT_PACKING_A_M', 'CUT_PACKING_B_M'])
  assert.deepEqual(overlaps(cut), [],
    'manufacturing exporter must prevent physical CUT overlaps even when combined seam allowances exceed its STITCH packing gap')
})
