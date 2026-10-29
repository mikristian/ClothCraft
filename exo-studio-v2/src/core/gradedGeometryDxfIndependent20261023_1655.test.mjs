import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {gradeProject} from './grading.js'
import {projectToDxf} from './dxf.js'
import {createApprovedGradedNotchGeometryDraft20261023 as draft} from './approvedGradedNotchGeometry20261023_1600.js'

// Deliberately decode the published DXF group-code wire text without parseDxfPatterns.
function parseWire(dxf) {
  const lines = dxf.trim().split(/\r?\n/)
  assert.equal(lines.length % 2, 0, 'complete DXF group pairs')
  const pairs = []
  for (let i = 0; i < lines.length; i += 2) pairs.push([Number(lines[i].trim()), lines[i + 1].trim()])
  const entities = []
  let inEntities = false
  for (let i = 0; i < pairs.length;) {
    const [code, value] = pairs[i]
    if (code === 0 && value === 'SECTION' && pairs[i + 1]?.[1] === 'ENTITIES') {inEntities = true; i += 2; continue}
    if (code === 0 && value === 'ENDSEC') {inEntities = false; i++; continue}
    if (!inEntities || code !== 0 || !['LINE', 'POLYLINE'].includes(value)) {i++; continue}
    const entity = {type: value, layer: null, points: [], a: null, b: null, closed: false}
    i++
    let target = entity
    let vertex = null
    while (i < pairs.length) {
      const [c, v] = pairs[i]
      if (c === 0) {
        if (v === 'VERTEX' && value === 'POLYLINE') {vertex = {}; entity.points.push(vertex); target = vertex; i++; continue}
        if (v === 'SEQEND' && value === 'POLYLINE') {i++; break}
        break
      }
      if (c === 8 && target === entity) entity.layer = v
      if (c === 70 && target === entity) entity.closed = (Number(v) & 1) !== 0
      if ([10, 20, 11, 21].includes(c)) target[c] = Number(v)
      i++
    }
    if (value === 'LINE') {
      entity.a = {x: entity[10], y: entity[20]}
      entity.b = {x: entity[11], y: entity[21]}
    }
    entities.push(entity)
  }
  return {pairs, entities}
}

const token = name => String(name).replace(/[^A-Za-z0-9_-]/g, '_').toUpperCase()
const point = v => ({x: v[10], y: v[20]})
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
function distanceFromSegment(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y
  const fraction = dx*dx + dy*dy ? Math.max(0, Math.min(1, ((p.x-a.x)*dx + (p.y-a.y)*dy)/(dx*dx + dy*dy))) : 0
  return distance(p, {x: a.x + fraction*dx, y: a.y + fraction*dy})
}
function distanceFromOutline(p, vertices) {
  return Math.min(...vertices.map((v, i) => distanceFromSegment(p, point(v), point(vertices[(i+1)%vertices.length]))))
}

test('Foundation Tee every signed graded size has individually paired physical DXF contours and millimetre CUT notches', () => {
  const source = createTeeTemplate()
  const initial = JSON.stringify(source)
  const identity = draft(source, 'foundation-tee-independent-dxf-probe')
  assert.equal(identity.status, 'draft_for_external_review', JSON.stringify(identity.issues))
  assert.deepEqual(identity.manifest.sizes, source.grading.sizes)
  let observedMarks = 0
  for (const run of identity.manifest.sizeRuns) {
    const graded = gradeProject(source, run.size)
    const wire = parseWire(projectToDxf(graded, run.size, {cutlineMode:'manufacturing'}))
    const pairs = wire.pairs
    const unitIndex = pairs.findIndex(([c,v]) => c === 9 && v === '$INSUNITS')
    assert.ok(unitIndex >= 0 && pairs[unitIndex + 1][0] === 70)
    assert.equal(pairs[unitIndex+1][1], '4', 'millimetres, DXF INSUNITS=4')
    assert.ok(pairs.some(([c,v]) => c === 999 && v === 'COORDINATES_MM'))
    assert.equal(run.pieces.length, graded.pieces.length)
    for (let i = 0; i < graded.pieces.length; i++) {
      const piece = graded.pieces[i]
      const signedPiece = run.pieces[i]
      assert.equal(signedPiece.id, piece.id)
      assert.equal(JSON.stringify(signedPiece.contour), JSON.stringify(piece.points), 'identity tracks actual graded source vertices')
      const name = token(piece.name)
      const cut = wire.entities.filter(e => e.type === 'POLYLINE' && e.layer === `CUT_${name}_${token(run.size)}`)
      const stitch = wire.entities.filter(e => e.type === 'POLYLINE' && e.layer === `STITCH_${name}`)
      assert.equal(cut.length, 1, `${run.size}/${piece.id}: one physical CUT`)
      assert.equal(stitch.length, 1, `${run.size}/${piece.id}: one sewline STITCH`)
      assert.ok(cut[0].closed && stitch[0].closed)
      assert.ok(cut[0].points.length >= piece.points.length)
      assert.ok(stitch[0].points.length >= piece.points.length)
      for (const v of [...cut[0].points, ...stitch[0].points]) {
        assert.ok(Number.isFinite(v[10]) && Number.isFinite(v[20]))
      }
      // Export arranges pieces along X; every authored seam vertex must appear
      // on the emitted STITCH contour after one common X translation and cm-to-mm.
      const first = piece.points[0]
      const candidates = stitch[0].points.filter(v => Math.abs(v[20] - 10*first.y) < .011)
      assert.ok(candidates.some(start => {
        const shift = start[10] - 10*first.x
        return piece.points.every(p => stitch[0].points.some(v =>
          Math.abs(v[10] - (10*p.x + shift)) < .011 && Math.abs(v[20] - 10*p.y) < .011))
      }), `${run.size}/${piece.id}: graded contour control vertices absent from physical DXF sewline`)
      const lines = wire.entities.filter(e => e.type === 'LINE' && e.layer === `NOTCH_${name}`)
      const expectedCount = signedPiece.notches.reduce((n, notch) => n + (notch.attrs.type === 'double' ? 2 : 1), 0)
      assert.equal(lines.length, expectedCount, `${run.size}/${piece.id}: authored notch count`)
      const expectedLengths = signedPiece.notches.flatMap(n => Array(n.attrs.type === 'double' ? 2 : 1).fill(n.attrs.depthCm * 10)).sort((a,b)=>a-b)
      const actualLengths = lines.map(line => distance(line.a,line.b)).sort((a,b)=>a-b)
      for (let j=0; j<lines.length; j++) {
        assert.ok(Math.abs(actualLengths[j]-expectedLengths[j]) < .011, `${run.size}/${piece.id}: notch depth in mm`)
        assert.ok(distanceFromOutline(lines[j].a, cut[0].points) < .011, `${run.size}/${piece.id}: physical CUT anchoring`)
      }
      observedMarks += lines.length
    }
  }
  assert.equal(observedMarks, 72, '6 sizes × (4 front + 8 back + 4 sleeves each): 12 marks per size')
  assert.equal(JSON.stringify(source), initial, 'draft/grading/DXF must not mutate the source')
})

test('changing source notch depth changes emitted physical DXF geometry and graded identity', () => {
  const source = createTeeTemplate()
  const before = draft(source, 'notch-mutation-study')
  assert.equal(before.status, 'draft_for_external_review')
  const altered = structuredClone(source)
  altered.pieces[0].notches[0].depthCm = .3
  const after = draft(altered, 'notch-mutation-study')
  assert.equal(after.status, 'draft_for_external_review', JSON.stringify(after.issues))
  assert.notEqual(before.sha256, after.sha256)
  const a = parseWire(projectToDxf(gradeProject(source,'M'),'M',{cutlineMode:'manufacturing'})).entities
  const b = parseWire(projectToDxf(gradeProject(altered,'M'),'M',{cutlineMode:'manufacturing'})).entities
  const lengths = entries => entries.filter(e => e.type === 'LINE' && e.layer === 'NOTCH_FRONT').map(e => distance(e.a,e.b)).sort()
  assert.deepEqual(lengths(a).map(n => Math.round(n*100)), [450,450])
  assert.deepEqual(lengths(b).map(n => Math.round(n*100)), [300,450])
})

test('negative: direct exporter silently relabels ungraded source as other sizes', () => {
  const source = createTeeTemplate()
  const extractFrontCut = dxf => {
    const found = parseWire(dxf).entities.filter(e => e.type === 'POLYLINE' && /^CUT_FRONT_/.test(e.layer))
    assert.equal(found.length, 1)
    return found[0].points.map(point => [point[10], point[20]])
  }
  const sourceM = extractFrontCut(projectToDxf(source, 'M', {cutlineMode:'manufacturing'}))
  for (const size of source.grading.sizes.filter(s => s !== 'M')) {
    const mislabeled = extractFrontCut(projectToDxf(source, size, {cutlineMode:'manufacturing'}))
    assert.deepEqual(mislabeled, sourceM, `current exporter reproduces ungraded M coordinates labeled ${size}`)
    const actual = extractFrontCut(projectToDxf(gradeProject(source,size),size,{cutlineMode:'manufacturing'}))
    assert.notDeepEqual(actual, sourceM, `graded ${size} changes physical CUT`)
  }
})
