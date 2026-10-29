import { cloneProject, touchProject } from './project.js'

const allowedPiece = new Set(['id','name','points','layout2d','arrangement3d','seamAllowance','fabricId','locked','cutQuantity'])
const allowedLayout = new Set(['x','y'])
const allowedArrangement = new Set(['x','y','z','flip'])
const LIMIT = 100000
const fail = (code) => { throw new Error(`RIGID_PIECE_${code}`) }
const finite = n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= LIMIT

function segmentsIntersect(a,b,c,d) {
  const cross=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x)
  const ab1=cross(a,b,c), ab2=cross(a,b,d), cd1=cross(c,d,a), cd2=cross(c,d,b)
  const on=(a,b,p)=>Math.min(a.x,b.x)-1e-9<=p.x&&p.x<=Math.max(a.x,b.x)+1e-9&&Math.min(a.y,b.y)-1e-9<=p.y&&p.y<=Math.max(a.y,b.y)+1e-9
  if ((ab1>0&&ab2<0||ab1<0&&ab2>0)&&(cd1>0&&cd2<0||cd1<0&&cd2>0)) return true
  return Math.abs(ab1)<1e-9&&on(a,b,c)||Math.abs(ab2)<1e-9&&on(a,b,d)||Math.abs(cd1)<1e-9&&on(c,d,a)||Math.abs(cd2)<1e-9&&on(c,d,b)
}
function signedArea(pts) { return pts.reduce((s,p,i)=>{const q=pts[(i+1)%pts.length];return s+p.x*q.y-q.x*p.y},0)/2 }
function validateContour(points) {
  if (!Array.isArray(points)||points.length<3||points.length>128) fail('POINT_BUDGET')
  for (const p of points) if (!p||Object.keys(p).sort().join(',')!=='x,y'||!finite(p.x)||!finite(p.y)) fail('POINT_ATTACHMENT_OR_COORDINATE')
  if (Math.abs(signedArea(points))<1e-7) fail('DEGENERATE_CONTOUR')
  for(let i=0;i<points.length;i++) {
    const a=points[i],b=points[(i+1)%points.length]
    if(Math.hypot(a.x-b.x,a.y-b.y)<1e-7)fail('ZERO_EDGE')
    for(let j=i+1;j<points.length;j++) {
      if(j===i+1||(i===0&&j===points.length-1))continue
      if(segmentsIntersect(a,b,points[j],points[(j+1)%points.length]))fail('SELF_INTERSECTION')
    }
  }
}
function validatePiece(piece) {
  if (!piece||typeof piece!=='object'||Array.isArray(piece))fail('INVALID_PIECE')
  if (Object.keys(piece).some(k=>!allowedPiece.has(k)))fail('UNSUPPORTED_ATTACHMENT')
  if (typeof piece.id!=='string'||!piece.id||piece.id.length>100||typeof piece.name!=='string'||piece.name.length>120)fail('IDENTITY')
  if(piece.locked)fail('LOCKED')
  if(piece.layout2d&&(Object.keys(piece.layout2d).some(k=>!allowedLayout.has(k))||!finite(piece.layout2d.x)||!finite(piece.layout2d.y)))fail('LAYOUT')
  if(piece.arrangement3d&&(Object.keys(piece.arrangement3d).some(k=>!allowedArrangement.has(k))||!['x','y','z'].every(k=>finite(piece.arrangement3d[k]))||typeof piece.arrangement3d.flip!=='boolean'))fail('ARRANGEMENT')
  if(piece.seamAllowance!==undefined&&(!finite(piece.seamAllowance)||piece.seamAllowance<0))fail('SEAM_ALLOWANCE')
  if(piece.fabricId!==undefined&&typeof piece.fabricId!=='string')fail('FABRIC')
  if(piece.cutQuantity!==undefined&&(!Number.isInteger(piece.cutQuantity)||piece.cutQuantity<1||piece.cutQuantity>128))fail('CUT_QUANTITY')
  validateContour(piece.points)
}

/** Engineering-only geometry edit in centimeters. Factory approval and mirrored seam labels are out of scope. */
export function applyAccuMarkPieceRigidAction20261024_1341(project, options = {}) {
  if(!options||typeof options!=='object'||Object.getPrototypeOf(options)!==Object.prototype)fail('OPTIONS')
  const optionKeys=new Set(['pieceId','action','dxCm','dyCm','angleDeg','axis','copyId','copyName'])
  for(const key of Reflect.ownKeys(options)){
    if(typeof key!=='string'||!optionKeys.has(key)||!Object.hasOwn(Object.getOwnPropertyDescriptor(options,key),'value'))fail('OPTIONS')
  }
  const {pieceId, action, dxCm=0, dyCm=0, angleDeg=0, axis='vertical', copyId, copyName}=options
  // Descriptor-only clone: JSON.stringify can call an inherited toJSON method.
  const seen=new Set();let nodes=0
  function safeCopy(value,depth=0){
    if(value===null||typeof value==='string'||typeof value==='boolean')return value
    if(typeof value==='number'){if(!Number.isFinite(value))fail('NONFINITE_METADATA');return value}
    if(typeof value!=='object')fail('PROJECT_ACCESSOR')
    if(seen.has(value))fail('CYCLIC_OR_ALIASED_PROJECT')
    seen.add(value)
    if(++nodes>12000||depth>40||Object.getPrototypeOf(value)!==(Array.isArray(value)?Array.prototype:Object.prototype))fail('PROJECT_COMPLEXITY')
    const array=Array.isArray(value),descriptors=Object.getOwnPropertyDescriptors(value)
    const keys=Reflect.ownKeys(descriptors)
    if(keys.some(key=>typeof key!=='string'||key==='__proto__'||key==='constructor'||key==='prototype'||key==='toJSON'))fail('PROJECT_METADATA')
    if(array&&(!Number.isInteger(value.length)||value.length>12000))fail('PROJECT_COMPLEXITY')
    const out=array?[]:{}
    for(const key of keys){
      if(array&&key==='length')continue
      const descriptor=descriptors[key]
      if(!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)fail('PROJECT_ACCESSOR')
      if(array&&(!/^(0|[1-9]\d*)$/.test(key)||Number(key)>=value.length))fail('PROJECT_METADATA')
      Object.defineProperty(out,key,{value:safeCopy(descriptor.value,depth+1),enumerable:true,configurable:true,writable:true})
    }
    if(array&&(out.length!==value.length||Object.keys(out).length!==value.length))fail('SPARSE_ARRAY')
    return out
  }
  const snapshot=safeCopy(project)
  if (!snapshot||!Array.isArray(snapshot.pieces)||snapshot.pieces.length>128||snapshot.pieces.length===0)fail('PROJECT_BUDGET')
  if (snapshot.pieces.some(p=>!p||typeof p.id!=='string')||new Set(snapshot.pieces.map(p=>p.id)).size!==snapshot.pieces.length)fail('DUPLICATE_IDS')
  if (!['MOVE','ROTATE','MIRROR','COPY'].includes(action))fail('ACTION')
  const index=snapshot.pieces.findIndex(p=>p.id===pieceId)
  if(index<0)fail('PIECE_NOT_FOUND')
  const source=snapshot.pieces[index]
  validatePiece(source)
  function serializedSize(v){
    if(v===null)return 4
    if(typeof v!=='object')return typeof v==='string'?v.length+2:String(v).length
    return Object.entries(v).reduce((n,[k,item])=>n+k.length+3+serializedSize(item),2)
  }
  if (serializedSize(snapshot)>1000000)fail('PROJECT_BUDGET')
  function mentionsPieceId(v){
    if(v===pieceId)return true
    if(!v||typeof v!=='object')return false
    return Object.values(v).some(mentionsPieceId)
  }
  // Detachment includes project-level relationships; reject any reference to the edited piece.
  for(const [key,value] of Object.entries(snapshot)) {
    if(key==='pieces'||key==='grading'||key==='revision'||key==='updatedAt')continue
    if(value&&typeof value==='object'&&mentionsPieceId(value))fail('PROJECT_ATTACHMENT')
  }
  if(Array.isArray(snapshot.seams)&&snapshot.seams.some(mentionsPieceId))fail('PROJECT_ATTACHMENT')
  if(action==='ROTATE'||action==='MIRROR') {
    const g=snapshot.grading
    if(g&&((g.sizes?.length??0)>1)&&((g.widthPerSizeCm??3)!==0||(g.lengthPerSizeCm??1.2)!==0))fail('GRADING_NOT_RIGID_EQUIVARIANT')
    if(snapshot.productionSpec?.gradingModel)fail('SPECIAL_GRADING_MODEL')
  }
  if (!finite(dxCm)||!finite(dyCm)||!finite(angleDeg)||Math.abs(angleDeg)>360)fail('TRANSFORM')
  if(action==='MIRROR'&&!['horizontal','vertical'].includes(axis))fail('AXIS')
  const p=source.points
  const pivot={x:p.reduce((a,b)=>a+b.x,0)/p.length,y:p.reduce((a,b)=>a+b.y,0)/p.length}
  const theta=angleDeg*Math.PI/180,c=Math.cos(theta),s=Math.sin(theta)
  const transform=point=>{
    let x=point.x-pivot.x,y=point.y-pivot.y
    if(action==='MOVE'){x+=dxCm;y+=dyCm}
    if(action==='ROTATE'){const rx=x*c-y*s,ry=x*s+y*c;x=rx;y=ry}
    if(action==='MIRROR'){if(axis==='vertical')x=-x;else y=-y}
    const out={x:x+pivot.x,y:y+pivot.y}
    if(!finite(out.x)||!finite(out.y))fail('TRANSFORM_OVERFLOW')
    return out
  }
  const edited=cloneProject(source)
  if(action==='COPY'){
    if(snapshot.pieces.length>=128)fail('PROJECT_BUDGET')
    if(typeof copyId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(copyId)||snapshot.pieces.some(x=>x.id===copyId))fail('COPY_ID')
    edited.id=copyId
    edited.name=copyName===undefined?`${source.name} Copy`:copyName
    if(typeof edited.name!=='string'||edited.name.length>120||!edited.name.trim())fail('COPY_NAME')
  } else {
    edited.points=p.map(transform)
    // Reflection reverses orientation; reversing the vertex order restores the CUT winding.
    if(action==='MIRROR')edited.points.reverse()
    validateContour(edited.points)
  }
  if(action==='COPY')snapshot.pieces.push(edited)
  else snapshot.pieces[index]=edited
  touchProject(snapshot)
  return {project:snapshot,piece:edited,unit:'cm',engineeringOnly:true,warnings:action==='MIRROR'?['Mirror seam labels and directional fabric semantics are not implemented; only detached geometry is accepted.']:[]}
}
