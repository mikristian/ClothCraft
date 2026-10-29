import React, { useEffect, useRef, useState } from 'react'

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const number = value => typeof value === 'number' && Number.isFinite(value) ? value : null
const mm = value => number(value) === null ? '—' : `${value.toFixed(2)} mm`
const text = value => typeof value === 'string' ? value : ''
const diagnostics = value => Array.isArray(value) ? value.map(item => typeof item === 'string' ? item : item?.message || item?.reason || JSON.stringify(item)) : []

// Read-only presentation: every measured value must originate in the Rust RPC.
export default function NativeGradedPomAudit20261027({ snapshot, onRunAudit, disabled = false }) {
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const generation = useRef(0)
  const revision = snapshot?.revision
  const hasCatalog = Boolean(snapshot?.project?.grade_run || snapshot?.project?.gradeRun || snapshot?.grade_run || snapshot?.gradeRun || snapshot?.hasSavedGradeCatalog || snapshot?.gradeRunPersisted || snapshot?.nativeGradeCatalogStatus?.ok)
  const activeSize = snapshot?.activeGradedSize ?? snapshot?.active_grade_size
  const stale = Boolean(report && report.sourceRevision !== revision)
  const validReport = report && !stale && report.format === 'exo-native-grade-pom-audit.v1'
  const blocked = disabled || busy || !Number.isInteger(revision) || !hasCatalog || Boolean(activeSize) || typeof onRunAudit !== 'function'

  useEffect(() => { generation.current += 1; setBusy(false); setError('') }, [revision])
  async function runAudit() {
    if (blocked) return
    const sourceRevision = revision
    const ticket = ++generation.current
    setBusy(true)
    setError('')
    try {
      const result = await onRunAudit()
      if (ticket !== generation.current) return
      if (!result || result.sourceRevision !== sourceRevision || result.format !== 'exo-native-grade-pom-audit.v1') {
        setReport(null)
        setError('Rust audit response was missing, incompatible, or measured a different source revision. Run the audit again.')
        return
      }
      setReport(result)
    } catch (cause) {
      if (ticket === generation.current) setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      if (ticket === generation.current) setBusy(false)
    }
  }

  const rows = validReport && Array.isArray(report.rows) ? report.rows : []
  const sizeCount = validReport ? report.sizeCount : null
  const completeSizeRun = Boolean(validReport && sizeCount === 6 && rows.length > 0 && SIZES.every(size => rows.some(row => row.size === size)) && rows.every(row => SIZES.includes(row.size)) && rows.length % 6 === 0 && SIZES.every(size => rows.filter(row => row.size === size).length === rows.length / 6))
  const summary = validReport && completeSizeRun ? SIZES.map(size => {
    const poms = rows.filter(item => item.size === size)
    const scoredCount = poms.filter(pom => pom.scored === true && number(pom.measuredMm) !== null && number(pom.targetMm) !== null && number(pom.deltaMm) !== null && number(pom.toleranceMm) !== null).length
    const unscoredCount = poms.length - scoredCount
    const mismatchCount = poms.filter(pom => pom.withinTolerance === false || number(pom.deltaMm) !== null && number(pom.toleranceMm) !== null && Math.abs(pom.deltaMm) > pom.toleranceMm).length
    return { size, poms, scoredCount, unscoredCount, mismatchCount }
  }) : []
  const factoryApproved = false // The Rust audit does not validate physical factory release.

  return <section className="exo-grading-qa exo-native-graded-pom-audit" aria-label="Native six-size graded POM audit" data-testid="native-graded-pom-audit">
    <header className="exo-grading-qa-heading"><strong>Rust six-size graded POM audit</strong><span>Factory uncertified</span></header>
    <p>Measure the saved XS–XXL Rust catalog against its stored per-size POM targets and tolerances. Read-only engineering evidence.</p>
    <button type="button" onClick={runAudit} disabled={blocked} aria-label="Run native six-size POM audit">{busy ? 'Measuring six sizes…' : 'Run Rust six-size POM audit'}</button>
    {!hasCatalog && <p role="status">Save a native six-size grade catalog before running the POM audit.</p>}
    {Boolean(activeSize) && <p role="status">Restore the source garment before auditing a saved six-size catalog. Active size: {activeSize}.</p>}
    {disabled && <p role="status">Wait for the current native operation to finish.</p>}
    {error && <p role="alert">{error}</p>}
    {stale && <p role="status">Pattern revision changed. Previous Rust POM measurements are stale and hidden. Run the audit again.</p>}
    {validReport && !completeSizeRun && <p role="alert">Native report did not contain exactly one measurement group for each of XS, S, M, L, XL and XXL. Six-size acceptance cannot be determined.</p>}
    {summary.length > 0 && <>
      <p role="status">Source revision {report.sourceRevision}. {summary.reduce((total, row) => total + row.scoredCount, 0)} scored · {summary.reduce((total, row) => total + row.unscoredCount, 0)} unscored · {summary.reduce((total, row) => total + row.mismatchCount, 0)} tolerance mismatches. {report.acceptanceComplete === true && summary.every(row => row.unscoredCount === 0 && row.mismatchCount === 0) ? 'Recorded engineering checks complete.' : 'Incomplete or out-of-tolerance engineering evidence.'}</p>
      <div className="exo-grading-qa-table-scroll"><table aria-label="Six-size native POM score summary"><thead><tr><th>Size</th><th>Scored</th><th>Unscored</th><th>Mismatches</th></tr></thead><tbody>{summary.map(({ size, scoredCount, unscoredCount, mismatchCount }) => <tr key={size}><th>{size}</th><td>{scoredCount}</td><td>{unscoredCount}</td><td>{mismatchCount}</td></tr>)}</tbody></table></div>
      {summary.map(({ size, poms }) => <details key={size} open={size === 'M'}><summary>{size} · {poms.length} POM records</summary>
        <div className="exo-grading-qa-table-scroll"><table aria-label={`${size} native POM measurements`}><thead><tr><th>POM</th><th>Actual</th><th>Target</th><th>Residual</th><th>Tolerance</th><th>Result</th></tr></thead><tbody>{poms.map((pom, index) => {
          const actual = number(pom.measuredMm)
          const target = number(pom.targetMm)
          const tolerance = number(pom.toleranceMm)
          const residual = number(pom.deltaMm)
          const measured = pom.scored === true && actual !== null && target !== null && tolerance !== null && residual !== null && tolerance >= 0
          const mismatch = measured && (Math.abs(residual) > tolerance || pom.withinTolerance === false)
          const result = measured ? mismatch ? 'Mismatch' : 'Within tolerance' : 'Unscored'
          return <tr key={`${pom.id || pom.pomId || index}`}><th>{text(pom.label) || text(pom.id) || text(pom.pomId) || `POM ${index + 1}`}</th><td>{mm(actual)}</td><td>{mm(target)}</td><td>{mm(residual)}</td><td>{mm(tolerance)}</td><td>{result}{diagnostics(pom.diagnostics).length ? ` · ${diagnostics(pom.diagnostics).join('; ')}` : ''}</td></tr>
        })}</tbody></table></div>
        {poms.length === 0 && <p>Rust supplied no POM records for {size}. No POM acceptance is established.</p>}
      </details>)}
      {diagnostics(report.blockers).map((detail, index) => <p key={index} role="status">{detail}</p>)}
      {diagnostics(report.diagnostics).map((detail, index) => <p key={index} role="status">{detail}</p>)}
    </>}
    <footer data-factory-approved={factoryApproved}>Factory uncertified: this numerical inspection does not authorize cutting, physical fit, marker export or manufacture. Any unscored POM or tolerance mismatch requires review.</footer>
  </section>
}
