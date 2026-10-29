import React, { useMemo, useState } from 'react'
import NativeSixSizeRegeneration20261027 from './NativeSixSizeRegeneration20261027.jsx'

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const direct = value => typeof value === 'number' && Number.isFinite(value) ? value : value && typeof value === 'object' && !('formula' in value) && Number.isFinite(value.valueMm) ? value.valueMm : null
const mm = value => Number.isFinite(value) ? `${value.toFixed(2)} mm` : 'Unavailable'
const coordinate = point => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite) ? `${mm(point[0] * 1000)} X / ${mm(point[1] * 1000)} Y` : 'Unavailable'
const safeArray = value => Array.isArray(value) ? value : []

/** Present only actual persisted native bindings and graded source evidence. */
export function modarisDependencyStudioView20261027(snapshot) {
  const graph = snapshot?.nativePointBindings
  const panels = safeArray(snapshot?.template?.panels)
  const panelMap = new Map(panels.filter(panel => typeof panel?.id === 'string').map(panel => [panel.id, panel]))
  const bindings = safeArray(graph?.bindings)
  const bindingIds = new Set(bindings.map(binding => binding?.id))
  const measurements = graph?.measurements && typeof graph.measurements === 'object' && !Array.isArray(graph.measurements) ? graph.measurements : {}
  const rows = bindings.map(binding => {
    const panel = panelMap.get(binding?.panelId)
    const points = safeArray(panel?.polygon?.points)
    const pointIndex = binding?.pointIndex
    const anchored = Number.isSafeInteger(pointIndex) && pointIndex >= 0 && pointIndex < points.length
    const refs = safeArray(binding?.dependsOn)
    const validRefs = refs.every(id => bindingIds.has(id) && id !== binding?.id)
    return {
      id: String(binding?.id ?? ''), panelId: String(binding?.panelId ?? ''),
      panelName: String(panel?.name ?? panel?.id ?? binding?.panelId ?? 'Unknown panel'),
      pointIndex, coordinate: anchored ? coordinate(points[pointIndex]) : 'Unavailable',
      mode: String(binding?.mode ?? 'Unknown'), formula: String(binding?.distanceFormula ?? ''),
      anchorA: binding?.a, anchorB: binding?.b, dependsOn: refs,
      valid: Boolean(graph?.active === true && graph.version === 1 && panel && anchored && validRefs && typeof binding?.id === 'string' && binding.id.length),
    }
  })
  const sourceValid = Number.isSafeInteger(snapshot?.revision) && snapshot.revision >= 0 && graph?.active === true && graph?.version === 1 && rows.length > 0 && rows.every(row => row.valid) && new Set(rows.map(row => row.id)).size === rows.length
  const grade = snapshot?.project?.grade_run ?? snapshot?.project?.gradeRun ?? snapshot?.grade_run ?? snapshot?.gradeRun ?? null
  const gradeSaved = snapshot?.gradeRunPersisted === true || snapshot?.hasSavedGradeCatalog === true || Boolean(grade)
  return { revision: snapshot?.revision, sourceValid, gradeSaved, rows, measurements, panelCount: panelMap.size, activeSize: snapshot?.activeGradedSize ?? snapshot?.active_grade_size ?? null }
}

/**
 * Props: snapshot (native Rust project snapshot), disabled (optional),
 * onPreview({overrides,sourceRevision}) -> native reactive six-size report,
 * onCommit(same request) -> updated nativeSnapshot with regenerationEvidence.
 * NativeSixSizeRegeneration performs source/revision/report and commit guards.
 */
export default function ModarisDependencyStudio20261027({ snapshot, disabled = false, onPreview, onCommit }) {
  const view = useMemo(() => modarisDependencyStudioView20261027(snapshot), [snapshot])
  const [selectedPanel, setSelectedPanel] = useState('all')
  const rows = view.rows.filter(row => selectedPanel === 'all' || row.panelId === selectedPanel)
  const panelChoices = [...new Set(view.rows.map(row => row.panelId))]
  return <section aria-label="Modaris measurement grading dependency studio" data-modaris-dependency-studio="20261027">
    <h3>Measurement, grading and dependency studio</h3>
    <p>Native revision {Number.isSafeInteger(view.revision) ? view.revision : 'unavailable'} · Saved point graph: {view.sourceValid ? 'source linked' : 'unverified or stale'} · Grade catalog: {view.gradeSaved ? 'saved' : 'unavailable'} · Active size: {view.activeSize || 'base'}</p>
    <p role="status">{view.sourceValid ? `${view.rows.length} native point bindings across ${new Set(view.rows.map(row => row.panelId)).size} panel(s) are linked to the current source.` : 'The current source does not prove a complete active native binding graph. Refresh or reauthor the native bindings before editing.'}</p>
    <div aria-label="Saved native measurements">
      <h4>Measurement chart</h4>
      <table><thead><tr><th>Measurement</th><th>Saved value / expression</th><th>Kind</th></tr></thead><tbody>
        {Object.entries(view.measurements).map(([name, value]) => <tr key={name}><th scope="row">{name}</th><td>{direct(value) !== null ? mm(direct(value)) : typeof value?.formula === 'string' ? value.formula : 'Unsupported value'}</td><td>{direct(value) !== null ? 'Direct' : typeof value?.formula === 'string' ? 'Derived / read only' : 'Unsupported'}</td></tr>)}
        {!Object.keys(view.measurements).length && <tr><td colSpan={3}>No persisted native measurement chart.</td></tr>}
      </tbody></table>
    </div>
    <div aria-label="Native point dependency table">
      <h4>Panel and construction-point dependencies</h4>
      <label>Filter panel <select value={panelChoices.includes(selectedPanel) ? selectedPanel : 'all'} onChange={event => setSelectedPanel(event.target.value)}><option value="all">All linked panels</option>{panelChoices.map(id => <option key={id} value={id}>{id}</option>)}</select></label>
      <table><thead><tr><th>Binding</th><th>Panel · target</th><th>Saved point</th><th>Rule / anchors</th><th>Dependencies</th><th>Source link</th></tr></thead><tbody>
        {rows.map((row, index) => <tr key={`${row.id}-${index}`}><th scope="row">{row.id}</th><td>{row.panelName} ({row.panelId}) · {Number.isSafeInteger(row.pointIndex) ? `P${row.pointIndex + 1}` : 'Unknown point'}</td><td>{row.coordinate}</td><td>{row.mode} · {row.formula || 'No formula'} · anchors {row.anchorA ?? '?'} / {row.anchorB ?? '?'}</td><td>{row.dependsOn.length ? row.dependsOn.join(' → ') : 'Source anchors'}</td><td>{row.valid ? 'Linked' : 'Invalid / stale'}</td></tr>)}
        {!rows.length && <tr><td colSpan={6}>No persisted native point bindings.</td></tr>}
      </tbody></table>
    </div>
    <div aria-label="Six-size grading evidence"><h4>Grading matrix · XS–XXL</h4>
      <table><thead><tr><th>Native grade source</th>{SIZES.map(size => <th key={size}>{size}</th>)}</tr></thead><tbody><tr><th scope="row">Persisted catalog</th>{SIZES.map(size => <td key={size}>{view.gradeSaved ? 'Catalog saved; inspect native preview for point values' : 'Unavailable'}</td>)}</tr></tbody></table>
      <p>Per-size point coordinates are displayed only after the native regeneration preview supplies verified geometry. A saved catalog flag alone does not establish industrial or factory approval.</p>
    </div>
    <NativeSixSizeRegeneration20261027 snapshot={snapshot} disabled={disabled || !view.sourceValid} onPreview={onPreview} onCommit={onCommit}/>
  </section>
}
