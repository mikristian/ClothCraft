import {unzipSync, strFromU8, strToU8} from 'fflate'
import {parseSeamlyAamaManufacturingSemantics} from './seamlyAamaManufacturingSemantics20261023.mjs'

const MAX_ZIP = 20 * 1024 * 1024
const MAX_FILE = 5 * 1024 * 1024
const MAX_ENTRIES = 16
const digest = async (bytes, subtle) => Array.from(new Uint8Array(await subtle.digest('SHA-256', bytes))).map(x => x.toString(16).padStart(2, '0')).join('')
const fail = (code, detail) => { const e = new Error(detail); e.code = code; throw e }
const safeName = n => typeof n === 'string' && n.length <= 180 && !n.includes('\\') && !n.startsWith('/') && !n.includes('//') && n.split('/').every(s => s && s !== '.' && s !== '..') && !/^[a-z]:/i.test(n)
const hex = x => typeof x === 'string' && /^[0-9a-f]{64}$/i.test(x)
// Normalize only canonical graded size identities; a Map may use 48 or '48',
// but must never silently drop one or allow two representations of one size.
function normalizeReceiverSizes(receiverDxfs, expectedSizes) {
  const expected = new Set(expectedSizes.map(String)), normalized = new Map()
  const insert = (key, wire) => {
    const name = typeof key === 'number' && Number.isSafeInteger(key) ? String(key) : key
    if (typeof name !== 'string' || !/^[1-9][0-9]*$/.test(name) || !expected.has(name))
      fail('RECEIVER_INPUT', 'Unknown or noncanonical receiver size')
    if (normalized.has(name)) fail('RECEIVER_DUPLICATE', `Repeated receiver size ${name}`)
    if (typeof wire !== 'string' || wire.length > 4 * 1024 * 1024)
      fail('RECEIVER_INPUT', `Missing or oversized DXF for size ${name}`)
    normalized.set(name, wire)
  }
  if (receiverDxfs instanceof Map) {
    for (const [key, wire] of Map.prototype.entries.call(receiverDxfs)) insert(key, wire)
  } else {
    if (!receiverDxfs || Object.getPrototypeOf(receiverDxfs) !== Object.prototype)
      fail('RECEIVER_INPUT', 'Receiver sizes require a plain object or Map')
    for (const key of Reflect.ownKeys(receiverDxfs)) {
      const descriptor = Object.getOwnPropertyDescriptor(receiverDxfs, key)
      if (!descriptor || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable)
        fail('RECEIVER_INPUT', 'Receiver sizes require enumerable data properties')
      insert(key, descriptor.value)
    }
  }
  if (normalized.size !== expected.size) fail('RECEIVER_MISSING', 'Receiver omitted one or more graded source sizes')
  return normalized
}
const near = (a,b,t) => Math.hypot(a.x-b.x,a.y-b.y) <= t
function safeManifestCopy(value,seen=new Set(),budget={count:0},depth=0){
  if(value===null || typeof value==='string' || typeof value==='boolean' || typeof value==='number')return value
  if(typeof value!=='object'||depth>16||seen.has(value)||++budget.count>12000)fail('MANIFEST','Unsafe manifest structure')
  const array=Array.isArray(value),proto=Object.getPrototypeOf(value)
  if(!array && proto!==Object.prototype && proto!==null)fail('MANIFEST','Unsupported manifest object')
  seen.add(value)
  const out=array?[]:Object.create(null),descriptors=Object.getOwnPropertyDescriptors(value)
  for(const key of Reflect.ownKeys(descriptors)){
    if(typeof key==='symbol'||key==='__proto__'||key==='constructor'||key==='prototype')fail('MANIFEST','Unsafe manifest key')
    if(array&&key==='length')continue
    const d=descriptors[key]
    if(!Object.hasOwn(d,'value') || !d.enumerable || array && (!/^(0|[1-9]\d*)$/.test(key)||Number(key)>=value.length))fail('MANIFEST','Hidden or accessor manifest value')
    out[key]=safeManifestCopy(d.value,seen,budget,depth+1)
  }
  if(array && Object.keys(out).length!==value.length)fail('MANIFEST','Sparse manifest array')
  seen.delete(value)
  return out
}

// Read central directory independently before handing any archive to the inflate library.
function zipDirectory(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 22 || bytes.length > MAX_ZIP) fail('ZIP_ENVELOPE', 'Invalid or oversized ZIP')
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let end = -1
  for (let i = bytes.length - 22; i >= Math.max(0,bytes.length - 65557); i--) if (v.getUint32(i,true) === 0x06054b50 && i + 22 + v.getUint16(i+20,true) === bytes.length) {end=i;break}
  if (end < 0) fail('ZIP_DIRECTORY', 'Missing terminal central directory')
  const entries = v.getUint16(end+10,true), total = v.getUint16(end+8,true)
  if (!entries || entries !== total || entries > MAX_ENTRIES || v.getUint16(end+4,true) || v.getUint16(end+6,true)) fail('ZIP_DIRECTORY', 'Unsupported ZIP disks or entry count')
  const dirBytes=v.getUint32(end+12,true), offset=v.getUint32(end+16,true)
  if (offset+dirBytes !== end) fail('ZIP_DIRECTORY', 'Invalid directory span')
  let pos=offset, inflated=0
  const decoder=new TextDecoder('utf-8',{fatal:true}), names=new Set(), listing=[]
  for(let i=0;i<entries;i++){
    if(pos+46>end || v.getUint32(pos,true)!==0x02014b50) fail('ZIP_DIRECTORY','Malformed central entry')
    const flags=v.getUint16(pos+8,true), method=v.getUint16(pos+10,true), compressed=v.getUint32(pos+20,true), plain=v.getUint32(pos+24,true)
    const nameLen=v.getUint16(pos+28,true), extra=v.getUint16(pos+30,true), comment=v.getUint16(pos+32,true), local=v.getUint32(pos+42,true)
    if(pos+46+nameLen+extra+comment>end || !nameLen || flags&1 || !(method===0||method===8) || compressed>MAX_FILE || plain>MAX_FILE) fail('ZIP_ENTRY','Unsupported entry or size')
    let name
    try {name=decoder.decode(bytes.subarray(pos+46,pos+46+nameLen))} catch {fail('ZIP_PATH','Invalid filename encoding')}
    if(!safeName(name) || names.has(name) || name.endsWith('/')) fail('ZIP_PATH','Unsafe or duplicate ZIP path')
    names.add(name);inflated+=plain
    if(inflated>MAX_ZIP || local+30>offset || v.getUint32(local,true)!==0x04034b50) fail('ZIP_ENTRY','Invalid local header or inflation budget')
    const localLen=v.getUint16(local+26,true), localExtra=v.getUint16(local+28,true)
    if(local+30+localLen+localExtra+compressed>offset || decoder.decode(bytes.subarray(local+30,local+30+localLen))!==name || v.getUint16(local+8,true)!==method) fail('ZIP_ENTRY','Local entry mismatch or truncation')
    listing.push({name,bytes:plain});pos+=46+nameLen+extra+comment
  }
  if(pos!==end) fail('ZIP_DIRECTORY','Unexpected central directory remainder')
  return listing
}

const comparePath = (a,b,t,closed) => {
  if(a.closed!==b.closed || a.points.length!==b.points.length) return false
  const p=a.points,q=b.points,n=p.length
  if(!closed) return p.every((x,i)=>near(x,q[i],t)) || p.every((x,i)=>near(x,q[n-1-i],t))
  for(let start=0;start<n;start++) for(const direction of [1,-1]){
    let good=true
    for(let i=0;i<n;i++) if(!near(p[i],q[(start+direction*i+n*2)%n],t)){good=false;break}
    if(good)return true
  }
  return false
}
const piecesEqual=(a,b,t)=>{
  const roles=['cutOutlineMm','sewingContourMm','grainline']
  for(const role of roles) if(Boolean(a[role])!==Boolean(b[role]) || a[role] && !comparePath(a[role],b[role],t,a[role].closed))return {ok:false,role}
  for(const role of ['notches','internalCuts','drawPaths']){
    if(a[role].length!==b[role].length)return {ok:false,role}
    const remaining=[...b[role]]
    for(const path of a[role]) {const idx=remaining.findIndex(other=>comparePath(path,other,t,path.closed));if(idx<0)return {ok:false,role};remaining.splice(idx,1)}
  }
  return {ok:true}
}
const compareSizes=(source,receiver,t)=>{
  if(source.pieces.length!==receiver.pieces.length || source.pieces.length>64)return {ok:false,reason:'piece count'}
  const bounded=p=>[p.cutOutlineMm,p.sewingContourMm,p.grainline,...p.notches,...p.internalCuts,...p.drawPaths].filter(Boolean).every(g=>g.points.length<=2048)
  if(!source.pieces.every(bounded)||!receiver.pieces.every(bounded))return {ok:false,reason:'comparison vertex budget'}
  // INSERT index is source identity; duplicate names cannot silently exchange geometry.
  for(let i=0;i<source.pieces.length;i++){
    const a=source.pieces[i], b=receiver.pieces[i]
    if(a.name!==b.name)return {ok:false,reason:'piece identity/order',pieceIndex:i}
    const r=piecesEqual(a,b,t)
    if(!r.ok)return {ok:false,reason:r.role,pieceIndex:i}
  }
  return {ok:true}
}

/**
 * Source byte and DXF geometry comparison audit. receiverDxfs is keyed by sizeCm.
 * This input is caller-supplied and does not authenticate its receiving software.
 * A successful comparison must NEVER become independent receiving-CAD evidence.
 */
export async function auditAccuMarkCadInterchangeReceiving20261024(input, {
  receiverDxfs=null,toleranceMm=0.02,subtle=globalThis.crypto?.subtle
}={}) {
  const report={schema:'exo.accumark.receiver-interchange-qa.v1',scope:'local-source-and-geometry-only',ok:false,manufacturingApproved:false,factoryApproved:false,cuttingAuthorized:false,receivingCadApproved:false,receivingCadVerified:false,receiverGeometryCompared:false,
    bytesVerified:false,sourcePreserved:false,sizes:[],issues:[],representationLosses:[],
    restrictions:['External Gerber AccuMark import is unverified','Layer 8 DRAW does not establish a production sewline','Physical plotting, grading rules, seam allowances and sample approval are unverified']}
  const issue=(code,detail)=>report.issues.push({code,detail:String(detail).slice(0,220)})
  try {
    if(!subtle || typeof subtle.digest!=='function')fail('HASH_SUPPORT','SHA-256 unavailable')
    let files,manifest
    if(input instanceof Uint8Array || input instanceof ArrayBuffer){
      const bytes=input instanceof Uint8Array?input:new Uint8Array(input),directory=zipDirectory(bytes)
      files=unzipSync(bytes)
      if(Object.keys(files).length!==directory.length)fail('ZIP_ENTRY','ZIP extraction entry mismatch')
      for(const entry of directory)if(!files[entry.name] || files[entry.name].length!==entry.bytes)fail('ZIP_ENTRY','Uncompressed entry size mismatch')
      if(!files['manifest.json'] || files['manifest.json'].length>100000)fail('MANIFEST','Manifest missing or excessive')
      manifest=JSON.parse(strFromU8(files['manifest.json']))
    } else if(input && Object.getPrototypeOf(input)===Object.prototype && Object.hasOwn(Object.getOwnPropertyDescriptors(input).manifest??{},'value') && Object.hasOwn(Object.getOwnPropertyDescriptors(input).files??{},'value')) {
      // In-memory export input: bytes are still independently hashed.
      const inputDescriptors=Object.getOwnPropertyDescriptors(input)
      manifest=safeManifestCopy(inputDescriptors.manifest.value);files=Object.create(null)
      if(!inputDescriptors.files.value || Object.getPrototypeOf(inputDescriptors.files.value)!==Object.prototype)fail('FILE_SET','Unsafe file container')
      const descriptors=Object.getOwnPropertyDescriptors(inputDescriptors.files.value)
      if(Object.keys(descriptors).length>MAX_ENTRIES)fail('FILE_SET','Too many files')
      for(const [name,d] of Object.entries(descriptors)){if(!safeName(name)||!Object.hasOwn(d,'value')||!(d.value instanceof Uint8Array) && typeof d.value!=='string')fail('FILE_SET','Unsafe file entry');files[name]=typeof d.value==='string'?strToU8(d.value):d.value}
    } else fail('INPUT','Expected ZIP bytes or safe export files')
    if(manifest?.schema!=='exo.seamly.receiver-cad-exchange.v1' || manifest.manufacturingApproved!==false || !['mm','cm','inch'].includes(manifest.sourceUnit) || manifest.sizeUnit!=='cm' || !hex(manifest.upstreamSourceSha256) || !hex(manifest.upstreamMeasurementsSha256) || !Array.isArray(manifest.sizes) || manifest.sizes.length<2 || manifest.sizes.length>6) fail('MANIFEST','Untrusted interchange manifest')
    if(!Number.isFinite(toleranceMm)||toleranceMm<0||toleranceMm>0.1)fail('TOLERANCE','Invalid receiver tolerance')
    const declared=new Set(), required=new Set(['manifest.json','qa/scale-100mm.dxf','qa/receiver-acceptance-worksheet.json','qa/README.txt'])
    for(const entry of manifest.sizes){
      const {sizeCm,filename,sha256,bytes}=entry
      if(!Number.isInteger(sizeCm)||sizeCm<1||sizeCm>300||declared.has(sizeCm)||filename!==`graded-aama/seamly-size-${sizeCm}.dxf`||!hex(sha256)||!Number.isSafeInteger(bytes)||bytes<200||bytes>MAX_FILE)fail('SIZE_PROVENANCE','Invalid or repeated size provenance')
      declared.add(sizeCm);required.add(filename)
    }
    if(Object.keys(files).length!==required.size || [...required].some(name=>!Object.hasOwn(files,name)))fail('FILE_SET','Missing, unknown or duplicate packet entry')
    const worksheet=JSON.parse(strFromU8(files['qa/receiver-acceptance-worksheet.json']))
    const approvalClaims=['originalSizeDxfsImportedSuccessfully','unitScaleConfirmedBy100MmPrint',
      'grainlinesAndNotchesVerified','cutVersusDrawLayerMappingVerified',
      'sewlineAndSeamAllowancesPhysicallyConfirmed','independentGradingRuleComparisonPassed',
      'materialAndCutQuantityConfirmed','samplePatternMakerApproved',
      'fitAndConstructionSampleApproved','productionReleaseAuthorized']
    if(approvalClaims.some(k=>worksheet[k]!==false))
      fail('APPROVAL','Source-only evaluation packet cannot contain preapproved receiving/physical/sampling claims')
    const receiverBySize=receiverDxfs===null?null:normalizeReceiverSizes(receiverDxfs,manifest.sizes.map(x=>x.sizeCm))
    const calibration=strFromU8(files['qa/scale-100mm.dxf'])
    const coords=calibration.match(/\n\s*11\s*\n\s*([\d.]+)\s*\n\s*21\s*\n\s*0\s*\n/)
    if(!coords || Math.abs(Number(coords[1])*({mm:1,cm:10,inch:25.4}[manifest.sourceUnit])-100)>0.0001)fail('CALIBRATION','100mm source-unit calibration mismatched')
    for(const entry of manifest.sizes){
      const bytes=files[entry.filename],row={sizeCm:entry.sizeCm,filename:entry.filename,sha256:entry.sha256,hashVerified:false,geometryParsed:false,receiverCompared:false,cutPieces:0,notches:0,grainlines:0,internalCuts:0,representationLosses:[]}
      report.sizes.push(row)
      if(bytes.length!==entry.bytes || await digest(bytes,subtle)!==entry.sha256.toLowerCase()){issue('BYTE_HASH_MISMATCH',entry.filename);continue}
      row.hashVerified=true
      try{
        const parsed=parseSeamlyAamaManufacturingSemantics(strFromU8(bytes),{unit:manifest.sourceUnit,filename:entry.filename})
        if(parsed.pieces.length!==entry.localGeometryAudit?.sourceCutPieces)fail('SOURCE_INVENTORY','Piece count disagrees with original inspection')
        row.geometryParsed=true;row.cutPieces=parsed.pieces.length
        row.notches=parsed.pieces.reduce((n,p)=>n+p.notches.length,0)
        row.grainlines=parsed.pieces.filter(p=>p.grainline).length
        row.internalCuts=parsed.pieces.reduce((n,p)=>n+p.internalCuts.length,0)
        if(row.notches!==entry.localGeometryAudit.notchCount || row.grainlines!==entry.localGeometryAudit.grainlineCount || row.internalCuts!==entry.localGeometryAudit.internalCutCount)fail('SOURCE_INVENTORY','Physical marking inventory changed')
        row.representationLosses.push('DXF does not encode independently verified grade-rule correspondence or sewn seam allowance')
        if(receiverBySize!==null){
          const wire=receiverBySize.get(String(entry.sizeCm))
          const imported=parseSeamlyAamaManufacturingSemantics(wire,{unit:manifest.sourceUnit})
          const cmp=compareSizes(parsed,imported,toleranceMm)
          if(!cmp.ok)fail('GEOMETRY_LOSS',JSON.stringify(cmp))
          row.receiverCompared=true
        }
      }catch(e){issue(e.code||'DXF_PARSE_OR_COMPARE',`${entry.sizeCm}: ${e.message}`)}
    }
    report.bytesVerified=report.sizes.every(s=>s.hashVerified)
    report.sourcePreserved=report.bytesVerified&&report.sizes.every(s=>s.geometryParsed)
    // Comparing two caller-supplied wires is local geometry QA, even if identical.
    // Licensed external import/re-export needs separately authenticated evidence.
    report.receiverGeometryCompared=receiverDxfs!==null&&report.sizes.every(s=>s.receiverCompared)
    report.ok=report.issues.length===0 && report.sourcePreserved && (receiverDxfs===null || report.receiverGeometryCompared)
    report.representationLosses=['No independently verified grading rule objects in AAMA geometry','DRAW contours are not certified stitch topology','No proof of receiving Gerber implementation, physical plot or production authorization']
  }catch(e){issue(e.code||'INVALID_PACKET',e.message)}
  return report
}
