import React, {useState} from 'react'
import {getStagePreset,normalizeStageId} from '../data/stagePresets.js'
import './StagePropertyPanel.css'

export const DEFAULT_STAGE_SETTINGS = Object.freeze({
  stagePosition:[0,0,0],stageRotation:[0,0,0],stageScale:[1,1,1],
  logoVisible:true,logoPosition:[.3,2.85,-3.5],logoScale:1,logoColor:'#e5e8ed',
})

const groups=[
  ['Room transform',[['stagePosition','Position',-20,20,.1],['stageRotation','Rotation (radians)',-3.14,3.14,.01],['stageScale','Scale',.01,8,.05]]],
  ['ClothCraft logo',[['logoVisible','Visible'],['logoPosition','Position',-20,20,.1],['logoScale','Size',.05,8,.05],['logoColor','Color']]],
]

const LIGHT_DEFAULTS={light:{enabled:true,intensity:1,color:'#ffffff'},light2:{enabled:true,intensity:1,color:'#ffffff'}}
const numberValue=(raw,fallback,min,max)=>Number.isFinite(Number(raw))?Math.min(max,Math.max(min,Number(raw))):fallback

export default function StagePropertyPanel({stageId,stageSettings={},renderSettings={},onStageSettingChange,onRemoveStage,onRenderSettingChange}) {
  const [closed,setClosed]=useState({})
  const id=normalizeStageId(stageId)
  if(id==='none')return null
  const stage=getStagePreset(id)
  const values={...DEFAULT_STAGE_SETTINGS,...stageSettings}
  const change=(key,value)=>onStageSettingChange?.(key,value)
  const reset=()=>Object.entries(DEFAULT_STAGE_SETTINGS).forEach(([key,value])=>change(key,Array.isArray(value)?[...value]:value))
  const changeLight=(key,field,value)=>onRenderSettingChange?.(key,{...(renderSettings[key]||{}),[field]:value})
  const renderLight=(key,title)=><div className="stage-property-light" key={key}>
    <div className="stage-property-light-heading">{title}</div>
    <label className="stage-property-field"><span>Enabled</span><input aria-label={title+' enabled'} type="checkbox" checked={renderSettings[key]?.enabled!==false} onChange={e=>changeLight(key,'enabled',e.target.checked)}/></label>
    <label className="stage-property-field"><span>Intensity</span><input aria-label={title+' intensity'} type="number" min="0" max="10" step=".05" value={renderSettings[key]?.intensity??1} onChange={e=>{if(e.target.value!=='')changeLight(key,'intensity',numberValue(e.target.value,1,0,10))}}/></label>
    <label className="stage-property-field"><span>Color</span><input aria-label={title+' color'} type="color" value={renderSettings[key]?.color||'#ffffff'} onChange={e=>changeLight(key,'color',e.target.value)}/></label>
  </div>
  const resetLighting=()=>{
    onRenderSettingChange?.('exposure',1)
    onRenderSettingChange?.('environmentPreset','studio')
    for(const key of ['light','light2'])onRenderSettingChange?.(key,{...(renderSettings[key]||{}),...LIGHT_DEFAULTS[key]})
  }
  return <div className="stage-property-panel" aria-label="Stage property editor">
    <div className="stage-property-head"><strong>{stage?.name||'Stage'}</strong><span>STAGE PROPERTIES</span></div>
    <section className="stage-property-group">
      <button type="button" className="stage-property-group-title" aria-expanded={!closed.lighting} onClick={()=>setClosed(s=>({...s,lighting:!s.lighting}))}>Lighting & exposure<span>{closed.lighting?'＋':'−'}</span></button>
      {!closed.lighting&&<div className="stage-property-fields">
        <label className="stage-property-field"><span>Lighting preset</span><select aria-label="Lighting preset" value={renderSettings.environmentPreset||'studio'} onChange={e=>onRenderSettingChange?.('environmentPreset',e.target.value)}>{['studio','softbox','dramatic','neutral'].map(preset=><option key={preset} value={preset}>{preset[0].toUpperCase()+preset.slice(1)}</option>)}</select></label>
        <label className="stage-property-field"><span>Exposure</span><input aria-label="Stage exposure" type="number" min=".2" max="4" step=".05" value={renderSettings.exposure??1} onChange={e=>{if(e.target.value!=='')onRenderSettingChange?.('exposure',numberValue(e.target.value,1,.2,4))}}/></label>
        {renderLight('light','Light 1 · Key')}
        {renderLight('light2','Light 2 · Fill')}
        <button type="button" className="stage-property-reset-lighting" onClick={resetLighting}>Reset lighting</button>
      </div>}
    </section>
    {groups.map(([name,fields])=><section key={name} className="stage-property-group">
      <button type="button" className="stage-property-group-title" aria-expanded={!closed[name]} onClick={()=>setClosed(s=>({...s,[name]:!s[name]}))}>{name}<span>{closed[name]?'＋':'−'}</span></button>
      {!closed[name]&&<div className="stage-property-fields">{fields.map(([key,label,min,max,step])=><div key={key} className="stage-property-field"><span>{label}</span>{Array.isArray(values[key])?<div className="stage-property-vector">{values[key].map((item,index)=><label key={index}><small>{'XYZ'[index]}</small><input aria-label={label+' '+'XYZ'[index]} type="number" value={item} min={min} max={max} step={step} onChange={e=>{const n=e.target.valueAsNumber;if(Number.isFinite(n)){const next=[...values[key]];next[index]=Math.min(max,Math.max(min,n));change(key,next)}}}/></label>)}</div>:typeof values[key]==='boolean'?<input aria-label={label} type="checkbox" checked={values[key]} onChange={e=>change(key,e.target.checked)}/>:key.toLowerCase().includes('color')?<input aria-label={label} type="color" value={values[key]} onChange={e=>change(key,e.target.value)}/>:<input aria-label={label} type="number" value={values[key]} min={min} max={max} step={step} onChange={e=>{const n=e.target.valueAsNumber;if(Number.isFinite(n))change(key,Math.min(max,Math.max(min,n)))}}/>}</div>)}</div>}
    </section>)}
    <div className="stage-property-actions"><button type="button" onClick={reset}>Reset defaults</button><button type="button" onClick={()=>{if(onRemoveStage)onRemoveStage();else onRenderSettingChange?.('stageId','none')}}>Remove stage</button></div>
  </div>
}
