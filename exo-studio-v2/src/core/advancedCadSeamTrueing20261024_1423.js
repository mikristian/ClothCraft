import { edgeRangeLength, edgePointAt } from './project.js'
import { gradeProject } from './grading.js'

// Physical stitchline seam walk for legacy EXO centimetre geometry. All
// proposals are detached references; source projects remain authoritative.
const finite = n => typeof n === 'number' && Number.isFinite(n)
const safe = (value, depth = 0, seen = new Set()) => {
  if (depth > 18 || seen.has(value)) throw Error('Cyclic or overdeep project metadata')
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint' || (typeof value === 'number' && !finite(value))) throw Error('Unsupported project metadata')
    return value
  }
  if (Array.isArray(value) ? Object.getPrototypeOf(value) !== Array.prototype : Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) throw Error('Unsupported project object')
  if (Reflect.ownKeys(value).length > 8192 || Reflect.ownKeys(value).some(k => typeof k !== 'string')) throw Error('Unsupported project keys')
  if (Array.isArray(value) && (value.length > 8192 || Object.keys(value).length !== value.length)) throw Error('Sparse or oversized source array')
  seen.add(value)
  const copy = Array.isArray(value) ? [] : {}
  for (const k of Reflect.ownKeys(value)) {
    const d = Object.getOwnPropertyDescriptor(value, k)
    if (!d || (!Array.isArray(value) && !d.enumerable) || (Array.isArray(value) && k !== 'length' && !d.enumerable) || !('value' in d) || ['__proto__', 'constructor', 'prototype'].includes(k)) throw Error('Unsafe project metadata')
    if (Array.isArray(value) && k === 'length') continue
    copy[k] = safe(d.value, depth + 1, seen)
  }
  seen.delete(value)
  return copy
}
const fail = e => ({ok:false,reason:e.message||String(e),manufacturingApproved:false})
const side = (project, ref) => {
  if (!ref || typeof ref.pieceId !== 'string' || !Number.isInteger(ref.edgeIndex)) throw Error('Invalid seam side')
  const matches = project.pieces.filter(p => p.id === ref.pieceId)
  if (matches.length !== 1) throw Error('Missing or ambiguous seam piece')
  const piece = matches[0]
  if (!Array.isArray(piece.points) || piece.points.length < 3 || piece.points.length > 512 || ref.edgeIndex < 0 || ref.edgeIndex >= piece.points.length) throw Error('Invalid seam edge')
  if (!piece.points.every(p => finite(p.x) && finite(p.y) && Math.abs(p.x) <= 100000 && Math.abs(p.y) <= 100000)) throw Error('Invalid piece coordinates')
  if (piece.curves && Object.keys(piece.curves).some(i => !Number.isInteger(Number(i)) || Number(i) < 0 || Number(i) >= piece.points.length || !finite(piece.curves[i]?.cx) || !finite(piece.curves[i]?.cy))) throw Error('Unsupported seam curves')
  const start = ref.startT === undefined ? 0 : ref.startT
  const end = ref.endT === undefined ? 1 : ref.endT
  if (!finite(start) || !finite(end) || start < 0 || end > 1 || end - start < 1e-6) throw Error('Invalid seam interval')
  const length = edgeRangeLength(piece, ref.edgeIndex, start, end)
  if (!finite(length) || length < 0.01 || length > 100000) throw Error('Invalid sewn length')
  return {piece,ref,start,end,length}
}
const sample = (s,t) => {
  // edgePointAt evaluates physical arclength fractions. Intervals on curved
  // edges use a sampled parameter map only as a preview and are rejected.
  if (s.piece.curves?.[s.ref.edgeIndex]) throw Error('Curve seam subinterval mapping unavailable')
  const station = s.start + (s.end-s.start)*t
  const p = edgePointAt(s.piece,s.ref.edgeIndex,station)?.point
  if (!p || !finite(p.x) || !finite(p.y)) throw Error('Unable to sample seam edge')
  return p
}
const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y)
const diff = (a,b) => ({x:a.x-b.x,y:a.y-b.y})
const rotate = (p,c,s) => ({x:p.x*c-p.y*s,y:p.x*s+p.y*c})

export function inspectAdvancedCadSeamWalk20261024_1423(project,{seamId,sizes,samples=17,lengthToleranceMm=2,shapeToleranceMm=3}={}) {
  try {
    const input = safe(project)
    if (!Array.isArray(input.pieces) || input.pieces.length > 256 || !Array.isArray(input.seams) || input.seams.length > 1024 || typeof seamId !== 'string') throw Error('Invalid project or seam id')
    if (!Number.isInteger(samples) || samples < 5 || samples > 41 || !finite(lengthToleranceMm) || lengthToleranceMm < 0 || lengthToleranceMm > 100 || !finite(shapeToleranceMm) || shapeToleranceMm < 0 || shapeToleranceMm > 100) throw Error('Invalid walk settings')
    const matches=input.seams.filter(s=>s.id===seamId)
    if(matches.length!==1) throw Error('Missing or ambiguous saved seam')
    const seam=matches[0]
    if (seam.reverseB!==undefined && typeof seam.reverseB !== 'boolean') throw Error('Invalid sewn orientation')
    const sizeSet=sizes===undefined?[input.grading?.baseSize||'BASE']:sizes
    if(!Array.isArray(sizeSet)||!sizeSet.length||sizeSet.length>24||sizeSet.some(s=>typeof s!=='string'||!s||s.length>40)||new Set(sizeSet).size!==sizeSet.length) throw Error('Invalid requested sizes')
    const results=[]
    for(const size of sizeSet) {
      if (!input.grading && size!=='BASE') throw Error('Named grade sizes require a grading model')
      const active=size==='BASE' && !input.grading ? input : gradeProject(input,size)
      const a=side(active,seam.a),b=side(active,seam.b)
      const reverse=seam.reverseB===true
      const firstA=sample(a,0),lastA=sample(a,1),firstB=sample(b,reverse?1:0),lastB=sample(b,reverse?0:1)
      const axisA=diff(lastA,firstA),axisB=diff(lastB,firstB)
      const mA=Math.hypot(axisA.x,axisA.y),mB=Math.hypot(axisB.x,axisB.y)
      if(mA<1e-4||mB<1e-4) throw Error('Degenerate sewing chord')
      const c=(axisA.x*axisB.x+axisA.y*axisB.y)/(mA*mB),s=(axisB.x*axisA.y-axisB.y*axisA.x)/(mA*mB)
      const rows=Array.from({length:samples},(_,i)=>{
        const t=i/(samples-1),p=sample(a,t),q=sample(b,reverse?1-t:t),mapped=rotate(diff(q,firstB),c,s)
        const target={x:firstA.x+mapped.x,y:firstA.y+mapped.y}
        const d=diff(p,target)
        return {fraction:t,arclengthAmm:a.length*t*10,arclengthBmm:b.length*t*10,
          cumulativeDifferenceMm:(a.length-b.length)*t*10,
          shapeNormalMm:(axisA.x*d.y-axisA.y*d.x)/mA*10,
          distanceMm:dist(p,target)*10}
      })
      const mismatchMm=(a.length-b.length)*10,maxNormalMm=Math.max(...rows.map(r=>Math.abs(r.shapeNormalMm)))
      const issues=[]
      if(Math.abs(mismatchMm)>lengthToleranceMm)issues.push('SEAM_LENGTH_MISMATCH')
      if(maxNormalMm>shapeToleranceMm)issues.push('SEAM_SHAPE_MISMATCH')
      results.push({size,lengthsMm:[a.length*10,b.length*10],signedMismatchMm:mismatchMm,lengthMismatchMm:Math.abs(mismatchMm),maxNormalMm,rows,issues,referenceWithinTolerance:issues.length===0})
    }
    return {ok:true,seamId,revision:input.revision??null,results,allSizesWithinTolerance:results.every(r=>r.referenceWithinTolerance),
      method:'EXO_CM_PHYSICAL_SEAM_WALK_STRAIGHT_EDGE',manufacturingApproved:false}
  } catch(e) {return fail(e)}
}

// A geometric edit to an authored seam can change notch positioning, seam
// allowance offsets, neighboring edges and graded attachments. Produce only a
// quantified point-movement proposal when the affected endpoint is unadorned.
export function proposeAdvancedCadSeamEndpointTrueing20261024_1423(project,{seamId,moveSide='b',maxMovementMm=30,sizes}={}) {
  try {
    const source=safe(project)
    if (!finite(maxMovementMm)||maxMovementMm<=0||maxMovementMm>100) throw Error('Invalid maximum proposal displacement')
    const inspection=inspectAdvancedCadSeamWalk20261024_1423(source,{seamId,sizes})
    if(!inspection.ok)throw Error(inspection.reason)
    const seam=source.seams.find(s=>s.id===seamId)
    if(moveSide!=='a'&&moveSide!=='b')throw Error('Invalid movement side')
    const moving=side(source,seam[moveSide]),other=side(source,seam[moveSide==='a'?'b':'a'])
    if(moving.start!==0||moving.end!==1||other.start!==0||other.end!==1)throw Error('Only complete seam edges support endpoint proposals')
    if(moving.piece.curves?.[moving.ref.edgeIndex]||other.piece.curves?.[other.ref.edgeIndex])throw Error('Curved edges require explicit trueing controls')
    const p=moving.piece
    const forbidden=['notches','internalLines','edgeSeamAllowances','seamAllowance','darts','pleats','grainline','gradeRules','productionSpec','edgeAllowance','constructionPoints']
    if(forbidden.some(k=>Object.hasOwn(p,k)) || (p.curves && Object.keys(p.curves).length) || Object.keys(p).some(k=>!['id','name','points','curves'].includes(k)))throw Error('Source attachments or cut allowance block automatic endpoint proposal')
    if(p.points.some(v=>v.gradeRule||v.industrialGradeRule||v.anchor||v.id))throw Error('Authored vertex metadata blocks endpoint proposal')
    if(source.seams.some(s=>s!==seam&&(s.a?.pieceId===p.id||s.b?.pieceId===p.id)))throw Error('Adjacent sewn edges require joint reconciliation')
    if(source.customMeasurements?.some(m=>m.pieceId===p.id)||source.productionSpec||source.patternSource||source.patternMetadata)throw Error('Project attachments or production metadata require manual reconciliation')
    const i=moving.ref.edgeIndex,j=(i+1)%p.points.length,a=p.points[i],b=p.points[j]
    const vector=diff(b,a),length=Math.hypot(vector.x,vector.y),target=other.length
    const signedCm=target-length
    if(Math.abs(signedCm)*10>maxMovementMm)throw Error('Endpoint movement exceeds displacement guard')
    if(target<0.01)throw Error('Too short to true')
    const proposed={x:a.x+vector.x*target/length,y:a.y+vector.y*target/length}
    const movementMm=dist(proposed,b)*10
    if(!finite(proposed.x)||!finite(proposed.y))throw Error('Invalid proposed endpoint')
    // Do not claim a multi-size proposal without proving the same edited base
    // point meets every requested grade size after an independent full rerun.
    const staged=safe(source)
    staged.pieces.find(piece=>piece.id===p.id).points[j]=proposed
    const post=inspectAdvancedCadSeamWalk20261024_1423(staged,{seamId,sizes,lengthToleranceMm:0.05})
    if(!post.ok||!post.allSizesWithinTolerance)throw Error('Proposed endpoint fails graded seam reconciliation')
    return {ok:true,seamId,moveSide,pieceId:p.id,pointIndex:j,original:{x:b.x,y:b.y},proposed,
      movementMm,before:inspection.results.map(r=>({size:r.size,lengthMismatchMm:r.lengthMismatchMm})),
      after:post.results.map(r=>({size:r.size,lengthMismatchMm:r.lengthMismatchMm})),
      proposalOnly:true,manufacturingApproved:false,
      caveat:'Detached endpoint reconciliation reference. Neighboring geometry, cuts, attachments, seam allowances and physical samples require independent validation.'}
  }catch(e){return fail(e)}
}
