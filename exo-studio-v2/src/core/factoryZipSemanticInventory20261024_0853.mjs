import {auditFactoryPackageManifestBrowser20261024_0053} from './factoryPackageManifestBrowser20261024_0053.mjs'

// Exact unconditional addText paths in buildFactoryPackageFiles. Optional
// neckband proposals, piece grading files and markers are handled separately.
const FIXED = Object.freeze([
  'README.txt','marker-dxf-geometry-qa.json','tech-pack.json','factory-spec.html',
  'pom-spec.csv','materials-bom.csv','fabric-costing.csv','bom.xml',
  'production-preflight.json','industrial-pattern-qa.json',
  'industrial-pattern-issues.csv','industrial-pattern-seam-walk.csv',
  'industrial-notch-qa.json','industrial-notch-walk.csv',
  'industrial-cutline-qa.json','industrial-cutline-areas.csv',
  'graded-geometry-qa.json','graded-geometry-issues.csv',
  'graded-seam-junction-qa.json','factory-sample-worksheet.json',
  'factory-sample-approval-gate.json','recipient-cad-acceptance-plan.json',
  'manufacturing-release-readiness.json','pattern-pieces.csv',
  'construction-seams.csv','marker-summary.csv','trims-hardware.json',
  'size-run.json','garment-source.json','marker-plot-geometry-qa.json','manifest.json',
])
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key)
const data=(obj,key)=>Object.getOwnPropertyDescriptor(obj,key)
const field=(obj,key)=>{
  if(!obj||typeof obj!=='object')return undefined
  const d=data(obj,key)
  if(d&&!own(d,'value'))throw Error('accessor property')
  return d?.value
}
const slug=v=>String(v||'garment').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'garment'
const dec=new TextDecoder('utf-8',{fatal:true})

/** Development diagnostic for already extracted, untrusted factory package bytes.
 * Never conveys cutting permission or physical manufacturing certification.
 */
export function auditFactoryZipSemanticInventory20261024_0853(files,expectedProject){
  const baseline=auditFactoryPackageManifestBrowser20261024_0053(files,expectedProject)
  const diagnostics=[...baseline.diagnostics]
  const reject=(code,message)=>diagnostics.push({code,message})
  const result=()=>({ok:diagnostics.length===0,diagnostics,manufacturingApproved:false})
  try{
    if(!files||typeof files!=='object'||Array.isArray(files))return result()
    const keys=Object.keys(files)
    for(const path of FIXED)if(!own(files,path))reject('MISSING_MANDATORY_ARTIFACT',`Missing mandatory factory artifact: ${path}`)
    const readJSON=path=>{
      if(!own(files,path))return null
      const bytes=field(files,path)
      if(!(bytes instanceof Uint8Array))return null
      const parsed=JSON.parse(dec.decode(bytes))
      if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error(`Invalid JSON: ${path}`)
      return parsed
    }
    const source=readJSON('garment-source.json')
    const sizes=field(field(source,'grading'),'sizes')
    const name=field(source,'name')
    if(!Array.isArray(sizes)||!sizes.length||sizes.some(s=>typeof s!=='string'||!s.trim())||typeof name!=='string'){
      reject('INVALID_SIZE_INVENTORY','Cannot establish authored grading sizes')
      return result()
    }
    const expectedDxfs=new Set(sizes.map(s=>`patterns/${slug(name)}-${s.toLowerCase()}.dxf`))
    const actualDxfs=keys.filter(p=>p.startsWith('patterns/')&&p.endsWith('.dxf'))
    for(const path of expectedDxfs)if(!own(files,path))reject('MISSING_SIZE_DXF',`Missing graded DXF: ${path}`)
    for(const path of actualDxfs)if(!expectedDxfs.has(path))reject('UNEXPECTED_SIZE_DXF',`DXF outside authored size inventory: ${path}`)
    const dxfQa=readJSON('marker-dxf-geometry-qa.json')
    const auditedSizes=field(dxfQa,'sizes')
    if(!Array.isArray(auditedSizes)||auditedSizes.length!==sizes.length||
      new Set(auditedSizes).size!==sizes.length||sizes.some(size=>!auditedSizes.includes(size))){
      reject('MISSING_SIZE_QA','Marker/DXF QA does not cover every authored size')
    }
    const plotQa=readJSON('marker-plot-geometry-qa.json')
    const rows=field(plotQa,'rows')
    if(!Array.isArray(rows)||sizes.some(size=>!rows.some(row=>field(row,'size')===size))){
      reject('MISSING_SIZE_PLOT_QA','Marker plot QA does not cover every authored size')
    }
  }catch{
    reject('UNSAFE_SEMANTIC_INVENTORY','Unable to safely inspect semantic factory inventory')
  }
  return result()
}
