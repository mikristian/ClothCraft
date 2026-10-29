import React from 'react'
import {DEFAULT_FOAM_MATERIAL,normalizeFoamMaterial} from '../core/foamCompressionModel.js'

// These are designer-facing approximation parameters for a live geometric
// compression preview. They are not calibrated FEM material coefficients.
const CONTROLS=[
  {key:'compressionKpa',label:'Compression stiffness',unit:'kPa',min:5,max:500,step:5,precision:0,hint:'Higher values resist a finger press.'},
  {key:'densityKgM3',label:'Foam density',unit:'kg/m³',min:10,max:250,step:5,precision:0,hint:'Affects the animated inertia of the pad.'},
  {key:'recoverySeconds',label:'Recovery time',unit:'s',min:.1,max:5,step:.1,precision:1,hint:'How quickly the pad rises after release.'},
  {key:'dampingRatio',label:'Damping',unit:'×',min:.1,max:2,step:.05,precision:2,hint:'Controls bounce and oscillation.'},
  {key:'maxCompression',label:'Maximum compression',unit:'%',min:.05,max:.9,step:.05,precision:0,percentage:true,hint:'Limits indentation relative to raised foam depth.'},
  {key:'contactRadiusCm',label:'Press radius',unit:'cm',min:1,max:20,step:.5,precision:1,hint:'Area affected when pressing the foam.'},
  {key:'memory',label:'Residual indentation',unit:'%',min:0,max:.35,step:.01,precision:0,percentage:true,hint:'A temporary dent that slowly recovers, similar to memory foam.'},
]
const FOAM_PRESETS=[
  {id:'soft',label:'Soft polyurethane',material:{densityKgM3:25,compressionKpa:15,recoverySeconds:.35,dampingRatio:1.15,maxCompression:.8,contactRadiusCm:4,memory:.02}},
  {id:'eva',label:'Firm EVA',material:{densityKgM3:100,compressionKpa:150,recoverySeconds:.2,dampingRatio:.9,maxCompression:.45,contactRadiusCm:4,memory:0}},
  {id:'memory',label:'Memory foam',material:{densityKgM3:55,compressionKpa:28,recoverySeconds:1.8,dampingRatio:1.4,maxCompression:.75,contactRadiusCm:5,memory:.3}},
  {id:'structured',label:'Structured padding',material:{densityKgM3:80,compressionKpa:260,recoverySeconds:.25,dampingRatio:1.1,maxCompression:.25,contactRadiusCm:3,memory:0}},
]

export default function FoamMaterialPropertyEditor({pad,onChange,onClose}){
  if(!pad)return null
  const material=normalizeFoamMaterial(pad.material||DEFAULT_FOAM_MATERIAL)
  const update=(key,value)=>{
    const field=CONTROLS.find(item=>item.key===key)
    if(!field||!Number.isFinite(value))return
    const bounded=Math.max(field.min,Math.min(field.max,value))
    onChange?.({...material,[key]:bounded})
  }
  return <section className="foam-physical-property-editor" aria-label="Foam physical properties" data-foam-property-editor="true" style={{display:'grid',gap:10,padding:12,border:'1px solid var(--studio-border,#52616a)',borderRadius:7,background:'var(--studio-panel,#282e34)',color:'var(--studio-text,#e3e9ed)'}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:6}}><strong style={{fontSize:12}}>FOAM · PHYSICAL PROPERTIES</strong>{onClose&&<button type="button" onClick={onClose} aria-label="Close foam properties" style={{background:'transparent',color:'inherit',border:'1px solid #68747a',borderRadius:4}}>×</button>}</div>
    <div style={{fontSize:11,opacity:.83}}><strong>{pad.name||'Foam pad'}</strong> · {pad.panel||pad.pieceId||'Selected pattern'} · {Number(pad.depthCm||0).toFixed(1)} cm raised</div>
    <label style={{display:'grid',gap:5,fontSize:11}}>Material preset
      <select aria-label="Foam material preset" value="" onChange={event=>{
        const preset=FOAM_PRESETS.find(item=>item.id===event.target.value)
        if(preset)onChange?.({...preset.material})
      }} style={{padding:6,borderRadius:4,border:'1px solid #68747a',background:'#202b32',color:'#e9f2f6'}}>
        <option value="">Choose material response…</option>
        {FOAM_PRESETS.map(preset=><option key={preset.id} value={preset.id}>{preset.label}</option>)}
      </select>
    </label>
    {CONTROLS.map(field=>{
      const value=material[field.key]
      const formatted=(field.percentage?value*100:value).toFixed(field.precision)
      return <label key={field.key} style={{display:'grid',gap:5,fontSize:11}}>
        <span style={{display:'flex',justifyContent:'space-between',gap:6}}><span>{field.label}</span><strong style={{fontVariantNumeric:'tabular-nums'}}>{formatted} {field.unit}</strong></span>
        <input type="range" aria-label={field.label} min={field.min} max={field.max} step={field.step} value={value} onChange={event=>update(field.key,Number(event.target.value))}/>
        <small style={{opacity:.67,fontSize:10}}>{field.hint}</small>
      </label>
    })}
    <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
      <button type="button" onClick={()=>onChange?.({...DEFAULT_FOAM_MATERIAL})} style={{padding:'6px 9px',borderRadius:4,border:'1px solid #68747a',background:'#35434b',color:'#e5eef4',fontSize:11}}>Reset material</button>
    </div>
    <small style={{fontSize:10,opacity:.72,lineHeight:1.4}}>Use Select/Edit mode, then click or press and hold the raised foam in the 3D garment viewport to see indentation and recovery. Material presets are illustrative and uncalibrated. This is an interactive viscoelastic preview inspired by FEM contact ideas; the ZOZO PPF engine is not running here. Structural foam and real multilayer sewing remain separate development work.</small>
  </section>
}
