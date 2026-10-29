import {transformReference} from '../core/patternReferenceTransform20261029.js'
import React, {useEffect, useRef, useState} from 'react'
import {Plus, Copy, Trash2, Search} from 'lucide-react'
import {importPatternReferenceFile, readPatternReferences, savePatternReferences, REFERENCE_LIMIT, validatePatternReferences, calibratePatternReferenceDistance20261025} from '../core/nativePatternReferences20261025.js'
import './PatternReferencePanel20261025.css'

/** Object Browser content. Coordinates and dimensions are in millimeters.
 * Pass references to the 2D SVG renderer via onChange and render images beneath outlines.
 * Controlled usage: <PatternReferencePanel20261025 projectKey={key} references={items} onChange={setItems} />
 * Without references/onChange, the component manages its own browser storage.
 */
export default function PatternReferencePanel20261025({projectKey, references, onChange, selectedId, onSelect, disabled=false, variant='full'}) {
  const [local, setLocal] = useState([])
  const [selectedLocal, setSelectedLocal] = useState(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [calibrating,setCalibrating] = useState(false)
  const [calibrationPoints,setCalibrationPoints] = useState([])
  const [knownLengthMm,setKnownLengthMm] = useState(100)
  const [objectSearch,setObjectSearch] = useState('')
  const files = useRef(null)
  const controlled = Array.isArray(references) && typeof onChange === 'function'
  const items = controlled ? references : local
  const selected = selectedId === undefined ? selectedLocal : selectedId
  const select = onSelect || setSelectedLocal
  const epoch = useRef(0)
  const selectionEpoch = useRef(0)
  const current = useRef({projectKey, controlled})
  if (current.current.projectKey !== projectKey || current.current.controlled !== controlled) {
    ++selectionEpoch.current
  }
  current.current = {projectKey, controlled}
  const itemsRef = useRef({projectKey, items})
  if (itemsRef.current.projectKey !== projectKey || itemsRef.current.items !== items)
    itemsRef.current = {projectKey, items}
  const changeRef = useRef(null)

  useEffect(() => {
    const token = ++epoch.current
    // A previous project's image decode may remain pending. Its stale finally
    // must not clear the new project's spinner, so reset busy here instead.
    setReady(false);setLocal([]);setSelectedLocal(null);setError('');setBusy(false)
    if (!projectKey) return
    if (controlled) {setReady(true);return}
    readPatternReferences(projectKey).then(saved => {
      if (epoch.current !== token) return
      setLocal(saved);setReady(true)
    }).catch(e => {if(epoch.current===token){setError(e.message);setReady(true)}})
    return () => {epoch.current++}
  }, [projectKey, controlled])

  const change = next => {
    if (disabled || !projectKey) return
    try {
      const safe = validatePatternReferences(next)
      itemsRef.current = {projectKey, items:safe}
      if (controlled) onChange(safe)
      else {
        setLocal(safe)
        savePatternReferences(projectKey, safe).catch(e=>{
          if(current.current.projectKey===projectKey)
            setError('Changes could not be saved: '+e.message)
        })
      }
      setError('')
    } catch (e) {setError(e.message)}
  }
  changeRef.current = change
  const selectRef = useRef(select)
  selectRef.current = select
  const update = (id, patch) => change(items.map(item=>item.id===id ? {...item,...patch} : item))
  const add = async event => {
    const incoming = Array.from(event.target.files || [])
    event.target.value = ''
    // Until the current project's stored layers finish hydration, appending
    // would race the pending read and replace its existing references.
    if (!incoming.length || !projectKey || !ready) return
    if (items.length + incoming.length > REFERENCE_LIMIT) {setError('Maximum of 40 reference images per project');return}
    const selection = ++selectionEpoch.current
    const startedProject = projectKey
    setBusy(true);setError('')
    const token = epoch.current
    const isCurrent = () => epoch.current === token && selectionEpoch.current === selection && current.current.projectKey === startedProject
    try {
      const imports = []
      for (const file of incoming) imports.push(await importPatternReferenceFile(file))
      if (!isCurrent()) return
      const latest = itemsRef.current.items
      if (latest.length + imports.length > REFERENCE_LIMIT) throw Error('Maximum of 40 reference images per project')
      // The operator may edit/remove references while decoding. Merge with the
      // latest project state instead of the list captured at upload start.
      changeRef.current([...latest,...imports])
      selectRef.current(imports.at(-1)?.id)
    } catch (e) {if (isCurrent()) setError(e.message)}
    finally {if (isCurrent()) setBusy(false)}
  }
  const active = items.find(item=>item.id===selected) || items[0]
  const filteredItems=items.filter(item=>item.name.toLowerCase().includes(objectSearch.trim().toLowerCase()))
  const removeSelected = () => {
    if(!active)return
    const remaining=items.filter(item=>item.id!==active.id)
    change(remaining)
    select(remaining[0]?.id||null)
  }
  const copySelected = () => {
    if(!active||items.length>=REFERENCE_LIMIT)return
    const copied={...active,id:globalThis.crypto?.randomUUID?.()||`ref-${Date.now()}-${Math.random().toString(36).slice(2)}`,name:`${active.name} Copy`}
    change([...items,copied])
    select(copied.id)
  }
  useEffect(()=>{setCalibrating(false);setCalibrationPoints([])},[active?.id])
  const calibrationClick = event => {
    if(!calibrating||!active||disabled)return
    if(active.rotation!==0){setError('Set reference rotation to 0° before calibrating');return}
    const rect=event.currentTarget.getBoundingClientRect()
    if(!(rect.width>0&&rect.height>0))return
    const point={x:Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),
      y:Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height))}
    setCalibrationPoints(previous=>previous.length>=2?[point]:[...previous,point])
  }
  const applyCalibration = () => {
    try{
      if(!active||active.rotation!==0)throw Error('Set reference rotation to 0° before calibrating')
      const dims=calibratePatternReferenceDistance20261025(active,calibrationPoints,knownLengthMm)
      update(active.id,dims)
      setCalibrating(false)
      setCalibrationPoints([])
    }catch(e){setError(e.message)}
  }
  const number = (label, field, options={}) => <label className="pr26-number">{label}<input type="number" value={Number(active[field].toFixed(3))} min={options.min} max={options.max} step={options.step||1} disabled={disabled} onChange={e=>{
    if(e.target.value==='')return
    const n=Number(e.target.value)
    if(!Number.isFinite(n) || (options.min!=null&&n<options.min) || (options.max!=null&&n>options.max))return
    if((field==='widthMm'||field==='heightMm')&&active.lockAspectRatio){
      const ratio=active.widthMm/active.heightMm
      update(active.id,field==='widthMm'?{widthMm:n,heightMm:n/ratio}:{heightMm:n,widthMm:n*ratio})
    }else update(active.id,{[field]:n})
  }}/></label>
  if(variant==='list')return <section className="pr26-object-browser" aria-label="Reference object browser" data-reference-panel="20261025" data-reference-mode="list">
    <div className="clo-object-actions clo-object-actions-compact" role="group" aria-label="Reference object actions">
      <span className="clo-object-actions-count" title={`${items.length} reference images`}>{items.length}</span>
      <div className="clo-object-action-buttons">
        <button type="button" aria-label="Add reference" title="Import JPG, PNG, or WebP reference image"
          disabled={disabled||busy||!ready||!projectKey||items.length>=REFERENCE_LIMIT} onClick={()=>files.current?.click()}><Plus size={13}/>Add</button>
        <button type="button" aria-label="Copy selected reference" title="Duplicate selected reference"
          disabled={disabled||busy||!active||items.length>=REFERENCE_LIMIT} onClick={copySelected}><Copy size={12}/>Copy</button>
        <button type="button" aria-label="Remove selected reference" title="Remove selected reference"
          disabled={disabled||busy||!active} onClick={removeSelected}><Trash2 size={12}/>Remove</button>
      </div>
    </div>
    <input ref={files} hidden multiple type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" onChange={add}/>
    <div className="clo-object-search"><Search size={13}/><input aria-label="Search reference objects" placeholder="Filter objects…"
      value={objectSearch} onChange={event=>setObjectSearch(event.target.value)}/>
      {objectSearch&&<button type="button" aria-label="Clear reference search" onClick={()=>setObjectSearch('')}>×</button>}
    </div>
    {busy&&<p role="status" className="pr26-browser-notice">Preparing images…</p>}
    {error&&<p role="alert" className="pr26-browser-notice pr26-error">{error}</p>}
    <div className="clo-object-list" role="list" aria-label="Reference layers">
      {filteredItems.map((item,i)=><div role="listitem" key={item.id}
        className={`clo-object-row clo-object-graphic-row${item.id===active?.id?' selected':''}${item.visible===false?' is-hidden':''}`}>
        <label className="clo-object-graphic-toggle" title={item.visible?'Hide reference':'Show reference'}>
          <input type="checkbox" checked={item.visible!==false} disabled={disabled||busy}
            aria-label={`${item.visible?'Hide':'Show'} ${item.name}`} onChange={event=>update(item.id,{visible:event.target.checked})}/>
        </label>
        <button type="button" className="clo-object-select" aria-current={item.id===active?.id?'true':undefined}
          onClick={()=>select(item.id)}>
          <img className="clo-object-graphic-thumbnail" src={item.dataUrl} alt=""/>
          <span className="clo-object-row-name">{item.name}
            <small>{Number(item.widthMm).toFixed(1)} × {Number(item.heightMm).toFixed(1)} mm · Reference</small>
          </span>
        </button>
        <button type="button" className="clo-object-mini-action" aria-label={`Remove ${item.name}`} title="Remove reference"
          disabled={disabled||busy} onClick={()=>{
            const remaining=items.filter(row=>row.id!==item.id)
            change(remaining)
            if(item.id===active?.id)select(remaining[0]?.id||null)
          }}><Trash2 size={13}/></button>
      </div>)}
      {!filteredItems.length&&<div className="clo-object-empty">
        {objectSearch?'No matching objects.':!projectKey?'Open a garment project to add references.':
          'No reference images yet. Select Add to import a pattern photo.'}
      </div>}
    </div>
  </section>
  return <section className="pr26" aria-label={variant==='properties'?'Reference photo properties':'Reference object browser'} data-reference-panel="20261025" data-reference-mode={variant}>
    {variant!=='properties'&&<>
    <header className="pr26-head"><div><strong>Reference</strong><small>Background images for digital pattern tracing</small></div><button type="button" disabled={disabled||busy||!ready||!projectKey||items.length>=REFERENCE_LIMIT} onClick={()=>files.current?.click()}>+ Add</button></header>
    <input ref={files} hidden multiple type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" onChange={add}/>
    {!projectKey&&<p className="pr26-info">Open a garment project to add references.</p>}
    {busy&&<p role="status">Preparing images…</p>}
    {error&&<p role="alert" className="pr26-error">{error}</p>}
    <div className="pr26-list" role="group" aria-label="Reference layers">
      {items.map((item,i)=><div className={'pr26-item '+(item.id===active?.id?'active':'')} key={item.id}>
        <button type="button" className="pr26-pick" onClick={()=>select(item.id)} aria-pressed={item.id===active?.id}>
          <img src={item.dataUrl} alt=""/><span>{item.name}<small>Reference {i+1}</small></span>
        </button><button type="button" aria-label={item.visible?'Hide reference':'Show reference'} title={item.visible?'Hide':'Show'} disabled={disabled} onClick={()=>update(item.id,{visible:!item.visible})}>{item.visible?'◉':'○'}</button>
      </div>)}
    </div>
    {ready&&!items.length&&<p className="pr26-info">Add a photo of a physical pattern, then adjust its scale and opacity before tracing.</p>}
    </>}
    {variant!=='list'&&active&&<div className="pr26-controls">
      <label>Name<input type="text" maxLength={180} value={active.name} disabled={disabled} onChange={e=>update(active.id,{name:e.target.value})}/></label>
      <div className="pr26-preview"><div className="pr26-calibration-canvas">
        <img src={active.dataUrl} alt={active.name}
          onClick={calibrationClick} aria-label={calibrating?'Click the first or second ruler point on the photo':undefined}
          style={{opacity:active.opacity,transform:`rotate(${active.rotation}deg)`,cursor:calibrating?'crosshair':'default'}}/>
        {calibrating&&calibrationPoints.map((p,i)=><span key={i} className="pr26-calibration-marker"
          style={{left:`${p.x*100}%`,top:`${p.y*100}%`}} aria-hidden="true">{i+1}</span>)}
      </div></div>
      <div className="pr26-calibration">
        <div><strong>Calibrate from a ruler</strong><small>For accurate physical-pattern tracing</small></div>
        <button type="button" disabled={disabled} aria-pressed={calibrating}
          onClick={()=>{setCalibrating(v=>!v);setCalibrationPoints([]);setError('')}}>
          {calibrating?'Cancel calibration':'Select two points'}</button>
        {calibrating&&<><p>Click two marks on the photo whose physical distance you know. A photo taken flat and straight-on gives the best measurements.</p>
          <label>Real distance (mm) <input type="number" min="1" max="100000" step=".1" value={knownLengthMm}
            onChange={e=>setKnownLengthMm(e.target.value)} /></label>
          <button type="button" disabled={calibrationPoints.length!==2} onClick={applyCalibration}>Apply calibrated scale</button>
        </>}
      </div>
      <label>Opacity <output>{Math.round(active.opacity*100)}%</output><input aria-label="Reference opacity" type="range" min="0" max="100" value={Math.round(active.opacity*100)} onChange={e=>update(active.id,{opacity:Number(e.target.value)/100})} disabled={disabled}/></label>
      <div className="pr26-grid">{number('X (mm)','xMm')}{number('Y (mm)','yMm')}{number('Width (mm)','widthMm',{min:1})}{number('Height (mm)','heightMm',{min:1})}{number('Rotation (°)','rotation',{min:-3600,max:3600})}</div>
      <label><input type="checkbox" checked={active.lockAspectRatio} disabled={disabled} onChange={e=>update(active.id,{lockAspectRatio:e.target.checked})}/> Preserve image proportions</label>
      <label><input type="checkbox" checked={active.locked} disabled={disabled} onChange={e=>update(active.id,{locked:e.target.checked})}/> Lock position for tracing</label>
      <label><input type="checkbox" checked={active.visible} disabled={disabled} onChange={e=>update(active.id,{visible:e.target.checked})}/> Visible on 2D canvas</label>
      <button type="button" disabled={disabled} onClick={()=>{change(items.filter(item=>item.id!==active.id));select(items.find(item=>item.id!==active.id)?.id||null)}}>Remove reference</button>
      <p className="pr26-info">Reference images are editor overlays and are excluded from cutting, printing, and garment simulation. Set a known physical width for accurate tracing.</p>
    </div>}
    {variant==='properties'&&!active&&<p className="pr26-info">Select a reference image above to edit its dimensions, opacity, and tracing calibration.</p>}
  </section>
}

/** Standalone 2D SVG overlay. Parent SVG viewBox must use millimeters; position beneath pattern paths. */
export function PatternReferencesSvgLayer20261025({references=[],onChange,interactive=false,rootUnitMm=1}) {
 const layer=useRef(null),dragging=useRef(null),latest=useRef(references)
 latest.current=references
 const [selected,setSelected]=useState(null)
 const point=event=>{const node=layer.current,svg=node?.ownerSVGElement,matrix=node?.getScreenCTM();if(!svg||!matrix)return null;const p=svg.createSVGPoint();p.x=event.clientX;p.y=event.clientY;return p.matrixTransform(matrix.inverse())}
 const cancel=()=>{const drag=dragging.current;if(drag){onChange?.(latest.current.map(r=>r.id===drag.reference.id?drag.reference:r));dragging.current=null}}
 useEffect(()=>{const key=e=>{if(e.key==='Escape'){cancel();setSelected(null)}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[onChange])
 const start=(event,reference,handle)=>{if(event.button!==0)return;setSelected(reference.id);event.stopPropagation();if(reference.locked)return;const p=point(event);if(!p)return;setSelected(reference.id);dragging.current={reference:{...reference},handle,start:p,pointerId:event.pointerId};event.currentTarget.setPointerCapture(event.pointerId);event.preventDefault();event.stopPropagation()}
 const move=event=>{const d=dragging.current;if(!d||d.pointerId!==event.pointerId)return;const p=point(event);if(!p)return;onChange?.(latest.current.map(r=>r.id===d.reference.id?transformReference(d.reference,d.handle,p.x-d.start.x,p.y-d.start.y):r));event.stopPropagation()}
 const finish=event=>{dragging.current=null;event.stopPropagation()}
 const handles=[['nw',0,0],['n',.5,0],['ne',1,0],['e',1,.5],['se',1,1],['s',.5,1],['sw',0,1],['w',0,.5]]
 const matrix=layer.current?.getScreenCTM(),scale=matrix?Math.hypot(matrix.a,matrix.b):1
 const handleSize=8/Math.max(.01,scale)
 return <g ref={layer} data-pattern-reference-layer="true">{references.filter(r=>r.visible!==false).map(r=><g key={r.id} data-reference-id={r.id} transform={`translate(${r.xMm} ${r.yMm}) rotate(${r.rotation||0} ${r.widthMm/2} ${r.heightMm/2})`}>
 <image href={r.dataUrl} width={r.widthMm} height={r.heightMm} opacity={r.opacity} preserveAspectRatio="none" pointerEvents="none"/>
 {interactive&&<>
 <rect aria-label={`Move reference photo ${r.name||r.id}`} data-reference-move={r.id} width={r.widthMm} height={r.heightMm} fill="transparent" stroke={selected===r.id?'#20252b':'none'} strokeWidth="1.5" vectorEffect="non-scaling-stroke" style={{cursor:'move',touchAction:'none'}} onPointerDown={e=>start(e,r,'move')} onPointerMove={move} onPointerUp={finish} onPointerCancel={cancel}/>
 {selected===r.id&&r.locked&&<text x={0} y={-handleSize} fontSize={handleSize*1.5} fill="#20252b" stroke="white" strokeWidth={handleSize*.25} paintOrder="stroke" role="button" tabIndex={0} aria-label="Unlock reference photo" style={{cursor:'pointer'}} onPointerDown={e=>e.stopPropagation()} onClick={()=>onChange?.(references.map(item=>item.id===r.id?{...item,locked:false}:item))} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onChange?.(references.map(item=>item.id===r.id?{...item,locked:false}:item))}}}>Unlock photo</text>}
 {selected===r.id&&!r.locked&&handles.map(([handle,x,y])=><rect key={handle} data-reference-resize={handle} aria-label={`Resize reference photo ${handle}`} x={r.widthMm*x-handleSize/2} y={r.heightMm*y-handleSize/2} width={handleSize} height={handleSize} fill="white" stroke="#20252b" strokeWidth="1" vectorEffect="non-scaling-stroke" style={{cursor:handle+'-resize',touchAction:'none'}} onPointerDown={e=>start(e,r,handle)} onPointerMove={move} onPointerUp={finish} onPointerCancel={cancel}/>)}
 </>}
 </g>)}</g>
}
