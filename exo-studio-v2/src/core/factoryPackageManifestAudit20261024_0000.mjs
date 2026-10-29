import {createHash} from 'node:crypto'
import {isDeepStrictEqual} from 'node:util'

const MAX_FILES=320
const MAX_FILE_BYTES=8*1024*1024
const MAX_TOTAL_BYTES=40*1024*1024
const UTF8=new TextDecoder('utf-8',{fatal:true})
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key)
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)
const unsafe=new Set(['__proto__','prototype','constructor'])
const slug=value=>String(value||'garment').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'garment'

function canonicalPath(path){
  return typeof path==='string'&&path.length>0&&path.length<240&&!path.startsWith('/')&&
    !path.includes('\\')&&!path.includes('\0')&&!/^[a-zA-Z]:/.test(path)&&
    !path.endsWith('/')&&path.split('/').every(part=>part&&part!=='.'&&part!=='..'&&!unsafe.has(part.toLowerCase())&&
      !/[\u0000-\u001f\u007f]/.test(part))
}

/** Development-only, pure integrity audit. Never authorizes manufacturing. */
export function auditFactoryPackageManifest20261024_0000(files,expectedProject){
  const diagnostics=[]
  const reject=(code,message)=>diagnostics.push({code,message})
  const result=()=>({ok:diagnostics.length===0,diagnostics,manufacturingApproved:false})
  if(!object(files)){
    reject('INVALID_FILES','Expected a record of archive paths to Uint8Array bytes')
    return result()
  }
  const paths=Object.keys(files)
  if(Object.getOwnPropertySymbols(files).length)reject('UNSAFE_KEYS','Symbol archive keys are unsupported')
  if(paths.length===0||paths.length>MAX_FILES)reject('FILE_COUNT','Archive file count outside supported bounds')
  let total=0
  const folded=new Set()
  for(const path of paths){
    if(!canonicalPath(path))reject('UNSAFE_PATH',`Unsafe or noncanonical archive path: ${path}`)
    const lower=path.toLowerCase()
    if(folded.has(lower))reject('DUPLICATE_PATH',`Case-insensitive duplicate path: ${path}`)
    folded.add(lower)
    const descriptor=Object.getOwnPropertyDescriptor(files,path)
    const bytes=descriptor&&own(descriptor,'value')?descriptor.value:null
    if(!(bytes instanceof Uint8Array)||bytes.byteLength<1||bytes.byteLength>MAX_FILE_BYTES){
      reject('FILE_BYTES',`Invalid or oversized Uint8Array for: ${path}`)
    }else total+=bytes.byteLength
  }
  if(total>MAX_TOTAL_BYTES)reject('TOTAL_BYTES','Total archive payload exceeds 40 MiB')
  if(diagnostics.length)return result()
  const readJSON=path=>{
    if(!own(files,path)){
      reject('REQUIRED_FILE',`Missing required file: ${path}`)
      return null
    }
    try{
      const parsed=JSON.parse(UTF8.decode(files[path]))
      if(!object(parsed))throw new Error('JSON root must be an object')
      return parsed
    }catch(error){
      reject('INVALID_JSON',`Invalid strict UTF-8 JSON ${path}: ${error.message}`)
      return null
    }
  }
  const manifest=readJSON('manifest.json')
  const source=readJSON('garment-source.json')
  const run=readJSON('size-run.json')
  const hasReadiness=own(files,'manufacturing-release-readiness.json')
  const readiness=hasReadiness?readJSON('manufacturing-release-readiness.json'):null
  if(!manifest||!source||!run)return result()
  if(manifest.format!=='garment-studio-factory-package'||manifest.version!==2)reject('FORMAT','Unsupported factory manifest format or version')
  const inventory=manifest.files
  if(!Array.isArray(inventory)||inventory.length!==paths.length||
    inventory.some(path=>!canonicalPath(path))||
    inventory.some((path,index)=>index>0&&inventory[index-1]>=path)||
    inventory.some((path,index)=>path!==[...paths].sort()[index])){
    reject('INVENTORY','Manifest inventory must exactly equal the sorted, unique archive entries')
  }
  const hashes=manifest.sha256
  if(!object(hashes)||Object.keys(hashes).length!==paths.length-1||own(hashes,'manifest.json')||
    Object.keys(hashes||{}).some(path=>!canonicalPath(path)||path==='manifest.json'||!own(files,path))){
    reject('HASH_MAP','Manifest SHA-256 map must contain exactly every non-manifest file')
  }
  if(object(hashes))for(const path of paths){
    if(path==='manifest.json')continue
    const claimed=Object.getOwnPropertyDescriptor(hashes,path)?.value
    if(typeof claimed!=='string'||!/^[0-9a-f]{64}$/.test(claimed)||
      createHash('sha256').update(files[path]).digest('hex')!==claimed){
      reject('HASH_MISMATCH',`Invalid SHA-256 digest: ${path}`)
    }
  }
  const metadata=manifest.project
  if(!object(metadata)||metadata.id!==source.id||metadata.name!==source.name||
    metadata.revision!==source.revision||metadata.units!==(source.units||'cm')){
    reject('PROJECT_METADATA','Manifest project metadata differs from source')
  }
  const sizes=source.grading?.sizes
  const base=source.grading?.baseSize||'M'
  if(!Array.isArray(sizes)||sizes.length===0||sizes.length>64||
    sizes.some(size=>typeof size!=='string'||!size.trim()||size!==size.trim())||
    new Set(sizes).size!==sizes.length||
    !object(manifest.grading)||manifest.grading.baseSize!==base||
    JSON.stringify(manifest.grading.sizes)!==JSON.stringify(sizes)){
    reject('GRADING_METADATA','Manifest grading metadata differs from source size run')
  }else{
    if(JSON.stringify(Object.keys(run))!==JSON.stringify(sizes))reject('SIZE_RUN','Stored grade size inventory differs from source')
    for(const size of sizes){
      if(!object(run[size]))reject('SIZE_RUN',`Missing graded project for size ${size}`)
      else if(run[size].id!==source.id||run[size].name!==source.name||
        (run[size].revision!==undefined&&run[size].revision!==source.revision)||
        (run[size].units!==undefined&&run[size].units!==(source.units||'cm'))){
        reject('SIZE_RUN',`Graded project identity mismatch for size ${size}`)
      }
      const dxf=`patterns/${slug(source.name)}-${size.toLowerCase()}.dxf`
      if(!own(files,dxf))reject('MISSING_GRADED_DXF',`Missing expected graded size DXF: ${dxf}`)
    }
  }
  if(expectedProject!==undefined){
    // The manifest hashes are self-asserted. Only a trusted, complete external
    // authored project binds this package to its original pattern geometry.
    // JSON serialization matches the actual exported garment-source.json format.
    let expectedSource
    try{
      if(!object(expectedProject))throw new Error('Expected a complete project object')
      expectedSource=JSON.parse(JSON.stringify(expectedProject))
    }catch{
      reject('EXPECTED_PROJECT','Expected project cannot be serialized as authored JSON')
    }
    if(expectedSource&&!isDeepStrictEqual(source,expectedSource)){
      reject('EXPECTED_PROJECT','Archived authored source differs from trusted expected project content')
    }
  }
  if(readiness){
    for(const key of ['factoryCertified','factoryCuttingAuthorized','bulkProductionAuthorized','manufacturingApproved']){
      if(readiness[key]===true)reject('APPROVAL_FLAG',`Release readiness cannot assert ${key}=true`)
    }
  }
  return result()
}
