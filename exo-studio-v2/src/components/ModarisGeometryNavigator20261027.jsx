import React, {useMemo, useState} from 'react'
import {ChevronDown, ChevronRight, CircleDot, GitBranch, Layers3, Search} from 'lucide-react'
import './ModarisGeometryNavigator20261027.css'

const array = value => Array.isArray(value) ? value : []
const record = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {}
const mm = value => typeof value === 'number' && Number.isFinite(value) ? (value * 1000).toFixed(2) : '—'
const coords = point => Array.isArray(point) ? `X ${mm(point[0])} · Y ${mm(point[1])} mm` : 'Coordinates unavailable'
const matches = (query, ...values) => values.some(value => String(value ?? '').toLowerCase().includes(query))

/**
 * Read-only tree of authoritative native geometry.
 * Every selection callback receives the same panel/anchor/edge/seamId/revision
 * contract as ModarisProfessionalPanels20261027. Unsupported entity selection
 * is visibly disabled, with no synthetic geometry or speculative commands.
 */
export default function ModarisGeometryNavigator20261027({
  snapshot, selection = {}, actions = {}, disabled = false, fullWidth2D = true,
}) {
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState({})
  const [showAll, setShowAll] = useState(true)
  const panels = array(snapshot?.template?.panels)
  const seams = array(snapshot?.template?.seams)
  const revision = snapshot?.revision
  const filter = query.trim().toLowerCase()
  const locked = disabled || !snapshot
  const handler = type => {
    const aliases = {
      piece: ['selectPiece', 'onSelectPiece', 'select'],
      point: ['selectPoint', 'onSelectPoint'],
      edge: ['selectEdge', 'onSelectEdge'],
      seam: ['selectSeam', 'onSelectSeam'],
      line: ['selectLine', 'onSelectLine'],
      curve: ['selectCurve', 'onSelectCurve'],
      notch: ['selectNotch', 'onSelectNotch'],
      allowance: ['selectAllowance', 'onSelectAllowance'],
    }
    return (aliases[type] || []).map(key => actions?.[key]).find(fn => typeof fn === 'function')
  }
  const select = (type, payload) => { if (!locked) handler(type)?.({...payload, revision}) }
  const open = (id, fallback = false) => expanded[id] ?? fallback
  const toggle = id => setExpanded(old => ({...old, [id]: !open(id, true)}))
  const model = useMemo(() => panels.map(panel => {
    const polygon = record(panel.polygon)
    const edges = array(polygon.edges)
    const groups = [
      {id:'points', title:'Construction points', rows:array(polygon.points).map((point,index) => ({
        id:`point:${index}`, label:`P${index+1}`, detail:coords(point), type:'point',
        payload:{panel:panel.id,anchor:index}, selected:selection.panel===panel.id && (selection.anchor ?? selection.pointIndex) === index,
      }))},
      {id:'edges', title:'Contour edges', rows:edges.map((edge,index) => ({
        id:`edge:${index}`, label:String(edge), detail:`Edge ${index+1} · P${index+1} → P${(index+1)%Math.max(array(polygon.points).length,1)+1}`,
        type:'edge', payload:{panel:panel.id,edge}, selected:selection.panel===panel.id && selection.edge===edge,
      }))},
      {id:'curves', title:'Curve controls', rows:Object.entries(record(polygon.curves)).flatMap(([edge,controls]) =>
        array(controls).map((point,index) => ({
          id:`curve:${edge}:${index}`, label:`${edge} · C${index+1}`,
          detail:coords(point), type:'curve', payload:{panel:panel.id,edge,controlIndex:index},
        })))},
      {id:'lines', title:'Construction lines', rows:array(polygon.lines).map((line,index) => ({
        id:`line:${line?.id ?? index}`, label:String(line?.name || line?.id || `Line ${index+1}`),
        detail:String(line?.type || 'Construction'), type:'line',payload:{panel:panel.id,lineId:line?.id},
      }))},
      {id:'notches', title:'Notch stations', rows:Object.entries(record(polygon.notches)).flatMap(([edge,marks]) =>
        array(marks).map((mark,index) => ({
          id:`notch:${edge}:${index}`, label:`${edge} · N${index+1}`,
          detail:`t ${Number.isFinite(mark?.t) ? mark.t.toFixed(3) : '—'} · depth ${mm(mark?.depth_m)} mm`,
          type:'notch',payload:{panel:panel.id,edge,notchIndex:index},
        })))},
      {id:'allowances',title:'Seam allowances',rows:Object.entries(record(polygon.seam_allowances)).map(([edge,width]) => ({
        id:`allowance:${edge}`,label:String(edge),detail:`${mm(width)} mm`,
        type:'allowance',payload:{panel:panel.id,edge},
      }))},
      {id:'seams',title:'Sewn edges',rows:seams.filter(seam => seam?.a?.panel===panel.id || seam?.b?.panel===panel.id).map((seam,index) => ({
        id:`seam:${seam.id ?? index}`,label:String(seam.id || `Seam ${index+1}`),
        detail:`${seam.a?.panel || '—'}:${seam.a?.edge || '—'} ↔ ${seam.b?.panel || '—'}:${seam.b?.edge || '—'}`,
        type:'seam',payload:{panel:panel.id,seamId:seam.id,edge:seam.a?.panel===panel.id ? seam.a?.edge : seam.b?.edge},
        selected:selection.seamId===seam.id,
      }))},
    ]
    return {panel,groups:groups.map(group=>({...group,rows:group.rows.filter(row=>!filter || matches(filter,panel.name,panel.id,group.title,row.label,row.detail))})).filter(group=>group.rows.length)}
  }),[panels,seams,selection,filter])
  if (!fullWidth2D) return null
  const visible = model.filter(item=>item.groups.length)
  return <aside className="mgn27" aria-label="Native geometry navigator" data-modaris-geometry-navigator="20261027">
    <header className="mgn27-header"><Layers3 size={16}/><strong>GEOMETRY NAVIGATOR</strong><span>{snapshot ? `R${revision ?? '—'}` : 'OFFLINE'}</span></header>
    <div className="mgn27-toolbar"><label><Search size={13}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Find geometry…" aria-label="Filter native geometry"/></label><button type="button" onClick={()=>setShowAll(value=>!value)} aria-label={showAll?'Collapse all geometry':'Expand all geometry'}>{showAll?'Collapse':'Expand'}</button></div>
    <div className="mgn27-scroll">
      {!snapshot && <p className="mgn27-empty">Open a native pattern to inspect geometry.</p>}
      {snapshot && !visible.length && <p className="mgn27-empty">{filter?'No matching geometry.':'No native pattern geometry.'}</p>}
      {visible.map(({panel,groups})=><section className="mgn27-piece" key={panel.id}>
        <div className="mgn27-piece-head"><button type="button" className="mgn27-expander" aria-label={`Toggle ${panel.name||panel.id}`} aria-expanded={showAll&&open(`piece:${panel.id}`,true)} onClick={()=>toggle(`piece:${panel.id}`)}>{showAll&&open(`piece:${panel.id}`,true)?<ChevronDown size={14}/>:<ChevronRight size={14}/>}</button><button type="button" className="mgn27-entity mgn27-piece-select" disabled={locked||!handler('piece')} aria-pressed={selection.panel===panel.id} onClick={()=>select('piece',{panel:panel.id})}><Layers3 size={13}/><strong>{panel.name||panel.id}</strong><small>{panel.id}</small></button></div>
        {showAll&&open(`piece:${panel.id}`,true)&&groups.map(group=><div className="mgn27-group" key={group.id}>
          <button type="button" className="mgn27-group-head" onClick={()=>toggle(`${panel.id}:${group.id}`)} aria-expanded={open(`${panel.id}:${group.id}`,group.id==='points')}><span>{open(`${panel.id}:${group.id}`,group.id==='points')?<ChevronDown size={12}/>:<ChevronRight size={12}/>}</span>{group.title}<em>{group.rows.length}</em></button>
          {open(`${panel.id}:${group.id}`,group.id==='points')&&group.rows.map(row=><button type="button" key={row.id} className="mgn27-entity mgn27-row" disabled={locked||!handler(row.type)} aria-pressed={Boolean(row.selected)} title={!handler(row.type)?'Selection unavailable in the current workspace':row.detail} onClick={()=>select(row.type,row.payload)}><CircleDot size={12}/><span><strong>{row.label}</strong><small>{row.detail}</small></span></button>)}
        </div>)}
      </section>)}
    </div>
    <footer className="mgn27-footer"><GitBranch size={12}/> {panels.length} pieces · {seams.length} seam links · native metres shown in mm</footer>
  </aside>
}
