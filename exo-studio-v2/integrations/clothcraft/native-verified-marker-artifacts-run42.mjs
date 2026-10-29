import fs from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {markerToPdf,markerToSvg} from '../../src/core/markerArtifacts.js'
import {inspectNativeVerifiedProductionSourceRun37,createNativeVerifiedProductionOrderRun37} from './native-verified-production-order-run37.mjs'

const fail=code=>{throw Error(code)}
const sha=bytes=>createHash('sha256').update(bytes).digest('hex')
const safePart=s=>typeof s==='string'&&/^[a-zA-Z0-9_-]{1,64}$/.test(s)
const safeHash=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s)
// Length-prefix the size so hyphens inside size/fabric identifiers cannot
// alias distinct physical marker groups (e.g. A-B/C versus A/B-C).
export function nativeVerifiedMarkerArtifactBasenameRun42(size,fabricId){
  if(!safePart(size)||!safePart(fabricId))fail('INVALID_MARKER_ARTIFACT_IDENTITY')
  return `${size.length}_${size}-${fabricId}`
}
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&
  Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key))

// Every publish is written to a fresh content-addressed directory using exclusive
// create. Existing artifacts are verified and never replaced by another request.
export async function publishNativeVerifiedMarkerArtifactsRun42(workspace,input,directory){
  const verified=await createNativeVerifiedProductionOrderRun37(workspace,input)
  const sizes=Object.keys(verified.orderQuantities)
  if(!safeHash(verified.sourceFingerprint)||!safeHash(verified.nativeCutlineFingerprint)||
    !Number.isSafeInteger(verified.sourceRevision)||verified.sourceRevision<0||
    !Array.isArray(verified.results)||verified.results.length!==sizes.length||
    new Set(verified.results.map(row=>row.size)).size!==sizes.length)
    fail('INVALID_VERIFIED_MARKER_RESULT')
  const declarations=verified.cuttingMaterialDeclarations
  const expectedBySize=verified.orderQuantities
  const artifacts=[]
  const buffers=new Map()
  for(const row of verified.results){
    if(!safePart(row.size)||!Object.hasOwn(expectedBySize,row.size)||
      row.sourceFingerprint!==verified.sourceFingerprint||row.cuttingAuthorized!==false||
      !Array.isArray(row.markers))fail('INVALID_VERIFIED_MARKER_ROW')
    const actual=new Map()
    const observedFabrics=new Set()
    for(const {fabricId,marker} of row.markers){
      if(!safePart(fabricId)||observedFabrics.has(fabricId)||marker?.ok!==true||
        marker.manufacturingApproved!==false||!Array.isArray(marker.placements)||
        marker.unplaced?.length!==0||!Number.isFinite(marker.metrics?.fabricWidth)||
        marker.metrics.fabricWidth<=0||!Number.isFinite(marker.metrics?.length)||
        marker.metrics.length<=0)fail('INCOMPLETE_VERIFIED_MARKER')
      observedFabrics.add(fabricId)
      const seen=new Set()
      for(const piece of marker.placements){
        const key=JSON.stringify([piece.pieceId,piece.instance])
        if(seen.has(key)||!safePart(piece.pieceId)||!Number.isSafeInteger(piece.instance)||
          !Object.hasOwn(expectedBySize[row.size],piece.pieceId)||
          piece.instance<0||piece.instance>=expectedBySize[row.size][piece.pieceId]||
          declarations[piece.pieceId]?.fabricId!==fabricId||
          !Array.isArray(piece.outline)||piece.outline.length<3||
          piece.outline.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))
          fail('MARKER_ARTIFACT_QUANTITY_OR_GEOMETRY_MISMATCH')
        seen.add(key)
        actual.set(key,(actual.get(key)||0)+1)
      }
      const plot={...marker,width:marker.metrics.fabricWidth,length:marker.metrics.length,
        fabricId,unusedPieces:0}
      const basename=nativeVerifiedMarkerArtifactBasenameRun42(row.size,fabricId)
      for(const [format,bytes] of [
        ['svg',Buffer.from(markerToSvg(plot,{size:row.size,fabricName:fabricId}))],
        ['pdf',Buffer.from(markerToPdf(plot,{size:row.size,calibration:true}))],
      ]){
        const name=`${basename}.${format}`
        if(buffers.has(name)||!bytes.length)fail('DUPLICATE_OR_EMPTY_MARKER_ARTIFACT')
        buffers.set(name,bytes)
        artifacts.push({name,size:row.size,fabricId,format,bytes:bytes.length,sha256:sha(bytes),
          placedPieces:marker.placements.length})
      }
    }
    for(const [panelId,quantity] of Object.entries(expectedBySize[row.size])){
      if(!safePart(panelId)||!Number.isSafeInteger(quantity)||quantity<1||quantity>99)
        fail('INVALID_ORDER_MANIFEST_QUANTITY')
      for(let i=0;i<quantity;i++){
        const key=JSON.stringify([panelId,i])
        if(actual.get(key)!==1)fail('INCOMPLETE_VERIFIED_ORDER_QUANTITIES')
        actual.delete(key)
      }
    }
    if(actual.size)fail('UNEXPECTED_VERIFIED_ORDER_QUANTITIES')
  }
  if(!artifacts.length||artifacts.length%2!==0)fail('NO_VERIFIED_MARKER_ARTIFACTS')
  const finalSource=await inspectNativeVerifiedProductionSourceRun37(workspace)
  if(finalSource.revision!==verified.sourceRevision||
    finalSource.sourceFingerprint!==verified.sourceFingerprint||
    finalSource.nativeCutlineFingerprint!==verified.nativeCutlineFingerprint)
    fail('STALE_NATIVE_SOURCE_BEFORE_ARTIFACT_PUBLICATION')
  const manifest={schema:'exo-native-verified-marker-artifacts.v1',
    sourceRevision:verified.sourceRevision,sourceFingerprint:verified.sourceFingerprint,
    nativeCutlineFingerprint:verified.nativeCutlineFingerprint,
    orderQuantities:verified.orderQuantities,
    cuttingMaterialDeclarations:verified.cuttingMaterialDeclarations,
    artifacts,operatorApproved:false,factoryApproved:false,cuttingAuthorized:false}
  const manifestBytes=Buffer.from(JSON.stringify(manifest,null,2)+'\n')
  const manifestSha256=sha(manifestBytes)
  const id=manifestSha256
  if(typeof directory!=='string'||!path.isAbsolute(directory))fail('INVALID_ARTIFACT_OUTPUT_DIRECTORY')
  const root=path.join(directory,'native-verified-marker-artifacts')
  fs.mkdirSync(root,{recursive:true,mode:0o700})
  const destination=path.join(root,id)
  try{
    fs.mkdirSync(destination,{mode:0o700})
  }catch(error){
    if(error.code!=='EEXIST')throw error
    const files=[...buffers,['manifest.json',manifestBytes]]
    const listed=fs.readdirSync(destination).sort()
    if(JSON.stringify(listed)!==JSON.stringify(files.map(([name])=>name).sort()))
      fail('IMMUTABLE_ARTIFACT_COLLISION')
    for(const [name,bytes] of files){
      let onDisk
      try{onDisk=fs.readFileSync(path.join(destination,name))}
      catch{fail('IMMUTABLE_ARTIFACT_COLLISION')}
      if(!onDisk.equals(bytes))fail('IMMUTABLE_ARTIFACT_COLLISION')
    }
    return {id,manifestSha256,manifest,files:artifacts.map(a=>a.name).concat('manifest.json'),
      factoryApproved:false,cuttingAuthorized:false}
  }
  try{
    for(const [name,bytes] of buffers)fs.writeFileSync(path.join(destination,name),bytes,{flag:'wx',mode:0o600})
    fs.writeFileSync(path.join(destination,'manifest.json'),manifestBytes,{flag:'wx',mode:0o600})
    fs.chmodSync(destination,0o500)
  }catch(error){
    // A partial directory is retained for diagnosis and cannot be overwritten.
    throw error
  }
  return {id,manifestSha256,manifest,files:artifacts.map(a=>a.name).concat('manifest.json'),
    factoryApproved:false,cuttingAuthorized:false}
}

export function readNativeVerifiedMarkerArtifactRun42(directory,id,name){
  if(!safeHash(id)||
    !/^(?:[a-zA-Z0-9_-]{1,64}-[a-zA-Z0-9_-]{1,64}\.(?:svg|pdf)|(?:[1-9]|[1-5][0-9]|6[0-4])_[a-zA-Z0-9_-]{1,64}-[a-zA-Z0-9_-]{1,64}\.(?:svg|pdf)|manifest\.json)$/.test(name))
    fail('INVALID_MARKER_ARTIFACT_REFERENCE')
  const folder=path.join(directory,'native-verified-marker-artifacts',id)
  const manifestBytes=fs.readFileSync(path.join(folder,'manifest.json'))
  if(sha(manifestBytes)!==id)fail('MARKER_ARTIFACT_MANIFEST_TAMPERED')
  const manifest=JSON.parse(manifestBytes.toString('utf8'))
  if(!exact(manifest,['schema','sourceRevision','sourceFingerprint','nativeCutlineFingerprint',
    'orderQuantities','cuttingMaterialDeclarations','artifacts','operatorApproved',
    'factoryApproved','cuttingAuthorized'])||manifest.schema!=='exo-native-verified-marker-artifacts.v1'||
    manifest.factoryApproved!==false||manifest.cuttingAuthorized!==false||
    manifest.operatorApproved!==false)fail('INVALID_MARKER_ARTIFACT_MANIFEST')
  if(!Array.isArray(manifest.artifacts)||manifest.artifacts.some(item=>
    !item||typeof item.name!=='string'||!safeHash(item.sha256)))
    fail('INVALID_MARKER_ARTIFACT_MANIFEST')
  const record=name==='manifest.json'?{sha256:id}:manifest.artifacts.find(item=>item.name===name)
  if(!record||!safeHash(record.sha256))fail('UNKNOWN_MARKER_ARTIFACT')
  if(name!=='manifest.json'){
    const legacy=`${record.size}-${record.fabricId}.${record.format}`
    const canonical=`${nativeVerifiedMarkerArtifactBasenameRun42(record.size,record.fabricId)}.${record.format}`
    // Old content-addressed manifests remain readable, but only when their
    // exact declared physical identity resolves to the requested filename.
    if(name!==legacy&&name!==canonical)fail('MARKER_ARTIFACT_NAME_IDENTITY_MISMATCH')
  }
  const bytes=name==='manifest.json'?manifestBytes:fs.readFileSync(path.join(folder,name))
  if(sha(bytes)!==record.sha256)fail('MARKER_ARTIFACT_TAMPERED')
  return {bytes,contentType:name.endsWith('.pdf')?'application/pdf':name.endsWith('.svg')?
    'image/svg+xml':'application/json'}
}
