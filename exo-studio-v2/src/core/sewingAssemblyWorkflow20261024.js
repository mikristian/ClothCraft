import { edgeRangeLength } from './project.js'
import { gradeProject } from './grading.js'
import { seamEndpointInterval, seamEndpointOverlap, validateNewSeam } from './sewingConstruction.js'

const MAX_PIECES=128, MAX_POINTS=4096, MAX_SEAMS=256, MAX_SIZES=16
const failure=(code,detail=code)=>({ok:false,code,detail,manufacturingApproved:false})
const finite=n=>typeof n==='number'&&Number.isFinite(n)
const key=endpoint=>`${endpoint.pieceId}: ${endpoint.edgeIndex}`
const validName=value=>typeof value==='string'&&value.length<=160

// Return a wholly separate JSON-compatible data graph without calling authored
// getters, toJSON hooks, constructors or JSON.stringify on untrusted objects.
function detached(value){
  const seen=new Set(),budget={nodes:0,fields:0}
  function visit(input,depth){
    if(input===null||typeof input==='string'||typeof input==='boolean')return input
    if(finite(input))return input
    if(!input||typeof input!=='object')throw Error('UNSAFE_SOURCE_VALUE')
    if(depth>32||++budget.nodes>24000||seen.has(input))throw Error('SOURCE_COMPLEXITY_BUDGET')
    const proto=Object.getPrototypeOf(input)
    if(!Array.isArray(input)&&proto!==Object.prototype&&proto!==null)throw Error('UNSAFE_SOURCE_PROTOTYPE')
    if(Array.isArray(input)&&Object.getOwnPropertyDescriptor(input,'length').value>MAX_POINTS)
      throw Error('SOURCE_COMPLEXITY_BUDGET')
    seen.add(input)
    const properties=Object.getOwnPropertyDescriptors(input)
    const keys=Reflect.ownKeys(properties)
    if((budget.fields+=keys.length)>72000)throw Error('SOURCE_COMPLEXITY_BUDGET')
    const result=Array.isArray(input)?[]:{}
    for(const property of keys){
      if(typeof property!=='string'||['__proto__','constructor','prototype'].includes(property))
        throw Error('UNSAFE_SOURCE_KEY')
      const descriptor=properties[property]
      if(!Object.hasOwn(descriptor,'value'))throw Error('UNSAFE_SOURCE_ACCESSOR')
      if(property==='length'&&Array.isArray(input)){result.length=descriptor.value;continue}
      if(!descriptor.enumerable)throw Error('UNSAFE_SOURCE_FIELD')
      result[property]=visit(descriptor.value,depth+1)
    }
    if(Array.isArray(input)&&Object.keys(result).length!==result.length)throw Error('UNSAFE_SPARSE_ARRAY')
    seen.delete(input)
    return result
  }
  return visit(value,0)
}

function prepare(project){
  const clean=detached(project)
  if(!clean||!Array.isArray(clean.pieces)||clean.pieces.length<1||clean.pieces.length>MAX_PIECES||
    !Array.isArray(clean.seams)||clean.seams.length>MAX_SEAMS)throw Error('INVALID_SEWING_PROJECT')
  const pieceIds=new Set()
  let count=0
  for(const piece of clean.pieces){
    if(typeof piece?.id!=='string'||!piece.id||pieceIds.has(piece.id))throw Error('INVALID_PIECE_IDS')
    pieceIds.add(piece.id)
    if(!Array.isArray(piece.points)||piece.points.length<3||piece.points.length>MAX_POINTS||
      piece.points.some(p=>!finite(p?.x)||!finite(p?.y)||Math.abs(p.x)>1e6||Math.abs(p.y)>1e6))
      throw Error('INVALID_PIECE_CONTOUR')
    count+=piece.points.length
  }
  if(count>MAX_POINTS)throw Error('SOURCE_COMPLEXITY_BUDGET')
  return clean
}

function interval(project,endpoint){
  if(!endpoint||typeof endpoint.pieceId!=='string'||!Number.isSafeInteger(endpoint.edgeIndex))return null
  const piece=project.pieces.find(p=>p.id===endpoint.pieceId)
  if(!piece||endpoint.edgeIndex<0||endpoint.edgeIndex>=piece.points.length)return null
  const range=seamEndpointInterval(endpoint)
  if(!range)return null
  try{
    const cm=edgeRangeLength(piece,endpoint.edgeIndex,range.start,range.end)
    return finite(cm)&&cm>=0.01&&cm<=1e6?{cm,range,piece}:null
  }catch{return null}
}

function phase(seam){
  const name=(seam.name||'').toLowerCase()
  if(/shoulder/.test(name))return 0
  if(/neck|collar|band/.test(name))return 1
  if(/sleeve|armhole|armscye/.test(name)&&!/underarm/.test(name))return 2
  if(/side|underarm|inseam|rise/.test(name))return 3
  if(/hem|binding|cuff|finish/.test(name))return 4
  return 5
}

function inspect(project,{toleranceCm=.35,percentTolerance=2,checkGrading=true}={}){
  if(!finite(toleranceCm)||toleranceCm<0||toleranceCm>20||
    !finite(percentTolerance)||percentTolerance<0||percentTolerance>100)
    throw Error('INVALID_SEAM_TOLERANCE')
  const issues=[],rows=[],ids=new Set()
  const add=(code,seamId,detail,size=null)=>issues.push({code,seamId,detail,...(size?{size}:{})})
  const lengths=new Map()
  for(const seam of project.seams){
    const id=seam?.id
    if(typeof id!=='string'||!id||ids.has(id)){add('DUPLICATE_OR_MISSING_SEAM_ID',id||null,'Each seam must have a unique ID');continue}
    ids.add(id)
    const type=seam.type??'normal'
    if(!validName(seam.name)||!['normal','zipper','ease','elastic','gather','binding'].includes(type)||
      (seam.reverseB!==undefined&&typeof seam.reverseB!=='boolean')||
      (['ease','elastic','gather'].includes(type)&&seam.ratio!==undefined&&
        (!finite(seam.ratio)||seam.ratio<.3||seam.ratio>1.2))||
      (type==='zipper'&&seam.openFraction!==undefined&&
        (!finite(seam.openFraction)||seam.openFraction<0||seam.openFraction>1))||
      (type==='zipper'&&seam.openFrom!==undefined&& !['start','end'].includes(seam.openFrom))||
      (seam.easeSide!==undefined&& !['a','b'].includes(seam.easeSide))||
      (seam.gatherSide!==undefined&& !['a','b'].includes(seam.gatherSide))||
      (seam.openFraction!==undefined&&type!=='zipper')||
      (seam.openFrom!==undefined&&type!=='zipper')||
      (seam.ratio!==undefined&&!['ease','elastic','gather'].includes(type))||
      (seam.easeSide!==undefined&&type!=='ease')||
      (seam.gatherSide!==undefined&&type!=='gather'))
      add('INVALID_SEAM_TREATMENT',id,'Seam treatment or direction has invalid or unsupported properties')
    const a=interval(project,seam.a),b=interval(project,seam.b)
    if(!a||!b){add('INVALID_SEWN_EDGE',id,'Missing, collapsed or non-finite sewn cutline');continue}
    if(seam.a.pieceId===seam.b.pieceId&&seam.a.edgeIndex===seam.b.edgeIndex){
      add('SAME_SEWN_EDGE',id,'Both ends reference the same cutline');continue
    }
    if(seam.a?.useExactCorrespondence!==undefined||seam.b?.useExactCorrespondence!==undefined)
      add('INVALID_SEAM_CORRESPONDENCE',id,'Exact correspondence belongs to the seam, not its endpoints')
    if(seam.useExactCorrespondence!==undefined&&typeof seam.useExactCorrespondence!=='boolean')
      add('INVALID_SEAM_CORRESPONDENCE',id,'Exact correspondence flag must be boolean')
    if((a.range.start>0||a.range.end<1||b.range.start>0||b.range.end<1)&&
      seam.useExactCorrespondence!==true)
      add('MISSING_PARTIAL_CORRESPONDENCE',id,'Partial ranges require exact sewing correspondence')
    if(a.piece.active3d===false||b.piece.active3d===false)
      add('INACTIVE_3D_PIECE',id,'A sewn pattern is excluded from 3D simulation')
    const deltaCm=Math.abs(a.cm-b.cm),mismatchPercent=deltaCm/Math.max(a.cm,b.cm)*100
    const matches=deltaCm<=toleranceCm||mismatchPercent<=percentTolerance
    const row={seamId:id,name:seam.name||id,source:key(seam.a),target:key(seam.b),
      sourcePieceId:seam.a.pieceId,targetPieceId:seam.b.pieceId,
      sourceLengthCm:a.cm,targetLengthCm:b.cm,deltaCm,mismatchPercent,
      reverseB:seam.reverseB===true,partial:a.range.start>0||a.range.end<1||b.range.start>0||b.range.end<1,
      matches,phase:phase(seam),type:seam.type||'normal'}
    lengths.set(id,row);rows.push(row)
    if(!matches)add('SEAM_LENGTH_MISMATCH',id,`Sewn lengths differ by ${deltaCm.toFixed(2)} cm (${mismatchPercent.toFixed(1)}%); physical ease distribution is unverified`)
    if(seam.a.pieceId===seam.b.pieceId&&seam.a.edgeIndex!==seam.b.edgeIndex)row.selfSew=true
  }
  // Overlapping source material must not be consumed by multiple sewn pairs.
  for(let i=0;i<project.seams.length;i++){
    const a=project.seams[i]
    if(!lengths.has(a.id))continue
    for(let j=i+1;j<project.seams.length;j++){
      const b=project.seams[j]
      if(!lengths.has(b.id))continue
      if([a.a,a.b].some(x=>[b.a,b.b].some(y=>seamEndpointOverlap(x,y))))
        add('OVERLAPPING_SEWING',b.id,`Cutline overlaps existing seam ${a.id}`)
    }
  }
  let sizes=[]
  if(checkGrading&&project.grading?.sizes?.length){
    if(!Array.isArray(project.grading.sizes)||project.grading.sizes.length>MAX_SIZES||
      new Set(project.grading.sizes).size!==project.grading.sizes.length||
      project.grading.sizes.some(s=>typeof s!=='string'||!s||s.length>40))
      throw Error('INVALID_GRADED_SIZE_SET')
    sizes=[...project.grading.sizes]
    for(const size of sizes){
      let graded
      try{graded=gradeProject(project,size)}
      catch(error){add('GRADE_FAILED',null,`Cannot grade ${size}: ${error.message}`,size);continue}
      for(const seam of project.seams){
        if(!lengths.has(seam.id))continue
        const a=interval(graded,seam.a),b=interval(graded,seam.b)
        if(!a||!b){add('GRADED_SEWN_EDGE_INVALID',seam.id,`No measurable sewn edge at ${size}`,size);continue}
        const deltaCm=Math.abs(a.cm-b.cm),pct=deltaCm/Math.max(a.cm,b.cm)*100
        if(deltaCm>toleranceCm&&pct>percentTolerance)
          add('GRADED_SEAM_MISMATCH',seam.id,`At ${size}: ${deltaCm.toFixed(2)} cm difference (${pct.toFixed(1)}%)`,size)
      }
    }
  }
  // Construct an actionable, deterministic sewing order. Join disconnected
  // panels first, then close cycles and self-sew; never claim an automatic fit.
  const parent=new Map(project.pieces.map(p=>[p.id,p.id]))
  const root=id=>{while(parent.get(id)!==id)id=parent.get(id);return id}
  const steps=rows.slice().sort((a,b)=>a.phase-b.phase||project.seams.findIndex(s=>s.id===a.seamId)-project.seams.findIndex(s=>s.id===b.seamId))
    .map(row=>{
      const a=root(row.sourcePieceId),b=root(row.targetPieceId)
      const relation=row.selfSew?'self-sew':a!==b?'join-panels':'close-seam'
      const blocked=issues.some(issue=>issue.seamId===row.seamId)
      if(a!==b&&!blocked)parent.set(b,a)
      return {...row,relation,order:0,blocked}
    })
  steps.forEach((step,i)=>{step.order=i+1})
  const components=new Map()
  for(const piece of project.pieces){
    if(piece.active3d===false)continue
    const id=root(piece.id)
    if(!components.has(id))components.set(id,[])
    components.get(id).push(piece.id)
  }
  const groups=[...components.values()]
  if(groups.length>1&&project.seams.length)
    add('DISCONNECTED_ASSEMBLY',null,`${groups.length} separate simulated panel groups are not sewn together`)
  if(!steps.length)add('NO_SEWING_RELATIONSHIPS',null,'Create sewing relationships between pattern edges')
  const blockers=issues.length
  return {ok:blockers===0,assemblyReady:blockers===0,manufacturingApproved:false,certifiedPhysicalFit:false,
    stepCount:steps.length,steps,issues,blockers,components:groups,checkedSizes:sizes,
    pieceCount:project.pieces.length,seamCount:project.seams.length,toleranceCm,percentTolerance}
}

/** Read-only assembly graph + all-size stitch-length preflight for EXO projects. */
export function buildSewingAssemblyWorkflow20261024(project,options){
  try{return inspect(prepare(project),options)}
  catch(error){return {...failure('ASSEMBLY_PREFLIGHT_FAILED',error.message),assemblyReady:false,
    issues:[{code:'ASSEMBLY_PREFLIGHT_FAILED',seamId:null,detail:error.message}],steps:[],blockers:1,
    stepCount:0,components:[],checkedSizes:[],seamCount:0,pieceCount:0}}
}

/** Immutable, guarded seam creation and deletion. Unsupported metadata and
 * seam edits remain authored through the existing dedicated editors. */
export function applySewingAssemblyAction20261024(project,action){
  try{
    const next=prepare(project),command=detached(action)
    if(command?.expectedRevision!==undefined&&(!Number.isSafeInteger(command.expectedRevision)||
      command.expectedRevision<0||next.revision!==command.expectedRevision))
      return failure('STALE_SEWING_REVISION','Sewing selection changed; refresh the project before editing')
    if(command?.kind==='seam.create'){
      const {id,a,b,reverseB=false,name}=command
      if(Object.keys(command).some(k=>!['kind','id','a','b','reverseB','name','expectedRevision'].includes(k)))
        return failure('UNSUPPORTED_SEAM_ACTION_FIELD')
      if(typeof id!=='string'||!id||id.length>120||next.seams.some(s=>s.id===id)||
        typeof reverseB!=='boolean'||typeof name!=='string'||name.length>160)
        return failure('INVALID_NEW_SEAM_ID_OR_META')
      for(const endpoint of [a,b])
        if(!endpoint||Object.keys(endpoint).some(k=>!['pieceId','edgeIndex','startT','endT'].includes(k)))
          return failure('UNSUPPORTED_SEAM_REFERENCE')
      const seam={id,name,a,b,reverseB,...([a,b].some(e=>e.startT!==undefined||e.endT!==undefined)?{useExactCorrespondence:true}:{})}
      const valid=validateNewSeam(next,seam)
      if(!valid.ok)return failure('INVALID_SEAM_CONNECTION',valid.messages.join('; '))
      const before=next.seams.length
      next.seams.push(seam)
      const review=inspect(next,{checkGrading:false})
      if(review.issues.some(item=>item.seamId===id&&['INVALID_SEWN_EDGE','OVERLAPPING_SEWING','SAME_SEWN_EDGE'].includes(item.code)))
        return failure('SEAM_REJECTED_BY_ASSEMBLY',id)
      next.revision=(Number.isSafeInteger(next.revision)&&next.revision>=0?next.revision:0)+1
      return {ok:true,project:next,seam,added:next.seams.length-before,warning:valid.warning,
        manufacturingApproved:false,assemblyReady:review.assemblyReady}
    }
    if(command?.kind==='seam.delete'){
      if(Object.keys(command).some(k=>!['kind','seamId','expectedRevision'].includes(k)))
        return failure('UNSUPPORTED_SEAM_ACTION_FIELD')
      if(typeof command.seamId!=='string'||!next.seams.some(s=>s.id===command.seamId))
        return failure('UNKNOWN_SEAM')
      if(next.pieces.some(p=>p.notches?.some(n=>n.matchedSeamId===command.seamId)))
        return failure('MATCHED_NOTCHES_REQUIRE_REMAP','Remove or reassign matched notch attachments before deleting this seam')
      next.seams=next.seams.filter(s=>s.id!==command.seamId)
      next.revision=(Number.isSafeInteger(next.revision)&&next.revision>=0?next.revision:0)+1
      return {ok:true,project:next,deletedSeamId:command.seamId,manufacturingApproved:false}
    }
    if(command?.kind==='seam.update'){
      if(Object.keys(command).some(k=>!['kind','seamId','field','value','expectedRevision'].includes(k))||
        typeof command.seamId!=='string')return failure('INVALID_SEAM_UPDATE')
      const target=next.seams.find(seam=>seam.id===command.seamId)
      if(!target)return failure('UNKNOWN_SEAM')
      const types=new Set(['normal','zipper','ease','elastic','gather','binding'])
      const sides=new Set(['a','b'])
      const {field,value}=command
      const valid=field==='type'?types.has(value):
        field==='reverseB'?typeof value==='boolean':
        field==='openFraction'?finite(value)&&value>=0&&value<=1:
        field==='openFrom'?['start','end'].includes(value):
        field==='ratio'?finite(value)&&value>=.3&&value<=1.2:
        field==='easeSide'||field==='gatherSide'?sides.has(value):false
      if(!valid)return failure('INVALID_SEAM_PROPERTY')
      const chosenType=field==='type'?value:target.type||'normal'
      if(['openFraction','openFrom'].includes(field)&&chosenType!=='zipper'||
        ['easeSide'].includes(field)&&chosenType!=='ease'||
        ['gatherSide'].includes(field)&&chosenType!=='gather'||
        field==='ratio'&&!['ease','elastic','gather'].includes(chosenType))
        return failure('INCOMPATIBLE_SEAM_TREATMENT')
      target[field]=value
      if(field==='type'){
        if(!['ease','elastic','gather'].includes(value)){
          delete target.ratio;delete target.easeSide;delete target.gatherSide
        }else{
          if(!finite(target.ratio)||target.ratio<.3||target.ratio>1.2)
            target.ratio=value==='gather'?.7:value==='elastic'?.85:.96
          if(value!=='ease')delete target.easeSide
          if(value!=='gather')delete target.gatherSide
        }
        if(value!=='zipper'){delete target.openFraction;delete target.openFrom}
      }
      // Treatment changes preserve the original sewn endpoints and therefore
      // must not sidestep source cutline or overlapping-interval validation.
      const verified=validateNewSeam(next,target,{excludeSeamId:command.seamId})
      if(!verified.ok)return failure('INVALID_EXISTING_SEAM',verified.messages.join('; '))
      // Editing a treatment must never approve a previously malformed sewn
      // interval or an imported overlap simply because the edit left endpoints
      // unchanged. The same physical endpoint checks govern creation and edit.
      const review=inspect(next,{checkGrading:false})
      if(review.issues.some(item=>item.seamId===command.seamId&&
        ['INVALID_SEWN_EDGE','OVERLAPPING_SEWING','SAME_SEWN_EDGE',
          'INVALID_SEAM_CORRESPONDENCE','MISSING_PARTIAL_CORRESPONDENCE'].includes(item.code)))
        return failure('INVALID_EXISTING_SEAM','The edited seam has invalid or overlapping sewn intervals')
      next.revision=(Number.isSafeInteger(next.revision)&&next.revision>=0?next.revision:0)+1
      return {ok:true,project:next,seam:target,warning:verified.warning,manufacturingApproved:false}
    }
    return failure('UNSUPPORTED_ASSEMBLY_ACTION')
  }catch(error){return failure('ASSEMBLY_ACTION_REJECTED',error.message)}
}
