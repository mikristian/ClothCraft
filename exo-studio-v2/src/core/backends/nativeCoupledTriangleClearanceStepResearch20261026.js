// Detached research-only backtracking step: minimize a seam/bending surrogate
// subject to static clearance and a conservative LINEAR-path clearance bound
// for every disjoint supplied triangle pair. No general deformable CCD,
// dihedral calibration, strain guarantee, solver integration or auto-apply.
import {measureNativeTriangleDistanceM} from './nativeTriangleDistanceResearch.js'
import {evaluateCoupledSeamBendContactMeritResearch20261026 as merit} from
  './nativeCoupledSeamBendContactMeritResearch20261026.js'

const finite = x => typeof x === 'number' && Number.isFinite(x)
const denseDataArray = a => Array.isArray(a) &&
  Array.from({length:a.length}, (_,i) => Object.hasOwn(a,i) &&
    Object.getOwnPropertyDescriptor(a,String(i))?.get === undefined).every(Boolean)
const ownArray = (a, n) => Array.isArray(a) && a.length === n &&
  denseDataArray(a)

export function proposeCoupledTriangleClearanceStepResearch20261026({
  positions, faces, seams = [], bends = [], contacts = [],
  seamWeight = 1, bendWeight = 1, contactWeight = 1,
  clearanceMm = 1, maxStepMm = 2,
  stepSizes = [0.1, 0.05, 0.025, 0.0125],
} = {}) {
  if (!Array.isArray(positions) || positions.length < 6 || positions.length > 128 ||
      !denseDataArray(positions) ||
      !positions.every(p => ownArray(p,3) && p.every(finite)) ||
      !Array.isArray(faces) || faces.length < 2 || faces.length > 64 ||
      !denseDataArray(faces) ||
      !faces.every(f => ownArray(f,3) && new Set(f).size === 3 &&
        f.every(i => Number.isSafeInteger(i) && i >= 0 && i < positions.length)) ||
      !Array.isArray(seams) || seams.length < 1 ||
      !Array.isArray(bends) || bends.length < 1 ||
      !finite(clearanceMm) || clearanceMm <= 0 || clearanceMm > 100 ||
      !finite(maxStepMm) || maxStepMm <= 0 || maxStepMm > 100 ||
      !Array.isArray(stepSizes) || stepSizes.length < 1 || stepSizes.length > 16 ||
      !denseDataArray(stepSizes) ||
      !stepSizes.every(s => finite(s) && s > 0 && s <= 1))
    throw new RangeError('Invalid bounded triangle-clearance step input')

  const pairs = []
  for (let i=0;i<faces.length;i++) for (let j=i+1;j<faces.length;j++) {
    if (faces[i].some(v => faces[j].includes(v))) continue
    pairs.push([i,j])
  }
  if (!pairs.length || pairs.length > 2048)
    throw new RangeError('No bounded disjoint triangle-pair inventory')
  const separation = candidate => {
    let minimum = Infinity
    for (const [i,j] of pairs) {
      const a = faces[i].map(k => candidate[k].map(x => x / 1000))
      const b = faces[j].map(k => candidate[k].map(x => x / 1000))
      minimum = Math.min(minimum, 1000 * measureNativeTriangleDistanceM(a,b))
    }
    return minimum
  }
  // For linearly interpolated vertices, triangle-to-triangle distance changes
  // by at most (max vertex travel of face A + max vertex travel of face B)
  // times the interpolation fraction. At five equally spaced samples, every
  // point on the path is within 1/8 of a sample. Subtract that Lipschitz bound
  // from each pair's smallest sampled distance; this rejects narrow crossings
  // that endpoint-only or sampled-only clearance could otherwise miss.
  // This bound is limited to this straight vertex trajectory, not cloth CCD.
  const linearPathClearanceBound = candidate => {
    const fractions = [0, 0.25, 0.5, 0.75, 1]
    const poses = fractions.map(t => positions.map((p,i) =>
      p.map((x,k) => x + t * (candidate[i][k] - x))))
    const travel = faces.map(face => Math.max(...face.map(i =>
      Math.hypot(...positions[i].map((x,k) => candidate[i][k] - x)))))
    let lowerBound = Infinity
    for (const [i,j] of pairs) {
      let sampledMinimum = Infinity
      for (const pose of poses) {
        const a = faces[i].map(k => pose[k].map(x => x / 1000))
        const b = faces[j].map(k => pose[k].map(x => x / 1000))
        sampledMinimum = Math.min(sampledMinimum,
          1000 * measureNativeTriangleDistanceM(a,b))
      }
      lowerBound = Math.min(lowerBound,
        sampledMinimum - (travel[i] + travel[j]) / 8)
    }
    return lowerBound
  }
  // Degenerate original faces cannot provide a trusted clearance baseline.
  const baselineDistanceMm = separation(positions)
  const original = merit({positions,seams,bends,contacts,seamWeight,bendWeight,contactWeight})
  const common = {original, baselineDistanceMm, checkedDisjointPairs:pairs.length,
    sampledStaticTriangleClearanceOnly:true, principalStrainChecked:false,
    sweptDeformableCCDCertified:false, physicalAcceptance:false,
    safeToAutoApply:false}
  if (baselineDistanceMm <= clearanceMm || !original.pointPairContactValid)
    return {...common, accepted:false, reason:'invalid-initial-contact', candidate:null}

  for (const step of stepSizes) {
    const maximumGradient = Math.max(...original.gradient.map(g => Math.hypot(...g)))
    if (!(maximumGradient > 0)) break
    const alpha = Math.min(step, maxStepMm / maximumGradient)
    const candidate = positions.map((p,i) => p.map((x,k) => x - alpha * original.gradient[i][k]))
    let distance
    try { distance = separation(candidate) }
    catch (error) {
      if (error?.message === 'Triangle distance requires nondegenerate faces') continue
      throw error
    }
    if (!(distance > clearanceMm)) continue
    let pathBound
    try { pathBound = linearPathClearanceBound(candidate) }
    catch (error) {
      if (error?.message === 'Triangle distance requires nondegenerate faces') continue
      throw error
    }
    if (!(pathBound > clearanceMm)) continue
    let next
    try {
      next = merit({positions:candidate,seams,bends,contacts,
        seamWeight,bendWeight,contactWeight})
    } catch (error) {
      // A finite trial can collapse a positive-rest bending edge. Backtrack,
      // rather than losing a smaller otherwise feasible research step.
      if (error instanceof RangeError &&
          error.message === 'Unresolved coincident pair in coupled merit') continue
      throw error
    }
    if (!next.pointPairContactValid || !(next.totalEnergy < original.totalEnergy) ||
        next.maxSeamGapMm > original.maxSeamGapMm + 1e-9 ||
        next.rmsSeamGapMm > original.rmsSeamGapMm + 1e-9) continue
    return {...common, accepted:true, reason:'detached-static-feasible-step',
      candidate, next, candidateDistanceMm:distance,
      linearPathClearanceBoundMm:pathBound, stepScale:alpha}
  }
  return {...common, accepted:false, reason:'no-feasible-descent-step', candidate:null}
}
