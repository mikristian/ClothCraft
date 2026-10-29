// Read-only, strict local receiving-DXF entity inventory. A valid CUT contour
// does not prove that grainlines, labels or other cutter-visible layers survived
// an import/re-export. This is NOT an authenticated external CAD acceptance.
import {gradeProject} from './grading.js'
import {projectToDxf} from './dxf.js'

const MAX_WIRE=16_000_000
const MAX_ENTITIES=20_000
const MAX_VERTICES=20_000
const TOL_MM=.012
const fail=(code,detail=code)=>({ok:false,status:'BLOCKED',issues:[{code,detail}],
  receivingAuxiliaryEntitiesVerified:false,independentReceiverAuthenticated:false,
  receiverCadVerified:false,cuttingAuthorized:false,factoryApproved:false})
const finite=value=>Number.isFinite(value)&&Math.abs(value)<1e8
const close=(a,b)=>Math.abs(a-b)<=TOL_MM
const pointClose=(a,b)=>close(a[0],b[0])&&close(a[1],b[1])

function parse(wire){
 if(typeof wire!=='string'||!wire.length||wire.length>MAX_WIRE)throw Error('Missing or oversized receiver wire')
 const lines=wire.replace(/\r/g,'').split('\n')
 if(lines.at(-1)==='')lines.pop()
 if(lines.length%2||lines.length>400_000)throw Error('Malformed DXF group pairs')
 const pairs=[]
 for(let i=0;i<lines.length;i+=2){
  const raw=lines[i].trim()
  if(!/^\d+$/.test(raw))throw Error('Invalid DXF group code')
  pairs.push([Number(raw),lines[i+1].trim()])
 }
 let section='',current=null,sections=0
 const blocks=[]
 for(let i=0;i<pairs.length;i++){
  const [code,value]=pairs[i]
  if(code===0&&value==='SECTION'){
   if(pairs[i+1]?.[0]!==2)throw Error('Malformed DXF section')
   section=pairs[++i][1]
   if(section==='ENTITIES')sections++
   current=null;continue
  }
  if(code===0&&value==='ENDSEC'){section='';current=null;continue}
  if(section!=='ENTITIES')continue
  if(code===0){
   if(value==='EOF')throw Error('Unexpected EOF in entities')
   current={type:value,fields:[]};blocks.push(current)
   if(blocks.length>MAX_ENTITIES*3)throw Error('Too many DXF entity blocks')
  }else if(current)current.fields.push([code,value])
  else throw Error('Orphan DXF entity group')
 }
 if(sections!==1)throw Error('Exactly one ENTITIES section required')
 const entities=[]
 const one=(block,code,required=true)=>{
  const values=block.fields.filter(p=>p[0]===code).map(p=>p[1])
  if(values.length>1||(required&&values.length!==1))throw Error(`Missing/duplicate group ${code} on ${block.type}`)
  return values[0]
 }
 const allowed=(block,codes)=>{
  if(block.fields.some(([code])=>!codes.includes(code)))throw Error(`Unsupported ${block.type} DXF group`)
 }
 const num=(block,code,defaultValue)=>{
  const raw=one(block,code,defaultValue===undefined)
  if(raw===undefined)return defaultValue
  if(!raw||!finite(Number(raw)))throw Error(`Invalid numeric DXF group ${code}`)
  return Number(raw)
 }
 const xy=(block,x=10,y=20)=>[num(block,x),num(block,y)]
 const layer=block=>{
  const name=one(block,8)
  if(!/^[A-Za-z0-9_-]{1,96}$/.test(name))throw Error('Unsafe or missing entity layer')
  return name
 }
 for(let i=0;i<blocks.length;i++){
  const block=blocks[i]
  if(block.type==='LINE'){
   allowed(block,[5,8,10,20,30,11,21,31,330])
   if(num(block,30,0)!==0||num(block,31,0)!==0)throw Error('Nonplanar LINE')
   entities.push({kind:'LINE',layer:layer(block),points:[xy(block),xy(block,11,21)]})
  }else if(block.type==='TEXT'){
   allowed(block,[5,8,10,20,30,40,1,330])
   if(num(block,30,0)!==0)throw Error('Nonplanar TEXT')
   entities.push({kind:'TEXT',layer:layer(block),points:[xy(block)],height:num(block,40),text:one(block,1)})
  }else if(block.type==='POLYLINE'){
   allowed(block,[5,8,66,70,330])
   const name=layer(block)
   if(num(block,70)!==1||num(block,66,1)!==1)throw Error('Nonclosed or nonvertex POLYLINE')
   const points=[]
   let ended=false
   while(++i<blocks.length){
    const vertex=blocks[i]
    if(vertex.type==='SEQEND'){
     allowed(vertex,[5,8,330])
     if(one(vertex,8,false)!==undefined&&layer(vertex)!==name)throw Error('SEQEND layer drift')
     ended=true;break
    }
    if(vertex.type!=='VERTEX')throw Error('Unterminated POLYLINE')
    allowed(vertex,[5,8,10,20,30,330])
    if(layer(vertex)!==name||num(vertex,30,0)!==0)throw Error('VERTEX layer/plane drift')
    points.push(xy(vertex))
    if(points.length>MAX_VERTICES)throw Error('Excessive vertices')
   }
   if(!ended||points.length<3)throw Error('Incomplete POLYLINE')
   entities.push({kind:'POLYLINE',layer:name,points})
  }else if(block.type==='LWPOLYLINE'){
   allowed(block,[5,8,70,90,10,20,38,330])
   if(num(block,70)!==1||num(block,38,0)!==0)throw Error('Nonclosed/nonplanar LWPOLYLINE')
   const xs=block.fields.filter(([code])=>code===10).map(([,v])=>Number(v))
   const ys=block.fields.filter(([code])=>code===20).map(([,v])=>Number(v))
   if(xs.length!==ys.length||xs.length<3||xs.length>MAX_VERTICES||xs.length!==num(block,90,xs.length)||
     [...xs,...ys].some(v=>!finite(v)))throw Error('Invalid LWPOLYLINE vertices')
   entities.push({kind:'POLYLINE',layer:layer(block),points:xs.map((x,j)=>[x,ys[j]])})
  }else throw Error(`Unexpected receiver entity ${block.type}`)
  if(entities.length>MAX_ENTITIES)throw Error('Too many receiver entities')
 }
 return entities
}
const same=(a,b)=>a.kind===b.kind&&a.layer===b.layer&&a.points.length===b.points.length&&
 a.points.every((p,i)=>pointClose(p,b.points[i]))&&
 (a.kind!=='TEXT'||a.text===b.text&&close(a.height,b.height))

/** All authored sizes, all DXF entities. Reordering entities and harmless
 * numeric formatting are allowed; changing any physical auxiliary layer,
 * hidden entity, grainline or label is not. This is an intentionally strict
 * machine-neutral local roundtrip profile, not an AAMA/ASTM certification.
 */
export function inspectIndustrialReceivingEntityInventory20261028(project,wiresBySize){
 try{
  const sizes=project?.grading?.sizes
  if(!Array.isArray(sizes)||sizes.length<2||sizes.length>24||
   new Set(sizes).size!==sizes.length||!sizes.includes(project.grading.baseSize)||
   !wiresBySize||typeof wiresBySize!=='object'||Array.isArray(wiresBySize)||
   Object.keys(wiresBySize).length!==sizes.length||
   sizes.some(size=>!Object.hasOwn(wiresBySize,size)))return fail('INVALID_RECEIVER_SIZE_INVENTORY')
  const rows=[]
  for(const size of sizes){
   const reference=parse(projectToDxf(gradeProject(project,size),size,
    {cutlineMode:'manufacturing',requireGradedGeometry:true}))
   const received=parse(wiresBySize[size])
   if(reference.length!==received.length)return fail('RECEIVER_ENTITY_INVENTORY_DRIFT',
    `${size}: expected ${reference.length} entities, received ${received.length}`)
   const unused=[...received]
   for(const authored of reference){
    const index=unused.findIndex(actual=>same(authored,actual))
    if(index<0)return fail('RECEIVER_ENTITY_INVENTORY_DRIFT',`${size}: ${authored.kind} ${authored.layer}`)
    unused.splice(index,1)
   }
   rows.push({size,entities:reference.length,
    grainLines:reference.filter(e=>e.kind==='LINE'&&e.layer.startsWith('GRAIN_')).length,
    labels:reference.filter(e=>e.kind==='TEXT'&&e.layer.startsWith('LABEL_')).length})
  }
  return {ok:true,status:'LOCAL_RECEIVER_ALL_ENTITY_INVENTORY_MATCH',issues:[],rows,
   receivingAuxiliaryEntitiesVerified:true,independentReceiverAuthenticated:false,
   receiverCadVerified:false,aamaCertified:false,astmCertified:false,
   cuttingAuthorized:false,factoryApproved:false,manufacturingApproved:false,
   limitations:'Strict unsigned local all-entity DXF comparison, not authenticated third-party receiving CAD or cutter approval.'}
 }catch(error){return fail('RECEIVER_ENTITY_INSPECTION_REFUSED',String(error.message||error))}
}
