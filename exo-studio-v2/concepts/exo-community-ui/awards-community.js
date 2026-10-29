// Awards and submissions concept. Every program and recognition shown is fictional demo content.
const KEY = 'exo.community.awards.drafts.v1';
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CATEGORIES = ['Garment Design','Pattern Engineering','Digital Fashion','Materials','Avatar & Character','Environments','Fashion Film'];
const CRITERIA = [
  ['01','Originality','A distinct creative perspective, thoughtful research and a memorable concept.'],
  ['02','Craft','Execution, construction quality and attention to technical detail.'],
  ['03','Communication','A clear presentation of the process, decisions and final work.'],
  ['04','Impact','A useful contribution to digital fashion, collaboration or creative culture.']
];
const PROGRAMS = [
  {id:'future-form',name:'Future Form',status:'Open',category:'Garment Design',edition:'Concept cycle 01',summary:'Experiment with silhouette, pattern making and constructed volume.',prompt:'A garment concept that changes the way a body is dressed.',accent:'form'},
  {id:'material-matters',name:'Material Matters',status:'Upcoming',category:'Materials',edition:'Concept cycle 02',summary:'Surface, drape, texture and unexpected uses of textile simulation.',prompt:'Translate a material experiment into a persuasive visual story.',accent:'material'},
  {id:'digital-identity',name:'Digital Identity',status:'Open',category:'Avatar & Character',edition:'Concept cycle 01',summary:'Explore clothing, body and identity across digital worlds.',prompt:'Design an avatar or wardrobe system with a clear point of view.',accent:'identity'},
  {id:'moving-image',name:'In Motion',status:'Upcoming',category:'Fashion Film',edition:'Concept cycle 02',summary:'Movement, art direction and new ways to present fashion in motion.',prompt:'Make a short visual concept centered on a digital garment.',accent:'motion'},
  {id:'process-archive',name:'Process / 001',status:'Archive',category:'Pattern Engineering',edition:'Archived concept brief',summary:'An example archived prompt exploring how a pattern becomes a garment.',prompt:'Show the steps from 2D pattern to dimensional construction.',accent:'archive'}
];
function readDrafts(){
  try {
    const value=JSON.parse(localStorage.getItem(KEY)||'[]');
    return Array.isArray(value)?value.filter(x=>x && typeof x==='object').slice(0,100):[];
  } catch {return [];}
}
function saveDrafts(drafts){try{localStorage.setItem(KEY,JSON.stringify(drafts));return true;}catch{return false;}}
function safeImage(value){
  const v=String(value||'').trim();
  return (/^(https?:\/\/|\.\.?\/|[a-z0-9_-]+\/[a-z0-9_./-]+)/i.test(v) && !/["'<>\x00-\x1f]/.test(v))?v:'';
}
function entryCard(item,index){
  return '<article class="exa-entry"><button type="button" class="exa-entry-visual" data-action="project" data-index="'+index+'" aria-label="Open '+escape(item.title||'project')+'">'+(safeImage(item.image)?'<img src="'+escape(item.image)+'" alt="'+escape(item.alt||item.title||'Project image')+'" loading="lazy">':'<span class="exa-entry-fallback">EXO / STUDY</span>')+'<span class="exa-entry-number">'+String(index+1).padStart(2,'0')+'</span></button><div class="exa-entry-caption"><div><small>'+escape(item.category||'Creative work')+'</small><h3>'+escape(item.title||'Untitled study')+'</h3></div><button type="button" data-action="profile" data-index="'+index+'">by '+escape(item.creator||'EXO Creator')+' ↗</button></div></article>';
}
function programCard(p){
  return '<article class="exa-program"><div class="exa-program-art exa-art-'+p.accent+'"><span>EXO / CREATIVE PROGRAM</span><strong>'+escape(p.name)+'</strong><i>CONCEPT SERIES</i></div><div class="exa-program-body"><div class="exa-program-top"><span class="exa-status">'+escape(p.status)+' · DEMO</span><span>'+escape(p.edition)+'</span></div><h3>'+escape(p.name)+'</h3><p>'+escape(p.summary)+'</p><div class="exa-program-footer"><span>'+escape(p.category)+'</span><button type="button" data-action="details" data-id="'+escape(p.id)+'">Explore brief ↗</button></div></div></article>';
}

/**
 * Mount a self-contained, local-only awards concept.
 * @param {HTMLElement} root
 * @param {{projects?:Array,onOpenProject?:(project:any)=>void,onProfile?:(name:string,project:any)=>void}} options
 * @returns {()=>void} unregister events and remove modal
 */
export function mountAwardsPage(root,{projects=[],onOpenProject=()=>{},onProfile=()=>{}}={}){
  if(!root)return ()=>{};
  let tab='Open',category='All',modal=null,notice='',lastTrigger=null,disposed=false;
  let drafts=readDrafts();
  const items=(Array.isArray(projects)?projects:[]).filter(x=>x&&typeof x==='object').slice(0,12);
  const tabs=['Open','Upcoming','Featured','Archive'];
  function programDetail(p){
    return '<div class="exa-brief"><div class="exa-brief-meta">'+escape(p.status)+' · '+escape(p.edition)+' · FICTIONAL DEMO</div><h2 id="exa-dialog-title">'+escape(p.name)+'</h2><p>'+escape(p.prompt)+'</p><h3>Suggested submission materials</h3><p>Cover image, project overview, process documentation and the relevant EXO project reference. Drafts remain in this browser.</p><button type="button" class="exa-primary" data-action="submit-for" data-id="'+escape(p.id)+'">Create local draft ↗</button></div>';
  }
  function form(p){
    return '<form class="exa-submit-form" id="exa-draft-form"><span class="exa-kicker">LOCAL SUBMISSION WORKSPACE</span><h2 id="exa-dialog-title">Create a submission draft</h2><p>This is a preview. No entries are sent, judged, published or entered into a live competition.</p><label>Competition<select name="program" required>'+PROGRAMS.filter(x=>x.status==='Open').map(x=>'<option value="'+escape(x.id)+'" '+(x.id===p?.id?'selected':'')+'>'+escape(x.name)+'</option>').join('')+'</select></label><label>Project title<input name="title" maxlength="90" placeholder="Name your project" required></label><label>Designer or studio<input name="creator" maxlength="90" placeholder="Your name or studio" required></label><label>Category<select name="category">'+CATEGORIES.map(x=>'<option>'+escape(x)+'</option>').join('')+'</select></label><label>Project overview<textarea name="description" maxlength="1500" rows="4" placeholder="Explain the idea, process and outcome…" required></textarea></label><label>Project reference or URL <small>(optional)</small><input name="reference" maxlength="350" placeholder="Project name or link"></label><p class="exa-form-note">Saving stores a private draft on this device using browser storage. It is not an official submission.</p><button class="exa-primary" type="submit">Save draft locally</button></form>';
  }
  function openModal(content){
    lastTrigger=document.activeElement;
    modal=document.createElement('div');
    modal.className='exa-modal-layer';
    modal.innerHTML='<div class="exa-modal-shade" data-action="close"></div><section class="exa-modal" role="dialog" aria-modal="true" aria-labelledby="exa-dialog-title"><button class="exa-close" data-action="close" type="button" aria-label="Close dialog">×</button>'+content+'</section>';
    root.appendChild(modal);
    root.querySelector('.exa-close')?.focus();
  }
  function closeModal(){modal?.remove();modal=null;lastTrigger?.focus?.();}
  function render(){
    if(disposed)return;
    const shown=PROGRAMS.filter(p=>(tab==='Featured'?p.status==='Open':p.status===tab) && (category==='All'||p.category===category));
    const featured=items.filter(p=>category==='All'||p.category===category).slice(0,6);
    root.innerHTML='<section class="exa-root"><div class="exa-heading"><div><span class="exa-kicker">EXO / COMMUNITY / CREATIVE PROGRAMS</span><h1>Awards &<br><em>Challenges.</em></h1><p>Creative briefs, community showcases and a place to develop your next submission.</p></div><div class="exa-heading-aside"><span>CONCEPT / 001</span><p>An exploration of future competitions and recognition within the EXO creative community.</p><button type="button" class="exa-primary" data-action="new">Create submission draft ↗</button></div></div><div class="exa-disclosure">CONCEPT PREVIEW · All programs, prompts and featured works are examples. No real competition is accepting entries or issuing awards here.</div><nav class="exa-tabs" aria-label="Award categories">'+tabs.map(t=>'<button type="button" data-tab="'+t+'" class="'+(tab===t?'selected':'')+'" aria-current="'+(tab===t?'page':'false')+'">'+t+'</button>').join('')+'</nav><div class="exa-toolbar"><span>'+escape(tab==='Featured'?'Featured creative studies':tab+' concepts')+'</span><label>Discipline <select id="exa-category" aria-label="Filter by discipline"><option>All</option>'+CATEGORIES.map(x=>'<option '+(category===x?'selected':'')+'>'+escape(x)+'</option>').join('')+'</select></label></div>'+
      (tab==='Featured'?'<div class="exa-featured-note"><span>CURATED INSPIRATION / DEMO</span><h2>Work worth studying.</h2><p>These are sample projects from the EXO library, presented as inspiration. No project is described as an award recipient.</p></div>'+(featured.length?'<div class="exa-entries">'+featured.map(p=>entryCard(p,items.indexOf(p))).join('')+'</div>':'<div class="exa-empty">No projects match this discipline in the demo library.</div>'):'<div class="exa-programs">'+shown.map(programCard).join('')+'</div>'+(shown.length?'':'<div class="exa-empty">No concepts match this discipline in the selected section.</div>'))+
      '<section class="exa-section"><div class="exa-section-head"><div><span class="exa-kicker">EVALUATION FRAMEWORK / PROPOSED</span><h2>What could make a great entry?</h2></div><p>A transparent set of judging criteria for a future program. These have not been applied to any work.</p></div><div class="exa-criteria">'+CRITERIA.map(([n,title,body])=>'<article><span>'+n+'</span><h3>'+title+'</h3><p>'+body+'</p></article>').join('')+'</div></section>'+
      '<section class="exa-section exa-drafts"><div class="exa-section-head"><div><span class="exa-kicker">YOUR PRIVATE WORKSPACE</span><h2>Submission drafts</h2></div><button type="button" data-action="new">New draft +</button></div>'+(drafts.length?'<div class="exa-draft-grid">'+drafts.map(d=>'<article><span>LOCAL DRAFT · '+escape(d.category)+'</span><h3>'+escape(d.title)+'</h3><p>'+escape(d.description)+'</p><small>'+escape(d.creator)+' · '+escape(d.programName)+'</small><button type="button" data-action="delete" data-id="'+escape(d.id)+'" aria-label="Delete draft '+escape(d.title)+'">Delete draft</button></article>').join('')+'</div>':'<p class="exa-empty">No drafts yet. Start a project submission outline and save it privately in this browser.</p>')+'</section><p class="exa-notice" role="status" aria-live="polite">'+escape(notice)+'</p></section>';
  }
  function click(event){
    if(event.target.classList?.contains('exa-modal-shade')){closeModal();return;}
    const el=event.target.closest('button');
    if(!el||!root.contains(el))return;
    const {action,id,tab:next,index}=el.dataset;
    if(next){tab=next;category='All';render();return;}
    if(action==='new'){openModal(form());return;}
    if(action==='details'){const p=PROGRAMS.find(x=>x.id===id);if(p)openModal(programDetail(p));return;}
    if(action==='submit-for'){const p=PROGRAMS.find(x=>x.id===id);closeModal();openModal(form(p));return;}
    if(action==='close'){closeModal();return;}
    if(action==='project'){const p=items[Number(index)];if(p)onOpenProject(p);return;}
    if(action==='profile'){const p=items[Number(index)];if(p)onProfile(p.creator||'EXO Creator',p);return;}
    if(action==='delete'){drafts=drafts.filter(d=>d.id!==id);saveDrafts(drafts);notice='Local draft deleted.';render();}
  }
  function change(event){if(event.target.id==='exa-category'){category=event.target.value;render();}}
  function submit(event){
    if(event.target.id!=='exa-draft-form')return;
    event.preventDefault();
    const data=new FormData(event.target),program=PROGRAMS.find(p=>p.id===data.get('program'));
    if(!program||program.status!=='Open')return;
    const draft={id:'draft-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),program:program.id,programName:program.name,title:String(data.get('title')||'').trim().slice(0,90),creator:String(data.get('creator')||'').trim().slice(0,90),category:String(data.get('category')||'').slice(0,90),description:String(data.get('description')||'').trim().slice(0,1500),reference:String(data.get('reference')||'').trim().slice(0,350)};
    if(!draft.title||!draft.creator||!draft.description)return;
    drafts=[draft,...drafts].slice(0,100);const saved=saveDrafts(drafts);
    closeModal();notice=saved?'Draft saved in this browser. Nothing was submitted.':'Draft kept in this page for now; browser storage is unavailable.';render();
  }
  function keydown(event){
    if(!modal)return;
    if(event.key==='Escape'){closeModal();return;}
    if(event.key==='Tab'){
      const focusable=[...modal.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled])')];
      if(!focusable.length)return;
      const first=focusable[0],last=focusable[focusable.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  }
  root.addEventListener('click',click);root.addEventListener('change',change);root.addEventListener('submit',submit);document.addEventListener('keydown',keydown);render();
  return ()=>{disposed=true;root.removeEventListener('click',click);root.removeEventListener('change',change);root.removeEventListener('submit',submit);document.removeEventListener('keydown',keydown);closeModal();};
}
