import React, {useEffect, useRef, useState} from 'react'
import {ChevronDown, ChevronRight} from 'lucide-react'
import './SceneEnvironmentPropertyEditor.css'

export const DEFAULT_SCENE_ENVIRONMENT_SETTINGS = Object.freeze({
  camera: {name:'Default Camera',fieldOfView:45,viewType:'spherical',distanceMm:1800,horizontalAngle:0,verticalAngle:12,nearClipMm:10,farClipMm:100000,physicalCamera:false,focalLengthMm:50,sensorWidthMm:36},
  light: {name:'Light',enabled:true,intensity:1,color:'#ffffff'},
  environmentPreset:'studio',exposure:1,widthPx:1920,heightPx:1080,showEnvironment:true,
})

const finite=(value,fallback,min=-Infinity,max=Infinity)=>{
  const number=Number(value)
  return Number.isFinite(number)?Math.min(max,Math.max(min,number)):fallback
}

export function normalizeSceneEnvironmentSettings(value={}) {
  const source=value&&typeof value==='object'?value:{}
  const camera={...DEFAULT_SCENE_ENVIRONMENT_SETTINGS.camera,...(source.camera||{})}
  const light={...DEFAULT_SCENE_ENVIRONMENT_SETTINGS.light,...(source.light||{})}
  const nearClipMm=finite(camera.nearClipMm,10,0.1,100000)
  const farClipMm=Math.max(nearClipMm+10,finite(camera.farClipMm,100000,1,1000000))
  return {
    ...DEFAULT_SCENE_ENVIRONMENT_SETTINGS,...source,
    camera:{
      ...camera,
      name:String(camera.name||'Default Camera'),
      viewType:camera.viewType==='orthographic'?'orthographic':'spherical',
      fieldOfView:finite(camera.fieldOfView,45,5,150),
      distanceMm:finite(camera.distanceMm,1800,50,100000),
      horizontalAngle:finite(camera.horizontalAngle,0,-180,180),
      verticalAngle:finite(camera.verticalAngle,12,-89,89),
      nearClipMm,
      farClipMm,
      physicalCamera:Boolean(camera.physicalCamera),
      focalLengthMm:finite(camera.focalLengthMm,50,8,300),
      sensorWidthMm:finite(camera.sensorWidthMm,36,8,70),
    },
    light:{...light,name:String(light.name||'Light'),enabled:Boolean(light.enabled),intensity:finite(light.intensity,1,0,10),color:typeof light.color==='string'?light.color:'#ffffff'},
    exposure:finite(source.exposure,1,0.2,4),
    widthPx:Math.round(finite(source.widthPx,1920,64,16384)),
    heightPx:Math.round(finite(source.heightPx,1080,64,16384)),
    showEnvironment:source.showEnvironment!==false,
  }
}

function selectionKey(selection) {
  const raw=typeof selection==='string'?selection:[selection?.path,selection?.type,selection?.id,selection?.name].filter(Boolean).join(' ')
  const s=String(raw||'camera').toLowerCase()
  if(s.includes('render-light'))return 'light'
  if(s.includes('render-image'))return 'imageVideo'
  if(s.includes('render-settings'))return 'render'
  if(s.includes('camera'))return 'camera'
  if(s.includes('light'))return 'light'
  if(s.includes('simulation'))return 'simulation'
  if(s.includes('image')||s.includes('video')||s.includes('output'))return 'imageVideo'
  if(s.includes('render'))return 'render'
  if(s.includes('environment'))return 'environment'
  return 'camera'
}

function Group({title,children,initialOpen=true}) {
  const [open,setOpen]=useState(initialOpen)
  return <section className="scene-pe-group">
    <button type="button" className="scene-pe-group-title" aria-expanded={open} onClick={()=>setOpen(value=>!value)}>
      {open?<ChevronDown size={12}/>:<ChevronRight size={12}/>}<span>{title}</span>
    </button>
    {open&&<div className="scene-pe-fields">{children}</div>}
  </section>
}

function NumberField({label,value,min,max,step=1,unit='',onChange,slider=false}) {
  const [draft,setDraft]=useState(String(value))
  const [editing,setEditing]=useState(false)
  const cancelBlur=useRef(false)
  useEffect(()=>{
    if(!editing)setDraft(String(value))
  },[value,editing])
  const commit=()=>{
    if(cancelBlur.current){cancelBlur.current=false;return}
    const parsed=draft.trim()===''?NaN:Number(draft)
    const next=Number.isFinite(parsed)?finite(parsed,value,min,max):value
    setDraft(String(next))
    setEditing(false)
    if(next!==value)onChange(next)
  }
  const slide=next=>{
    const number=finite(next,value,min,max)
    setEditing(false)
    setDraft(String(number))
    onChange(number)
  }
  return <div className="scene-pe-field">
    <label className="scene-pe-label">{label}</label>
    <div className="scene-pe-value">
      {slider&&<input className="scene-pe-slider" aria-label={`${label} slider`} type="range" min={min} max={max} step={step} value={value} onChange={e=>slide(e.target.value)}/>}
      <div className="scene-pe-number-wrap"><input aria-label={label} type="text" inputMode="decimal" value={draft} onFocus={()=>setEditing(true)} onChange={e=>setDraft(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter'){e.currentTarget.blur()}else if(e.key==='Escape'){cancelBlur.current=true;setDraft(String(value));setEditing(false);e.currentTarget.blur()}}}/>{unit&&<span>{unit}</span>}</div>
    </div>
  </div>
}

function TextField({label,value,onChange}) {
  return <div className="scene-pe-field"><label className="scene-pe-label">{label}</label><input className="scene-pe-control" aria-label={label} value={value||''} onChange={e=>onChange(e.target.value)}/></div>
}
function SelectField({label,value,options,onChange}) {
  return <div className="scene-pe-field"><label className="scene-pe-label">{label}</label><select className="scene-pe-control" aria-label={label} value={value} onChange={e=>onChange(e.target.value)}>{options.map(([key,name])=><option key={key} value={key}>{name}</option>)}</select></div>
}
function SwitchField({label,checked,onChange}) {
  return <label className="scene-pe-field scene-pe-switch-row"><span className="scene-pe-label">{label}</span><input type="checkbox" checked={Boolean(checked)} onChange={e=>onChange(e.target.checked)}/></label>
}
function Hint({children}) {return <p className="scene-pe-hint">{children}</p>}

export default function SceneEnvironmentPropertyEditor({selection='camera',settings={},onChange}) {
  const kind=selectionKey(selection)
  const current=normalizeSceneEnvironmentSettings(settings)
  const camera=current.camera
  const light=current.light
  const cameraChange=(field,value)=>{
    if(field==='nearClipMm'){
      const nearClipMm=finite(value,camera.nearClipMm,0.1,100000)
      onChange?.({camera:{nearClipMm,...(camera.farClipMm<nearClipMm+10?{farClipMm:nearClipMm+10}:{})}})
    }else if(field==='farClipMm'){
      onChange?.({camera:{farClipMm:Math.max(camera.nearClipMm+10,finite(value,camera.farClipMm,1,1000000))}})
    }else onChange?.({camera:{[field]:value}})
  }
  const lightChange=(field,value)=>onChange?.({light:{[field]:value}})
  const renderChange=(field,value)=>onChange?.({[field]:value})
  const field=(label,key,min,max,step=1,unit='',slider=false)=><NumberField label={label} value={camera[key]} min={min} max={max} step={step} unit={unit} slider={slider} onChange={v=>cameraChange(key,v)}/>
  return <div className="scene-pe" data-scene-property-kind={kind}>
    <div className="scene-pe-heading">Property Editor</div>
    {kind==='camera'&&<>
      <Group title="Camera">
        <TextField label="Name" value={camera.name} onChange={v=>cameraChange('name',v)}/>
      </Group>
      <Group title="Lens">
        {field('Field of View', 'fieldOfView',5,150,0.5,'°',true)}
      </Group>
      <Group title="View Orientation">
        <SelectField label="View Type" value={camera.viewType} options={[["spherical","Spherical"],["orthographic","Orthographic"]]} onChange={v=>cameraChange('viewType',v)}/>
        {field('Distance','distanceMm',50,100000,10,'mm')}
        {field('Horizontal Angle','horizontalAngle',-180,180,1,'°',true)}
        {field('Vertical Angle','verticalAngle',-89,89,1,'°',true)}
      </Group>
      <Group title="Clipping Plane">
        {field('Near','nearClipMm',0.1,100000,1,'mm')}
        {field('Far','farClipMm',1,1000000,100,'mm')}
      </Group>
      <Group title="Physical Camera">
        <SwitchField label="Enable" checked={camera.physicalCamera} onChange={v=>cameraChange('physicalCamera',v)}/>
        {camera.physicalCamera&&<>
          {field('Focal Length','focalLengthMm',8,300,1,'mm')}
          {field('Sensor Width','sensorWidthMm',8,70,1,'mm')}
        </>}
      </Group>
    </>}
    {kind==='light'&&<>
      <Group title="Light">
        <TextField label="Name" value={light.name} onChange={v=>lightChange('name',v)}/>
        <SwitchField label="Enabled" checked={light.enabled} onChange={v=>lightChange('enabled',v)}/>
        <NumberField label="Intensity" value={light.intensity} min={0} max={10} step={0.05} slider onChange={v=>lightChange('intensity',v)}/>
        <div className="scene-pe-field"><label className="scene-pe-label">Color</label><input className="scene-pe-color" aria-label="Light color" type="color" value={light.color} onChange={e=>lightChange('color',e.target.value)}/></div>
      </Group>
    </>}
    {(kind==='environment'||kind==='render')&&<>
      <Group title="Environment">
        <SwitchField label="Show Environment" checked={current.showEnvironment} onChange={v=>renderChange('showEnvironment',v)}/>
        <SelectField label="Preset" value={current.environmentPreset} options={[["studio","Studio"],["softbox","Softbox"],["dramatic","Dramatic"],["neutral","Neutral"]]} onChange={v=>renderChange('environmentPreset',v)}/>
        <NumberField label="Exposure" value={current.exposure} min={0.2} max={4} step={0.05} slider onChange={v=>renderChange('exposure',v)}/>
      </Group>
      <Group title="Render Image / Video Properties">
        <NumberField label="Width" value={current.widthPx} min={64} max={16384} unit="px" onChange={v=>renderChange('widthPx',Math.round(v))}/>
        <NumberField label="Height" value={current.heightPx} min={64} max={16384} unit="px" onChange={v=>renderChange('heightPx',Math.round(v))}/>
      </Group>
    </>}
    {kind==='imageVideo'&&<Group title="Render Image / Video Properties">
      <NumberField label="Width" value={current.widthPx} min={64} max={16384} unit="px" onChange={v=>renderChange('widthPx',Math.round(v))}/>
      <NumberField label="Height" value={current.heightPx} min={64} max={16384} unit="px" onChange={v=>renderChange('heightPx',Math.round(v))}/>
      <Hint>Dimensions apply to the project's render output.</Hint>
    </Group>}
    {kind==='simulation'&&<Group title="Simulation Properties"><Hint>Simulation parameters are edited through the garment simulation controls.</Hint></Group>}
  </div>
}
