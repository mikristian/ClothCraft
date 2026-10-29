import React from 'react'
import { auditGrice2D3DPreparation20261027 } from '../core/griceModaris2Dto3DReadiness20261027.js'

const SOURCE = 'Patricia Grice, Digital Pattern Cutting for Fashion with Lectra Modaris (Bloomsbury 2019), reviewed user-provided 321-page PDF, chapters 4–6 (PDF pp. 71–141)'
const text = value => typeof value === 'string' ? value : ''
const finite = value => typeof value === 'number' && Number.isFinite(value)
const length = value => finite(value) ? `${value.toFixed(2)} mm` : 'Not measured'
const entries = value => Array.isArray(value) ? value : []
const message = item => typeof item === 'string' ? item : text(item?.message) || text(item?.reason) || text(item?.detail) || 'Unresolved check'
const status = value => value === 'pass' || value === 'review' || value === 'blocked' ? value : 'blocked'
const STAGES = [['source', 'Native net pattern and identities'], ['industrial', 'Industrial allowances, grain and notches'], ['assembly', 'Sewing relationships and edge lengths'], ['drape', 'Compiled mesh and fabric mechanics']]

/** Read-only engineering checklist: only reports a pass where the audit supplies evidence. */
export default function GriceModaris2Dto3DReadiness20261027({ snapshot, disabled = false }) {
  let report
  let failure = ''
  try {
    report = auditGrice2D3DPreparation20261027(snapshot)
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error)
  }
  const revision = snapshot?.revision
  const sourceRevision = report?.sourceRevision
  const stale = !Number.isInteger(revision) || sourceRevision !== revision
  const stages = !stale && !failure && report?.stages && typeof report.stages === 'object' ? STAGES.map(([id, label]) => ({ id, label, ...report.stages[id] })) : []
  const seams = !stale && !failure ? entries(report?.seams) : []
  const blockers = !stale && !failure ? entries(report?.blockers) : []
  const overall = disabled || failure || stale || stages.length !== STAGES.length || blockers.length ? 'blocked' : stages.some(s => status(s.status) === 'blocked') ? 'blocked' : stages.some(s => status(s.status) === 'review') || entries(report?.warnings).length ? 'review' : 'pass'

  return <section className="exo-grice-2d-3d-readiness" aria-label="Grice Modaris 2D to 3D preparation audit" data-testid="grice-modaris-2d-3d-readiness">
    <header><strong>2D → 3D pattern preparation audit</strong> · <span>Read-only · {overall.toUpperCase()}</span></header>
    <p>Check pattern industrialization, stitching evidence and 3D preparation before fit assessment. The existence of a 3D preview does not establish fit, fabric validation or manufacturing readiness.</p>
    {!stale && !failure && report?.modarisClassic3DWorkflowComplete === false && <p role="status" data-modaris-full-workflow-complete="false">Modaris-style 3D preparation is not independently complete: saved 3D variant selection, simulation substitute pieces, named stitch phases and body placement anchors remain unverified. A compiled EXO mesh cannot substitute for that evidence.</p>}
    <p role="status">{Number.isInteger(revision) ? `Current source revision ${revision}.` : 'No valid source revision.'} {Number.isInteger(sourceRevision) ? `Audit source revision ${sourceRevision}.` : 'No auditable source revision.'}</p>
    {disabled && <p role="status">Native operation in progress. Recheck preparation after it finishes.</p>}
    {failure && <p role="alert">Audit could not complete: {failure}</p>}
    {stale && <p role="alert">Audit source revision is missing or stale. Preparation results are withheld until the current pattern revision can be audited.</p>}
    {!stale && !failure && stages.length === 0 && <p role="alert">No stage evidence was returned. Preparation remains blocked.</p>}
    {stages.length > 0 && <ol aria-label="2D to 3D preparation stages">{stages.map((stage, i) => <li key={`${stage.id || i}`} data-stage-status={status(stage.status)}><strong>{text(stage.label) || text(stage.name) || `Stage ${i + 1}`}: {status(stage.status).toUpperCase()}</strong>
      {text(stage.summary) && <p>{stage.summary}</p>}
      {text(stage.detail) && <p>{stage.detail}</p>}
      {entries(stage.blockers).map((item, j) => <p key={j} role="status">{message(item)}</p>)}
      {entries(stage.diagnostics).map((item, j) => <p key={`d${j}`} role="status">{message(item)}</p>)}
    </li>)}</ol>}
    <h4>Stitch and seam-length evidence</h4>
    {seams.length === 0 ? <p>No paired seam measurements are available. A 3D preview alone cannot demonstrate sewing compatibility.</p> : <div className="exo-grading-qa-table-scroll"><table aria-label="2D to 3D seam measurements"><thead><tr><th>Seam pair</th><th>Source length</th><th>Target length</th><th>Total mismatch</th><th>Worst facing-notch interval</th><th>Ease</th><th>Check</th></tr></thead><tbody>{seams.map((seam, i) => <tr key={`${seam.id || i}`}><th>{text(seam.id) || `Pair ${i + 1}`}</th><td>{length(seam.a?.lengthMm)}</td><td>{length(seam.b?.lengthMm)}</td><td>{length(seam.mismatchMm)}</td><td>{length(seam.localNotchMismatchMm)}</td><td>{seam.allowEase ? 'Explicit ease allowed' : 'No ease authored'}</td><td>{status(seam.status).toUpperCase()}</td></tr>)}</tbody></table></div>}
    <h4>Blocking findings</h4>
    {blockers.length ? <ul aria-label="Preparation blockers">{blockers.map((item, i) => <li key={i}>{message(item)}</li>)}</ul> : <p>No blocking findings explicitly returned; this is not a production approval.</p>}
    {entries(report?.warnings).length > 0 && !stale && !failure && <><h4>Human review required</h4><ul aria-label="Preparation review findings">{entries(report.warnings).map((item, i) => <li key={i}>{message(item)}</li>)}</ul></>}
    <footer data-factory-approved="false"><p>Source: {SOURCE}.</p><p>Engineering audit only. No factory approval, physical fit certification, mechanical fabric-property validation or manufacturing release is granted.</p></footer>
  </section>
}
