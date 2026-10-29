import {gradeProject} from './grading.js'
import {inspectCutlinePolygon} from './cutlineTopology.js'

// Rectangular, straight-boundary, six-size parent/child engineering study.
// Output is detached from project.pieces and never constitutes a production facing.
const reject = code => { throw new Error('CONNECTED_DERIVATIVE_' + code) }
const id = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(value)
const number = value => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) < 100000
const keys = (value, allowed) => value && !Array.isArray(value) && Object.keys(value).every(key => allowed.includes(key))
function copy(input) {
  const seen = new Set()
  let count = 0
  function visit(v, depth = 0) {
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return v
    if (typeof v === 'number') { if (!Number.isFinite(v)) reject('NONFINITE'); return v }
    if (!v || typeof v !== 'object' || depth > 24 || ++count > 15000 || seen.has(v)) reject('INVALID_INPUT')
    if (Object.getPrototypeOf(v) !== (Array.isArray(v) ? Array.prototype : Object.prototype)) reject('UNSAFE_PROTOTYPE')
    seen.add(v)
    const result = Array.isArray(v) ? [] : {}
    const descriptors = Object.getOwnPropertyDescriptors(v)
    for (const key of Reflect.ownKeys(descriptors)) {
      if (typeof key !== 'string' || ['__proto__','constructor','prototype','toJSON'].includes(key)) reject('UNSAFE_KEY')
      if (Array.isArray(v) && key === 'length') continue
      const descriptor = descriptors[key]
      if (!descriptor.enumerable || !Object.hasOwn(descriptor,'value') || (Array.isArray(v) && (!/^(0|[1-9]\d*)$/.test(key) || +key >= v.length))) reject('ACCESSOR_OR_ARRAY')
      Object.defineProperty(result,key,{value:visit(descriptor.value,depth+1),configurable:true,writable:true,enumerable:true})
    }
    if (Array.isArray(v) && (result.length !== v.length || Object.keys(result).length !== v.length)) reject('SPARSE_ARRAY')
    seen.delete(v)
    return result
  }
  return visit(input)
}
const canonical = value => JSON.stringify(value)
function hash(value) {
  const string = canonical(value)
  let h = 0xcbf29ce484222325n
  for (let i=0;i<string.length;i++) h = ((h ^ BigInt(string.charCodeAt(i))) * 0x100000001b3n) & 0xffffffffffffffffn
  return h.toString(16).padStart(16,'0')
}
const pointKeys = ['id','x','y','industrialGradeRule','gradeRule']
const pieceKeys = ['id','name','points','locked','fabricId']
const gradingKeys = ['sizes','baseSize','widthPerSizeCm','lengthPerSizeCm']
const schema = 'CONNECTED_RECTANGULAR_FACING_SIX_SIZE_DRAFT_V1'
function sourceOf(project, sourcePieceId, childPieceId) {
  if (!keys(project,['revision','pieces','grading','updatedAt']) || !Number.isSafeInteger(project.revision) || project.revision < 0 ||
      !Array.isArray(project.pieces) || project.pieces.length !== 1 || !id(sourcePieceId) || !id(childPieceId) || sourcePieceId === childPieceId) reject('PROJECT_SCOPE')
  const p = project.pieces[0]
  if (!p || p.id !== sourcePieceId || !keys(p,pieceKeys) || p.locked === true || (p.fabricId !== undefined && !id(p.fabricId))) reject('SOURCE_ATTACHMENTS')
  if (!Array.isArray(p.points) || p.points.length !== 4 || p.points.some(v => !keys(v,pointKeys) || !id(v.id) || !number(v.x) || !number(v.y) ||
    (v.gradeRule !== undefined && (!keys(v.gradeRule,['enabled','dxPerSize','dyPerSize']) || v.gradeRule.enabled !== true || !number(v.gradeRule.dxPerSize) || !number(v.gradeRule.dyPerSize))))) reject('VERTEX_SCHEMA')
  if (new Set(p.points.map(v=>v.id)).size !== 4 || p.points.some(v=>v.industrialGradeRule !== undefined && v.gradeRule !== undefined)) reject('VERTEX_IDENTITY')
  const g = project.grading
  if (!keys(g,gradingKeys) || !Array.isArray(g.sizes) || g.sizes.length !== 6 || new Set(g.sizes).size !== 6 ||
      g.sizes.some(s=>!id(s)) || !g.sizes.includes(g.baseSize) ||
      (g.widthPerSizeCm !== undefined && !number(g.widthPerSizeCm)) ||
      (g.lengthPerSizeCm !== undefined && !number(g.lengthPerSizeCm))) reject('SIX_SIZE_SCOPE')
  return p
}
function insetRectangle(points, depthCm) {
  if (points.length !== 4 || points.some(p=>!number(p.x)||!number(p.y))) reject('GRADED_POINTS')
  const xs=points.map(p=>p.x), ys=points.map(p=>p.y)
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys)
  if (!(maxX-minX>2*depthCm+0.01) || !(maxY-minY>2*depthCm+0.01)) reject('INSUFFICIENT_DIMENSIONS')
  const corners = [[minX,minY],[maxX,minY],[maxX,maxY],[minX,maxY]]
  if (new Set(points.map(p=>p.x+','+p.y)).size !== 4 ||
      points.some(p=>!corners.some(([x,y])=>Math.abs(p.x-x)<1e-8 && Math.abs(p.y-y)<1e-8))) reject('NON_RECTANGULAR')
  const area = points.reduce((s,p,i)=>s+p.x*points[(i+1)%4].y-p.y*points[(i+1)%4].x,0)/2
  if (Math.abs(area)<1e-6) reject('ZERO_AREA')
  for (let i=0;i<4;i++) {
    const a=points[i], b=points[(i+1)%4]
    if ((Math.abs(a.x-b.x)<1e-8) === (Math.abs(a.y-b.y)<1e-8)) reject('EDGE_TOPOLOGY')
  }
  const derived=points.map(p=>({
    id:'', sourceVertexId:p.id,
    x:p.x===minX?minX+depthCm:maxX-depthCm,
    y:p.y===minY?minY+depthCm:maxY-depthCm
  }))
  const shape=inspectCutlinePolygon(derived)
  if (!shape.ok || Math.sign(area) !== Math.sign(derived.reduce((s,p,i)=>s+p.x*derived[(i+1)%4].y-p.y*derived[(i+1)%4].x,0)/2)) reject('DERIVED_TOPOLOGY')
  const original=inspectCutlinePolygon(points)
  if (!original.ok || !(original.areaCm2>shape.areaCm2)) reject('SOURCE_TOPOLOGY')
  for (let i=0;i<4;i++) {
    const a=points[i],b=points[(i+1)%4],c=derived[i],d=derived[(i+1)%4]
    if (Math.abs(Math.hypot(a.x-b.x,a.y-b.y)-Math.hypot(c.x-d.x,c.y-d.y)-2*depthCm)>1e-7) reject('DIMENSION_GUARD')
  }
  return {derived,outerAreaCm2:original.areaCm2,innerAreaCm2:shape.areaCm2,widthCm:maxX-minX,heightCm:maxY-minY}
}
function build(project, opts) {
  const {sourcePieceId,childPieceId,childName,depthCm}=opts
  if (!keys(opts,['sourcePieceId','childPieceId','childName','depthCm']) || !id(sourcePieceId) || !id(childPieceId) ||
      !childName || typeof childName !== 'string' || childName.length>120 || !number(depthCm) || !(depthCm>=0.1 && depthCm<=5)) reject('OPTIONS')
  const source=sourceOf(project,sourcePieceId,childPieceId)
  const sizeViews=[]
  for (const size of project.grading.sizes) {
    let graded
    try { graded=gradeProject(project,size).pieces[0] } catch { reject('GRADE_EVALUATION_FAILED') }
    if (!graded || graded.points.length!==4 || graded.points.some((p,i)=>p.id!==source.points[i].id)) reject('GRADE_IDENTITY')
    const result=insetRectangle(graded.points,depthCm)
    result.derived.forEach((p,i)=>{p.id=`${childPieceId}_${source.points[i].id}`})
    sizeViews.push({size,sourceVertices:graded.points.map(p=>({id:p.id,x:p.x,y:p.y})),childVertices:result.derived,
      outerAreaCm2:result.outerAreaCm2,innerAreaCm2:result.innerAreaCm2,widthCm:result.widthCm,heightCm:result.heightCm})
  }
  const sourceHash=hash({source,grading:project.grading})
  const childHash=hash(sizeViews)
  const provenance={schema,sourcePieceId,childPieceId,childName,depthCm,unit:'cm',sourceRevision:project.revision,
    sourceHash,childHash,sourceVertexIds:source.points.map(p=>p.id),childVertexIds:sizeViews[0].childVertices.map(p=>p.id),
    sizes:[...project.grading.sizes],referenceOnly:true,manufacturingApproved:false}
  return {kind:schema,projectUnchanged:true,referenceOnly:true,manufacturingApproved:false,unit:'cm',
    sizeViews,provenance,sourceChanged:false,
    limitations:['Detached connected rectangular facing engineering draft only; no sewline, seam allowance, cutting, nesting or manufacturing approval.',
      'Only six straight-edge rectangular legacy size views are accepted; curves, notches, holes and sewn attachments are refused.']}
}
export function createModarisConnectedIndustrialDerivative20261027(input,options={}) {
  return build(copy(input),copy(options))
}
export function regenerateModarisConnectedIndustrialDerivative20261027(input,previous,options={}) {
  const project=copy(input), prior=copy(previous), opts=copy(options)
  if (!keys(opts,['expectedRevision']) || (opts.expectedRevision!==undefined && opts.expectedRevision!==project?.revision)) reject('REVISION_CONFLICT')
  const p=prior?.provenance
  if (!keys(prior,['kind','projectUnchanged','referenceOnly','manufacturingApproved','unit','sizeViews','provenance','sourceChanged','limitations','regenerated','previousSourceRevision']) ||
      !p || !keys(p,['schema','sourcePieceId','childPieceId','childName','depthCm','unit','sourceRevision','sourceHash','childHash','sourceVertexIds','childVertexIds','sizes','referenceOnly','manufacturingApproved']) ||
      prior.kind!==schema || p.schema!==schema || prior.referenceOnly!==true || prior.manufacturingApproved!==false || p.referenceOnly!==true ||
      p.manufacturingApproved!==false || p.unit!=='cm' || prior.unit!=='cm' || prior.projectUnchanged!==true ||
      !Array.isArray(prior.sizeViews) || hash(prior.sizeViews)!==p.childHash ||
      !Array.isArray(p.sourceVertexIds) || !Array.isArray(p.childVertexIds) ||
      !prior.sizeViews.every(view=>canonical(view.sourceVertices.map(v=>v.id))===canonical(p.sourceVertexIds) &&
        canonical(view.childVertices.map(v=>v.id))===canonical(p.childVertexIds) &&
        view.childVertices.every((v,i)=>v.sourceVertexId===p.sourceVertexIds[i])) ||
      !Number.isSafeInteger(p.sourceRevision) || project.revision<p.sourceRevision) reject('INVALID_PROVENANCE')
  const result=build(project,{sourcePieceId:p.sourcePieceId,childPieceId:p.childPieceId,childName:p.childName,depthCm:p.depthCm})
  if (canonical(result.provenance.sizes)!==canonical(p.sizes) ||
      canonical(result.provenance.sourceVertexIds)!==canonical(p.sourceVertexIds) ||
      canonical(result.provenance.childVertexIds)!==canonical(p.childVertexIds)) reject('TOPOLOGY_CHANGED')
  const sourceChanged=result.provenance.sourceHash!==p.sourceHash
  if (sourceChanged && project.revision===p.sourceRevision) reject('SILENT_SOURCE_EDIT')
  // Recalculate the old child from the captured source size views to detect coordinated
  // edits to both the visible child and its hash, without trusting prior child geometry.
  for (const view of prior.sizeViews) {
    if (!p.sizes.includes(view.size)) reject('SIZE_TAMPER')
    const expected=insetRectangle(view.sourceVertices,p.depthCm)
    expected.derived.forEach((v,i)=>{v.id=p.childVertexIds[i]})
    if (canonical(expected.derived)!==canonical(view.childVertices) ||
        Math.abs(expected.outerAreaCm2-view.outerAreaCm2)>1e-8 ||
        Math.abs(expected.innerAreaCm2-view.innerAreaCm2)>1e-8 ||
        Math.abs(expected.widthCm-view.widthCm)>1e-8 ||
        Math.abs(expected.heightCm-view.heightCm)>1e-8) reject('CHILD_TAMPER')
  }
  if (project.revision===p.sourceRevision && hash(result.sizeViews)!==p.childHash) reject('SILENT_SOURCE_EDIT')
  return {...result,sourceChanged,regenerated:true,previousSourceRevision:p.sourceRevision}
}
export function verifySavedModarisConnectedIndustrialDerivative20261027(project,saved) {
  const result=regenerateModarisConnectedIndustrialDerivative20261027(project,saved,{expectedRevision:project.revision})
  if (result.sourceChanged || result.provenance.childHash!==saved.provenance.childHash) reject('STALE_SAVED_DERIVATIVE')
  return {ok:true,unit:'cm',sizeCount:6,manufacturingApproved:false}
}
