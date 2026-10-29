import React, {useMemo, useState} from 'react'
import {Activity, ChevronDown, ChevronRight, CircleDot, Eye, Folder, FolderTree, Layers3, LockKeyhole, PanelLeftClose, PanelLeftOpen, Ruler, Scissors, Search, ShieldCheck, SlidersHorizontal, Waypoints} from 'lucide-react'
import './ModarisProfessionalPanels20261027.css'
import './ModarisCadLibraryTheme20261027.css'

const TABS = [
  {id:'pieces',label:'Pieces',icon:Layers3},
  {id:'seams',label:'Seams',icon:Waypoints},
  {id:'grade',label:'Grade',icon:Ruler},
  {id:'industrial',label:'Industrial',icon:ShieldCheck},
]
const finite = value => typeof value==='number'&&Number.isFinite(value)
const metric = value => finite(value)?(value*1000).toFixed(2):'—'
const entries = value => Array.isArray(value)?value:[]
const actionAliases = {
  selectPiece:['selectPiece','onSelectPiece','select'],
  selectPoint:['selectPoint','onSelectPoint'],
  selectSeam:['selectSeam','onSelectSeam'],
  updatePoint:['updatePoint','onUpdatePoint'],
  toggleLayer:['toggleLayer','onToggleLayer'],
  grade:['grade','openGrade','onOpenGrade'],
  gradeAudit:['gradeAudit','auditGrade','onGradeAudit'],
  industrialAudit:['industrialAudit','auditIndustrial','onIndustrialAudit'],
  sewingAudit:['sewingAudit','auditSewing','onSewingAudit'],
  cutlines:['cutlines','generateCutlines','onGenerateCutlines'],
  export:['export','exportPattern','onExportPattern'],
  openSeam:['openSeam','editSeam','onEditSeam'],
}

/** Full 2D pattern workspace inspector.
 * snapshot: authoritative native workspace snapshot (template.panels, template.seams,
 * template.fabrics, revision, activeGradedSize, gradeRunPersisted).
 * selection: {panel, anchor?, edge?, seamId?}, with coordinates in native metres.
 * actions: optional callback dictionary. Each callback receives a typed payload;
 * absent callbacks disable the corresponding action. Does not mutate snapshot.
 */
export default function ModarisProfessionalPanels20261027({
 snapshot,selection,actions={},disabled=false,collapsed=false,onToggleCollapsed,
}) {
  const [tab,setTab]=useState('pieces')
  const [query,setQuery]=useState('')
  const [layersExpanded,setLayersExpanded]=useState(true)
  const [pointDraft,setPointDraft]=useState({})
  const [draftError,setDraftError]=useState('')
  const template=snapshot?.template
  const pieces=entries(template?.panels)
  const seams=entries(template?.seams)
  const fabrics=entries(template?.fabrics)
  const activePiece=pieces.find(piece=>piece.id===selection?.panel)||null
  const anchors=entries(activePiece?.polygon?.points)
  const rawIndex=selection?.anchor??selection?.pointIndex
  const selectedPointIndex=Number.isInteger(rawIndex)&&rawIndex>=0&&rawIndex<anchors.length?rawIndex:0
  const selectedPoint=anchors[selectedPointIndex]
  const revision=snapshot?.revision
  const locked=Boolean(disabled||!snapshot)
  const getAction=name=>{
    for(const candidate of actionAliases[name]||[name]){
      if(typeof actions?.[candidate]==='function')return actions[candidate]
    }
    return null
  }
  const invoke=(name,payload)=>{if(!locked)getAction(name)?.(payload)}
  const can=(name,condition=true)=>!locked&&condition&&Boolean(getAction(name))
  const filtered=useMemo(()=>pieces.filter(piece=>String(piece.name||piece.id).toLowerCase().includes(query.trim().toLowerCase())),[pieces,query])
  const layerGroups=[
    {name:'Construction lines',count:pieces.reduce((n,p)=>n+entries(p.polygon?.lines).length,0),key:'construction'},
    {name:'Curve control points',count:pieces.reduce((n,p)=>n+Object.values(p.polygon?.curves||{}).reduce((k,v)=>k+entries(v).length,0),0),key:'curves'},
    {name:'Notches',count:pieces.reduce((n,p)=>n+Object.values(p.polygon?.notches||{}).reduce((k,v)=>k+entries(v).length,0),0),key:'notches'},
    {name:'Seam links',count:seams.length,key:'seams'},
  ]
  const pointKey=activePiece?activePiece.id+':'+selectedPointIndex+':'+revision:'none'
  const pointValue=(axis)=>pointDraft.key===pointKey?(pointDraft[axis]??(selectedPoint?metric(selectedPoint[axis]):'')):(selectedPoint?metric(selectedPoint[axis]):'')
  const savePoint=()=>{
    if(!selectedPoint||!activePiece)return
    const x=Number(pointValue(0)),y=Number(pointValue(1))
    if(!Number.isFinite(x)||!Number.isFinite(y)){setDraftError('Enter valid X and Y coordinates.');return}
    setDraftError('')
    invoke('updatePoint',{panel:activePiece.id,anchor:selectedPointIndex,position:[x/1000,y/1000],revision})
    setPointDraft({})
  }
  const selectedSeam=seams.find(seam=>seam.id===selection?.seamId)
  const linkedSeams=activePiece?seams.filter(seam=>seam.a?.panel===activePiece.id||seam.b?.panel===activePiece.id):[]
  if(collapsed)return <aside className="mpp27 mpp27--collapsed" data-modaris-professional-panels="20261027"
    data-cad-collapsed="true" aria-label="EXO CAD panel collapsed">
    <button type="button" className="mpp27-rail-expand" onClick={()=>onToggleCollapsed?.()}
      aria-label="Expand EXO CAD panel" aria-expanded={false} title="Expand EXO CAD panel">
      <PanelLeftOpen size={19}/></button>

  </aside>
  return <aside className="mpp27" data-modaris-professional-panels="20261027"
    data-cad-collapsed="false" aria-label="Professional 2D pattern inspector">
    <header className="mpp27-top">
      <div className="mpp27-heading"><FolderTree size={16} aria-hidden="true"/><div><span className="mpp27-brand">EXO <b>CAD</b></span><span className="mpp27-discipline">Pattern workspace</span></div></div>
      <div className="mpp27-top-actions"><span className={'mpp27-status '+(snapshot?'is-live':'')}>{snapshot?'NATIVE':'OFFLINE'}</span>
        <button type="button" className="mpp27-collapse-button" onClick={()=>onToggleCollapsed?.()}
          disabled={!onToggleCollapsed} aria-label="Collapse EXO CAD panel" aria-expanded={true}
          title="Collapse EXO CAD panel"><PanelLeftClose size={17}/></button>
      </div>
    </header>
    <div className="mpp27-document"><div className="mpp27-document-title" title={template?.name||'No project loaded'}>{template?.name||'Open a pattern project'}</div><span className="mpp27-revision">REV {revision??'—'}</span></div>
    <nav className="mpp27-tabs" aria-label="2D inspector sections">
      {TABS.map(({id,label,icon:Icon})=><button key={id} type="button" aria-selected={tab===id} role="tab" className={tab===id?'active':''} onClick={()=>setTab(id)}><Icon size={15}/><span>{label}</span></button>)}
    </nav>
    <div className="mpp27-body">
      {tab==='pieces'&&<section role="tabpanel" aria-label="Pattern pieces">
        <div className="mpp27-section-label"><span>OBJECT BROWSER</span><b>{pieces.length} PIECES</b></div>
        <label className="mpp27-search"><Search size={14}/><input aria-label="Filter pattern pieces" placeholder="Find a pattern piece…" value={query} onChange={e=>setQuery(e.target.value)}/></label>
        <div className="mpp27-piece-list">{filtered.map(piece=><button className={'mpp27-piece '+(selection?.panel===piece.id?'selected':'')} key={piece.id} type="button" disabled={!can('selectPiece')} aria-pressed={selection?.panel===piece.id} onClick={()=>invoke('selectPiece',{panel:piece.id,revision})}>
          <span className="mpp27-piece-symbol"><Folder size={15}/></span><span className="mpp27-piece-copy"><strong>{piece.name||piece.id}</strong><small>{piece.id} · {entries(piece.polygon?.points).length} points</small></span><ChevronRight size={13}/>
        </button>)}{!filtered.length&&<p className="mpp27-empty">{pieces.length?'No matching pieces.':'No native pattern pieces.'}</p>}</div>
        <div className="mpp27-divider"/>
        <button type="button" className="mpp27-section-label mpp27-fold" aria-expanded={layersExpanded} onClick={()=>setLayersExpanded(v=>!v)}><span>DRAWING LAYERS</span>{layersExpanded?<ChevronDown size={14}/>:<ChevronRight size={14}/>}</button>
        {layersExpanded&&<div className="mpp27-layer-list">{layerGroups.map(layer=><div className="mpp27-layer" key={layer.key}><Layers3 size={13}/><span>{layer.name}</span><span className="mpp27-count">{layer.count}</span><button type="button" aria-label={'Toggle '+layer.name} title={getAction('toggleLayer')?'Toggle layer visibility':'Layer visibility controls unavailable'} disabled={!can('toggleLayer')} onClick={()=>invoke('toggleLayer',{layer:layer.key,revision})}><Eye size={14}/></button></div>)}</div>}
        {activePiece&&<div className="mpp27-subcard"><div className="mpp27-card-heading"><CircleDot size={15}/> POINT INSPECTOR <span>P{selectedPointIndex+1}</span></div>
          <div className="mpp27-point-row">{anchors.map((_,index)=><button key={index} type="button" disabled={!can('selectPoint')} aria-pressed={index===selectedPointIndex} onClick={()=>{setPointDraft({});setDraftError('');invoke('selectPoint',{panel:activePiece.id,anchor:index,revision})}}>P{index+1}</button>)}</div>
          {selectedPoint&&<div><div className="mpp27-coordinates"><label>X <span>mm</span><input type="number" step="0.1" value={pointValue(0)} disabled={!can('updatePoint')} onChange={e=>setPointDraft(v=>({...v,key:pointKey,0:e.target.value}))}/></label><label>Y <span>mm</span><input type="number" step="0.1" value={pointValue(1)} disabled={!can('updatePoint')} onChange={e=>setPointDraft(v=>({...v,key:pointKey,1:e.target.value}))}/></label></div>
            <button className="mpp27-primary" type="button" disabled={!can('updatePoint')||pointDraft.key!==pointKey} onClick={savePoint}><SlidersHorizontal size={13}/> Apply coordinates</button>{draftError&&<p className="mpp27-error" role="alert">{draftError}</p>}</div>}
          <div className="mpp27-meta"><span>Edge count</span><strong>{entries(activePiece.polygon?.edges).length}</strong><span>Fabric</span><strong>{fabrics.find(f=>f.id===activePiece.fabric)?.name||activePiece.fabric||'Unassigned'}</strong><span>Linked seams</span><strong>{linkedSeams.length}</strong></div>
        </div>}
      </section>}
      {tab==='seams'&&<section role="tabpanel" aria-label="Seam inspector">
        <div className="mpp27-section-label"><span>SEWING ASSEMBLY</span><b>{seams.length} LINKS</b></div>
        {seams.map((seam,index)=><button type="button" key={seam.id||index} className={'mpp27-seam '+(selectedSeam?.id===seam.id?'selected':'')} disabled={!can('selectSeam')} onClick={()=>invoke('selectSeam',{seamId:seam.id,panel:seam.a?.panel,edge:seam.a?.edge,revision})}><span className="mpp27-seam-icon"><Waypoints size={16}/></span><span><strong>{seam.id||'Sewing '+(index+1)}</strong><small>{seam.a?.panel||'—'} · {seam.a?.edge||'—'} ↔ {seam.b?.panel||'—'} · {seam.b?.edge||'—'}</small><small>{seam.allow_ease?'Ease enabled':'No ease'}{seam.reverse_b?' · Reversed correspondence':''}</small></span><ChevronRight size={13}/></button>)}
        {!seams.length&&<p className="mpp27-empty">No sewn edge pairs in this native garment.</p>}
        <div className="mpp27-actions"><button type="button" disabled={!can('openSeam',Boolean(selectedSeam))} onClick={()=>invoke('openSeam',{seamId:selectedSeam?.id,revision})}>Edit selected sewing</button><button type="button" disabled={!can('sewingAudit',seams.length>0)} onClick={()=>invoke('sewingAudit',{revision})}>Inspect seam balance</button></div>
      </section>}
      {tab==='grade'&&<section role="tabpanel" aria-label="Grade engineering">
        <div className="mpp27-section-label"><span>SIZE ENGINEERING</span><b>{snapshot?.activeGradedSize||'BASE'}</b></div>
        <div className="mpp27-feature"><Ruler size={21}/><strong>Grading & point rules</strong><p>Inspect graded pattern geometry and current native size catalog.</p></div>
        <div className="mpp27-meta"><span>Saved size catalog</span><strong>{snapshot?.gradeRunPersisted===true?'Persisted':snapshot?.gradeRunPersisted===false?'Not saved':'Unknown'}</strong><span>Active pattern</span><strong>{snapshot?.activeGradedSize||'Base template'}</strong><span>Revision</span><strong>{revision??'—'}</strong></div>
        <div className="mpp27-actions"><button type="button" disabled={!can('grade')} onClick={()=>invoke('grade',{panel:activePiece?.id||null,revision})}>Open grading rules</button><button type="button" disabled={!can('gradeAudit',snapshot?.gradeRunPersisted===true)} onClick={()=>invoke('gradeAudit',{panel:activePiece?.id||null,revision})}>Audit grade catalog</button></div>
        <p className="mpp27-note">Displayed size status comes from the saved native session.</p>
      </section>}
      {tab==='industrial'&&<section role="tabpanel" aria-label="Industrial verification">
        <div className="mpp27-section-label"><span>MANUFACTURING CONTROL</span><b>RUST NATIVE</b></div>
        <div className="mpp27-feature"><Activity size={22}/><strong>Industrial proof checks</strong><p>Verify sewing, allowances, cut geometry and release constraints in the native engine.</p></div>
        <div className="mpp27-meta"><span>Pattern pieces</span><strong>{pieces.length}</strong><span>Seam assignments</span><strong>{seams.length}</strong><span>Physical notch entries</span><strong>{layerGroups[2].count}</strong></div>
        <div className="mpp27-actions"><button type="button" disabled={!can('industrialAudit',pieces.length>0)} onClick={()=>invoke('industrialAudit',{panel:activePiece?.id||null,revision})}><ShieldCheck size={14}/> Run industrial audit</button><button type="button" disabled={!can('cutlines',pieces.length>0)} onClick={()=>invoke('cutlines',{revision})}><Scissors size={14}/> Generate cutline proof</button><button type="button" disabled={!can('export',pieces.length>0)} onClick={()=>invoke('export',{revision})}>Export native pattern</button></div>
        <p className="mpp27-note"><LockKeyhole size={13}/> Factory release requires independent manufacturing verification.</p>
      </section>}
    </div>
    <footer className="mpp27-footer"><span><span className="mpp27-dot"/> {snapshot?'NATIVE DOCUMENT':'DISCONNECTED'}</span><span>{pieces.length} PCS · {seams.length} SEAMS</span></footer>
  </aside>
}
