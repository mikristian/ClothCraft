import React, {useEffect, useState} from 'react';
import {DEFAULT_CLO_SETTINGS} from '../core/cloSettingsDefaults.js';
import {CLOTHCRAFT_BRIDGE, readClothCraftHealth, readClothCraftStatus, readClothCraftCapabilities, runClothCraftAction, summarizeClothCraftSnapshot, listClothCraftApiKeys, createClothCraftApiKey, revokeClothCraftApiKey} from '../core/clothcraftApiClient.js';
import {APP_AUTOMATION_ACTIONS, requestAppAutomation} from '../core/clothcraftAppAutomation.js';
import './CloSettingsPages.css';

export const CLO_SETTINGS_NAV = [
  ['cloGraphicOptions','Graphic Options'],['cloViewControls','View Controls'],['cloShortcuts','Shortcuts'],
  ['cloUserInterface','User Interface'],['clo3d','3D'],['clo2d','2D'],['cloOther','Other'],
  ['cloDefaultFiles','Default Files'],['cloApi','ClothCraft API'],['closet','CLOSET']
];
const field = (key,label,type='text',options,extra={}) => ({key,label,type,options,...extra});
const select = (key,label,options,extra) => field(key,label,'select',options,extra);
const check = (key,label,extra) => field(key,label,'check',null,extra);
const number = (key,label,min=0,max=999,step=1) => field(key,label,'number',null,{min,max,step});
const path = (key,label) => field(key,label,'path');
const group = (title,fields,note) => ({title,fields,note});
const docks=['Left','Right','Top','Bottom','Floating'];
const trigger=['None','Left Mouse Button','Middle Mouse Button','Right Mouse Button','Left Mouse Button + Alt','Trackpad Gesture'];
const modifiers=['None','Alt','Shift','Control','Command'];
const viewTriplet = (name,prefix) => [select(prefix+'Mod1','First modifier',modifiers),select(prefix+'Mod2','Second modifier',modifiers),select(prefix+'Button','Mouse / gesture',trigger)];
const fileMode=['Project (ZPRJ) / Garment (ZPAC) File','Custom Folder','Embedded File'];
const PAGE_FIELDS = {
  cloGraphicOptions:[
    group('Graphics',[check('useVbos','Use VBOs')]),
    group('Antialiasing',[select('antiAliasing','Sample count',['Off','x2','x4','x8','x16','x32'])],'Graphics options are saved preferences; renderer support depends on the graphics backend.'),
    group('Normal Blending',[select('normalBlending','Normal Blending Method',['Alpha Blending','Additive Blending'])])
  ],
  cloViewControls:[
    group('Preset',[select('viewPreset','Preset',['Magic Mouse','CLO','Trackpad','Blender','Maya'])]),
    ...[['Pan','pan'],['Zoom','zoom'],['Rotate (3D Garment Window Only)','rotate'],['Pop-Up Menu','popup']].map(([label,prefix])=>group(label,viewTriplet(label,prefix).concat(prefix==='zoom'?[number('zoomIncrement','Increment',0.01,20,0.05),select('zoomDirection','Direction',['Backward','Forward'])]:[]))),
    group('Others',[select('axisConstraint','Axis Constraint Key',modifiers),check('smartPanning','Smart Panning')],'Custom mouse bindings are saved preferences; the viewport currently uses its existing controls.')
  ],
  cloUserInterface:[
    group('Unit',[select('unitSystem','Unit System',['Millimeter','Centimeter','Inch']),check('useLigne','Use Ligne (L) for Button Width'),select('threadUnit','Default Topstitch Thread Thickness Unit',['Tex','Denier','Ticket']),select('currency','Currency Unit',['USD','EUR','GBP','JPY','KRW','CNY'])]),
    group('Mode & Toolbar',[select('defaultMode','Default Mode',['Simulation','Animation','Render']),select('toolbar3d','3D Toolbar',docks,{workspace:'leftToolbarDock'}),select('toolbar2d','2D Toolbar',docks,{workspace:'rightToolbarDock'}),select('toolbarRender','Render Toolbar',docks),check('groupTools','Group Tools'),check('showTooltipLinks','Show Manual and Video Links from Tooltips'),check('showColorwayOnStartup','Always show Colorway Editor when starting the program')]),
    group('Font',[select('fontFamily','Font Family',['Tahoma','Arial','Helvetica','Inter','System'])]),
    group('File Open/Save Dialog Type',[select('fileDialogType','Dialog Type',['System','Built-in'])])
  ],
  clo3d:[
    group('Mesh',[select('meshType','Mesh Type',['Triangle','Quad'])]),
    group('Arrangement',[select('arrangementShape','Default Arrangement Shape Type',['Curved','Flat']),number('arrangementPointSize','Default Arrangement Point Size',1,100,0.5),check('syncFoldAngle','Sync Fold Arrangement Angle')]),
    group('Gizmo',[select('gizmoMode','Gizmo',['Unified Gizmo','Divided Gizmo: Select (Q), Move (W), Rotate (E)'])],'Divided Gizmo shortcuts are stored as a preference until that interaction is connected.')
  ],
  clo2d:[
    group('Pattern',[number('particleDistance','Default Particle Distance',1,100,0.5),select('copiedPatternIndex','Index Type of Copied Pattern',['Index Number (1, 2, 3 …)','Alphabetical (A, B, C …)']),check('autoOffsetCut','Automatically Offset 2D Patterns when Cut')]),
    group('Notch',[select('notchDisplay','Display Type',['Length Fixed to Screen','Actual Length'])])
  ],
  cloOther:[
    group('Modular Configurator',[check('maintainBlockSelections','Maintain Block Selections with Same Name'),check('maintainFabricProperties','Maintain Fabric Properties for Patterns with Same Name')]),
    group('DM|x Cloud',[path('dmixDownloadPath','Download Path')],'Download path is saved; the DM|x cloud service is not connected.'),
    group('Application',[path('textureApplication','Register Application to Open Texture')],'External applications are not launched from this preference yet.')
  ],
  cloDefaultFiles:[
    group('Project',[path('projectFile','Project File (ZPRJ)'),check('saveMultiviewThumbnails','Save Thumbnails in Multiviews')]),
    group('Avatar',[path('avatarAvtp','Permission File — AVTP'),path('avatarApf','Alvanon Permission File (APF)')]),
    group('Materials',[path('fabricPhysicalProperty','Fabric — Physical Property'),select('textureOpenFrom','Texture Images — Open from',fileMode),check('refreshTextures','Refresh from Custom Folder Path'),path('textureFolder','Texture Images — Custom Folder'),select('aiPdfOpenFrom','AI/PDF Materials — Open from',fileMode),check('saveAiPdfSeparately','Save .ai/.pdf separately with .zpac file'),check('openTopVersionOnly','Open top version file only'),check('substanceCompatibility','Substance — Save Textures Compatible with Low Versions')],'Paths and file policies are stored locally; project import and export retain their current implementation.')
  ]
};
const SHORTCUT_GROUPS = {
  File:['New','Open','Save','Save As','Import','Export','Close'],
  Edit:['Undo','Redo','Copy','Paste','Delete','Select All'],
  '3D Garment':['Select / Move','Rotate','Simulate','Reset Arrangement'],
  Avatar:['Add Avatar','Move Avatar','Hide Avatar'],
  '2D Pattern':['Edit Pattern','Internal Polygon','Internal Line','Transform Pattern','Split Line'],
  Settings:['User Settings','Workspace'],
  Help:['Help','About'],
  Animation:['Play','Pause','Record'],
  Sewing:['Segment Sewing','Free Sewing','Edit Sewing'],
  Materials:['Fabric','Topstitch','Texture'],
  Display:['Show Grid','Show Guides','Fit View'],
  Preferences:['Graphic Options','View Controls'],
  Render:['Render Preview','Render Image'],
  Editor:['Object Browser','Property Editor','Library']
};
const API_SCOPE_LABELS = {read:'Read workspace',edit:'Edit garments and projects',simulate:'Control simulation'};
const formatApiDate = value => { if (!value) return 'Never'; const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString(); };
const apiKeyStatus = key => key.revokedAt||key.revoked||key.status==='revoked' ? 'Revoked' : key.expiresAt && Date.parse(key.expiresAt) <= Date.now() ? 'Expired' : key.status||'Active';
function ClothCraftApiKeys() {
  const [keys,setKeys]=useState([]);
  const [name,setName]=useState('');
  const [scopes,setScopes]=useState(['read']);
  const [expirationDays,setExpirationDays]=useState('30');
  const [secret,setSecret]=useState('');
  const [secretCopied,setSecretCopied]=useState(false);
  const [busy,setBusy]=useState(false);
  const [revoking,setRevoking]=useState('');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const load=async(signal)=>{
    setLoading(true);
    try {
      const result=await listClothCraftApiKeys({signal});
      if (signal?.aborted) return;
      const items=Array.isArray(result) ? result : result.keys ?? result.data?.keys;
      if(!Array.isArray(items)) throw new Error('API returned an invalid key list');
      setKeys(items.map(({key,token,secret:ignored,...metadata})=>metadata));
      setError('');
    } catch(e){ if(!signal?.aborted) setError(e.message||'Unable to load API keys'); }
    finally { if(!signal?.aborted) setLoading(false); }
  };
  useEffect(()=>{const controller=new AbortController();load(controller.signal);return()=>controller.abort();},[]);
  const toggleScope=scope=>setScopes(previous=>previous.includes(scope)?previous.filter(value=>value!==scope):[...previous,scope]);
  const create=async(event)=>{
    event.preventDefault();
    if(!name.trim()||!scopes.length||busy) return;
    setBusy(true);setError('');setNotice('');setSecret('');setSecretCopied(false);
    try {
      const result=await createClothCraftApiKey({name:name.trim(),scopes,expiresInDays:Number(expirationDays)});
      const raw=result.key ?? result.data?.key;
      if(typeof raw!=='string'||!raw) throw new Error('The API did not return a new key. Check the backend before retrying.');
      setSecret(raw);setName('');setNotice('Key created. Copy it now; ClothCraft cannot display it again.');
      await load();
    }catch(e){setError(e.message||'Unable to create API key');}
    finally{setBusy(false);}
  };
  const revoke=async key=>{
    if(!key?.id||revoking) return;
    setRevoking(key.id);setError('');setNotice('');
    try {await revokeClothCraftApiKey(key.id);setNotice(`Revoked ${key.name||'API key'}.`);await load();}
    catch(e){setError(e.message||'Unable to revoke API key');}
    finally{setRevoking('');}
  };
  const copy=async()=>{
    try {await navigator.clipboard.writeText(secret);setSecretCopied(true);setNotice('Key copied. Store it securely before concealing it.');}
    catch {setError('Clipboard unavailable. Select and copy the displayed key manually.');}
  };
  return <section className="clo-config-group cc-api-keys">
    <div className="cc-api-heading"><h4>API keys</h4><button type="button" onClick={()=>load()} disabled={loading||busy||!!revoking}>{loading?'Loading…':'Refresh keys'}</button></div>
    <p className="clo-config-note">Give each local agent its own key and only the permissions it needs. Created secrets appear once; only key metadata is retrieved afterward.</p>
    <form className="cc-key-form" onSubmit={create}>
      <label>Key name<input type="text" required maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Pattern design agent" autoComplete="off"/></label>
      <fieldset><legend>Permissions</legend>{Object.entries(API_SCOPE_LABELS).map(([scope,label])=><label key={scope}><input type="checkbox" checked={scopes.includes(scope)} disabled={scope==='read'&&scopes.some(item=>item!=='read')} onChange={()=>toggleScope(scope)}/>{label}</label>)}<small className="clo-config-note">Read access is required for editing or simulation so agents can check the current garment revision.</small></fieldset>
      <label>Expires after<select value={expirationDays} onChange={e=>setExpirationDays(e.target.value)}><option value="1">1 day</option><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option><option value="365">365 days</option></select></label>
      <button type="submit" disabled={busy||!name.trim()||!scopes.length}>{busy?'Creating…':'Create API key'}</button>
    </form>
    {secret&&<div className="cc-key-secret" role="region" aria-label="New API key"><strong>New key · shown once</strong><p className="clo-config-note">Copy this secret into your agent’s secure credential store. It will disappear when you close Settings or conceal it.</p><div className="cc-key-secret-row"><input readOnly aria-label="New API key secret" value={secret} onFocus={e=>e.target.select()} autoComplete="off" spellCheck="false"/><button type="button" onClick={copy}>{secretCopied?'Copy again':'Copy key'}</button><button type="button" onClick={()=>{setSecret('');setSecretCopied(false);}}>Conceal</button></div></div>}
    {error&&<p className="cc-api-error" role="alert">{error}</p>}
    {notice&&<p className="cc-key-notice" role="status">{notice}</p>}
    <div className="cc-key-list" aria-label="Existing API keys">{loading?<p className="clo-config-note">Loading keys…</p>:keys.length===0?<p className="clo-config-note">No API keys created yet.</p>:keys.map(key=><div className="cc-key-item" key={key.id}><div><strong>{key.name||'Unnamed key'}</strong><p>{(key.scopes||[]).join(' · ')||'No scopes'} · {apiKeyStatus(key)}</p><p>Expires: {formatApiDate(key.expiresAt??key.expires_at)} · Last used: {formatApiDate(key.lastUsedAt??key.last_used_at)}</p></div><button type="button" disabled={!!revoking||apiKeyStatus(key)==='Revoked'} onClick={()=>revoke(key)} aria-label={`Revoke ${key.name||'API key'}`}>{revoking===key.id?'Revoking…':apiKeyStatus(key)==='Revoked'?'Revoked':'Revoke'}</button></div>)}</div>
    <p className="clo-config-note">Example authenticated request (replace the placeholder with your key; never commit it to source control):</p>
    <pre className="cc-api-output">{`curl -H 'Authorization: Bearer YOUR_CLOTHCRAFT_API_KEY' \\\n  '${CLOTHCRAFT_BRIDGE}/agent/v1/status'`}</pre>
  </section>;
}
function ClothCraftApiSettings() {
  const [appResult,setAppResult]=useState('');
  const [appError,setAppError]=useState('');
  const [appBusy,setAppBusy]=useState(false);
  const [status,setStatus]=useState(null);
  const [health,setHealth]=useState(null);
  const [manifest,setManifest]=useState(null);
  const [snapshot,setSnapshot]=useState(null);
  const [error,setError]=useState('');
  const [output,setOutput]=useState('');
  const [busy,setBusy]=useState(false);
  const [panel,setPanel]=useState('');
  const [edge,setEdge]=useState('');
  const [steps,setSteps]=useState(1);
  const [targetCm,setTargetCm]=useState('');
  const refresh=async(signal)=>{
    const results=await Promise.allSettled([readClothCraftHealth({signal}),readClothCraftStatus({signal}),readClothCraftCapabilities({signal})]);
    if(signal?.aborted)return;
    setHealth(results[0].status==='fulfilled'?results[0].value:null);
    setStatus(results[1].status==='fulfilled'?results[1].value:null);
    setManifest(results[2].status==='fulfilled'?results[2].value:null);
    const failures=results.map((r,i)=>r.status==='rejected'?`${['Native health','Agent status','Capabilities'][i]}: ${r.reason.message}`:null).filter(Boolean);
    setError(failures.join(' · '));
  };
  useEffect(()=>{const controller=new AbortController();refresh(controller.signal);return()=>controller.abort();},[]);
  const execute=async(action,args={})=>{
    setBusy(true);setError('');
    try {
      const result=await runClothCraftAction(action,args);
      if(action==='workspace.snapshot'){
        const summary=summarizeClothCraftSnapshot(result);setSnapshot(summary);
        const first=summary.panels[0];if(first){setPanel(first.id);setEdge(first.edges[0]||'');}
        setOutput(JSON.stringify(summary,null,2));
      } else setOutput(JSON.stringify(result,null,2));
      await refresh();
    } catch(e){setError(e.message);setOutput('');}
    finally{setBusy(false);}
  };
  const revision=snapshot?.revision;
  const canMutate=Number.isSafeInteger(revision)&&status?.loaded&&!status.busy;
  const available=manifest?.capabilities||[];
  const categories=[['Workspace',['workspace.status','workspace.snapshot','workspace.summary','workspace.save','workspace.undo','workspace.redo']],['Simulation',['simulation.pause','simulation.step']],['Pattern measurements',['line.inspect','line.setTargetSpecification']],['Batch automation',available.filter(c=>/batch/i.test(c.id)).map(c=>c.id)]];
  const categorizedIds=new Set(categories.flatMap(([,ids])=>ids));
  const additional=available.filter(c=>!categorizedIds.has(c.id));
  if(additional.length)categories.push(['Additional native capabilities',additional.map(c=>c.id)]);
  const runAppStatus=async()=>{
    setAppBusy(true);setAppError('');setAppResult('');
    try { setAppResult(JSON.stringify(await requestAppAutomation('app.status'),null,2)); }
    catch(e) { setAppError(e.message||String(e)); }
    finally { setAppBusy(false); }
  };
  return <div className="clo-settings-page cc-api-settings">
    <h3>ClothCraft API</h3>
    <p className="studio-settings-intro">Local automation for the native ClothCraft workspace. Commands use the same Rust session and revision checks as the app.</p>
    <ClothCraftApiKeys/>
    <section className="clo-config-group"><div className="cc-api-heading"><h4>Live connection</h4><button type="button" disabled={busy} onClick={()=>refresh()}>Refresh status</button></div>
      <div className="cc-api-status"><span className={status?.ok?'cc-api-online':'cc-api-offline'}>{status?.ok?'Agent connected':'Agent unavailable'}</span><span>Native engine: {health?.nativeReady?'Ready':health?'Not ready':'Unknown'}</span><span>Project: {status?.loaded?'Loaded':'Not loaded'}</span><span>Session: {status?.busy?'Busy':'Idle'}</span></div>
      <p className="clo-config-note">Bridge: <code>{CLOTHCRAFT_BRIDGE}</code> · API: {status?.apiVersion||manifest?.version||'unverified'} · {manifest?.scope||'Local workspace'}</p>
      {status?.lastError&&<p className="cc-api-error">Engine: {status.lastError}</p>}
      {error&&<p className="cc-api-error" role="alert">{error}</p>}
    </section>
    <section className="clo-config-group cc-app-automation"><div className="cc-api-heading"><h4>Workspace automation</h4><button type="button" disabled={appBusy} onClick={runAppStatus}>{appBusy?'Checking…':'Run app.status'}</button></div>
      <p className="clo-config-note">These {APP_AUTOMATION_ACTIONS.length} actions run inside this browser tab through <code>clothcraft:automation:request/response</code> CustomEvents. They manage the project library, collections, assets, appearance and workspace. They are separate from the native Rust HTTP API and its MCP adapter, and are not remote HTTP endpoints.</p>
      <div className="cc-app-action-list">{APP_AUTOMATION_ACTIONS.map(action=><div className="cc-api-command" key={action.id}><span><b>{action.id}</b><small>{action.description}</small></span><span className="cc-api-muted">{action.mutates?'Changes state':'Read only'}</span></div>)}</div>
      {appError&&<p className="cc-api-error" role="alert">{appError}</p>}
      {appResult&&<pre className="cc-api-output" aria-label="Workspace automation response">{appResult}</pre>}
    </section>
    <section className="clo-config-group"><div className="cc-api-heading"><h4>Project snapshot</h4><button type="button" disabled={busy||!status?.loaded} onClick={()=>execute('workspace.snapshot')}>Read snapshot</button></div>
      <p className="clo-config-note">Read-only native project summary, including the current revision used to authorize changes.</p>
      {snapshot&&<div className="cc-api-status"><span>Project: {snapshot.name}</span><span>Revision: {snapshot.revision??'Unknown'}</span><span>Panels: {snapshot.panels.length}</span><span>Seams: {snapshot.seams}</span><span>Fabrics: {snapshot.fabrics.length}</span><span>Solver: {snapshot.running?'Running':'Stopped'}</span></div>}
    </section>
    <section className="clo-config-group"><h4>Automation catalog</h4>{categories.map(([category,ids])=><div key={category} className="cc-api-category"><strong>{category}</strong>{ids.map(id=>{const item=available.find(c=>c.id===id);return <div className="cc-api-command" key={id}><span><b>{id}</b><small>{item?`${item.method} ${item.path}${item.mutates?' · changes project':''}`:'Not advertised by connected backend'}</small></span><span className={item?'cc-api-online':'cc-api-muted'}>{item?'Available':'Unavailable'}</span></div>})}</div>)}
      {manifest?.unsupported?.length>0&&<p className="clo-config-note">The current agent API does not expose: {manifest.unsupported.join(', ')}.</p>}
    </section>
    <section className="clo-config-group"><h4>Run native commands</h4><p className="clo-config-note">Test connection using Refresh status or Read snapshot. Mutations require the project revision from your latest snapshot.</p>
      <div className="cc-api-controls"><label>Panel<select value={panel} onChange={e=>{setPanel(e.target.value);setEdge(snapshot?.panels.find(p=>p.id===e.target.value)?.edges[0]||'')}}><option value="">Select panel</option>{snapshot?.panels.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Edge<select value={edge} onChange={e=>setEdge(e.target.value)}><option value="">Select edge</option>{snapshot?.panels.find(p=>p.id===panel)?.edges.map(e=><option key={e} value={e}>{e}</option>)}</select></label></div>
      <div className="cc-api-actions"><button type="button" disabled={busy||!panel||!edge||!available.some(c=>c.id==='line.inspect')} onClick={()=>execute('line.inspect',{panel,edge})}>Inspect line</button><button type="button" disabled={busy||!canMutate||!available.some(c=>c.id==='simulation.pause')} onClick={()=>execute('simulation.pause',{expectedRevision:revision})}>Pause simulation</button><label>Steps<input type="number" min="1" max="4" value={steps} onChange={e=>setSteps(Number(e.target.value))}/></label><button type="button" disabled={busy||!canMutate||!Number.isInteger(steps)||steps<1||steps>4||!available.some(c=>c.id==='simulation.step')} onClick={()=>execute('simulation.step',{expectedRevision:revision,steps})}>Step simulation</button></div>
      <div className="cc-api-actions"><label>Line target (cm)<input type="number" min="0.01" max="1000" step="0.01" value={targetCm} onChange={e=>setTargetCm(e.target.value)}/></label><button type="button" disabled={busy||!canMutate||!panel||!edge||!(Number(targetCm)>=.01&&Number(targetCm)<=1000)||!available.some(c=>c.id==='line.setTargetSpecification')} onClick={()=>execute('line.setTargetSpecification',{expectedRevision:revision,panel,edge,targetCm:Number(targetCm)})}>Set drafting target</button></div>
      {output&&<pre className="cc-api-output" aria-label="API response">{output}</pre>}
    </section>
    <section className="clo-config-group"><h4>HTTP integration</h4><p className="clo-config-note">Local automation clients may call these JSON endpoints. The capability manifest defines the exact commands and arguments.</p><pre className="cc-api-output">{`GET ${CLOTHCRAFT_BRIDGE}/agent/v1/capabilities\nGET ${CLOTHCRAFT_BRIDGE}/agent/v1/status\nPOST ${CLOTHCRAFT_BRIDGE}/agent/v1/actions\nContent-Type: application/json\n\n{"action":"workspace.snapshot"}`}</pre><p className="clo-config-note">Write requests additionally require <code>expectedRevision</code> from a recent snapshot. A changed revision causes a conflict instead of applying stale edits.</p></section>
  </div>;
}
export function CloSettingsPages({tab,value={},onChange,workspace={},onWorkspaceChange}) {
  const [expanded,setExpanded]=useState({});
  const defaults=DEFAULT_CLO_SETTINGS;
  const update=(key,v)=>onChange({...value,[key]:v});
  const renderField=(f)=>{
    let v=value[f.key]??defaults[f.key];
    if(f.workspace){
      v=workspace[f.workspace]??(v||'left');
      v=v.charAt(0).toUpperCase()+v.slice(1);
    }
    const change=(next)=>{
      // Updating workspace dock and mirrored CLO preference in separate
      // onChange calls would let the second stale snapshot erase the first.
      if(f.workspace)onWorkspaceChange?.(f.workspace,next.toLowerCase(),f.key,next);
      else update(f.key,next);
    };
    const control=f.type==='check'
      ? <label className="clo-config-checkbox"><input type="checkbox" checked={!!v} onChange={e=>change(e.target.checked)}/><span>{v?'On':'Off'}</span></label>
      :f.type==='select'
      ? <select aria-label={f.label} value={v} onChange={e=>change(e.target.value)}>{f.options.map(option=><option key={option} value={option}>{option}</option>)}</select>
      :<input aria-label={f.label} type={f.type==='number'?'number':'text'} value={v??''} min={f.min} max={f.max} step={f.step} placeholder={f.type==='path'?'Optional local path':''} onChange={e=>change(f.type==='number'?(e.target.value===''?'':Number(e.target.value)):e.target.value)}/>;
    return <div className="clo-config-field" key={f.key}><label>{f.label}</label><div>{control}</div></div>;
  };
  if(tab==='cloApi')return <ClothCraftApiSettings/>;
  if(tab==='closet')return <div className="clo-settings-page"><h3>CLOSET</h3><p className="studio-settings-intro">This module has not been connected to this studio.</p><section className="clo-config-group"><h4>Connection</h4><p className="clo-config-note">Unavailable — no authenticated CLOSET integration is configured. This page is reserved for a future connection.</p></section></div>;
  if(tab==='cloShortcuts')return <div className="clo-settings-page"><h3>Shortcuts</h3><p className="studio-settings-intro">Explore shortcut categories and save custom key assignments. Custom assignments are not yet wired to commands.</p><div className="clo-shortcut-head"><span>Function</span><span>Shortcut Key</span><span>Reset</span><span>Delete</span></div>{Object.entries(SHORTCUT_GROUPS).map(([category,items])=><div key={category}><button className="clo-shortcut-category" aria-expanded={!!expanded[category]} onClick={()=>setExpanded(s=>({...s,[category]:!s[category]}))}>{expanded[category]?'−':'+'} &nbsp; {category}</button>{expanded[category]&&items.map(action=>{const key='shortcut:'+category+':'+action;return <div className="clo-shortcut-line" key={key}><span>{action}</span><input aria-label={action+' shortcut'} placeholder="Unassigned" value={value[key]??''} onChange={e=>update(key,e.target.value.slice(0,40))}/><button type="button" onClick={()=>update(key,defaults[key]??'')}>Reset</button><button type="button" onClick={()=>update(key,'')}>Delete</button></div>})}</div>)}</div>;
  return <div className="clo-settings-page"><h3>{CLO_SETTINGS_NAV.find(([id])=>id===tab)?.[1]}</h3>{PAGE_FIELDS[tab]?.map(({title,fields,note})=><section className="clo-config-group" key={title}><h4>{title}</h4>{fields.map(renderField)}{note&&<p className="clo-config-note">{note}</p>}</section>)}</div>;
}
