// Detached four-panel Foundation Tee research: split body triangles at the
// material centreline, then rigidly fold each resulting half-panel. No solver,
// garment, UI or installed app is modified. Endpoint contact is not swept CCD.
import {createTemplateProject} from '../../data/templates.js'
import {types} from 'node:util'
import {buildNativeSimulationPayload} from './nativePayload.js'
import {measureNativeSeamResiduals, compareNativeSeamGroups} from './nativeSeamCandidateGate.js'
import {auditNativePrincipalStrain} from './nativePrincipalStrainAudit.js'
import {inspectNativeIntrapanelStaticContact} from './nativeIntrapanelContactResearch.js'
import {inspectNativeInterpanelExactStaticContact} from './nativeInterpanelExactContactResearch.js'

const DEFAULT_ANGLES = Object.freeze([0, .2, .4, .6])
const DEFAULT_DEPTHS = Object.freeze([0, .013])
const signedArea = (a, b, c) => ((b[0] - a[0]) * (c[1] - a[1]) -
  (b[1] - a[1]) * (c[0] - a[0])) / 2
const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]))

function assertGrid(values, label, limit) {
  if (types.isProxy(values) || !Array.isArray(values) ||
      Object.getPrototypeOf(values) !== Array.prototype ||
      values.length < 1 || values.length > 8)
    throw new RangeError(`Invalid bounded ${label} grid`)
  const descriptors = Object.getOwnPropertyDescriptors(values)
  if (Reflect.ownKeys(descriptors).some(key => key !== 'length' &&
      (typeof key !== 'string' || !/^(0|[1-9]\d*)$/.test(key) ||
        Number(key) >= values.length)))
    throw new RangeError(`Invalid bounded ${label} grid`)
  for (let i = 0; i < values.length; i++) {
    if (!Object.hasOwn(descriptors, i) ||
        !Object.hasOwn(descriptors[i], 'value') ||
        typeof values[i] !== 'number' ||
        !Number.isFinite(values[i]) || values[i] < 0 || values[i] > limit ||
        (i && values[i] <= values[i - 1]))
      throw new RangeError(`Invalid bounded ${label} grid`)
  }
}

function readResearchOptions(options) {
  if (!options || typeof options !== 'object' || types.isProxy(options) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(options)))
    throw new RangeError('Invalid body hinge research options')
  const descriptors = Object.getOwnPropertyDescriptors(options)
  const allowed = new Set(['anglesRadians', 'depthsM', 'clearanceM'])
  if (Reflect.ownKeys(descriptors).some(key =>
    !allowed.has(key) || !Object.hasOwn(descriptors[key], 'value')))
    throw new RangeError('Invalid body hinge research options')
  return {
    anglesRadians: descriptors.anglesRadians?.value === undefined ?
      DEFAULT_ANGLES : descriptors.anglesRadians.value,
    depthsM: descriptors.depthsM?.value === undefined ?
      DEFAULT_DEPTHS : descriptors.depthsM.value,
    clearanceM: descriptors.clearanceM?.value === undefined ?
      .001 : descriptors.clearanceM.value,
  }
}

function bodyFrame(source, piece) {
  const offsets = [0, 1, 2].map(axis => piece.particleIndices.reduce((sum, id, i) => {
    const uv = piece.flatVerticesM[i], world = source.particles[id]?.position
    if (!Array.isArray(uv) || uv.length !== 3 || !uv.every(Number.isFinite) ||
        Math.abs(uv[2]) > 1e-10 || !Array.isArray(world) ||
        world.length !== 3 || !world.every(Number.isFinite))
      throw new Error('Invalid authored body frame')
    return sum + (axis === 2 ? world[2] : world[axis] - uv[axis])
  }, 0) / piece.particleIndices.length)
  if (piece.particleIndices.some((id, i) =>
    Math.hypot(source.particles[id].position[0] - piece.flatVerticesM[i][0] - offsets[0],
      source.particles[id].position[1] - piece.flatVerticesM[i][1] - offsets[1]) > 1e-9))
    throw new Error('Invalid authored body planar XY frame')
  return offsets
}

// Material-space triangle clipping is essential: rotating an unsplit triangle
// that straddles the hinge would silently introduce stretch. Intersections on
// shared source edges are reused so the resulting mesh remains conforming.
function splitAtCentreline(payload, piece) {
  const oldFaces = piece.faces.map(face => [...face])
  const oldCount = piece.particleIndices.length
  const intersections = new Map()
  let oldArea = 0, newArea = 0, splitFaces = 0
  const at = i => piece.flatVerticesM[i]
  const intersection = (a, b) => {
    const xa = at(a)[0], xb = at(b)[0]
    if (Math.abs(xa) < 1e-12) return a
    if (Math.abs(xb) < 1e-12) return b
    if (xa * xb >= 0) throw new Error('Invalid material hinge crossing')
    const key = [a, b].sort((x, y) => x - y).join(':')
    if (intersections.has(key)) return intersections.get(key)
    const t = -xa / (xb - xa)
    const uv = at(a).map((x, k) => x + t * (at(b)[k] - x))
    uv[0] = 0
    const newId = piece.flatVerticesM.length
    piece.flatVerticesM.push(uv)
    const pa = payload.particles[piece.particleIndices[a]]
    const newParticle = {...structuredClone(pa), id: `${piece.id}:hinge:${key}`,
      seamBoundary: false, seamIds: [], position: [...pa.position],
      previous: [...pa.position]}
    piece.particleIndices.push(payload.particles.length)
    payload.particles.push(newParticle)
    intersections.set(key, newId)
    return newId
  }
  const clip = (face, left) => {
    const inside = i => left ? at(i)[0] <= 1e-12 : at(i)[0] >= -1e-12
    const out = []
    for (let j = 0; j < face.length; j++) {
      const a = face[j], b = face[(j + 1) % face.length]
      const inA = inside(a), inB = inside(b)
      if (inA) out.push(a)
      if (inA !== inB) out.push(intersection(a, b))
    }
    return out.filter((id, i) => id !== out[(i + out.length - 1) % out.length])
  }
  const nextFaces = []
  for (const face of oldFaces) {
    if (!Array.isArray(face) || face.length !== 3 ||
        face.some(i => !Number.isInteger(i) || i < 0 || i >= oldCount))
      throw new Error('Invalid original body face')
    const area = signedArea(...face.map(at))
    if (!(area > 1e-12)) throw new Error('Invalid original body face winding')
    oldArea += area
    const crosses = face.some(i => at(i)[0] < -1e-12) &&
      face.some(i => at(i)[0] > 1e-12)
    if (crosses) splitFaces++
    for (const left of [true, false]) {
      const polygon = clip(face, left)
      for (let k = 1; k + 1 < polygon.length; k++) {
        const triangle = [polygon[0], polygon[k], polygon[k + 1]]
        const triangleArea = signedArea(...triangle.map(at))
        if (triangleArea > 1e-12) {
          nextFaces.push(triangle)
          newArea += triangleArea
        } else if (triangleArea < -1e-12) {
          throw new Error('Inverted split body face')
        }
      }
    }
  }
  if (Math.abs(oldArea - newArea) > 1e-9 || !splitFaces || !intersections.size)
    throw new Error('Material hinge split failed area or crossing preflight')
  piece.faces = nextFaces
  return {originalFaces: oldFaces.length, splitFaces,
    newVertices: piece.particleIndices.length - oldCount,
    newFaces: nextFaces.length, materialAreaErrorM2: Math.abs(oldArea - newArea)}
}

function bodyEdgeMetric(payload, bodies) {
  let checked = 0, maxErrorM = 0
  for (const piece of bodies) for (const face of piece.faces) {
    const [a, b, c] = face
    if (!(signedArea(piece.flatVerticesM[a], piece.flatVerticesM[b],
      piece.flatVerticesM[c]) > 1e-12)) throw new Error('Invalid split material winding')
    const xs = face.map(i => piece.flatVerticesM[i][0])
    if (Math.min(...xs) < -1e-12 && Math.max(...xs) > 1e-12)
      throw new Error('Unsplit hinge-crossing triangle')
    for (const [i, j] of [[a, b], [b, c], [c, a]]) {
      const rest = distance(piece.flatVerticesM[i], piece.flatVerticesM[j])
      const world = distance(payload.particles[piece.particleIndices[i]].position,
        payload.particles[piece.particleIndices[j]].position)
      maxErrorM = Math.max(maxErrorM, Math.abs(rest - world))
      checked++
    }
  }
  return {checked, maxErrorM}
}

export function researchFoundationTeeHingedBody20261025(source, options = {}) {
  const {anglesRadians, depthsM, clearanceM} = readResearchOptions(options)
  assertGrid(anglesRadians, 'body fold angle', 1.2)
  assertGrid(depthsM, 'body depth', .04)
  if (anglesRadians.length * depthsM.length > 16 ||
      typeof clearanceM !== 'number' || !Number.isFinite(clearanceM) ||
      clearanceM <= 0 || clearanceM > .01)
    throw new RangeError('Invalid bounded body fold research budget or clearance')
  if (types.isProxy(source)) throw new Error('Proxy source fixture unsupported')
  const snapshot = JSON.stringify(source)
  const canonical = buildNativeSimulationPayload(createTemplateProject('tee'),
    {quality: 'quality'})
  if (snapshot !== JSON.stringify(canonical))
    throw new Error('Source fixture identity mismatch: expected authored four-panel tee')
  const originalBodies = ['front', 'back'].map(id =>
    source.pieces.find(piece => piece.id === id))
  if (originalBodies.some(piece => !piece)) throw new Error('Missing body panel')
  const frames = originalBodies.map(piece => bodyFrame(source, piece))
  if (frames[0][2] <= frames[1][2]) throw new Error('Invalid body depth order')
  const splitBase = structuredClone(source)
  const splits = originalBodies.map(body => splitAtCentreline(splitBase,
    splitBase.pieces.find(piece => piece.id === body.id)))
  const originalSeams = measureNativeSeamResiduals(source)
  const rows = []
  let selected = null, selectedPayload = null
  for (const angleRadians of anglesRadians) for (const depthM of depthsM) {
    const pose = structuredClone(splitBase)
    const bodies = originalBodies.map(body =>
      pose.pieces.find(piece => piece.id === body.id))
    for (let panelIndex = 0; panelIndex < bodies.length; panelIndex++) {
      const [tx, ty, tz] = frames[panelIndex]
      const front = panelIndex === 0
      for (let i = 0; i < bodies[panelIndex].particleIndices.length; i++) {
        const id = bodies[panelIndex].particleIndices[i]
        const uv = bodies[panelIndex].flatVerticesM[i]
        const position = [tx + uv[0] * Math.cos(angleRadians), ty + uv[1],
          tz + (front ? -depthM : depthM) +
          (front ? -1 : 1) * Math.abs(uv[0]) * Math.sin(angleRadians)]
        pose.particles[id].position = position
        pose.particles[id].previous = [...position]
      }
    }
    const edges = bodyEdgeMetric(pose, bodies)
    const strain = auditNativePrincipalStrain(pose)
    const bodyStrains = bodies.map(piece => auditNativePrincipalStrain({
      pieces: [piece], particles: pose.particles,
    }))
    const seams = measureNativeSeamResiduals(pose)
    const seamGroups = compareNativeSeamGroups(originalSeams, seams)
    const intra = inspectNativeIntrapanelStaticContact(pose, {clearanceM})
    const inter = inspectNativeInterpanelExactStaticContact(pose, {clearanceM})
    const bodyIsometric = edges.maxErrorM <= 1e-10 &&
      bodyStrains.every(s => Math.abs(s.maximumPrincipalExtensionPercent) < 1e-7 &&
        Math.abs(s.maximumPrincipalCompressionPercent) < 1e-7)
    const row = {angleRadians, depthM, maxGapMm: seams.maxGapMm,
      rmsGapMm: seams.rmsGapMm, seamGroupRegressions: seamGroups.regressions.length,
      allSeamGroupsNonworse: seamGroups.allGroupsNonworse,
      principalExtensionPercent: strain.maximumPrincipalExtensionPercent,
      principalCompressionPercent: strain.maximumPrincipalCompressionPercent,
      bodyPrincipalExtensionPercent: Math.max(...bodyStrains.map(
        s => s.maximumPrincipalExtensionPercent)),
      bodyPrincipalCompressionPercent: Math.max(...bodyStrains.map(
        s => s.maximumPrincipalCompressionPercent)),
      bodyEdgesChecked: edges.checked, bodyEdgeErrorM: edges.maxErrorM,
      bodyIsometric, intrapanelIntersections: intra.intersectingTrianglePairs,
      interpanelNearClearancePairs: inter.nearClearancePairs,
      staticContactValid: intra.staticDisjointThicknessScreenClear &&
        inter.staticInterpanelExactClear,
      // Unlike the earlier scoped planar-depth diagnostic, do not designate
      // an inter-panel-only clear pose as selectable when self-contact fails.
      researchScreenClear: bodyIsometric &&
        intra.staticDisjointThicknessScreenClear && inter.staticInterpanelExactClear,
      physicalAcceptance: false}
    rows.push(row)
    if (row.researchScreenClear && (!selected ||
        row.rmsGapMm < selected.rmsGapMm - 1e-9)) {
      selected = row
      selectedPayload = pose
    }
  }
  if (JSON.stringify(source) !== snapshot)
    throw new Error('Body hinge research mutated source state')
  return {scope: 'four-panel-centreline-faceted-body-hinge-research-only',
    sourceSeams: {maxGapMm: originalSeams.maxGapMm,
      rmsGapMm: originalSeams.rmsGapMm},
    splits, candidates: rows, selected: selected ? {...selected} : null,
    selectedPayload, splitTopologyPayload: splitBase,
    splitTopologyNotSimulated: true, sourceNonmutationVerified: true,
    materialCalibrated: false, solverConstraintsRebuilt: false,
    continuousDeformableCCDCertified: false, avatarEntryCertified: false,
    physicalAcceptance: false, safeToAutoApply: false}
}
