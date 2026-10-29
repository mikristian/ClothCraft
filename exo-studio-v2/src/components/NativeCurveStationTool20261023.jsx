import React,{useEffect,useMemo,useState} from 'react'
import {buildNativeCurveStation20261023} from '../core/nativeCurveStation20261023.js'
import './NativePatternConstructionTools20261023.css'

export default function NativeCurveStationTool20261023({snapshot,selected,onSelect,onApply,onPreview,disabled=false}){
  const [panelId,setPanelId]=useState('')
  const [edge,setEdge]=useState('')
  const [mode,setMode]=useState('distance')
  const [distanceMm,setDistanceMm]=useState('50')
  const [percent,setPercent]=useState('50')
  const [saving,setSaving]=useState(false)
  const [status,setStatus]=useState('')
  const panels=snapshot?.template?.panels||[]
  useEffect(()=>{
    if(selected?.panel&&panels.some(p=>p.id===selected.panel)){
      setPanelId(selected.panel)
      if(typeof selected.edge==='string')setEdge(selected.edge)
    }
  },[selected?.panel,selected?.edge,snapshot?.template])
  const panel=panels.find(p=>p.id===(panels.some(p=>p.id===panelId)?panelId:panels[0]?.id))
  const edges=panel?.polygon?.edges||[]
  const namedEdge=edges.includes(edge)?edge:edges[0]
  const proposal=useMemo(()=>buildNativeCurveStation20261023(snapshot,{
    panelId:panel?.id,edge:namedEdge,mode,distanceMm,fraction:percent===''?NaN:Number(percent)/100,
  }),[snapshot,panel?.id,namedEdge,mode,distanceMm,percent])
  useEffect(()=>{
    onPreview?.(proposal.ok?{panelId:proposal.panelId,position:proposal.position,edge:proposal.edge,revision:proposal.revision}:null)
    return()=>onPreview?.(null)
  },[onPreview,proposal.ok,proposal.panelId,proposal.position?.[0],proposal.position?.[1],proposal.edge,proposal.revision])
  const apply=async()=>{
    if(disabled||saving||!proposal.ok)return
    setStatus('');setSaving(true)
    try{
      const result=await onApply?.(proposal)
      setStatus(result===true?'Split committed in the native garment. Undo restores the source edge; recheck sewing and grade correspondence.':'Native split was not accepted. The original contour is unchanged.')
    }catch(error){setStatus(error?.message||String(error))}
    finally{setSaving(false)}
  }
  return <section className="exo-native-construction" data-native-curve-station="true" aria-label="Native physical curve station tool">
    <strong>CURVE STATION · MATERIAL ARCLENGTH</strong>
    <p>Split a named pattern boundary at its measured position along the real Bézier or free-point curve, not the straight chord.</p>
    <label>Pattern<select aria-label="Curve station pattern" value={panel?.id||''} onChange={event=>{const id=event.target.value;setPanelId(id);setEdge('');setStatus('');onSelect?.({panel:id})}}>
      {panels.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
    </select></label>
    <label>Named edge<select aria-label="Curve station named edge" value={namedEdge||''} onChange={event=>{setEdge(event.target.value);setStatus('');onSelect?.({panel:panel?.id,edge:event.target.value})}}>
      {edges.map((name,i)=><option key={name} value={name}>{i+1}. {name}</option>)}
    </select></label>
    <label>Position method<select aria-label="Curve station input method" value={mode} onChange={e=>{setMode(e.target.value);setStatus('')}}>
      <option value="distance">Distance from start (mm)</option>
      <option value="fraction">Physical edge length (%)</option>
    </select></label>
    {mode==='distance'?<label>From edge start (mm)
      <input type="number" step="0.1" min="0" aria-label="Curve station distance millimetres" value={distanceMm} onChange={e=>setDistanceMm(e.target.value)}/>
    </label>:<label>Fraction of full physical length (%)
      <input type="number" min="0" max="100" step="0.1" aria-label="Curve station arclength percent" value={percent} onChange={e=>setPercent(e.target.value)}/>
    </label>}
    {proposal.ok?<div className="exo-construction-result" data-curve-station-status="ready" role="status">
      <strong>MEASURED PROPOSAL · NOT APPLIED</strong>
      <span>Full edge: {proposal.edgeLengthMm.toFixed(2)} mm</span>
      <span>Split station: {proposal.stationMm.toFixed(2)} mm · {(proposal.fraction*100).toFixed(2)}%</span>
      <span>X {(proposal.position[0]*1000).toFixed(2)} mm · Y {(proposal.position[1]*1000).toFixed(2)} mm</span>
      <span>Native document revision {proposal.revision} · sampled length, not industrial accuracy</span>
    </div>:<p className="exo-construction-invalid" data-curve-station-status="blocked" role="status">Split blocked: {proposal.reason}</p>}
    <div className="exo-construction-actions"><button type="button" disabled={!proposal.ok||disabled||saving} onClick={apply}>{saving?'Splitting…':'Split boundary · native Undo'}</button></div>
    {status&&<p role="status" className="exo-construction-message">{status}</p>}
    <small>This changes native topology only after the Rust edit accepts it. A new split is not an industrial notch, grade rule, seam match or cut-file approval.</small>
  </section>
}
