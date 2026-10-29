import React, { useEffect, useRef, useState } from 'react'
import {validateSixSizeRegenerationPreview20261027} from '../core/nativeSixSizePreviewValidator20261028.js'
export {validateSixSizeRegenerationPreview20261027} from '../core/nativeSixSizePreviewValidator20261028.js'

const SIZE_NAMES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/
const finite = value => typeof value === 'number' && Number.isFinite(value)
const direct = value => finite(value) ? value : value && typeof value === 'object' && !Object.hasOwn(value, 'formula') && finite(value.valueMm) ? value.valueMm : null
const asCount = value => Number.isSafeInteger(value) && value >= 0 ? value : null
const position = value => Array.isArray(value) && value.length === 2 && value.every(finite)
const directOverrides = value => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0 && Object.keys(value).length <= 64 && Object.entries(value).every(([key, mm]) => /^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(key) && finite(mm) && Math.abs(mm) <= 5000)

export function nativeSixSizeRegenerationPreflight20261027(snapshot, disabled = false) {
  if (disabled) return 'Native workspace is busy.'
  if (!Number.isSafeInteger(snapshot?.revision) || snapshot.revision < 0) return 'A current native revision is required.'
  if (snapshot.activeGradedSize || snapshot.active_grade_size) return 'Restore the base garment before changing the six-size catalog.'
  if (!(snapshot.gradeRunPersisted === true || snapshot.hasSavedGradeCatalog === true || snapshot.project?.grade_run || snapshot.project?.gradeRun)) return 'Save a native six-size grade catalog first.'
  if (snapshot.nativePointBindings?.active !== true || snapshot.nativePointBindings?.version !== 1 || !Array.isArray(snapshot.nativePointBindings?.bindings) || snapshot.nativePointBindings.bindings.length === 0) return 'Save an active native measurement binding graph first.'
  if (new Set(snapshot.nativePointBindings.bindings.map(binding => binding.panelId)).size < 2) return 'At least two bound source panels are required for six-size regeneration.'
  if (!Object.entries(snapshot.nativePointBindings.measurements || {}).some(([, value]) => direct(value) !== null)) return 'No saved direct scalar measurements are available.'
  return ''
}

const display = value => finite(value) ? `${value.toFixed(3)} mm` : value === null || value === undefined ? '—' : String(value)
const displayPosition = value => position(value) ? `(${value[0].toFixed(3)}, ${value[1].toFixed(3)}) mm` : 'Not measured'

export default function NativeSixSizeRegeneration20261027({ snapshot, disabled = false, onPreview, onCommit }) {
  const [name, setName] = useState('')
  const [input, setInput] = useState('')
  const [staged, setStaged] = useState(null)
  const [preview, setPreview] = useState(null)
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const generation = useRef(0)
  const latestSignature = useRef('')
  const revision = snapshot?.revision
  const graph = snapshot?.nativePointBindings
  const measurements = Object.entries(graph?.measurements || {}).filter(([, value]) => direct(value) !== null)
  const signature = JSON.stringify({ revision, template: snapshot?.template, graph, grade: snapshot?.gradeRunPersisted, active: snapshot?.activeGradedSize ?? snapshot?.active_grade_size })
  latestSignature.current = signature
  useEffect(() => { generation.current += 1; setPreview(null); setConfirmed(false); setBusy(false); setStaged(null) }, [signature])
  const blocker = nativeSixSizeRegenerationPreflight20261027(snapshot, disabled || busy)
  const proposalStale = Boolean(preview && preview.signature !== signature)
  const stagedOverrides = staged?.signature === signature ? staged.values : {}
  const validInput = name && decimal.test(input.trim()) && finite(Number(input)) && Math.abs(Number(input)) <= 5000 && Number(input) !== direct(graph?.measurements?.[name])
  const canStage = !blocker && validInput && !busy && Object.keys(stagedOverrides).length < 64
  const canPreview = !blocker && typeof onPreview === 'function' && directOverrides(stagedOverrides)
  const choose = selected => { generation.current += 1; setBusy(false); setName(selected); setInput(String(stagedOverrides[selected] ?? direct(graph?.measurements?.[selected]) ?? '')); setPreview(null); setConfirmed(false) }
  const edit = value => { generation.current += 1; setBusy(false); setInput(value); setPreview(null); setConfirmed(false) }
  const stageMeasurement = () => {
    if (!canStage) return
    generation.current += 1; setPreview(null); setConfirmed(false)
    setStaged({ signature, values: { ...stagedOverrides, [name]: Number(input) } })
    setNotice(`Staged ${name} for the same native six-size transaction.`)
  }
  const removeMeasurement = key => {
    generation.current += 1; setPreview(null); setConfirmed(false)
    const values = { ...stagedOverrides }; delete values[key]
    setStaged({ signature, values }); setNotice(`${key} removed from the pending regeneration.`)
  }

  async function runPreview() {
    if (!canPreview || busy) return
    const ticket = ++generation.current
    const request = { overrides: { ...stagedOverrides }, sourceRevision: revision }
    const captured = signature
    setBusy(true); setNotice(''); setPreview(null); setConfirmed(false)
    try {
      const report = await onPreview(request)
      if (ticket !== generation.current) return
      if (captured !== latestSignature.current || !validateSixSizeRegenerationPreview20261027(report, revision, request.overrides)) throw Error('Native Rust preview was incomplete, stale, or did not prove all changed points across six graded sizes.')
      setPreview({ report, request, signature: captured })
      setNotice('Read-only native preview received; no garment geometry has been committed.')
    } catch (error) { if (ticket === generation.current) setNotice(error.message || String(error)) }
    finally { if (ticket === generation.current) setBusy(false) }
  }

  async function commit() {
    if (!preview || proposalStale || !confirmed || blocker || typeof onCommit !== 'function' || busy) return
    const ticket = ++generation.current
    const expected = preview
    setBusy(true); setNotice('')
    try {
      if (latestSignature.current !== expected.signature) throw Error('Source changed after preview.')
      const result = await onCommit(expected.request)
      if (ticket !== generation.current) return
      const nativeSnapshot = result?.nativeSnapshot ?? result?.data?.nativeSnapshot ?? result
      const evidence = nativeSnapshot?.regenerationEvidence ?? nativeSnapshot?.nativeRegenerationEvidence
      if (latestSignature.current !== expected.signature || !nativeSnapshot || nativeSnapshot.revision !== expected.request.sourceRevision + 1 || nativeSnapshot.gradeRunPersisted !== true || nativeSnapshot.nativePointBindings?.active !== true || !validateSixSizeRegenerationPreview20261027(evidence, expected.request.sourceRevision, expected.request.overrides) || JSON.stringify(evidence) !== JSON.stringify(expected.report)) throw Error('Native commit response did not prove matching preview geometry, one revision increment, retained bindings and six-size regeneration; inspect the native project before retrying.')
      setPreview(null); setConfirmed(false); setStaged(null)
      setNotice(`Native regeneration committed at revision ${nativeSnapshot.revision}. Review graded pattern geometry and engineering checks before production.`)
    } catch (error) { if (ticket === generation.current) setNotice(error.message || String(error)) }
    finally { if (ticket === generation.current) setBusy(false) }
  }

  const source = preview?.report?.bySize ?? preview?.report?.sizes
  const rows = Array.isArray(source) ? source : source && typeof source === 'object' ? Object.entries(source).map(([size, value]) => ({ size, ...value })) : []
  return <section aria-label="Native six-size dependent regeneration" data-native-six-size-regeneration="true">
    <h3>Native six-size dependent pattern regeneration</h3>
    <p>Stage one or more saved direct measurements, then preview and commit their linked geometry across pieces and XS–XXL as one native Rust operation and Undo step. Computed formulas and arbitrary edits remain unsupported. Factory approval requires separate checks.</p>
    <p>Saved binding graph: {graph?.active ? `${graph.bindings?.length || 0} rule(s)` : 'unavailable'} · Six-size catalog: {snapshot?.gradeRunPersisted ? 'saved' : 'unavailable'}</p>
    {blocker && <p role="alert">{blocker}</p>}
    <label>Saved direct measurement <select aria-label="Six-size direct measurement" disabled={Boolean(blocker)} value={name} onChange={event => choose(event.target.value)}><option value="">Choose measurement</option>{measurements.map(([key, value]) => <option key={key} value={key}>{key} · {display(direct(value))}</option>)}</select></label>
    <label>New value (mm) <input aria-label="Six-size new measurement mm" inputMode="decimal" disabled={Boolean(blocker)} value={input} onChange={event => edit(event.target.value)}/></label>
    <button type="button" disabled={!canStage} onClick={stageMeasurement}>Stage measurement change</button>
    {Object.keys(stagedOverrides).length > 0 && <div aria-label="Staged six-size measurement overrides"><p>{Object.keys(stagedOverrides).length} saved direct measurement change(s) queued in one native transaction:</p><ul>{Object.entries(stagedOverrides).map(([key, value]) => <li key={key}>{key}: {display(direct(graph?.measurements?.[key]))} → {display(value)} <button type="button" disabled={busy || disabled} onClick={() => removeMeasurement(key)} aria-label={`Remove ${key} from regeneration`}>Remove</button></li>)}</ul></div>}
    <button type="button" disabled={!canPreview || busy} onClick={runPreview}>Preview XS–XXL regeneration</button>
    {typeof onPreview !== 'function' && <p role="status">Native preview callback is unavailable.</p>}
    {proposalStale && <p role="alert">Source revision or saved graph changed; preview is stale.</p>}
    {preview && !proposalStale && <div aria-label="Six-size regeneration preview"><p>Rust preview: {preview.report.changedPanels} panels · {preview.report.changedBindings} dependent bindings · {Object.keys(preview.request.overrides).length} measurement override(s). Source revision {preview.report.sourceRevision}. Factory uncertified.</p>
      <table aria-label="Per-size native geometry changes"><thead><tr><th>Size</th><th>Changed points</th><th>Measured before → after</th></tr></thead><tbody>{SIZE_NAMES.map(size => { const row = rows.find(item => item.size === size); const changes = row?.changes ?? []; return <tr key={size}><th>{size}</th><td>{changes.length}</td><td>{changes.map((change, index) => <p key={index}>{change.panelId} · P{change.pointIndex + 1}: {displayPosition(change.beforeMm)} → {displayPosition(change.afterMm)}</p>)}</td></tr> })}</tbody></table>
      <label><input type="checkbox" checked={confirmed} disabled={busy || Boolean(blocker)} onChange={event => setConfirmed(event.target.checked)}/> I reviewed all six size changes and authorize the native commit</label>
      <button type="button" disabled={!confirmed || Boolean(blocker) || typeof onCommit !== 'function'} onClick={commit}>Commit confirmed six-size regeneration</button>
    </div>}
    {notice && <p role="status">{notice}</p>}
  </section>
}
