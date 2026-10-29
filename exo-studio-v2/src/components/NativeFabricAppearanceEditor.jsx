import React,{useEffect,useState} from 'react'
import {presetForFabric} from '../core/clothcraftFabrics.js'
import './NativeFabricAppearanceEditor.css'

const OPTICAL_FIELDS={
  opacity:{label:'Opacity',min:0,max:1,step:.01,factor:100,unit:'%'},
  roughness:{label:'Roughness',min:0,max:1,step:.01,factor:100,unit:'%'},
  reflectionIntensity:{label:'Reflection Intensity',min:0,max:3,step:.01,factor:100,unit:'%'},
  metalness:{label:'Metalness',min:0,max:1,step:.01,factor:100,unit:'%'},
}
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value))
const isHex=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value)

function NativeOpticalField({field,appearance,defaults,disabled,onChange,objectId,face='front'}){
  const spec=OPTICAL_FIELDS[field]
  const fieldLabel=face==='front'?`Native fabric ${spec.label}`:`Native fabric ${face==='back'?'Back':'Side'} ${spec.label}`
  const applied=Number.isFinite(appearance?.[field])?appearance[field]:defaults[field]
  const source=clamp(Number.isFinite(applied)?applied:1,spec.min,spec.max)
  const initial=String(Math.round(source*spec.factor*100)/100)
  const [draft,setDraft]=useState(initial)
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState('')
  useEffect(()=>{setDraft(initial);setError('')},[initial,objectId,field])
  const commit=async raw=>{
    if(saving||disabled)return
    if(String(raw).trim()===''||!Number.isFinite(Number(raw))){setError('Enter a finite number');return}
    const amount=Number(raw)/spec.factor
    if(amount<spec.min||amount>spec.max){setError(`Use ${spec.min*spec.factor}–${spec.max*spec.factor}${spec.unit}`);return}
    if(Math.abs(amount-source)<1e-6)return
    setSaving(true)
    try{
      const result=await onChange(field,Number(amount.toFixed(5)))
      if(result?.ok!==true){setDraft(initial);setError(result?.error||'Appearance could not be saved')}
      else setError('')
    }catch(err){setDraft(initial);setError(err?.message||'Appearance could not be saved')}
    finally{setSaving(false)}
  }
  return <div className="clo-pe-native-optical-row" data-native-appearance-field={field}>
    <label htmlFor={`native-optical-${objectId}-${field}`}>{spec.label}</label>
    <div className="clo-pe-native-optical-value">
      <div className="clo-pe-native-optical-number">
        <input type="number" id={`native-optical-${objectId}-${field}`} aria-label={fieldLabel}
          min={spec.min*spec.factor} max={spec.max*spec.factor} step={spec.step*spec.factor}
          value={draft} disabled={saving||disabled} onChange={event=>setDraft(event.target.value)}
          onBlur={()=>void commit(draft)} onKeyDown={event=>{
            if(event.key==='Enter'){event.preventDefault();event.currentTarget.blur()}
            if(event.key==='Escape'){setDraft(initial);setError('');event.currentTarget.blur()}
          }}/><span>{spec.unit}</span>
      </div>
      <input aria-label={`Adjust ${fieldLabel}`} type="range"
        min={spec.min*spec.factor} max={spec.max*spec.factor} step={spec.step*spec.factor}
        value={Number.isFinite(Number(draft))?clamp(Number(draft),spec.min*spec.factor,spec.max*spec.factor):source*spec.factor}
        disabled={saving||disabled} onChange={event=>setDraft(event.target.value)}
        onPointerUp={event=>void commit(event.currentTarget.value)}
        onKeyUp={event=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(event.key))void commit(event.currentTarget.value)}}
        onBlur={()=>void commit(draft)}/>
    </div>
    {error&&<small role="alert" className="clo-pe-field-error">{error}</small>}
  </div>
}

export default function NativeFabricAppearanceEditor({fabric,face='front',group='basic',onChange,disabled=false}){
  const frontAppearance=fabric?.appearance||{}
  // Missing Back/Side fields deliberately inherit Front until overridden.
  // Keep this merge out of project metadata so existing fabrics remain intact.
  const appearance=face==='front'?frontAppearance:{...frontAppearance,...frontAppearance[face]}
  const identityKey=`${fabric?.id||'none'}-${face}`
  const preset=presetForFabric(fabric)
  const defaults={
    color:preset?.appearance?.color||'#b8b4ab',opacity:1,
    roughness:preset?.appearance?.roughness??.85,metalness:0,reflectionIntensity:1,
  }
  const displayedColor=isHex(appearance.color)?appearance.color:defaults.color
  const [colorDraft,setColorDraft]=useState(displayedColor)
  const [savingColor,setSavingColor]=useState(false)
  const [colorError,setColorError]=useState('')
  useEffect(()=>{setColorDraft(displayedColor);setColorError('')},[displayedColor,identityKey])
  const changeColor=async hex=>{
    if(!isHex(hex)||savingColor||disabled)return
    setColorDraft(hex)
    setSavingColor(true)
    try{
      const result=await onChange('color',hex)
      if(result?.ok!==true){setColorDraft(displayedColor);setColorError(result?.error||'Could not save color')}
      else setColorError('')
    }catch(error){setColorDraft(displayedColor);setColorError(error?.message||'Could not save color')}
    finally{setSavingColor(false)}
  }
  if(!fabric?.id)return <p className="clo-pe-note">Select a native fabric in Object Browser to edit its appearance.</p>
  const fields=group==='reflection'?['roughness','reflectionIntensity','metalness']:['opacity']
  return <div className="clo-pe-native-appearance" data-fabric-face={face}
    aria-label={`Native ${face} ${group==='reflection'?'reflection':'basic appearance'} properties`}>
    {group==='basic'&&<div className="clo-pe-native-color-row" data-native-appearance-field="color">
      <label htmlFor={`native-optical-${identityKey}-color`}>Color</label>
      <div className="clo-pe-native-color-value">
        <input type="color" id={`native-optical-${identityKey}-color`} aria-label={face==='front'?'Native fabric Color':`Native fabric ${face==='back'?'Back':'Side'} Color`} value={colorDraft}
          disabled={savingColor||disabled} onChange={event=>void changeColor(event.target.value)}/>
        <span>{colorDraft.toUpperCase()}</span>
      </div>
      {colorError&&<small role="alert" className="clo-pe-field-error">{colorError}</small>}
    </div>}
    {fields.map(field=><NativeOpticalField key={`${identityKey}-${field}`} objectId={identityKey} face={face} field={field}
      appearance={appearance} defaults={defaults} disabled={disabled} onChange={onChange}/>)}
  </div>
}
