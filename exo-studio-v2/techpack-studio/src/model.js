export const KEY='exo-techpack-studio-v1'
export const uid=()=>globalThis.crypto?.randomUUID?.() || 'id-'+Math.random().toString(36).slice(2)
export const stamp=()=>new Date().toISOString()
export const money=(n,currency='USD')=>new Intl.NumberFormat('en-US',{style:'currency',currency:currency||'USD',maximumFractionDigits:2}).format(Number.isFinite(Number(n))?Number(n):0)
export const deep=x=>structuredClone(x)
export const BLOCKS=[
 {type:'overview',label:'Product overview',icon:'LayoutDashboard',subtitle:'Product details & factory identification'},
 {type:'flats',label:'Flats & callouts',icon:'PenTool',subtitle:'Annotated technical garment artwork'},
 {type:'measurements',label:'Measurement spec',icon:'Ruler',subtitle:'Graded size chart, POMs and tolerances'},
 {type:'bom',label:'Bill of materials',icon:'Layers3',subtitle:'Fabric, trims and supplier references'},
 {type:'construction',label:'Construction details',icon:'Scissors',subtitle:'Machine, SPI, seams, assembly and finishing'},
 {type:'colorways',label:'Colorways',icon:'Palette',subtitle:'Approved color references and lab dip status'},
 {type:'costing',label:'Cost breakdown',icon:'Calculator',subtitle:'Material rollup, CMT, freight, duty, landed cost'},
 {type:'labels',label:'Labels & packaging',icon:'Package',subtitle:'Placement, compliance text and packing'},
 {type:'notes',label:'Rich text / notes',icon:'FileText',subtitle:'Freely editable headings and body text'},
 {type:'samples',label:'Sample tracker',icon:'ClipboardCheck',subtitle:'Fit rounds and factory feedback'},
 {type:'heading',label:'Section header',icon:'FileText',subtitle:'Large editable document heading'},
 {type:'subheading',label:'Subheading',icon:'FileText',subtitle:'Compact section title and description'},
 {type:'specs',label:'Custom specification sheet',icon:'Layers3',subtitle:'Editable labels, factory values and technical notes'}
]
const row=(pom,description,vals,tolerance=.5)=>({id:uid(),code:pom,description,values:Object.fromEntries(['XS','S','M','L','XL'].map((s,i)=>[s,vals[i]])),tolerance})
const material=(name,category,qty,unit,cost,supplier)=>({id:uid(),name,category,placement:'Main body',composition:'',color:'Black',pantone:'',supplier,code:'',qty,unit,unitCost:cost,leadDays:'',moq:''})
const makeBlocks=()=>['overview','flats','measurements','bom','construction','colorways','costing','labels','samples'].map(type=>({id:uid(),type,heading:BLOCKS.find(x=>x.type===type)?.label||type,subheading:'',visible:true}))
export function createPack(template='hoodie'){
 const templates={
  hoodie:{name:'Gothic Moto Padded Hoodie',style:'MK-HDW-001',category:'Hoodie',gsm:460,material:'French Terry',fabricQty:1.8,baseCost:12.4},
  tee:{name:'Heavyweight Box Tee',style:'MK-TEE-001',category:'T-shirt',gsm:260,material:'Cotton Jersey',fabricQty:1.25,baseCost:7.1},
  jacket:{name:'Structured Utility Jacket',style:'MK-OTW-001',category:'Jacket',gsm:340,material:'Cotton Twill',fabricQty:2.4,baseCost:15.5},
  pants:{name:'Wide Leg Trouser',style:'MK-BTM-001',category:'Pants',gsm:380,material:'Cotton Fleece',fabricQty:1.7,baseCost:10.8},
  blank:{name:'Untitled Style',style:'NEW-001',category:'Apparel',gsm:0,material:'TBD fabric',fabricQty:0,baseCost:0}
 }
 const t=templates[template]||templates.hoodie
 const base={
  id:uid(),schemaVersion:1,brand:'MIKRISTIAN',name:t.name,style:t.style,season:'FW27',category:t.category,designer:'Design Studio',manufacturer:'Factory / TBD',origin:'',fit:'Relaxed / oversized',sampleStage:'Proto',status:'Development',baseSize:'M',sizes:['XS','S','M','L','XL'],unit:'cm',currency:'USD',targetRetail:195,layout:'editorial',paper:'A4',
  description:'Manufacturer specification. Review every marked component and point of measure prior to cutting.',
  artwork:null,annotations:[
   {id:uid(),text:'Rib neck / hood opening · verify finishing',x:0.48,y:0.18,tx:0.78,ty:0.11},
   {id:uid(),text:'Topstitch along panel seam · 6 SPI',x:0.36,y:0.46,tx:0.08,ty:0.34},
   {id:uid(),text:'Bottom rib hem · 70 mm finished',x:0.51,y:0.84,tx:0.78,ty:0.89}
  ],
  measurements:[
   row('A','Body length — HPS to hem',[63,65,67,69,71],1),
   row('B','Chest width — 2.5 cm below armhole',[55,58,61,64,67],1),
   row('C','Shoulder width — across HPS',[54,56,58,60,62],.5),
   row('D','Sleeve length — shoulder to cuff',[58,59,60,61,62],.5),
   row('E','Hem opening — flat',[48,50,52,54,56],1),
   row('F','Bicep — 2.5 cm below armhole',[22,23,24,25,26],.5)
  ],
  bom:[
   material(t.material+' / '+t.gsm+' GSM','Fabric',t.fabricQty,'m',t.baseCost,'Mill TBD'),
   material('Rib 2×2 / 450 GSM','Fabric',.28,'m',5.8,'Mill TBD'),
   material('Tonal polyester thread','Thread',1,'spool',.45,'Trim supplier'),
   material('Main woven neck label','Label',1,'pc',.3,'Trim supplier'),
   material('Size tab','Label',1,'pc',.12,'Trim supplier')
  ],
  construction:[
    {id:uid(),operation:'Join shoulders',type:'4-thread overlock',spi:'12',allowance:'1.0 cm',notes:'Secure both ends. Match shoulder notch.'},
    {id:uid(),operation:'Attach sleeves',type:'4-thread overlock',spi:'12',allowance:'1.0 cm',notes:'Ease sleeve cap evenly.'},
    {id:uid(),operation:'Bottom hem',type:'Coverstitch',spi:'10',allowance:'1.0 cm',notes:'Align rib seams at side.'}
  ],
  colorways:[{id:uid(),name:'Washed Black',hex:'#292a2d',pantone:'Reference to confirm',status:'Lab dip pending'},{id:uid(),name:'Concrete Grey',hex:'#8a8b8d',pantone:'Reference to confirm',status:'Proposed'}],
  labelNotes:'Main label centered at interior back neck. Care/content label in left interior side seam. Confirm country of origin and fiber declaration with manufacturer.',
  packingNotes:'One garment folded in recyclable protective bag. Size label facing outward. Carton ratio / gross weight TBD.',
  cost:{labor:11.5,packaging:.9,freight:2.2,dutyPercent:6,overhead:2.5,marginTarget:65,moq:100},
  comments:[],samples:[],revisions:[],blocks:makeBlocks(),createdAt:stamp(),updatedAt:stamp()
 }
 if(template==='pants'){
  base.measurements=[
   row('A','Waist — relaxed flat',[34,36,38,40,42],.5),
   row('B','Hip — 18 cm below waistband',[52,54,56,58,60],1),
   row('C','Front rise, including waistband',[30,31,32,33,34],.5),
   row('D','Back rise, including waistband',[39,40,41,42,43],.5),
   row('E','Inseam — crotch to hem',[74,75,76,77,78],1),
   row('F','Thigh — 2.5 cm below crotch',[30,31,32,33,34],.5),
   row('G','Leg opening — flat',[23,24,25,26,27],.5)
  ]
 }
 if(template==='tee'){
  base.measurements=[
   row('A','Body length — high point shoulder',[64,66,68,70,72],1),
   row('B','Chest width — flat at underarm',[53,55,57,59,61],1),
   row('C','Shoulder width — end to end',[48,50,52,54,56],.5),
   row('D','Sleeve length — shoulder to hem',[20,21,22,23,24],.5),
   row('E','Neck width — seam to seam',[18,18.5,19,19.5,20],.5),
   row('F','Hem opening — relaxed',[52,54,56,58,60],1)
  ]
 }
 if(template==='blank'){base.annotations=[];base.measurements=[];base.bom=[];base.construction=[];base.colorways=[]}
 return base
}
export function landedCost(pack){
 const materials=(pack.bom||[]).reduce((sum,row)=>sum+Math.max(0,Number(row.qty)||0)*Math.max(0,Number(row.unitCost)||0),0)
 const production=materials+Math.max(0,Number(pack.cost?.labor)||0)+Math.max(0,Number(pack.cost?.packaging)||0)+Math.max(0,Number(pack.cost?.overhead)||0)
 const duty=production*Math.max(0,Number(pack.cost?.dutyPercent)||0)/100
 const freight=Math.max(0,Number(pack.cost?.freight)||0)
 const total=production+duty+freight
 const retail=Number(pack.targetRetail)||0
 return {materials,production,duty,freight,total,margin:retail>0?(retail-total)/retail*100:0,markup:total>0?retail/total:0}
}
export function evaluateSample(pack,sample){
 const size=pack.sizes?.includes(sample.size)?sample.size:pack.baseSize
 const actual=sample.measurements||{}
 const rows=(pack.measurements||[]).map(m=>{
  const spec=Number(m.values?.[size]),raw=actual[m.id]
  const measured=raw==null||raw===''?null:Number(raw)
  const valid=measured!==null&&Number.isFinite(measured)&&Number.isFinite(spec)
  const delta=valid?measured-spec:null
  const tolerance=Math.max(0,Number(m.tolerance)||0)
  return {id:m.id,code:m.code,description:m.description,target:spec,actual:valid?measured:null,delta,tolerance,pass:valid?Math.abs(delta)<=tolerance:null}
 })
 return {size,rows,measuredCount:rows.filter(r=>r.pass!==null).length,outOfTolerance:rows.filter(r=>r.pass===false).length}
}
export function audit(pack){
 const items=[
  ['Style code and factory',Boolean(pack.style?.trim()&&pack.manufacturer?.trim()&&!/TBD/i.test(pack.manufacturer))],
  ['Technical flat or reference artwork',Boolean(pack.artwork)],
  ['Measured size specifications',pack.measurements?.length>0&&pack.measurements.every(m=>pack.sizes.every(size=>Number(m.values?.[size])>0))],
  ['Measurement tolerances',pack.measurements?.length>0&&pack.measurements.every(m=>m.tolerance!==''&&Number(m.tolerance)>=0)],
  ['All BOM supplier articles',pack.bom?.length>0&&pack.bom.every(row=>row.supplier&&!/TBD/i.test(row.supplier)&&row.code)],
  ['Construction operations',pack.construction?.length>0&&pack.construction.every(c=>c.operation&&c.type)],
  ['Confirmed color references',pack.colorways?.length>0&&pack.colorways.every(c=>c.pantone&&!/confirm/i.test(c.pantone))],
  ['Labelling and packaging',Boolean(pack.labelNotes?.trim()&&pack.packingNotes?.trim())],
  ['Costing and order quantity',landedCost(pack).total>0&&Number(pack.cost?.moq)>0],
  ['Approved physical sample',pack.samples?.some(s=>s.status==='Approved')||false]
 ]
 return {items,ready:items.every(([,ok])=>ok),completed:items.filter(([,ok])=>ok).length}
}
export function revision(pack,label,author='Designer',factory=''){
 const entry={id:uid(),number:pack.revisions.length+1,label:label||'Revision '+(pack.revisions.length+1),author,factory,createdAt:stamp(),snapshot:deep({...pack,revisions:[]})}
 return {...pack,revisions:[...pack.revisions,entry],updatedAt:stamp()}
}
export function changedFields(a,b){
 const keys=['brand','name','style','season','category','manufacturer','status','measurements','bom','construction','colorways','cost','labelNotes','packingNotes','annotations','blocks','targetRetail','visualStudio','comments','samples']
 return keys.filter(k=>JSON.stringify(a?.[k])!==JSON.stringify(b?.[k]))
}
/** Import the first-party EXO digital-techpack export without changing its source records. */
export function fromExoDigital(payload) {
 if(payload?.format!=='exo-digital-tech-pack' || !payload.studio?.draft)throw Error('Not an EXO digital techpack export')
 const draft=payload.studio.draft
 const source=payload.studio.source||payload.source||{}
 const pack=createPack('blank')
 const pom=draft.pom||source.sizeMeasurements||{}
 const sizes=Object.keys(pom)
 const identifiers=[...new Set(sizes.flatMap(size=>(pom[size]||[]).map(row=>row.id)))]
 pack.name=draft.styleName||payload.projectName||source.project?.name||pack.name
 pack.style=draft.sku||source.project?.id||pack.style
 pack.brand=draft.brand||draft.brandName||pack.brand
 pack.season=draft.season||''
 pack.manufacturer=draft.factory||''
 pack.category=draft.category||'Apparel'
 pack.fit=draft.fit||''
 pack.description=draft.technicalNotes||draft.notes||''
 pack.status=draft.status||'Development'
 if(sizes.length){pack.sizes=sizes;pack.baseSize=sizes.includes('M')?'M':sizes[0]}
 pack.measurements=identifiers.map(key=>{
  const first=sizes.flatMap(size=>pom[size]||[]).find(row=>row.id===key)||{}
  return {id:uid(),code:key,description:first.label||key,tolerance:Number(first.toleranceCm)||0,
   values:Object.fromEntries(sizes.map(size=>[size,(pom[size]||[]).find(row=>row.id===key)?.cm??'']))}
 })
 pack.bom=(draft.bom||[]).map(m=>({
  id:uid(),category:m.category||'Fabric',name:m.description||m.name||'Material',placement:m.placement||'',
  composition:m.composition||m.material||'',color:m.color||'',pantone:m.pantone||'',
  supplier:m.supplier||'',code:m.supplierSku||m.code||'',qty:m.quantity??m.qty??0,
  unit:m.unit||'pc',unitCost:m.cost??m.unitCost??0
 }))
 pack.construction=(draft.construction||[]).map(c=>({
  id:uid(),operation:c.name||c.operation||c.description||'',type:c.stitchType||c.type||'',
  spi:c.spi||'',allowance:c.seamAllowance||'',notes:c.notes||c.instructions||''
 }))
 pack.colorways=(draft.colorways||[]).map(c=>({id:uid(),name:c.name||c.color||'',hex:/^#[0-9a-f]{6}$/i.test(c.hex||'')?c.hex:'#888888',pantone:c.pantone||c.code||'',status:'Proposed'}))
 pack.labelNotes=draft.labelNotes||(draft.labels||[]).map(x=>typeof x==='string'?x:JSON.stringify(x)).join('\n')
 pack.packingNotes=draft.packagingNotes||(draft.packaging||[]).map(x=>typeof x==='string'?x:JSON.stringify(x)).join('\n')
 if(draft.cost)pack.cost={...pack.cost,labor:draft.cost.labor??0,freight:draft.cost.freight??0,packaging:draft.cost.packaging??0}
 const flat=draft.technicalFlat?.src||draft.technicalFlat?.dataUrl
 if(typeof flat==='string'&&/^data:image\/(?:png|jpeg|webp);base64,/.test(flat))pack.artwork=flat
 const reference=(draft.references||[]).find(r=>r.id===draft.technicalFlat?.referenceId)
 pack.annotations=(reference?.annotations||[]).map(a=>({id:uid(),type:'pin',x:a.x,y:a.y,text:a.text||'Callout'}))
 pack.samples=(payload.studio.samples||[]).map(s=>({id:uid(),name:'Sample round '+(s.round||1),factory:s.manufacturer||'',status:s.status||'Requested',notes:s.notes||'',createdAt:s.createdAt||stamp(),revision:0}))
 pack.comments=(payload.studio.comments||[]).map(c=>({id:uid(),body:c.body||'',author:c.author||'Imported',anchor:c.anchor?.section||'General',status:c.status==='open'?'Open':'Resolved',date:c.createdAt||stamp(),revision:0}))
 pack.importedSource=deep(payload)
 return pack
}
