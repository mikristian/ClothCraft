import React from 'react'
import './NativePatternAuditPanel.css'

// Strictly a native rest-space drafting inspection, not a factory approval.
// Drawn independently of the garment mesh, and never edits pattern state.
export default function NativePatternAuditPanel({audit,revision,onClose,onRefresh,onGenerateCutlines,onDownloadCutline,cutlines=null,disabled=false}) {
 if (!audit) return null
 const stale=revision!==audit.revision
 const mm=value=>Number.isFinite(value)?`${value.toFixed(2)} mm`:'—'
 return <aside className="exo-native-pattern-audit" aria-label="Rust pattern engineering audit" data-testid="native-pattern-audit">
  <header><strong>Rust Pattern QA</strong><span>Revision {audit.revision}{stale?' · Out of date':''}</span><button type="button" aria-label="Close pattern QA" onClick={onClose}>×</button></header>
  <p>{audit.editablePanelCount} editable panels · {audit.seams.length} sewing pairs · metric geometry.</p>
  {stale&&<p role="status">Pattern changed. Refresh to measure the current revision.</p>}
  <div className="exo-pattern-audit-scroll">
   {audit.panels.map(panel=><section key={panel.panelId}>
    <strong>{panel.name}</strong>
    {panel.editable?<><div>{mm(panel.widthMm)} × {mm(panel.heightMm)} · {panel.edgeCount} edges · {panel.notchCount} notches</div>
      <div>Allowance assigned: {panel.allowanceEdgeCount}/{panel.edgeCount} edges · {panel.curveCount} Bézier edges</div>
      <details><summary>Measured stitching edges</summary>
       <ul>{panel.edges.map(edge=><li key={edge.edgeId}>{edge.edgeId}: {mm(edge.lengthMm)}{edge.curve?' (curve)':''}{edge.targetMm!=null?` · target ${mm(edge.targetMm)}`:''}</li>)}</ul>
      </details></>:<div>Not an editable source polygon.</div>}
   </section>)}
   {audit.seams.length>0&&<section><strong>Seam length comparisons</strong><ul>{audit.seams.map(seam=><li key={seam.seamId}>{seam.seamId}: {mm(seam.firstLengthMm)} / {mm(seam.secondLengthMm)} · mismatch {mm(seam.mismatchMm)}</li>)}</ul></section>}
   {audit.warnings.length>0&&<section><strong>Construction warnings</strong><ul>{audit.warnings.map((warning,index)=><li key={index}>{warning}</li>)}</ul></section>}
   {cutlines&&<section data-testid="native-cutline-proof"><strong>Rust closed cutline proof · {cutlines.generatedCount} generated / {cutlines.blockedCount} blocked</strong>
    {cutlines.revision!==revision&&<p role="status">Outdated cutting geometry; refresh before downloading.</p>}
    <ul>{cutlines.panels.map(panel=><li key={panel.panelId}>
      <strong>{panel.name}</strong>: {panel.ok?
        <>{panel.pointCount} vertices · {mm(panel.perimeterMm)} perimeter · {Number(panel.areaMm2).toFixed(0)} mm² · {panel.notchMarkCount||0} projected notch marks · {panel.pomMarksMm?.length||0} physical POMs · {panel.stitchLayer?'separate stitch contour':'no stitch contour'}
         <button type="button" disabled={disabled||cutlines.revision!==revision||!panel.svg} onClick={()=>onDownloadCutline(panel,'svg')} aria-label={`Download ${panel.name} Rust engineering SVG`}>Download metric SVG proof</button>
         {['A4','Letter'].map(format=><button key={format} type="button" disabled={disabled||cutlines.revision!==revision||!panel.svg} onClick={()=>onDownloadCutline(panel,format)} aria-label={`Print ${panel.name} cutline on ${format}`}>Tiled {format} cutline proof</button>)}
         <button type="button" disabled={disabled||cutlines.revision!==revision||!panel.dxf} onClick={()=>onDownloadCutline(panel,'dxf')} aria-label={`Download ${panel.name} Rust engineering DXF`}>Download metric DXF proof</button></>:
        <>Blocked: {panel.error}</>}
    </li>)}</ul>
    <small>Engineering proofs include independent cut and stitch geometry, metric notch marks, piece labels and saved POM annotations where supported. DXF is generic R2000, not graded AAMA/ASTM. Missing allowances, holes, internal lines, unsafe joins or ambiguous notches block output. Factory cutter import and physical plotting accuracy still require validation.</small>
   </section>}
   <section><strong>Factory release blocked</strong><ul>{audit.releaseBlockers.map((blocker,index)=><li key={index}>{blocker}</li>)}</ul><small>No manufacturer approval or validated offset cutline is implied by this analysis.</small></section>
  </div>
  <footer><button disabled={disabled} type="button" onClick={onGenerateCutlines}>Generate Rust cutline proofs</button><button disabled={disabled} type="button" onClick={onRefresh}>Refresh measurements</button></footer>
 </aside>
}
