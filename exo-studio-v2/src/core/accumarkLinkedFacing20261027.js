import { extractAccuMarkReferencePiece20261024_1341 } from './accumarkReferencePieceExtraction20261024_1341.js'

// Linked engineering outline only. No allowance, sewline, cut quantity, or graded piece is generated.
const bad = code => { throw new Error(`LINKED_FACING_${code}`) }
const finite = x => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) <= 100000
const identity = s => typeof s === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(s)
function clean(value) {
  const seen = new Set(); let count = 0
  const visit = (v, depth = 0) => {
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return v
    if (typeof v === 'number') { if (!Number.isFinite(v)) bad('NONFINITE'); return v }
    if (!v || typeof v !== 'object' || depth > 32 || ++count > 12000 || seen.has(v)) bad('COMPLEXITY')
    if (Object.getPrototypeOf(v) !== (Array.isArray(v) ? Array.prototype : Object.prototype)) bad('PROTOTYPE')
    seen.add(v)
    const keys = Reflect.ownKeys(v), descriptors = Object.getOwnPropertyDescriptors(v)
    if (keys.some(k => typeof k !== 'string' || ['__proto__','constructor','prototype','toJSON'].includes(k))) bad('KEY')
    const out = Array.isArray(v) ? [] : {}
    if (Array.isArray(v) && v.length > 12000) bad('COMPLEXITY')
    for (const k of keys) {
      if (Array.isArray(v) && k === 'length') continue
      const d = descriptors[k]
      if (!Object.hasOwn(d,'value') || !d.enumerable || (Array.isArray(v) && (!/^(0|[1-9]\d*)$/.test(k) || Number(k) >= v.length))) bad('ACCESSOR_OR_ARRAY')
      Object.defineProperty(out,k,{value:visit(d.value,depth+1),writable:true,configurable:true,enumerable:true})
    }
    if (Array.isArray(v) && (out.length !== v.length || Object.keys(out).length !== v.length)) bad('SPARSE_ARRAY')
    seen.delete(v)
    return out
  }
  return visit(value)
}
function validateProject(project, sourceId, referenceId) {
  if (!project || !Array.isArray(project.pieces) || !identity(sourceId) || !identity(referenceId) || sourceId === referenceId) bad('IDENTITY')
  if (!Number.isSafeInteger(project.revision) || project.revision < 0) bad('REVISION')
  if (project.pieces.length < 1 || project.pieces.length > 64 || project.pieces.some(p => !p || !identity(p.id)) || new Set(project.pieces.map(p=>p.id)).size !== project.pieces.length || project.pieces.some(p=>p.id === referenceId)) bad('PIECE_IDS')
  const source = project.pieces.find(p=>p.id === sourceId)
  if (!source) bad('SOURCE_GONE')
  // A source with physical or linked extras cannot be interpreted as a derivative facing.
  const keys = ['id','name','points','curves','fabricId','locked']
  if (Object.keys(source).some(k=>!keys.includes(k))) bad('SOURCE_ATTACHMENTS_UNSUPPORTED')
  if (!Array.isArray(source.points) || source.points.some(p=>!p || Object.keys(p).some(k=>!['x','y'].includes(k)))) bad('POINT_ATTACHMENTS_UNSUPPORTED')
  if (source.locked === true || (source.fabricId !== undefined && (typeof source.fabricId !== 'string' || !source.fabricId.trim()))) bad('SOURCE_METADATA')
  if (project.grading !== undefined || project.seams !== undefined || project.customMeasurements !== undefined) bad('PROJECT_LINKS_UNSUPPORTED')
  if (Object.keys(project).some(k=>!['revision','pieces','updatedAt'].includes(k))) bad('PROJECT_METADATA_UNSUPPORTED')
  return source
}
function signature(value) {
  const string = JSON.stringify(value)
  let hash = 0xcbf29ce484222325n
  for (let i=0;i<string.length;i++) { hash ^= BigInt(string.charCodeAt(i)); hash = hash*0x100000001b3n & 0xffffffffffffffffn }
  return `fnv1a64:${hash.toString(16).padStart(16,'0')}`
}
// A sampled inward-normal preview, deliberately separate from the legacy translated
// reference piece. Polyline vertices use tangent-bisector miters; curves are sampled
// by a flatness bound. This is not an analytic quadratic offset or a sewline.
function normalOffsetPreview(points, curves, depthCm) {
  const sampled=[]
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length],c=curves?.[i]
    const deviation=c?Math.hypot(c.cx-(a.x+b.x)/2,c.cy-(a.y+b.y)/2):0
    const steps=c?Math.max(8,Math.ceil(Math.sqrt(deviation/0.0025))):1
    if(steps>256 || sampled.length+steps>512) bad('OFFSET_SAMPLE_BUDGET')
    for(let j=0;j<steps;j++){
      const t=j/steps,u=1-t
      sampled.push(c?{x:u*u*a.x+2*u*t*c.cx+t*t*b.x,y:u*u*a.y+2*u*t*c.cy+t*t*b.y}:{x:a.x,y:a.y})
    }
  }
  const n=sampled.length
  let signedArea=0
  for(let i=0;i<n;i++)signedArea+=sampled[i].x*sampled[(i+1)%n].y-sampled[(i+1)%n].x*sampled[i].y
  if(Math.abs(signedArea)<1e-7)bad('OFFSET_DEGENERATE_AREA')
  const side=Math.sign(signedArea), shifted=[]
  for(let i=0;i<n;i++){
    const prev=sampled[(i+n-1)%n],p=sampled[i],next=sampled[(i+1)%n]
    const dx1=p.x-prev.x,dy1=p.y-prev.y,dx2=next.x-p.x,dy2=next.y-p.y
    const l1=Math.hypot(dx1,dy1),l2=Math.hypot(dx2,dy2)
    if(l1<1e-7||l2<1e-7)bad('OFFSET_DEGENERATE_EDGE')
    const u1={x:dx1/l1,y:dy1/l1},u2={x:dx2/l2,y:dy2/l2}
    const dot=u1.x*u2.x+u1.y*u2.y,turn=u1.x*u2.y-u1.y*u2.x
    if(dot< -0.95||side*turn< -0.03)bad('OFFSET_CONCAVE_OR_CUSP')
    const denom=1+dot
    if(denom<0.1)bad('OFFSET_MITER')
    const miter=depthCm/denom
    const x=p.x+side*miter*(-u1.y-u2.y),y=p.y+side*miter*(u1.x+u2.x)
    if(!finite(x)||!finite(y)||Math.hypot(x-p.x,y-p.y)>3*depthCm)bad('OFFSET_MITER')
    shifted.push({x,y})
  }
  // A deep inward offset can collapse even an otherwise valid convex contour.
  let area=0
  const intersects=(a,b,c,d)=>{
    const cross=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x)
    const ab=cross(a,b,c),ad=cross(a,b,d),ca=cross(c,d,a),cb=cross(c,d,b),eps=1e-8
    const on=(p,q,r)=>r.x>=Math.min(p.x,q.x)-eps&&r.x<=Math.max(p.x,q.x)+eps&&r.y>=Math.min(p.y,q.y)-eps&&r.y<=Math.max(p.y,q.y)+eps
    return ((ab>eps&&ad< -eps||ab< -eps&&ad>eps)&&(ca>eps&&cb< -eps||ca< -eps&&cb>eps))||Math.abs(ab)<=eps&&on(a,b,c)||Math.abs(ad)<=eps&&on(a,b,d)||Math.abs(ca)<=eps&&on(c,d,a)||Math.abs(cb)<=eps&&on(c,d,b)
  }
  for(let i=0;i<n;i++){
    const a=shifted[i],b=shifted[(i+1)%n]
    area+=a.x*b.y-b.x*a.y
    if(Math.hypot(a.x-b.x,a.y-b.y)<1e-6)bad('OFFSET_COLLAPSED')
    for(let j=i+2;j<n;j++)if(!(i===0&&j===n-1)&&intersects(a,b,shifted[j],shifted[(j+1)%n]))bad('OFFSET_SELF_INTERSECTION')
  }
  if(Math.sign(area)!==side||Math.abs(area)<1e-6||Math.abs(area)>=Math.abs(signedArea))bad('OFFSET_COLLAPSED')
  return {kind:'SAMPLED_INWARD_NORMAL_OFFSET_PREVIEW_V1',referenceOnly:true,approximate:true,depthCm,
    sourceSampleCount:n,sourceGeometryHash:null,points:shifted,closed:true,unit:'cm',
    toleranceCm:0.0025,limitations:'Sampled normal/miter polygon; not an exact quadratic offset, production facing, seamline, or allowance.'}
}
function construct(project, config) {
  const { sourcePieceId, facingId, facingName, depthCm } = config
  if (!identity(sourcePieceId) || !identity(facingId) || !finite(depthCm) || depthCm <= 0 || depthCm > 30 || typeof facingName !== 'string' || !facingName.trim() || facingName.length > 140) bad('OPTIONS')
  const source = validateProject(project,sourcePieceId,facingId)
  const reference = extractAccuMarkReferencePiece20261024_1341(project,{sourcePieceId,referenceId:facingId,referenceName:facingName})
  const contour = reference.piece
  let offsetPreview=null, offsetRefusal=null
  try { offsetPreview=normalOffsetPreview(contour.points,contour.curves,depthCm);offsetPreview.sourceGeometryHash=reference.provenance.sourceGeometryHash }
  catch(error) { if(!/^LINKED_FACING_OFFSET_/.test(error.message))throw error;offsetRefusal=error.message }
  // Constant translation is an exactly shape-preserving relationship for straight and
  // quadratic EXO boundaries. It is an outline study, not a geometric offset curve.
  const points = contour.points.map(p=>({x:p.x,y:p.y-depthCm}))
  const curves = contour.curves && Object.fromEntries(Object.entries(contour.curves).map(([edge,c])=>[edge,{cx:c.cx,cy:c.cy-depthCm}]))
  const provenance = {
    kind:'LINKED_FACING_ENGINEERING_STUDY_V1', sourcePieceId,sourceRevision:project.revision,
    sourceGeometryHash:reference.provenance.sourceGeometryHash,sourceMetadataHash:signature({name:source.name ?? null,fabricId:source.fabricId ?? null,locked:source.locked ?? null}),
    facingId,facingName,depthCm,transform:'TRANSLATE_NEGATIVE_Y_CM',referenceOnly:true,detached:true,
    factoryApproved:false,sewingAndGradingRulesImported:false,gradedSizesProductionSafe:false,
  }
  const piece={id:facingId,name:facingName,points,locked:true,patternImportProvenance:{...provenance}}
  if (curves) piece.curves=curves
  if (source.fabricId !== undefined) piece.fabricId=source.fabricId
  const study={kind:provenance.kind,piece,provenance:{...provenance},referenceOnly:true,factoryApproved:false,unit:'cm'}
  return {project,study,piece,provenance,engineeringOnly:true,unit:'cm',sourceChanged:false,offsetPreview,offsetRefusal,
    warnings:['Engineering outline displaced by a fixed vector. A separate approximate inward-normal preview is provided only where the sampled contour passes conservative checks; neither is a cut-ready facing. Sewing, grading, and production relationships remain unverified.']}
}

/** Create a revision-tracked derived engineering outline; it never enters project.pieces. */
export function createAccuMarkLinkedFacing20261027(input,options={}) {
  const project=clean(input),opts=clean(options)
  if (!opts || Object.keys(opts).some(k=>!['sourcePieceId','facingId','facingName','depthCm'].includes(k))) bad('OPTIONS')
  return construct(project,opts)
}

/** Fail on unexpected project revision, forged link, or unsupported source attachments. */
export function updateAccuMarkLinkedFacing20261027(input,prior,options={}) {
  const project=clean(input),previous=clean(prior),opts=clean(options)
  if (!opts || Object.keys(opts).some(k=>!['expectedSourceRevision'].includes(k))) bad('OPTIONS')
  if (!previous || previous.kind!=='LINKED_FACING_ENGINEERING_STUDY_V1' || previous.referenceOnly!==true || previous.factoryApproved!==false || !previous.piece || !previous.provenance) bad('INVALID_LINK')
  const link=previous.provenance, pp=previous.piece.patternImportProvenance
  if (!pp || signature(pp)!==signature(link) || link.kind!==previous.kind || !link.referenceOnly || !link.detached || link.factoryApproved!==false || link.sewingAndGradingRulesImported!==false || link.gradedSizesProductionSafe!==false || previous.piece.id!==link.facingId || previous.piece.name!==link.facingName || previous.piece.locked!==true || Object.keys(previous.piece).some(k=>!['id','name','points','curves','locked','fabricId','patternImportProvenance'].includes(k))) bad('INVALID_LINK')
  if (opts.expectedSourceRevision !== undefined && opts.expectedSourceRevision !== project.revision) bad('REVISION_CONFLICT')
  if (project.revision < link.sourceRevision) bad('REVISION_ROLLBACK')
  const updated=construct(project,{sourcePieceId:link.sourcePieceId,facingId:link.facingId,facingName:link.facingName,depthCm:link.depthCm})
  if (project.revision === link.sourceRevision && (updated.provenance.sourceGeometryHash!==link.sourceGeometryHash || updated.provenance.sourceMetadataHash!==link.sourceMetadataHash)) bad('SILENT_SOURCE_EDIT')
  const sourceChanged=updated.provenance.sourceGeometryHash!==link.sourceGeometryHash || updated.provenance.sourceMetadataHash!==link.sourceMetadataHash
  return {...updated,sourceChanged,revisionAdvanced:project.revision!==link.sourceRevision,previousSourceRevision:link.sourceRevision}
}
