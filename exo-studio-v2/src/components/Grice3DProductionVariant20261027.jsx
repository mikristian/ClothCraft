import React, { useEffect, useMemo, useState } from 'react'
import { buildGriceVariantReadiness20261027 } from '../core/grice3DProductionVariant20261027.js'

const panelRows = snapshot => Array.isArray(snapshot?.template?.panels)
  ? snapshot.template.panels.map(panel => ({
      panelId:panel.id, fabricId:panel.fabric, quantity:1,
      production:true, sendTo3D:true,
      ...(snapshot?.pieceVariant?.persisted
        ? snapshot.pieceVariant.definition?.pieces?.find(item=>item.panelId===panel.id)||{}
        :{}),
    })) : []

/** Reviewed export only; Rust's scene and saved garment remain authoritative. */
export default function Grice3DProductionVariant20261027({
  snapshot,disabled=false,onStore,onClear,onInstancePreview,onInstanceActivate,onInstanceRestore,
}){
  const signature=JSON.stringify({
    revision:snapshot?.revision,
    panels:snapshot?.template?.panels?.map(panel=>[panel.id,panel.fabric]),
  })
  const [pieces,setPieces]=useState(()=>panelRows(snapshot))
  const [saving,setSaving]=useState(false)
  const [feedback,setFeedback]=useState('')
  const [instanceProof,setInstanceProof]=useState(null)
  useEffect(()=>setPieces(panelRows(snapshot)),[signature])
  useEffect(()=>setInstanceProof(null),[snapshot?.revision])
  const definition=useMemo(()=>({
    version:1,sourceRevision:snapshot?.revision,pieces,
  }),[snapshot?.revision,pieces])
  const review=useMemo(()=>buildGriceVariantReadiness20261027(snapshot,definition),
    [snapshot,definition])
  const patchRow=(id,field,value)=>setPieces(current=>current.map(row=>{
    if(row.panelId!==id)return row
    if(field==='substitutePanelId'&&!value){
      const {substitutePanelId:unused,...withoutSubstitute}=row
      return withoutSubstitute
    }
    return {...row,[field]:value}
  }))
  const persist=async()=>{
    if(!onStore||saving||disabled||!review.ok)return
    setSaving(true);setFeedback('')
    try{
      if(pieces.some(item=>item.substitutePanelId))
        throw Error('3D substitute geometry is not yet implemented in the native Rust variant schema. Clear substitute selections before saving.')
      const result=await onStore(definition)
      if(result?.pieceVariant?.persisted!==true)
        throw Error('Rust did not confirm persistence of this article variant.')
      setFeedback('Saved production/3D variant in the native fitting project. Check single/paired instance and sewing limitations before simulation.')
    }catch(error){setFeedback(error?.message||String(error))}
    finally{setSaving(false)}
  }
  const clear=async()=>{
    if(!onClear||saving||disabled||!snapshot?.pieceVariant?.persisted)return
    setSaving(true);setFeedback('')
    try{
      const result=await onClear()
      if(result?.pieceVariant?.persisted)throw Error('Native article variant was not cleared.')
      setFeedback('Saved article variant cleared; the authored garment remains unchanged.')
    }catch(error){setFeedback(error?.message||String(error))}
    finally{setSaving(false)}
  }
  const exportDraft=()=>{
    if(disabled||!review?.ok||!Number.isSafeInteger(snapshot?.revision))return
    const data=JSON.stringify({
      format:'exo-grice-reviewed-variant-draft.v1',
      sourceRevision:snapshot.revision,definition,
      inspection:{readyFor3D:review.readyFor3D,
        warnings:review.warnings,manufacturerApproved:false},
      nativePersisted:false,productionAuthorized:false,
    },null,2)
    const blob=new Blob([data],{type:'application/json'})
    const url=URL.createObjectURL(blob)
    try{
      const a=document.createElement('a')
      a.href=url;a.download='exo-2d-3d-variant-draft.json'
      document.body.append(a);a.click();a.remove()
    }finally{URL.revokeObjectURL(url)}
  }
  const previewInstances=async()=>{
    if(disabled||saving||!snapshot?.pieceVariant?.persisted||!onInstancePreview)return
    setSaving(true);setFeedback('');setInstanceProof(null)
    try{
      const report=await onInstancePreview(snapshot.revision)
      if(report?.sourceRevision!==snapshot.revision||
        !Number.isSafeInteger(report.actualCompiledPanelCount)||
        !Number.isSafeInteger(report.actualCompiledTriangleCount)||
        report.factoryApproved!==false&&report.manufacturingApproved!==false)
        throw Error('Rust did not return complete source-revision-matched physical instance evidence.')
      setInstanceProof(report)
      setFeedback('Rust assembled a disposable physical instance proposal. Review the real mesh counts before activating 3D.')
    }catch(error){setFeedback(error?.message||String(error))}
    finally{setSaving(false)}
  }
  const activateInstances=async()=>{
    if(disabled||saving||!onInstanceActivate||instanceProof?.sourceRevision!==snapshot?.revision)return
    setSaving(true);setFeedback('')
    try{
      const report=await onInstanceActivate(snapshot.revision)
      if(report?.variantAssemblyActive!==true)throw Error('Native Rust did not activate the physical 3D article scene.')
      setFeedback('Temporary 3D article instances activated. The saved production source remains unchanged.')
    }catch(error){setFeedback(error?.message||String(error))}
    finally{setSaving(false)}
  }
  const restoreInstances=async()=>{
    if(disabled||saving||!onInstanceRestore||!snapshot?.variantAssemblyActive)return
    setSaving(true);setFeedback('')
    try{
      const restored=await onInstanceRestore(snapshot.revision)
      if(restored?.variantAssemblyActive)throw Error('Native Rust did not restore the authoritative base scene.')
      setFeedback('Original authored garment mesh and native source restored.')
    }catch(error){setFeedback(error?.message||String(error))}
    finally{setSaving(false)}
  }
  if(snapshot?.variantAssemblyActive)return <section aria-label="Active physical 3D article instances" data-native-variant-assembly="active">
    <h3>Temporary native 3D article instances</h3>
    <p>This view contains actual compiled material meshes, including any qualified
      unsewn second piece. It does not demonstrate mirrored construction, paired
      sewing, virtual fit or factory approval.</p>
    <p>Physical panels: {snapshot.panels?.length||0}; triangles: {snapshot.triangles?.length||0}.</p>
    <button type="button" disabled={disabled||saving||!onInstanceRestore}
      onClick={restoreInstances}>Restore original authored garment</button>
    {feedback&&<p role="status">{feedback}</p>}
  </section>
  return <section aria-label="Grice 2D production versus 3D piece variant" data-grice-variant-draft="true">
    <h3>Production / 3D piece variant</h3>
    <p>Review which authored source pieces belong to production and to a virtual assembly.
      Grice, <em>Digital Pattern Cutting for Fashion with Lectra Modaris</em>,
      printed pp. 57–61, 73–90, and 130–131.
      The article selection can now be saved in the native EXO fitting project.
      It does not create mirrored panels, 3D substitute geometry, stitch remapping,
      or a licensed Modaris variant interchange file.</p>
    <p>Native source revision: {Number.isSafeInteger(snapshot?.revision)?snapshot.revision:'unavailable'} ·
      <strong> {review.readyFor3D?'Qualified draft passes':'Assembly review required'}</strong> ·
      No manufacturing approval.</p>
    <p role="status" data-native-piece-variant-status={snapshot?.pieceVariant?.persisted?'saved':'draft'}>
      {snapshot?.pieceVariant?.persisted
        ?'Rust-persisted production/3D source selection; reversible with native Undo.'
        :'Unsaved production/3D source selection.'}
      {snapshot?.pieceVariant?.review?.readyFor3D===false
        ?' Saved variant requires instance or sewing review before 3D assembly.':''}
    </p>
    <div style={{overflowX:'auto'}}>
      <table aria-label="Source-authentic production and 3D variant pieces">
        <thead><tr><th>Native pattern</th><th>Source fabric</th><th>Quantity</th>
          <th>Production</th><th>Send to 3D</th><th>3D substitute</th><th>Compiled evidence</th></tr></thead>
        <tbody>{pieces.map(row=>{
          const proof=review.pieceRows.find(p=>p.panelId===row.panelId)
          return <tr key={row.panelId}>
            <th>{snapshot?.template?.panels?.find(p=>p.id===row.panelId)?.name||row.panelId}</th>
            <td>{row.fabricId}</td>
            <td><select aria-label={row.panelId+' cut quantity'} disabled={disabled}
              value={row.quantity} onChange={e=>patchRow(row.panelId,'quantity',Number(e.target.value))}>
              <option value={1}>Single</option><option value={2}>Pair</option>
            </select></td>
            <td><input aria-label={row.panelId+' production'} type="checkbox"
              checked={row.production} disabled={disabled}
              onChange={e=>patchRow(row.panelId,'production',e.target.checked)}/></td>
            <td><input aria-label={row.panelId+' send to 3D'} type="checkbox"
              checked={row.sendTo3D} disabled={disabled}
              onChange={e=>patchRow(row.panelId,'sendTo3D',e.target.checked)}/></td>
            <td><select aria-label={row.panelId+' 3D substitute'} value={row.substitutePanelId||''}
              disabled={disabled||row.sendTo3D}
              onChange={e=>patchRow(row.panelId,'substitutePanelId',e.target.value)}>
              <option value="">None</option>
              {pieces.filter(p=>p.panelId!==row.panelId).map(other=>
                <option value={other.panelId} key={other.panelId}>
                  {snapshot?.template?.panels?.find(p=>p.id===other.panelId)?.name||other.panelId}
                </option>)}
            </select></td>
            <td>{proof?.compiledFor3D?'Compiled panel':'No compiled panel'}
              {proof?.requiresPairReview?' · pair not proven':''}</td>
          </tr>
        })}</tbody>
      </table>
    </div>
    {review.blockers.length>0&&<><strong>Blocking variant issues</strong>
      <ul>{review.blockers.map((issue,i)=><li key={i}>{issue}</li>)}</ul></>}
    {review.warnings.length>0&&<><strong>Human-review requirements</strong>
      <ul>{review.warnings.map((warning,i)=><li key={i}>{warning}</li>)}</ul></>}
    <button type="button" disabled={disabled||saving||!onStore||!review.ok||
      !pieces.some(p=>p.production)||pieces.some(p=>p.substitutePanelId)}
      onClick={persist}>Save variant to native EXO project</button>
    <button type="button" disabled={disabled||saving||!onClear||!snapshot?.pieceVariant?.persisted}
      onClick={clear}>Clear saved variant</button>
    <button type="button" disabled={disabled||saving||!review.ok} onClick={exportDraft}>
      Export source-verified 2D / 3D variant draft JSON
    </button>
    <div data-native-physical-variant-preview="true">
      <strong>Native physical 3D article preview</strong>
      <p>After saving a production/3D selection, Rust can compile independent
        second cloth instances for unsewn pieces only. Sewn pairs require
        additional seam/notch remapping and are deliberately refused.
        Extra pieces are translated, not geometrically mirrored.</p>
      <button type="button" disabled={disabled||saving||!onInstancePreview||!snapshot?.pieceVariant?.persisted}
        onClick={previewInstances}>Inspect physical 3D instances</button>
      {instanceProof?.sourceRevision===snapshot?.revision&&<>
        <p role="status">Real Rust mesh: {instanceProof.actualCompiledPanelCount} panels,
          {instanceProof.actualCompiledVertexCount} vertices and
          {instanceProof.actualCompiledTriangleCount} triangles.
          Factory approval: no.</p>
        <button type="button" disabled={disabled||saving||!onInstanceActivate}
          onClick={activateInstances}>Activate temporary 3D article scene</button>
      </>}
    </div>
    {feedback&&<p role="status">{feedback}</p>}
    <p>Native persistence stores the article-selection intent only. The draft
      export is not a factory cutting specification; physical paired instances,
      substitute piece geometry and Modaris interchange remain unimplemented.</p>
  </section>
}
