// Presentation recipes never contain garment measurements, grading, approval
// statuses or factory instructions. Applying one cannot overwrite source data.
export const TECHPACK_LAYOUTS = Object.freeze([
  {id:'square',name:'Square composition',detail:'Centered 1:1 content boundary'},
  {id:'balanced',name:'Balanced specification',detail:'Drawing and specifications in one ruled frame'},
  {id:'illustration',name:'Illustration first',detail:'Large technical drawing, secondary tables'},
  {id:'specification',name:'Specification first',detail:'Dense tables and clear numbered columns'},
  {id:'gallery',name:'Visual collection',detail:'Swatches, artwork and image references'},
  {id:'minimal',name:'Minimal plate',detail:'Spacious editorial typography'},
])
export const TECHPACK_HEADERS = Object.freeze([
  {id:'seville',name:'Seville ruled',detail:'Traditional factory title block'},
  {id:'technical',name:'Technical bar',detail:'Compact industrial identification'},
  {id:'editorial',name:'Editorial',detail:'Large fashion collection heading'},
  {id:'minimal',name:'Minimal',detail:'Fine hairline and restrained titles'},
  {id:'dark',name:'Contrast band',detail:'Bold reversed identification'},
])
export const TECHPACK_THEMES = Object.freeze([
  {id:'mono',name:'Monochrome',accent:'#171717',line:'#171717',wash:'#f6f6f6'},
  {id:'blueprint',name:'Blueprint',accent:'#17476b',line:'#356883',wash:'#e9f2f6'},
  {id:'oxblood',name:'Oxblood',accent:'#822a35',line:'#9d4350',wash:'#f8eeee'},
  {id:'forest',name:'Forest',accent:'#315d4e',line:'#527765',wash:'#ebf3eb'},
  {id:'clay',name:'Clay',accent:'#98563b',line:'#b2785d',wash:'#faf0e8'},
  {id:'violet',name:'Violet',accent:'#5b4b86',line:'#75659c',wash:'#f3eff9'},
])
export const TECHPACK_TEMPLATES = Object.freeze([
  {id:'factory-standard',category:'packs',name:'Factory standard',description:'Balanced construction, sewing, POM and BOM sheets.',layout:'balanced',header:'technical',theme:'mono'},
  {id:'atelier-square',category:'packs',name:'Atelier square',description:'Centered square boards and restrained typography.',layout:'square',header:'minimal',theme:'oxblood'},
  {id:'runway-collection',category:'packs',name:'Collection lookbook',description:'Image-led presentation for seasonal samples.',layout:'gallery',header:'editorial',theme:'clay'},
  {id:'production-blueprint',category:'packs',name:'Production blueprint',description:'Technical specification and measured tables.',layout:'specification',header:'technical',theme:'blueprint'},
  {id:'quiet-luxury',category:'packs',name:'Quiet luxury',description:'Clean premium presentation in tonal greens.',layout:'minimal',header:'minimal',theme:'forest'},
  {id:'streetwear-system',category:'packs',name:'Streetwear development',description:'High contrast callouts and graphics.',layout:'illustration',header:'dark',theme:'violet'},
  {id:'hoodie-pullover',category:'garments',name:'Hoodie / sweatshirt',description:'Seam engineering, trims, artwork and fabric detail.',layout:'illustration',header:'technical',theme:'mono'},
  {id:'tee-top',category:'garments',name:'T-shirt / top',description:'Clean flats and placement dimensions.',layout:'square',header:'minimal',theme:'blueprint'},
  {id:'pant-trouser',category:'garments',name:'Pants / trousers',description:'Measurement and construction focused.',layout:'specification',header:'technical',theme:'forest'},
  {id:'jacket-outerwear',category:'garments',name:'Jacket / outerwear',description:'Panels, closures, hardware and bill of materials.',layout:'balanced',header:'dark',theme:'oxblood'},
  {id:'dress-knitwear',category:'garments',name:'Dress / knitwear',description:'Visual drape, shape and surface references.',layout:'gallery',header:'editorial',theme:'clay'},
  {id:'bag-accessory',category:'garments',name:'Bag / accessory',description:'Square product views, trims and packaging.',layout:'square',header:'technical',theme:'violet'},
  {id:'flat-drawing',category:'pages',pageId:'flats',name:'Technical flat board',description:'Large drawing and placement key.',layout:'illustration',header:'technical',theme:'mono'},
  {id:'pattern-drawing-sheet',category:'pages',pageId:'patterns',name:'Large pattern drawing',description:'A large, clean source cutline with numbered piece details.',layout:'illustration',header:'seville',theme:'mono'},
  {id:'cutting-spec',category:'pages',pageId:'pattern-cutlist',name:'Pattern cutting register',description:'Source piece quantities, seam allowances, notches and grain notes.',layout:'specification',header:'technical',theme:'mono'},
  {id:'pattern-grading-sheet',category:'pages',pageId:'grading',name:'Pattern grading sheet',description:'Base size, grade increments and recorded size run.',layout:'specification',header:'seville',theme:'blueprint'},
  {id:'measurement-drawing-sheet',category:'pages',pageId:'measurements',name:'Measurement diagram',description:'Large technical figure and dimension leaders.',layout:'illustration',header:'seville',theme:'mono'},
  {id:'measurement-sheet',category:'pages',pageId:'measurement-table',name:'Graded POM register',description:'Rows, tolerances and graded measurement values.',layout:'specification',header:'technical',theme:'blueprint'},
  {id:'sewing-sheet',category:'pages',pageId:'construction',name:'Construction diagram',description:'Source-linked seam arrows and sewn detail views.',layout:'illustration',header:'technical',theme:'mono'},
  {id:'sewing-register',category:'pages',pageId:'construction-operations',name:'Sewing operations table',description:'Seam assembly and factory construction instructions.',layout:'specification',header:'technical',theme:'mono'},
  {id:'material-library',category:'pages',pageId:'fabrics',name:'Fabric swatch sheet',description:'Visual fabric references and material tests.',layout:'gallery',header:'editorial',theme:'clay'},
  {id:'production-bom',category:'pages',pageId:'materials',name:'BOM / trim matrix',description:'Factory-first sourcing tables.',layout:'specification',header:'technical',theme:'mono'},
  {id:'artwork-card',category:'pages',pageId:'artwork',name:'Graphic placement card',description:'Square framed artwork presentation.',layout:'square',header:'minimal',theme:'oxblood'},
  {id:'packaging-card',category:'pages',pageId:'packaging',name:'Packaging and labels',description:'Packaging, trim and finish references.',layout:'gallery',header:'minimal',theme:'forest'},
  {id:'interactive-3d',category:'interactive',pageId:'interactive3d',name:'Interactive 3D details',description:'Orbitable garment with clickable manufacturing notes.',layout:'square',header:'technical',theme:'blueprint'},
  {id:'premium-production',category:'packs',name:'Luxury production dossier',description:'Formal title blocks, spacious drawings and factory records.',layout:'balanced',header:'seville',theme:'oxblood'},
  {id:'technical-monograph',category:'packs',name:'Technical monograph',description:'Dense engineering sheets for complex construction.',layout:'specification',header:'minimal',theme:'mono'},
  {id:'graphic-capsule',category:'packs',name:'Graphic capsule',description:'Artwork, placement and visual development boards.',layout:'gallery',header:'dark',theme:'violet'},
  {id:'sample-review',category:'packs',name:'Sample review pack',description:'Visual first presentation for reviewing development samples.',layout:'illustration',header:'editorial',theme:'blueprint'},
  {id:'denim-bottoms',category:'garments',name:'Denim / five-pocket',description:'Pocket construction, stitching and fabric detail.',layout:'illustration',header:'technical',theme:'blueprint'},
  {id:'footwear-design',category:'garments',name:'Footwear / sneaker',description:'Multiple views, component callouts and material boards.',layout:'gallery',header:'seville',theme:'mono'},
  {id:'headwear-design',category:'garments',name:'Hat / headwear',description:'Panels, embroidery, closure and trims.',layout:'square',header:'technical',theme:'forest'},
  {id:'activewear-design',category:'garments',name:'Activewear / performance',description:'Stretch fabric, seam and construction worksheets.',layout:'specification',header:'technical',theme:'violet'},
  {id:'fabric-technical',category:'pages',pageId:'fabrics',name:'Fabric technical register',description:'Density, fiber, finishes and testing overview.',layout:'specification',header:'technical',theme:'blueprint'},
  {id:'fabric-swatch-atlas',category:'pages',pageId:'fabrics',name:'Fabric swatch atlas',description:'Large square material references and comments.',layout:'square',header:'minimal',theme:'forest'},
  {id:'pattern-square',category:'pages',pageId:'patterns',name:'Square pattern plate',description:'Centered pattern silhouettes in a square drawing area.',layout:'square',header:'minimal',theme:'mono'},
  {id:'pattern-reference',category:'pages',pageId:'pattern-cutlist',name:'Pattern piece index',description:'Table-first register for production cutting pieces.',layout:'balanced',header:'technical',theme:'clay'},
  {id:'grading-engineering',category:'pages',pageId:'grading',name:'Grading engineering grid',description:'Dense aligned rule system for grade review.',layout:'specification',header:'dark',theme:'mono'},
  {id:'construction-plate',category:'pages',pageId:'construction',name:'Sewing detail plate',description:'Enlarged seam and assembly diagrams.',layout:'square',header:'seville',theme:'blueprint'},
  {id:'fit-review-sheet',category:'pages',pageId:'measurements',name:'Fit review board',description:'Technical figure beside written fit observations.',layout:'balanced',header:'editorial',theme:'clay'},
  {id:'trim-board',category:'pages',pageId:'materials',name:'Trims and hardware board',description:'Gallery of sourced components and identifiers.',layout:'gallery',header:'technical',theme:'forest'},
  {id:'artwork-placement',category:'pages',pageId:'artwork',name:'Artwork placement map',description:'Large central placement artwork and ruled annotations.',layout:'illustration',header:'dark',theme:'oxblood'},
  {id:'labels-packaging-grid',category:'pages',pageId:'packaging',name:'Label system grid',description:'Side by side labeling and packaging references.',layout:'balanced',header:'minimal',theme:'mono'},
])
export const TECHPACK_BOX_TEMPLATES=Object.freeze([
  {id:'outline-box',category:'boxes',name:'Technical outline box',description:'Fine border for a garment detail or factory note.',width:290,height:130,border:'solid',lineColor:'#171717'},
  {id:'callout-box',category:'boxes',name:'Numbered detail box',description:'A ruled detail plate for an annotation or seam.',width:270,height:150,border:'solid',lineColor:'#822a35'},
  {id:'swatch-box',category:'boxes',name:'Material reference box',description:'A square boxed swatch or artwork placement.',width:205,height:205,border:'solid',lineColor:'#356883'},
  {id:'note-box',category:'boxes',name:'Factory note box',description:'Dashed frame for an authored construction comment.',width:350,height:115,border:'dashed',lineColor:'#171717'},
  {id:'wide-detail-box',category:'boxes',name:'Wide detail panel',description:'Horizontal panel for enlarged detail diagrams.',width:390,height:175,border:'solid',lineColor:'#356883'},
  {id:'square-technical-box',category:'boxes',name:'Square callout frame',description:'1:1 inspection plate for a selected detail.',width:230,height:230,border:'dashed',lineColor:'#315d4e'},
])
export const TECHPACK_TABLE_TEMPLATES=Object.freeze([
  {id:'two-column-table',category:'tables',name:'Two-column specifications',description:'Clean property and factory value columns.',title:'SPECIFICATION REGISTER',headers:['SPECIFICATION','VALUE'],rows:4},
  {id:'measurement-matrix',category:'tables',name:'Measurement matrix',description:'POM, tolerance and size range worksheet.',title:'MEASUREMENT WORKSHEET',headers:['POINT OF MEASURE','TOLERANCE','S','M','L','XL'],rows:6},
  {id:'construction-register',category:'tables',name:'Construction instructions',description:'Source seam references, stitch type and comments.',title:'SEWING INSTRUCTION TABLE',headers:['OPERATION','STITCH / SEAM','FACTORY INSTRUCTION'],rows:5},
  {id:'fabric-register',category:'tables',name:'Fabric specifications',description:'Fabric, composition, GSM and mill references.',title:'FABRIC SPECIFICATION TABLE',headers:['FABRIC','COMPOSITION','GSM','MILL / NOTES'],rows:5},
  {id:'packaging-register',category:'tables',name:'Packaging specification',description:'Labels, polybags, hangtags and carton details.',title:'PACKAGING REGISTER',headers:['ITEM','SIZE / MATERIAL','QUANTITY','NOTES'],rows:5},
  {id:'revision-register',category:'tables',name:'Revision and approval log',description:'Dated sample decisions and factory follow-ups.',title:'DEVELOPMENT REVISION LOG',headers:['REVISION','DATE','CHANGE / ACTION','REVIEWED BY'],rows:4},
  {id:'trim-source-register',category:'tables',name:'Trim sourcing matrix',description:'Supplier, color and quantity worksheets.',title:'TRIM SOURCING MATRIX',headers:['TRIM / COMPONENT','SUPPLIER','COLOR','QUANTITY','NOTES'],rows:6},
  {id:'pattern-piece-register',category:'tables',name:'Pattern piece index',description:'Piece name, cut quantity and grainline notes.',title:'PATTERN PIECE INDEX',headers:['PIECE','CUT','MATERIAL','GRAIN / NOTES'],rows:7},
  {id:'fit-comments-register',category:'tables',name:'Fit comment tracker',description:'Recorded fit observations with sample actions.',title:'FIT REVIEW TRACKER',headers:['AREA','OBSERVATION','REVISION','STATUS'],rows:6},
  {id:'graded-pom-factory',category:'tables',name:'Factory POM with tolerances',description:'Measurement methods, approved graded sizes, asymmetric tolerances and sample comparison.',title:'POINT OF MEASURE · APPROVAL CHART',headers:['POM REF','METHOD / LOCATION','TOL. − (cm)','TOL. + (cm)','XS (cm)','S (cm)','M (cm)','L (cm)','XL (cm)','SAMPLE M','DELTA M','REVIEW'],columnTypes:['text','text','number','number','number','number','number','number','number','number','formula','text'],rows:6},
  {id:'grade-increment-matrix',category:'tables',name:'Grading increment rules',description:'Size-to-size steps with approved base size and source rule reference.',title:'PATTERN GRADE RULES',headers:['POM / PIECE','BASE SIZE','XS→S','S→M','M→L','L→XL','GRADE SOURCE','VERIFIED'],columnTypes:['text','text','number','number','number','number','text','text'],rows:7},
  {id:'fabric-bom-cost',category:'tables',name:'Fabric BOM and costing',description:'Component consumption, material cost, waste and review status, without estimated prices.',title:'BILL OF MATERIALS / COSTING',headers:['MATERIAL ID','DESCRIPTION','COLORWAY','USAGE / GARMENT','UNIT','UNIT PRICE','WASTE %','EXT. COST','SUPPLIER','APPROVAL'],columnTypes:['text','text','text','number','text','number','number','formula','text','text'],rows:6},
  {id:'seam-machine-register',category:'tables',name:'Sewing and stitch operations',description:'Source seam IDs, stitch methods, seam allowance and machine instructions.',title:'FACTORY OPERATION REGISTER',headers:['OP. NO.','SEAM / PANEL REF','STITCH CODE','SPI','ALLOWANCE (mm)','THREAD','MACHINE','INSTRUCTION','QC'],columnTypes:['text','text','text','number','number','text','text','text','text'],rows:8},
  {id:'sample-fit-deviation',category:'tables',name:'Sample fit and deviation',description:'Record physical sample actuals against target and approved tolerance.',title:'SAMPLE FIT / TOLERANCE REVIEW',headers:['ROUND','POM','SIZE','TARGET (cm)','ACTUAL (cm)','DELTA (cm)','TOL. −','TOL. +','RESULT','ACTION'],columnTypes:['text','text','text','number','number','formula','number','number','text','text'],rows:8},
  {id:'lab-test-spec',category:'tables',name:'Fabric testing and approval',description:'Shrinkage, stretch, composition and lab dip review records.',title:'FABRIC QUALITY / LAB REPORT',headers:['FABRIC ID','TEST','METHOD','TARGET','ACTUAL','UNITS','DATE','STATUS','REMARKS'],rows:6},
  {id:'artwork-measurement-register',category:'tables',name:'Artwork placement matrix',description:'Graphic references, technique, actual dimensions and garment placement.',title:'ARTWORK LOCATION & DIMENSIONS',headers:['ART ID','PANEL','PROCESS','WIDTH (mm)','HEIGHT (mm)','X OFFSET','Y OFFSET','INK / THREAD','APPROVAL'],columnTypes:['text','text','text','number','number','number','number','text','text'],rows:5},
  {id:'size-run-order-matrix',category:'tables',name:'Size breakdown matrix',description:'Style variants and ordered units per approved garment size.',title:'SIZE RUN / COLORWAY REGISTER',headers:['COLORWAY','XS','S','M','L','XL','XXL','TOTAL','NOTES'],columnTypes:['text','integer','integer','integer','integer','integer','integer','formula','text'],rows:5},
  {id:'hangtag-label-register',category:'tables',name:'Brand labels and hangtags',description:'Neck, size, care, composition and external hangtag factory instructions.',title:'LABEL / HANGTAG REQUIREMENTS',headers:['LABEL ID','INSIDE / OUTSIDE','MATERIAL','WIDTH (mm)','HEIGHT (mm)','POSITION','ARTWORK REF','SUPPLIER','APPROVAL'],columnTypes:['text','text','text','number','number','text','text','text','text'],rows:6},
  {id:'carton-pack-register',category:'tables',name:'Packing and carton matrix',description:'Bag, tissue, hangtag and carton content specifications and size mapping.',title:'PACKING / CARTON SPECIFICATION',headers:['ITEM','COLORWAY','UNITS / PACK','CARTON QTY','DIMENSIONS','MATERIAL','BARCODE','FOLD METHOD','STATUS'],columnTypes:['text','text','integer','integer','text','text','text','text','text'],rows:6},
  {id:'factory-release-checklist',category:'tables',name:'Factory release checklist',description:'Sample, material, measurement and artwork authorizations are recorded separately.',title:'PRODUCTION READINESS / SIGNOFF',headers:['REQUIREMENT','EVIDENCE / REFERENCE','OWNER','DATE','STATE','OPEN ISSUE'],columnTypes:['text','text','text','date','text','text'],rows:8},
])
const STORE='exo.techpack.user-templates.v1'
const isColor=v=>typeof v==='string'&&/^#[\da-f]{6}$/i.test(v)
const valid=(v,items,fallback)=>items.some(item=>item.id===v)?v:fallback
const safePageSnapshot=value=>{
  if(!value||typeof value!=='object'||Array.isArray(value))return undefined
  try{
    const serialized=JSON.stringify(value)
    if(serialized.length>90000)return undefined
    const parsed=JSON.parse(serialized)
    if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return undefined
    return Object.fromEntries(['settings','boardObjects','boxes','tables','pageAssets','footerLogoAssetId','annotations'].filter(key=>parsed[key]!==undefined).map(key=>[key,parsed[key]]))
  }catch{return undefined}
}
const safePackPages=value=>{
  if(!Array.isArray(value))return undefined
  try{
    if(JSON.stringify(value).length>400000)return undefined
    return value.slice(0,60).filter(p=>p&&typeof p==='object'&&
      typeof p.sourcePageId==='string'&&/^[a-z0-9_-]{1,80}$/i.test(p.sourcePageId)&&
      safePageSnapshot(p.layout?.pageSnapshot)).map(p=>({
      sourcePageId:p.sourcePageId,
      name:String(p.name||'Techpack page').slice(0,100),
      custom:Boolean(p.custom),
      layout:{kind:'page-layout',contentMode:p.layout?.contentMode==='authored'?'authored':'schema',
        pageSnapshot:safePageSnapshot(p.layout.pageSnapshot)}
    }))
  }catch{return undefined}
}
const safePackImageAssets=value=>{
  if(!Array.isArray(value))return []
  let total=0
  return value.slice(0,12).filter(item=>{
    if(!item||typeof item.id!=='string'||item.id.length>100)return false
    const data=item.dataUrl
    if(typeof data!=='string'||data.length>90000||!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(data))return false
    total+=data.length
    return total<=260000
  }).map(item=>({id:item.id,name:String(item.name||'Artwork').slice(0,100),
    caption:String(item.caption||'').slice(0,100),category:String(item.category||'reference').slice(0,100),dataUrl:item.dataUrl}))
}
const safe=(preset,id)=>({
  id:String(id||preset.id||'').slice(0,100),
  name:String(preset.name||'My techpack preset').trim().slice(0,70),
  category:'custom',description:String(preset.description||'Saved layout preset').slice(0,140),
  ...(preset.kind==='page-layout'&&safePageSnapshot(preset.pageSnapshot)?{kind:'page-layout',
    contentMode:preset.contentMode==='authored'?'authored':'schema',
    pageSnapshot:safePageSnapshot(preset.pageSnapshot)}:{}),
  ...(preset.kind==='pack-layout'&&safePackPages(preset.pages)?.length?{kind:'pack-layout',
    contentMode:preset.contentMode==='authored'?'authored':'schema',
    pages:safePackPages(preset.pages),
    imageAssets:preset.contentMode==='authored'?safePackImageAssets(preset.imageAssets):[]} :{}),
  ...(typeof preset.pageId==='string'&&/^[a-z0-9_-]{1,80}$/i.test(preset.pageId)?{pageId:preset.pageId}:{}),
  layout:valid(preset.layout,TECHPACK_LAYOUTS,'balanced'),
  header:valid(preset.header,TECHPACK_HEADERS,'technical'),
  theme:valid(preset.theme,TECHPACK_THEMES,'mono'),
  colors: Object.fromEntries(['accent','line','wash'].map(key=>[key,isColor(preset.colors?.[key])?preset.colors[key]:TECHPACK_THEMES.find(t=>t.id===preset.theme)?.[key]||TECHPACK_THEMES[0][key]])),
})
export function loadTechPackUserPresets(){
  try {const data=JSON.parse(localStorage.getItem(STORE)||'[]');return Array.isArray(data)?data.slice(0,40).filter(p=>p&&typeof p==='object'&&String(p.id||'').startsWith('user-')).map(p=>safe(p,p.id)):[]}
  catch{return []}
}
export function saveTechPackUserPreset(preset){
  const next=safe(preset,'user-'+(globalThis.crypto?.randomUUID?.()||Date.now().toString(36)))
  const collection=[...loadTechPackUserPresets(),next].slice(-40)
  localStorage.setItem(STORE,JSON.stringify(collection))
  return collection
}
export function deleteTechPackUserPreset(id){
  const collection=loadTechPackUserPresets().filter(p=>p.id!==id)
  localStorage.setItem(STORE,JSON.stringify(collection))
  return collection
}
export function applyTechPackTemplate(workspace={},preset,pageId=null){
  const kind=preset?.kind||'layout'
  const layout=valid(preset?.layout,TECHPACK_LAYOUTS,workspace.layoutPreset||'balanced')
  const header=valid(preset?.header,TECHPACK_HEADERS,workspace.headerPreset||'technical')
  const theme=valid(preset?.theme,TECHPACK_THEMES,workspace.templateTheme||'mono')
  const colors=safe({...preset,theme},'preview').colors
  const pages={...workspace.pages}
  const patch=kind==='header'?{headerPreset:header}:kind==='theme'?{templateTheme:theme,templateColors:colors}:
    {layoutPreset:layout,headerPreset:header,templateTheme:theme,templateColors:colors}
  if(pageId)return {...workspace,pages:{...pages,[pageId]:{...pages[pageId],...patch}}}
  for(const id of Object.keys(pages))pages[id]={...pages[id],...patch}
  return {...workspace,pages,...patch}
}
