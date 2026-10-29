import React, {useRef, useState} from 'react'
import {parseSvgPattern} from '../core/svgPatternImport.js'
import {createFoamPaddingGeometry} from '../core/foamPaddingGeometry.js'
import {exportFoamPaddingSvg} from '../core/foamPaddingPatternExport.js'

const inputStyle={width:'100%',boxSizing:'border-box',background:'#202427',color:'#ebf0f2',border:'1px solid #68747a',borderRadius:4,padding:'5px',fontSize:11}
const gridStyle={display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:7,marginTop:9}

function Numeric({label,value,min,max,step=.5,onChange,disabled=false}){
  return <label style={{fontSize:10,color:'#b8c9d3',display:'grid',gap:4}}>{label}<input style={inputStyle} type="number" value={Number.isFinite(Number(value))?value:0} min={min} max={max} step={step} disabled={disabled} onChange={event=>{
    if(event.target.value==='')return
    const next=Number(event.target.value)
    if(Number.isFinite(next))onChange(Math.max(min,Math.min(max,next)))
  }}/></label>
}

/** Reusable additive pad editor. Pads live on a garment's actual 2D piece. */
export default function FoamPaddingEditor({piece,onAdd,onUpdate,onRemove,disabled=false}){
  const input=useRef(null)
  const [error,setError]=useState('')
  const pads=piece?.foamPads||[]
  const downloadPattern=pad=>{
    try{
      const output=exportFoamPaddingSvg(pad)
      const blob=new Blob([output],{type:'image/svg+xml;charset=utf-8'})
      const url=URL.createObjectURL(blob)
      const element=document.createElement('a')
      element.href=url
      element.download=`exo-foam-${String(pad.name||'shape').toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,60)}-cut-stitch.svg`
      document.body.appendChild(element)
      element.click()
      element.remove()
      window.setTimeout(()=>URL.revokeObjectURL(url),3000)
      setError('Exported a true-scale foam cutting outline and two stitch-guide paths. Verify with a sewn sample before production.')
    }catch(err){setError(`Foam pattern export: ${err.message}`)}
  }
  async function importPads(event){
    const file=event.target.files?.[0]
    event.target.value=''
    if(!file||disabled||!piece)return
    try{
      const source=await file.text()
      const result=parseSvgPattern(source,{fileName:file.name,maxPieces:12})
      const shapes=result.pieces.map(outline=>{
        const points=outline.points
        if(points.length>320)throw Error('This SVG has too many points for an editable padding shape. Simplify its path first (maximum 320 points per contour).')
        const widthCm=Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x))
        const heightCm=Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y))
        if(widthCm>120||heightCm>120)throw Error('SVG contour is larger than 120 cm; resize the artwork first.')
        const cy=(Math.max(...points.map(p=>p.y))+Math.min(...points.map(p=>p.y)))/2
        const normalizedPoints=points.map(p=>({x:p.x,y:p.y-cy}))
        const edgeWidthCm=Math.max(.1,Math.min(1.2,Math.min(widthCm,heightCm)*.12))
        const result=createFoamPaddingGeometry({points:normalizedPoints,depthCm:1.5,edgeWidthCm})
        if(!result.valid)throw Error(`Invalid foam shape '${outline.name}': ${result.error.message}`)
        return {name:outline.name||file.name,sourceName:file.name,
          points:normalizedPoints,x:0,y:0,widthCm,heightCm,
          rotationDeg:0,depthCm:1.5,edgeWidthCm,sewn:false,locked:false,mode:'sandwich'}
      })
      onAdd(shapes)
      setError(`Added ${shapes.length} foam shape${shapes.length===1?'':'s'}. Drag each in 2D to position it, then adjust depth and stitching.`)
    }catch(err){setError(`SVG padding import: ${err.message}`)}
  }
  return <section className="panel-section" aria-label="Foam padding and trapunto tool">
    <div className="panel-title"><span>Foam Padding / Trapunto</span><strong>{pads.length}</strong></div>
    <p className="panel-copy">Import closed SVG outlines, shape raised padding over the selected panel and generate a matched sewing guide. Two-fabric sandwich and underlay previews are available.</p>
    <input hidden ref={input} type="file" accept=".svg,image/svg+xml" onChange={importPads}/>
    <button type="button" className="wide-action" disabled={disabled||!piece} onClick={()=>input.current?.click()}>IMPORT SVG FOAM SHAPE</button>
    {error&&<p role="status" style={{color:'#b8d8e7',fontSize:11,lineHeight:1.45}}>{error}</p>}
    {pads.map(pad=><div key={pad.id} style={{border:'1px solid #58666d',borderRadius:6,padding:10,marginTop:10,display:'grid',gap:8}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:5}}><strong style={{fontSize:11}}>{pad.name||'Foam shape'}</strong><button type="button" title="Delete padding shape" aria-label="Remove padding" onClick={()=>onRemove(pad.id)}>×</button></div>
      <div style={gridStyle}>
        <Numeric label="Position X (cm)" value={pad.x||0} min={-150} max={150} disabled={pad.locked} onChange={v=>onUpdate(pad.id,{x:v})}/>
        <Numeric label="Position Y (cm)" value={pad.y||0} min={-150} max={150} disabled={pad.locked} onChange={v=>onUpdate(pad.id,{y:v})}/>
        <Numeric label="Width (cm)" value={pad.widthCm} min={.5} max={120} disabled={pad.locked} onChange={v=>onUpdate(pad.id,{widthCm:v})}/>
        <Numeric label="Height (cm)" value={pad.heightCm} min={.5} max={120} disabled={pad.locked} onChange={v=>onUpdate(pad.id,{heightCm:v})}/>
        <Numeric label="Depth (cm)" value={pad.depthCm} min={.1} max={8} step={.1} onChange={v=>onUpdate(pad.id,{depthCm:v})}/>
        <Numeric label="Edge roll (cm)" value={pad.edgeWidthCm} min={.2} max={8} step={.1} onChange={v=>onUpdate(pad.id,{edgeWidthCm:v})}/>
        <Numeric label="Rotation (°)" value={pad.rotationDeg||0} min={-180} max={180} step={1} disabled={pad.locked} onChange={v=>onUpdate(pad.id,{rotationDeg:v})}/>
      </div>
      <label style={{fontSize:11,display:'flex',alignItems:'center',justifyContent:'space-between'}}>Layer construction<select style={{...inputStyle,width:'auto'}} value={pad.mode||'sandwich'} onChange={e=>onUpdate(pad.id,{mode:e.target.value})}><option value="sandwich">Outer + foam + backing</option><option value="underlay">Foam below shell</option></select></label>
      <button type="button" className="wide-action" onClick={()=>onUpdate(pad.id,pad.locked?{locked:false,sewn:false}:{locked:true})}>{pad.locked?'UNLOCK POSITION':'LOCK POSITION'}</button>
      <label style={{fontSize:11,display:'flex',gap:8,alignItems:'center'}}><input type="checkbox" disabled={!pad.locked} checked={Boolean(pad.sewn)} onChange={e=>onUpdate(pad.id,{sewn:e.target.checked})}/>Generate perimeter stitch guides after locking</label>
      <button type="button" className="wide-action" disabled={!pad.locked} onClick={()=>downloadPattern(pad)}>EXPORT FOAM CUT + STITCH SVG</button>
      <small style={{color:'#98b2c0',fontSize:10,lineHeight:1.35}}>Preview geometry and stitch guides follow cloth deformation. Factory sew constraints, foam cutting offsets and multilayer cloth physics require separate validation.</small>
    </div>)}
  </section>
}
