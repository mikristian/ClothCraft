import React,{useEffect,useState} from 'react'
import {HARDWARE_STYLE_FIELDS,resolveHardwareStyle} from '../core/hardwareStyleProperties.js'
import './HardwareStyleEditor.css'

const dimensionFields=[['widthMm','Width','mm'],['heightMm','Height','mm'],['thicknessMm','Thickness','mm']]
const appearanceFields=[['roughness','Roughness',''],['metalness','Metalness',''],['reflectionIntensity','Reflection Intensity',''],['clearcoat','Clearcoat','']]

function PropertyControl({id,field,label,unit='',value,onChange}){
 const schema=HARDWARE_STYLE_FIELDS[field]
 const [draft,setDraft]=useState(String(value??''))
 const [error,setError]=useState('')
 useEffect(()=>{setDraft(String(value??''));setError('')},[id,field,value])
 const commit=raw=>{
  const next=Number(raw)
  if(raw===''||!Number.isFinite(next)||next<schema.min||next>schema.max){
   setError(`Enter ${schema.min}–${schema.max}`);return
  }
  setError('')
  onChange(field,next)
 }
 const step=schema.max<=2?.01:schema.max<=50?.1:1
 return <div className="exo-hardware-property-field" data-hardware-style-field={field}>
  <label htmlFor={`exo-hardware-${id}-${field}`}>{label}</label>
  <div className="exo-hardware-property-number"><input id={`exo-hardware-${id}-${field}`} type="number" aria-label={`${label} value`}
   min={schema.min} max={schema.max} step="any" value={draft}
   onChange={event=>setDraft(event.target.value)}
   onKeyDown={event=>{if(event.key==='Enter')event.currentTarget.blur()}}
   onBlur={()=>{if(draft!==String(value??''))commit(draft)}}/>
   {unit&&<span>{unit}</span>}
  </div>
  <input type="range" aria-label={`Adjust ${label}`} min={schema.min} max={schema.max} step={step}
   value={Number(value??schema.min)} onChange={event=>commit(event.target.value)}/>
  {error&&<small role="alert" className="exo-hardware-property-error">{error}</small>}
 </div>
}

export default function HardwareStyleEditor({project,preset,group,onChange}){
 const style=resolveHardwareStyle(project,preset?.id)
 if(!style||preset?.kind!=='button')return <p className="clo-pe-note">Select a button to edit its library style.</p>
 const inputs=group==='hardware'?dimensionFields:appearanceFields
 return <div className="exo-hardware-properties" aria-label={`${preset.name} editable ${group==='hardware'?'dimensions':'material'} properties`}>
  {group==='hardware'&&<div className="exo-hardware-property-readout">All dimensions are in real millimetres. These values are saved with the EXO project.</div>}
  {group==='hardware-material'&&<>
   <div className="exo-hardware-property-field" data-hardware-style-field="materialType"><label htmlFor={`exo-hardware-${preset.id}-material`}>Material Type</label><input id={`exo-hardware-${preset.id}-material`} aria-label="Material Type" type="text" maxLength="96" value={style.materialType} onChange={event=>onChange('materialType',event.target.value)}/></div>
   <div className="exo-hardware-property-field" data-hardware-style-field="color"><label htmlFor={`exo-hardware-${preset.id}-color`}>Base Color</label><div className="exo-hardware-color-edit"><input id={`exo-hardware-${preset.id}-color`} type="color" aria-label="Base Color" value={style.color} onChange={event=>onChange('color',event.target.value)}/><span>{style.color}</span></div></div>
  </>}
  {inputs.map(([field,label,unit])=><PropertyControl key={`${preset.id}:${field}`} id={preset.id} field={field} label={label} unit={unit} value={style[field]} onChange={onChange}/>)}
 </div>
}
