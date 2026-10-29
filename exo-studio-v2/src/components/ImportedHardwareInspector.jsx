import React,{useEffect,useState} from 'react'
import './ImportedHardwareInspector.css'

const numeric = [
  ['widthMm', 'Width', 0.5, 250, 0.5, 'mm'],
  ['heightMm', 'Height', 0.5, 250, 0.5, 'mm'],
  ['depthMm', 'Thickness / Depth', 0.1, 80, 0.1, 'mm'],
  ['x', 'Position X', -500, 500, 0.5, 'cm'],
  ['y', 'Position Y', -500, 500, 0.5, 'cm'],
  ['rotationDeg', 'Rotation', -360, 360, 1, '°'],
  ['liftMm', 'Surface Offset', 0, 30, 0.2, 'mm'],
  ['roughness', 'Roughness', 0, 1, 0.01, ''],
  ['metalness', 'Metalness', 0, 1, 0.01, ''],
  ['reflectionIntensity', 'Reflected Light', 0, 3, 0.05, ''],
  ['clearcoat', 'Clearcoat', 0, 1, 0.01, ''],
  ['weightGrams', 'Weight (specification)', 0, 500, 0.1, 'g'],
  ['opacity', 'Opacity', 0, 1, 0.01, ''],
]

function NumberEdit({field,label,min,max,step,unit,value,onChange}) {
  const current = Number.isFinite(Number(value)) ? Number(value) : min
  const [draft,setDraft]=useState(String(current))
  const [error,setError]=useState('')
  useEffect(()=>{setDraft(String(current));setError('')},[current])
  const commit=raw=>{
    const number=Number(raw)
    if(!String(raw).trim()||!Number.isFinite(number)||number<min||number>max){
      setError(`Enter a value between ${min} and ${max}`)
      return
    }
    setError('')
    if(number!==current)onChange?.(field,number)
  }
  return <div className="exo-imported-hardware-field" data-imported-hardware-property={field}>
    <label htmlFor={`imported-hardware-${field}`}>{label}</label>
    <div className="exo-imported-hardware-value">
      <input aria-label={`${label} slider`} type="range" min={min} max={max} step={step} value={Math.max(min,Math.min(max,current))} onChange={e=>commit(e.target.value)}/>
      <input id={`imported-hardware-${field}`} aria-label={`${label} value`} type="number" min={min} max={max} step="any" value={draft}
        onChange={e=>setDraft(e.target.value)}
        onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur()}}}
        onBlur={()=>commit(draft)}/>
      <small>{unit}</small>
    </div>
    {error&&<small role="alert" className="exo-imported-hardware-error">{error}</small>}
  </div>
}

export default function ImportedHardwareInspector({asset,placement,selectedPanelName='',onPlace,onEdit,onRemove,onDuplicate,readonly=false,nativeMode=false,canUndoHardware=false,canRedoHardware=false,onUndoHardware,onRedoHardware}) {
  if(!asset&&!placement)return null
  const record=placement||asset
  const isPlaced=Boolean(placement)
  const hasModel=Boolean(record.glbUrl||record.model||asset?.model||asset?.glb)
  const source=record.sourcePath||asset?.sourcePath||''
  return <section className="exo-imported-hardware-inspector" aria-label="Imported hardware Property Editor" data-imported-hardware-editor={isPlaced?'placed':'library'}>
    <header className="exo-imported-hardware-head"><small>HARDWARE & TRIMS · 3D ASSET</small><strong>{record.name||asset?.name||'Imported 3D component'}</strong>
      <span>{isPlaced?`Placed on ${selectedPanelName||record.nativePanelId||record.pieceId||'garment'}`:'Original locally converted asset'}</span>
    </header>
    <div className="exo-imported-hardware-summary">
      {(record.thumbnail||asset?.thumbnail)&&<img src={record.thumbnail||asset.thumbnail} alt=""/>}
      <div><strong>{hasModel?'Original 3D geometry':'Source definition / texture'}</strong><small>{source?source.replace(/\\/g,'/').split('/').pop():'Local hardware library'}</small><small>Measured mesh sizes are indicative; verify original units for manufacturing.</small></div>
    </div>
    {!isPlaced&&<button type="button" className="exo-imported-hardware-primary" data-imported-place-button disabled={!hasModel||!onPlace} onClick={()=>onPlace?.(asset||record)}>
      {hasModel?`Place on ${selectedPanelName||'selected garment'}`:'Reference only · no standalone mesh'}
    </button>}
    {isPlaced&&<>
      <label className="exo-imported-hardware-switch"><input aria-label="Show imported hardware in 3D" type="checkbox" checked={record.visible!==false} onChange={e=>onEdit?.('visible',e.target.checked)}/>Show in 3D</label>
      <div className="exo-imported-hardware-fields">
        <label className="exo-imported-hardware-field" htmlFor="imported-hardware-material-type">Material Family
          <select id="imported-hardware-material-type" aria-label="Imported hardware material family"
            value={record.materialType||'original'} onChange={event=>onEdit?.('materialType',event.target.value)}>
            <option value="original">Original imported material</option><option value="metal">Metal</option>
            <option value="plastic">Plastic</option><option value="nylon">Nylon</option>
            <option value="textile">Textile</option><option value="ceramic">Ceramic</option>
            <option value="glass">Glass</option>
          </select>
        </label>
        {numeric.map(([field,label,min,max,step,unit])=><NumberEdit key={field} field={field} label={label} min={min} max={max} step={step} unit={unit} value={record[field]} onChange={onEdit}/>) }
        <div className="exo-imported-hardware-field"><label htmlFor="imported-hardware-color">Material Color</label>
          <div className="exo-imported-hardware-value"><input type="color" id="imported-hardware-color" aria-label="Imported hardware material color" value={/^#[a-f0-9]{6}$/i.test(record.color||'')?record.color:'#a5a5a5'} onChange={e=>onEdit?.('color',e.target.value)}/><code>{record.color||'#a5a5a5'}</code></div>
        </div>
      </div>
      <div className="exo-imported-hardware-actions"><button type="button" onClick={onDuplicate} disabled={readonly}>Duplicate</button><button type="button" onClick={onRemove} disabled={readonly}>Remove</button></div>
    </>}
    {nativeMode&&<div className="exo-imported-hardware-actions"><button type="button" data-imported-hardware-undo title="Undo only when imported hardware is the newest edit in global history" disabled={!canUndoHardware||readonly} onClick={onUndoHardware}>Undo Hardware</button><button type="button" data-imported-hardware-redo title="Redo only when imported hardware is the next edit in global history" disabled={!canRedoHardware||readonly} onClick={onRedoHardware}>Redo Hardware</button></div>}
    <small className="exo-imported-hardware-disclaimer">Surface placement follows garment deformation where supported. Imported rigid objects do not create simulated fastener contact, cutting, or tooth-interlocking forces.</small>
    {isPlaced&&<small className="exo-imported-hardware-disclaimer">Weight is a recorded hardware specification and does not change native cloth mass. Material settings affect the GLB render; supplied mesh dimensions are estimates until calibrated.</small>}
  </section>
}
