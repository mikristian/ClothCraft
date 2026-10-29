import React,{useEffect,useMemo,useState} from 'react'
import {buildNativeConstructionGuides20261025} from '../core/nativeConstructionGuides20261025.js'

// Actual Rust InternalLine construction commands, not UI-only annotations.
// Folding/dart intake/pleat sewing are explicitly separate production steps.
export default function NativeConstructionGuides20261025({snapshot,selected,disabled=false,onApply=()=>{}}){
 const panels=snapshot?.template?.panels||[]
 const [panelId,setPanelId]=useState('')
 const [kind,setKind]=useState('fold')
 const [start,setStart]=useState(['10','10']),[end,setEnd]=useState(['150','10'])
 const [count,setCount]=useState('3'),[spacing,setSpacing]=useState('15')
 const [depth,setDepth]=useState('20'),[intake,setIntake]=useState('20')
 const [status,setStatus]=useState('')
 const chosen=panels.find(panel=>panel.id===panelId)||panels.find(panel=>panel.id===selected?.panel)||panels[0]
 useEffect(()=>{
  if(chosen?.id&&chosen.id!==panelId)setPanelId(chosen.id)
 },[chosen?.id,panelId])
 useEffect(()=>{
  if(!chosen?.polygon?.points?.length)return
  const pts=chosen.polygon.points
  const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1])
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys)
  if(![minX,maxX,minY,maxY].every(Number.isFinite))return
  // Start from a real physical section of the selected cut pattern.
  setStart([((minX+(maxX-minX)*.25)*1000).toFixed(2),
    ((minY+(maxY-minY)*.5)*1000).toFixed(2)])
  setEnd([((minX+(maxX-minX)*.75)*1000).toFixed(2),
    ((minY+(maxY-minY)*.5)*1000).toFixed(2)])
 },[chosen?.id])
 const finiteText=s=>{
  const text=String(s).trim()
  if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text))return NaN
  return Number(text)
 }
 const proposal=useMemo(()=>buildNativeConstructionGuides20261025(snapshot,{
  panelId:chosen?.id,kind,
  start:start.map(value=>finiteText(value)/1000),
  end:end.map(value=>finiteText(value)/1000),
  count:finiteText(count),spacingMm:finiteText(spacing),
  depthMm:finiteText(depth),intakeMm:finiteText(intake)
 }),[snapshot,chosen?.id,kind,start,end,count,spacing,depth,intake])
 return <form data-native-construction-guide-tool="true" aria-label="Native construction line and fold guide drafting"
   onSubmit={async event=>{
    event.preventDefault()
    if(!proposal.ok||disabled||kind==='dart')return
    setStatus('Applying validated physical guide geometry through native Rust…')
    try{
      const accepted=await onApply(proposal)
      setStatus(accepted?`${proposal.guides.length} native ${kind} guide(s) saved. Source cutline remains unchanged.`:
        'Native Rust did not accept the guides; verify Undo before continuing.')
    }catch(error){setStatus(error?.message||'Construction guide commit failed')}
   }}
   style={{display:'grid',gap:9,padding:12,maxHeight:'65vh',overflow:'auto',fontSize:12}}>
   <p>Draw physical construction marks on a named garment panel. Internal Lines are saved in the Rust garment and supported by Undo.</p>
   <label>Pattern <select aria-label="Construction guide panel" value={chosen?.id||''}
     onChange={e=>{setPanelId(e.target.value);setStatus('')}}>
     {panels.map(panel=><option key={panel.id} value={panel.id}>{panel.name} / {panel.id}</option>)}
   </select></label>
   <label>Guide type <select aria-label="Construction guide type" value={kind}
     onChange={e=>{setKind(e.target.value);setStatus('')}}>
     <option value="internal">Internal line</option>
     <option value="fold">Fold marking line</option>
     <option value="pleat">Parallel pleat fold / placement guides</option>
     <option value="dart">Dart leg guide lines (not cut-and-sewn)</option>
   </select></label>
   <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:6}}>
     {[['Start X','start-x',start[0],v=>setStart(p=>[v,p[1]])],
       ['Start Y','start-y',start[1],v=>setStart(p=>[p[0],v])],
       ['End X','end-x',end[0],v=>setEnd(p=>[v,p[1]])],
       ['End Y','end-y',end[1],v=>setEnd(p=>[p[0],v])]].map(([name,id,value,change])=>
       <label key={id}>{name} (mm) <input aria-label={name+' mm'} inputMode="decimal" value={value}
         onChange={event=>change(event.target.value)} style={{width:'100%',boxSizing:'border-box'}}/></label>)}
   </div>
   {kind==='pleat'&&<>
    <label>Number of fold/placement marks <input type="number" aria-label="Guide pleat count"
      min="1" max="32" step="1" value={count} onChange={e=>setCount(e.target.value)}/></label>
    <label>Between marks (mm) <input inputMode="decimal" aria-label="Guide pleat spacing mm"
      value={spacing} onChange={e=>setSpacing(e.target.value)}/></label>
   </>}
   {kind==='dart'&&<>
    <label>Intake width (mm) <input inputMode="decimal" aria-label="Guide dart intake mm"
      value={intake} onChange={e=>setIntake(e.target.value)}/></label>
    <label>Guide depth (mm) <input inputMode="decimal" aria-label="Guide dart depth mm"
      value={depth} onChange={e=>setDepth(e.target.value)}/></label>
   </>}
   <div role="status" data-native-guide-preview={proposal.ok?'ready':'blocked'}>
    {proposal.ok?`${proposal.guides.length} clipped physical guide segment(s) ready · ${proposal.guides.reduce((sum,g)=>sum+g.lengthMm,0).toFixed(2)} mm aggregate drawn length`:
      `Blocked: ${proposal.reason}`}
   </div>
   <button data-native-guide-apply="true" type="submit" disabled={disabled||!proposal.ok||kind==='dart'}>
     Save {kind} guides in native Rust
   </button>
   {kind==='dart'&&<>
     <small>Intersecting dart-leg guide strokes are not independently committable as ordinary native InternalLine geometry. Use the validated physical dart cutter instead; it creates real dart geometry and a sewing relationship in one native operation.</small>
     <button type="button" data-native-open-physical-dart="true" disabled={disabled}
       onClick={()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',
         {detail:{tool:'dart-precision'}}))}>
       Open physical cut-and-sewn Dart tool
     </button>
   </>}
   {status&&<small role="status">{status}</small>}
   <small>{proposal.ok?proposal.note:'Only complete uncurved native contours without holes support this precision clipping workflow.'}</small>
 </form>
}
