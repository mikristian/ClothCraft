import React, { useEffect, useId, useRef, useState } from 'react'
import './AnnotationCanvas.css'

const clamp = (value) => Math.min(1, Math.max(0, value))
const coordinate = (value, fallback) => Number.isFinite(Number(value)) ? clamp(Number(value)) : fallback
const uid = () => globalThis.crypto?.randomUUID?.() || `annotation-${Date.now()}-${Math.random().toString(36).slice(2)}`
const safeArtwork = (source) => {
  const value = typeof source === 'string' ? source : source?.dataUrl || source?.src || ''
  return /^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value) ? value : ''
}

/**
 * Standalone, controlled garment annotation editor.
 * annotations: [{ id, type: 'pin'|'arrow', x, y, text, toX?, toY? }], coordinates 0..1.
 * onChange(nextAnnotations), artwork: image data URL (or {dataUrl}),
 * onArtworkChange(nextDataUrl). The parent owns persistence.
 */
export default function AnnotationCanvas({ annotations = [], onChange, artwork, onArtworkChange }) {
  const prefix = useId().replace(/:/g, '')
  const svgRef = useRef(null)
  const fileRef = useRef(null)
  const dragRef = useRef(null)
  const [activeId, setActiveId] = useState(null)
  const [mode, setMode] = useState('select')
  const [draft, setDraft] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [imageSize, setImageSize] = useState({ width: 960, height: 720 })
  const imageSource = safeArtwork(artwork)
  const items = Array.isArray(annotations) ? annotations : []
  const selected = items.find((item) => String(item.id) === String(activeId))
  const canEdit = typeof onChange === 'function'
  const width = Math.max(1, imageSize.width)
  const height = Math.max(1, imageSize.height)
  const coordinateForEvent = (event) => {
    const point = svgRef.current.createSVGPoint()
    point.x = event.clientX
    point.y = event.clientY
    const matrix = svgRef.current.getScreenCTM()
    if (!matrix) return null
    const local = point.matrixTransform(matrix.inverse())
    return { x: clamp(local.x / width), y: clamp(local.y / height) }
  }
  const updateItem = (id, patch) => onChange?.(items.map((item) => String(item.id) === String(id) ? { ...item, ...patch } : item))
  const createItem = (type, point) => {
    const id = uid()
    const next = { id, type, x: point.x, y: point.y, text: type === 'arrow' ? 'Construction detail' : 'New callout' }
    if (type === 'arrow') Object.assign(next, { toX: clamp(point.x + 0.12), toY: clamp(point.y + 0.08) })
    onChange?.([...items, next])
    setActiveId(id)
    setDraft(next.text)
    setMode('select')
  }
  const selectItem = (item) => { setActiveId(item.id); setDraft(item.text || '') }
  const handleCanvasClick = (event) => {
    if (!canEdit || mode === 'select' || event.target.closest('[data-annotation]')) return
    const point = coordinateForEvent(event)
    if (point) createItem(mode, point)
  }
  const handlePointerDown = (event, id, handle) => {
    if (!canEdit || event.button !== 0) return
    const item = items.find((entry) => String(entry.id) === String(id))
    if (!item) return
    event.stopPropagation()
    event.preventDefault()
    selectItem(item)
    dragRef.current = { pointerId: event.pointerId, id, handle, start: coordinateForEvent(event), original: item }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const handlePointerMove = (event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId || !drag.start) return
    const point = coordinateForEvent(event)
    if (!point) return
    const dx = point.x - drag.start.x
    const dy = point.y - drag.start.y
    const item = items.find((entry) => String(entry.id) === String(drag.id)) || drag.original
    if (drag.handle === 'end') updateItem(drag.id, { toX: coordinate(Number(drag.original.toX) + dx, point.x), toY: coordinate(Number(drag.original.toY) + dy, point.y) })
    else if (drag.handle === 'start') updateItem(drag.id, { x: coordinate(Number(drag.original.x) + dx, point.x), y: coordinate(Number(drag.original.y) + dy, point.y) })
    else {
      const x = coordinate(Number(drag.original.x) + dx, point.x)
      const y = coordinate(Number(drag.original.y) + dy, point.y)
      const changes = { x, y }
      if (drag.original.type === 'arrow') {
        changes.toX = coordinate(Number(drag.original.toX) + (x - coordinate(drag.original.x, 0.5)), x)
        changes.toY = coordinate(Number(drag.original.toY) + (y - coordinate(drag.original.y, 0.5)), y)
      }
      updateItem(drag.id, changes)
    }
  }
  const endDrag = (event) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }
  const handleKeyDown = (event, item, handle = 'pin') => {
    if (!canEdit) return
    const offsets = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
    if (!offsets[event.key]) return
    event.preventDefault()
    const [dx, dy] = offsets[event.key]
    const step = event.shiftKey ? 0.02 : 0.005
    const movingEnd = handle === 'end'
    const xKey = movingEnd ? 'toX' : 'x'
    const yKey = movingEnd ? 'toY' : 'y'
    updateItem(item.id, { [xKey]: coordinate(Number(item[xKey]) + dx * step, 0.5), [yKey]: coordinate(Number(item[yKey]) + dy * step, 0.5) })
  }
  const importFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type) || file.size > 8 * 1024 * 1024) {
      setUploadError('Choose a PNG, JPEG, WebP, or GIF under 8 MB.')
      return
    }
    try {
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(new Error('Could not read this image.'))
        reader.readAsDataURL(file)
      })
      if (!safeArtwork(data)) throw new Error('This image cannot be displayed.')
      onArtworkChange?.(data)
      setUploadError('')
    } catch (error) { setUploadError(error.message) }
  }
  useEffect(() => {
    if (!imageSource) { setImageSize({ width: 960, height: 720 }); return }
    let live = true
    const image = new Image()
    image.onload = () => { if (live) setImageSize({ width: image.naturalWidth || 960, height: image.naturalHeight || 720 }) }
    image.onerror = () => { if (live) setUploadError('Image cannot be loaded.') }
    image.src = imageSource
    return () => { live = false }
  }, [imageSource])
  useEffect(() => {
    if (!selected) { setDraft(''); return }
    setDraft(selected.text || '')
  }, [selected?.id, selected?.text])
  const removeSelected = () => {
    if (!selected) return
    onChange?.(items.filter((item) => String(item.id) !== String(selected.id)))
    setActiveId(null)
  }
  return <section className="tp-annotation" aria-label="Garment annotation editor">
    <div className="tp-annotation-toolbar">
      <div className="tp-annotation-modes" role="group" aria-label="Annotation tools">
        {[['select', 'Select'], ['pin', 'Add pin'], ['arrow', 'Add arrow']].map(([id, label]) => <button key={id} type="button" aria-pressed={mode === id} disabled={!canEdit} onClick={() => setMode(id)}>{label}</button>)}
      </div>
      <button type="button" onClick={() => fileRef.current?.click()} disabled={!onArtworkChange}>Upload artwork</button>
      <input ref={fileRef} className="tp-annotation-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" aria-label="Upload garment artwork" onChange={importFile} />
    </div>
    {uploadError && <p className="tp-annotation-error" role="alert">{uploadError}</p>}
    <div className="tp-annotation-layout">
      <div className="tp-annotation-stage">
        <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Garment artwork with numbered callouts and arrows" onClick={handleCanvasClick}>
          <defs><marker id={`${prefix}-arrowhead`} markerWidth="8" markerHeight="8" refX="6.5" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0 0 L8 4 L0 8 Z" fill="#6651a8" /></marker></defs>
          <rect width={width} height={height} fill="#f7f7f6" />
          {imageSource ? <image href={imageSource} width={width} height={height} preserveAspectRatio="xMidYMid meet" /> : <g fill="#85838e" textAnchor="middle"><text x={width / 2} y={height / 2 - 12} fontSize={Math.min(width / 28, 30)}>GARMENT ARTWORK</text><text x={width / 2} y={height / 2 + 23} fontSize={Math.min(width / 48, 18)}>Upload a flat sketch, drawing or reference photo</text></g>}
          {items.map((item, index) => {
            const x = coordinate(item.x, 0.5) * width
            const y = coordinate(item.y, 0.5) * height
            const endX = coordinate(item.toX, 0.65) * width
            const endY = coordinate(item.toY, 0.55) * height
            const active = selected?.id === item.id
            const radius = Math.max(9, Math.min(width, height) * 0.018)
            return <g key={item.id ?? index} data-annotation="true" className={`tp-annotation-shape ${active ? 'is-active' : ''}`}>
              {item.type === 'arrow' && <>
                <line x1={x} y1={y} x2={endX} y2={endY} stroke="#6651a8" strokeWidth={Math.max(2, radius * 0.18)} markerEnd={`url(#${prefix}-arrowhead)`} />
                <circle cx={endX} cy={endY} r={radius * 0.65} fill="transparent" stroke={active ? '#40328d' : 'transparent'} strokeDasharray="3 3" strokeWidth="2" tabIndex={0} role="button" aria-label={`Move arrow ${index + 1} endpoint with arrow keys`} onKeyDown={(event) => handleKeyDown(event, item, 'end')} onPointerDown={(event) => handlePointerDown(event, item.id, 'end')} onPointerMove={handlePointerMove} onPointerUp={endDrag} onPointerCancel={endDrag} />
              </>}
              <circle cx={x} cy={y} r={radius} fill={active ? '#40328d' : '#6651a8'} stroke="#fff" strokeWidth="2.5" className="tp-annotation-pin" tabIndex={0} role="button" aria-label={`Select and move ${item.type === 'arrow' ? 'arrow' : 'callout'} ${index + 1}: ${item.text || 'No text'}`} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectItem(item) } else handleKeyDown(event, item) }} onFocus={() => selectItem(item)} onPointerDown={(event) => handlePointerDown(event, item.id, 'start')} onPointerMove={handlePointerMove} onPointerUp={endDrag} onPointerCancel={endDrag} />
              <text x={x} y={y + radius * 0.36} fontSize={radius * 1.05} fontWeight="700" fill="#fff" textAnchor="middle" pointerEvents="none">{index + 1}</text>
            </g>
          })}
        </svg>
        <p className="tp-annotation-tip">Choose Pin or Arrow, then click the artwork. Drag points to reposition. Use arrow keys for precise adjustments (Shift for larger steps).</p>
      </div>
      <aside className="tp-annotation-sidebar" aria-label="Annotation details">
        <h3>Callouts <span>{items.length}</span></h3>
        <div className="tp-annotation-list">{items.map((item, index) => <button key={item.id ?? index} type="button" className={selected?.id === item.id ? 'is-active' : ''} onClick={() => selectItem(item)} aria-pressed={selected?.id === item.id}><strong>{index + 1}</strong><span>{item.text || 'Untitled annotation'}</span><small>{item.type === 'arrow' ? 'Arrow' : 'Pin'}</small></button>)}{!items.length && <p>No annotations yet. Add a callout to identify a garment detail.</p>}</div>
        {selected && <div className="tp-annotation-inspector"><label htmlFor={`${prefix}-text`}>Selected callout {items.findIndex((item) => item.id === selected.id) + 1}</label><textarea id={`${prefix}-text`} value={draft} disabled={!canEdit} maxLength={1000} rows={4} onChange={(event) => { setDraft(event.target.value); updateItem(selected.id, { text: event.target.value }) }} placeholder="Describe stitching, dimensions or construction details" /><div className="tp-annotation-inspector-actions"><button type="button" disabled={!canEdit} onClick={removeSelected}>Delete annotation</button></div></div>}
      </aside>
    </div>
  </section>
}
