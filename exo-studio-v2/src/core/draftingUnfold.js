// Symmetric unfold for a half-pattern along one straight fold/cut edge.
// CLO reference: 2D Edit Pattern > Unfold (public creator field guide).
// This is an independent geometry implementation. It does NOT implement
// CLO's proprietary parametric linked-symmetry data model.
import { mirrorPointAcrossLine } from './draftingConstructions.js'
import { unfoldWalkIndex, unfoldMirroredEdge, unfoldGradeVector, unfoldNotchParameter } from './rustUnfoldKernel.js'
import { inspectDraftTopology } from './draftingTopology.js'

const near = (a,b) => Math.hypot(a.x-b.x,a.y-b.y) < .001

// Grading metadata is not checked by cutline topology. Invalid deltas must
// never survive a visually valid unfold as nonfinite factory size offsets.
const gradeDelta = value => {
  if (value == null || value === '') return 0
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const decimal = value.trim()
    if (!decimal) return 0
    if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(decimal)) {
      const parsed = Number(decimal)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  throw new RangeError('Unfold grade delta must be a finite decimal measurement')
}

// Internal construction lines are not part of the cutline topology check.
// Validate and normalize their endpoints before retaining or mirroring them:
// Number('0x2'), booleans and arrays must not become authored CAD positions.
const internalLineCoordinate = value => {
  const decimal = typeof value === 'string' && value.length <= 64 &&
    /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value.trim())
  const number = typeof value === 'number' ? value : decimal ? Number(value) : NaN
  if (!Number.isFinite(number) || Math.abs(number) > 100000) {
    throw new RangeError('Internal line coordinate must be a finite decimal length in centimeters')
  }
  return number
}

const internalLinePoint = point => {
  if (!point || typeof point !== 'object' || Array.isArray(point)) {
    throw new RangeError('Internal line endpoint must contain X and Y coordinates')
  }
  return { ...point, x: internalLineCoordinate(point.x), y: internalLineCoordinate(point.y) }
}

export function unfoldDraftPiece(piece, foldEdgeIndex) {
  const points = piece?.points || []
  const n = points.length
  if (n < 3 || !Number.isInteger(foldEdgeIndex) || foldEdgeIndex < 0 || foldEdgeIndex >= n) {
    throw new Error('Select a valid straight fold edge of a closed half-pattern')
  }
  if (piece.locked) throw new Error('Unlock this pattern before unfolding')
  if (piece.curves?.[foldEdgeIndex]) throw new Error('Unfold requires a straight fold edge')
  const a = points[foldEdgeIndex], b = points[(foldEdgeIndex+1)%n]
  if (near(a,b)) throw new Error('Fold edge must have a nonzero length')
  const dx=b.x-a.x, dy=b.y-a.y
  const norm=Math.hypot(dx,dy), ux=dx/norm,uy=dy/norm
  // Fold endpoints are retained rather than reflected. Validate their grade
  // rules too, or an invalid authored offset could survive the unfold.
  for (const vertex of points) {
    if (vertex?.gradeRule?.enabled) {
      gradeDelta(vertex.gradeRule.dxPerSize)
      gradeDelta(vertex.gradeRule.dyPerSize)
    }
  }
  const reflect = vertex => {
    const next=mirrorPointAcrossLine(vertex,a,b)
    const copy={...vertex,x:next.x,y:next.y}
    if (vertex.gradeRule?.enabled) {
      const vector=unfoldGradeVector({
        x:gradeDelta(vertex.gradeRule.dxPerSize),
        y:gradeDelta(vertex.gradeRule.dyPerSize),
      },ux,uy)
      if (!Number.isFinite(vector.x) || !Number.isFinite(vector.y)) {
        throw new RangeError('Unfold grade vector must remain finite after reflection')
      }
      copy.gradeRule={...vertex.gradeRule,dxPerSize:vector.x,dyPerSize:vector.y}
    }
    if (copy.id) copy.id=String(copy.id)+'-unfold'
    return copy
  }
  const walk=Array.from({length:n},(_,i)=>unfoldWalkIndex(n,foldEdgeIndex,i))
  const reflected=walk.slice(1,-1).reverse().map(index=>reflect(points[index]))
  const newPoints=[...walk.map(index=>({...points[index]})),...reflected]
  const edgeMap={}
  const mirroredEdgeMap={}
  const newCurves={}
  const newAllowances={}
  for(let k=0;k<n-1;k++){
    const oldEdge=walk[k]
    const reflectedEdge=unfoldMirroredEdge(n,k)
    edgeMap[oldEdge]=k
    mirroredEdgeMap[oldEdge]=reflectedEdge
    const curve=piece.curves?.[oldEdge]
    if(curve) {
      newCurves[k]={...curve}
      const mirrored=mirrorPointAcrossLine({x:curve.cx,y:curve.cy},a,b)
      newCurves[reflectedEdge]={cx:mirrored.x,cy:mirrored.y}
    }
    const allowance=piece.edgeSeamAllowances?.[oldEdge]
    if(allowance!==undefined){
      newAllowances[k]=allowance
      newAllowances[reflectedEdge]=allowance
    }
  }
  // Every authored notch must reference an actual source edge. Silently
  // dropping a malformed reference loses manufacturing marks during unfold.
  const notchEdges=(piece.notches||[]).map(notch=>{
    const raw=notch?.edgeIndex
    const edge=typeof raw==='string' && /^(0|[1-9]\d*)$/.test(raw) ? Number(raw) : raw
    if(!Number.isSafeInteger(edge)||edge<0||edge>=n){
      throw new RangeError('Notch edge index must reference a valid pattern edge')
    }
    return edge
  })
  if(notchEdges.includes(foldEdgeIndex)) throw new Error('Remove notches from the fold edge before unfolding')
  const newNotches=[]
  for(const [i,notch] of (piece.notches||[]).entries()){
    const sourceEdge=notchEdges[i]
    const mapped=edgeMap[sourceEdge]
    if(!Number.isInteger(mapped)) throw new Error('Notch edge index has no unfolded mapping')
    // Topology validates the cutline, not authored notch stations. Do not
    // mirror an invalid station into a NaN or out-of-edge physical mark.
    const authoredStation=notch.t??.5
    // Number('0x1') / Number('0b1') are valid JS numbers but not decimal
    // CAD station measurements. Reject alternate bases before mirroring.
    const decimalString=typeof authoredStation==='string' && authoredStation.length<=64 &&
      /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(authoredStation.trim())
    const station=typeof authoredStation==='number' ? authoredStation :
      decimalString ? Number(authoredStation) : NaN
    if(!Number.isFinite(station)||station<0||station>1){
      throw new RangeError('Notch station must be a finite fraction from 0 to 1')
    }
    newNotches.push({...notch,edgeIndex:mapped})
    newNotches.push({...notch,id:String(notch.id||'notch')+'-unfold',
      edgeIndex:mirroredEdgeMap[sourceEdge],t:unfoldNotchParameter(station),
      matchGroupId:null,matchedSeamId:null})
  }
  const authoredInternal=piece.internalLines??[]
  if (!Array.isArray(authoredInternal)) throw new RangeError('Internal lines must be an array')
  // Array.from visits holes too; Array.map would silently preserve them and
  // later crash during mirroring with an unhelpful TypeError.
  const sourceInternal=Array.from(authoredInternal,line=>{
    if (!line || typeof line !== 'object' || Array.isArray(line)) {
      throw new RangeError('Internal line must contain two endpoints')
    }
    return {...line,a:internalLinePoint(line.a),b:internalLinePoint(line.b)}
  })
  const newInternal=sourceInternal.map(line=>({...line}))
  for(const line of sourceInternal){
    const left=mirrorPointAcrossLine(line.a,a,b)
    const right=mirrorPointAcrossLine(line.b,a,b)
    if(near(left,line.a)&&near(right,line.b)) continue
    newInternal.push({...line,id:String(line.id||'internal')+'-unfold',
      name:(line.name||'Internal')+' mirror',a:left,b:right})
  }
  const expanded={
    ...piece, points:newPoints, curves:newCurves,
    edgeSeamAllowances:newAllowances,notches:newNotches,internalLines:newInternal,
    name:String(piece.name||'Pattern').replace(/\s*\(half\)$/i,'')+' · Unfolded',
  }
  const topology=inspectDraftTopology(expanded,{curveSamples:24})
  if(!topology.valid) throw new Error('Unfold would overlap/cross the pattern: '+topology.errors[0])
  const before=inspectDraftTopology(piece,{curveSamples:24})
  if(!before.valid) throw new Error('The original half-pattern must have a valid closed cutline')
  if(Math.abs(topology.areaCm2 - before.areaCm2*2)>Math.max(.025,before.areaCm2*.005)) {
    throw new Error('Unfolded area must equal twice the original half-pattern area')
  }
  return {piece:expanded,edgeMap,mirroredEdgeMap,foldEdgeIndex,areaCm2:topology.areaCm2}
}
