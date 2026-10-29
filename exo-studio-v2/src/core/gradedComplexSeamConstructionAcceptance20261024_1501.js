import {gradeProject} from './grading.js'
import {edgePointAt, edgeRangeLength} from './project.js'
import {inspectGradedNotchSeamIntervals} from './gradedNotchIntervalAudit.js'
import {inspectIndustrialPatterns} from './industrialPatternQA.js'
import {inspectGradedCutlines} from './industrialCutlineQA.js'

const finite=n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<1e7
const identifier=x=>typeof x==='string'&&x.trim()===x&&x.length>0&&x.length<=128&&!['__proto__','constructor','prototype'].includes(x)
const point=p=>p&&finite(p.x)&&finite(p.y)
const allowedSeam=new Set(['id','name','type','a','b','reverseB','allowEase'])
const allowedSide=new Set(['pieceId','edgeIndex','startT','endT'])
const allowedAnchor=new Set(['vertexIndex','edgeIndex','t'])
const allowedProject=new Set(['id','name','templateId','revision','updatedAt','pieces','seams','grading','previewSize','productionSpec','fabrics','avatar','simulation','customMeasurements','size','units','metadata','settings','layout','fabric','materialLibrary','notes','description','schemaVersion','version','createdAt','projectSettings','measurementSettings','markerSettings','productionSettings','body','rendering','exportSettings','sewing','assembly','blocks','techPack','ui','history','selectedPieceId','selectedSize','activeTool','view','fasteners'])
const allowedPoint=new Set(['id','x','y','gradeRule','industrialGradeRule'])
const allowedCurve=new Set(['cx','cy'])
const allowedNotch=new Set(['id','type','edgeIndex','t','depthCm','widthCm','lengthCm','matchGroupId','matchedSeamId','x','y','angleDeg','label','name','direction','count','style'])
const allowedLine=new Set(['id','type','name','a','b','aAnchor','bAnchor','widthCm','foldAngleDeg','label','color','notes','metadata'])
const allowedGrading=new Set(['sizes','baseSize','widthPerSizeCm','lengthPerSizeCm','method','gradeRules','breaks','sizeChart','measurementTable'])
const auxiliaryCollections=['bindings','topstitches','pins','zippers','buttons','buttonholes','graphics']
const plainObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)
const unexpected=(obj,keys)=>Object.keys(obj).some(key=>!keys.has(key))

// Getters, hidden fields and non-JSON data are never evaluated by the CAD stack.
// Copy every attachment into a bounded, ordinary value graph before grading.
function copySource(value){
  const active=new Set();let nodes=0
  function visit(obj,depth){
    if(obj===null||typeof obj==='string'||typeof obj==='boolean')return obj
    if(finite(obj))return obj
    if(typeof obj!=='object'||depth>36||active.has(obj)||++nodes>25000)throw Error('UNSAFE_SOURCE_VALUE')
    const arr=Array.isArray(obj)
    const proto=Object.getPrototypeOf(obj)
    if(proto!==(arr?Array.prototype:Object.prototype)&&!(proto===null&&!arr))throw Error('UNSAFE_SOURCE_PROTOTYPE')
    const descriptors=Object.getOwnPropertyDescriptors(obj)
    const keys=Reflect.ownKeys(descriptors)
    if(keys.length>12000||keys.some(k=>typeof k!=='string'||['__proto__','constructor','prototype','toJSON'].includes(k)))throw Error('UNSAFE_SOURCE_FIELD')
    if(arr&&obj.length>10000)throw Error('UNSAFE_SOURCE_ARRAY')
    const out=arr?[]:{};active.add(obj)
    for(const k of keys){
      if(arr&&k==='length')continue
      const d=descriptors[k]
      if(!Object.hasOwn(d,'value')||!d.enumerable)throw Error('UNSAFE_SOURCE_DESCRIPTOR')
      if(arr&&(!/^(0|[1-9]\d*)$/.test(k)||+k>=obj.length))throw Error('UNSAFE_SOURCE_ARRAY_FIELD')
      Object.defineProperty(out,k,{value:visit(d.value,depth+1),writable:true,configurable:true,enumerable:true})
    }
    if(arr&&(out.length!==obj.length||Object.keys(out).length!==obj.length))throw Error('SPARSE_SOURCE_ARRAY')
    active.delete(obj);return out
  }
  return visit(value,0)
}

/** Independent read-only acceptance of measurable graded construction only.
 * It makes no simulation, sewing-process, factory or physical fit determination.
 */
export function inspectGradedComplexSeamConstructionAcceptance20261024(project,{
  seamToleranceCm=.2, notchToleranceCm=.02, attachmentToleranceCm=.005,
}={}){
  const issues=[],seamRows=[],attachmentRows=[],notchRows=[],subsystemReports={}
  const add=(code,scope,message)=>issues.push({code,scope,message,severity:'blocker'})
  const finish=()=>({status:issues.length?'blocked':'measurement_only',blockers:issues.length,issues,
    seamRows,attachmentRows,notchRows,subsystemReports,manufacturingApproved:false,factoryCertified:false,
    physicalFitApproved:false,simulationVerified:false,
    note:'Numerical grading and construction diagnostics only. Physical sewing, engineered ease and factory release require separate proof.'})
  if(![seamToleranceCm,notchToleranceCm,attachmentToleranceCm].every(finite)||
    seamToleranceCm<0||seamToleranceCm>.2||notchToleranceCm<0||notchToleranceCm>.02||
    attachmentToleranceCm<0||attachmentToleranceCm>.02){
    add('INVALID_TOLERANCE','options','Tolerances exceed bounded physical diagnostic limits');return finish()
  }
  let source
  try{source=copySource(project)}catch(error){add(error.message,'source','Source contains unsafe or unsupported values');return finish()}
  const sizes=source?.grading?.sizes
  if(!Array.isArray(sizes)||sizes.length<2||sizes.length>24||!sizes.every(identifier)||
    new Set(sizes).size!==sizes.length||!sizes.includes(source.grading.baseSize)||
    !Array.isArray(source.pieces)||source.pieces.length<1||source.pieces.length>100||
    !Array.isArray(source.seams)||!source.seams.length||source.seams.length>500){
    add('INVALID_SIZE_RUN_OR_PROJECT','project','Requires an authored size run, stitchline pieces and seams');return finish()
  }
  for(const [name,rows] of [['piece',source.pieces],['seam',source.seams]]){
    if(rows.some(row=>!identifier(row?.id))||new Set(rows.map(row=>row.id)).size!==rows.length)
      add('AMBIGUOUS_'+name.toUpperCase()+'_ID',name,'IDs must be unique and nonempty')
  }
  const lookup=new Map(source.pieces.map(piece=>[piece.id,piece]))
  if(unexpected(source,allowedProject))add('UNSUPPORTED_PROJECT_METADATA','project','Unknown project fields can encode unchecked construction references')
  if(!plainObject(source.grading)||unexpected(source.grading,allowedGrading))add('UNSUPPORTED_GRADING_METADATA','grading','Unknown grading fields have no verified size-run behavior')
  for(const piece of source.pieces){
    if(!Array.isArray(piece.points)||piece.points.length<3||piece.points.length>1000||piece.points.some(p=>!point(p))){
      add('INVALID_SOURCE_CONTOUR',piece.id,'Contour must contain finite vertices');continue
    }
    const ids=piece.points.map(p=>p.id)
    if(piece.points.some(p=>!plainObject(p)||unexpected(p,allowedPoint)))
      add('UNSUPPORTED_POINT_METADATA',piece.id,'Unexpected point fields may contain unchecked grade or construction references')
    if(ids.some(id=>id!==undefined)&&(!ids.every(identifier)||new Set(ids).size!==ids.length))
      add('AMBIGUOUS_VERTEX_ID',piece.id,'All authored vertex IDs must be present and unique')
    if(piece.curves!=null&&(typeof piece.curves!=='object'||Array.isArray(piece.curves)||
      Object.entries(piece.curves).some(([i,c])=>!/^(0|[1-9]\d*)$/.test(i)||+i>=piece.points.length||!finite(c?.cx)||!finite(c?.cy))))
      add('INVALID_CURVE_CONTROLS',piece.id,'Curve controls must refer to finite source edges')
    if(plainObject(piece.curves)&&Object.values(piece.curves).some(c=>!plainObject(c)||unexpected(c,allowedCurve)))
      add('UNSUPPORTED_CURVE_METADATA',piece.id,'Unknown curve control fields cannot be proven grade stable')
    if(piece.notches!=null&&(!Array.isArray(piece.notches)||piece.notches.some(n=>!identifier(n?.id)||!Number.isInteger(n.edgeIndex)||
      n.edgeIndex<0||n.edgeIndex>=piece.points.length||!finite(n.t)||n.t<0||n.t>1)||
      new Set(piece.notches.map(n=>n.id)).size!==piece.notches.length))
      add('INVALID_SOURCE_NOTCH',piece.id,'Notches require unique IDs and valid arclength stations')
    for(const notch of Array.isArray(piece.notches)?piece.notches:[]){
      if(!plainObject(notch)||unexpected(notch,allowedNotch))add('UNSUPPORTED_NOTCH_METADATA',piece.id,'Notch contains unknown attachment fields')
      if(Object.hasOwn(notch,'x')!==Object.hasOwn(notch,'y')||
        (Object.hasOwn(notch,'x')&&(!point(notch)||!Number.isInteger(notch.edgeIndex)||!finite(notch.t)||notch.t<0||notch.t>1||
          notch.edgeIndex>=piece.points.length||notch.edgeIndex<0||
          (()=>{try{const p=edgePointAt(piece,notch.edgeIndex,notch.t,64)?.point;return !point(p)||Math.hypot(p.x-notch.x,p.y-notch.y)>attachmentToleranceCm}catch{return true}})())))
        add('SOURCE_NOTCH_COORDINATE_DRIFT',`${piece.id}:${notch.id}`,'Authored notch position differs from edge arclength station')
    }
    if(piece.internalLines!=null&&!Array.isArray(piece.internalLines))add('INVALID_CONSTRUCTION_LINES',piece.id,'Internal lines must be an array')
    for(const line of Array.isArray(piece.internalLines)?piece.internalLines:[]){
      if(plainObject(line)&&unexpected(line,allowedLine))add('UNSUPPORTED_CONSTRUCTION_LINE_METADATA',`${piece.id}:${line.id}`,'Unknown construction metadata cannot be verified')
      if(!identifier(line?.id)||!point(line.a)||!point(line.b)){
        add('INVALID_CONSTRUCTION_LINE',piece.id,'Line requires ID and finite endpoints');continue
      }
      for(const key of ['a','b']){
        const anchor=line[`${key}Anchor`]
        if(!anchor){add('UNANCHORED_CONSTRUCTION_ENDPOINT',`${piece.id}:${line.id}:${key}`,'An interpolated endpoint has no proven edge or vertex attachment');continue}
        if(typeof anchor!=='object'||Array.isArray(anchor)||Object.keys(anchor).some(k=>!allowedAnchor.has(k))||
          (Object.hasOwn(anchor,'vertexIndex')===Object.hasOwn(anchor,'edgeIndex'))||
          (Object.hasOwn(anchor,'vertexIndex')&&(!Number.isInteger(anchor.vertexIndex)||anchor.vertexIndex<0||anchor.vertexIndex>=piece.points.length||Object.hasOwn(anchor,'t')))||
          (Object.hasOwn(anchor,'edgeIndex')&&(!Number.isInteger(anchor.edgeIndex)||anchor.edgeIndex<0||anchor.edgeIndex>=piece.points.length||!finite(anchor.t)||anchor.t<0||anchor.t>1))){
          add('INVALID_CONSTRUCTION_ANCHOR',`${piece.id}:${line.id}:${key}`,'Use one finite edge arclength or vertex anchor')
        }else{
          try{
            const expected=Object.hasOwn(anchor,'vertexIndex')?piece.points[anchor.vertexIndex]:edgePointAt(piece,anchor.edgeIndex,anchor.t,64)?.point
            if(!point(expected)||Math.hypot(expected.x-line[key].x,expected.y-line[key].y)>attachmentToleranceCm)
              add('SOURCE_CONSTRUCTION_ANCHOR_DRIFT',`${piece.id}:${line.id}:${key}`,'Source line endpoint differs from its authored anchor station')
          }catch{add('SOURCE_CONSTRUCTION_ANCHOR_DRIFT',`${piece.id}:${line.id}:${key}`,'Source line anchor could not be evaluated')}
        }
      }
    }
    if(Array.isArray(piece.internalLines)&&new Set(piece.internalLines.map(line=>line?.id)).size!==piece.internalLines.length)
      add('DUPLICATE_CONSTRUCTION_LINE',piece.id,'Construction line IDs must be unique')
    for(const collection of auxiliaryCollections){
      const value=piece[collection]
      if(value!=null&&!Array.isArray(value))add('MALFORMED_CONSTRUCTION_COLLECTION',`${piece.id}:${collection}`,'Construction collection must be a well-formed array')
      else if(value?.length)add('UNVERIFIED_CONSTRUCTION_METADATA',`${piece.id}:${collection}`,'Additional construction metadata requires an independent attachment validator')
    }
  }
  for(const seam of source.seams){
    if(Object.keys(seam).some(k=>!allowedSeam.has(k))||seam.allowEase!==undefined&&seam.allowEase!==false)
      add('UNSUPPORTED_SEAM_SEMANTICS',seam.id,'Unsupported ease or seam metadata')
    if(seam.a?.pieceId===seam.b?.pieceId)add('SELF_SEAM_UNVERIFIED',seam.id,'Self-seams require a separate topology proof')
    if(seam.reverseB!==true&&seam.reverseB!==false)add('UNSPECIFIED_SEAM_DIRECTION',seam.id,'Explicit orientation is required')
    for(const side of [seam.a,seam.b]){
      const piece=lookup.get(side?.pieceId),start=side?.startT??0,end=side?.endT??1
      if(!piece||!Array.isArray(piece.points)||!Number.isInteger(side.edgeIndex)||side.edgeIndex<0||side.edgeIndex>=piece.points.length||
        !finite(start)||!finite(end)||start<0||end>1||start>=end||Object.keys(side).some(k=>!allowedSide.has(k)))
        add('INVALID_SEAM_SIDE',seam.id,'Seam endpoint, edge or interval is not fully specified')
    }
  }
  // Unsafe geometry prevents all downstream evaluation. Unsupported but
  // well-formed construction (including self-seams) can still yield bounded
  // measurements; the existing blockers always survive to the final result.
  if(issues.some(issue=>!['UNVERIFIED_CONSTRUCTION_METADATA','UNANCHORED_CONSTRUCTION_ENDPOINT',
    'UNVERIFIED_CONSTRUCTION_ATTACHMENT','SELF_SEAM_UNVERIFIED','UNSUPPORTED_SEAM_SEMANTICS',
    'NO_PAIRED_NOTCH_PROOF','SOURCE_CONSTRUCTION_ANCHOR_DRIFT','SOURCE_NOTCH_COORDINATE_DRIFT',
    'UNSUPPORTED_PROJECT_METADATA','UNSUPPORTED_POINT_METADATA','UNSUPPORTED_CURVE_METADATA',
    'UNSUPPORTED_NOTCH_METADATA','UNSUPPORTED_CONSTRUCTION_LINE_METADATA',
    'MALFORMED_CONSTRUCTION_COLLECTION'].includes(issue.code)))return finish()
  const pairGroups=source.pieces.flatMap(piece=>(piece.notches||[]).filter(n=>n.matchGroupId||n.matchedSeamId))
  if(!pairGroups.length)add('NO_PAIRED_NOTCH_PROOF','project','At least one authored paired-notch relationship is required for complex construction acceptance')
  const invoke=(name,fn)=>{
    try{
      const result=fn();subsystemReports[name]={status:result.status,blockers:result.blockers??result.issues?.length??0}
      for(const issue of result.issues||[])add(`${name.toUpperCase()}_${issue.code}`,issue.scope??issue.size??name,issue.message??issue.code)
      return result
    }catch(error){add('SUBSYSTEM_FAILURE',name,String(error?.message||error));return null}
  }
  const pattern=invoke('topology',()=>inspectIndustrialPatterns(source,{sizes,seamToleranceCm,seamTolerancePercent:0}))
  const cuts=invoke('cutline',()=>inspectGradedCutlines(source,{sizes}))
  const notches=invoke('notch',()=>inspectGradedNotchSeamIntervals(source,{sizes,toleranceCm:notchToleranceCm}))
  if(notches?.status==='not_configured')add('NO_PAIRED_NOTCH_PROOF','project','No paired notch groups were checked')
  if(notches?.checks)notchRows.push(...notches.checks)
  for(const size of sizes){
    let graded
    try{graded=gradeProject(source,size)}catch(error){add('GRADE_FAILURE',size,String(error?.message||error));continue}
    if(!Array.isArray(graded.pieces)||graded.pieces.length!==source.pieces.length||graded.pieces.some((p,i)=>p.id!==source.pieces[i].id)){
      add('GRADED_PIECE_ID_DRIFT',size,'Piece identity or order changed');continue
    }
    const byId=new Map(graded.pieces.map(piece=>[piece.id,piece]))
    for(const original of source.pieces){
      const item=byId.get(original.id)
      if(!Array.isArray(item?.points)||item.points.length!==original.points.length||
        item.points.some((p,i)=>!point(p)||p.id!==original.points[i].id)){
        add('GRADED_VERTEX_DRIFT',`${size}:${original.id}`,'Grading changed vertex identity or coordinate validity');continue
      }
      const originalCurves=Object.keys(original.curves||{}).sort(),newCurves=Object.keys(item.curves||{}).sort()
      if(JSON.stringify(originalCurves)!==JSON.stringify(newCurves)||newCurves.some(i=>!finite(item.curves[i]?.cx)||!finite(item.curves[i]?.cy)))
        add('GRADED_CURVE_CONTROL_DRIFT',`${size}:${original.id}`,'Grading lost a curve control or produced nonfinite geometry')
      if(JSON.stringify((original.notches||[]).map(n=>[n.id,n.edgeIndex,n.matchGroupId,n.matchedSeamId]))!==
        JSON.stringify((item.notches||[]).map(n=>[n.id,n.edgeIndex,n.matchGroupId,n.matchedSeamId])))
        add('GRADED_NOTCH_ID_DRIFT',`${size}:${original.id}`,'Paired notch identity or edge changed')
      if((item.internalLines||[]).length!==(original.internalLines||[]).length){
        add('GRADED_CONSTRUCTION_LINE_LOSS',`${size}:${original.id}`,'A construction line was removed');continue
      }
      for(let i=0;i<(original.internalLines||[]).length;i++){
        const line=original.internalLines[i],gradedLine=item.internalLines[i]
        if(line.id!==gradedLine?.id){add('GRADED_CONSTRUCTION_ID_DRIFT',`${size}:${original.id}`,'Construction identity changed');continue}
        for(const key of ['a','b']){
          const anchor=line[`${key}Anchor`]
          if(!anchor)continue
          const expected=Object.hasOwn(anchor,'vertexIndex')?item.points[anchor.vertexIndex]:edgePointAt(item,anchor.edgeIndex,anchor.t,64)?.point
          const measured=gradedLine[key],driftCm=point(expected)&&point(measured)?Math.hypot(expected.x-measured.x,expected.y-measured.y):Infinity
          attachmentRows.push({size,pieceId:original.id,lineId:line.id,endpoint:key,driftCm,pass:driftCm<=attachmentToleranceCm})
          if(!(driftCm<=attachmentToleranceCm))add('GRADED_CONSTRUCTION_ANCHOR_DRIFT',`${size}:${original.id}:${line.id}:${key}`,'Graded endpoint diverges from its authored edge or vertex anchor')
        }
      }
    }
    for(const seam of source.seams){
      const a=seam.a,b=seam.b
      try{
        const left=edgeRangeLength(byId.get(a.pieceId),a.edgeIndex,a.startT??0,a.endT??1)
        const right=edgeRangeLength(byId.get(b.pieceId),b.edgeIndex,b.startT??0,b.endT??1)
        const mismatchCm=Math.abs(left-right),pass=finite(left)&&finite(right)&&left>.001&&right>.001&&mismatchCm<=seamToleranceCm
        seamRows.push({size,seamId:seam.id,lengthAcm:left,lengthBcm:right,mismatchCm,pass,partial:a.startT!=null||a.endT!=null||b.startT!=null||b.endT!=null,reverseB:seam.reverseB})
        if(!pass)add('GRADED_CURVED_SEAM_LENGTH_MISMATCH',`${size}:${seam.id}`,'Physical sewn intervals exceed the permitted mismatch')
      }catch(error){add('GRADED_SEAM_MEASUREMENT_FAILURE',`${size}:${seam.id}`,String(error?.message||error))}
    }
  }
  return finish()
}
