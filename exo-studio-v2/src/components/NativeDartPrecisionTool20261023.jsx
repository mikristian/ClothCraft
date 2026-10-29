import React,{useEffect,useMemo,useState} from 'react'
import {buildNativeDartPrecision20261023} from '../core/nativeDartPrecision20261023.js'
import './NativePatternConstructionTools20261023.css'

export default function NativeDartPrecisionTool20261023({snapshot,selected,onSelect,onPreview,onApply,disabled=false}){
  const [panelId,setPanelId]=useState(''),[edge,setEdge]=useState('')
  const [center,setCenter]=useState('50'),[intake,setIntake]=useState('20'),[depth,setDepth]=useState('50')
  const [saving,setSaving]=useState(false),[feedback,setFeedback]=useState('')
  const panels=snapshot?.template?.panels||[]
  useEffect(()=>{
    if(selected?.panel&&panels.some(p=>p.id===selected.panel)){
      setPanelId(selected.panel)
      if(typeof selected.edge==='string')setEdge(selected.edge)
    }
  },[selected?.panel,selected?.edge,snapshot?.template])
  const panel=panels.find(p=>p.id===(panels.some(p=>p.id===panelId)?panelId:panels[0]?.id))
  const edges=panel?.polygon?.edges||[]
  const chosenEdge=edges.includes(edge)?edge:edges[0]
  const proposal=useMemo(()=>buildNativeDartPrecision20261023(snapshot,{
    panelId:panel?.id,edge:chosenEdge,
    centerFraction:center.trim()?Number(center)/100:NaN,
    intakeMm:intake.trim()?Number(intake):NaN,
    depthMm:depth.trim()?Number(depth):NaN,
  }),[snapshot,panel?.id,chosenEdge,center,intake,depth])
  useEffect(()=>{
    onPreview?.(proposal.ok?proposal.preview:null)
    return()=>onPreview?.(null)
  },[onPreview,proposal.ok,proposal.revision,proposal.panelId,proposal.edge,
    proposal.apex?.[0],proposal.apex?.[1],proposal.left?.[0],proposal.left?.[1],proposal.right?.[0],proposal.right?.[1]])
  const commit=async()=>{
    if(disabled||saving||!proposal.ok)return
    setSaving(true);setFeedback('')
    try{
      const applied=await onApply?.(proposal)
      setFeedback(applied===true?'Created physical V-cut and same-panel dart seam in Rust. Undo restores the prior pattern. Verify fit, grading and industrial allowances.':'Rust rejected the dart; the original garment is unchanged.')
    }catch(error){setFeedback(error?.message||String(error))}
    finally{setSaving(false)}
  }
  const number=(name,value,set,unit,minimum,maximum)=><label>{name} ({unit})
    <input type="number" aria-label={`Precision dart ${name.toLowerCase()}`} min={minimum} max={maximum} step="0.5" value={value} onChange={event=>{set(event.target.value);setFeedback('')}}/>
  </label>
  return <section className="exo-native-construction" aria-label="Native precision physical dart" data-native-dart-precision="true">
    <strong>DART · REAL CUT & SEWN GEOMETRY</strong>
    <p>Place a symmetric dart on an unsewn straight edge using precise metric intake and depth. Rust creates the V-shaped cut and a physical dart seam; not a cosmetic red guide.</p>
    <label>Pattern<select aria-label="Precision dart pattern" value={panel?.id||''} onChange={e=>{setPanelId(e.target.value);setEdge('');onSelect?.({panel:e.target.value});setFeedback('')}}>
      {panels.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
    </select></label>
    <label>Unsewn straight boundary<select aria-label="Precision dart boundary" value={chosenEdge||''} onChange={e=>{setEdge(e.target.value);onSelect?.({panel:panel.id,edge:e.target.value});setFeedback('')}}>
      {edges.map((name,i)=><option key={name} value={name}>{i+1}. {name}</option>)}
    </select></label>
    {number('Centre station',center,setCenter,'%',1,99)}
    {number('Intake',intake,setIntake,'mm',3,150)}
    {number('Depth',depth,setDepth,'mm',8,500)}
    {proposal.ok?<div className="exo-construction-result" data-native-dart-status="ready" role="status">
      <strong>VALIDATED PROPOSAL · NOT APPLIED</strong>
      <span>Equal sewn legs: {proposal.legsMm[0].toFixed(2)} mm each</span>
      <span>Intake angle: {proposal.angleDegrees.toFixed(2)}° · wedge area: {proposal.wedgeAreaMm2.toFixed(1)} mm²</span>
      <span>Apex X {(proposal.apex[0]*1000).toFixed(2)} mm · Y {(proposal.apex[1]*1000).toFixed(2)} mm</span>
      <span>Native revision {proposal.revision} · uncut folded darts require a separate workflow</span>
    </div>:<p className="exo-construction-invalid" data-native-dart-status="blocked" role="status">Dart blocked: {proposal.reason}</p>}
    <div className="exo-construction-actions"><button type="button" disabled={!proposal.ok||disabled||saving} onClick={commit}>{saving?'Cutting…':'Create physical dart · native Undo'}</button></div>
    {feedback&&<p role="status" className="exo-construction-message">{feedback}</p>}
    <small>A physical sewn dart is not a dart pivot/transfer, full pattern closure/trueing, size-grade validation or certified production pattern.</small>
  </section>
}
