import { buildTechPack } from './measurements.js'
import { referenceAnnotationPercentPosition } from './referenceAnnotationPosition.js'

const copy = (x) => structuredClone(x)
const esc = (x) => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const list = x => Array.isArray(x) ? copy(x) : []
const id = (name, n) => `${name}-${String(n).padStart(4,'0')}`
export function normalizeTechPackDraft(x = {}) {
  return {schemaVersion:1,packId:x.packId || '',source:copy(x.source || {}),draft:copy(x.draft || {}),revisions:list(x.revisions),comments:list(x.comments),samples:list(x.samples)}
}
export function createTechPackDraft(project, existing) {
  if (existing) return normalizeTechPackDraft(existing)
  const source = buildTechPack(project)
  return normalizeTechPackDraft({packId:`techpack-${source.project.id || 'garment'}`,source,draft:{styleName:source.project.name || '',sku:'',season:'',status:'draft',technicalFlat:null,technicalNotes:'',pom:source.sizeMeasurements,bom:source.materials.map(m=>({id:m.id,description:m.name,color:m.color,gsm:m.gsm,quantity:null,unit:'',supplier:'',cost:null})),construction:source.construction,colorways:[],labels:[],packaging:[],cost:{currency:'',estimate:null,notes:''},references:[],notes:''}})
}
export function updateTechPackDraft(current, patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new TypeError('Expected object patch')
  const state=normalizeTechPackDraft(current)
  state.draft={...state.draft,...copy(patch)}
  return state
}
export function createTechPackRevision(current,{label='',author='',manufacturerId=null,createdAt}={}) {
  const state=normalizeTechPackDraft(current), version=state.revisions.length+1
  state.revisions.push({id:id('revision',version),version,label,author,manufacturerId,createdAt:createdAt || new Date().toISOString(),source:copy(state.source),spec:copy(state.draft)})
  return state
}
export function addTechPackComment(current,{anchor,body='',author='',status='open',manufacturerId=null,createdAt}={}) {
  if (!anchor?.section || !anchor?.id || !anchor?.versionId) throw new TypeError('Anchor needs section, id and versionId')
  const state=normalizeTechPackDraft(current)
  state.comments.push({id:id('comment',state.comments.length+1),anchor:copy(anchor),body,author,status,manufacturerId,createdAt:createdAt || new Date().toISOString()})
  return state
}
export function addTechPackSample(current,{manufacturer='',manufacturerId=null,round=1,status='pending',measurements=[],notes='',versionId=null,createdAt,...rest}={}) {
  const state=normalizeTechPackDraft(current)
  state.samples.push({id:id('sample',state.samples.length+1),manufacturer,manufacturerId,round,status,measurements:copy(measurements),notes,versionId,createdAt:createdAt || new Date().toISOString(),...copy(rest)})
  return state
}
export function diffTechPackVersions(a,b) {
  const changes=[]
  function visit(x,y,path) {
    if (JSON.stringify(x)===JSON.stringify(y)) return
    if (x && y && typeof x==='object' && typeof y==='object' && !Array.isArray(x) && !Array.isArray(y)) {
      for (const key of [...new Set([...Object.keys(x),...Object.keys(y)])].sort()) visit(x[key],y[key],path ? `${path}.${key}` : key)
    } else changes.push({path,before:copy(x ?? null),after:copy(y ?? null)})
  }
  visit(a?.spec || a?.draft || a,b?.spec || b?.draft || b,'')
  return changes
}
const td=x=>`<td>${esc(x == null ? 'Not supplied' : typeof x==='object' ? JSON.stringify(x) : x)}</td>`
const table=(head,rows)=>`<table><thead><tr>${head.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.map(r=>`<tr>${r.map(td).join('')}</tr>`).join('') : `<tr><td colspan="${head.length}">Not supplied</td></tr>`}</tbody></table>`
const section=(name,html)=>`<section><h2>${esc(name)}</h2>${html}</section>`
const read=(item,...names)=>names.map(name=>item?.[name]).find(value=>value !== undefined && value !== null && value !== '') ?? null
const rowsFor=(value,fields)=>list(value).map(item=>typeof item==='string' ? [item,...fields.slice(1).map(()=>null)] : fields.map(field=>read(item,...field.split('|'))))
const notes=value=>value ? `<p class="notes">${esc(value)}</p>` : ''
const imageSrc=src=>typeof src==='string' && /^data:image\/(?:png|jpeg|webp);base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/i.test(src) ? src : null
const photo=(item,fallback)=>{
  const src=imageSrc(typeof item==='string' ? item : read(item,'src','image','imageSrc','dataUrl'))
  if(!src)return ''
  const markers=list(item?.annotations || item?.callouts).slice(0,60).map((entry,index)=>{
    const position=referenceAnnotationPercentPosition(entry)
    if(!position)return ''
    const {left,top}=position
    return `<span class="reference-pin" style="position:absolute;left:${left}%;top:${top}%;transform:translate(-50%,-50%);background:#222;color:#fff;border:1px solid white;border-radius:50%;width:18px;height:18px;text-align:center;font-size:10px;font-weight:bold;line-height:18px">${index+1}</span>`
  }).join('')
  const annotations=list(item?.annotations || item?.callouts).slice(0,60)
    .map((entry,index)=>`<li><strong>${index+1}.</strong> ${esc(entry?.text||'Reference callout')}${entry?.patternId?` · Pattern ${esc(entry.patternId)}`:''}</li>`).join('')
  return `<figure><div class="reference-visual" style="position:relative;display:inline-block;max-width:100%"><img style="display:block;max-width:100%" src="${esc(src)}" alt="${esc(read(item,'alt','caption','title','name') || fallback)}">${markers}</div><figcaption>${esc(read(item,'caption','title','name','notes') || fallback)}</figcaption>${item?.notes?`<p class="notes">${esc(item.notes)}</p>`:''}${annotations?`<ol class="reference-annotations">${annotations}</ol>`:''}</figure>`
}
const printablePhotos=(items,fallback)=>{const output=list(items).map(item=>photo(item,fallback)).filter(Boolean);return output.length ? `<div class="photos">${output.join('')}</div>` : '<p>No embedded reference images supplied.</p>'}
export function buildTraditionalTechPackHTML(project,current,{versionId}={}) {
  const state=current ? normalizeTechPackDraft(current) : createTechPackDraft(project)
  const revision=versionId ? state.revisions.find(r=>r.id===versionId) : null
  if (versionId && !revision) throw new Error(`Unknown revision ${versionId}`)
  const spec=revision?.spec || state.draft, source=revision?.source || state.source
  const pom=spec.pom || source.sizeMeasurements || {}, sizes=Object.keys(pom)
  const ids=[...new Set(sizes.flatMap(size=>(pom[size] || []).map(m=>m.id)))]
  const rows=ids.map(key=>{const first=sizes.flatMap(size=>pom[size] || []).find(m=>m.id===key) || {};return [first.label || key,first.toleranceCm == null ? null : `±${first.toleranceCm} cm`,...sizes.map(size=>{const m=(pom[size] || []).find(v=>v.id===key);return m?.cm == null ? null : `${m.cm} cm`})]})
  const flat=photo(spec.technicalFlat,'Technical flat') || '<p>Technical flat not supplied.</p>'
  const samples=state.samples.filter(s=>!versionId || s.versionId===versionId).map(s=>[s.id,s.manufacturer,s.round,s.status,JSON.stringify(s.measurements),s.notes])
  const history=state.revisions.map(r=>[r.id,r.label,r.author,r.manufacturerId,r.createdAt])
  const details=table(['Product detail','Specification'],[['Brand',read(spec,'brand','brandName')],['Style',spec.styleName || source.project?.name],['Style SKU',spec.sku],['Season',spec.season],['Product status',spec.status],['Source garment revision',source.project?.revision],['Tech pack revision',revision?.id || 'Working draft'],['Revision label',revision?.label],['Revision author',revision?.author],['Manufacturer',revision?.manufacturerId]])
  const factoryRows=rowsFor(spec.construction,['id','name|description','type|stitchType','from|placement','to|operation','notes|instructions'])
  const trimRows=rowsFor(spec.trims,['id','name|description','material|composition','color','quantity|qty','supplier','notes|placement'])
  const labelRows=rowsFor(spec.labels,['id','name|description','type','placement|position','material','notes|instructions'])
  const packingRows=rowsFor(spec.packaging,['id','name|description','quantity|qty','material','instructions|notes'])
  const colorRows=rowsFor(spec.colorways,['id','name|color|label','code|hex|pantone','notes'])
  const bomRows=list(spec.bom).map(m=>[read(m,'id'),read(m,'description','name'),read(m,'material','composition','materialId'),read(m,'color'),read(m,'gsm'),read(m,'quantity','qty','usage'),read(m,'unit'),read(m,'supplier','vendor'),read(m,'supplierSku','sku'),read(m,'cost','unitCost')])
  const sampleRows=state.samples.filter(s=>!versionId || s.versionId===versionId).flatMap(s=>{const measured=list(s.measurements);return measured.length ? measured.map(m=>[s.id,s.manufacturer,s.round,s.status,read(m,'id','label'),read(m,'cm','value'),s.notes]) : [[s.id,s.manufacturer,s.round,s.status,null,null,s.notes]]})
  const referenceImages=[...list(spec.references),...list(spec.referencePhotos),...list(spec.photos)]
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(spec.styleName || 'Tech Pack')}</title><style>@page{size:A4;margin:16mm}*{box-sizing:border-box}body{font:12px/1.5 Arial,Helvetica,sans-serif;color:#171717;margin:0 auto;max-width:1100px}h1{font-size:28px;margin:8px 0}h2{font-size:17px;border-bottom:1px solid #888;margin-bottom:8px}section{margin:22px 0;break-inside:auto}header{border-bottom:3px solid #222;padding-bottom:18px;margin-bottom:25px}table{border-collapse:collapse;width:100%;font-size:10px}td,th{border:1px solid #aaa;padding:6px;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#eee}img{max-width:100%;max-height:350px;object-fit:contain}.photos{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}figure{border:1px solid #bbb;padding:8px;margin:0;break-inside:avoid}figcaption{font-size:10px;overflow-wrap:anywhere}.notes{white-space:pre-wrap}footer{border-top:1px solid #aaa;font-size:10px;padding-top:10px;margin-top:32px}@media print{body{max-width:none}tr,figure{break-inside:avoid}thead{display:table-header-group}}</style></head><body><header><p>${esc(read(spec,'brand','brandName') || 'Brand not supplied')}</p><h1>${esc(spec.styleName || source.project?.name || 'Untitled')}</h1><p>MANUFACTURING TECH PACK | STYLE SKU: ${esc(spec.sku || 'Not supplied')}</p><p>REVISION: ${esc(revision?.id || 'Working draft')} | SOURCE REVISION: ${esc(source.project?.revision ?? 'Not supplied')}</p></header>${section('Style identification',details)}${section('Technical flat and design notes',flat+notes(spec.technicalNotes))}${section('Graded points of measure (cm)',table(['POM','Tolerance',...sizes],rows))}${section('Bill of materials',table(['ID','Description','Material','Color','GSM','Qty','Unit','Supplier','Supplier SKU','Unit cost'],bomRows))}${section('Construction and sewing operations',table(['ID','Operation','Stitch / type','From / placement','To / method','Instructions'],factoryRows)+notes(spec.constructionNotes))}${section('Trims and hardware',table(['ID','Trim','Material','Color','Quantity','Supplier','Placement / notes'],trimRows)+notes(spec.trimsNotes || spec.trimNotes))}${section('Colorways',table(['ID','Colorway','Color code','Notes'],colorRows)+notes(spec.colorwayNotes))}${section('Labels',table(['ID','Label','Type','Placement','Material','Instructions'],labelRows)+notes(spec.labelNotes))}${section('Packaging',table(['ID','Packaging item','Quantity','Material','Instructions'],packingRows)+notes(spec.packagingNotes))}${section('Reference photos',printablePhotos(referenceImages,'Reference photo'))}${section('Cost and status',table(['Field','Value'],[['Currency',spec.cost?.currency],['Estimated cost',spec.cost?.estimate],['Status',spec.status]])+notes(spec.cost?.notes))}${section('General specifications',notes(spec.notes || 'No additional notes supplied.'))}${section('Sample feedback',table(['ID','Manufacturer','Round','Status','POM','Actual','Notes'],sampleRows))}${section('Revision history',table(['Version','Label','Author','Manufacturer','Date'],history))}<footer>Not factory certified. Verify measurements, materials, tolerances and construction against approved physical samples. | ${esc(revision?.id || 'Working draft')} | Source revision ${esc(source.project?.revision ?? 'Not supplied')}</footer></body></html>`
}
