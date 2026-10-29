import React, {useState} from 'react'
import {Crosshair, MoveHorizontal, MoveVertical, Ruler, SquareDashedBottom, Target} from 'lucide-react'
import {nativeRustEdgeLength20261023} from '../core/nativeRustArcLengthCompat20261023.js'
import './ModarisPrecisionInspector20261027.css'

const validPoint = p => Array.isArray(p) && p.length === 2 && p.every(v => typeof v === 'number' && Number.isFinite(v))
const fmt = n => typeof n === 'number' && Number.isFinite(n) ? (n * 1000).toFixed(2) : '—'
const list = v => Array.isArray(v) ? v : []
const aliases = {
  selectPiece: ['selectPiece', 'onSelectPiece', 'select'],
  selectPoint: ['selectPoint', 'onSelectPoint'],
  selectEdge: ['selectEdge', 'onSelectEdge'],
  updatePoint: ['updatePoint', 'onUpdatePoint'],
}

/** Source data is the authoritative native snapshot in metres.
 * Props: snapshot, selection:{panel,anchor?/pointIndex?,edge?}, actions, disabled, fullWidth2D.
 * Selection callbacks: ({panel,anchor|edge,revision}); updatePoint callback:
 * ({panel,anchor,position:[xMetres,yMetres],revision}). Missing handlers fail closed.
 * Parent owns commits/validation and supplies a refreshed snapshot after successful edits.
 */
export default function ModarisPrecisionInspector20261027({snapshot, selection = {}, actions = {}, disabled = false, fullWidth2D = true}) {
  const [draft,setDraft] = useState({})
  const [error,setError] = useState('')
  const panels = list(snapshot?.template?.panels)
  const revision = snapshot?.revision
  const panel = panels.find(item => item?.id === selection?.panel) || null
  const polygon = panel?.polygon
  const points = list(polygon?.points)
  const edges = list(polygon?.edges)
  const anchor = selection?.anchor ?? selection?.pointIndex
  const anchorIndex = Number.isInteger(anchor) && anchor >= 0 && anchor < points.length ? anchor : null
  const point = anchorIndex !== null && validPoint(points[anchorIndex]) ? points[anchorIndex] : null
  const edgeIndex = typeof selection?.edge === 'string' ? edges.indexOf(selection.edge) : -1
  const edgeName = edgeIndex >= 0 ? edges[edgeIndex] : null
  const edgeStart = edgeIndex >= 0 ? points[edgeIndex] : null
  const edgeEnd = edgeIndex >= 0 && points.length ? points[(edgeIndex + 1) % points.length] : null
  const validEdge = Boolean(edgeName && validPoint(edgeStart) && validPoint(edgeEnd) && points.length === edges.length)
  const measurement = validEdge ? nativeRustEdgeLength20261023(polygon,edgeName) : null
  const bounds = points.length >= 3 && points.every(validPoint) ? {
    minX: Math.min(...points.map(p => p[0])), maxX: Math.max(...points.map(p => p[0])),
    minY: Math.min(...points.map(p => p[1])), maxY: Math.max(...points.map(p => p[1])),
  } : null
  const handler = name => aliases[name].map(key => actions?.[key]).find(fn => typeof fn === 'function')
  const can = name => Boolean(snapshot && !disabled && handler(name))
  const invoke = (name,payload) => { if (can(name)) handler(name)({...payload,revision}) }
  const draftKey = `${String(panel?.id ?? '')}:${anchorIndex ?? ''}:${String(revision ?? '')}:${point?.join(':') ?? ''}`
  const value = axis => draft.key === draftKey && Object.hasOwn(draft,axis) ? draft[axis] : point ? fmt(point[Number(axis)]) : ''
  const dirty = Boolean(point && draft.key === draftKey && (Object.hasOwn(draft,'0') || Object.hasOwn(draft,'1')))
  const apply = () => {
    if (!point || !can('updatePoint')) return
    const rawX = String(value('0')).trim(), rawY = String(value('1')).trim()
    if (!rawX || !rawY) {setError('Both coordinates are required.');return}
    const x = Number(rawX), y = Number(rawY)
    if (![x,y].every(Number.isFinite) || [x,y].some(n => Math.abs(n)>100000)) {
      setError('Enter finite coordinates within ±100,000 mm.');return
    }
    setError('')
    invoke('updatePoint',{panel:panel.id,anchor:anchorIndex,position:[x / 1000,y / 1000]})
    setDraft({})
  }
  if (!fullWidth2D) return null
  return <aside className="mpi27" aria-label="CAD precision inspector" data-modaris-precision-inspector="20261027">
    <header className="mpi27-heading"><Target size={16}/><strong>PRECISION INSPECTOR</strong><span>{snapshot ? `REV ${revision ?? '—'}` : 'OFFLINE'}</span></header>
    <div className="mpi27-scroll">
      {!panel ? <p className="mpi27-empty">{snapshot ? 'Select a pattern piece to inspect its geometry.' : 'Open a native pattern to inspect geometry.'}</p> : <>
        <div className="mpi27-identity"><span>ACTIVE PIECE</span><strong>{panel.name || panel.id}</strong><small>{panel.id}</small></div>
        <section className="mpi27-section" aria-label="Piece dimensions"><h3><SquareDashedBottom size={14}/> PIECE BOUNDS</h3>
          <div className="mpi27-grid"><span>Width</span><strong>{bounds ? fmt(bounds.maxX - bounds.minX) : '—'} mm</strong><span>Height</span><strong>{bounds ? fmt(bounds.maxY - bounds.minY) : '—'} mm</strong><span>Origin X / Y</span><strong>{bounds ? `${fmt(bounds.minX)} / ${fmt(bounds.minY)} mm` : '—'}</strong><span>Anchors / edges</span><strong>{points.length} / {edges.length}</strong></div>
          <p className="mpi27-note">Bounds measured from native contour anchors in piece coordinates.</p>
        </section>
        <section className="mpi27-section" aria-label="Point precision"><h3><Crosshair size={14}/> POINT COORDINATES</h3>
          <div className="mpi27-picker" aria-label="Select pattern anchor">{points.map((p,i)=><button type="button" key={i} disabled={!validPoint(p) || !can('selectPoint')} aria-pressed={anchorIndex===i} onClick={()=>{setDraft({});setError('');invoke('selectPoint',{panel:panel.id,anchor:i})}}>P{i+1}</button>)}</div>
          {!point ? <p className="mpi27-empty">Select an anchor to view its exact coordinates.</p> : <>
            <div className="mpi27-selected">P{anchorIndex+1} <span>Native coordinates · mm</span></div>
            <div className="mpi27-inputs"><label><MoveHorizontal size={13}/> X <span>mm</span><input type="number" step="0.01" disabled={!can('updatePoint')} value={value('0')} onChange={e=>{setError('');setDraft(old=>({...old,key:draftKey,'0':e.target.value}))}}/></label><label><MoveVertical size={13}/> Y <span>mm</span><input type="number" step="0.01" disabled={!can('updatePoint')} value={value('1')} onChange={e=>{setError('');setDraft(old=>({...old,key:draftKey,'1':e.target.value}))}}/></label></div>
            <button className="mpi27-apply" type="button" disabled={!can('updatePoint') || !dirty} onClick={apply}>Apply point coordinates</button>
            {error && <p className="mpi27-error" role="alert">{error}</p>}
          </>}
        </section>
        <section className="mpi27-section" aria-label="Edge precision"><h3><Ruler size={14}/> CONTOUR EDGE</h3>
          <div className="mpi27-picker" aria-label="Select contour edge">{edges.map((edge,i)=><button type="button" key={`${String(edge)}:${i}`} title={String(edge)} disabled={typeof edge !== 'string' || !can('selectEdge')} aria-pressed={edgeIndex===i} onClick={()=>invoke('selectEdge',{panel:panel.id,edge})}>E{i+1}</button>)}</div>
          {!validEdge ? <p className="mpi27-empty">Select a valid named edge to inspect endpoints and length.</p> : <>
            <div className="mpi27-selected">{edgeName}<span>E{edgeIndex+1}</span></div>
            <div className="mpi27-grid"><span>Start · P{edgeIndex+1}</span><strong>{fmt(edgeStart[0])} / {fmt(edgeStart[1])} mm</strong><span>End · P{(edgeIndex+1)%points.length+1}</span><strong>{fmt(edgeEnd[0])} / {fmt(edgeEnd[1])} mm</strong><span>Chord length</span><strong>{fmt(Math.hypot(edgeEnd[0]-edgeStart[0],edgeEnd[1]-edgeStart[1]))} mm</strong><span>Contour length</span><strong>{measurement?.ok ? `${fmt(measurement.totalLengthM)} mm` : '—'}</strong></div>
            <p className="mpi27-note">{measurement?.ok ? 'Contour length follows authored cubic and free-curve geometry.' : `Physical edge measurement unavailable${measurement?.reason ? `: ${measurement.reason}` : '.'}`}</p>
          </>}
        </section>
      </>}
    </div>
  </aside>
}
