import React, { useEffect, useMemo, useState } from 'react'
import { authorIndustrialAllowanceGraph, reapplyIndustrialAllowanceGraph } from '../core/industrialAllowanceGraph20261027.js'

/** Legacy 2D only. A partial-size link cannot be serialized to the legacy project. */
export function allowanceLinkEditorPreflight(project, { nativeMode = false, disabled = false, sourcePieceId, sourceEdge, targetPieceId, targetEdge, sizes } = {}) {
  if (nativeMode) return 'Native Rust garment does not support linked allowance authoring.'
  if (disabled) return 'The editor is currently disabled.'
  if (!project || !Number.isSafeInteger(project.revision)) return 'A revisioned legacy project is required.'
  if (project.industrialAllowanceGraph) return 'A persistent seam-value graph already exists. Use Reapply stored link graph after editing source allowances.'
  const inventory = project?.grading?.sizes
  if (!Array.isArray(inventory) || !inventory.length || !inventory.includes(project.grading.baseSize) || new Set(inventory).size !== inventory.length)
    return 'A valid graded size inventory is required.'
  if (!Array.isArray(sizes) || sizes.length !== inventory.length || inventory.some(size => !sizes.includes(size)))
    return 'Select every graded size to apply. Size-specific allowance exports are not implemented.'
  const pieces = project.pieces || []
  const source = pieces.find(p => p.id === sourcePieceId)
  const target = pieces.find(p => p.id === targetPieceId)
  if (!source || !target || !Number.isInteger(sourceEdge) || !Number.isInteger(targetEdge) ||
      sourceEdge < 0 || targetEdge < 0 || sourceEdge >= source.points?.length || targetEdge >= target.points?.length)
    return 'Select two existing pattern edges.'
  if (source.id === target.id && sourceEdge === targetEdge) return 'An edge cannot link to itself.'
  return ''
}

export default function IndustrialAllowanceLinkEditor20261027({ project, onApplyProject, nativeMode = false, disabled = false }) {
  const pieces = Array.isArray(project?.pieces) ? project.pieces : []
  const sizes = Array.isArray(project?.grading?.sizes) ? project.grading.sizes : []
  const [sourcePieceId, setSourcePieceId] = useState('')
  const [targetPieceId, setTargetPieceId] = useState('')
  const [sourceEdge, setSourceEdge] = useState(0)
  const [targetEdge, setTargetEdge] = useState(0)
  const [selectedSizes, setSelectedSizes] = useState([])
  const [notice, setNotice] = useState('')
  useEffect(() => {
    setSourcePieceId(pieces[0]?.id || '')
    setTargetPieceId(pieces[1]?.id || pieces[0]?.id || '')
    setSourceEdge(0)
    setTargetEdge(0)
    setSelectedSizes([...sizes])
    setNotice('')
  }, [project?.revision, project?.grading, project?.pieces])
  const source = pieces.find(p => p.id === sourcePieceId)
  const target = pieces.find(p => p.id === targetPieceId)
  const reason = allowanceLinkEditorPreflight(project, { nativeMode, disabled, sourcePieceId, sourceEdge, targetPieceId, targetEdge, sizes: selectedSizes })
  const options = useMemo(() => pieces.filter(p => typeof p.id === 'string' && p.id).map(p => ({ id: p.id, label: p.name || p.id })), [project?.pieces])
  const selection = (value, setter) => { setter(value); setNotice('') }
  const apply = () => {
    const latestReason = allowanceLinkEditorPreflight(project, { nativeMode, disabled, sourcePieceId, sourceEdge, targetPieceId, targetEdge, sizes: selectedSizes })
    if (latestReason || typeof onApplyProject !== 'function') { setNotice(latestReason || 'Project apply callback is required.'); return }
    try {
      const link = { source: { pieceId: sourcePieceId, edgeIndex: sourceEdge, pointCount: source.points.length },
        target: { pieceId: targetPieceId, edgeIndex: targetEdge, pointCount: target.points.length }, sizes: [...selectedSizes] }
      const result = authorIndustrialAllowanceGraph(project, [link], { expectedRevision: project.revision })
      // Graph authoring has already verified the complete size run. It returns
      // {project,applied,factoryCertified}; sizeEdgeAllowances is an internal
      // resolver handoff and is NOT part of this API.
      if (!result.project?.industrialAllowanceGraph ||
          result.project.industrialAllowanceGraph.links.length !== 1 ||
          result.factoryCertified !== false)
        throw Error('The persistent allowance graph was not committed safely.')
      onApplyProject(result.project, `Saved one persistent seam-value link from ${source.name || source.id} edge ${sourceEdge + 1} to ${target.name || target.id} edge ${targetEdge + 1} across ${sizes.length} sizes. Guarded legacy source edits automatically regenerate linked targets.`)
      setNotice('Persistent allowance link saved. Normal legacy source allowance edits regenerate linked targets atomically; unsupported or stale edits are refused.')
    } catch (error) { setNotice(`Unable to apply: ${error.message}`) }
  }
  const reapply = () => {
    if(nativeMode || disabled || typeof onApplyProject!=='function' || !project?.industrialAllowanceGraph) return
    try {
      const result=reapplyIndustrialAllowanceGraph(project,{expectedRevision:project.revision})
      onApplyProject(result.project,`Recomputed ${result.applied} source-linked seam allowance value(s). Revalidate every graded CUT boundary before production.`)
      setNotice('Recomputed stored linked seam allowances with one legacy Undo snapshot. No factory certification granted.')
    }catch(error){setNotice(`Unable to regenerate saved seam-value links: ${error.message}`)}
  }
  return <section aria-label="Industrial seam allowance link editor" style={{display:'grid',gap:8}}>
    <h3>Linked seam allowances · Legacy 2D</h3>
    <p>Persist one source-edge dependency on a target edge across the full legacy size run. Units: cm. Valid source allowance edits through EXO's legacy project transaction automatically regenerate linked targets with Undo. The manual reapply action remains available for verified recovery and review.</p>
    <fieldset disabled={nativeMode || disabled || !pieces.length} style={{display:'grid',gap:8}}>
      <legend>Source edge</legend>
      <label>Pattern piece <select aria-label="Source pattern piece" value={sourcePieceId} onChange={e => { selection(e.target.value,setSourcePieceId);setSourceEdge(0) }}>
        <option value="">Choose piece</option>{options.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
      </select></label>
      <label>Edge <select aria-label="Source edge" value={sourceEdge} onChange={e => selection(Number(e.target.value),setSourceEdge)}>
        {(source?.points || []).map((_,i) => <option key={i} value={i}>Edge {i + 1}</option>)}
      </select></label>
      <legend>Target edge</legend>
      <label>Pattern piece <select aria-label="Target pattern piece" value={targetPieceId} onChange={e => { selection(e.target.value,setTargetPieceId);setTargetEdge(0) }}>
        <option value="">Choose piece</option>{options.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
      </select></label>
      <label>Edge <select aria-label="Target edge" value={targetEdge} onChange={e => selection(Number(e.target.value),setTargetEdge)}>
        {(target?.points || []).map((_,i) => <option key={i} value={i}>Edge {i + 1}</option>)}
      </select></label>
      <fieldset><legend>Apply to sizes</legend>{sizes.map(size => <label key={size} style={{marginRight:12}}><input type="checkbox" checked={selectedSizes.includes(size)} onChange={e => selection(e.target.checked ? [...selectedSizes,size] : selectedSizes.filter(s => s !== size),setSelectedSizes)} />{size}</label>)}</fieldset>
    </fieldset>
    {(reason || notice) && <p role="status">{reason || notice}</p>}
    <button type="button" onClick={apply} disabled={Boolean(reason) || typeof onApplyProject !== 'function'}>Save persistent allowance link in project</button>
    {project?.industrialAllowanceGraph && <button type="button" onClick={reapply}
      disabled={nativeMode||disabled||typeof onApplyProject!=='function'}>
      Reapply stored link graph to updated source allowances
    </button>}
  </section>
}
