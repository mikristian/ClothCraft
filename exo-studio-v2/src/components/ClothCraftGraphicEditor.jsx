import React, {useEffect, useRef, useState} from 'react'
import {createGarmentGraphic, importGarmentArtwork, normalizeGarmentGraphic, serializeGarmentGraphics, deserializeGarmentGraphics} from '../core/nativeGarmentGraphics.js'
import {graphicDisplayUnit,graphicMmToDisplay,graphicDisplayToMm,graphicDisplayPrecision} from '../core/graphicDisplayUnits.js'
import './ClothCraftGraphicEditor.css'

// Demo asset: Nike swoosh trademark, sourced from Wikimedia Commons.
// This is a garment-editor placement example, not an endorsed Nike product.
const BRAND_SAMPLE_URL = '/graphic-presets/nike-swoosh.svg'

/** Controlled panel artwork editor. Parent stores `graphics` and passes onChange(nextGraphics). */
export default function ClothCraftGraphicEditor({graphics = [], onChange = () => {}, panelId, panels = [], disabled = false, selectedGraphicId, onSelectGraphic, showLayerList = true, unit = 'mm'}) {
  const inputRef = useRef(null)
  const layoutRef = useRef(null)
  const previewRef = useRef(null)
  const normalMapRef = useRef(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const chooseGraphic=id=>{setSelectedId(id);onSelectGraphic?.(id)}
  useEffect(()=>{
    const select=event=>{
      const id=event.detail?.id
      if(graphics.some(graphic=>graphic.id===id))chooseGraphic(id)
    }
    const add=()=>{if(!busy&&!disabled)inputRef.current?.click()}
    window.addEventListener('exo-clothcraft-select-graphic',select)
    window.addEventListener('exo-clothcraft-add-graphic',add)
    return()=>{window.removeEventListener('exo-clothcraft-select-graphic',select);window.removeEventListener('exo-clothcraft-add-graphic',add)}
  },[graphics,busy,disabled,onSelectGraphic])
  const controlledSelection=selectedGraphicId !== undefined
  const selected = graphics.find(graphic => graphic.id === (controlledSelection ? selectedGraphicId : selectedId)) || (!controlledSelection ? graphics.find(graphic => graphic.panel === panelId) || graphics[0] : null)
  const panel = panels.find(p => p.id === selected?.panel)
  const bounds = panel?.polygon?.points
  const physicalBounds = panel?.printBoundsMm
  const panelSpan = physicalBounds?.widthMm > 0 && physicalBounds?.heightMm > 0
    ? [physicalBounds.widthMm,physicalBounds.heightMm]
    : bounds?.length ? [0,1].map(axis => (Math.max(...bounds.map(p => p[axis])) - Math.min(...bounds.map(p => p[axis]))) * 1000) : null
  const normalizedPosition = selected?.center || [.5,.5]
  const printWidth = selected?.widthMm ?? 100
  const printHeight = selected?.heightMm ?? (printWidth * (selected?.height || 1) / (selected?.width || 1))
  const displayUnit=graphicDisplayUnit(unit)
  const displayPrecision=graphicDisplayPrecision(displayUnit)
  const displaySize=mm=>Number(graphicMmToDisplay(mm,displayUnit).toFixed(displayPrecision))
  const displayStep=displayUnit==='mm'?.1:displayUnit==='cm'?.01:.001
  const positionMm = selected?.positionMm || (panelSpan ? [normalizedPosition[0]*panelSpan[0]-printWidth/2,normalizedPosition[1]*panelSpan[1]-printHeight/2] : [0,0])
  const dpi = selected?.widthMm > 0 && selected?.width > 0 ? selected.width * 25.4 / selected.widthMm : null
  const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback
  const update = (id, patch) => {
    try {onChange(graphics.map(graphic => graphic.id === id ? normalizeGarmentGraphic({...graphic, ...patch}) : graphic));setError('')}
    catch (e) {setError(e.message)}
  }
  function sizeChange(axis, value) {
    const changedMm=graphicDisplayToMm(value,displayUnit)
    if (!selected || String(value).trim()==='' || !Number.isFinite(changedMm) || changedMm < 1 || changedMm > 10000) return
    const width = number(selected.widthMm, 100)
    const height = number(selected.heightMm, width * (selected.height || 1) / (selected.width || 1))
    const lock = selected.lockAspectRatio !== false
    const ratio = width > 0 && height > 0 ? width / height : (selected.width || 1) / (selected.height || 1)
    update(selected.id, axis === 'widthMm'
      ? {widthMm:changedMm, ...(lock ? {heightMm:changedMm / ratio} : {})}
      : {heightMm:changedMm, ...(lock ? {widthMm:changedMm * ratio} : {})})
  }
  function moveGraphic(axis, mm) {
    if (!selected || !Number.isFinite(+mm)) return
    const next = [...positionMm]
    next[axis] = +mm
    update(selected.id,{positionMm:next,...(panelSpan?.[axis] > 0 ? {center: next.map((n,i) => panelSpan[i] > 0 ? (n+[printWidth,printHeight][i]/2)/panelSpan[i] : .5)} : {})})
  }
  function moveNormalized(axis, fraction) {
    if (!selected || !Number.isFinite(fraction)) return
    const topLeft = [...positionMm]
    if (panelSpan) topLeft[axis]=Math.max(0,Math.min(1,fraction))*panelSpan[axis]
    const center=panelSpan?topLeft.map((n,i)=>(n+[printWidth,printHeight][i]/2)/panelSpan[i]):selected.center||[.5,.5]
    if(!panelSpan)center[axis]=Math.max(0,Math.min(1,fraction))
    update(selected.id,{center,...(panelSpan?{positionMm:topLeft}:{})})
  }
  function exportPrintSvg() {
    try {
      if (!selected) return
      const widthMm=selected.widthMm,heightMm=selected.heightMm
      if (!(Number.isFinite(widthMm)&&widthMm>0&&Number.isFinite(heightMm)&&heightMm>0)) throw new Error('Set valid physical width and height before exporting a 1:1 print.')
      if (!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(selected.dataUrl||'')) throw new Error('Print source must be an embedded PNG.')
      const size=n=>Number(n.toFixed(5))
      const svg=`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size(widthMm)}mm" height="${size(heightMm)}mm" viewBox="0 0 ${size(widthMm)} ${size(heightMm)}">
  <image x="0" y="0" width="${size(widthMm)}" height="${size(heightMm)}" preserveAspectRatio="none" xlink:href="${selected.dataUrl}"/>
</svg>`
      const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}))
      const anchor=document.createElement('a')
      anchor.href=url
      const safeName=String(selected.name||'garment-print').replace(/\.[^.]+$/,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,70)||'garment-print'
      anchor.download=`${safeName}-1to1-print.svg`
      anchor.click()
      setTimeout(()=>URL.revokeObjectURL(url),1000)
      setError('')
    } catch(e) {setError(e.message||'SVG export failed')}
  }
  async function loadNormalMap(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !selected) return
    setBusy(true)
    try {
      const image = await importGarmentArtwork(file)
      update(selected.id, {normalMapDataUrl:image.dataUrl})
    } catch (e) {setError(e.message || 'Normal map could not be imported')}
    finally {setBusy(false)}
  }
  const currentPanel = panelId || panels[0]?.id
  async function addFiles(event) {
    const files = [...(event.target.files || [])]
    event.target.value = ''
    if (!files.length) return
    if (!currentPanel) {setError('Select a garment panel before adding artwork.');return}
    setBusy(true)
    setError('')
    try {
      const imported = []
      if (graphics.length + files.length > 100) throw new Error('Maximum of 100 graphics per garment')
      for (const file of files) imported.push(normalizeGarmentGraphic(createGarmentGraphic(await importGarmentArtwork(file), currentPanel)))
      onChange([...graphics, ...imported])
      chooseGraphic(imported.at(-1).id)
    } catch (e) { setError(e?.message || 'Artwork import failed') }
    finally {setBusy(false)}
  }
  async function addBrandSample() {
    if (disabled || busy || !currentPanel) return
    setBusy(true)
    setError('')
    try {
      if (graphics.length >= 100) throw new Error('Maximum of 100 graphics per garment')
      const response = await fetch(BRAND_SAMPLE_URL)
      if (!response.ok) throw new Error('The example Nike SVG is unavailable')
      const source = await response.text()
      const artwork = await importGarmentArtwork(new File([source], 'Nike swoosh.svg', {type:'image/svg+xml'}))
      const graphic = normalizeGarmentGraphic({
        ...createGarmentGraphic(artwork, currentPanel),
        name: 'Nike Swoosh · Example SVG',
        center: [.5, .62],
        scale: .55,
      })
      onChange([...graphics, graphic])
      chooseGraphic(graphic.id)
    } catch (error) {
      setError(error?.message || 'Unable to add the sample SVG')
    } finally {
      setBusy(false)
    }
  }
  function dragPlacement(event) {
    if (disabled || !selected || !previewRef.current) return
    const bounds = previewRef.current.getBoundingClientRect()
    if (!bounds.width || !bounds.height) return
    const center = [Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)), Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height))]
    update(selected.id, {center,...(panelSpan ? {positionMm:center.map((n,i) => n*panelSpan[i]-[printWidth,printHeight][i]/2)} : {})})
  }
  function exportLayout() {
    try {
      const blob = new Blob([JSON.stringify(serializeGarmentGraphics(graphics), null, 2)], {type:'application/json'})
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'garment-graphics.json'
      anchor.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) {setError(e.message)}
  }
  async function restoreLayout(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true)
    setError('')
    try {
      if (file.size > 80 * 1024 * 1024) throw new Error('Layout file exceeds 80 MB')
      const imported = deserializeGarmentGraphics(JSON.parse(await file.text()), {panels})
      onChange(imported)
      chooseGraphic(imported[0]?.id || null)
    } catch (e) { setError(e?.message || 'Unable to restore artwork layout') }
    finally {setBusy(false)}
  }
  return <section className="cc-graphic-editor" aria-label="Garment graphic editor">
    {showLayerList&&<header className="cc-graphic-header"><div><strong>Graphics</strong><small>Printed artwork on the garment surface</small></div><button type="button" onClick={() => inputRef.current?.click()} disabled={busy || disabled || !currentPanel}>+ Add</button></header>}
    <input ref={inputRef} type="file" accept="image/svg+xml,image/png,image/jpeg,.svg,.png,.jpg,.jpeg" multiple hidden onChange={addFiles}/>
    <input ref={layoutRef} type="file" accept="application/json,.json" hidden onChange={restoreLayout}/>
    <input ref={normalMapRef} type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" hidden onChange={loadNormalMap}/>
    {error && <p className="cc-graphic-error" role="alert">{error}</p>}
    {busy && <p role="status" className="cc-graphic-info">Preparing artwork…</p>}
    {showLayerList ? <div className="cc-graphic-sample">
      <div className="cc-graphic-sample-art"><img src={BRAND_SAMPLE_URL} alt="Nike swoosh SVG example"/></div>
      <div className="cc-graphic-sample-text"><strong>Nike swoosh SVG example</strong><small>Demo of placing a trademarked logo on a T-shirt panel. This is a visual editing example, not a Nike-endorsed garment. Move and scale it below; the 3D preview follows the cloth surface.</small>
        <button type="button" onClick={addBrandSample} disabled={busy || disabled || !currentPanel}>Place example on garment</button>
      </div>
    </div> : null}
    {!graphics.length && <div className="cc-graphic-empty">{showLayerList?'Use + Add to import SVG, PNG, or JPEG artwork.':'Select Add in the Graphic Object Browser to import SVG, PNG, or JPEG artwork.'} Open Graphic Tools below for an example.</div>}
    {showLayerList&&<><div className="cc-graphic-section-title"><strong>Graphic layers</strong><span>{graphics.length} objects</span></div>
    <div className="cc-graphic-list" role="group" aria-label="Graphic layers">{graphics.map((graphic, index) => <button type="button" key={graphic.id} aria-pressed={graphic.id === selected?.id} className={`cc-graphic-item ${graphic.id === selected?.id ? 'is-selected' : ''}`} onClick={() => chooseGraphic(graphic.id)}><span className="cc-graphic-layer-index">{String(index+1).padStart(2,'0')}</span><img src={graphic.dataUrl} alt=""/><span className="cc-graphic-layer-name">{graphic.name || 'Untitled graphic'}<small>{panels.find(panel => panel.id === graphic.panel)?.name || graphic.panel}</small></span><span aria-hidden="true" className="cc-graphic-layer-visibility">{graphic.visible === false ? '○' : '●'}</span></button>)}</div></>}
    {selected && <div className="cc-graphic-controls">
      <details className="cc-graphic-accordion" open><summary>Placement <small>Panel and surface</small></summary>
      <div className="cc-graphic-preview-caption">Panel placement preview · drag artwork to position</div>
      <div ref={previewRef} className="cc-graphic-preview" style={panelSpan?{aspectRatio:`${panelSpan[0]} / ${panelSpan[1]}`}:undefined} role="group" aria-label="Graphic position on selected panel" onPointerDown={event => {if (disabled) return;event.currentTarget.setPointerCapture(event.pointerId);dragPlacement(event)}} onPointerMove={event => {if (event.buttons === 1 && event.currentTarget.hasPointerCapture(event.pointerId)) dragPlacement(event)}}>
        <div className="cc-graphic-preview-panel"><img draggable="false" alt="" src={selected.dataUrl} style={{left:`${(panelSpan?.[0] ? positionMm[0]/panelSpan[0] : (selected.center?.[0]??.5)-(selected.scale??.42)/2)*100}%`,top:`${(panelSpan?.[1] ? positionMm[1]/panelSpan[1] : (selected.center?.[1]??.5)-(selected.scale??.42)/2)*100}%`,width:`${(panelSpan?.[0] ? printWidth/panelSpan[0] : selected.scale ?? .42)*100}%`,height:panelSpan?`${printHeight/panelSpan[1]*100}%`:'auto',transform:`rotate(${selected.rotation ?? 0}deg)`,transformOrigin:'50% 50%',objectFit:'fill',opacity:selected.visible === false ? .3 : selected.opacity ?? 1}}/></div>
      </div>
      <label>Panel<select value={selected.panel} disabled={disabled} onChange={e => update(selected.id, {panel:e.target.value})}>{[...new Set([selected.panel, ...panels.map(p => p.id)])].map(id => <option key={id} value={id}>{panels.find(p => p.id === id)?.name || id}</option>)}</select></label>
      <label>Surface<select value={selected.side || 'front'} disabled={disabled} onChange={e => update(selected.id, {side:e.target.value})}><option value="front">Front face</option><option value="back">Back face</option><option value="both">Both faces</option></select></label>
      </details>
      <details className="cc-graphic-accordion" open><summary>Transform <small>{displayUnit} and degrees</small></summary>
      <div className="cc-graphic-section-title"><strong>Position & dimensions</strong><span>{displayUnit}</span></div>
      <div className="cc-graphic-number-grid">
        {[["X position",0],["Y position",1]].map(([title,axis]) => <label key={axis}>{title} (mm)<input type="number" step="0.1" disabled={disabled || !panelSpan} value={Number(positionMm[axis].toFixed(2))} onChange={e => moveGraphic(axis,e.target.value)}/></label>)}
        <label>Width ({displayUnit})<input type="number" min={graphicMmToDisplay(1,displayUnit)} max={graphicMmToDisplay(10000,displayUnit)} step={displayStep} disabled={disabled} value={displaySize(printWidth)} onChange={e => sizeChange('widthMm',e.target.value)}/></label>
        <label>Height ({displayUnit})<input type="number" min={graphicMmToDisplay(1,displayUnit)} max={graphicMmToDisplay(10000,displayUnit)} step={displayStep} disabled={disabled} value={displaySize(printHeight)} onChange={e => sizeChange('heightMm',e.target.value)}/></label>
      </div>
      <div className="cc-graphic-dimension-sliders" aria-label={`Graphic dimensions in ${displayUnit}`}>
        {[["Width",'widthMm',printWidth],["Height",'heightMm',printHeight]].map(([title,axis,value])=><label className="cc-graphic-slider-row" key={axis}>
          <span>{title}</span><input type="range" aria-label={`${title} slider (${displayUnit})`} min={graphicMmToDisplay(1,displayUnit)} max={graphicMmToDisplay(Math.min(10000,Math.max(1000,Math.ceil(value/100)*100)),displayUnit)} step={displayStep} value={graphicMmToDisplay(Math.max(1,value),displayUnit)} disabled={disabled} onChange={e=>sizeChange(axis,e.target.value)}/>
          <output>{displaySize(value)} {displayUnit}</output>
        </label>)}
      </div>
      <label className="cc-graphic-lock"><input type="checkbox" checked={selected.lockAspectRatio !== false} disabled={disabled} onChange={e => update(selected.id,{lockAspectRatio:e.target.checked})}/> Lock aspect ratio</label>
      <div className="cc-graphic-dpi"><strong>{dpi == null ? 'DPI pending physical size' : `${dpi.toFixed(0)} effective DPI`}</strong><span>{selected.width} × {selected.height} px source · Output at 100% scale (actual millimeters). Verify panel calibration before production.</span>{dpi != null && dpi < 300 && <span className="cc-graphic-print-warning" role="status">Below 300 DPI at this size. Print detail may appear soft; use a higher-resolution source or reduce physical dimensions.</span>}</div>
      <button type="button" className="cc-graphic-print-export" disabled={busy || !selected?.widthMm || !selected?.heightMm} onClick={exportPrintSvg}>Export 1:1 print SVG</button>
      {[['Horizontal position',0],['Vertical position',1]].map(([label, axis]) => <label key={axis}>{label}<input type="range" min="0" max="1" step=".005" value={panelSpan ? Math.max(0,Math.min(1,positionMm[axis]/panelSpan[axis])) : selected.center?.[axis] ?? .5} disabled={disabled} onChange={e => moveNormalized(axis,+e.target.value)}/><output>{Math.round((panelSpan ? positionMm[axis]/panelSpan[axis] : selected.center?.[axis] ?? .5)*100)}%</output></label>)}
      <label className="cc-graphic-slider-row">Rotation<input aria-label="Rotation slider" type="range" min="-180" max="180" step="1" value={selected.rotation || 0} disabled={disabled} onChange={e => update(selected.id,{rotation:+e.target.value})}/><span className="cc-graphic-value"><input aria-label="Rotation degrees" type="number" min="-180" max="180" step="1" value={selected.rotation || 0} disabled={disabled} onChange={e => {const v=+e.target.value;if(e.target.value!==''&&Number.isFinite(v)&&v>=-180&&v<=180)update(selected.id,{rotation:v})}}/>°</span></label>
      </details>
      <details className="cc-graphic-accordion"><summary>Material <small>Print surface</small></summary>
      <div className="cc-graphic-map-fields">
        <div><span>Texture</span><img src={selected.dataUrl} alt="Imported artwork texture"/><small>Embedded artwork</small></div>
        <div><span>Normal map</span>{selected.normalMapDataUrl ? <img src={selected.normalMapDataUrl} alt="Normal texture"/> : <span className="cc-graphic-map-empty">None</span>}<button type="button" disabled={disabled || busy} onClick={() => normalMapRef.current?.click()}>{selected.normalMapDataUrl ? 'Replace' : 'Import'}</button></div>
      </div>
      <label>Displayed map<select value={selected.displayedMap || 'texture'} disabled={disabled} onChange={e => update(selected.id,{displayedMap:e.target.value})}><option value="texture">Texture</option><option value="normal">Normal map</option></select></label>
      <label className="cc-graphic-color-field">Map color<input aria-label="Map color" type="color" value={/^#[0-9a-f]{6}$/i.test(selected.color || '') ? selected.color : '#ffffff'} disabled={disabled} onChange={e => update(selected.id,{color:e.target.value})}/><output>{selected.color || '#ffffff'}</output></label>
      {[["Opacity","opacity",0,1,.01],["Reflectivity","reflectivity",0,1,.01],["Metalness","metalness",0,1,.01],["Roughness","roughness",0,1,.01],["Ink/raised height","inkHeightMm",0,10,.1]].map(([title,key,min,max,step]) => {const current=number(selected[key],key==='opacity'?1:key==='roughness'?.88:0);return <label className="cc-graphic-slider-row" key={key}><span>{title}</span><input aria-label={`${title} slider`} type="range" min={min} max={max} step={step} disabled={disabled} value={Math.max(min,Math.min(max,current))} onChange={e=>update(selected.id,{[key]:+e.target.value})}/><span className="cc-graphic-value"><input aria-label={`${title}${key==='inkHeightMm'?' (mm)':''}`} type="number" min={min} max={max} step={step} disabled={disabled} value={current} onChange={e=>{const v=+e.target.value;if(e.target.value!==''&&Number.isFinite(v)&&v>=min&&v<=max)update(selected.id,{[key]:v})}}/>{key==='inkHeightMm'&&<small>mm</small>}</span></label>})}
      </details>
      <div className="cc-graphic-actions"><label><input type="checkbox" checked={selected.visible !== false} disabled={disabled} onChange={e => update(selected.id,{visible:e.target.checked})}/> Visible</label><button type="button" disabled={disabled} onClick={() => {onChange(graphics.filter(g => g.id !== selected.id));chooseGraphic(graphics.find(g=>g.id!==selected.id)?.id||null)}}>Remove</button></div>
    </div>}
    <details className="cc-graphic-accordion cc-graphic-utilities"><summary>Graphic Tools <small>Import &amp; export</small></summary>
      {!showLayerList&&<div className="cc-graphic-sample"><div className="cc-graphic-sample-art"><img src={BRAND_SAMPLE_URL} alt="Nike swoosh SVG example"/></div><div className="cc-graphic-sample-text"><strong>Example artwork</strong><small>Preview logo for testing print dimensions.</small><button type="button" onClick={addBrandSample} disabled={busy||disabled||!currentPanel}>Insert example</button></div></div>}
      <div className="cc-graphic-layout-actions">
        <button type="button" disabled={busy || disabled} onClick={() => layoutRef.current?.click()}>Restore layout JSON</button>
        {!!graphics.length && <button type="button" disabled={busy} onClick={exportLayout}>Export layout JSON</button>}
      </div>
    </details>
  </section>
}
