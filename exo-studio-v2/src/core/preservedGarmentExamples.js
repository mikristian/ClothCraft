import {getProject,saveProject} from './projectFileLibrary.js'
import {projectPatternPreview} from './projectLibraryPreview.js'

// These are exact, read-only copies of the user's 2026-10-25 EXO Rust
// snapshots. Import them as separate editable library projects once, without
// modifying either the installed app's live session or an existing record.
export const PRESERVED_DENIM_LIBRARY_ID='exo-native-501-denim-preserved-20261025'
export const PRESERVED_TSHIRT_LIBRARY_ID='exo-native-previous-tshirt-preserved-20261025'

export const PRESERVED_GARMENTS=Object.freeze([
  {
    id:PRESERVED_DENIM_LIBRARY_ID,
    file:'EXO_501_Denim_W32L32_preserved_20261025.garment.json',
    sha256:'366fa84f8690b9db534f52257d7cfcbdf5126d684c4f9d1662866d925af5a6f7',
    name:'501 Denim Jeans · Preserved W32/L32',
    notes:'Preserved native 24-panel jeans research draft. NOT FACTORY APPROVED.',
    minPanels:20,
  },
  {
    id:PRESERVED_TSHIRT_LIBRARY_ID,
    file:'EXO_Previous_Tshirt_preserved_20261025.garment.json',
    sha256:'5f789b07fe22bb66a67e80cfc9f8677c3a10319f4b7e929c03578040a37467a7',
    name:'Previous EXO T-Shirt · Native Workspace',
    notes:'Restored previous T-shirt engineering workspace, not a factory fit approval.',
    minPanels:2,
  },
])

export async function readPreservedGarment(record,fetcher=fetch){
  const response=await fetcher(`${import.meta.env?.BASE_URL||'/'}saved-garments/${record.file}`)
  if(!response.ok)throw new Error(`Cannot load preserved garment ${record.file} (${response.status})`)
  const bytes=await response.arrayBuffer()
  if(bytes.byteLength<500||bytes.byteLength>5_000_000)throw new Error('Preserved garment size outside supported bounds')
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('')
  if(hash!==record.sha256)throw new Error('Preserved garment checksum mismatch; refusing to import modified source')
  const snapshot=JSON.parse(new TextDecoder().decode(bytes))
  if(!snapshot?.template||!Array.isArray(snapshot.template.panels)||snapshot.template.panels.length<record.minPanels ||
    !Array.isArray(snapshot.template.seams)||!Array.isArray(snapshot.template.fabrics))
    throw new Error('Preserved garment has an incomplete native pattern source')
  return snapshot
}

export async function ensurePreservedGarmentsInLibrary({fetcher=fetch,get=getProject,save=saveProject}={}){
  const results=[]
  for(const record of PRESERVED_GARMENTS){
    const existing=await get(record.id)
    if(existing){results.push({id:record.id,name:existing.name,added:false});continue}
    const snapshot=await readPreservedGarment(record,fetcher)
    const template=snapshot.template
    const saved=await save({id:record.id,name:record.name,status:'development',category:'garment',
      description:record.notes,snapshot,snapshotFormat:'native',
      previewUrl:projectPatternPreview(snapshot,'native'),
      tags:['EXO native','Preserved project',record.id===PRESERVED_DENIM_LIBRARY_ID?'Denim':'T-shirt'],
      metadata:{panels:template.panels.length,seams:template.seams.length,sourceEngine:'native',
        sourceSha256:record.sha256,sourceType:'Preserved local user workspace'},
      fabricBOM:template.fabrics.map(f=>({id:f.id,name:f.name||f.id,color:f.color||'',composition:f.composition||''})),
      specs:{size:template.grading?.baseSize||'',sourceProjectId:template.id||''}})
    results.push({id:record.id,name:saved.name,added:true})
  }
  return results
}
