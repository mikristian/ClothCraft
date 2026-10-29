import {createTeeTemplate} from '../data/templates.js'
import {buildSewingAssemblyWorkflow20261024} from './sewingAssemblyWorkflow20261024.js'
import {inspectAccuMarkGradingQualityMatrix} from './accumarkGradingQualityMatrix20261023.js'
import {readSavedProject,writeSavedProject} from './projectRestore.js'

// A trustworthy acceptance gate records evidence independently for each
// milestone stage. Passing CAD does not silently approve a physical solve.
const failed=(stage,reason)=>({stage,pass:false,reason})
const accepted=(stage,evidence)=>({stage,pass:true,evidence})
function snapshot(source,depth=0,seen=new Set()){
  if(depth>24)throw Error('Unsupported metadata depth')
  if(source===null||typeof source!=='object'){
    if(typeof source==='number'&&!Number.isFinite(source))throw Error('Nonfinite source number')
    if(['function','symbol','bigint'].includes(typeof source))throw Error('Unsupported source metadata type')
    return source
  }
  if(seen.has(source))throw Error('Cyclic source metadata')
  if(Array.isArray(source)?Object.getPrototypeOf(source)!==Array.prototype:
    ![Object.prototype,null].includes(Object.getPrototypeOf(source)))throw Error('Unsupported source prototype')
  const keys=Reflect.ownKeys(source)
  if(keys.length>20000)throw Error('Excessive source metadata fields')
  if(Array.isArray(source)&&(source.length>20000||Object.keys(source).length!==source.length))throw Error('Sparse source array')
  seen.add(source)
  const copy=Array.isArray(source)?[]:Object.create(null)
  for(const key of keys){
    if(Array.isArray(source)&&key==='length')continue
    const desc=Object.getOwnPropertyDescriptor(source,key)
    if(typeof key!=='string'||!desc?.enumerable||!('value' in desc)||['__proto__','constructor','prototype'].includes(key))throw Error('Unsafe hidden or accessor metadata')
    Object.defineProperty(copy,key,{value:snapshot(desc.value,depth+1,seen),enumerable:true,writable:true,configurable:true})
  }
  return copy
}

export function inspectFoundationTeeEndToEnd20261024({project=createTeeTemplate()}={}){
  const checks=[]
  let safeProjectId=null
  try{
    const authored=snapshot(project)
    if(typeof authored.id!=='string'||!authored.id.trim())throw Error('Invalid authored project identity')
    if(Object.hasOwn(authored,'externalFactoryAccepted')||Object.hasOwn(authored,'physicalFitApproved'))throw Error('Unsupported external approval metadata')
    safeProjectId=authored.id
    const grading=inspectAccuMarkGradingQualityMatrix(authored)
    const assembly=buildSewingAssemblyWorkflow20261024(authored)
    if(authored.pieces?.length===4&&authored.seams?.length===14&&grading.ok&&grading.sizes?.length===6){
      checks.push(accepted('draft-and-grade',{pieces:4,seams:14,sizes:grading.sizes}))
    }else checks.push(failed('draft-and-grade','Invalid source topology or six-size grading quality'))
    if(assembly.assemblyReady&&assembly.stepCount===14)checks.push(accepted('sewing-readiness',{sewnRelationships:14,checkedSizes:assembly.checkedSizes}))
    else checks.push(failed('sewing-readiness',assembly.issues?.map(i=>i.code).join(', ')||'Sewing topology unresolved'))
    const bytes=new Map()
    const storage={getItem:k=>bytes.get(k)??null,setItem:(k,v)=>bytes.set(k,v)}
    writeSavedProject(storage,'tee','tee-backup',authored)
    const reopened=readSavedProject(storage,'tee','tee-backup')
    if(reopened.status==='primary'&&JSON.stringify(reopened.project)===JSON.stringify(authored))
      checks.push(accepted('source-save-reopen',{status:reopened.status,bytes:bytes.get('tee').length}))
    else checks.push(failed('source-save-reopen','Saved project differs from authored document'))
  }catch(error){checks.push(failed('local-preflight',error.message||String(error)))}
  // A caller-provided approval flag cannot certify a physical trajectory or
  // independent recipient. This gate needs real external evidence ingestion.
  checks.push(failed('physical-fit','No independently verified full-garment frame-by-frame fit evidence'))
  checks.push(failed('external-production','Recipient CAD import and physical plotted/cut sample acceptance pending'))
  return {ok:checks.every(check=>check.pass),projectId:safeProjectId,checks,
    manufacturingApproved:false,fitCertified:false,
    meaning:'Passing internal checks does not establish CLO3D performance or approve production'}
}
