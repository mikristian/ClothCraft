import {sha256Bytes} from './sha256Bytes.js'

const MAX_FILES=320
const MAX_FILE_BYTES=8*1024*1024
const MAX_TOTAL_BYTES=40*1024*1024
const decoder=new TextDecoder('utf-8',{fatal:true})
const unsafe=new Set(['__proto__','prototype','constructor'])
const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key)
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)
const property=(value,key)=>{
  if(!record(value)&&!Array.isArray(value))return undefined
  const descriptor=Object.getOwnPropertyDescriptor(value,key)
  return descriptor&&own(descriptor,'value')?descriptor.value:undefined
}
const slug=value=>String(value||'garment').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'garment'
const canonicalPath=path=>typeof path==='string'&&path.length>0&&path.length<240&&
  !path.startsWith('/')&&!path.includes('\\')&&!path.endsWith('/')&&!/^[a-zA-Z]:/.test(path)&&
  path.split('/').every(part=>part&&part!=='.'&&part!=='..'&&!unsafe.has(part.toLowerCase())&&!/[\u0000-\u001f\u007f]/.test(part))

function safeAuthoredJSON(value){
  const active=new Set()
  const normalize=node=>{
    if(node===null||typeof node==='string'||typeof node==='boolean')return node
    if(typeof node==='number')return Number.isFinite(node)?node:null
    if(typeof node!=='object'||active.has(node))throw new Error('Non-JSON or recursive source')
    active.add(node)
    let output
    if(Array.isArray(node)){
      output=[]
      for(let i=0;i<node.length;i++){
        const descriptor=Object.getOwnPropertyDescriptor(node,String(i))
        if(descriptor&&!own(descriptor,'value'))throw new Error('Accessor in authored source')
        const entry=descriptor?descriptor.value:null
        if(entry===undefined||typeof entry==='function'||typeof entry==='symbol')output.push(null)
        else output.push(normalize(entry))
      }
    }else{
      const proto=Object.getPrototypeOf(node)
      if(proto!==Object.prototype&&proto!==null)throw new Error('Expected plain authored object')
      output=Object.create(null)
      for(const key of Object.keys(node)){
        const descriptor=Object.getOwnPropertyDescriptor(node,key)
        if(!descriptor||!own(descriptor,'value'))throw new Error('Accessor in authored source')
        const entry=descriptor.value
        if(entry===undefined||typeof entry==='function'||typeof entry==='symbol')continue
        Object.defineProperty(output,key,{value:normalize(entry),enumerable:true,writable:true,configurable:true})
      }
    }
    active.delete(node)
    return output
  }
  if(!record(value))throw new Error('Expected a project object')
  return normalize(value)
}

function equalJSON(left,right){
  if(left===right)return true
  if(!left||!right||typeof left!=='object'||typeof right!=='object')return false
  if(Array.isArray(left)!==Array.isArray(right))return false
  const a=Object.keys(left),b=Object.keys(right)
  return a.length===b.length&&a.every(key=>own(right,key)&&equalJSON(property(left,key),property(right,key)))
}

/** Synchronous content-integrity audit usable in browser and Node; manufacturing authorization always false.
 * Without a trusted expectedProject, matching self-declared hashes establish consistency, not authenticity.
 */
export function auditFactoryPackageManifestBrowser20261024_0053(files,expectedProject){
  const diagnostics=[]
  const reject=(code,message)=>diagnostics.push({code,message})
  const result=()=>({ok:diagnostics.length===0,diagnostics,manufacturingApproved:false})
  try{
    if(!record(files)){
      reject('INVALID_FILES','Expected an archive path to Uint8Array record')
      return result()
    }
    const paths=Object.keys(files)
    if(Object.getOwnPropertySymbols(files).length)reject('UNSAFE_KEYS','Symbol archive keys are unsupported')
    if(paths.length===0||paths.length>MAX_FILES)reject('FILE_COUNT','Archive file count outside supported bounds')
    const bytesByPath=Object.create(null)
    const folded=new Set()
    let total=0
    for(const path of paths){
      if(!canonicalPath(path))reject('UNSAFE_PATH',`Unsafe archive path: ${path}`)
      const lower=path.toLowerCase()
      if(folded.has(lower))reject('DUPLICATE_PATH',`Case-insensitive duplicate path: ${path}`)
      folded.add(lower)
      const bytes=property(files,path)
      if(!(bytes instanceof Uint8Array)||bytes.byteLength<1||bytes.byteLength>MAX_FILE_BYTES){
        reject('FILE_BYTES',`Invalid archive byte payload: ${path}`)
      }else{
        total+=bytes.byteLength
        bytesByPath[path]=bytes
      }
    }
    if(total>MAX_TOTAL_BYTES)reject('TOTAL_BYTES','Archive payload exceeds 40 MiB')
    if(diagnostics.length)return result()
    const readJSON=path=>{
      if(!own(bytesByPath,path)){
        reject('REQUIRED_FILE',`Missing required file: ${path}`)
        return null
      }
      try{
        const parsed=JSON.parse(decoder.decode(bytesByPath[path]))
        if(!record(parsed))throw new Error('Expected object root')
        return parsed
      }catch{
        reject('INVALID_JSON',`Invalid UTF-8 JSON file: ${path}`)
        return null
      }
    }
    const manifest=readJSON('manifest.json')
    const source=readJSON('garment-source.json')
    const run=readJSON('size-run.json')
    const readiness=own(bytesByPath,'manufacturing-release-readiness.json')?readJSON('manufacturing-release-readiness.json'):null
    if(!manifest||!source||!run)return result()
    if(property(manifest,'format')!=='garment-studio-factory-package'||property(manifest,'version')!==2)reject('FORMAT','Unsupported manifest format or version')
    const inventory=property(manifest,'files')
    const sortedPaths=[...paths].sort()
    if(!Array.isArray(inventory)||inventory.length!==paths.length||
      inventory.some((path,index)=>!canonicalPath(path)||path!==sortedPaths[index])){
      reject('INVENTORY','Manifest inventory must equal sorted archive paths exactly')
    }
    const hashes=property(manifest,'sha256')
    if(!record(hashes)||Object.keys(hashes).length!==paths.length-1||own(hashes,'manifest.json')||
      Object.keys(hashes||{}).some(path=>!canonicalPath(path)||path==='manifest.json'||!own(bytesByPath,path))){
      reject('HASH_MAP','Hash map must contain precisely every non-manifest file')
    }
    if(record(hashes))for(const path of paths){
      if(path==='manifest.json')continue
      const claimed=property(hashes,path)
      if(typeof claimed!=='string'||!/^[0-9a-f]{64}$/.test(claimed)||sha256Bytes(bytesByPath[path])!==claimed){
        reject('HASH_MISMATCH',`Invalid file digest: ${path}`)
      }
    }
    const metadata=property(manifest,'project')
    if(!record(metadata)||property(metadata,'id')!==property(source,'id')||
      property(metadata,'name')!==property(source,'name')||property(metadata,'revision')!==property(source,'revision')||
      property(metadata,'units')!==(property(source,'units')||'cm'))reject('PROJECT_METADATA','Manifest project metadata differs from source')
    const grading=property(source,'grading')
    const sizes=property(grading,'sizes')
    const base=property(grading,'baseSize')||'M'
    const declaredGrade=property(manifest,'grading')
    if(!Array.isArray(sizes)||sizes.length===0||sizes.length>64||
      sizes.some(size=>typeof size!=='string'||!size.trim()||size!==size.trim())||
      new Set(sizes.map(size=>size.toLowerCase())).size!==sizes.length||!record(declaredGrade)||
      property(declaredGrade,'baseSize')!==base||!equalJSON(property(declaredGrade,'sizes'),sizes)){
      reject('GRADING_METADATA','Manifest grading differs from source size inventory')
    }else{
      if(!equalJSON(Object.keys(run),sizes))reject('SIZE_RUN','Stored grade size inventory differs from source')
      for(const size of sizes){
        const graded=property(run,size)
        if(!record(graded)||property(graded,'id')!==property(source,'id')||
          property(graded,'name')!==property(source,'name')||
          (property(graded,'revision')!==undefined&&property(graded,'revision')!==property(source,'revision'))||
          (property(graded,'units')!==undefined&&property(graded,'units')!==(property(source,'units')||'cm'))){
          reject('SIZE_RUN',`Graded project identity mismatch: ${size}`)
        }
        const dxf=`patterns/${slug(property(source,'name'))}-${size.toLowerCase()}.dxf`
        if(!own(bytesByPath,dxf))reject('MISSING_GRADED_DXF',`Missing size DXF: ${dxf}`)
      }
    }
    if(expectedProject!==undefined){
      try{
        const expected=safeAuthoredJSON(expectedProject)
        if(!equalJSON(source,expected))reject('EXPECTED_PROJECT','Archived authored project differs from trusted expected project')
      }catch{
        reject('EXPECTED_PROJECT','Trusted expected project cannot be safely serialized as authored JSON')
      }
    }
    if(readiness)for(const key of ['factoryCertified','factoryCuttingAuthorized','bulkProductionAuthorized','manufacturingApproved']){
      if(property(readiness,key)===true)reject('APPROVAL_FLAG',`Release readiness cannot assert ${key}=true`)
    }
  }catch{
    reject('UNSAFE_INPUT','Archive contains inaccessible or unsafe input')
  }
  return result()
}
