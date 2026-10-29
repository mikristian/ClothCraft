import React,{useEffect,useState} from 'react'
import {Crosshair,Scissors,ShieldCheck} from 'lucide-react'
import './OptitexGradeNotchEditor20261027.css'

/** Physical native Grade Notch: preview and commit are separate server-backed
 * transactions, never synthetic canvas marks or CSS-only success messages. */
export default function OptitexGradeNotchEditor20261027({
 snapshot,panelId,disabled=false,onPreview,onCommit,onClose,
}){
 const [edgeId,setEdgeId]=useState('')
 const [fraction,setFraction]=useState('0.5')
 const [depthMm,setDepthMm]=useState('4')
 const [positionMode,setPositionMode]=useState('percent')
 const [preview,setPreview]=useState(null)
 const [notice,setNotice]=useState('')
 const [working,setWorking]=useState(false)
 const panel=snapshot?.template?.panels?.find(p=>p.id===panelId)
 const edges=panel?.polygon?.edges||[]
 const selectedEdge=edges.includes(edgeId)?edgeId:edges[0]||''
 const existing=panel?.polygon?.notches?.[selectedEdge]||[]
 const fractionValue=Number(fraction)
 const duplicate=existing.some(notch=>Math.abs(Number(notch.t)-fractionValue)<.0001)
 const valid=!!selectedEdge&&!duplicate&&Number.isFinite(Number(fraction))&&
  Number(fraction)>.02&&Number(fraction)<.98&&Number.isFinite(Number(depthMm))&&
  Number(depthMm)>0&&Number(depthMm)<=25
 useEffect(()=>{setEdgeId('');setPreview(null);setNotice('')},[panelId,snapshot?.revision])
 const params=()=>({panelId,edgeId:selectedEdge,t:Number(fraction),depthMm:Number(depthMm)})
 const previewEdit=async()=>{
  if(!valid||disabled||working||typeof onPreview!=='function')return
  setWorking(true);setNotice('')
  try{
   const result=await onPreview(params())
   if(!result?.ok){setPreview(null);setNotice(result?.reason||'Native physical notch preview was rejected');return}
   setPreview(result);setNotice(result.notice||'Native six-size notch preflight is ready.')
  }catch(error){setPreview(null);setNotice(error?.message||String(error))}
  finally{setWorking(false)}
 }
 const commit=async()=>{
  if(!preview?.ok||disabled||working||typeof onCommit!=='function')return
  setWorking(true);setNotice('')
  try{
   const result=await onCommit({...params(),preview})
   if(!result?.nativeCommitted){setNotice(result?.reason||'Rust did not confirm a saved all-size notch');return}
   setPreview(null);setNotice(result.notice||'Saved and rechecked physical notches in all six sizes.')
  }catch(error){setNotice(error?.message||String(error))}
  finally{setWorking(false)}
 }
 return <section className="exo-grade-notch-editor" data-exo-native-grade-notch-editor="true"
  aria-label="Native physical Grade Notch">
  <header><Scissors size={15}/><strong>Grade Notch · Rust native</strong>
   <button type="button" aria-label="Close Grade Notch editor" onClick={onClose}>×</button></header>
  <div className="exo-grade-notch-editor__fields">
   <label>Pattern <output>{panel?.name||panelId||'No pattern'}</output></label>
   <label>Contour edge <select aria-label="Grade Notch contour edge"
    value={selectedEdge} disabled={disabled||working} onChange={event=>{setEdgeId(event.target.value);setPreview(null)}}>
    {edges.map(edge=><option value={edge} key={edge}>{edge}</option>)}
   </select></label>
   <label>Arclength fraction <input type="number" aria-label="Grade Notch arclength fraction"
     min=".02" max=".98" step=".01" value={fraction} disabled={disabled||working}
     onChange={event=>{setFraction(event.target.value);setPreview(null)}}/></label>
   <label>Physical depth (mm) <input type="number" aria-label="Grade Notch physical depth millimetres"
     min=".5" max="25" step=".5" value={depthMm} disabled={disabled||working}
     onChange={event=>{setDepthMm(event.target.value);setPreview(null)}}/></label>
  </div>
  <div className="exo-grade-notch-editor__presets" role="group" aria-label="Notch placement presets"><span>Quick position</span>{[.25,.3333,.5,.6667,.75].map(t=><button key={t} type="button" aria-pressed={Math.abs(fractionValue-t)<.0001} disabled={disabled||working} onClick={()=>{setFraction(String(t));setPreview(null)}}>{Math.round(t*100)}%</button>)}<span>Depth</span>{[2,3,4,6].map(mm=><button key={mm} type="button" aria-pressed={Number(depthMm)===mm} disabled={disabled||working} onClick={()=>{setDepthMm(String(mm));setPreview(null)}}>{mm} mm</button>)}</div>
  <div className="exo-grade-notch-editor__station"><strong>Edge station</strong><div className="exo-grade-notch-editor__track" aria-label="Notch edge position preview"><span style={{left:`${Math.max(0,Math.min(100,fractionValue*100||0))}%`}}/></div><small>{Number.isFinite(fractionValue)?(fractionValue*100).toFixed(1):'—'}% along {selectedEdge||'edge'} · {existing.length} existing notch{existing.length===1?'':'es'}</small>{duplicate&&<small className="exo-grade-notch-editor__warning" role="alert">A notch already exists at this station. Choose a different position.</small>}</div>
  <div className="exo-grade-notch-editor__actions">
   <button type="button" disabled={!valid||disabled||working} onClick={previewEdit}>
    <Crosshair size={13}/> Preview six-size notch</button>
   <button type="button" disabled={!preview?.ok||disabled||working} onClick={commit}>
    <ShieldCheck size={13}/> Commit physical notch to Rust</button>
  </div>
  {preview?.ok&&<small>Prepared {preview.command?.edge} at {(preview.command?.t*100).toFixed(1)}% · {preview.sizes?.length} sizes · pending native commit</small>}
  {notice&&<p role="status">{notice}</p>}
  <small>Rust must verify exact source revision, six graded templates and physical notch geometry. Independent manufacturing and cutter approval remain separate.</small>
 </section>
}
