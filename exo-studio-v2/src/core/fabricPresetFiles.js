// EXO-owned, portable single-fabric format. This is not CLO's proprietary .zfab.
// Never accept an entire garment/project as a replacement for a fabric asset.
export const FABRIC_FILE_FORMAT='exo-fabric-preset'
export const FABRIC_FILE_VERSION=1
export const FABRIC_FILE_LIMIT=2*1024*1024

const TEXT_FIELDS=['name','itemNo','construction','supplier','owner']
const COLOR_FIELDS=['color']
const NUMERIC_FIELDS=['gsm','thickness','stretchWarp','stretchWeft','bend','damping','friction','roughness','metalness','sheen','opacity','reflectionIntensity']
// Preserve every key in the Rust FabricProperties struct. A partial physics
// object cannot be deserialized by the native engine and must not be exported.
const NATIVE_NUMERIC=['density','thickness','warp','weft','shear','compression_ratio','compression_transition','bend_warp','bend_weft']
const allowedAppearance=['color','opacity','roughness','metalness','reflectionIntensity']
const isRecord=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)
const text=(value,max=128)=>typeof value==='string'&&value.length<=max?value:undefined
const numeric=value=>typeof value==='number'&&Number.isFinite(value)?value:undefined

export function fabricPresetPayload(fabric,kind='draft'){
  if(!isRecord(fabric)||!['draft','native'].includes(kind))throw Error('Choose a fabric to save')
  const result={format:FABRIC_FILE_FORMAT,version:FABRIC_FILE_VERSION,kind,
    fabric:{}}
  for(const key of TEXT_FIELDS){const value=text(fabric[key]);if(value!==undefined)result.fabric[key]=value}
  if(kind==='draft'){
    for(const key of COLOR_FIELDS){const value=text(fabric[key],40);if(value!==undefined)result.fabric[key]=value}
    for(const key of NUMERIC_FIELDS){const value=numeric(fabric[key]);if(value!==undefined)result.fabric[key]=value}
    if(isRecord(fabric.texture))result.fabric.texture=JSON.parse(JSON.stringify(fabric.texture))
    if(isRecord(fabric.wash))result.fabric.wash=JSON.parse(JSON.stringify(fabric.wash))
    if(typeof fabric.surfaceFamily==='string')result.fabric.surfaceFamily=fabric.surfaceFamily
  }else{
    result.fabric.properties={}
    for(const key of NATIVE_NUMERIC){const value=numeric(fabric.properties?.[key]);if(value===undefined)throw Error(`Native fabric is missing required physical property: ${key}`);result.fabric.properties[key]=value}
    if(isRecord(fabric.appearance)){
      result.fabric.appearance={}
      for(const key of allowedAppearance){const value=fabric.appearance[key];if(typeof value==='string'||numeric(value)!==undefined)result.fabric.appearance[key]=value}
    }
  }
  return result
}

export function parseFabricPreset(json){
  if(typeof json!=='string'||json.length>FABRIC_FILE_LIMIT)throw Error('Fabric file exceeds the 2 MB limit')
  let doc
  try{doc=JSON.parse(json)}catch{throw Error('Not a valid fabric JSON file')}
  if(!isRecord(doc)||doc.format!==FABRIC_FILE_FORMAT||doc.version!==FABRIC_FILE_VERSION||!['draft','native'].includes(doc.kind)||!isRecord(doc.fabric))
    throw Error('Choose an EXO fabric preset (.exo-fabric.json), not a full garment project or CLO .zfab file')
  if(!text(doc.fabric.name,96)?.trim())throw Error('Fabric preset needs a valid name')
  const selected={}
  for(const key of TEXT_FIELDS){if(doc.fabric[key]===undefined)continue;const limit=key==='name'||key==='itemNo'?96:128;const value=text(doc.fabric[key],limit);if(value===undefined)throw Error(`${key} exceeds allowed length`);selected[key]=value}
  if(doc.kind==='draft'){
    for(const key of COLOR_FIELDS){if(doc.fabric[key]===undefined)continue;if(!/^#[0-9a-f]{6}$/i.test(doc.fabric[key]))throw Error('Invalid fabric color');selected[key]=doc.fabric[key]}
    const bounds={gsm:[1,3000],thickness:[0.00001,.03],stretchWarp:[0,1],stretchWeft:[0,1],bend:[0,1],damping:[0,1],friction:[0,1.5],roughness:[0,1],metalness:[0,1],sheen:[0,1],opacity:[.05,1],reflectionIntensity:[0,3]}
    for(const key of NUMERIC_FIELDS){if(doc.fabric[key]===undefined)continue;const value=numeric(doc.fabric[key]);if(value===undefined||value<bounds[key][0]||value>bounds[key][1])throw Error(`Invalid fabric ${key}`);selected[key]=value}
    if(doc.fabric.texture!==undefined){if(!isRecord(doc.fabric.texture))throw Error('Invalid fabric texture');selected.texture=doc.fabric.texture}
    if(doc.fabric.wash!==undefined){if(!isRecord(doc.fabric.wash))throw Error('Invalid fabric wash');selected.wash=doc.fabric.wash}
    if(typeof doc.fabric.surfaceFamily==='string'&&doc.fabric.surfaceFamily.length<80)selected.surfaceFamily=doc.fabric.surfaceFamily
  }else{
    if(!isRecord(doc.fabric.properties))throw Error('Native fabric file has no physical properties')
    const properties={}
    const limits={density:[.02,10],thickness:[.00003,.05],warp:[.1,25000],weft:[.1,25000],shear:[.1,2000],compression_ratio:[0,1],compression_transition:[0,1],bend_warp:[.0000001,.0025],bend_weft:[.0000001,.0025]}
    for(const key of NATIVE_NUMERIC){const value=numeric(doc.fabric.properties[key]);if(value===undefined||value<limits[key][0]||value>limits[key][1])throw Error(`Invalid native physical property: ${key}`);properties[key]=value}
    selected.properties=properties
    if(doc.fabric.appearance!==undefined){
      if(!isRecord(doc.fabric.appearance))throw Error('Invalid native fabric appearance')
      selected.appearance={}
      for(const key of allowedAppearance){const value=doc.fabric.appearance[key];if(value===undefined)continue
        if(key==='color'){if(typeof value!=='string'||!/^#[0-9a-f]{6}$/i.test(value))throw Error('Invalid native fabric color')}
        else if(numeric(value)===undefined||value<0||value>(key==='reflectionIntensity'?3:1))throw Error(`Invalid native fabric ${key}`)
        selected.appearance[key]=value
      }
    }
  }
  return {kind:doc.kind,fabric:selected}
}
