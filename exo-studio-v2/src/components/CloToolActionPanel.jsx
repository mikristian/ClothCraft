import React, {useEffect,useRef} from 'react'
import { X, ExternalLink, CheckCircle2, Info, Wrench } from 'lucide-react'
import CadToolIcon from './CadToolIcon.jsx'
import './CloToolActionPanel.css'

const relatedWorkspace=slot=>{
 const text=(slot?.label||'').toLowerCase()
 if(/sew|tack|stitch|button|zipper|piping|binding|taping|puckering/.test(text))return 'Sewing'
 if(/fabric|texture|graphic|steam|press|fill/.test(text))return 'Fabric'
 if(/avatar|motion/.test(text))return 'Avatar'
 if(/grade|measure|pleat/.test(text))return 'Production'
 if(/simulate|hi-res|re-drape/.test(text))return 'Fit'
 return 'Pattern'
}

/** An honest action surface for each of the 70 actual CLO7-labelled icons.
 * A disabled CLO-equivalent is NOT secretly mapped to a different operation.
 * The inspector opens on click to reveal current command availability, native
 * preconditions, and a working related EXO workspace (not feature parity). */
export default function CloToolActionPanel({selected,onClose,onRun,onNavigate,onCreateDraft,draftAvailable=false,alternative,onTryAlternative}) {
 const closeRef=useRef(null)
 useEffect(()=>{
   if(selected&&(selected.status!=='native'||selected.pendingRun))closeRef.current?.focus({preventScroll:true})
 },[selected?.dimension,selected?.slot?.id,selected?.pendingRun])
 if(!selected)return null
 const {slot,dimension,status,reason,pendingRun}=selected
 const isNative=status==='native'
 const isInspect=status==='inspect'
 const workspace=relatedWorkspace(slot)
 return <section className="exo-clo-tool-card" data-dimension={dimension}
   role="region" aria-label={`${slot.label} tool information`} data-clo-detail={`${dimension}:${slot.id}`}
   onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();onClose?.()}}}>
   <header>
     <span> CLO 7 TOOL · {dimension.toUpperCase()} {slot.id}</span>
     <button ref={closeRef} type="button" aria-label="Close tool information" onClick={onClose}><X size={17}/></button>
   </header>
   <div className="exo-clo-tool-identification"><span className="exo-clo-tool-icon"><CadToolIcon id={slot.icon} size={30}/></span><strong className="exo-clo-tool-name">{slot.label}</strong></div>
   <div className="exo-clo-tool-state">
     {isNative?<CheckCircle2 size={14}/>:isInspect?<Info size={14}/>:<Wrench size={14}/>}
     <span>{isNative?(pendingRun?'Ready to run EXO command':'EXO native tool selected'):isInspect?'Existing EXO inspection workflow':'Requires additional native implementation'}</span>
   </div>
   <p>{reason||'This CLO command has not yet been implemented in EXO. Its reference position is preserved for future native functionality.'}</p>
   {isNative&&<small className="exo-clo-tool-boundary">{pendingRun?'Press Run to execute this garment operation once. Native Undo is available where supported.':'The EXO tool is selected. Continue in the garment view or its native controls; you can undo authored geometry when supported.'}</small>}
   {isNative&&pendingRun&&<button type="button" className="exo-clo-tool-run" onClick={onRun}>
     Run {slot.label}
   </button>}
   {draftAvailable&&<button type="button" className="exo-clo-tool-run"
     data-exo-draft-hardware="true" onClick={()=>onCreateDraft?.(slot)}>
     Add EXO draft construction (saved, undoable)
   </button>}
   {alternative&&<button type="button" className="exo-clo-tool-alternative" onClick={()=>onTryAlternative?.(alternative)}>
     <CadToolIcon id={alternative.slot.icon} size={18}/><span>Use EXO: {alternative.label}</span><ExternalLink size={13}/>
   </button>}
   <button type="button" className="exo-clo-tool-workspace" onClick={()=>onNavigate(workspace)}>
     Open EXO {workspace} workspace <ExternalLink size={13}/>
   </button>
   {!isNative&&<small className="exo-clo-tool-boundary">Opening the related EXO workspace does not claim to execute CLO's original operation. Geometry or physics features will only be enabled when backed by a tested native command.</small>}
 </section>
}
