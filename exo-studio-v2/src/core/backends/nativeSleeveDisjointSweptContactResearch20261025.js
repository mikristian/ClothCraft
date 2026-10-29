// Conservative interval veto for DISJOINT material faces of one prescribed
// rigid-hinge/translation sleeve. Adjacent faces, deformable cloth and avatar
// motion are NOT certified. This never authorizes physical acceptance.
import {measureNativeTriangleDistanceM} from './nativeTriangleDistanceResearch.js'

const vec = x => Array.isArray(x) && x.length === 3 &&
  x.every(v => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 100)
const norm = x => Math.hypot(...x)
const sub = (a, b) => a.map((v, k) => v - b[k])
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]
const dot = (a, b) => a.reduce((s, v, k) => s + v*b[k], 0)
const box = points => ({min:[0,1,2].map(k => Math.min(...points.map(p => p[k]))),
  max:[0,1,2].map(k => Math.max(...points.map(p => p[k])))})
const gap = (a, b) => Math.hypot(...[0,1,2].map(k =>
  Math.max(0, a.min[k]-b.max[k], b.min[k]-a.max[k])))

export function screenNativeSleeveDisjointSweptContactResearch20261025(payload,
  panelId, hinge, translationM, {clearanceM=.001, maxDepth=8,
    maxFacePairs=100000, maxDistanceEvaluations=100000}={}) {
  if (!Number.isFinite(clearanceM) || clearanceM <= 0 || clearanceM > .01 ||
      !Number.isInteger(maxDepth) || maxDepth < 0 || maxDepth > 12 ||
      !Number.isInteger(maxFacePairs) || maxFacePairs < 1 || maxFacePairs > 500000 ||
      !Number.isInteger(maxDistanceEvaluations) || maxDistanceEvaluations < 1 ||
      maxDistanceEvaluations > 500000)
    throw new RangeError('Invalid disjoint sleeve interval budget')
  const piece = payload?.pieces?.find(p => p.id === panelId)
  if (!piece || !Array.isArray(piece.faces) || !piece.faces.length ||
      piece.faces.length > 2048 || !Array.isArray(piece.particleIndices) ||
      !Array.isArray(payload.particles) || !vec(translationM) || norm(translationM) > .15 ||
      !vec(hinge?.axisOriginM) || !vec(hinge?.axisUnit) ||
      Math.abs(norm(hinge.axisUnit)-1) > 1e-8 ||
      hinge.startRadians !== 0 || !Number.isFinite(hinge.endRadians) ||
      Math.abs(hinge.endRadians) > Math.PI/2 ||
      !Array.isArray(hinge.movingVertices))
    throw new Error('Invalid disjoint sleeve interval inputs')
  const moving = new Set(hinge.movingVertices)
  if (moving.size !== hinge.movingVertices.length ||
      [...moving].some(i => !Number.isInteger(i) || i < 0 || i >= piece.particleIndices.length))
    throw new Error('Invalid disjoint sleeve moving inventory')
  const positions = piece.particleIndices.map(id => {
    const p = payload.particles[id]
    if (!Number.isInteger(id) || !p || p.pieceId !== panelId || !vec(p.position))
      throw new Error('Invalid disjoint sleeve particle ownership')
    return p.position
  })
  const radii = positions.map((p, i) => moving.has(i) ?
    norm(cross(hinge.axisUnit, sub(p, hinge.axisOriginM))) : 0)
  const at = (i, t) => {
    const p = positions[i]
    let rotated = p
    if (moving.has(i)) {
      const v = sub(p, hinge.axisOriginM), a = hinge.endRadians*t
      const c = Math.cos(a), s = Math.sin(a), axial = dot(hinge.axisUnit, v)
      const spin = cross(hinge.axisUnit, v)
      rotated = hinge.axisOriginM.map((x, k) => x + c*v[k] + s*spin[k] +
        (1-c)*axial*hinge.axisUnit[k])
    }
    return rotated.map((x, k) => x + translationM[k]*t)
  }
  const seen = new Set()
  const triangles = piece.faces.map((face, index) => {
    if (!Array.isArray(face) || face.length !== 3 || new Set(face).size !== 3 ||
        face.some(i => !Number.isInteger(i) || i < 0 || i >= positions.length))
      throw new Error('Invalid disjoint sleeve face topology')
    const key = [...face].sort((a,b)=>a-b).join(':')
    if (seen.has(key)) throw new Error('Duplicate disjoint sleeve face')
    seen.add(key)
    if (face.some(i => moving.has(i)) && face.some(i => !moving.has(i) &&
        radii[i] > 1e-8))
      throw new Error('Disjoint sleeve hinge deforms a face')
    const start = face.map(i => positions[i])
    if (norm(cross(sub(start[1], start[0]), sub(start[2], start[0]))) < 1e-14)
      throw new Error('Degenerate disjoint sleeve face')
    const speed = norm(translationM) + Math.abs(hinge.endRadians)*
      Math.max(...face.map(i => radii[i]))
    const mid = box(face.map(i => at(i, .5)))
    return {index, face, speed, at:t=>face.map(i=>at(i,t)),
      swept:{min:mid.min.map(v=>v-speed/2),max:mid.max.map(v=>v+speed/2)}}
  })
  const totalPairs = triangles.length*(triangles.length-1)/2
  if (totalPairs > maxFacePairs) throw new RangeError('Disjoint sleeve pair budget exceeded')
  let disjointPairs=0, adjacentPairsNotCertified=0, prunedSweptBounds=0
  let rootCheckedPairs=0
  let distanceEvaluations=0, blocker=null, minimumSampledDistanceMm=null
  const check = (a,b,lo,hi,depth) => {
    if (blocker) return
    if (distanceEvaluations >= maxDistanceEvaluations) {
      blocker={reason:'work-budget',faceA:a.index,faceB:b.index,depth};return
    }
    const t=(lo+hi)/2, A=a.at(t), B=b.at(t)
    const bound=(a.speed+b.speed)*(hi-lo)/2
    if (gap(box(A),box(B)) > clearanceM+bound+1e-12) return
    const d=measureNativeTriangleDistanceM(A,B)
    distanceEvaluations++
    if (!Number.isFinite(d)) throw new Error('Nonfinite disjoint sleeve distance')
    minimumSampledDistanceMm=minimumSampledDistanceMm===null?d*1000:
      Math.min(minimumSampledDistanceMm,d*1000)
    if (d <= clearanceM) {
      blocker={reason:'sampled-contact',faceA:a.index,faceB:b.index,
        fraction:t,distanceMm:d*1000};return
    }
    if (d > clearanceM+bound+1e-12) return
    if (depth >= maxDepth) {
      blocker={reason:'unresolved-motion-bound',faceA:a.index,faceB:b.index,
        fraction:t,distanceMm:d*1000,motionBoundMm:bound*1000};return
    }
    check(a,b,lo,t,depth+1)
    check(a,b,t,hi,depth+1)
  }
  for (let i=0;i<triangles.length;i++) for (let j=i+1;j<triangles.length;j++) {
    const a=triangles[i], b=triangles[j]
    if (a.face.some(v=>b.face.includes(v))) {adjacentPairsNotCertified++;continue}
    disjointPairs++
    if (blocker) continue
    if (gap(a.swept,b.swept)>clearanceM) {prunedSweptBounds++;continue}
    rootCheckedPairs++
    check(a,b,0,1,0)
  }
  return {disjointIntervalClear:blocker===null,blocker,totalPairs,disjointPairs,
    adjacentPairsNotCertified,prunedSweptBounds,rootCheckedPairs,distanceEvaluations,
    minimumSampledDistanceMm,scope:'prescribed-rigid-sleeve-disjoint-faces-only',
    adjacentFaceSweptContactCertified:false,deformableCCDCertified:false,
    avatarContactCertified:false,physicalAcceptance:false,safeToAutoApply:false}
}
