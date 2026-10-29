// Research-only strain-preserving front/back staging for the exact authored
// four-panel Foundation Tee. It does not change the saved garment, constraints,
// production solver, or user interface. A clear STATIC inter-panel screen is
// never a continuous-motion or avatar-entry collision certificate.
import {createTemplateProject} from '../../data/templates.js'
import {buildNativeSimulationPayload} from './nativePayload.js'
import {measureNativeSeamResiduals, compareNativeSeamGroups} from './nativeSeamCandidateGate.js'
import {auditNativePrincipalStrain} from './nativePrincipalStrainAudit.js'
import {inspectNativeIntrapanelStaticContact} from './nativeIntrapanelContactResearch.js'
import {inspectNativeInterpanelExactStaticContact} from './nativeInterpanelExactContactResearch.js'

const DEFAULT_DEPTHS_M = Object.freeze([0, .005, .01, .013, .014, .02])
const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]))

function assertDepths(depthsM) {
  if (!Array.isArray(depthsM) || depthsM.length < 2 || depthsM.length > 12 ||
      !Object.hasOwn(depthsM, 'length'))
    throw new RangeError('Invalid bounded body depth grid')
  for (let i = 0; i < depthsM.length; i++) {
    if (!Object.hasOwn(depthsM, i) || typeof depthsM[i] !== 'number' ||
        !Number.isFinite(depthsM[i]) || depthsM[i] < 0 || depthsM[i] > .04 ||
        (i > 0 && depthsM[i] <= depthsM[i - 1]))
      throw new RangeError('Invalid bounded body depth grid')
  }
}

function bodyFrame(payload, piece) {
  const samples = piece.particleIndices.map((index, i) => {
    const uv = piece.flatVerticesM[i]
    const world = payload.particles[index]?.position
    if (!Array.isArray(uv) || uv.length !== 3 ||
        !uv.every(Number.isFinite) || Math.abs(uv[2]) > 1e-10 ||
        !Array.isArray(world) || world.length !== 3 ||
        !world.every(Number.isFinite))
      throw new Error('Invalid body rest/world geometry')
    return {uv, world}
  })
  if (samples.length < 3) throw new Error('Missing body geometry')
  const frame = [0, 1, 2].map(axis => samples.reduce((sum, p) =>
    sum + (axis === 2 ? p.world[2] : p.world[axis] - p.uv[axis]), 0) /
    samples.length)
  const maxXYResidualM = Math.max(...samples.map(({uv, world}) =>
    Math.hypot(world[0] - uv[0] - frame[0],
      world[1] - uv[1] - frame[1])))
  if (maxXYResidualM > 1e-9)
    throw new Error('Body planar XY frame does not match authored material')
  return {frame, maxXYResidualM}
}

function bodyEdgeError(payload, bodyPieces) {
  let maximumM = 0, checked = 0
  for (const piece of bodyPieces) {
    for (const face of piece.faces) {
      for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) {
        const ia = face[a], ib = face[b]
        const rest = distance(piece.flatVerticesM[ia], piece.flatVerticesM[ib])
        const world = distance(payload.particles[piece.particleIndices[ia]].position,
          payload.particles[piece.particleIndices[ib]].position)
        if (!Number.isFinite(rest) || !Number.isFinite(world))
          throw new Error('Nonfinite body edge metric')
        maximumM = Math.max(maximumM, Math.abs(world - rest))
        checked++
      }
    }
  }
  return {maximumM, checked}
}

export function researchFoundationTeePlanarBodyDepth20261025(
  source, {depthsM = DEFAULT_DEPTHS_M, clearanceM = .001} = {}) {
  assertDepths(depthsM)
  if (typeof clearanceM !== 'number' || !Number.isFinite(clearanceM) ||
      clearanceM <= 0 || clearanceM > .01)
    throw new RangeError('Invalid bounded body contact clearance')
  // This experiment is only about the frozen four-panel source, not arbitrary
  // editable user garments. Reject modified source instead of hiding strain
  // by planarizing an unknown or already modified payload.
  const snapshot = JSON.stringify(source)
  const canonical = buildNativeSimulationPayload(
    createTemplateProject('tee'), {quality: 'quality'})
  if (snapshot !== JSON.stringify(canonical))
    throw new Error('Source fixture identity mismatch: expected authored four-panel tee')
  const bodies = ['front', 'back'].map(id => source.pieces.find(p => p.id === id))
  if (bodies.some(p => !p)) throw new Error('Missing body panel')
  const frames = bodies.map(p => bodyFrame(source, p))
  if (frames[0].frame[2] <= frames[1].frame[2])
    throw new Error('Invalid front/back body depth order')

  const sourceSeams = measureNativeSeamResiduals(source)
  const sourceStrain = auditNativePrincipalStrain(source)
  const sourceIntra = inspectNativeIntrapanelStaticContact(source, {clearanceM})
  const sourceInter = inspectNativeInterpanelExactStaticContact(source, {clearanceM})
  const candidates = []
  let selectedPayload = null, selected = null
  for (const depthM of depthsM) {
    const staged = structuredClone(source)
    for (let panelIndex = 0; panelIndex < bodies.length; panelIndex++) {
      const piece = staged.pieces.find(p => p.id === bodies[panelIndex].id)
      const [tx, ty, tz] = frames[panelIndex].frame
      const z = tz + (panelIndex === 0 ? -depthM : depthM)
      for (let i = 0; i < piece.particleIndices.length; i++) {
        const index = piece.particleIndices[i]
        const uv = piece.flatVerticesM[i]
        const position = [uv[0] + tx, uv[1] + ty, z]
        staged.particles[index].position = position
        staged.particles[index].previous = [...position]
      }
    }
    const seams = measureNativeSeamResiduals(staged)
    const seamGroups = compareNativeSeamGroups(sourceSeams, seams)
    const strain = auditNativePrincipalStrain(staged)
    const bodyStrains = bodies.map(body => auditNativePrincipalStrain({
      particles: staged.particles,
      pieces: [staged.pieces.find(p => p.id === body.id)],
    }))
    const intra = inspectNativeIntrapanelStaticContact(staged, {clearanceM})
    const inter = inspectNativeInterpanelExactStaticContact(staged, {clearanceM})
    const edge = bodyEdgeError(staged, bodies.map(p =>
      staged.pieces.find(x => x.id === p.id)))
    const bodyMetricPreserved = edge.maximumM <= 1e-10 &&
      bodyStrains.every(r => r.withinDeclaredStrainLimit &&
        Math.abs(r.maximumPrincipalExtensionPercent) < 1e-7 &&
        Math.abs(r.maximumPrincipalCompressionPercent) < 1e-7)
    const interpanelStaticClear = inter.staticInterpanelExactClear
    const researchDepthScreenClear = bodyMetricPreserved && interpanelStaticClear
    const row = {
      depthM,
      maxGapMm: seams.maxGapMm,
      rmsGapMm: seams.rmsGapMm,
      seamGroupsChecked: seamGroups.checkedGroupCount,
      seamGroupRegressions: seamGroups.regressions.map(g => ({...g})),
      allSeamGroupsNonworse: seamGroups.allGroupsNonworse,
      principalExtensionPercent: strain.maximumPrincipalExtensionPercent,
      principalCompressionPercent: strain.maximumPrincipalCompressionPercent,
      bodyPrincipalExtensionPercent: Math.max(...bodyStrains.map(
        r => r.maximumPrincipalExtensionPercent)),
      bodyPrincipalCompressionPercent: Math.max(...bodyStrains.map(
        r => r.maximumPrincipalCompressionPercent)),
      bodyMetricPreserved,
      bodyEdgeErrorM: edge.maximumM,
      bodyEdgesChecked: edge.checked,
      intrapanelIntersections: intra.intersectingTrianglePairs,
      interpanelNearClearancePairs: inter.nearClearancePairs,
      interpanelStaticClear,
      staticContactValid: intra.staticDisjointThicknessScreenClear &&
        interpanelStaticClear,
      fullStrainValid: strain.withinDeclaredStrainLimit,
      researchDepthScreenClear,
      // A research-depth screen is not an assembly acceptance gate.
      physicalAcceptance: false,
    }
    candidates.push(row)
    if (researchDepthScreenClear &&
        (!selected || row.rmsGapMm < selected.rmsGapMm - 1e-9 ||
          (Math.abs(row.rmsGapMm - selected.rmsGapMm) <= 1e-9 &&
            row.maxGapMm < selected.maxGapMm))) {
      selected = row
      selectedPayload = staged
    }
  }
  if (JSON.stringify(source) !== snapshot)
    throw new Error('Body staging research mutated source state')
  return {
    scope: 'four-panel-rigid-planar-body-depth-research-only',
    sourceSeams: {maxGapMm: sourceSeams.maxGapMm,
      rmsGapMm: sourceSeams.rmsGapMm},
    sourcePrincipalExtensionPercent: sourceStrain.maximumPrincipalExtensionPercent,
    sourcePrincipalCompressionPercent: sourceStrain.maximumPrincipalCompressionPercent,
    sourceIntrapanelIntersections: sourceIntra.intersectingTrianglePairs,
    sourceInterpanelNearClearancePairs: sourceInter.nearClearancePairs,
    candidates, selectedDepthM: selected?.depthM ?? null,
    selected: selected ? {...selected} : null,
    selectedPayload, sourceNonmutationVerified: true,
    constraintsRebuilt: false, materialCalibrated: false,
    continuousDeformableCCDCertified: false, avatarEntryCertified: false,
    physicalAcceptance: false, safeToAutoApply: false,
  }
}
