import {TECHPACK_PAGES,techPackPageTable} from './techPackWorkspaceModel.js'
import {resolveTechPackPages} from './techPackPageComposer.js'
import {techPackPageLayout} from './techPackPageLayout.js'
import {measurementReferenceRows,linkedMeasurementLabel} from './techPackMeasurementDrawing.js'
import {getTechPackFabricSwatch} from './techPackFabricSwatches.js'
import {techPackAuthoringChecklist} from './techPackAuthoringChecklist.js'
import {pageMarkerSvgMarkup} from './techPackPageMarkup.js'
import {boardObjectTransform} from './techPackBoardObjects.js'
import {TECHPACK_THEMES,TECHPACK_LAYOUTS} from './techPackTemplatePresets.js'
import {techPackFactoryReadiness} from './techPackFactoryReadiness.js'
import {renderTechPackSpreadsheetTable,techPackSpreadsheetStyles} from './techpack-spreadsheet/printProjection.js'
import {paginateTechPackTable,boxTableRowCapacity,enumerateWorkspaceOverflowPages} from './techpack-spreadsheet/pagination.js'
import {compareTechPackCheckpoints} from './techPackRevisionHistory.js'
import {createBoundTechPackTable} from './techpack-spreadsheet/sourceBindings.js'
import {renderFactorySampleReviewPrint} from './techpack-spreadsheet/printFactoryReview.js'

const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const imageSrc=x=>typeof x==='string'&&x.length<400000&&(
  /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(x)||
  /^data:image\/svg\+xml,%3Csvg/i.test(x)
) ? x : ''

// Printable, escaped equivalent of the native Seville page identification
// grid. Read-only source values remain distinct from user-authored fields.
function sevilleTitleBlock(source,draft,page,settings,index,headerFields={}){
  const value=v=>esc(v==null||String(v).trim()===''?'—':v)
  const brand=value(draft.brand||'—')
  const names=(source.fabrics||[]).map(f=>f.name).filter(Boolean).slice(0,2).join(' / ')
  const entries=[
    ['SEASON',draft.season],['STYLE NO.',draft.sku],['CATEGORY',draft.category||source.productionSpec?.category||'GARMENT'],
    ['FABRIC',names||'NOT ASSIGNED'],['REV.',source.revision],['BRAND',draft.brand||'EXO'],
    ['NAME',draft.styleName||source.name],['SIZE',source.grading?.baseSize||'NOT SET'],
    ['MAT.',(source.fabrics||[]).length?`${source.fabrics.length} MATERIALS`:'NOT SET'],['ISSUE','DRAFT'],
  ]
  const keys=['season','sku','category','fabric','revision','brand','name','size','material','issue']
  return `<header class="seville-block"><div class="seville-grid">${entries.map(([label,val],i)=>`<div class="seville-field"><b>${esc(label)}</b><span>${value(headerFields[keys[i]]??val)}</span></div>`).join('')}</div><div class="seville-heading"><strong>${esc(settings.title??page.name)}</strong><small>${esc(settings.subtitle??page.subtitle)}</small></div></header>`
}

const sevillePrintStyles=`
.sheet.seville{background:white;color:#111;font-family:Arial,Helvetica,sans-serif;max-width:825px;min-height:1050px;padding:24px 27px 20px;gap:0}
.sheet.seville header.seville-block{padding:0!important;margin:0 0 11px!important;background:white!important;color:#111!important}
.sheet.seville .seville-topline{display:grid;grid-template-columns:1fr auto 26px;align-items:end;gap:8px;margin-bottom:7px}
.sheet.seville .seville-topline strong{font-size:17px;font-weight:950;letter-spacing:-.05em}
.sheet.seville .seville-topline span{font-size:8px;font-weight:800;color:#555}
.sheet.seville .seville-topline b{text-align:right;font-size:23px}
.sheet.seville .seville-grid{display:grid;grid-template-columns:1fr 1.4fr 1.3fr 1.55fr .8fr;grid-auto-rows:minmax(29px,auto);border:solid #111;border-width:1px 0 0 1px}
.sheet.seville .seville-field{min-width:0;display:flex;border:solid #111;border-width:0 1px 1px 0}
.sheet.seville .seville-field b{display:flex;align-items:center;padding:4px;background:#f1f1f1;border-right:1px solid #111;font-size:7px;font-weight:900}
.sheet.seville .seville-field span{display:flex;align-items:center;padding:4px 5px;overflow-wrap:anywhere;font-size:8px;font-weight:750;text-transform:uppercase}
.sheet.seville .seville-heading{display:flex;flex-direction:column;align-items:center;gap:1px;background:#f8f8f8;border:1px solid #111;border-top:0;padding:6px}
.sheet.seville .seville-heading strong{font-size:11px;font-weight:900;letter-spacing:.05em;text-transform:uppercase}
.sheet.seville .seville-heading small{font-size:8px;color:#555;text-transform:uppercase}
.sheet.seville main{padding:0;flex:1}
.sheet.seville .drafting,.sheet.seville .render-images,.sheet.seville .custom-spec,.sheet.seville .fabric-sheet{break-inside:avoid;margin:9px 0;border-color:#111}
.sheet.seville .drafting h2,.sheet.seville .render-images h2,.sheet.seville .custom-spec h2,.sheet.seville main>h2{background:#f8f8f8;color:#111;border:1px solid #111;font:900 9px Arial,sans-serif;letter-spacing:.04em;margin:9px 0 0;padding:7px}
.sheet.seville .drafting h2{border:0;border-bottom:1px solid #111;margin:0}
.sheet.seville .drafting svg{max-height:440px}
.sheet.seville table{border:1px solid #111;border-collapse:collapse;width:100%;font:9px/1.25 Arial,sans-serif}
.sheet.seville table th{border:1px solid #111;background:#efefef;color:#111;text-align:left;font:900 8px Arial,sans-serif;padding:6px}
.sheet.seville table td{border:1px solid #333;padding:5px}
.sheet.seville .pom-ref{color:#ad2932;background:#fff4f4;font-weight:900;text-align:center}
.sheet.seville .notes{border:1px solid #111;border-top:0;margin:0;min-height:55px}
.sheet.seville .seville-footer{border:0;margin-top:auto;padding:15px 0 0;display:flex;align-items:center;justify-content:space-between;gap:9px;color:#444;font:750 8px Arial,sans-serif}
.sheet.seville .seville-footer strong{font-size:15px;font-weight:950;letter-spacing:-.04em;background:#111;color:white;padding:8px 18px;border-radius:5px 1px 5px 1px;overflow-wrap:anywhere}
.sheet.seville .seville-footer span{flex:1;text-align:right;font-size:8px}
.sheet.seville .seville-footer b{font-size:13px;color:#111}
@media print{.sheet.seville{max-width:none!important;min-height:0!important;margin:0!important;padding:0!important;box-shadow:none!important}.sheet.seville .seville-grid,.sheet.seville .seville-heading,.sheet.seville .seville-footer strong{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
`

/** Portable print preview. Includes every editable page in project order, without executing asset HTML. */
export function renderTechPackWorkspacePrintHTML(source,draft={},workspace={},assets=[],artwork={},renders={}){
  const title=esc(draft.styleName||source.name||'Garment Tech Pack')
  const orderedPages=resolveTechPackPages(workspace,TECHPACK_PAGES)
  // Only vetted numeric placement values enter print CSS. Factory-source
  // geometry is never mutated when arranging a visual page object.
  const selectors={'header':'.seville-block','drawing':'.drafting','renders':'.render-images',
    'fabric-swatches':'.fabric-sheet','images':'.images','spec-table':'main > table','notes':'.notes','footer-logo':'.seville-footer'}
  const printObjectPlacements=Object.entries(workspace.boardObjects||{}).flatMap(([pageId,objects])=>{
    const index=orderedPages.findIndex(p=>p.id===pageId)
    if(index<0||!objects||typeof objects!=='object')return []
    return Object.entries(objects).flatMap(([key,raw])=>{
      if(!selectors[key])return []
      const t=boardObjectTransform(raw)
      return [`.sheet:nth-of-type(${index+1}) ${selectors[key]}{transform:translate(${t.x}px,${t.y}px) scale(${t.scaleX},${t.scaleY});transform-origin:top left}`]
    })
  }).join('\n')
  const hiddenPrintRules=orderedPages.flatMap((p,i)=>{
    const hidden=Array.isArray(workspace.hiddenObjects?.[p.id])?workspace.hiddenObjects[p.id]:[]
    return hidden.filter(id=>Object.hasOwn(selectors,id)).map(id=>`.sheet:nth-of-type(${i+1}) ${selectors[id]}{display:none!important}`)
  }).join('\n')
  const checklist=techPackAuthoringChecklist(source,draft,workspace,assets)
  const factoryReadiness=techPackFactoryReadiness(source,draft,workspace,assets)
  const preExportItems=factoryReadiness.items.filter(item => /^asset-|^stale-asset-|^stale-table-|^table-cells-|^table-overflow-/.test(item.id))
  const preExportReview=preExportItems.length
    ?`<section class="exo-preexport-review" role="note"><h2>DOCUMENT PRE-EXPORT REVIEW · ${preExportItems.length} ITEM(S)</h2><p>Check linked assets, garment source revisions, spreadsheet overrides and print continuations. This preview remains a working draft; all factory sign-offs require separate evidence.</p><ul>${preExportItems.map(item=>`<li><strong>${esc(item.pageId)} · ${esc(item.title)}</strong> — ${esc(item.reason)}</li>`).join('')}</ul></section>`:''
  const pages=orderedPages.map((page,index)=>{
    const settings=workspace.pages?.[page.id]||{}
    const {pageStyle}=techPackPageLayout(workspace,page.id)
    const preset=['seville','editorial','technical','minimal','dark'].includes(settings.headerPreset)?settings.headerPreset:
      (['seville','editorial','technical','minimal','dark'].includes(workspace.headerPreset)?workspace.headerPreset:'seville')
    const layout=TECHPACK_LAYOUTS.some(item=>item.id===settings.layoutPreset)?settings.layoutPreset:
      TECHPACK_LAYOUTS.some(item=>item.id===workspace.layoutPreset)?workspace.layoutPreset:'balanced'
    const theme=TECHPACK_THEMES.find(item=>item.id===(settings.templateTheme||workspace.templateTheme))||TECHPACK_THEMES[0]
    const color=key=>/^#[0-9a-f]{6}$/i.test(settings.templateColors?.[key]||'')?settings.templateColors[key]:
      /^#[0-9a-f]{6}$/i.test(workspace.templateColors?.[key]||'')?workspace.templateColors[key]:theme[key]
    const specId=page.id==='measurement-table'?'measurements':page.id==='construction-operations'?'construction':page.id
    const table=techPackPageTable(page.id,source,{...draft,pom:source.kind==='project'?source.pom:Object.keys(draft.pom||{}).length?draft.pom:source.pom})
    const overrides=workspace.cells?.[specId]||{}
    const rows=[...table.rows,...(workspace.extraRows?.[specId]||[])]
    const measuredRefs=page.id==='measurement-table'?measurementReferenceRows(rows):[]
    const display=rows.length?`<table class="${page.id==='measurement-table'?'pom-print':''}"><thead><tr>${page.id==='measurement-table'?'<th>REF</th>':''}${table.headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((row,i)=>`<tr>${page.id==='measurement-table'?`<td class="pom-ref">${esc(measuredRefs[i]?.reference||'')}</td>`:''}${row.cells.map((c,i)=>`<td>${esc(overrides[row.id]?.[i]??c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`:'<div class="empty">No source rows recorded on this page.</div>'
    const measurementKey=page.id==='measurements'?`<section class="custom-spec"><h2>ANNOTATED DIMENSIONS / LEADERS</h2><table><thead><tr><th>REF</th><th>POINT / SIZE / VALUE</th><th>PLACEMENT STATUS</th></tr></thead><tbody>${(workspace.annotations?.measurements||[]).filter(item=>item.type==='dimension'||item.type==='arrow').map(item=>{
      const link=item.type==='dimension'?linkedMeasurementLabel(item,table,overrides):null
      return `<tr><td>${esc(link?.reference||item.label||'NOTE')}</td><td>${esc(link?.detail||item.instruction||'Factory note pending')}</td><td>${esc(item.type==='dimension'?(item.placementVerified?'Manually checked':'Verify drawn endpoints'):'Author annotation')}</td></tr>`
    }).join('')||'<tr><td colspan="3">Place dimension lines on the front/back diagram; link them to the points of measure above.</td></tr>'}</tbody></table></section>`:''
    const customTables=(workspace.tables?.[page.id]||[]).filter(item=>!(workspace.hiddenObjects?.[page.id]||[]).includes('table-'+item.id)).map(custom=>{
      const headers=Array.isArray(custom.headers)?custom.headers.slice(0,12):[]
      if(!headers.length)return ''
      const rows=Array.isArray(custom.rows)?custom.rows.slice(0,100):[]
      return `<section class="custom-spec"><h2>${esc(custom.title||'CUSTOM SPECIFICATION')}</h2><table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${headers.map((_,i)=>`<td>${esc(row.cells?.[i]||'')}</td>`).join('')}</tr>`).join('')}</tbody></table></section>`
    }).join('')
    const insertedBoxes=(workspace.pageBoxes?.[page.id]||[]).slice(0,24).filter(item=>!(workspace.hiddenObjects?.[page.id]||[]).includes('box-'+item.id)).map(item=>{
      const color=/^#[0-9a-f]{6}$/i.test(item?.lineColor||'')?item.lineColor:'#171717'
      const t=boardObjectTransform(workspace.boardObjects?.[page.id]?.[`box-${item.id}`]||{})
      const w=Math.min(580,Math.max(90,Number(item?.width)||270))
      const h=Math.min(440,Math.max(70,Number(item?.height)||125))
      const fragments=item?.slot?.spreadsheetTable?.columns?.length?paginateTechPackTable(item.slot.spreadsheetTable,{firstRowCapacity:boxTableRowCapacity(h),pageStyle}):null
      const tableHtml=fragments?renderTechPackSpreadsheetTable(fragments[0].table,{showTitle:false})+(fragments.length>1?`<small class="exo-table-continued">CONTINUED · ${fragments.length-1} overflow plate(s)</small>`:''):''
      return `<section class="custom-spec" data-inserted-box="true" style="border:2px ${item?.border==='dashed'?'dashed':'solid'} ${color};min-height:${h}px;max-width:${w}px;padding:10px;transform:translate(${t.x}px,${t.y}px) scale(${t.scaleX},${t.scaleY});transform-origin:top left"><h2>${esc(item?.title||'Detail box')}</h2>${tableHtml}<p>${esc(item?.note||'Factory note not recorded.')}</p></section>`
    }).join('')
    const calloutRows=(workspace.annotations?.[page.id]||[]).filter(item=>item.type==='arrow')
    const authoringReview=page.id==='authoring-checklist'?`<section class="authoring-review"><h2>PRE-PRODUCTION SPECIFICATION REVIEW · ${checklist.recorded} / ${checklist.total} RECORDED</h2><div class="authoring-grid">${checklist.items.map(item=>`<div class="authoring-check"><span>${item.done?'✓':'!'}</span><strong>${esc(item.title)}</strong><small>${item.done?'Recorded':'Needs input'}</small></div>`).join('')}</div><p>Authoring completeness does not establish physical sample approval or factory sign-off.</p><p><strong>PHYSICAL SAMPLE APPROVAL REQUIRED</strong> before a production handoff.</p></section>${preExportReview}`:''
    const factoryReview=page.id==='factory-review'?`<section class="custom-spec"><h2>FACTORY HANDOFF PREVIEW · ${factoryReadiness.counts.missing} MISSING / ${factoryReadiness.counts.review} TO VERIFY</h2><table><thead><tr><th>STATUS</th><th>REQUIREMENT</th><th>ACTION</th></tr></thead><tbody>${factoryReadiness.items.map(item=>`<tr><td>${esc(item.status.toUpperCase())}</td><td>${esc(item.label)}</td><td>${esc(item.description)}</td></tr>`).join('')||'<tr><td colspan="3">Tracked authoring requirements complete. Physical and factory approval must be verified separately.</td></tr>'}</tbody></table></section>`:''
    const savedSamplePrint=page.id==='factory-review'&&workspace.factorySampleReview?renderFactorySampleReviewPrint(workspace.factorySampleReview,createBoundTechPackTable('measurement-table',source,draft)):''
    const colorwayPrint=page.id==='colorways'?`<section class="custom-spec"><h2>COLORWAY VARIATIONS / FINISH STANDARDS</h2><table><thead><tr><th>COLORWAY / SAMPLE</th><th>REFERENCE</th><th>FABRIC</th><th>WASH / FINISH</th><th>FACTORY INSTRUCTIONS</th></tr></thead><tbody>${(Array.isArray(draft.colorways)?draft.colorways:[]).map(item=>{
      const hex=/^#[0-9a-f]{6}$/i.test(item?.hex||'')?item.hex:'#e5e9ed'
      return `<tr><td><span style="display:inline-block;width:13px;height:13px;vertical-align:middle;border:1px solid #555;background:${hex}"></span> ${esc(item?.name||'')}</td><td>${esc(item?.code||item?.hex||'')}</td><td>${esc((source.fabrics||[]).find(f=>String(f.id)===String(item?.fabric))?.name||item?.fabric||'')}</td><td>${esc(item?.finish||'')}</td><td>${esc(item?.notes||'')}</td></tr>`
    }).join('')||'<tr><td colspan="5">No colorways authored yet.</td></tr>'}</tbody></table></section>`:''
    const revisionList=Array.isArray(workspace.revisions)?workspace.revisions:[]
    const revisionDiff=revisionList.length>1?compareTechPackCheckpoints(revisionList.at(-2),revisionList.at(-1)):[]
    const revisionPrint=page.id==='notes'&&revisionList.length?`<section class="custom-spec"><h2>SPECIFICATION REVISION REGISTER</h2><table><thead><tr><th>CHECKPOINT</th><th>DATE</th><th>GARMENT REVISION</th></tr></thead><tbody>${revisionList.map(r=>`<tr><td>${esc(r.title||'Development revision')}</td><td>${esc(r.createdAt||'')}</td><td>${esc(r.snapshot?.source?.revision??'Not recorded')}</td></tr>`).join('')}</tbody></table>${revisionList.length>1?`<h2>LAST TWO CHECKPOINTS · ${revisionDiff.length} CHANGES</h2><table><thead><tr><th>SECTION</th><th>CHANGE</th></tr></thead><tbody>${revisionDiff.slice(0,30).map(c=>`<tr><td>${esc(c.section)}</td><td>${esc(c.description)}</td></tr>`).join('')||'<tr><td colspan="2">No tracked changes.</td></tr>'}</tbody></table>`:''}</section>`:''
    const calloutRegister=page.id==='callouts'?`<section class="custom-spec"><h2>CONSTRUCTION DETAIL / LEADER REGISTER</h2><table><thead><tr><th>REF</th><th>COMPONENT / LOCATION</th><th>FACTORY DETAIL / DIMENSION</th></tr></thead><tbody>${calloutRows.length?calloutRows.map(item=>`<tr><td>${esc(item.label||'')}</td><td>${esc(item.component||'')}</td><td>${esc(item.instruction||'')}</td></tr>`).join(''):'<tr><td colspan="3">No callout details authored yet.</td></tr>'}</tbody></table></section>`:''
    const fabricCards=page.id==='fabrics'?`<section class="fabric-sheet"><h2>FABRIC SWATCHES / SOURCE MATERIALS</h2><div class="fabric-swatches">${(source.fabrics||[]).map((fabric,i)=>{
      const overrides=workspace.cells?.fabrics?.[fabric.id]||{}
      const authored=(Array.isArray(draft.bom)?draft.bom:[]).find(item=>String(item.id)===String(fabric.id))||{}
      const color=overrides[1]??authored.color??fabric.color??''
      const swatch=/^#[0-9a-f]{3,8}$/i.test(String(color))?color:'#dce2e5'
      const photo=getTechPackFabricSwatch(workspace,fabric.id,assets)
      const photoSrc=imageSrc(photo?.dataUrl||photo?.src||photo?._src)
      return `<div class="fabric-swatch-card"><div class="fabric-chip" style="background:${esc(swatch)}">${photoSrc?`<img src="${esc(photoSrc)}" alt="${esc(authored.description||fabric.name)} fabric swatch · ${esc(photo.caption||photo.name||'visual reference')}">`:''}<span>FAB ${String(i+1).padStart(2,'0')}</span></div><div><strong>${esc(authored.description||fabric.name)}</strong><small>${esc(color||'Color pending')}</small><p>${esc((overrides[2]??authored.composition??fabric.composition)||'Composition pending')} · ${esc((overrides[3]??authored.gsm??fabric.gsm)||'—')} GSM</p>${photoSrc?`<p class="fabric-photo-caption">IMAGE REFERENCE: ${esc(photo.caption||photo.name||'Swatch photograph')}</p>`:'<p class="fabric-photo-caption">Photographic swatch not supplied</p>'}</div></div>`
    }).join('')}</div></section>`:''
    const svg=typeof artwork[page.id]==='string'&&artwork[page.id].startsWith('<svg ')&&artwork[page.id].length<2000000?artwork[page.id]:''
    const drawing=svg?`<section class="drafting"><h2>EXO SOURCE TECHNICAL DRAWING</h2>${svg}</section>`:''
    const renderSource=name=>{
      const overrideId=workspace.boardObjects?.[page.id]?.['render-'+name]?.assetId
      const replacement=assets.find(asset=>asset.id===overrideId)
      return imageSrc(replacement?.dataUrl||replacement?.src||replacement?._src)||imageSrc(renders[name]||'')
    }
    const views=page.id==='overview'&&['front','back','side'].some(name=>renderSource(name))?
      `<section class="render-images"><h2>CURRENT GARMENT · EXO RENDER VIEWS</h2><div>${['front','back','side'].map(name=>{
        const t=boardObjectTransform(workspace.boardObjects?.[page.id]?.['render-'+name]||{})
        const src=renderSource(name)
        return `<figure data-render-view="${name}" style="transform:translate(${t.x}px,${t.y}px) scale(${t.scaleX},${t.scaleY});transform-origin:top left">${src?`<img src="${esc(src)}" alt="${name} garment render">`:'<div class="missing">Render pending</div>'}<figcaption>${name.toUpperCase()}</figcaption></figure>`
      }).join('')}</div></section>`:''
    const attached=new Set(workspace.pageAssets?.[page.id]||[])
    const media=assets.filter(a=>attached.has(a.id)||
      (['flats','artwork'].includes(page.id)&&draft.technicalFlat?.referenceId===a.id)).map(a=>{
        const img=imageSrc(a.dataUrl||a.src||a._src)
        return `<figure>${img?`<img src="${esc(img)}" alt="${esc(a.caption||a.name||'Reference')}">`:'<div class="missing">Visual file unavailable</div>'}<figcaption>${esc(a.caption||a.name||'Reference')} · ${esc(a.category||'Asset')}</figcaption></figure>`
      }).join('')
    const footerAsset=assets.find(asset=>asset.id===workspace.pageFooterAssets?.[page.id])
    const footerImage=imageSrc(footerAsset?.dataUrl||footerAsset?.src||footerAsset?._src||'')
    const printFooterLogo=footerImage? `<img class="seville-footer-logo" src="${esc(footerImage)}" alt="Custom Techpack footer artwork">`:
      draft.brand&&String(draft.brand).trim()&&!/^mikristian$/i.test(String(draft.brand).trim())?
      `<strong>${esc(draft.brand)}</strong>`:''
    const interactivePrint=page.id==='interactive3d'?`<section class="interactive-print"><h2>INTERACTIVE 3D / PRINTED DETAIL REFERENCE</h2>${imageSrc(renders.front)?`<img class="interactive-print-view" src="${esc(imageSrc(renders.front))}" alt="Native garment front render">`:'<p>Open the digital techpack for an interactive 3D garment view.</p>'}<table><thead><tr><th>MARKER</th><th>LOCATION / COMPONENT</th><th>FACTORY NOTE</th></tr></thead><tbody>${(workspace.interactiveMarkers||[]).map(m=>`<tr><td>${esc(m.label||'')}</td><td>${esc(m.title||'')}</td><td>${esc(m.detail||'')}</td></tr>`).join('')||'<tr><td colspan="3">No 3D detail markers authored.</td></tr>'}</tbody></table></section>`:''
    if(page.id.startsWith('custom-')){
      const hidden=workspace.hiddenObjects?.[page.id]||[]
      const placement=id=>{
        const t=boardObjectTransform(workspace.boardObjects?.[page.id]?.[id]||{})
        return `transform:translate(${t.x}px,${t.y}px) scale(${t.scaleX},${t.scaleY});transform-origin:top left`
      }
      const boxes=(workspace.pageBoxes?.[page.id]||[]).slice(0,24).filter(b=>!hidden.includes('box-'+b.id)).map(b=>{
        const border=/^#[0-9a-f]{6}$/i.test(b.lineColor||'')?b.lineColor:'#171717'
        const width=Math.min(580,Math.max(90,Number(b.width)||270))
        const height=Math.min(440,Math.max(70,Number(b.height)||125))
        const slot=b.slot&&typeof b.slot==='object'&&!Array.isArray(b.slot)?b.slot:{}
        const kind=slot.category==='tables'?'table':slot.category==='headers'?'header':b.templateType||b.contentType||(Array.isArray(slot.headers)||Array.isArray(b.headers)?'table':b.headerStyle?'header':'note')
        const headers=(Array.isArray(slot.headers)?slot.headers:Array.isArray(b.headers)?b.headers:[]).slice(0,12)
        const rows=(Array.isArray(slot.rows)?slot.rows:Array.isArray(b.rows)?b.rows:[]).slice(0,40)
        const fragments=slot.spreadsheetTable?.columns?.length?paginateTechPackTable(slot.spreadsheetTable,{firstRowCapacity:boxTableRowCapacity(height),pageStyle}):null
        const slotContent=fragments?renderTechPackSpreadsheetTable(fragments[0].table,{showTitle:false})+(fragments.length>1?`<small class="exo-table-continued">CONTINUED · ${fragments.length-1} additional plate(s)</small>`:''):kind==='table'&&headers.length?`<table class="custom-artboard-slot-table"><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${headers.map((_,i)=>`<td>${esc(row?.cells?.[i]??'')}</td>`).join('')}</tr>`).join('')}</tbody></table>`:
          kind==='header'?`<div class="custom-artboard-slot-header"><strong>${esc(slot.title||b.headerText||b.title||'GARMENT SPECIFICATION')}</strong></div>`:''
        return `<section class="custom-artboard-box" style="position:absolute;left:${Math.max(0,Math.min(790,Number(b.x)||0))}px;top:${Math.max(0,Math.min(1020,Number(b.y)||0))}px;width:${width}px;height:${height}px;border:2px ${b.border==='dashed'?'dashed':'solid'} ${border};${placement('box-'+b.id)}">${b.title?`<strong>${esc(b.title)}</strong>`:''}${slotContent}${b.note?`<p>${esc(b.note)}</p>`:''}</section>`
      }).join('')
      const tables=(workspace.tables?.[page.id]||[]).slice(0,12).filter(t=>!hidden.includes('table-'+t.id)).map(t=>{
        const headers=Array.isArray(t.headers)?t.headers.slice(0,12):[]
        if(!headers.length)return ''
        return `<section class="custom-artboard-table" style="${placement('table-'+t.id)}">${t.title?`<h2>${esc(t.title)}</h2>`:''}<table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${(Array.isArray(t.rows)?t.rows:[]).slice(0,100).map(r=>`<tr>${headers.map((_,i)=>`<td>${esc(r.cells?.[i]??'')}</td>`).join('')}</tr>`).join('')}</tbody></table></section>`
      }).join('')
      const linked=new Set(workspace.pageAssets?.[page.id]||[])
      const images=assets.filter(a=>linked.has(a.id)&&!hidden.includes('asset-'+a.id)).map(a=>{
        const src=imageSrc(a.dataUrl||a.src||a._src)
        return `<figure class="custom-artboard-asset" style="${placement('asset-'+a.id)}">${src?`<img src="${esc(src)}" alt="${esc(a.caption||a.name||'Reference')}">`:'<div class="missing">Visual file unavailable</div>'}${a.caption||a.name?`<figcaption>${esc(a.caption||a.name)}</figcaption>`:''}</figure>`
      }).join('')
      return `<section class="sheet custom-artboard" style="page:${pageStyle}"><main>${boxes}${tables}${images}</main></section>`
    }
    return `<section class="sheet seville ${esc(preset)} layout-${layout}" style="page:${pageStyle}"><div class="seville-page-number">${index+1}</div><div class="seville-ruled-frame" style="--template-accent:${color('accent')};--template-rule:${color('line')};--template-wash:${color('wash')}">${sevilleTitleBlock(source,draft,page,settings,index,workspace.headerFields||{})}<main>${authoringReview}${factoryReview}${savedSamplePrint}${interactivePrint}${views}${drawing}${fabricCards}${colorwayPrint}${revisionPrint}${calloutRegister}${table.headers.length&&!['flats','artwork','patterns','colorways','measurements','construction'].includes(page.id)?display:''}${measurementKey}${customTables}${insertedBoxes}${media?`<div class="images">${media}</div>`:''}${(page.id==='flats'||page.id==='artwork')&&!media&&!drawing?'<div class="empty">No attached artwork or images for this page.</div>':''}<h2>PAGE NOTES &amp; INSTRUCTIONS</h2><p class="notes">${esc(settings.notes||'No additional instructions recorded.')}</p></main>${pageMarkerSvgMarkup(workspace.annotations?.[page.id])}</div><footer class="seville-footer">${printFooterLogo}<span>${title} · WORKING DRAFT / NOT FACTORY APPROVED</span></footer></section>`
  }).join('')
  // Continuations live after authored pages to preserve the user-defined
  // page order and the existing original-sheet positioning selectors. Each
  // fragment preserves its source page, box ID and 1-based row range.
  const overflows=enumerateWorkspaceOverflowPages(workspace,orderedPages,id=>techPackPageLayout(workspace,id))
    .filter(part=>!(workspace.hiddenObjects?.[part.sourcePageId]||[]).includes('box-'+part.boxId))
  const appendix=overflows.map((part,i)=>{
    const base=orderedPages.findIndex(p=>p.id===part.sourcePageId)+1
    const name=esc(part.title)
    const sourceRows=workspace.pageBoxes?.[part.sourcePageId]?.find(box=>String(box.id)===String(part.boxId))?.slot?.spreadsheetTable?.rows?.length??part.lastRowIndex
    return `<section class="sheet exo-table-overflow-sheet" data-source-page="${esc(part.sourcePageId)}" data-source-box="${esc(part.boxId)}" data-overflow-index="${part.index}" style="page:${esc(part.pageStyle)}"><div class="exo-overflow-pageno">${orderedPages.length+i+1}</div><div class="exo-overflow-frame"><header><strong>${name}</strong><span>CONTINUED FROM SOURCE PAGE ${base} / BOX ${esc(part.boxId)}</span></header><p>ROWS ${part.firstRowIndex}–${part.lastRowIndex} OF ${sourceRows} · PLATE ${part.index} / ${part.total}</p>${renderTechPackSpreadsheetTable(part.table,{showTitle:false})}<footer><strong>${esc(/^mikristian$/i.test(String(draft.brand||'').trim())?'':draft.brand||'')}</strong><span>TECHPACK · FACTORY SPECIFICATION CONTINUATION</span><b>${orderedPages.length+i+1}</b></footer></div></section>`
  }).join('')
  return `<!doctype html><html lang="en"><head><meta charset="utf-8><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — Tech Pack</title><style>
@page A4Portrait{size:A4 portrait;margin:12mm}@page A4Landscape{size:A4 landscape;margin:12mm}@page LetterPortrait{size:Letter portrait;margin:12mm}@page LetterLandscape{size:Letter landscape;margin:12mm}
${sevillePrintStyles}
${techPackSpreadsheetStyles()}
.exo-table-continued{display:block;font:800 8px Arial,sans-serif;color:#9c2631;padding:5px 0}.sheet.exo-table-overflow-sheet{font-family:Arial,sans-serif;background:#fff;padding:14px 22px 12px;max-width:825px;min-height:1050px;display:flex;flex-direction:column}.exo-overflow-pageno{text-align:right;height:30px;font-size:24px}.exo-overflow-frame{border:1.5px solid #111;flex:1;display:flex;flex-direction:column;padding:12px}.exo-overflow-frame>header{margin:0;border-bottom:2px solid #111;padding:9px 0;display:flex;flex-direction:column;gap:3px}.exo-overflow-frame>header strong{font-size:14px;letter-spacing:.05em}.exo-overflow-frame>header span{font-size:9px}.exo-overflow-frame>p{font-size:9px;font-weight:700}.exo-overflow-frame>.exo-spreadsheet-print-region{width:100%}.exo-overflow-frame>footer{border-top:2px solid #111;padding:8px 0;display:flex;align-items:center;justify-content:space-between;margin-top:auto;font-size:10px}@media print{.sheet.exo-table-overflow-sheet{padding:0!important;max-width:none!important;min-height:0!important;box-shadow:none!important}}
${printObjectPlacements}
${hiddenPrintRules}
  .sheet.custom-artboard{background:#fff;color:#111;min-height:1050px;padding:24px 27px 20px;display:flex;flex-direction:column;gap:0}.sheet.custom-artboard main{position:relative;padding:0;flex:1;min-height:0}.custom-artboard-box{box-sizing:border-box;overflow-wrap:anywhere;padding:10px;margin:0 0 12px}.custom-artboard-box strong{display:block;font-size:10px}.custom-artboard-box p{white-space:pre-wrap;font-size:10px}.custom-artboard-box .custom-artboard-slot-table{width:100%;margin:7px 0;font-size:9px}.custom-artboard-box .custom-artboard-slot-table th,.custom-artboard-box .custom-artboard-slot-table td{padding:4px;overflow-wrap:anywhere}.custom-artboard-slot-header{margin:8px 0;padding:8px;border-bottom:1px solid #111}.custom-artboard-table{margin:0 0 12px}.custom-artboard-table h2{margin:0 0 5px}.custom-artboard-asset{display:inline-block;vertical-align:top;margin:0 12px 12px 0;width:230px;max-width:100%}.custom-artboard-asset img{width:100%;max-height:240px;object-fit:contain}.custom-artboard-asset figcaption{font-size:9px}@media print{.sheet.custom-artboard{min-height:0!important;padding:0!important;box-shadow:none!important}}
*{box-sizing:border-box}body{margin:0;color:#263545;font:11px/1.5 Arial,Helvetica,sans-serif;background:#e8edf0}.sheet{break-after:page;background:#fff;max-width:1080px;min-height:850px;margin:24px auto;padding:34px 42px;display:flex;flex-direction:column;box-shadow:0 5px 25px #2232}.sheet:last-child{break-after:auto}.topline{font-size:9px;font-weight:800;display:flex;justify-content:space-between;border-top:5px solid #394e60;padding-top:15px;letter-spacing:.09em;color:#627280;gap:10px}.sheet.technical .topline{border-color:#2e6388}.sheet.minimal .topline{border-color:#9aa5ad}.sheet.dark header{background:#172530;color:white;padding:20px}.sheet.dark header p{color:#dae5ee}.eyebrow{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#80909e;margin:0}h1{font-size:29px;line-height:1.1;letter-spacing:-.035em;margin:8px 0}header{margin-top:31px}header>p:last-child{color:#8997a0;font-size:10px}.meta{margin:20px 0;display:grid;grid-template-columns:repeat(4,1fr);gap:10px;border-top:1px solid #d6dee5;border-bottom:1px solid #d6dee5;padding:13px 0}.meta span{font-size:9px;color:#8594a0;font-weight:700}.meta b{display:block;color:#334451;font-size:11px;margin-top:3px}main{flex:1;padding-top:20px}.drafting{margin:8px 0 18px;border:1px solid #d6dfe4;break-inside:avoid}.drafting h2{margin:0;background:#edf1f3;padding:8px 10px;font-size:10px}.drafting svg{width:100%;height:auto;max-height:420px;display:block}.render-images{margin:9px 0 16px;break-inside:avoid}.render-images>div{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.render-images figure{margin:0;border:1px solid #d6dfe4;padding:5px;background:#f8fafb}.render-images img{display:block;width:100%;height:160px;object-fit:contain}.render-images figcaption{text-align:center;font-size:9px;font-weight:700;margin-top:5px;color:#5a6973}table{width:100%;border-collapse:collapse;font:10px/1.4 Arial,sans-serif;table-layout:auto}th{background:#e9eef2;font-size:9px;font-weight:800;color:#374955;text-align:left}th,td{border:1px solid #d6dfe6;padding:8px;word-break:break-word;vertical-align:top}tr{break-inside:avoid}.images{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:12px 0}.images figure{border:1px solid #dae3e8;padding:12px;margin:0;break-inside:avoid}.images img{width:100%;height:220px;object-fit:contain}.images figcaption{font-size:10px;color:#768793;border-top:1px solid #e1e7ec;margin-top:10px;padding-top:8px}.missing,.empty{border:1px dashed #cdd7df;color:#8b9ca8;text-align:center;padding:34px;margin:12px 0}.notes{min-height:80px;border:1px solid #dce3e9;padding:12px;white-space:pre-wrap;color:#485f70}h2{font-size:10px;letter-spacing:.1em;margin-top:22px}footer{border-top:1px solid #d6dfe6;padding-top:12px;margin-top:auto;display:flex;align-items:center;justify-content:space-between;font-size:9px;color:#8b98a2;font-weight:700;gap:12px}@media print{body{background:white}.sheet{max-width:none!important;min-height:0!important;box-shadow:none;margin:0!important;padding:0!important}.images img{height:175px}a{color:inherit}}
  </style><style>.custom-spec{margin:14px 0;break-inside:avoid}.fabric-sheet{margin:14px 0;break-inside:avoid}.fabric-swatches{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.fabric-swatch-card{border:1px solid #d9e0e6;display:grid;grid-template-columns:76px 1fr;min-width:0;gap:9px;padding:7px;align-items:center}.fabric-chip{width:74px;height:65px;border:1px solid #aebec8;display:flex;align-items:flex-end;padding:5px;position:relative;overflow:hidden;print-color-adjust:exact;-webkit-print-color-adjust:exact}.fabric-chip img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.fabric-chip span{font-size:9px;color:#172e39;background:#fffc;padding:2px;z-index:1}.fabric-swatch-card strong,.fabric-swatch-card small{display:block;overflow-wrap:anywhere}.fabric-swatch-card small{color:#81939b}.fabric-swatch-card p{font-size:9px;color:#4b5d65;margin:5px 0 0}.fabric-photo-caption{font-size:8px!important;color:#75848f!important;overflow-wrap:anywhere}.authoring-review{break-inside:avoid;border:1px solid #c9d4dc;padding:11px;margin:6px 0 14px}.authoring-review h2{margin:0 0 8px}.authoring-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.authoring-check{border:1px solid #d5dfe5;padding:5px 7px;font-size:9px;display:flex;gap:5px;align-items:center}.authoring-check strong{flex:1;font-size:9px}.authoring-check small{font-size:8px;color:#687c8a}.authoring-check>span{font-weight:800}.authoring-review p{font-size:8px;color:#667985;margin:8px 0 0}
/* Complete factory plate enclosing all rows, with a page number above it. */
.sheet.seville{display:flex;flex-direction:column;padding:17px 22px 12px;box-sizing:border-box}
.sheet.seville .seville-page-number{height:29px;flex:none;text-align:right;font:500 25px/28px Arial,sans-serif;letter-spacing:-.06em;color:#111}
.sheet.seville .seville-ruled-frame{display:flex;flex-direction:column;flex:1;position:relative;border:1.5px solid #111;min-width:0}
.sheet.seville header.seville-block{margin:0 0 4px!important}
.sheet.seville .seville-grid{border-left:0;border-top:0;grid-auto-rows:minmax(27px,auto)}
.sheet.seville .seville-field:nth-child(5n){border-right:0}
.sheet.seville .seville-heading{border-left:0;border-right:0}
.sheet.seville main{padding:8px 10px 12px;flex:1}
.sheet.seville .seville-footer{margin:9px 0 0;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:5px;padding:0;border:0}
.sheet.seville .seville-footer strong{display:block;position:relative;min-width:175px;max-width:75%;text-align:center;line-height:1;padding:10px 33px;font-size:16px;background:#090909;color:white;border-radius:10px 4px 10px 4px;overflow:visible}
.sheet.seville .seville-footer strong:before,.sheet.seville .seville-footer strong:after{content:'';position:absolute;width:21px;height:21px;border-radius:50%;background:white;top:50%;transform:translateY(-50%)}
.sheet.seville .seville-footer strong:before{left:-12px}
.sheet.seville .seville-footer strong:after{right:-12px}
.sheet.seville .seville-footer span{font:700 7px/1.2 Arial,sans-serif;letter-spacing:.07em;text-align:center}
.sheet.seville .seville-footer-logo{display:block;width:207px;max-width:72%;max-height:56px;object-fit:contain;margin:0 auto}
.sheet.seville .seville-page-markup{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;mix-blend-mode:multiply;print-color-adjust:exact;-webkit-print-color-adjust:exact}
@media print{.sheet.seville{padding:0!important}.sheet.seville .seville-ruled-frame{break-inside:avoid}}
.sheet.seville .seville-ruled-frame{border-color:var(--template-rule,#111)}
.sheet.seville .seville-heading,.sheet.seville .seville-field b{background:var(--template-wash,#f8f8f8);border-color:var(--template-rule,#111)}
.sheet.seville.technical .seville-grid{border-top:4px solid var(--template-accent,#111)}
.sheet.seville.editorial .seville-heading{border-bottom:4px solid var(--template-accent,#111);padding:15px;text-align:left;align-items:start}
.sheet.seville.editorial .seville-heading strong{font-family:Georgia,serif;font-size:18px}
.sheet.seville.minimal .seville-heading{background:white;border-bottom:1px solid var(--template-rule,#111)}
.sheet.seville.dark .seville-heading{background:var(--template-accent,#111);color:white}
.sheet.seville.layout-square .drafting svg{aspect-ratio:1;object-fit:contain}
.sheet.seville.layout-gallery .images{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.sheet.seville.layout-specification th,.sheet.seville.layout-specification td{padding:5px}
.interactive-print{margin:12px 0;break-inside:avoid}.interactive-print h2{margin:0 0 8px}.interactive-print-view{display:block;width:min(100%,330px);height:330px;object-fit:contain;background:#e8ebee;border:1px solid var(--template-rule,#444);margin:0 auto 11px}
</style></head><body>${pages}${appendix}</body></html>`
}
