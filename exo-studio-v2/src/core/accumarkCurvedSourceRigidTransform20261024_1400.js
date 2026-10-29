import {gradeProject} from './grading.js'
import {edgeLength, edgePointAt} from './project.js'

// Source geometry is in physical centimetres. A preview cannot authorize factory cutting.
const bad = code => { throw Error(`CURVED_RIGID_${code}`) }
const finite = x => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) <= 100000
const dict = (v, keys) => { if (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).some(k => !keys.includes(k))) bad('UNSUPPORTED_METADATA') }
const own = (v,k) => Object.prototype.hasOwnProperty.call(v,k)

function snapshot(input) {
  const seen = new Set(); let nodes=0
  function visit(v,depth=0) {
    if (v===null || typeof v==='string' || typeof v==='boolean') return v
    if (typeof v==='number') { if (!Number.isFinite(v)) bad('NONFINITE'); return v }
    if (typeof v!=='object' || depth>30 || ++nodes>12000 || seen.has(v)) bad('COMPLEXITY')
    if (Object.getPrototypeOf(v)!==(Array.isArray(v)?Array.prototype:Object.prototype)) bad('PROTOTYPE')
    seen.add(v)
    const descriptors=Object.getOwnPropertyDescriptors(v), keys=Reflect.ownKeys(descriptors), arr=Array.isArray(v)
    if (keys.some(k=>typeof k!=='string'||['__proto__','constructor','prototype','toJSON'].includes(k))) bad('UNSAFE_KEY')
    if (arr && v.length>12000) bad('COMPLEXITY')
    const result=arr?[]:{}
    for (const k of keys) {
      if (arr && k==='length') continue
      const d=descriptors[k]
      if (!own(d,'value') || !d.enumerable || arr && (!/^(0|[1-9]\d*)$/.test(k)||Number(k)>=v.length)) bad('ACCESSOR')
      Object.defineProperty(result,k,{value:visit(d.value,depth+1),enumerable:true,writable:true,configurable:true})
    }
    if (arr && (result.length!==v.length||Object.keys(result).length!==v.length)) bad('SPARSE')
    seen.delete(v)
    return result
  }
  return visit(input)
}

const coord = p => { if(!p || !finite(p.x)||!finite(p.y)) bad('COORDINATE') }
function cross(a,b,c) {return (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)}
function hit(a,b,c,d) {
  const eps=1e-9, ab=cross(a,b,c), ac=cross(a,b,d), cd=cross(c,d,a), ce=cross(c,d,b)
  const within=(p,q,r)=>r.x>=Math.min(p.x,q.x)-eps&&r.x<=Math.max(p.x,q.x)+eps&&r.y>=Math.min(p.y,q.y)-eps&&r.y<=Math.max(p.y,q.y)+eps
  return (ab>eps&&ac< -eps||ab< -eps&&ac>eps)&&(cd>eps&&ce< -eps||cd< -eps&&ce>eps)||Math.abs(ab)<=eps&&within(a,b,c)||Math.abs(ac)<=eps&&within(a,b,d)||Math.abs(cd)<=eps&&within(c,d,a)||Math.abs(ce)<=eps&&within(c,d,b)
}
function contour(piece) {
  if (!Array.isArray(piece.points)||piece.points.length<3||piece.points.length>80) bad('POINT_BUDGET')
  const n=piece.points.length, path=[]
  for(let i=0;i<n;i++) {
    const a=piece.points[i],b=piece.points[(i+1)%n];coord(a);coord(b)
    if(Math.hypot(a.x-b.x,a.y-b.y)<1e-6)bad('ZERO_EDGE')
    const curve=piece.curves?.[i], steps=curve?24:1
    for(let j=0;j<steps;j++){
      const t=j/steps,u=1-t
      const p=curve?{x:u*u*a.x+2*u*t*curve.cx+t*t*b.x,y:u*u*a.y+2*u*t*curve.cy+t*t*b.y}:a
      coord(p);path.push(p)
    }
  }
  if(path.length>1920)bad('SAMPLE_BUDGET')
  let area=0
  for(let i=0;i<path.length;i++) {
    const a=path[i],b=path[(i+1)%path.length]
    if(Math.hypot(a.x-b.x,a.y-b.y)<1e-7)bad('CURVE_CUSP_OR_ZERO_SEGMENT')
    area+=a.x*b.y-a.y*b.x
    for(let j=i+2;j<path.length;j++) {
      if(i===0&&j===path.length-1)continue
      if(hit(a,b,path[j],path[(j+1)%path.length]))bad('SELF_INTERSECTION')
    }
  }
  if(Math.abs(area)<1e-7)bad('DEGENERATE')
  return path
}
function validatePiece(p) {
  dict(p,['id','name','points','curves','notches','internalLines','seamAllowance','edgeSeamAllowances','fabricId','locked','cutQuantity','layout2d','arrangement3d','gradeSize'])
  if(typeof p.id!=='string'||!p.id||p.id.length>100||p.locked)bad('IDENTITY_OR_LOCKED')
  if(!Array.isArray(p.points))bad('POINT_BUDGET')
  if(p.points.some(pt=>{dict(pt,['id','x','y','label','gradeRule','industrialGradeRule']);return false}))bad('POINT')
  if(p.curves!==undefined){
    if (!p.curves||Array.isArray(p.curves)||typeof p.curves!=='object'||Object.getPrototypeOf(p.curves)!==Object.prototype)bad('CURVES')
    if(Object.keys(p.curves).length>80)bad('CURVES')
    for(const [i,c] of Object.entries(p.curves)) {
      if(!/^(0|[1-9]\d*)$/.test(i)||+i>=p.points.length)bad('CURVE_INDEX')
      dict(c,['cx','cy']);if(!finite(c.cx)||!finite(c.cy))bad('CURVE_CONTROL')
    }
  }
  if(p.seamAllowance!==undefined&&(!finite(p.seamAllowance)||p.seamAllowance<0))bad('ALLOWANCE')
  if(p.edgeSeamAllowances!==undefined){
    if(!p.edgeSeamAllowances || typeof p.edgeSeamAllowances!=='object'||Array.isArray(p.edgeSeamAllowances))bad('ALLOWANCE')
    for(const [i,v] of Object.entries(p.edgeSeamAllowances))if(!/^(0|[1-9]\d*)$/.test(i)||+i>=p.points.length||!finite(v)||v<0)bad('ALLOWANCE')
  }
  if(p.cutQuantity!==undefined&&(!Number.isInteger(p.cutQuantity)||p.cutQuantity<1||p.cutQuantity>128))bad('QUANTITY')
  if(p.layout2d!==undefined){dict(p.layout2d,['x','y']);coord(p.layout2d)}
  if(p.arrangement3d!==undefined){dict(p.arrangement3d,['x','y','z','flip']);if(!['x','y','z'].every(k=>finite(p.arrangement3d[k]))||typeof p.arrangement3d.flip!=='boolean')bad('ARRANGEMENT')}
  if(p.notches!==undefined&&!Array.isArray(p.notches)||p.notches?.length>200)bad('NOTCHES')
  for(const notch of p.notches||[]){
    dict(notch,['id','type','edgeIndex','t','depthCm','x','y','gradeArcStation'])
    if(!Number.isInteger(notch.edgeIndex)||notch.edgeIndex<0||notch.edgeIndex>=p.points.length||!finite(notch.t??.5)||notch.t<0||notch.t>1)bad('NOTCH_STATION')
    if(notch.depthCm!==undefined&&(!finite(notch.depthCm)||notch.depthCm<0))bad('NOTCH_DEPTH')
    if((own(notch,'x')||own(notch,'y'))&&(!finite(notch.x)||!finite(notch.y)))bad('NOTCH_COORDINATE')
    if(notch.gradeArcStation){dict(notch.gradeArcStation,['version','distanceCm','from']);if(notch.gradeArcStation.version!==1||!finite(notch.gradeArcStation.distanceCm)||notch.gradeArcStation.distanceCm<=0||!['start','end'].includes(notch.gradeArcStation.from))bad('NOTCH_RULE')}
  }
  if(p.internalLines!==undefined&&!Array.isArray(p.internalLines)||p.internalLines?.length>200)bad('LINES')
  for(const line of p.internalLines||[]){
    dict(line,['id','type','a','b','aAnchor','bAnchor','widthCm']);coord(line.a);coord(line.b)
    for(const end of ['a','b']){
      dict(line[end],['x','y']); const anchor=line[`${end}Anchor`]
      if(anchor){dict(anchor,['edgeIndex','vertexIndex','t']);if(own(anchor,'vertexIndex')){if(!Number.isInteger(anchor.vertexIndex)||anchor.vertexIndex<0||anchor.vertexIndex>=p.points.length||own(anchor,'edgeIndex')||own(anchor,'t'))bad('ANCHOR')}else if(!Number.isInteger(anchor.edgeIndex)||anchor.edgeIndex<0||anchor.edgeIndex>=p.points.length||!finite(anchor.t)||anchor.t<0||anchor.t>1)bad('ANCHOR')}
    }
    if(line.widthCm!==undefined&&(!finite(line.widthCm)||line.widthCm<0))bad('LINE_WIDTH')
  }
  contour(p)
}
function safeGrades(project,pieceId){
  const g=project.grading,sizes=g?.sizes??[g?.baseSize??'M']
  if(!Array.isArray(sizes)||sizes.length<1||sizes.length>12||sizes.some(s=>typeof s!=='string'||!s||s.length>32)||new Set(sizes).size!==sizes.length||!sizes.includes(g?.baseSize??sizes[0]))bad('SIZES')
  if(g) {
    dict(g,['sizes','baseSize','widthPerSizeCm','lengthPerSizeCm'])
    for(const k of ['widthPerSizeCm','lengthPerSizeCm'])if(g[k]!==undefined&&!finite(g[k]))bad('GRADING_STEP')
  }
  const selected=project.pieces.find(x=>x.id===pieceId)
  if(sizes.length>1){
    // Automatic grading depends on absolute axes and cannot commute with rotations.
    for(const point of selected.points)if(!point.industrialGradeRule && !point.gradeRule?.enabled)bad('AUTOMATIC_GRADING')
  }
  return sizes
}
function transformPoint(pt,pivot,c,s,dx,dy){
  const x=pt.x-pivot.x,y=pt.y-pivot.y,out={x:pivot.x+x*c-y*s+dx,y:pivot.y+x*s+y*c+dy}
  coord(out);return out
}
function validateStations(p){
  for(const notch of p.notches||[]){
    const length=edgeLength(p,notch.edgeIndex)
    if(!finite(length)||length<1e-6)bad('NOTCH_EDGE_LENGTH')
    if(notch.gradeArcStation&&!(notch.gradeArcStation.distanceCm<length-1e-8))bad('NOTCH_STATION')
    const located=edgePointAt(p,notch.edgeIndex,notch.t??.5)?.point;coord(located)
    if(own(notch,'x')&&Math.hypot(located.x-notch.x,located.y-notch.y)>1e-4)bad('NOTCH_COORDINATE_DRIFT')
  }
  for(const line of p.internalLines||[])for(const end of ['a','b']){
    const anchor=line[`${end}Anchor`];if(!anchor)continue
    const located=own(anchor,'vertexIndex')?p.points[anchor.vertexIndex]:edgePointAt(p,anchor.edgeIndex,anchor.t)?.point
    coord(located)
    if(Math.hypot(line[end].x-located.x,line[end].y-located.y)>1e-4)bad('ATTACHMENT_DRIFT')
  }
}

/** Translate / rotate detached legacy EXO quadratic source in cm; returns advisory-only cutline preview. */
export function applyAccuMarkCurvedSourceRigidTransform20261024_1400(sourceProject,{pieceId,dxCm=0,dyCm=0,angleDeg=0}={}){
  const input=snapshot(sourceProject)
  if(!input||!Array.isArray(input.pieces)||input.pieces.length<1||input.pieces.length>24||input.pieces.some(p=>!p||typeof p.id!=='string')||new Set(input.pieces.map(p=>p.id)).size!==input.pieces.length)bad('PROJECT')
  if(Object.keys(input).some(k=>!['pieces','grading','revision','updatedAt','seams','customMeasurements'].includes(k)))bad('PROJECT_METADATA')
  if(input.seams?.length||input.customMeasurements?.length)bad('PROJECT_SEAM_OR_MEASUREMENT_LINK')
  if(input.seams!==undefined&&!Array.isArray(input.seams)||input.customMeasurements!==undefined&&!Array.isArray(input.customMeasurements))bad('PROJECT_METADATA')
  if(typeof pieceId!=='string'||!pieceId||!finite(dxCm)||!finite(dyCm)||!finite(angleDeg)||Math.abs(angleDeg)>360)bad('OPTIONS')
  const index=input.pieces.findIndex(p=>p.id===pieceId);if(index<0)bad('MISSING_PIECE')
  const original=input.pieces[index];validatePiece(original)
  // Absent/nonempty project metadata or unsupported piece attachments may carry
  // fabric, seam or cutting semantics. Their preservation is not established.
  if(input.pieces.some((p,i)=>i!==index&&(!p||typeof p!=='object')))bad('PROJECT')
  const sizes=safeGrades(input,pieceId)
  const pivot={x:original.points.reduce((sum,p)=>sum+p.x,0)/original.points.length,y:original.points.reduce((sum,p)=>sum+p.y,0)/original.points.length}
  const a=angleDeg*Math.PI/180,c=Math.cos(a),s=Math.sin(a), T=p=>transformPoint(p,pivot,c,s,dxCm,dyCm)
  // Explicit break vectors are displacements and rotate about the origin, without translation.
  const delta=d=>{const x=d.dx*c-d.dy*s,y=d.dx*s+d.dy*c;if(!finite(x)||!finite(y))bad('GRADE_OVERFLOW');return {...d,dx:x,dy:y}}
  const rewriteRule=rule=>{
    if(!rule)return rule
    if(rule.enabled!==undefined){dict(rule,['enabled','dxPerSize','dyPerSize']);if(rule.enabled!==true||!finite(rule.dxPerSize)||!finite(rule.dyPerSize))bad('GRADE_RULE');const rotated=delta({dx:rule.dxPerSize,dy:rule.dyPerSize});return {...rule,dxPerSize:rotated.dx,dyPerSize:rotated.dy}}
    dict(rule,['mode','sizes','baseSize','steps','up','down'])
    if(!['small-large-incremental','base-up-down-incremental','base-up-down-cumulative'].includes(rule.mode)||JSON.stringify(rule.sizes)!==JSON.stringify(sizes)||rule.baseSize!==(input.grading?.baseSize??sizes[0]))bad('INDUSTRIAL_RULE')
    const output={...rule}
    for(const key of ['steps','up','down'])if(rule[key]!==undefined){if(!Array.isArray(rule[key])||rule[key].length>12)bad('GRADE_RULE');output[key]=rule[key].map(d=>{dict(d,['dx','dy']);if(!finite(d.dx)||!finite(d.dy))bad('GRADE_RULE');return delta(d)})}
    return output
  }
  // Grade before any result is exposed. Baseline grading is used only to check
  // geometric and station invariants across sizes, not for manufacturing acceptance.
  const originalGrades=[]
  for(const size of sizes){const graded=gradeProject(input,size).pieces[index];validatePiece(graded);validateStations(graded);originalGrades.push(graded)}
  const nextPiece={...original,points:original.points.map(p=>({...p,...T(p),...(p.gradeRule?{gradeRule:rewriteRule(p.gradeRule)}:{}),...(p.industrialGradeRule?{industrialGradeRule:rewriteRule(p.industrialGradeRule)}:{})})),
    curves:original.curves?Object.fromEntries(Object.entries(original.curves).map(([k,v])=>{const at=T({x:v.cx,y:v.cy});return [k,{cx:at.x,cy:at.y}]})):undefined,
    notches:original.notches?.map(n=>({...n,...(own(n,'x')?T(n):{})})),
    internalLines:original.internalLines?.map(l=>({...l,a:T(l.a),b:T(l.b)}))}
  validatePiece(nextPiece);validateStations(nextPiece)
  const next={...input,pieces:[...input.pieces]};next.pieces[index]=nextPiece
  const checks=[]
  for(let i=0;i<sizes.length;i++){
    const actual=gradeProject(next,sizes[i]).pieces[index], expected=originalGrades[i]
    validatePiece(actual);validateStations(actual)
    for(let k=0;k<expected.points.length;k++){
      const transformed=T(expected.points[k]);if(Math.hypot(actual.points[k].x-transformed.x,actual.points[k].y-transformed.y)>1e-5)bad('GRADE_NOT_RIGID_EQUIVARIANT')
      if(Math.abs(edgeLength(actual,k)-edgeLength(expected,k))>1e-5)bad('EDGE_LENGTH_DRIFT')
    }
    for(const [k,v] of Object.entries(expected.curves||{})){const transformed=T({x:v.cx,y:v.cy}),out=actual.curves?.[k];if(!out||Math.hypot(out.cx-transformed.x,out.cy-transformed.y)>1e-5)bad('GRADED_CURVE_DRIFT')}
    for(let k=0;k<(expected.notches||[]).length;k++){
      const before=expected.notches[k],after=actual.notches?.[k]
      if(!after||after.edgeIndex!==before.edgeIndex||Math.abs((after.t??.5)-(before.t??.5))>1e-7||after.depthCm!==before.depthCm)bad('GRADED_NOTCH_DRIFT')
      const originalStation=edgePointAt(expected,before.edgeIndex,before.t??.5)?.point
      const gradedStation=edgePointAt(actual,after.edgeIndex,after.t??.5)?.point
      if(!originalStation||!gradedStation||Math.hypot(gradedStation.x-T(originalStation).x,gradedStation.y-T(originalStation).y)>1e-5)bad('GRADED_NOTCH_POSITION_DRIFT')
    }
    if(actual.seamAllowance!==expected.seamAllowance||JSON.stringify(actual.edgeSeamAllowances??{})!==JSON.stringify(expected.edgeSeamAllowances??{}))bad('GRADED_ALLOWANCE_DRIFT')
    for(let k=0;k<(expected.internalLines||[]).length;k++)for(const end of ['a','b']){const transformed=T(expected.internalLines[k][end]),got=actual.internalLines[k]?.[end];if(!got||Math.hypot(got.x-transformed.x,got.y-transformed.y)>1e-5)bad('GRADED_CONSTRUCTION_DRIFT')}
    checks.push({size:sizes[i],notchCount:actual.notches?.length||0,edgeLengthsCm:actual.points.map((_,k)=>edgeLength(actual,k))})
  }
  next.revision=(input.revision??0)+1
  return {project:next,piece:nextPiece,cutlinePreview:contour(nextPiece),validation:{sizes:checks,units:'cm',preservesRigidLengths:true},manufacturingApproved:false,advisoryOnly:true}
}
