import {compileAccuMarkNativeRuleSizeRun} from './accumarkNativePointRuleSet20261023.js'
export function createGradeSidecarCodec(types){

const FORMAT='exo.native.grade-sidecar.v1'
const LIMIT=2*1024*1024-1
const utf8=new TextEncoder()
const own=(v,k)=>Object.prototype.hasOwnProperty.call(v,k)
const plain=v=>v!==null&&typeof v==='object'&&!types.isProxy(v)&&!Array.isArray(v)&&
  (Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null)
const fail=reason=>({ok:false,reason,manufacturingApproved:false})
// Source objects may be supplied by callers rather than JSON.parse. Reading
// snapshot.template/panels directly executes accessor getters before the
// ordinary JSON validator gets a chance to reject them.
function sourceOwnData(owner,key){
  if(!owner||typeof owner!=='object')return undefined
  // A transparent Proxy can execute traps even for descriptor-only reads.
  if(types.isProxy(owner))throw Error('Proxy-backed native source is unsupported')
  const descriptor=Object.getOwnPropertyDescriptor(owner,key)
  if(!descriptor)return undefined
  if(!descriptor.enumerable||!own(descriptor,'value'))
    throw Error(`Non-JSON native source field ${String(key)}`)
  return descriptor.value
}

// JSON cannot represent NaN, Infinity, undefined, BigInt, cycles or custom objects.
// Inspect the source before serialization to avoid their silent removal/conversion.
function validateJson(value,seen=new Set(),depth=0){
  if(depth>64)throw Error('Sidecar nesting exceeds safety limit')
  if(value===null||typeof value==='string'||typeof value==='boolean')return
  if(typeof value==='number'){
    if(!Number.isFinite(value))throw Error('Nonfinite numeric value in sidecar')
    return
  }
  // Check before Array.isArray, getPrototypeOf, ownKeys or property descriptors.
  // A Proxy's reflection traps are executable code, not passive JSON data.
  if(value&&typeof value==='object'&&types.isProxy(value))
    throw Error('Proxy-backed sidecar data is unsupported')
  if(!value||typeof value!=='object'||(!Array.isArray(value)&&!plain(value)))
    throw Error('Sidecar contains a value unsupported by JSON')
  // Array.isArray also accepts subclass instances and arrays with a replaced
  // prototype. Their inherited Symbol.iterator/map/other getters can execute
  // when the compiler or canonical encoder later traverses the value.
  if(Array.isArray(value)&&Object.getPrototypeOf(value)!==Array.prototype)
    throw Error('Nonstandard JSON array prototype is unsupported')
  if(seen.has(value))throw Error('Repeated or cyclic object references in sidecar')
  seen.add(value)
  if(Array.isArray(value)){
    if(value.length>100000)throw Error('Sidecar array exceeds safety bound')
    // JSON.stringify drops named/symbol array properties without warning.
    // Reject them instead of silently losing authored grade constraints.
    for(const key of Reflect.ownKeys(value)){
      if(key==='length')continue
      const index=Number(key)
      if(typeof key!=='string'||!Number.isInteger(index)||index<0||
         index>=value.length||String(index)!==key)
        throw Error('Sidecar array contains unsupported own property')
      const descriptor=Object.getOwnPropertyDescriptor(value,key)
      if(!descriptor?.enumerable||!own(descriptor,'value'))
        throw Error('Sidecar array contains non-JSON property')
    }
    for(let i=0;i<value.length;i++){
      if(!own(value,i))throw Error('Sparse JSON arrays are unsupported')
      validateJson(Object.getOwnPropertyDescriptor(value,String(i)).value,seen,depth+1)
    }
  }else{
    const keys=Reflect.ownKeys(value)
    if(keys.length>100000)throw Error('Sidecar object exceeds safety bound')
    for(const key of keys){
      if(typeof key!=='string')throw Error('Sidecar object contains unsupported symbol key')
      if(['__proto__','prototype','constructor'].includes(key))throw Error('Unsafe JSON object key')
      const descriptor=Object.getOwnPropertyDescriptor(value,key)
      if(!descriptor?.enumerable||!own(descriptor,'value'))
        throw Error('Unsafe or non-JSON sidecar property')
      validateJson(descriptor.value,seen,depth+1)
    }
  }
  seen.delete(value)
}

const keys=(v,expected)=>plain(v)&&Object.keys(v).length===expected.length&&
  Object.keys(v).every(key=>expected.includes(key))
const valueString=v=>typeof v==='string'&&v.length>0&&v.length<=256
// JSON.parse accepts duplicate keys and keeps only the last value. Reject such
// documents before parsing so two authored rules cannot silently collapse.
function rejectDuplicateKeys(json){
  const stack=[]
  let i=0
  const space=()=>{while(i<json.length&&/\s/.test(json[i]))i++}
  const parseString=()=>{
    const start=i++
    while(i<json.length){
      if(json[i]==='"'){i++;return JSON.parse(json.slice(start,i))}
      if(json[i]==='\\'){i+=2;continue}
      i++
    }
    throw Error('Unterminated JSON string')
  }
  const value=()=>{
    space()
    if(json[i]==='{'){
      i++;stack.push(new Set());space()
      if(json[i]==='}')i++
      else while(true){
        space();if(json[i]!=='"')throw Error('Invalid JSON object key')
        const key=parseString(),seen=stack[stack.length-1]
        if(seen.has(key))throw Error('Duplicate JSON object key: '+key)
        seen.add(key);space();if(json[i++]!==':')throw Error('Invalid JSON object separator')
        value();space();const next=json[i++]
        if(next==='}')break
        if(next!==',')throw Error('Invalid JSON object syntax')
      }
      stack.pop();return
    }
    if(json[i]==='['){
      i++;space();if(json[i]===']'){i++;return}
      while(true){
        value();space();const next=json[i++]
        if(next===']')return
        if(next!==',')throw Error('Invalid JSON array syntax')
      }
    }
    if(json[i]==='"'){parseString();return}
    const match=/^(?:-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/.exec(json.slice(i))
    if(!match)throw Error('Invalid JSON value')
    i+=match[0].length
  }
  value();space()
  if(i!==json.length)throw Error('Trailing JSON content')
}
function canonical(value){
  if(Array.isArray(value))return value.map(canonical)
  if(!plain(value))return value
  const out=Object.create(null)
  for(const key of Object.keys(value).sort())out[key]=canonical(value[key])
  return out
}
function hash(text){
  // Two independent FNV streams provide an accidental corruption check.
  let a=2166136261,b=2166136261^0x9e3779b9
  const bytes=utf8.encode(text)
  for(const v of bytes){a=Math.imul(a^v,16777619);b=Math.imul(b^v,16777619)}
  return `fnv32x2:${(a>>>0).toString(16).padStart(8,'0')}${(b>>>0).toString(16).padStart(8,'0')}:${bytes.length}`
}
// Bind only authored manufacturing inputs outside panels. Snapshot revision,
// camera and UI state are intentionally excluded: changing those must not
// invalidate a valid grading sidecar. Read descriptors before values so
// accessor/hidden declarations cannot be silently omitted or executed.
function manufacturingMetadata(owner,fields,context){
  if(!owner||typeof owner!=='object'||types.isProxy(owner))
    throw Error(`Invalid native ${context}`)
  const result=Object.create(null)
  for(const field of fields){
    if(!own(owner,field)){
      if(field in owner)throw Error(`Inherited native ${context} ${field}`)
      continue
    }
    const descriptor=Object.getOwnPropertyDescriptor(owner,field)
    if(!descriptor?.enumerable||!own(descriptor,'value'))
      throw Error(`Non-JSON native ${context} ${field}`)
    validateJson(descriptor.value)
    result[field]=descriptor.value
  }
  return result
}
function sourceSignature(snapshot){
  const template=sourceOwnData(snapshot,'template')
  const panels=sourceOwnData(template,'panels')
  if(types.isProxy(panels)||!Array.isArray(panels)||panels.length<1||panels.length>256)
    throw Error('Invalid native source panels')
  // The panel collection is authored source too. JSON silently discards named,
  // symbol, hidden and accessor properties attached to arrays; validating only
  // each panel would allow such declarations to disappear from provenance.
  validateJson(panels)
  // Native GarmentTemplate carries a format discriminator and schema version.
  // A changed declaration can change the meaning of authored construction
  // fields even if panel coordinates are byte-identical. The native Rust
  // GarmentTemplate also requires `name`: bind the authored garment identity
  // so a sidecar for a renamed/reidentified project cannot silently attach
  // to another release with identical geometry.
  const templateMetadata=manufacturingMetadata(template,
    ['format','version','name','seams','fabrics','fabricId','productionSpec'],'template manufacturing field')
  if(own(templateMetadata,'name')&&typeof templateMetadata.name!=='string')
    throw Error('Invalid native garment template name')
  const snapshotMetadata=manufacturingMetadata(snapshot,
    ['fabricSettings','productionSpec'],'snapshot manufacturing field')
  const ids=new Set()
  const data=[]
  const fingerprintedPolygonFields=new Set([
    'points','edges','curves','free_curve_points','holes','lines',
  ])
  for(const panel of panels){
    // A panel may carry authored manufacturing metadata outside its polygon
    // (fabric, cut count, grain/fold instructions). Do not let such changes
    // reuse a sidecar bound only to the polygon. Validate before reading so
    // hidden/accessor/non-JSON panel properties cannot disappear in the hash.
    validateJson(panel)
    const id=sourceOwnData(panel,'id')
    if(!valueString(id)||ids.has(id))throw Error('Duplicate or invalid native source panel')
    ids.add(id)
    const poly=sourceOwnData(panel,'polygon')
    if(!plain(poly))throw Error('Invalid source polygon')
    // Explicit malformed optional fields must not collapse to the same digest
    // as absent fields through the fallback values below.
    for(const key of ['curves','free_curve_points'])
      if(own(poly,key)&&!plain(poly[key]))
        throw Error(`Malformed native source ${key}`)
    for(const key of ['holes','lines'])
      if(own(poly,key)&&!Array.isArray(poly[key]))
        throw Error(`Malformed native source ${key}`)
    // The native grade compiler clones the whole polygon, not only its points.
    // Bind authored extra polygon metadata (e.g. notches, grainline and cutline)
    // so an edited source cannot reuse an old sidecar with stale construction.
    // Keep the legacy digest unchanged for polygons with no extra fields.
    validateJson(poly)
    const entry={id,points:sourceOwnData(poly,'points'),edges:sourceOwnData(poly,'edges'),
      curves:sourceOwnData(poly,'curves')||{},
      free_curve_points:sourceOwnData(poly,'free_curve_points')||{},
      holes:sourceOwnData(poly,'holes')||[],lines:sourceOwnData(poly,'lines')||[]}
    const extras=Object.keys(poly).filter(key=>!fingerprintedPolygonFields.has(key))
    if(extras.length){
      entry.polygonExtras=Object.create(null)
      for(const key of extras)entry.polygonExtras[key]=poly[key]
    }
    // Preserve legacy digests for panels containing only id and polygon.
    const panelExtras=Object.keys(panel).filter(key=>key!=='id'&&key!=='polygon')
    if(panelExtras.length){
      entry.panelExtras=Object.create(null)
      for(const key of panelExtras)entry.panelExtras[key]=panel[key]
    }
    data.push(entry)
  }
  validateJson(data)
  // Metadata-free snapshots retain their v1 source digest. If manufacturing
  // metadata is declared, bind it alongside the panel source to fail closed
  // after material, seam or production specification edits.
  const hasMetadata=Object.keys(templateMetadata).length||Object.keys(snapshotMetadata).length
  const source=hasMetadata?{panels:data,templateMetadata,snapshotMetadata}:data
  const digest=hash(JSON.stringify(canonical(source)))
  return {digest,panelIds:[...ids].sort()}
}
function verify(snapshot,ruleSet){
  validateJson(ruleSet)
  if(!keys(ruleSet,['schema','templateFingerprint','sizes','baseSize','panels','source'])||
     !valueString(ruleSet.templateFingerprint)||!valueString(ruleSet.source))
    throw Error('Invalid grade rule envelope or provenance')
  if(!Array.isArray(ruleSet.sizes)||new Set(ruleSet.sizes).size!==ruleSet.sizes.length)
    throw Error('Duplicate or malformed named sizes')
  const source=sourceSignature(snapshot)
  if(!plain(ruleSet.panels)||Object.keys(ruleSet.panels).length!==source.panelIds.length||
     source.panelIds.some(id=>!own(ruleSet.panels,id)))
    throw Error('Missing or duplicate native grade panel')
  for(const id of source.panelIds){
    const item=ruleSet.panels[id]
    if(!keys(item,['sourcePointCount','pointOffsetsMm'])||!plain(item.pointOffsetsMm)||
       Object.keys(item.pointOffsetsMm).length!==ruleSet.sizes.length||
       ruleSet.sizes.some(size=>!own(item.pointOffsetsMm,size)))
      throw Error(`Malformed per-size native rule table for ${id}`)
  }
  // Compile every size, even though the upstream compiler currently creates an
  // entire size run in each call. This is intentional independent verification.
  for(const size of ruleSet.sizes){
    const result=compileAccuMarkNativeRuleSizeRun(snapshot,ruleSet,{selectedSize:size})
    if(!result.ok)throw Error(`Native rule validation failed for ${size}: ${result.reason}`)
    for(const id of source.panelIds){
      const entry=result.byPanel?.[id]
      if(!entry?.ok||!entry.sizeRun?.[size]?.polygon)
        throw Error(`Compiled rule missing panel ${id} size ${size}`)
    }
  }
  return source
}

/** Lossless JSON sidecar for independent per-point, per-size native grade rules. */
function encodeAccuMarkNativeGradeSidecar20261023(snapshot,ruleSet){
  try{
    const source=verify(snapshot,ruleSet)
    const payload={format:FORMAT,version:1,sourceDigest:source.digest,
      ruleSet:canonical(ruleSet),manufacturingApproved:false}
    const body=JSON.stringify(payload)
    const serialized=JSON.stringify({...payload,integrity:hash(body)})
    if(utf8.encode(serialized).length>LIMIT)throw Error('Native grade sidecar exceeds 2 MiB bound')
    return {ok:true,json:serialized,byteLength:utf8.encode(serialized).length,
      version:1,sourceDigest:source.digest,manufacturingApproved:false}
  }catch(error){return fail(error.message)}
}

/** Parse, validate source geometry/provenance, and recompile every named size. */
function decodeAccuMarkNativeGradeSidecar20261023(snapshot,json){
  try{
    if(typeof json!=='string'||utf8.encode(json).length>LIMIT)
      throw Error('Sidecar must be a JSON string smaller than 2 MiB')
    rejectDuplicateKeys(json)
    const data=JSON.parse(json)
    if(!keys(data,['format','version','sourceDigest','ruleSet','manufacturingApproved','integrity'])||
       data.format!==FORMAT||data.version!==1||data.manufacturingApproved!==false||
       !valueString(data.sourceDigest)||!valueString(data.integrity))
      throw Error('Invalid or unsupported native grade sidecar version')
    validateJson(data)
    const content={format:data.format,version:data.version,sourceDigest:data.sourceDigest,
      ruleSet:data.ruleSet,manufacturingApproved:false}
    if(hash(JSON.stringify(content))!==data.integrity)
      throw Error('Native grade sidecar integrity mismatch')
    const source=verify(snapshot,data.ruleSet)
    if(source.digest!==data.sourceDigest)throw Error('Native source geometry or curve has changed')
    // Re-encode to canonical order; imported ordering must never become trusted.
    const reencoded=encodeAccuMarkNativeGradeSidecar20261023(snapshot,data.ruleSet)
    if(!reencoded.ok)throw Error(reencoded.reason)
    return {ok:true,ruleSet:JSON.parse(JSON.stringify(data.ruleSet)),version:1,
      sourceDigest:source.digest,canonicalJson:reencoded.json,manufacturingApproved:false}
  }catch(error){return fail(error.message)}
}

return {encodeAccuMarkNativeGradeSidecar20261023,decodeAccuMarkNativeGradeSidecar20261023}
}
