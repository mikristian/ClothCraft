import {gradeProject} from './grading.js'
import {projectToDxf} from './dxf.js'
import {samplePieceBoundary,seamAllowanceBoundary,getEdgeSeamAllowance} from './project.js'

const fail=(issues,code,detail)=>issues.push({code,detail:String(detail).slice(0,300)})
const token=value=>String(value).replace(/[^A-Za-z0-9_-]/g,'_').slice(0,48).toUpperCase()
const finite=value=>typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<=1e7
const same=(a,b,tol)=>a.length===b.length&&a.every((p,i)=>Math.hypot(p.x-b[i].x,p.y-b[i].y)<=tol)
const distToContour=(pt,poly)=>{
 let best=Infinity
 for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],dx=b.x-a.x,dy=b.y-a.y
  const scale=dx*dx+dy*dy
  if(!(scale>0))continue
  const t=Math.max(0,Math.min(1,((pt.x-a.x)*dx+(pt.y-a.y)*dy)/scale))
  best=Math.min(best,Math.hypot(pt.x-a.x-dx*t,pt.y-a.y-dy*t))
 }
 return best
}

/** An independent, deliberately strict decoder for DXF group-code wire data. */
export function parseAccuMarkGradedDxfWire20261023(wire,{maxPairs=180000,maxEntities=20000,maxVertices=16000}={}){
 const issues=[]
 if(typeof wire!=='string'||wire.length>16000000){fail(issues,'WIRE_INVALID','DXF text missing or beyond 16MB');return {ok:false,issues,entities:[],units:null}}
 const lines=wire.replace(/\r/g,'').split('\n');if(lines.at(-1)==='')lines.pop()
 if(lines.length%2||lines.length/2>maxPairs){fail(issues,'PAIR_COUNT','Malformed or excessive DXF group pairs');return {ok:false,issues,entities:[],units:null}}
 const pairs=[]
 for(let i=0;i<lines.length;i+=2){const raw=lines[i].trim();const code=Number(raw);if(!/^\d+$/.test(raw)||!Number.isSafeInteger(code)){fail(issues,'INVALID_CODE',i/2);return {ok:false,issues,entities:[],units:null}}pairs.push([code,lines[i+1].trim()])}
 const units=[];let section='';let entities=[];let current=null;let pending=null;let vertexCount=0
 for(let i=0;i<pairs.length;i++){
  const [code,value]=pairs[i]
  if(code===9&&value==='$INSUNITS'&&pairs[i+1]?.[0]===70)units.push(pairs[i+1][1])
  if(code===0&&value==='SECTION'){if(pairs[i+1]?.[0]!==2){fail(issues,'SECTION','Missing section name');break}section=pairs[++i][1];continue}
  if(code===0&&value==='ENDSEC'){if(pending){fail(issues,'UNTERMINATED_POLYLINE',pending.layer??'unknown');pending=null}section='';continue}
  if(section!=='ENTITIES')continue
  if(code===0){
   if(value==='VERTEX'&&pending){const vertex={};pending.points.push(vertex);vertexCount++;if(vertexCount>maxVertices)fail(issues,'VERTEX_LIMIT',vertexCount);current=vertex;continue}
   if(value==='SEQEND'&&pending){pending=null;current=null;continue}
   if(pending){fail(issues,'MISSING_SEQEND',pending.layer??'unknown');pending=null}
   if(['POLYLINE','LWPOLYLINE','LINE'].includes(value)){
    current={type:value,layer:null,points:[],closed:false,values:{}};entities.push(current);if(value==='POLYLINE')pending=current
    if(entities.length>maxEntities)fail(issues,'ENTITY_LIMIT',entities.length)
   }else current={type:value,unsupported:true}
   continue
  }
  if(!current)continue
  if(current.unsupported){if(code===8&&/^(CUT_|STITCH_|SA_|NOTCH_)/.test(value))fail(issues,'UNSUPPORTED_LAYER_ENTITY',`${value}: ${current.type}`);continue}
  // Raw XY coordinates are insufficient: DXF bulges, widths, extrusion and
  // elevation can change the physical receiver contour without changing XY.
  if([38,39,40,41,42,43,50,51,210,220,230].includes(code)){
   fail(issues,'UNSUPPORTED_GEOMETRY',`${current.layer??pending?.layer??'unknown'} group ${code}`)
   continue
  }
  if((code===30||code===31)&&(!finite(Number(value))||Number(value)!==0)){
   fail(issues,'NONPLANAR_GEOMETRY',`${current.layer??pending?.layer??'unknown'} group ${code}`)
   continue
  }
  if(code===70&&pending&&current!==pending&&Number(value)!==0){fail(issues,'VERTEX_FLAGS',value);continue}
  if(pending&&current!==pending){if(code===10||code===20){const key=code===10?'x':'y';const n=Number(value);if(!value||!finite(n))fail(issues,'COORDINATE',value);else current[key]=n}continue}
  if(code===8)current.layer=value
  else if(code===70){const flags=Number(value);if(!Number.isInteger(flags)||flags!==1&&current.type!=='LINE')fail(issues,'POLYLINE_FLAGS',value);current.closed=(flags&1)!==0}
  else if([10,20,11,21].includes(code)){
   const n=Number(value);if(!value||!finite(n))fail(issues,'COORDINATE',value)
   if(current.type==='LWPOLYLINE'){
    if(code===10){current.points.push({x:n});vertexCount++;if(vertexCount>maxVertices)fail(issues,'VERTEX_LIMIT',vertexCount)}else if(code===20){const last=current.points.at(-1);if(!last||last.y!==undefined)fail(issues,'LW_VERTEX','Unpaired Y coordinate');else last.y=n}
   }else current.values[code]=n
  }
 }
 if(pending)fail(issues,'UNTERMINATED_POLYLINE',pending.layer??'unknown')
 if(units.length!==1||units[0]!=='4')fail(issues,'UNITS',`Expected exactly one INSUNITS=4, got ${units}`)
 for(const e of entities){if(!e.layer)fail(issues,'MISSING_LAYER',e.type);if(['POLYLINE','LWPOLYLINE'].includes(e.type)){
  if(e.points.length<3||e.points.some(p=>!finite(p.x)||!finite(p.y)))fail(issues,'POLYLINE_COORDINATES',e.layer)
  if(!e.closed)fail(issues,'OPEN_CONTOUR',e.layer)
 }else if(e.type==='LINE'&&[10,20,11,21].some(c=>!finite(e.values[c])))fail(issues,'LINE_COORDINATES',e.layer)
 }
 return {ok:issues.length===0,issues,entities,units:units[0]??null}
}

/** Audits each size independently; wireForSize allows external alteration/receiver fixtures. */
export function auditAccuMarkGradedDxfRoundtrip20261023(project,{wireForSize,maxSizes=24,maxPieces=80,maxVerticesPerContour=16000,toleranceMm=0.012}={}){
 const issues=[];const rows=[]
 const sizes=project?.grading?.sizes
 if(!Array.isArray(sizes)||!sizes.length||sizes.length>maxSizes||sizes.some(s=>typeof s!=='string'||!s.trim())||new Set(sizes).size!==sizes.length){fail(issues,'SIZES','Invalid, duplicate, empty or excessive graded sizes');return {ok:false,rows,issues,factoryApproved:false}}
 if(!sizes.includes(project.grading.baseSize)){fail(issues,'BASE_SIZE','Base size absent');return {ok:false,rows,issues,factoryApproved:false}}
 if(!Array.isArray(project.pieces)||!project.pieces.length||project.pieces.length>maxPieces){fail(issues,'PIECES','Missing or excessive source panels');return {ok:false,rows,issues,factoryApproved:false}}
 const ids=project.pieces.map(p=>p?.id),names=project.pieces.map(p=>token(p?.name))
 if(ids.some(x=>typeof x!=='string'||!x)||new Set(ids).size!==ids.length||names.some(x=>!x||x==='UNDEFINED')||new Set(names).size!==names.length){fail(issues,'PIECE_IDENTITY','Duplicate or missing piece ID/DXF-safe name');return {ok:false,rows,issues,factoryApproved:false}}
 for(const piece of project.pieces){
  if(!Array.isArray(piece.points)||piece.points.length<3||piece.points.length>maxVerticesPerContour||piece.points.some(p=>!finite(p?.x)||!finite(p?.y))){fail(issues,'SOURCE_POINTS',piece.id);return {ok:false,rows,issues,factoryApproved:false}}
  if(!Array.isArray(piece.edgeSeamAllowances)&&piece.edgeSeamAllowances!=null&&typeof piece.edgeSeamAllowances!=='object'){fail(issues,'ALLOWANCE',piece.id);return {ok:false,rows,issues,factoryApproved:false}}
  if(!finite(piece.seamAllowance??0)||Number(piece.seamAllowance??0)<0||piece.points.some((_,i)=>{const a=piece.edgeSeamAllowances?.[i];return a!=null&&(!finite(a)||a<0)})){fail(issues,'ALLOWANCE',piece.id);return {ok:false,rows,issues,factoryApproved:false}}
  if(!Array.isArray(piece.notches??[])||piece.notches?.length>256||piece.notches?.some(n=>
    !Number.isInteger(n?.edgeIndex)||n.edgeIndex<0||n.edgeIndex>=piece.points.length||
    !finite(n?.t??.5)||(n?.t??.5)<0||(n?.t??.5)>1||
    !finite(n?.depthCm??.45)||(n?.depthCm??.45)<=0||
    ![undefined,null,'single','double'].includes(n.type))){fail(issues,'NOTCH_SPEC',piece.id);return {ok:false,rows,issues,factoryApproved:false}}
 }
 for(const size of sizes){
  const row={size,ok:false,pieces:[],wireUnits:null};rows.push(row)
  try{
   const graded=gradeProject(project,size)
   if(!graded?.pieces||graded.pieces.length!==project.pieces.length)throw new Error('Grade changed panel count')
   const wire=wireForSize?wireForSize(size,graded):projectToDxf(graded,size,{cutlineMode:'manufacturing'})
   const parsed=parseAccuMarkGradedDxfWire20261023(wire,{maxVertices:maxPieces*maxVerticesPerContour*2,maxEntities:maxPieces*30})
   // Retain the local export as the authored-coordinate reference when auditing
   // an external receiver's wire. An on-contour notch of the correct depth can
   // still be at the wrong station or point out of the seam allowance.
   const reference=wireForSize?parseAccuMarkGradedDxfWire20261023(projectToDxf(graded,size,{cutlineMode:'manufacturing'}),{maxVertices:maxPieces*maxVerticesPerContour*2,maxEntities:maxPieces*30}):parsed
   if(!reference.ok)throw new Error('Invalid local notch reference export')
   row.wireUnits=parsed.units
   for(const issue of parsed.issues)fail(issues,issue.code,`${size}: ${issue.detail}`)
   if(!parsed.ok)continue
   const claimed=(wire.match(/^999\nGARMENT_STUDIO_SIZE ([^\n]*)$/gm)||[])
   if(claimed.length!==1||claimed[0]!==`999\nGARMENT_STUDIO_SIZE ${size}`)fail(issues,'SIZE_LABEL',size)
   if(!wire.includes('CUT_LAYER_IS_PHYSICAL_ALLOWANCE_OUTLINE_STITCH_IS_SEWLINE_EXPLICIT_NOTCHES_ONLY'))fail(issues,'CUT_MODE',size)
   const outlineLayers=new Map()
   for(const entity of parsed.entities.filter(e=>/^(CUT_|STITCH_|SA_)/.test(e.layer??''))){const bucket=outlineLayers.get(entity.layer)||[];bucket.push(entity);outlineLayers.set(entity.layer,bucket)}
   const expected=new Set();let xOffset=0
   const notchExpected=new Set()
   for(const piece of graded.pieces){
    const name=token(piece.name),sizeToken=token(size),cutKey=`CUT_${name}_${sizeToken}`,stitchKey=`STITCH_${name}`
    const stitched=samplePieceBoundary(piece,12).points
    const physical=seamAllowanceBoundary(piece,12)
    if(stitched.length<3||stitched.length>maxVerticesPerContour||physical.length<3||physical.length>maxVerticesPerContour||[...stitched,...physical].some(p=>!finite(p.x)||!finite(p.y))){fail(issues,'GRADED_GEOMETRY',`${size}/${piece.id}`);continue}
    const width=Math.max(...stitched.map(p=>p.x))-Math.min(...stitched.map(p=>p.x))
    const shift=xOffset-Math.min(...stitched.map(p=>p.x));xOffset+=width+10
    const allowance=piece.points.some((_,i)=>getEdgeSeamAllowance(piece,i)>0)
    expected.add(cutKey);if(allowance)expected.add(stitchKey)
    const cut=outlineLayers.get(cutKey)||[],stitch=outlineLayers.get(stitchKey)||[]
    const physicalExpected=(allowance?physical:stitched).map(p=>({x:(p.x+shift)*10,y:p.y*10}))
    const stitchedExpected=stitched.map(p=>({x:(p.x+shift)*10,y:p.y*10}))
    const pointRow={id:piece.id,cutVertices:cut[0]?.points?.length??0,stitchVertices:stitch[0]?.points?.length??0,ok:true}
    row.pieces.push(pointRow)
    if(cut.length!==1||!same(cut[0]?.points??[],physicalExpected,toleranceMm)){fail(issues,'CUT_MISMATCH',`${size}/${piece.id}`);pointRow.ok=false}
    if(allowance&&(stitch.length!==1||!same(stitch[0]?.points??[],stitchedExpected,toleranceMm))){fail(issues,'STITCH_MISMATCH',`${size}/${piece.id}`);pointRow.ok=false}
    if(!allowance&&stitch.length){fail(issues,'UNEXPECTED_STITCH',`${size}/${piece.id}`);pointRow.ok=false}
    // Factory DXF must contain *only* author-specified physical notches,
    // preserving double-notch multiplicity. Every LINE starts on the CUT
    // contour and its physical depth matches the source pattern in mm.
    const notchKey=`NOTCH_${name}`
    const notches=(piece.notches||[]).flatMap(n=>Array.from({length:n.type==='double'?2:1},()=>Number(n.depthCm??.45)*10))
    const actualNotches=parsed.entities.filter(e=>e.type==='LINE'&&e.layer===notchKey)
    const expectedNotches=reference.entities.filter(e=>e.type==='LINE'&&e.layer===notchKey)
    if(notches.length)notchExpected.add(notchKey)
    pointRow.notchesExpected=notches.length;pointRow.notchesFound=actualNotches.length
    if(notches.length!==actualNotches.length){fail(issues,'NOTCH_COUNT',`${size}/${piece.id} source=${notches.length} wire=${actualNotches.length}`);pointRow.ok=false}
    // Compare complete oriented cuts, allowing entity reordering but never
    // accepting a displaced, reversed or duplicated cut as an authored mark.
    const unmatched=[...actualNotches]
    for(const expectedCut of expectedNotches){
      const match=unmatched.findIndex(actual=>[10,20,11,21].every(code=>Math.abs(actual.values[code]-expectedCut.values[code])<=toleranceMm))
      if(match<0){fail(issues,'NOTCH_POSITION',`${size}/${piece.id} missing authored physical notch station or direction`);pointRow.ok=false}
      else unmatched.splice(match,1)
    }
    if(unmatched.length){fail(issues,'NOTCH_POSITION',`${size}/${piece.id} unexpected physical notch station or direction`);pointRow.ok=false}
    for(let i=0;i<Math.min(notches.length,actualNotches.length);i++){
      const e=actualNotches[i],a={x:e.values[10],y:e.values[20]},b={x:e.values[11],y:e.values[21]}
      const length=Math.hypot(b.x-a.x,b.y-a.y),originDistance=distToContour(a,physicalExpected)
      if(!finite(length)||Math.abs(length-notches[i])>toleranceMm||!finite(originDistance)||originDistance>toleranceMm){
        fail(issues,'NOTCH_GEOMETRY',`${size}/${piece.id} notch=${i+1} length=${length} originCutError=${originDistance}`)
        pointRow.ok=false
      }
    }
   }
   for(const [key,found] of outlineLayers)if(!expected.has(key)||found.length!==1)fail(issues,'UNKNOWN_OR_DUPLICATE_CONTOUR',`${size}/${key} count=${found.length}`)
   for(const mark of parsed.entities.filter(e=>/^NOTCH_/.test(e.layer??''))){
     if(!notchExpected.has(mark.layer)||mark.type!=='LINE')fail(issues,'UNEXPECTED_NOTCH',`${size}/${mark.layer}`)
   }
   row.ok=issues.every(issue=>!issue.detail.startsWith(`${size}:`)&&!issue.detail.startsWith(`${size}/`))&&row.pieces.length===project.pieces.length&&row.pieces.every(p=>p.ok)
  }catch(error){fail(issues,'EXPORT_OR_GRADE_ERROR',`${size}: ${error?.message??error}`)}
 }
 return {ok:issues.length===0&&rows.every(r=>r.ok),rows,issues,factoryApproved:false}
}
