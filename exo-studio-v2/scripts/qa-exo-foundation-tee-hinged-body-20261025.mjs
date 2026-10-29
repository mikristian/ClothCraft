import test from 'node:test'
import assert from 'node:assert/strict'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {researchFoundationTeeHingedBody20261025 as research} from '../src/core/backends/nativeFoundationTeeHingedBodyResearch20261025.js'
import {inspectNativeIntrapanelStaticContact} from '../src/core/backends/nativeIntrapanelContactResearch.js'
import {inspectNativeInterpanelExactStaticContact} from '../src/core/backends/nativeInterpanelExactContactResearch.js'

const fixture = () => buildNativeSimulationPayload(createTemplateProject('tee'),
  {quality: 'quality'})
const norm = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]))
const close = (a, b, tol = 1e-8) => assert.ok(Math.abs(a - b) <= tol,
  `${a} != ${b}`)
const area = (a, b, c) => ((b[0] - a[0]) * (c[1] - a[1]) -
  (b[1] - a[1]) * (c[0] - a[0])) / 2

function independentSeams(payload) {
  const gaps = payload.constraints.filter(c => c.type === 'seam').map(c =>
    norm(payload.particles[c.a].position, payload.particles[c.b].position) * 1000)
  assert.equal(gaps.length, 102)
  return {maxGapMm: Math.max(...gaps), rmsGapMm: Math.sqrt(
    gaps.reduce((s, x) => s + x * x, 0) / gaps.length)}
}

// Independent pose constructor: the production research routine supplies only
// the material-centreline triangulation. This oracle recomputes every posed
// coordinate without calling the research motion or candidate selector.
function independentlyPoseSplit(source, split, angle, depth) {
  const pose = structuredClone(split)
  for (const id of ['front', 'back']) {
    const original = source.pieces.find(p => p.id === id)
    const piece = pose.pieces.find(p => p.id === id)
    const frame = [0, 1, 2].map(axis => original.particleIndices.reduce((sum, global, i) =>
      sum + (axis === 2 ? source.particles[global].position[2] :
        source.particles[global].position[axis] - original.flatVerticesM[i][axis]),
    0) / original.particleIndices.length)
    for (let i = 0; i < piece.particleIndices.length; i++) {
      const uv = piece.flatVerticesM[i]
      const position = [frame[0] + uv[0] * Math.cos(angle), frame[1] + uv[1],
        frame[2] + (id === 'front' ? -1 : 1) *
          (depth + Math.abs(uv[0]) * Math.sin(angle))]
      const particle = pose.particles[piece.particleIndices[i]]
      particle.position = position
      particle.previous = [...position]
    }
  }
  return pose
}

function independentlyAuditSplitAndPose(source, pose, angle, depth) {
  assert.equal(pose.pieces.length, 4)
  assert.equal(pose.constraints.length, source.constraints.length)
  assert.deepEqual(pose.constraints, source.constraints)
  assert.deepEqual(pose.virtualSeams, source.virtualSeams)
  assert.deepEqual(pose.anchors, source.anchors)
  let bodyEdges = 0, maximumEdgeErrorM = 0
  for (const id of ['front', 'back']) {
    const original = source.pieces.find(p => p.id === id)
    const piece = pose.pieces.find(p => p.id === id)
    const originalArea = original.faces.reduce((sum, f) => sum +
      area(...f.map(i => original.flatVerticesM[i])), 0)
    const splitArea = piece.faces.reduce((sum, f) => sum +
      area(...f.map(i => piece.flatVerticesM[i])), 0)
    close(splitArea, originalArea, 1e-10)
    assert.ok(piece.faces.length > original.faces.length)
    assert.ok(piece.particleIndices.length > original.particleIndices.length)
    assert.deepEqual(piece.particleIndices.slice(0, original.particleIndices.length),
      original.particleIndices)
    assert.deepEqual(piece.flatVerticesM.slice(0, original.flatVerticesM.length),
      original.flatVerticesM)
    const frame = [0, 1, 2].map(axis => original.particleIndices.reduce((sum, global, i) =>
      sum + (axis === 2 ? source.particles[global].position[2] :
        source.particles[global].position[axis] - original.flatVerticesM[i][axis]),
    0) / original.particleIndices.length)
    for (let i = 0; i < piece.particleIndices.length; i++) {
      const uv = piece.flatVerticesM[i]
      const actual = pose.particles[piece.particleIndices[i]].position
      const expected = [frame[0] + uv[0] * Math.cos(angle), frame[1] + uv[1],
        frame[2] + (id === 'front' ? -1 : 1) *
          (depth + Math.abs(uv[0]) * Math.sin(angle))]
      assert.ok(norm(actual, expected) < 1e-10)
      assert.deepEqual(pose.particles[piece.particleIndices[i]].previous, actual)
    }
    for (const face of piece.faces) {
      const material = face.map(i => piece.flatVerticesM[i])
      assert.ok(area(...material) > 1e-12, 'positive material winding')
      const xs = material.map(v => v[0])
      assert.ok(Math.min(...xs) >= -1e-12 || Math.max(...xs) <= 1e-12,
        'no triangle crosses material hinge')
      for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) {
        const rest = norm(material[a], material[b])
        const world = norm(pose.particles[piece.particleIndices[face[a]]].position,
          pose.particles[piece.particleIndices[face[b]]].position)
        maximumEdgeErrorM = Math.max(maximumEdgeErrorM, Math.abs(rest - world))
        bodyEdges++
      }
    }
  }
  for (const id of ['sleeve-left', 'sleeve-right']) {
    const a = source.pieces.find(p => p.id === id)
    const b = pose.pieces.find(p => p.id === id)
    assert.deepEqual(b, a)
    for (const global of a.particleIndices)
      assert.deepEqual(pose.particles[global], source.particles[global])
  }
  return {bodyEdges, maximumEdgeErrorM}
}

test('independent four-panel hinge split, pose, seams, contacts, and nonmutation', () => {
  const source = fixture(), before = JSON.stringify(source)
  const anglesRadians = [0, .2, .4, .6], depthsM = [0, .013]
  const result = research(source, {anglesRadians, depthsM})
  assert.equal(JSON.stringify(source), before)
  assert.equal(result.splits.length, 2)
  assert.equal(result.candidates.length, 8)
  assert.ok(result.splits.every(s => s.newVertices > 0 && s.splitFaces > 0 &&
    s.newFaces > s.originalFaces && s.materialAreaErrorM2 < 1e-10))
  const sourceSeams = independentSeams(source)
  close(result.sourceSeams.maxGapMm, sourceSeams.maxGapMm)
  close(result.sourceSeams.rmsGapMm, sourceSeams.rmsGapMm)
  assert.ok(result.splitTopologyPayload)
  assert.equal(result.splitTopologyNotSimulated, true)
  for (const row of result.candidates) {
    const pose = independentlyPoseSplit(source, result.splitTopologyPayload,
      row.angleRadians, row.depthM)
    {
      const metric = independentlyAuditSplitAndPose(source, pose,
        row.angleRadians, row.depthM)
      const seam = independentSeams(pose)
      const inter = inspectNativeInterpanelExactStaticContact(pose,
        {clearanceM: .001})
      const intra = inspectNativeIntrapanelStaticContact(pose,
        {clearanceM: .001})
      close(row.maxGapMm, seam.maxGapMm)
      close(row.rmsGapMm, seam.rmsGapMm)
      assert.equal(row.bodyEdgesChecked, metric.bodyEdges)
      close(row.bodyEdgeErrorM, metric.maximumEdgeErrorM, 1e-10)
      assert.equal(row.interpanelNearClearancePairs, inter.nearClearancePairs)
      assert.equal(row.intrapanelIntersections, intra.intersectingTrianglePairs)
      assert.equal(row.staticContactValid, intra.staticDisjointThicknessScreenClear &&
        inter.staticInterpanelExactClear)
      assert.equal(row.researchScreenClear, row.bodyIsometric &&
        row.staticContactValid)
    }
    assert.equal(row.bodyIsometric, true)
    assert.ok(row.bodyEdgeErrorM < 1e-10)
    assert.ok(Math.abs(row.bodyPrincipalExtensionPercent) < 1e-7)
    assert.ok(Math.abs(row.bodyPrincipalCompressionPercent) < 1e-7)
    assert.equal(row.physicalAcceptance, false)
  }
  assert.equal(result.selected, null, 'invalid self-contact must veto all poses')
  assert.equal(result.selectedPayload, null)
  assert.ok(result.candidates.every(row => !row.staticContactValid &&
    !row.researchScreenClear))
  const lowerRmsUnsafe = result.candidates.filter(row =>
    row.rmsGapMm < sourceSeams.rmsGapMm && !row.researchScreenClear)
  assert.equal(lowerRmsUnsafe.length, 6)
  assert.ok(result.candidates.some(row => row.angleRadians === .4 &&
    row.rmsGapMm < sourceSeams.rmsGapMm && row.interpanelNearClearancePairs > 0))
  assert.equal(result.physicalAcceptance, false)
  assert.equal(result.safeToAutoApply, false)
  assert.equal(result.continuousDeformableCCDCertified, false)
  assert.equal(result.avatarEntryCertified, false)
  assert.equal(result.sourceNonmutationVerified, true)
  assert.equal(JSON.stringify(source), before)
  console.log('HINGED_BODY_INDEPENDENT_QA ' + JSON.stringify({
    selected: result.selected, splits: result.splits,
    lowerRmsUnsafe: lowerRmsUnsafe.length,
    anglePointFour: result.candidates.filter(x => x.angleRadians === .4),
  }))
})

test('malformed grids and unsafe clearance fail closed', () => {
  const source = fixture()
  for (const anglesRadians of [[], [-.1], [1.21], [0, 0], [.2, .1],
    [NaN], [Infinity], ['0.2'], Array(2), Array(9).fill(.1)])
    assert.throws(() => research(source, {anglesRadians}), /angle grid/)
  for (const depthsM of [[], [-.01], [.041], [0, 0], [.02, .01],
    [NaN], [Infinity], ['0.01'], Array(2), Array(9).fill(.01)])
    assert.throws(() => research(source, {depthsM}), /depth grid/)
  assert.throws(() => research(source, {anglesRadians: [0, .1, .2, .3, .4],
    depthsM: [0, .01, .02, .03]}), /budget/)
  for (const clearanceM of [0, -.01, .011, NaN, Infinity, '0.001'])
    assert.throws(() => research(source, {clearanceM}), /clearance/)
})

test('edited source geometry, sewing, and topology are rejected without mutation', () => {
  const source = fixture(), snapshot = JSON.stringify(source)
  const edits = [
    p => { p.particles[0].position[0] += .001 },
    p => { p.pieces.find(x => x.id === 'front').flatVerticesM[0][0] += .001 },
    p => { p.pieces.find(x => x.id === 'back').faces.pop() },
    p => { p.constraints.splice(p.constraints.findIndex(c => c.type === 'seam'), 1) },
    p => { p.particles[0].previous[0] += .001 },
  ]
  for (const edit of edits) {
    const altered = structuredClone(source)
    edit(altered)
    assert.throws(() => research(altered, {anglesRadians: [0], depthsM: [0]}),
      /fixture identity mismatch/)
  }
  assert.equal(JSON.stringify(source), snapshot)
})

test('untrusted option proxies, getters, sparse grids and unknown keys fail before traps', () => {
  const source = fixture()
  let traps = 0
  const throwTrap = () => { traps++; throw new Error('OPTION_TRAP_EXECUTED') }
  const proxiedOptions = new Proxy({}, {get: throwTrap,
    ownKeys: throwTrap, getPrototypeOf: throwTrap})
  assert.throws(() => research(source, proxiedOptions), /options/)
  const proxiedGrid = new Proxy([0], {get: throwTrap,
    ownKeys: throwTrap, getPrototypeOf: throwTrap})
  assert.throws(() => research(source, {anglesRadians: proxiedGrid}), /angle grid/)
  const getterOptions = Object.defineProperty({}, 'clearanceM', {get: throwTrap})
  assert.throws(() => research(source, getterOptions), /options/)
  const getterGrid = Object.defineProperty([0], '0', {get: throwTrap})
  assert.throws(() => research(source, {anglesRadians: getterGrid}), /angle grid/)
  assert.throws(() => research(source, {manufacturingApproved: true}), /options/)
  assert.throws(() => research(source, {clearanceM: null}), /clearance/)
  assert.throws(() => research(source, {anglesRadians: null}), /angle grid/)
  assert.throws(() => research(new Proxy(source, {get: throwTrap})), /Proxy source/)
  assert.equal(traps, 0)
})
