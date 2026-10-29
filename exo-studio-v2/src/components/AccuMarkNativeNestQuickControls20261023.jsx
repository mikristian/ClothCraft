import React from 'react'
import './AccuMarkNativeNestQuickControls20261023.css'

/** Visible over the real native 2D pattern board even when the grading
 * dialog is closed. Read-only affine proposal, never a saved vendor grade set. */
export default function AccuMarkNativeNestQuickControls20261023({
  enabled=false,onToggle,showPoints=true,onTogglePoints,
  showSizes=true,onToggleSizes,showVectors=false,onToggleVectors,
  panelCount=0,unavailable='',onOpen,
}){
 return <div className="exo-native-grade-quick" role="group" aria-label="Native multi-block size nest controls" data-native-size-nest-quick="true">
   <button type="button" aria-pressed={enabled} onClick={()=>onToggle?.(!enabled)}
     aria-label="Toggle XS through XXL grade nest on all native pattern blocks">{enabled?'NEST ON':'NEST XS–XXL'}</button>
   {enabled&&<>
     <button type="button" aria-pressed={showPoints} onClick={()=>onTogglePoints?.(!showPoints)}>POINTS</button>
     <button type="button" aria-pressed={showSizes} onClick={()=>onToggleSizes?.(!showSizes)}>SIZES</button>
     <button type="button" aria-pressed={showVectors} onClick={()=>onToggleVectors?.(!showVectors)}>VECTORS</button>
     <button type="button" onClick={onOpen}>GRADE…</button>
   </>}
   {enabled&&<span title="Each size is an uncommitted Rust-affine-derived proposal; factory rules are not defined">
     {unavailable?unavailable:`${panelCount} BLOCK${panelCount===1?'':'S'} · PROPOSAL`}
   </span>}
 </div>
}
