import {strFromU8,unzipSync} from 'fflate'
import {buildSizeRun} from './grading.js'
import {validateSavedProject} from './projectRestore.js'
import {sha256Bytes} from './sha256Bytes.js'

const MAX_ZIP_BYTES=20*1024*1024
const MAX_TOTAL_BYTES=40*1024*1024
const MAX_ENTRY_BYTES=8*1024*1024
const MAX_FILES=320
const canonicalPath=path=>typeof path==='string'&&path.length>0&&path.length<240&&
  !path.startsWith('/')&&!path.includes('\\')&&!path.includes('\0')&&
  !path.split('/').some(part=>!part||part==='.'||part==='..')
const fail=(reason)=>{throw new Error(`Factory ZIP restoration refused: ${reason}`)}
const utf8=new TextDecoder('utf-8',{fatal:true})

function assertConstructableGeometry(graded,size){
  const finitePoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)
  for(const piece of graded.pieces||[]){
    const label=`${piece?.id||'unknown'} / ${size}`
    if(!Array.isArray(piece?.points)||piece.points.length<3)fail(`piece has fewer than three vertices: ${label}`)
    if(!piece.points.every(finitePoint))fail(`piece contains nonfinite vertices: ${label}`)
    for(const [edge,curve] of Object.entries(piece.curves||{})){
      if(!Number.isInteger(Number(edge))||Number(edge)<0||Number(edge)>=piece.points.length||
         !curve||!Number.isFinite(curve.cx)||!Number.isFinite(curve.cy)){
        fail(`piece contains unsupported or nonfinite curve control: ${label} edge ${edge}`)
      }
    }
    for(const notch of piece.notches||[]){
      if(!Number.isInteger(notch.edgeIndex)||notch.edgeIndex<0||notch.edgeIndex>=piece.points.length||
         !Number.isFinite(notch.t??0.5)||(notch.t??0.5)<0||(notch.t??0.5)>1||
         (notch.depthCm!=null&&(!Number.isFinite(notch.depthCm)||notch.depthCm<0))){
        fail(`piece contains invalid sewing notch geometry: ${label}`)
      }
    }
    for(const line of piece.internalLines||[]){
      if(!finitePoint(line.a)||!finitePoint(line.b))fail(`piece contains invalid construction line: ${label}`)
    }
  }
}

/**
 * Recover an authored garment only from a *complete, hash-consistent* v2
 * development package. This is NOT third-party authenticity validation or
 * manufacturing approval. No UI/user state is changed by this function.
 */
export function recoverFactorySourceFromZip(data){
  const bytes=data instanceof Uint8Array?data:new Uint8Array(data instanceof ArrayBuffer?data:[])
  if(!bytes.length||bytes.length>MAX_ZIP_BYTES)fail('archive exceeds the 20 MB compressed input limit')
  const names=new Set()
  let claimedBytes=0
  let files
  try{
    files=unzipSync(bytes,{filter(info){
      if(!canonicalPath(info.name)||names.has(info.name))fail(`invalid or repeated archive path ${info.name}`)
      if(!Number.isSafeInteger(info.originalSize)||info.originalSize<0||info.originalSize>MAX_ENTRY_BYTES)fail(`file too large: ${info.name}`)
      names.add(info.name)
      if(names.size>MAX_FILES)fail('too many archive entries')
      claimedBytes+=info.originalSize
      if(claimedBytes>MAX_TOTAL_BYTES)fail('total declared archive data exceeds 40 MB')
      return true
    }})
  }catch(error){
    if(String(error.message).startsWith('Factory ZIP restoration refused:'))throw error
    fail(`archive cannot be safely decoded (${error.message})`)
  }
  if(!files['manifest.json']||!files['garment-source.json']||!files['size-run.json'])fail('missing manifest, editable source or graded size-run')
  let manifest,project,storedRun
  try{
    manifest=JSON.parse(utf8.decode(files['manifest.json']))
    project=JSON.parse(utf8.decode(files['garment-source.json']))
    storedRun=JSON.parse(utf8.decode(files['size-run.json']))
  }catch(error){fail(`invalid required JSON (${error.message})`)}
  if(manifest?.format!=='garment-studio-factory-package'||manifest.version!==2)fail('legacy or unsupported manifest version: use original garment-source.json and verify it separately')
  if(!Array.isArray(manifest.files)||manifest.files.length!==names.size||
    new Set(manifest.files).size!==manifest.files.length||
    manifest.files.some(name=>!names.has(name)||!canonicalPath(name)))fail('manifest inventory does not exactly match archive entries')
  if(!manifest.sha256||typeof manifest.sha256!=='object'||Array.isArray(manifest.sha256)||
    Object.keys(manifest.sha256).length!==names.size-1)fail('missing or incomplete SHA-256 content map')
  for(const [path,data] of Object.entries(files)){
    if(path==='manifest.json')continue
    const expected=manifest.sha256[path]
    if(typeof expected!=='string'||!/^[a-f0-9]{64}$/.test(expected)||sha256Bytes(data)!==expected){
      fail(`content digest mismatch for ${path}`)
    }
  }
  try{validateSavedProject(project)}catch(error){fail(`authored project geometry invalid (${error.message})`)}
  assertConstructableGeometry(project,'authored source')
  if(project.patternSource?.referenceOnly||project.pieces.some(p=>p.patternImportProvenance?.referenceOnly))fail('source contains reference-only cutting outlines, not an authored garment')
  if(manifest.project?.id!==project.id||manifest.project?.name!==project.name||manifest.project?.revision!==project.revision||
    manifest.project?.units!==(project.units||'cm'))fail('manifest project ID, name, units or revision differs from editable source')
  const sizes=project.grading?.sizes
  if(!Array.isArray(sizes)||!sizes.length||new Set(sizes).size!==sizes.length||
     sizes.some(s=>typeof s!=='string'||!s.trim())||
     manifest.grading?.baseSize!==project.grading.baseSize||
     JSON.stringify(manifest.grading?.sizes)!==JSON.stringify(sizes))fail('manifest and source grading sets disagree')
  if(!storedRun||typeof storedRun!=='object'||Array.isArray(storedRun)||
     JSON.stringify(Object.keys(storedRun))!==JSON.stringify(sizes))fail('graded size-run is missing, reordered or incomplete')
  const ids=project.pieces.map(piece=>piece.id)
  if(new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string'||!id))fail('duplicate or missing piece identity')
  const sewn=new Set((project.seams||[]).map(seam=>seam.id))
  if(sewn.size!==(project.seams||[]).length)fail('duplicate sewing identity')
  for(const seam of project.seams){
    for(const side of [seam.a,seam.b]){
      const piece=project.pieces.find(p=>p.id===side?.pieceId)
      if(!piece||!Number.isInteger(side.edgeIndex)||side.edgeIndex<0||side.edgeIndex>=piece.points.length){
        fail(`invalid sewing edge relationship: ${seam.id}`)
      }
    }
  }
  let recomputed
  try{recomputed=buildSizeRun(project)}catch(error){fail(`cannot recompute graded dimensions (${error.message})`)}
  if(JSON.stringify(recomputed)!==JSON.stringify(storedRun))fail('saved graded size-run differs from independently graded editable source')
  for(const size of sizes)assertConstructableGeometry(recomputed[size],size)
  return {project,manifest,verifiedFiles:names.size,verifiedSizes:[...sizes],
    sourceSha256:manifest.sha256['garment-source.json'],sizeRunSha256:manifest.sha256['size-run.json'],
    format:'garment-studio-factory-package.v2',factoryCertified:false,
    note:'Integrity verified for this ZIP only. SHA-256 is not a manufacturer signature or proof of external CAD and physical sample approval.'}
}
