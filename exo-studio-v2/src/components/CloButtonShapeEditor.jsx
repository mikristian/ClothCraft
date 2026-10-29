import React, { useState } from 'react'
import CloObjectPropertyFields from './CloObjectPropertyFields.jsx'
import { getHardwarePreset, listHardwarePresets } from '../data/hardwarePresets.js'
import { resolveCloDraftTarget } from '../core/cloPropertyCommands.js'
import './CloButtonShapeEditor.css'

const THREADS = ['Cross', 'Parallel', 'Square']
const DIMENSIONS = ['widthMm', 'heightMm', 'thicknessMm', 'weightGrams', 'holes', 'holeDiameterMm', 'holeSpacingMm', 'angleDeg', 'threadLengthMm', 'threadColor']

function ButtonDiagram({ button, preset, threadType }) {
  const dimensions = preset?.dimensionsMm || {}
  const w = Number(button?.widthMm || dimensions.width || dimensions.diameter || dimensions.capDiameter || 18)
  const h = Number(button?.heightMm || dimensions.height || dimensions.diameter || dimensions.capDiameter || w)
  const square = preset?.shape === 'square'
  const oval = preset?.shape === 'oval-toggle'
  const holes = Math.max(0, Math.min(8, Number(button?.holes ?? preset?.holes ?? 4)))
  const fill = /^#[0-9a-f]{6}$/i.test(button?.color || '') ? button.color : preset?.pbr?.baseColor || '#999999'
  const thread = /^#[0-9a-f]{6}$/i.test(button?.threadColor || '') ? button.threadColor : '#e4e4e4'
  const four = [[-12,-12],[12,-12],[-12,12],[12,12]]
  const coords = holes <= 2 ? [[-12,0],[12,0]].slice(0,holes) : holes === 4 ? four : Array.from({length:holes},(_,i)=>[Math.cos(2*Math.PI*i/holes)*16,Math.sin(2*Math.PI*i/holes)*16])
  const paths = holes===4 ? (threadType==='Cross' ? ['M -12 -12 L 12 12','M 12 -12 L -12 12'] : threadType==='Square' ? ['M -12 -12 H 12 V 12 H -12 Z'] : ['M -12 -12 V 12','M 12 -12 V 12']) : holes===2 ? ['M -12 0 H 12'] : []
  return <svg className="clo-button-shape-svg" viewBox="0 0 112 112" role="img" aria-label={`${preset?.name || 'Button'} preview, ${threadType} stitching`}>
    <ellipse cx="56" cy="58" rx="40" ry="41" fill="#000" opacity=".19" />
    {square ? <rect x="17" y="17" width="78" height="78" rx="9" fill={fill} stroke="#ffffff70" strokeWidth="2" /> : <ellipse cx="56" cy="54" rx={oval?43:Math.min(43,43*w/Math.max(w,h))} ry={oval?18:Math.min(43,43*h/Math.max(w,h))} fill={fill} stroke="#ffffff70" strokeWidth="2" />}
    {preset?.mount === 'shank' || preset?.mount === 'tack' ? <circle cx="56" cy="54" r="13" fill="none" stroke="#ffffff55" strokeWidth="2" /> : <g transform="translate(56 54)">
      {coords.map(([x,y],i)=><circle key={i} cx={x} cy={y} r="4.4" fill="#1a1a1d" stroke="#ffffff88" strokeWidth=".8" />)}
      {paths.map((d,i)=><path key={i} d={d} stroke={thread} strokeWidth="3" strokeLinecap="round" fill="none" />)}
    </g>}
  </svg>
}

/** Uses the same selection and draft onEdit command as CloObjectPropertyFields. */
export default function CloButtonShapeEditor({ selection, project, onEdit }) {
  const [specificationOpen, setSpecificationOpen] = useState(true)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [error, setError] = useState('')
  const button = resolveCloDraftTarget(project, selection)
  if (!button || String(selection?.type).toLowerCase() !== 'button') return null
  const presets = listHardwarePresets('button')
  const preset = getHardwarePreset(button.hardwarePresetId) || presets[0]
  const threadType = THREADS.includes(button.threadType) ? button.threadType : 'Cross'
  const commit = (field, value) => {
    const result = onEdit?.(selection, field, value)
    if (result?.ok === false || !onEdit) { setError(result?.error || 'Editing is unavailable'); return }
    setError('')
  }
  return <div className="clo-button-shape-editor" aria-label="Button Shape and Specification">
    <div className="clo-button-shape-title">Shape</div>
    <div className="clo-button-shape-current">
      <ButtonDiagram button={button} preset={preset} threadType={threadType} />
      <div className="clo-button-shape-current-details">
        <strong>{preset?.name || 'Button'}</strong>
        <span>{preset?.mount || 'Sew-through'} · {preset?.material || 'Hardware'}</span>
        <button type="button" onClick={()=>setPickerOpen(v=>!v)} aria-expanded={pickerOpen} aria-controls="clo-button-style-picker">{pickerOpen ? 'Hide styles' : 'Choose style'}</button>
      </div>
    </div>
    {pickerOpen && <div id="clo-button-style-picker" className="clo-button-style-picker" role="group" aria-label="Button styles">
      {presets.map(option => <button key={option.id} type="button" className="clo-button-style-option" aria-pressed={option.id===button.hardwarePresetId} onClick={()=>{commit('hardwarePresetId',option.id);setPickerOpen(false)}}>
        <ButtonDiagram button={{ ...button, color: option.pbr?.baseColor, holes:option.holes }} preset={option} threadType={threadType} />
        <span>{option.name}</span>
      </button>)}
    </div>}
    <div className="clo-button-thread-row"><label htmlFor="clo-button-shape-thread">Thread Type</label><select id="clo-button-shape-thread" value={threadType} onChange={e=>commit('threadType',e.target.value)}>{THREADS.map(type=><option key={type} value={type}>{type}</option>)}</select></div>
    <button type="button" className="clo-button-specification-trigger" aria-expanded={specificationOpen} aria-controls="clo-button-specification" onClick={()=>setSpecificationOpen(v=>!v)}><span aria-hidden="true">{specificationOpen?'▾':'▸'}</span> Specification</button>
    {specificationOpen && <div id="clo-button-specification" className="clo-button-specification">
      <CloObjectPropertyFields group="button" selection={selection} project={project} onEdit={onEdit} includeFields={DIMENSIONS}/>
    </div>}
    {error && <small role="alert" className="clo-pe-field-error">{error}</small>}
  </div>
}
