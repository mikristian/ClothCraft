// A private browser-local presentation of a canonical Studio Tech Pack.
// The caller must explicitly supply a pack AND an access grant to show its contents.
const KEY = 'exo.community.private-techpacks.v1';
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const copy = value => JSON.parse(JSON.stringify(value));
const validRole = role => ['owner','read','comment','edit'].includes(role);
const readLocal = () => {try { const value = JSON.parse(localStorage.getItem(KEY)||'{}'); return value && typeof value==='object'&&!Array.isArray(value)?value:{}; } catch{return {};} };
const saveLocal = value => {try {localStorage.setItem(KEY, JSON.stringify(value));} catch{/* in-memory demo only */}};
const label = (pack,index) => String(pack?.draft?.styleName || pack?.styleName || pack?.source?.project?.name || `Tech Pack ${index+1}`);
const packKey = (pack,index) => String(pack?.packId || pack?.id || `import-${index}`).slice(0,180);
const safeText = value => String(value??'').trim();
const time = () => new Date().toISOString();
function normalize(raw){
  return {notes:safeText(raw?.notes).slice(0,2000), status:safeText(raw?.status||'Working draft').slice(0,60), revisions:Array.isArray(raw?.revisions)?raw.revisions.slice(-30):[],comments:Array.isArray(raw?.comments)?raw.comments.slice(-100):[],collaborators:Array.isArray(raw?.collaborators)?raw.collaborators.slice(-30):[]};
}
/**
 * Demo access is an explicit viewer-scoped grant from the caller, never a share link or identity assertion.
 * Returned markup contains no pack details when access is missing, even when a pack was passed.
 */
export function createProfileTechPacks({creatorId='',techPacks=[],techPackAccess={},onOpenTechPack=()=>{},onUpdate=()=>{}}={}){
  const grants=techPackAccess && typeof techPackAccess==='object' ? techPackAccess : {};
  const authorized=Boolean(creatorId && grants.creatorId===creatorId && validRole(grants.role));
  const role=authorized?grants.role:'';
  const imported=authorized&&Array.isArray(techPacks)?techPacks.filter(x=>x && typeof x==='object'):[];
  let selected=0, notice='', draft={};
  const scope=String(creatorId).replace(/[^a-z0-9_-]/gi,'').slice(0,100);
  const getLocal=()=>readLocal()[scope]||{};
  let localState=getLocal();
  const canEdit=()=>role==='owner'||role==='edit';
  const canComment=()=>canEdit()||role==='comment';
  const item=()=>imported[selected];
  const itemKey=()=>packKey(item(),selected);
  const detail=()=>normalize(localState[itemKey()]);
  const editLocal=next=>{
    localState={...localState,[itemKey()]:normalize(next)};
    const all=readLocal(); all[scope]=localState;saveLocal(all);
    onUpdate({creatorId,packId:itemKey(),local:copy(localState[itemKey()]),connected:false});
  };
  function html(){
    if(!authorized) return '<section class="tp-private" aria-label="Private Tech Packs"><div class="tp-lock">PRIVATE WORKSPACE</div><h2>Tech Packs <span>↗</span></h2><p>Production specifications, factory notes and revisions require an explicit creator workspace access grant.</p><div class="tp-access-note">Locked · No public packs or collaborator details displayed</div></section>';
    if(!imported.length) return `<section class="tp-private" aria-label="Private Tech Packs"><div class="tp-lock">PRIVATE WORKSPACE · ${escapeHTML(role.toUpperCase())} ACCESS</div><h2>Tech Packs <span>↗</span></h2><p>No Tech Pack has been connected to this creator profile. Open a garment in Studio and connect its Tech Pack through the workspace integration.</p><div class="tp-access-note">Local concept · No server sharing or manufacturer invitations</div></section>`;
    const current=item(), data=detail(), revisions=Array.isArray(current?.revisions)?current.revisions:[], ownRevisions=data.revisions, comments=[...(Array.isArray(current?.comments)?current.comments:[]).map(c=>({...c,source:true})),...data.comments], collaborators=data.collaborators;
    return `<section class="tp-private" aria-label="Private Tech Packs"><div class="tp-heading"><div><div class="tp-lock">PRIVATE WORKSPACE · ${escapeHTML(role.toUpperCase())} ACCESS</div><h2>Tech Packs <span>↗</span></h2><p>Working drafts, saved versions, factory feedback and collaborator roles.</p></div><span class="tp-mode">${grants.connected?'Connected view · provider controlled':'LOCAL DEMO · THIS BROWSER ONLY'}</span></div><div class="tp-layout"><aside class="tp-pack-list" aria-label="Private Tech Pack selection">${imported.map((p,i)=>`<button type="button" data-tp-select="${i}" ${i===selected?'aria-current="true"':''}><strong>${escapeHTML(label(p,i))}</strong><small>${escapeHTML(p?.draft?.sku || 'SKU not assigned')} · ${escapeHTML((p?.revisions?.length||0)+' Studio revisions')}</small></button>`).join('')}</aside><div class="tp-detail"><div class="tp-summary"><div><small>SPECIFICATION · ${escapeHTML(itemKey())}</small><h3>${escapeHTML(label(current,selected))}</h3><p>${escapeHTML(current?.draft?.season||'Season unspecified')} · ${escapeHTML(data.status)}</p></div><div class="tp-actions"><button type="button" data-tp-open>Download JSON for Studio ↗</button>${canEdit()?'<button type="button" data-tp-save-version>Save local version</button>':''}</div></div><div class="tp-metrics"><span><strong>${revisions.length+ownRevisions.length}</strong>Versions</span><span><strong>${comments.length}</strong>Comments</span><span><strong>${collaborators.length}</strong>Local collaborators</span></div>${canEdit()?`<form data-tp-notes><label>Production notes<textarea name="notes" maxlength="2000" rows="3" placeholder="Fit review, construction requests, next sample feedback">${escapeHTML(data.notes)}</textarea></label><button type="submit">Save notes locally</button></form>`:`<div class="tp-note-read"><small>PRODUCTION NOTES</small><p>${escapeHTML(data.notes||'No local notes yet.')}</p></div>`}<div class="tp-subheading"><h4>Revision history</h4><small>Snapshots are saved locally · Studio revisions are read only</small></div><div class="tp-history">${[...revisions.map(r=>({...r,studio:true})),...ownRevisions].map(r=>`<article><strong>${escapeHTML(r.label||r.id||'Revision')}</strong><small>${escapeHTML(r.createdAt||'No date')} · ${r.studio?'Studio snapshot':'Local note snapshot'}</small></article>`).join('')||'<p>No versions saved yet.</p>'}</div><div class="tp-subheading"><h4>Section comments</h4><small>${canComment()?'Comment on the private pack':'Read access only'}</small></div>${canComment()?'<form data-tp-comment><label>Section<select name="section"><option value="overview">Overview</option><option value="measurements">Measurements</option><option value="construction">Construction</option><option value="materials">Materials / BOM</option><option value="samples">Sample feedback</option></select></label><label>Comment<textarea name="body" rows="2" maxlength="1000" required placeholder="Leave a factory instruction or question"></textarea></label><button type="submit">Add local comment</button></form>':''}<div class="tp-comments">${comments.map(c=>`<article><strong>${escapeHTML(c?.anchor?.section||c.section||'Overview')}</strong><p>${escapeHTML(c.body)}</p><small>${escapeHTML(c.author||'Local reviewer')} · ${escapeHTML(c.createdAt||'')} ${c.source?'· Studio':''}</small></article>`).join('')||'<p>No comments yet.</p>'}</div><div class="tp-subheading"><h4>Manufacturer collaborators</h4><small>Local role assignments · No invite is sent</small></div>${role==='owner'?'<form data-tp-collab><label>Manufacturer or collaborator name<input name="name" minlength="2" maxlength="80" required placeholder="Factory or patternmaker"></label><label>Access role<select name="role"><option value="read">Read only</option><option value="comment">Comment only</option><option value="edit">Edit draft</option></select></label><button type="submit">Add local collaborator</button></form>':''}<div class="tp-collaborators">${collaborators.map((c,i)=>`<div><span><strong>${escapeHTML(c.name)}</strong><small>${escapeHTML(c.role)} · Local only</small></span>${role==='owner'?`<button type="button" data-tp-remove="${i}" aria-label="Remove ${escapeHTML(c.name)}">Remove</button>`:''}</div>`).join('')||'<p>No local collaborators assigned.</p>'}</div><p class="tp-disclaimer">Private Tech Packs are never included in public portfolio links. These prototype role assignments do not grant access on another device. Real sharing requires a connected authenticated service.</p><div class="tp-notice" role="status">${escapeHTML(notice)}</div></div></div></section>`;
  }
  function click(target){
    if(target.dataset.tpSelect!==undefined){selected=Number(target.dataset.tpSelect);notice='';return true;}
    if(!authorized||!item())return false;
    if(target.hasAttribute('data-tp-open')){onOpenTechPack(item());notice='Opened via Studio callback. This profile did not publish any file.';return true;}
    if(target.hasAttribute('data-tp-save-version')&&canEdit()){
      const next=detail();next.revisions.push({id:`local-${Date.now()}`,label:`Local version ${next.revisions.length+1}`,createdAt:time(),notes:next.notes,sourceRevision:item()?.source?.project?.revision||null});editLocal(next);notice='Saved a local notes snapshot. Studio specifications remain unchanged.';return true;
    }
    if(target.dataset.tpRemove!==undefined&&role==='owner'){
      const next=detail();next.collaborators.splice(Number(target.dataset.tpRemove),1);editLocal(next);notice='Local collaborator removed.';return true;
    }
    return false;
  }
  function submit(form){
    if(!authorized||!item())return false;
    const data=new FormData(form), next=detail();
    if(form.matches('[data-tp-notes]')&&canEdit()){next.notes=safeText(data.get('notes')).slice(0,2000);editLocal(next);notice='Notes saved in this browser.';return true;}
    if(form.matches('[data-tp-comment]')&&canComment()){
      const body=safeText(data.get('body')).slice(0,1000); if(!body)return false;
      const section=['overview','measurements','construction','materials','samples'].includes(data.get('section'))?data.get('section'):'overview';
      next.comments.push({id:`local-comment-${Date.now()}`,anchor:{section,id:section,versionId:'local-draft'},body,author:'Local reviewer',createdAt:time()});editLocal(next);notice='Comment saved locally.';return true;
    }
    if(form.matches('[data-tp-collab]')&&role==='owner'){
      const name=safeText(data.get('name')).slice(0,80), roleName=data.get('role');
      if(name.length<2||!['read','comment','edit'].includes(roleName))return false;
      next.collaborators.push({name,role:roleName,createdAt:time()});editLocal(next);notice='Role recorded in local demo. No invitation sent.';return true;
    }
    return false;
  }
  return {html,click,submit,reload:()=>{localState=getLocal();},hasAccess:()=>authorized};
}
