import {gradeProject} from './grading.js'
import {previewModarisDartTransfer20261027} from './modarisDartTransfer20261027.js'

const fail=reason=>{throw new Error('SIX_SIZE_DART_PROOF_'+reason)}
const finite=x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<100000
const id=s=>typeof s==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(s)
const sizes=['XS','S','M','L','XL','XXL']
const schema='SIX_SIZE_DETACHED_DART_CLOSURE_PROOF_V1'
const json=x=>JSON.stringify(x)
function digest(x){
  let h=0xcbf29ce484222325n
  for(const ch of json(x))h=((h^BigInt(ch.charCodeAt(0)))*0x100000001b3n)&0xffffffffffffffffn
  return 'fnv1a64:'+h.toString(16).padStart(16,'0')
}
function clone(input){
  const seen=new Set();let nodes=0
  function walk(v,depth=0){
    if(v===null||typeof v==='string'||typeof v==='boolean')return v
    if(typeof v==='number'){if(!Number.isFinite(v))fail('NONFINITE');return v}
    if(!v||typeof v!=='object'||depth>24||++nodes>10000||seen.has(v))fail('INPUT_COMPLEXITY')
    if(Object.getPrototypeOf(v)!==(Array.isArray(v)?Array.prototype:Object.prototype))fail('PROTOTYPE')
    seen.add(v)
    const result=Array.isArray(v)?[]:{}
    for(const [key,desc] of Object.entries(Object.getOwnPropertyDescriptors(v))){
      if(Array.isArray(v)&&key==='length')continue
      if(['__proto__','constructor','prototype','toJSON'].includes(key)||!Object.hasOwn(desc,'value')||!desc.enumerable)fail('UNSAFE_PROPERTY')
      if(Array.isArray(v)&&(!/^(0|[1-9]\d*)$/.test(key)||+key>=v.length))fail('ARRAY_PROPERTY')
      Object.defineProperty(result,key,{value:walk(desc.value,depth+1),enumerable:true,writable:true,configurable:true})
    }
    if(Array.isArray(v)&&(result.length!==v.length||Object.keys(result).length!==v.length))fail('SPARSE_ARRAY')
    seen.delete(v);return result
  }
  return walk(input)
}
function sourceGate(project,config){
  if(!project||!Number.isSafeInteger(project.revision)||project.revision<0||!Array.isArray(project.pieces)||project.pieces.length!==1||
     Object.keys(project).some(k=>!['revision','pieces','grading','updatedAt'].includes(k)))fail('PROJECT_ATTACHMENTS')
  const grading=project.grading
  if(!grading||json(grading.sizes)!==json(sizes)||grading.baseSize!=='M'||
     Object.keys(grading).some(k=>!['sizes','baseSize','widthPerSizeCm','lengthPerSizeCm'].includes(k)))fail('SIZE_INVENTORY')
  if(!config||Object.keys(config).some(k=>!['pieceId','apex','firstLegIndex','secondLegIndex','rotateFromIndex','rotateToIndex','targetEdgeIndex','expectedRevision'].includes(k))||
    config.expectedRevision!==project.revision||!id(config.pieceId)||config.pieceId!==project.pieces[0].id)fail('CONFIG_REVISION')
  if(!config.apex||Object.keys(config.apex).sort().join(',')!=='x,y'||!finite(config.apex.x)||!finite(config.apex.y))fail('APEX')
  const piece=project.pieces[0]
  if(Object.keys(piece).some(k=>!['id','name','points','locked','fabricId'].includes(k))||piece.locked===true)fail('PIECE_ATTACHMENTS')
  if(!Array.isArray(piece.points)||piece.points.length<4||piece.points.length>64)fail('POINT_COUNT')
  const pointIds=[]
  for(let i=0;i<piece.points.length;i++){
    const p=piece.points[i]
    if(!p||Object.keys(p).some(k=>!['id','x','y','gradeRule'].includes(k))||!finite(p.x)||!finite(p.y)||
       (p.id!==undefined&&!id(p.id)))fail('POINT_ATTACHMENTS')
    if(p.gradeRule!==undefined&&(!p.gradeRule||p.gradeRule.enabled!==true||
      Object.keys(p.gradeRule).sort().join(',')!=='dxPerSize,dyPerSize,enabled'||
      !finite(p.gradeRule.dxPerSize)||!finite(p.gradeRule.dyPerSize)))fail('GRADE_RULE')
    pointIds.push(p.id??'index:'+i)
  }
  if(new Set(pointIds).size!==pointIds.length)fail('POINT_IDENTITY')
  return {piece,pointIds}
}
// An affine transform inferred from three source vertices must map every vertex
// within a tight tolerance. This also proves the chosen apex's physical grade.
function gradedApex(base,graded,apex){
  let anchors
  for(let i=0;i<base.length&&!anchors;i++)for(let j=i+1;j<base.length&&!anchors;j++)for(let k=j+1;k<base.length&&!anchors;k++){
    const a=base[i],b=base[j],c=base[k]
    const det=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)
    if(Math.abs(det)>1e-5)anchors=[i,j,k,det]
  }
  if(!anchors)fail('AFFINE_ANCHORS')
  const [i,j,k,det]=anchors,a=base[i],b=base[j],c=base[k]
  const u=p=>((p.x-a.x)*(c.y-a.y)-(p.y-a.y)*(c.x-a.x))/det
  const v=p=>((b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x))/det
  const map=p=>{
    const s=u(p),t=v(p),A=graded[i],B=graded[j],C=graded[k]
    return {x:A.x+s*(B.x-A.x)+t*(C.x-A.x),y:A.y+s*(B.y-A.y)+t*(C.y-A.y)}
  }
  for(let p=0;p<base.length;p++){
    const predicted=map(base[p])
    if(Math.hypot(predicted.x-graded[p].x,predicted.y-graded[p].y)>1e-7)fail('NON_AFFINE_GRADE')
  }
  const result=map(apex)
  if(!finite(result.x)||!finite(result.y))fail('APEX_TRANSFORM')
  return result
}
function produce(project,config){
  const {piece,pointIds}=sourceGate(project,config)
  const base=piece.points.map(p=>({x:p.x,y:p.y}))
  const rows=[]
  for(const size of sizes){
    let graded
    try{graded=gradeProject(project,size)}catch{fail('GRADE_FAILED_'+size)}
    const gp=graded?.pieces?.[0]?.points
    if(!Array.isArray(gp)||gp.length!==base.length||gp.some((p,i)=>!finite(p.x)||!finite(p.y)||(p.id??'index:'+i)!==pointIds[i]))fail('GRADE_TOPOLOGY_'+size)
    const physical=gp.map(p=>({x:p.x,y:p.y}))
    const apex=gradedApex(base,physical,config.apex)
    const {firstLegIndex,secondLegIndex}=config
    if(!Number.isInteger(firstLegIndex)||!Number.isInteger(secondLegIndex)||!physical[firstLegIndex]||!physical[secondLegIndex])fail('LEG_INDICES')
    const r1=Math.hypot(physical[firstLegIndex].x-apex.x,physical[firstLegIndex].y-apex.y)
    const r2=Math.hypot(physical[secondLegIndex].x-apex.x,physical[secondLegIndex].y-apex.y)
    const radialResidualCm=Math.abs(r1-r2)
    if(r1<1e-6||r2<1e-6||radialResidualCm>1e-7)fail('RADIAL_RESIDUAL_'+size)
    const transient={revision:project.revision,pieces:[{id:piece.id,points:physical}]}
    let preview
    try{preview=previewModarisDartTransfer20261027(transient,{...config,apex})}
    catch(error){fail('CLOSURE_'+size+'_'+String(error.message).slice(0,150))}
    const legA=preview.previewPoints[firstLegIndex],legB=preview.previewPoints[secondLegIndex]
    const closureResidualCm=Math.hypot(legA.x-legB.x,legA.y-legB.y)
    if(closureResidualCm>1e-7)fail('CLOSURE_LEGS_'+size)
    const a=physical[config.rotateFromIndex],b=physical[config.rotateToIndex]
    const A=preview.previewPoints[config.rotateFromIndex],B=preview.previewPoints[config.rotateToIndex]
    const tangentResidualCm=Math.abs(Math.hypot(a.x-b.x,a.y-b.y)-Math.hypot(A.x-B.x,A.y-B.y))
    if(tangentResidualCm>1e-7)fail('TANGENT_RESIDUAL_'+size)
    rows.push({size,pointIds:[...pointIds],pointIndices:pointIds.map((_,i)=>i),apex,rotationRadians:preview.rotationRadians,
      intakeRadians:preview.intakeRadians,radialResidualCm,closureResidualCm,tangentResidualCm,
      originalSignedAreaCm2:preview.originalSignedAreaCm2,previewSignedAreaCm2:preview.previewSignedAreaCm2,
      originalVertices:physical.map((p,i)=>({index:i,id:pointIds[i],...p})),
      previewVertices:preview.previewPoints.map((p,i)=>({index:i,id:pointIds[i],x:p.x,y:p.y}))})
  }
  return {kind:schema,sourceRevision:project.revision,sourceDigest:digest({project,config}),config,
    sizes:[...sizes],pointIds,rows,rowsDigest:digest(rows),projectUnchanged:true,manufacturingApproved:false,
    limitations:['Detached physical closure feasibility only: no target-edge opening, transferred dart, sewn seam, allowances or production geometry.']}
}
export function createModarisSixSizeDartClosureProof20261027(input,options={}){
  return produce(clone(input),clone(options))
}
export function verifySavedModarisSixSizeDartClosureProof20261027(input,saved){
  const project=clone(input),prior=clone(saved)
  if(!prior||prior.kind!==schema||prior.projectUnchanged!==true||prior.manufacturingApproved!==false||
    !Array.isArray(prior.rows)||prior.rows.length!==6||json(prior.sizes)!==json(sizes)||
    !Array.isArray(prior.pointIds)||prior.rowsDigest!==digest(prior.rows)||prior.sourceRevision!==project?.revision)fail('STALE_OR_TAMPERED_PROOF')
  const fresh=produce(project,prior.config)
  if(json(fresh)!==json(prior))fail('STALE_OR_TAMPERED_PROOF')
  return {ok:true,sizeCount:6,sourceDigest:fresh.sourceDigest,manufacturingApproved:false}
}
