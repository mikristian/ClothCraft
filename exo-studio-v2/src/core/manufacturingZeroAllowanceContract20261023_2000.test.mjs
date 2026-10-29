import test from 'node:test'
import assert from 'node:assert/strict'
import { createTeeTemplate } from '../data/templates.js'
import { projectToDxf, parseDxfPatterns } from './dxf.js'

function fixture(allowances) {
  const project = structuredClone(createTeeTemplate())
  project.pieces = allowances.map(([name, cm]) => {
    const piece = structuredClone(project.pieces.find(item => item.name === name))
    assert.ok(piece, name)
    piece.seamAllowance = cm
    piece.edgeSeamAllowances = {}
    piece.notches = []
    return piece
  })
  project.seams = []
  return project
}

// Independently decode R12 DXF group pairs, entity delimiters and vertices.
function decode(wire) {
  const rows = wire.replace(/\r/g, '').split('\n')
  assert.equal(rows.length % 2, 0, 'DXF complete group/value pairs')
  const pairs = []
  for (let i = 0; i < rows.length; i += 2) {
    assert.match(rows[i], /^-?\d+$/, 'valid numeric group code')
    pairs.push([Number(rows[i]), rows[i + 1]])
  }
  assert.deepEqual(pairs.slice(-1), [[0, 'EOF']], 'complete EOF marker')
  assert.ok(pairs.some(([c, v], i) => c === 9 && v === '$INSUNITS' && pairs[i + 1]?.[0] === 70 && pairs[i + 1]?.[1] === '4'), 'millimeter units')
  const entities = []
  let inEntities = false
  for (let i = 0; i < pairs.length; i++) {
    if (pairs[i][0] === 0 && pairs[i][1] === 'SECTION' && pairs[i + 1]?.[1] === 'ENTITIES') inEntities = true
    if (pairs[i][0] === 0 && pairs[i][1] === 'ENDSEC') inEntities = false
    if (!inEntities || pairs[i][0] !== 0 || pairs[i][1] !== 'POLYLINE') continue
    let j = i + 1
    const header = []
    while (j < pairs.length && pairs[j][0] !== 0) header.push(pairs[j++])
    const vertices = []
    let seqend = false
    while (j < pairs.length) {
      if (pairs[j][0] === 0 && pairs[j][1] === 'SEQEND') { seqend = true; j++; break }
      assert.deepEqual(pairs[j], [0, 'VERTEX'], 'polyline vertex record')
      j++
      const props = []
      while (j < pairs.length && pairs[j][0] !== 0) props.push(pairs[j++])
      const x = Number(props.find(([c]) => c === 10)?.[1])
      const y = Number(props.find(([c]) => c === 20)?.[1])
      assert.ok(Number.isFinite(x) && Number.isFinite(y), 'finite vertex XY')
      vertices.push({ x, y })
    }
    assert.ok(seqend, 'complete SEQEND')
    const layer = header.find(([c]) => c === 8)?.[1]
    const closed = (Number(header.find(([c]) => c === 70)?.[1]) & 1) === 1
    assert.ok(layer && closed && vertices.length >= 3, 'named, closed polygon')
    assert.ok(vertices.some((p, k) => p.x !== vertices[(k + 1) % vertices.length].x || p.y !== vertices[(k + 1) % vertices.length].y), 'nondegenerate edge')
    entities.push({ layer, vertices, closed })
    i = j - 1
  }
  return entities
}

function contours(project) {
  const before = JSON.stringify(project)
  const wire = projectToDxf(project, 'M', { cutlineMode: 'manufacturing' })
  assert.equal(JSON.stringify(project), before, 'no source mutation')
  return { wire, polygons: decode(wire) }
}

function pair(polygons, name) {
  const cut = polygons.filter(p => p.layer === `CUT_${name}_M`)
  const stitch = polygons.filter(p => p.layer === `STITCH_${name}`)
  assert.equal(cut.length, 1, `${name}: exactly one physical CUT`)
  assert.equal(stitch.length, 1, `${name}: exactly one named STITCH`)
  return [cut[0], stitch[0]]
}

function sameVertices(a, b) {
  assert.equal(a.vertices.length, b.vertices.length, 'same polygon station count')
  for (let k = 0; k < a.vertices.length; k++) {
    assert.ok(Math.abs(a.vertices[k].x - b.vertices[k].x) < 1e-7, `X vertex ${k} coincides`)
    assert.ok(Math.abs(a.vertices[k].y - b.vertices[k].y) < 1e-7, `Y vertex ${k} coincides`)
  }
}

test('zero allowance emits a complete named CUT/STITCH pair with exact coincident geometry (regression)', () => {
  const { polygons } = contours(fixture([['Front', 0]]))
  assert.equal(polygons.length, 2, 'no missing or extra outline')
  const [cut, stitch] = pair(polygons, 'FRONT')
  sameVertices(cut, stitch)
})

test('positive allowance has distinct CUT/STITCH and explicit non-editable reference import', () => {
  const { wire, polygons } = contours(fixture([['Front', 1]]))
  assert.equal(polygons.length, 2)
  const [cut, stitch] = pair(polygons, 'FRONT')
  assert.notDeepEqual(cut.vertices, stitch.vertices)
  assert.throws(() => parseDxfPatterns(wire), /Manufacturing DXF/)
  for (const manufacturingImport of ['cut-reference', 'stitch-reference']) {
    const imported = parseDxfPatterns(wire, { manufacturingImport })
    assert.equal(imported.pieces.length, 1, 'one referenced piece')
    assert.equal(imported.pieces[0].seamAllowance, 0, 'no invented allowance')
  }
})

test('mixed zero and positive allowances each retain CUT/STITCH semantics (regression)', () => {
  const { polygons } = contours(fixture([['Front', 0], ['Back', 1]]))
  assert.equal(polygons.length, 4, 'two paired physical and sewn outlines')
  const [frontCut, frontStitch] = pair(polygons, 'FRONT')
  const [backCut, backStitch] = pair(polygons, 'BACK')
  sameVertices(frontCut, frontStitch)
  assert.notDeepEqual(backCut.vertices, backStitch.vertices)
})

test('zero allowance reference import must have explicit coincident contour policy (regression)', () => {
  const { wire } = contours(fixture([['Front', 0]]))
  assert.throws(() => parseDxfPatterns(wire), /Manufacturing DXF/)
  for (const manufacturingImport of ['cut-reference', 'stitch-reference']) {
    const imported = parseDxfPatterns(wire, { manufacturingImport })
    assert.equal(imported.pieces.length, 1)
    assert.equal(imported.pieces[0].seamAllowance, 0)
  }
})

test('coincident labeled contours expose independent strict-area importer rejection (regression)', () => {
  const { wire } = contours(fixture([['Front', 0]]))
  const first = wire.indexOf('0\nPOLYLINE\n')
  const end = wire.indexOf('0\nSEQEND\n8\nCUT_FRONT_M', first)
  assert.ok(first >= 0 && end > first, 'complete zero CUT record')
  const copiedStitch = wire.slice(first, end + '0\nSEQEND\n8\nCUT_FRONT_M'.length)
    .replaceAll('CUT_FRONT_M', 'STITCH_FRONT')
  const endEntities = wire.lastIndexOf('0\nENDSEC')
  const completeWire = wire.slice(0, endEntities) + copiedStitch + '\n' + wire.slice(endEntities)
  const polygons = decode(completeWire)
  const [cut, stitch] = pair(polygons, 'FRONT')
  sameVertices(cut, stitch)
  for (const manufacturingImport of ['cut-reference', 'stitch-reference']) {
    const imported = parseDxfPatterns(completeWire, { manufacturingImport })
    assert.equal(imported.pieces.length, 1, 'explicit coincident reference can be inspected')
  }
})
