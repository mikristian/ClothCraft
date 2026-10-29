// EXO Community designer portfolio concept. All social data is browser-local demo state.
import { createProfileTechPacks } from './techpack-profile.js';
const STORAGE = 'exo-community-designer-profiles-v1';
const SOCIAL_STORAGE = 'exo.community.social.v1';
const SAMPLE = [
  {id:'exo-studio',name:'EXO Studio',role:'Digital garment & design research',brand:'EXO · Studio work',location:'',bio:'Project studies in digital garments, textile surfaces, pattern drafting and architectural environments from the EXO archive.',tags:['Garments','Materials','Development'],color:'#c6c3b8'},
  {id:'mikristian-lab',name:'MIKRISTIAN LAB',handle:'mikristian',role:'Fashion & architectural studies',brand:'MIKRISTIAN · Design research',location:'',bio:'Garment and architectural concepts from the MIKRISTIAN project archive, exploring silhouette, construction and scale.',tags:['Garments','Architecture','Concepts'],color:'#858780'},
  {id:'xtended-studio',name:'XTENDED Studio',handle:'xtended',role:'Digital environments & spatial studies',brand:'XTENDED · Museum project',location:'',bio:'Lighting, studio and gallery environment renders from the XTENDED project archive.',tags:['Scenes','Environments','3D'],color:'#aaa9a4'}
];
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const slug = value => String(value ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'designer';
const imageURL = value => {
  if (typeof value !== 'string' || !value.trim()) return '';
  const v = value.trim();
  // Owner-selected Studio screenshots are resized and encoded as raster WebP
  // in the current tab. Allow only bounded base64 raster images; never allow
  // SVG/data:text or arbitrary data URLs into a public portfolio image tag.
  if (v.length <= 5_000_000 && /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(v)) return v;
  if (/^(https?:\/\/|\.\.?\/|\/[^/]|[a-z0-9_-]+\/)/i.test(v) && !/[\u0000-\u001f"'<>]/.test(v)) return v;
  return '';
};
const load = () => {
  try { const v = JSON.parse(localStorage.getItem(STORAGE) || '{}'); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; }
  catch { return {}; }
};
const persist = state => { try { localStorage.setItem(STORAGE,JSON.stringify(state)); } catch { /* Offline demo works in memory. */ } };
const socialSaves = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(SOCIAL_STORAGE) || '{}')?.saves;
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  } catch { return {}; }
};
const projectCreator = project => String(project?.creator || project?.designer || project?.author || 'EXO CREATOR').trim();
const displayPhoto = (project,klass='') => {
  const src = imageURL(project?.image);
  return src ? `<img class="${klass}" src="${esc(src)}" alt="${esc(project?.alt || project?.title || 'Portfolio work')}" loading="lazy">` : `<span class="dp-photo-placeholder ${klass}" aria-hidden="true"><span>EXO / ${esc(project?.category || 'STUDY')}</span><strong>${esc(project?.title || 'Untitled study')}</strong></span>`;
};
const initials = name => String(name || 'EX').split(/\s+/).slice(0,2).map(part => part[0] || '').join('').toUpperCase();

/**
 * Mount a self-contained demo designer portfolio into a container.
 * @param {HTMLElement} container
 * @param {{projects?:Array,creatorId?:string,handle?:string,onOpenProject?:(project)=>void,onNavigate?:(page)=>void}} options
 * @returns {()=>void} destroy function (also available as destroy.destroy()).
 */
export function mountDesignerProfiles(container,{projects=[],onOpenProject=()=>{},onNavigate=()=>{},creatorId,handle,techPacks=[],techPackAccess={},onOpenTechPack=()=>{},onTechPackUpdate=()=>{}}={}) {
  if (!(container instanceof HTMLElement)) throw new TypeError('Designer profile container must be an HTML element');
  const works = Array.isArray(projects) ? projects.filter(x => x && typeof x === 'object') : [];
  const known = [...SAMPLE];
  for (const project of works) {
    const name = projectCreator(project);
    if (!known.some(creator => creator.name.toLowerCase() === name.toLowerCase())) known.push({id:slug(name),name,role:'Independent creator',brand:'EXO Community portfolio',location:'',bio:'A collection of creative projects shared in the EXO concept community.',tags:[],color:'#aeb3a9'});
  }
  const lookup = name => known.find(c => c.id === slug(name) || c.handle === slug(name) || c.name.toLowerCase() === String(name).toLowerCase());
  let current = lookup(creatorId || handle) || (creatorId || handle ? known.find(c=>c.id === slug(creatorId || handle)) : null) || known[0];
  let tab = 'collections';
  let openCollection = '';
  let db = load();
  let editing = false;
  let notice = '';
  let creatorFilter = 'trending';
  let creatorSearch = '';
  let showDirectory = !(creatorId || handle);
  let privatePacks=createProfileTechPacks({creatorId:current.id,techPacks,techPackAccess,onOpenTechPack,onUpdate:onTechPackUpdate});
  const resetTechPacks=()=>{privatePacks=createProfileTechPacks({creatorId:current.id,techPacks,techPackAccess,onOpenTechPack,onUpdate:onTechPackUpdate});};
  const creatorWorks = creator => works.filter(p => slug(projectCreator(p)) === slug(creator.name));
  const getProfile = creator => db[creator.id] && typeof db[creator.id] === 'object' ? db[creator.id] : {};
  const change = (key,value) => { db[current.id] = {...getProfile(current),[key]:value}; persist(db); };
  const number = (n) => new Intl.NumberFormat('en-US').format(n);
  const creatorScore = creator => creatorWorks(creator).length;
  const directory = () => {
    const matching = known.filter(c => [c.name,c.role,c.brand,...c.tags].join(' ').toLowerCase().includes(creatorSearch.toLowerCase()));
    if (creatorFilter === 'top') return matching.sort((a,b)=>creatorScore(b)-creatorScore(a)||a.name.localeCompare(b.name));
    if (creatorFilter === 'following') return matching.filter(c=>Boolean(getProfile(c).following));
    if (creatorFilter === 'new') return matching.reverse();
    return matching.sort((a,b)=>Number(Boolean(getProfile(b).following))-Number(Boolean(getProfile(a).following))||creatorScore(b)-creatorScore(a)||a.name.localeCompare(b.name));
  };
  const creatorCard = creator => {
    const portfolio = creatorWorks(creator);
    const sample = portfolio[0];
    const following = Boolean(getProfile(creator).following);
    return `<article class="dp-directory-card"><button type="button" class="dp-directory-open" data-creator="${esc(creator.id)}" aria-label="View ${esc(creator.name)} portfolio"><span class="dp-directory-art" style="--dp-accent:${esc(creator.color)}">${sample?displayPhoto(sample):`<span class="dp-directory-monogram">${esc(initials(creator.name))}</span>`}</span><span class="dp-directory-body"><span class="dp-directory-title"><strong>${esc(creator.name)}</strong><span aria-hidden="true">↗</span></span><small>${esc(creator.role)}</small><span class="dp-directory-meta">${number(portfolio.length)} works · Concept profile</span></span></button><button type="button" class="dp-directory-follow" data-follow-creator="${esc(creator.id)}" aria-pressed="${following}">${following?'Following ✓':'+ Follow'}</button></article>`;
  };
  function projectCard(project,index) {
    return `<button type="button" class="dp-project" data-project="${index}" aria-label="View ${esc(project.title || 'untitled project')}"><span class="dp-project-image">${displayPhoto(project)}</span><span class="dp-project-bottom"><span><small>${esc(project.category || 'PROJECT')}</small><strong>${esc(project.title || 'Untitled project')}</strong></span><span class="dp-card-arrow" aria-hidden="true">↗</span></span></button>`;
  }
  function render() {
    if (showDirectory) {
      container.classList.add('dp-root');
      container.innerHTML = `<section class="dp-shell dp-directory-landing" aria-label="Discover creator directory local demo"><div class="dp-topline"><span><i aria-hidden="true"></i> EXO / DISCOVER / CREATORS <em>LOCAL CONCEPT</em></span><button type="button" data-nav="explore">← DISCOVER</button></div><header class="dp-directory-hero"><span class="dp-eyebrow">DISCOVER / COLLABORATE / CREATE</span><h1>Creators shaping<br>what comes next<span>.</span></h1><p>Explore digital fashion designers, studios, and 3D artists through their project portfolios. Accounts, rankings, and follows are local prototype examples.</p><div class="dp-directory-hero-footer"><span>${number(known.length)} sample creators</span><span>Portfolios / 3D / Materials / Fashion</span></div></header>${directoryMarkup()}<footer class="dp-footer"><span>EXO DISCOVER / CREATOR DIRECTORY</span><span>LOCAL DEMO · NO VERIFIED IDENTITIES OR LIVE INQUIRIES</span></footer><div class="dp-notice" role="status" aria-live="polite">${esc(notice)}</div></section>`;
      return;
    }
    const mine = creatorWorks(current);
    const info = getProfile(current);
    const followed = Boolean(info.following);
    // Explore owns its saves; read them on every render so route changes never show stale data.
    const exploreSaves = socialSaves();
    const legacySaves = Array.isArray(db._saved) ? db._saved : [];
    const saved = works.filter(project => Boolean(exploreSaves[String(project.id)]) || legacySaves.includes(String(project.id)));
    const featured = mine;
    const cover = featured[0];
    container.classList.add('dp-root');
    container.innerHTML = `<section class="dp-shell" aria-label="Designer portfolio concept">
      <div class="dp-topline"><span><i aria-hidden="true"></i> EXO / CREATIVE COMMUNITY <em>LOCAL CONCEPT</em></span><button type="button" data-directory>← ALL CREATORS</button></div>
      <div class="dp-cover ${cover?'has-work':'is-unpublished'}" style="--dp-accent:${esc(current.color)}"><div class="dp-cover-photo">${cover?displayPhoto(cover):'<span class="dp-cover-empty" aria-hidden="true"><span>EXO / CREATOR DIRECTORY</span><strong>Work in progress.</strong><small>Portfolio images appear when this creator has archived projects.</small></span>'}</div><div class="dp-cover-shade"></div><span class="dp-cover-tag">CREATOR PORTFOLIO / ${esc(current.name)}</span><span class="dp-cover-index">${String(known.indexOf(current)+1).padStart(2,'0')} / ${String(known.length).padStart(2,'0')}</span></div>
      <header class="dp-identity"><div class="dp-avatar" style="--dp-accent:${esc(current.color)}">${cover && imageURL(cover.image) ? displayPhoto(cover) : `<span>${esc(initials(current.name))}</span>`}</div><div class="dp-person"><p class="dp-overline">DESIGNER PROFILE <span>· UNVERIFIED DEMO</span></p><h1>${esc(current.name)}</h1><p class="dp-role">${esc(current.role)} <span>· ${esc(current.brand)}</span></p>${current.location?`<p class="dp-location">⌖ ${esc(current.location)}</p>`:''}<span class="dp-profile-status">Concept portfolio · Identity unverified</span></div><div class="dp-actions"><button class="dp-follow ${followed?'is-following':''}" type="button" data-follow aria-pressed="${followed}">${followed?'✓ Following':'+ Follow'}</button><button class="dp-share" type="button" data-share>Share profile ↗</button><button class="dp-inquiry" type="button" data-inquiry>Commission inquiry ↗</button></div></header>
      <div class="dp-info"><div class="dp-bio"><p>${esc(typeof info.bio==='string' ? info.bio : current.bio)}</p><div class="dp-tags">${current.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div><button class="dp-text-link" type="button" data-edit>${editing?'Close bio editor':'Edit bio · local demo'}</button>${editing?`<form class="dp-bio-form" data-bio-form><label for="dp-bio-editor">PROFILE BIO</label><textarea id="dp-bio-editor" name="bio" maxlength="360" rows="4">${esc(typeof info.bio==='string' ? info.bio : current.bio)}</textarea><div class="dp-bio-form-actions"><button type="submit">Save bio</button><button type="button" data-cancel>Cancel</button><button type="button" data-reset-bio>Reset</button></div><small>Saved only in this browser. No public profile is updated.</small></form>`:''}</div><div class="dp-stat-list" aria-label="Local portfolio information"><div><strong>${number(mine.length)}</strong><span>PROJECTS</span></div><div><strong>${number(new Set(mine.map(p=>p.category||'Projects')).size)}</strong><span>CATEGORIES</span></div><div><strong>${number(saved.length)}</strong><span>YOUR SAVED WORKS</span></div></div></div>
      <nav class="dp-tabs dp-connect-tabs" aria-label="Creator portfolio sections">${[['about','Info'],['collections','Collections'],['works','All Items'],['board','Board'],['saved','Likes'],['techpacks','Tech Packs']].map(([id,label])=>`<button type="button" data-tab="${id}" aria-current="${tab===id?'page':'false'}">${label}${id==='works'?` <sup>${mine.length}</sup>`:''}${id==='techpacks'?' <span aria-label="Private">⌁</span>':''}</button>`).join('')}</nav>
      <div class="dp-tab-content" aria-live="polite">${tab==='works'?`<div class="dp-section-heading"><div><span>CREATOR PORTFOLIO</span><h2>All Items<span class="dp-period">.</span></h2></div><p>${mine.length} works in this EXO concept archive</p></div>${mine.length?`<div class="dp-project-grid">${mine.map(project=>projectCard(project,works.indexOf(project))).join('')}</div>`:`<div class="dp-empty"><strong>No public items yet</strong><p>Explore more creators and projects in Discover.</p><button type="button" data-nav="creators">Browse creators ↗</button></div>`}`:
      tab==='about'?`<div class="dp-about-grid"><div><span class="dp-eyebrow">CREATOR / INFO</span><h2>About the studio.</h2><p>${esc(typeof info.bio==='string'?info.bio:current.bio)}</p></div><aside><h3>Occupation</h3><p>${esc(current.role)}</p><h3>Studio</h3><p>${esc(current.brand)}</p><h3>Location</h3><p>${esc(current.location || 'Not listed')}</p><small>Sample information from a local concept profile.</small></aside></div>`:
      tab==='techpacks'?privatePacks.html():
      tab==='collections'?`<div class="dp-section-heading"><div><span>CREATOR / PORTFOLIO COLLECTIONS</span><h2>${openCollection?esc(openCollection):'Collections'}<span class="dp-period">.</span></h2></div><p>${openCollection?`<button class="dp-collection-back" data-collection-back>← All collections</button>`:`${mine.length} items organized by collection`}</p></div>${mine.length?openCollection?`<div class="dp-project-grid">${mine.filter(p=>(p.category||'Projects')===openCollection).map(project=>projectCard(project,works.indexOf(project))).join('')}</div>`:`<div class="dp-collection-grid">${[...new Set(mine.map(p=>p.category || 'Projects'))].map(category=>{const items=mine.filter(p=>(p.category||'Projects')===category);return `<button type="button" class="dp-collection" data-collection="${esc(category)}"><div class="dp-collection-image">${displayPhoto(items[0])}</div><div><span>${String(items.length).padStart(2,'0')} ITEMS</span><h3>${esc(category)}</h3></div></button>`}).join('')}<button type="button" class="dp-collection dp-collection-all" data-tab="works"><div class="dp-collection-image"><span class="dp-photo-placeholder"><span>EXO / PORTFOLIO</span><strong>ALL ITEMS</strong></span></div><div><span>${mine.length} ITEMS</span><h3>All Items</h3></div></button></div>`:`<div class="dp-empty"><strong>Collections coming together</strong><p>Collections appear when creators publish portfolio projects.</p></div>`}`:
      tab==='board'?`<div class="dp-empty"><strong>Creator board</strong><p>No public board posts are connected to this local creator profile yet.</p><button type="button" data-tab="collections">View collections ↗</button></div>`:
      `<div class="dp-section-heading"><div><span>CREATOR / LIKED WORK</span><h2>Likes<span class="dp-period">.</span></h2></div><p>Local saved references only</p></div>${saved.length?`<div class="dp-project-grid">${saved.map(p=>projectCard(p,works.indexOf(p))).join('')}</div>`:`<div class="dp-empty"><strong>No liked items yet</strong><p>Works you save in Discover appear here in this local demo.</p><button type="button" data-nav="explore">Discover works ↗</button></div>`}`}</div>
      <footer class="dp-footer"><span>EXO COMMUNITY / PORTFOLIO STUDIES</span><span>OFFLINE CONCEPT · SAMPLE CREATOR DATA</span></footer><div class="dp-notice" role="status" aria-live="polite">${esc(notice)}</div></section>`;
  }
  function directoryMarkup() {
    return `<section class="dp-directory" aria-label="Discover creators"><div class="dp-directory-heading"><div><span class="dp-eyebrow">CREATOR DISCOVERY / LOCAL DEMO</span><h2>Find your next collaborator<span class="dp-period">.</span></h2><p>Explore visual portfolios and design practices. Rankings use sample project counts and your own follows; no public engagement data is connected.</p></div><label class="dp-directory-search"><span>SEARCH CREATORS</span><input type="search" data-creator-search placeholder="Designer, studio, discipline…" value="${esc(creatorSearch)}" autocomplete="off"></label></div><div class="dp-directory-controls" role="group" aria-label="Browse creators">${[['trending','Trending · demo'],['top','Top portfolios'],['new','Recently added'],['following','Following']].map(([value,label])=>`<button type="button" data-creator-filter="${value}" aria-pressed="${creatorFilter===value}">${label}</button>`).join('')}</div><div class="dp-directory-grid">${directory().length?directory().map(creatorCard).join(''):'<div class="dp-directory-empty">No matching creators. Try another search or category.</div>'}</div></section>`;
  }
  const onClick = async e => {
    const target=e.target.closest('button'); if(!target || !container.contains(target)) return;
    if (target.dataset.creator) { current=known.find(x=>x.id===target.dataset.creator)||current;resetTechPacks();showDirectory=false;tab='collections';openCollection='';editing=false;notice='';window.history.replaceState(null,'','#profile/'+encodeURIComponent(current.id));render();return; }
    if (target.hasAttribute('data-directory')) {showDirectory=true;notice='';window.history.replaceState(null,'','#creators');render();return;}
    if (target.dataset.creatorFilter) {creatorFilter=target.dataset.creatorFilter;render();return;}
    if (target.dataset.followCreator) {const creator=known.find(c=>c.id===target.dataset.followCreator);if(creator){db[creator.id]={...getProfile(creator),following:!Boolean(getProfile(creator).following)};persist(db);notice='Follow preferences saved in this browser only.';render();}return;}
    if (target.closest('.tp-private') && privatePacks.click(target)) {render();return;}
    if (target.hasAttribute('data-inquiry')) {notice='Commission inquiries are a demo preview. This creator has not supplied a verified contact address; no message was sent.';render();return;}
    if (target.hasAttribute('data-collection-back')){openCollection='';render();return;}
    if (target.dataset.collection){openCollection=target.dataset.collection;render();return;}
    if (target.dataset.tab) {tab=target.dataset.tab;openCollection='';editing=false;notice='';render();return;}
    if (target.hasAttribute('data-follow')) {change('following',!Boolean(getProfile(current).following));notice=Boolean(getProfile(current).following)?'Following in this local demo.':'Unfollowed in this local demo.';render();return;}
    if (target.hasAttribute('data-edit')) {editing=!editing;render();if(editing)container.querySelector('#dp-bio-editor')?.focus();return;}
    if (target.hasAttribute('data-cancel')) {editing=false;render();return;}
    if (target.hasAttribute('data-reset-bio')) {change('bio',current.bio);editing=false;notice='Bio reset locally.';render();return;}
    if (target.hasAttribute('data-share')) {
      const share = new URL(window.location.href);share.hash=`profile/${encodeURIComponent(current.id)}`;
      notice=`Demo profile link: ${share.href}`;
      render();
      try {
        if (!navigator.clipboard?.writeText) return;
        const copied=await Promise.race([
          navigator.clipboard.writeText(share.href).then(()=>true).catch(()=>false),
          new Promise(resolve=>setTimeout(()=>resolve(false),900))
        ]);
        if(copied && container.isConnected){notice='Profile link copied · local demo.';render();}
      } catch { /* The visible link remains available to copy manually. */ }
      return;
    }
    if(target.dataset.project!==undefined){const p=works[Number(target.dataset.project)];if(p)onOpenProject(p);return;}
    if(target.dataset.nav)onNavigate(target.dataset.nav);
  };
  const onSubmit=e=>{if(e.target.closest('.tp-private')){e.preventDefault();if(privatePacks.submit(e.target))render();return;}if(!e.target.matches('[data-bio-form]'))return;e.preventDefault();change('bio',String(new FormData(e.target).get('bio')||'').slice(0,360));editing=false;notice='Bio saved in this browser.';render();};
  const onSearch=e=>{if(!e.target.matches('[data-creator-search]'))return;creatorSearch=e.target.value;const start=e.target.selectionStart;const end=e.target.selectionEnd;render();const replacement=container.querySelector('[data-creator-search]');replacement?.focus();try{replacement?.setSelectionRange(start,end)}catch{/* Some search input implementations do not allow selection ranges. */}};
  const onStorage = e => {
    if (e.key === 'exo.community.private-techpacks.v1' || e.key === null) {privatePacks.reload();render();}
    if (e.key === SOCIAL_STORAGE || e.key === null) render();
    if (e.key === STORAGE || e.key === null) {db=load();render();}
  };
  const onPageShow = () => {db=load();render();};
  container.addEventListener('click',onClick);
  container.addEventListener('submit',onSubmit);
  container.addEventListener('input',onSearch);
  window.addEventListener('storage',onStorage);
  window.addEventListener('pageshow',onPageShow);
  render();
  const destroy=()=>{container.removeEventListener('click',onClick);container.removeEventListener('submit',onSubmit);container.removeEventListener('input',onSearch);window.removeEventListener('storage',onStorage);window.removeEventListener('pageshow',onPageShow);container.replaceChildren();container.classList.remove('dp-root');};
  destroy.destroy=destroy;
  return destroy;
}
