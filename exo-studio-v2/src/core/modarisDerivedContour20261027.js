// Detached, explicit, qualified inward-contour study. Never adds a CUT piece.
const fail = code => { throw new Error('MODARIS_DERIVED_' + code) }
const validId = s => typeof s === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(s)
const finite = n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) < 100000
function clone(v) {
  const seen = new Set()
  let count = 0
  function visit(x, depth = 0) {
    if (x === null || typeof x === 'string' || typeof x === 'boolean') return x
    if (typeof x === 'number') { if (!Number.isFinite(x)) fail('NONFINITE'); return x }
    if (!x || typeof x !== 'object' || depth > 24 || ++count > 12000 || seen.has(x)) fail('COMPLEX_INPUT')
    if (Object.getPrototypeOf(x) !== (Array.isArray(x) ? Array.prototype : Object.prototype)) fail('PROTOTYPE')
    seen.add(x)
    const result = Array.isArray(x) ? [] : {}
    const entries = Object.getOwnPropertyDescriptors(x)
    for (const key of Reflect.ownKeys(entries)) {
      if (key === 'length' && Array.isArray(x)) continue
      if (typeof key !== 'string' || ['__proto__','constructor','prototype','toJSON'].includes(key)) fail('UNSAFE_KEY')
      if (Array.isArray(x) && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= x.length)) fail('ARRAY_KEY')
      const d = entries[key]
      if (!d.enumerable || !Object.hasOwn(d, 'value')) fail('ACCESSOR')
      Object.defineProperty(result, key, { value: visit(d.value, depth + 1), enumerable: true, writable: true, configurable: true })
    }
    if (Array.isArray(x) && (result.length !== x.length || Object.keys(result).length !== x.length)) fail('SPARSE_ARRAY')
    seen.delete(x)
    return result
  }
  return visit(v)
}
const sub = (a,b) => ({x:a.x-b.x,y:a.y-b.y})
const add = (a,b) => ({x:a.x+b.x,y:a.y+b.y})
const mul = (a,k) => ({x:a.x*k,y:a.y*k})
const cross = (a,b) => a.x*b.y-a.y*b.x
const norm = a => { const l=Math.hypot(a.x,a.y); if(l<1e-8)fail('ZERO_TANGENT'); return mul(a,1/l) }
const left = a => ({x:-a.y,y:a.x})
function bez(a,b,c,d,t) {
  const u=1-t
  return d ? add(add(mul(a,u*u*u),mul(b,3*u*u*t)),add(mul(c,3*u*t*t),mul(d,t*t*t))) :
    add(add(mul(a,u*u),mul(b,2*u*t)),mul(c,t*t))
}
function tangent(a,b,c,d,t) {
  const u=1-t
  return d ? add(add(mul(sub(b,a),3*u*u),mul(sub(c,b),6*u*t)),mul(sub(d,c),3*t*t)) :
    add(mul(sub(b,a),2*u),mul(sub(c,b),2*t))
}
function geometry(source) {
  if (!source || Object.keys(source).some(k=>!['id','name','points','curves','locked','fabricId'].includes(k)) || source.locked === true) fail('SOURCE_ATTACHMENTS')
  const points=source.points
  if (!Array.isArray(points)||points.length<3||points.length>64)fail('POINT_COUNT')
  for(const p of points)if(!p||Object.keys(p).sort().join(',')!=='x,y'||!finite(p.x)||!finite(p.y))fail('POINT_ATTACHMENTS')
  const curves=source.curves??{}
  if (!curves||typeof curves!=='object'||Array.isArray(curves))fail('CURVES')
  const cleanCurves={}
  for(const [key,c] of Object.entries(curves)){
    if(!/^(0|[1-9]\d*)$/.test(key)||Number(key)>=points.length||!c||Array.isArray(c))fail('CURVE_KEY')
    const keys=Object.keys(c).sort().join(',')
    if(keys!=='cx,cy'&&keys!=='c1x,c1y,c2x,c2y')fail('CURVE_SCHEMA')
    if(Object.values(c).some(v=>!finite(v)))fail('CURVE_COORDINATE')
    cleanCurves[key]={...c}
  }
  const segments=points.map((a,i)=>{
    const end=points[(i+1)%points.length],c=cleanCurves[i]
    if(!c)return {a,end,kind:'line',at:t=>add(mul(a,1-t),mul(end,t)),derivative:()=>sub(end,a)}
    if('cx'in c){const control={x:c.cx,y:c.cy};return {a,end,kind:'quadratic',control,at:t=>bez(a,control,end,null,t),derivative:t=>tangent(a,control,end,null,t)}}
    const first={x:c.c1x,y:c.c1y},second={x:c.c2x,y:c.c2y}
    return {a,end,kind:'cubic',first,second,at:t=>bez(a,first,second,end,t),derivative:t=>tangent(a,first,second,end,t)}
  })
  const samples=[]
  for(const segment of segments){
    const steps=segment.kind==='line'?1:24
    for(let j=0;j<steps;j++)samples.push(segment.at(j/steps))
  }
  let area=0
  for(let i=0;i<samples.length;i++){
    const a=samples[i],b=samples[(i+1)%samples.length]
    if(Math.hypot(a.x-b.x,a.y-b.y)<1e-7)fail('DEGENERATE')
    area+=cross(a,b)
    for(let j=i+2;j<samples.length;j++){
      if(i===0&&j===samples.length-1)continue
      if(intersects(a,b,samples[j],samples[(j+1)%samples.length]))fail('SELF_INTERSECTION')
    }
  }
  if(Math.abs(area)<1e-6)fail('AREA')
  return {points,curves:cleanCurves,segments,area,samples}
}
function intersects(a,b,c,d){
  const orient=(p,q,r)=>cross(sub(q,p),sub(r,p))
  const o=[orient(a,b,c),orient(a,b,d),orient(c,d,a),orient(c,d,b)]
  if(o.some(v=>Math.abs(v)<1e-9))return true // conservative for touching or near-collinear geometry
  return o[0]*o[1]<0&&o[2]*o[3]<0
}
function signature(value){
  const str=JSON.stringify(value)
  let h=0xcbf29ce484222325n
  for(let i=0;i<str.length;i++){h^=BigInt(str.charCodeAt(i));h=h*0x100000001b3n&0xffffffffffffffffn}
  return h.toString(16).padStart(16,'0')
}
function build(project,config){
  const {sourcePieceId,derivedId,derivedName,depthCm}=config
  if(!validId(sourcePieceId)||!validId(derivedId)||sourcePieceId===derivedId||typeof derivedName!=='string'||!derivedName.trim()||derivedName.length>140||!finite(depthCm)||depthCm<=0||depthCm>5)fail('OPTIONS')
  if(!project||Object.keys(project).some(k=>!['pieces','revision','updatedAt'].includes(k))||!Number.isSafeInteger(project.revision)||project.revision<0||!Array.isArray(project.pieces)||project.pieces.length<1||project.pieces.length>64||project.grading||project.seams)fail('PROJECT_LINKS')
  if(project.pieces.some(p=>!validId(p?.id))||new Set(project.pieces.map(p=>p.id)).size!==project.pieces.length||project.pieces.some(p=>p.id===derivedId))fail('IDENTITY')
  const source=project.pieces.find(p=>p.id===sourcePieceId)
  if(!source)fail('SOURCE_GONE')
  const g=geometry(source), sign=g.area>0?1:-1
  // Offset the contour using incoming/outgoing tangent bisectors at joins.
  const outward=(v)=>mul(left(norm(v)),sign*depthCm)
  const shifted=g.segments.map((s,i)=>{
    const prev=g.segments[(i+g.segments.length-1)%g.segments.length]
    const incoming=norm(prev.derivative(1)),outgoing=norm(s.derivative(0))
    const n1=mul(left(incoming),sign),n2=mul(left(outgoing),sign)
    const sum=add(n1,n2),den=1+cross(incoming,n2)*sign
    if(Math.hypot(sum.x,sum.y)<1e-6||den<0.25)fail('ACUTE_JOIN')
    const displacement=mul(sum,depthCm/den)
    if(Math.hypot(displacement.x,displacement.y)>depthCm*4)fail('MITER_LIMIT')
    return add(s.a,displacement)
  })
  const curves={}
  for(let i=0;i<g.segments.length;i++){
    const s=g.segments[i]
    if(s.kind==='quadratic'){
      const displaced=add(s.control,outward(s.derivative(.5)))
      curves[i]={cx:displaced.x,cy:displaced.y}
    }else if(s.kind==='cubic'){
      const a=add(s.first,outward(s.derivative(1/3))),b=add(s.second,outward(s.derivative(2/3)))
      curves[i]={c1x:a.x,c1y:a.y,c2x:b.x,c2y:b.y}
    }
  }
  const piece={id:derivedId,name:derivedName,points:shifted,locked:true}
  if(Object.keys(curves).length)piece.curves=curves
  if(source.fabricId!==undefined)piece.fabricId=source.fabricId
  // Confirm the resulting contour remains simple and retains the original winding.
  const verified=geometry({...piece,locked:false})
  if(Math.sign(verified.area)!==Math.sign(g.area))fail('WINDING_CHANGED')
  const hash=signature({points:source.points,curves:g.curves,name:source.name??null,fabricId:source.fabricId??null})
  const provenance={kind:'MODARIS_DERIVED_CONTOUR_STUDY_V1',sourcePieceId,derivedId,derivedName,depthCm,sourceRevision:project.revision,sourceHash:hash,derivedHash:signature({points:piece.points,curves:piece.curves??{},fabricId:piece.fabricId??null}),sourcePointCount:g.points.length,sourceCurveKeys:Object.keys(g.curves).sort(),referenceOnly:true,factoryApproved:false,geometryApproximation:Object.keys(g.curves).length>0}
  piece.patternImportProvenance={...provenance}
  const study={kind:provenance.kind,piece,provenance,referenceOnly:true,factoryApproved:false}
  return {project,study,piece,provenance,sourceChanged:false,engineeringOnly:true,warnings:['Detached inward contour approximation. Curved offset is approximate; sewlines, allowances, grades and cutlines are not validated for production.']}
}
export function createModarisDerivedContour20261027(input, options={}){
  const project=clone(input),opts=clone(options)
  if(!opts||Object.keys(opts).some(k=>!['sourcePieceId','derivedId','derivedName','depthCm'].includes(k)))fail('OPTIONS')
  return build(project,opts)
}
export function regenerateModarisDerivedContour20261027(input, previous, options={}){
  const project=clone(input),old=clone(previous),opts=clone(options)
  if(!opts||Object.keys(opts).some(k=>!['expectedRevision'].includes(k)))fail('OPTIONS')
  const p=old?.provenance
  if(!p||old.kind!=='MODARIS_DERIVED_CONTOUR_STUDY_V1'||old.referenceOnly!==true||old.factoryApproved!==false||!old.piece||old.piece.locked!==true||signature(old.piece.patternImportProvenance)!==signature(p)||p.kind!==old.kind||p.referenceOnly!==true||p.factoryApproved!==false||!validId(p.sourcePieceId)||!validId(p.derivedId)||old.piece.id!==p.derivedId||old.piece.name!==p.derivedName||Object.keys(old.piece).some(k=>!['id','name','points','curves','locked','fabricId','patternImportProvenance'].includes(k))||signature({points:old.piece.points,curves:old.piece.curves??{},fabricId:old.piece.fabricId??null})!==p.derivedHash)fail('INVALID_LINK')
  if(opts.expectedRevision!==undefined&&opts.expectedRevision!==project.revision)fail('REVISION_CONFLICT')
  if(project.revision<p.sourceRevision)fail('REVISION_ROLLBACK')
  const result=build(project,{sourcePieceId:p.sourcePieceId,derivedId:p.derivedId,derivedName:p.derivedName,depthCm:p.depthCm})
  const sourceChanged=result.provenance.sourceHash!==p.sourceHash
  if(project.revision===p.sourceRevision&&sourceChanged)fail('SILENT_SOURCE_EDIT')
  if(result.provenance.sourcePointCount!==p.sourcePointCount||signature(result.provenance.sourceCurveKeys)!==signature(p.sourceCurveKeys))fail('TOPOLOGY_CHANGED')
  return {...result,sourceChanged,previousSourceRevision:p.sourceRevision,regenerated:true}
}
