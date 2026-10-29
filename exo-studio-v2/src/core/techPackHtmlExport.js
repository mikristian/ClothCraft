// Portable *read-only* digital tech pack. It may be hosted as a static page,
// but hosting alone DOES NOT add ACLs, realtime edits, or manufacturer accounts.
// Never include this file in a public marketplace without explicit consent.
import { buildTraditionalTechPackHTML, createTechPackDraft } from './digitalTechPack.js'
import { referenceAnnotationPercentPosition } from './referenceAnnotationPosition.js'

const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => (
  {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]
))
const safeImage = value => typeof value === 'string'
  && /^data:image\/(?:png|jpeg|webp);base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/i.test(value)
  ? value : null
const printableValue = value => value == null || value === '' ? 'Not supplied' : String(value)
const tiny = value => escapeHTML(printableValue(value))
const time = value => value ? escapeHTML(String(value)) : 'Not supplied'

export function buildPortableTechPackHTML(project, current, {versionId}={}) {
  const state=createTechPackDraft(project,current)
  const revision=versionId ? state.revisions.find(item=>item.id===versionId) : null
  if(versionId&&!revision)throw new Error('Unknown Tech Pack version')
  const draft=revision?.spec||state.draft
  const source=revision?.source||state.source
  const title=escapeHTML(draft.styleName||source.project?.name||'Garment Tech Pack')
  const printed=buildTraditionalTechPackHTML(project,state,{versionId})
  const photos=(Array.isArray(draft.references)?draft.references:[]).slice(0,80).map((item,index)=>{
    const src=safeImage(item.dataUrl||item.src)
    if(!src)return ''
    const markers=(Array.isArray(item.annotations)?item.annotations:Array.isArray(item.callouts)?item.callouts:[]).slice(0,60).map(mark=>{
      const position=referenceAnnotationPercentPosition(mark)
      return position?`<div class="callout" style="left:${position.left}%;top:${position.top}%;" title="${tiny(mark.text)}"><b>↗</b><span>${tiny(mark.text)}</span></div>`:''
    }).join('')
    return `<figure><div class="photo"><img alt="${tiny(item.caption||item.name||'Reference image '+(index+1))}" src="${src}">${markers}</div>
      <figcaption><b>${tiny(item.caption||item.name||'Reference '+(index+1))}</b><span>${tiny(item.category||'Reference')}${item.patternId?` · Pattern ${tiny(item.patternId)}`:''}</span>
      ${item.notes?`<p>${tiny(item.notes)}</p>`:''}</figcaption></figure>`
  }).filter(Boolean)
  const listItems=(records,render,empty) => records.length
    ? records.map(render).join('')
    : `<p class="empty">${empty}</p>`
  const comments=(Array.isArray(state.comments)?state.comments:[]).filter(entry=>!versionId||entry.anchor?.versionId===versionId||entry.anchor?.versionId==='working-draft')
  const samples=(Array.isArray(state.samples)?state.samples:[]).filter(entry=>!versionId||entry.versionId===versionId)
  const changes=state.revisions.map(r=>{
    const name=r.manufacturerId?`Manufacturer release · ${r.manufacturerId}`:'Draft version'
    return `<li><b>${tiny(r.label||r.id)}</b><span>${tiny(name)} · ${time(r.createdAt)} · ${tiny(r.author)}</span><small>Garment source revision ${tiny(r.source?.project?.revision)}</small></li>`
  })
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive">
<title>${title} · EXO Digital Tech Pack</title>
<style>
:root{color-scheme:dark;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
*{box-sizing:border-box}body{background:#111215;color:#ededf0;margin:0;line-height:1.55}
.bar{position:sticky;top:0;z-index:10;background:#191b20f5;border-bottom:1px solid #32353c;padding:15px clamp(16px,4vw,64px);display:flex;gap:20px;align-items:center;justify-content:space-between;flex-wrap:wrap}
.brand{letter-spacing:.15em;font-size:12px;font-weight:750}.badge{border:1px solid #605b79;border-radius:30px;padding:5px 12px;color:#d5caff;font-size:11px}
nav{display:flex;gap:16px;flex-wrap:wrap}nav a{color:#c2c4cd;text-decoration:none;font-size:12px}nav a:hover{text-decoration:underline;color:white}
main{max-width:1180px;margin:auto;padding:36px clamp(16px,4vw,54px) 90px}h1{font-size:clamp(28px,5vw,48px);letter-spacing:-.055em;margin:.3em 0}h2{font-size:22px;margin:0 0 15px}section{margin:38px 0;scroll-margin-top:130px}header p,.subtle{color:#aaaab8}
.lead{background:#202127;border:1px solid #3b3d45;border-radius:18px;padding:24px}
.meta{display:flex;gap:12px;flex-wrap:wrap;margin-top:20px}.meta span{border:1px solid #454751;border-radius:10px;padding:10px 14px;font-size:12px}
.panel{background:#1b1c22;border:1px solid #373940;border-radius:14px;padding:22px}
.photos{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:18px}
figure{margin:0;border:1px solid #41434e;background:#25262d;border-radius:12px;overflow:hidden}
.photo{position:relative}.photo img{display:block;width:100%;aspect-ratio:4/3;object-fit:contain;background:#101114}
.callout{position:absolute;transform:translate(-6px,-6px);max-width:180px;pointer-events:none}
.callout b{color:#1d162e;background:#ded1ff;padding:3px 7px;border-radius:50%;box-shadow:0 2px 10px #0009}
.callout span{display:block;background:#191a1fee;color:white;border:1px solid #a69ec0;font-size:11px;padding:4px 7px;border-radius:6px;overflow-wrap:anywhere}
figcaption{padding:12px;font-size:12px}figcaption b,figcaption span{display:block}figcaption span,.empty{color:#a8abb6}figcaption p{white-space:pre-wrap}
article{padding:17px 0;border-bottom:1px solid #3b3d46}article strong,article small{display:block}article small{color:#aaaaba}article p{white-space:pre-wrap;overflow-wrap:anywhere;margin:8px 0}
ol{padding-left:18px}li{padding:12px 0;border-bottom:1px solid #3b3d46}li b,li span,li small{display:block}li span,li small{color:#b8bac3;font-size:12px}
.document{width:100%;height:80vh;min-height:680px;max-height:1200px;border:1px solid #50535c;background:white;border-radius:9px}
footer{padding:32px 16px;color:#a7a8b1;text-align:center;border-top:1px solid #32343a;font-size:12px}
@media(max-width:600px){.bar{position:static}nav{overflow:auto;white-space:nowrap}.panel,.lead{padding:15px}.document{height:560px;min-height:560px}}
@media print{.bar,nav{display:none}body{background:white;color:black}.panel,.lead{background:white;color:black}iframe{height:90vh}}
</style></head><body>
<div class="bar"><div class="brand">EXO / PRODUCT DEVELOPMENT <span class="badge">Exported snapshot · not live</span></div>
<nav aria-label="Tech Pack contents"><a href="#overview">Overview</a><a href="#factory-document">Factory PDF layout</a><a href="#references">References</a><a href="#sampling">Sampling</a><a href="#comments">Comments</a><a href="#history">History</a></nav></div>
<main><header id="overview" class="lead"><span class="subtle">DIGITAL PRODUCT SPECIFICATION / PRIVATE EXPORT</span>
<h1>${title}</h1><p>Standalone HTML export from EXO. This file is a read-only snapshot, not an access-controlled document or a live editing service. Treat it as confidential; do not publish proprietary specifications publicly.</p>
<div class="meta"><span>Style SKU: ${tiny(draft.sku)}</span><span>Season: ${tiny(draft.season)}</span><span>Version: ${tiny(revision?.id||'Current draft')}</span><span>Factory: ${tiny(revision?.manufacturerId||draft.factory)}</span><span>Garment source: ${tiny(source.project?.revision)}</span></div>
</header>
<section id="factory-document"><h2>Traditional technical specification</h2><p class="subtle">The same specification view used for Print / Save PDF in the EXO app.</p>
<iframe class="document" title="Traditional manufacturing tech pack pages" sandbox="" loading="eager" srcdoc="${escapeHTML(printed)}"></iframe>
</section>
<section id="references"><h2>Visual and pattern references</h2><div class="photos">${listItems(photos,entry=>entry,'No approved photos in this snapshot.')}</div></section>
<section id="sampling"><h2>Sample rounds and fit feedback</h2><div class="panel">${listItems(samples,s=>`<article><strong>${tiny(s.name||'Round '+s.round)} · ${tiny(s.status)}</strong><small>${tiny(s.manufacturer)} · ${time(s.createdAt)} · ${tiny(s.versionId)}</small><p>${tiny(s.notes)}</p></article>`,'No sample rounds recorded.')}</div></section>
<section id="comments"><h2>Development discussion</h2><div class="panel">${listItems(comments,c=>`<article><strong>${tiny(c.author)} · ${tiny(c.anchor?.section)} · ${tiny(c.status)}</strong><small>${time(c.createdAt)} · ${tiny(c.anchor?.versionId)}</small><p>${tiny(c.body)}</p></article>`,'No comments included.')}</div></section>
<section id="history"><h2>Revision history</h2><div class="panel"><ol>${listItems(changes,entry=>entry,'No revisions saved.')}</ol></div></section>
</main><footer>EXO Sample 3D · Not factory certified. Verify final specifications, manufacturing permissions and physical samples independently.</footer>
</body></html>`
}

/** Safe to offer as a marketplace listing draft: absolutely no patterns/POM,
 * supplier costs, manufacturing comments or release content are exported. */
export function buildMarketplaceTechPackListing(project, current) {
  const state=createTechPackDraft(project,current)
  return {format:'exo-marketplace-listing-draft',schemaVersion:1,
    title:String(state.draft?.styleName||project?.name||'Garment'),
    category:'Tech Packs',description:'Private tech pack available by explicit creator permission.',
    visibility:'private',license:'not-granted',requiresExplicitPublication:true,
    technicalDataIncluded:false,sourceProjectId:null}
}
