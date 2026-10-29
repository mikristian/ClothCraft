// Read-only, fail-closed capability gate for the full-width native 2D inspector.
// Host should evaluate this against live state immediately before dispatch.
const own = (v, k) => Object.prototype.hasOwnProperty.call(v ?? {}, k)
const validIndex = n => Number.isInteger(n) && n >= 0
const validRevision = n => (Number.isSafeInteger(n) && n >= 0) || (typeof n === 'string' && n.trim().length > 0)
const actionsById = Object.freeze({
  selectPiece: ['selectPiece', 'onSelectPiece', 'select'],
  selectPoint: ['selectPoint', 'onSelectPoint'],
  selectSeam: ['selectSeam', 'onSelectSeam'],
  updatePoint: ['updatePoint', 'onUpdatePoint'],
  toggleLayer: ['toggleLayer', 'onToggleLayer'],
  grade: ['grade', 'openGrade', 'onOpenGrade'],
  gradeAudit: ['gradeAudit', 'auditGrade', 'onGradeAudit'],
  industrialAudit: ['industrialAudit', 'auditIndustrial', 'onIndustrialAudit'],
  sewingAudit: ['sewingAudit', 'auditSewing', 'onSewingAudit'],
  cutlines: ['cutlines', 'generateCutlines', 'onGenerateCutlines'],
  export: ['export', 'exportPattern', 'onExportPattern'],
  openSeam: ['openSeam', 'editSeam', 'onEditSeam'],
})
const nativeChecks = new Set(['gradeAudit', 'industrialAudit', 'sewingAudit', 'cutlines', 'export'])
const pointActions = new Set(['selectPoint', 'updatePoint'])
const seamActions = new Set(['selectSeam', 'openSeam'])
const selectedPieceActions = new Set(['updatePoint'])
const productionActions = new Set(['industrialAudit', 'sewingAudit', 'cutlines', 'export'])
const panelActions = new Set(Object.keys(actionsById))
const evidenceAvailable = proof => proof === true || (proof && typeof proof === 'object' && proof.available === true)

/**
 * @param {object} context
 * @param {boolean} context.full2D Full-width 2D focus; split workspace is false.
 * @param {object} context.snapshot Authoritative native session snapshot, including revision.
 * @param {object} context.selection {panel, anchor?/pointIndex?, edge?, seamId?, revision?}.
 * @param {object} context.actions Concrete host callbacks, including accepted alias names.
 * @param {object} context.nativeCapabilities Native-verified capability evidence by action ID.
 * @param {object} context.releaseEvidence Production evidence by action ID, each
 *   {available:true, revision:snapshot.revision, sourceId?:snapshot.sourceId}.
 * @returns {{visible:boolean, revision:*, commands:object, actions:object}}
 */
export function auditModaris2DPanelRelease20261027(context = {}) {
  const {full2D = false, snapshot = null, selection = null, actions = {},
    nativeCapabilities = {}, releaseEvidence = {}, busy = false, playing = false} = context
  const visible = full2D === true
  const revision = snapshot?.revision ?? null
  const panels = snapshot?.template?.panels ?? snapshot?.panels
  const seams = snapshot?.template?.seams ?? snapshot?.seams
  const pieces = Array.isArray(panels) ? panels : []
  const connections = Array.isArray(seams) ? seams : []
  const selectedId = selection?.panel ?? selection?.panelId
  const piece = pieces.find(p => p?.id === selectedId)
  const points = piece?.polygon?.points
  const edges = piece?.polygon?.edges
  const rawPoint = selection?.anchor ?? selection?.pointIndex
  const pointSpecified = own(selection, 'anchor') || own(selection, 'pointIndex')
  const hasPoint = pointSpecified && validIndex(rawPoint) && Array.isArray(points) && rawPoint < points.length
    && !((own(selection, 'anchor') && own(selection, 'pointIndex')) && selection.anchor !== selection.pointIndex)
  const edgeSpecified = own(selection, 'edge')
  const hasEdge = edgeSpecified && validIndex(selection.edge) && Array.isArray(edges)
    && (edges.includes(selection.edge) || selection.edge < edges.length && edges.every(e => typeof e !== 'number'))
  const seam = connections.find(s => s?.id === selection?.seamId)
  const sourceId = snapshot?.sourceId ?? snapshot?.source?.id ?? null
  const commands = {}
  const connected = {}
  for (const id of panelActions) {
    const handler = actionsById[id].find(alias => typeof actions?.[alias] === 'function')
    let reason = ''
    if (!visible) reason = 'Available only in full-width 2D workspace'
    else if (!snapshot || !validRevision(revision) || !Array.isArray(panels)) reason = 'Native pattern source or revision unavailable'
    else if (busy || playing) reason = busy ? 'Workspace is busy' : 'Pause simulation before editing'
    else if (selection?.revision != null && selection.revision !== revision) reason = 'Selection belongs to an older pattern revision'
    else if (selectedId != null && !piece) reason = 'Selected pattern piece no longer exists'
    else if (pointSpecified && !hasPoint) reason = 'Selected point is invalid or no longer exists'
    else if (edgeSpecified && !hasEdge) reason = 'Selected boundary is invalid or no longer exists'
    else if (selectedPieceActions.has(id) && !piece) reason = 'Select a pattern piece first'
    else if (pointActions.has(id) && id === 'updatePoint' && !hasPoint) reason = 'Select a valid point first'
    else if (pointActions.has(id) && id === 'selectPoint' && !piece) reason = 'Select a pattern piece first'
    else if (seamActions.has(id) && id === 'openSeam' && !seam) reason = 'Select a valid sewing link first'
    else if (seamActions.has(id) && id === 'selectSeam' && connections.length === 0) reason = 'No native sewing links available'
    else if (id === 'gradeAudit' && snapshot.gradeRunPersisted !== true) reason = 'Persist and save a native grade catalog first'
    else if (id === 'sewingAudit' && !connections.length) reason = 'No native sewing links available'
    else if (productionActions.has(id) && !pieces.length) reason = 'No native pattern pieces available'
    else if (nativeChecks.has(id) && !evidenceAvailable(nativeCapabilities?.[id])) reason = 'Native capability has not been verified'
    else if (productionActions.has(id) && snapshot.activeGradedSize) reason = 'Restore the authored base pattern before factory operations'
    else if (productionActions.has(id) && (!evidenceAvailable(releaseEvidence?.[id]) ||
      releaseEvidence[id].revision !== revision ||
      (sourceId != null && releaseEvidence[id].sourceId !== sourceId))) reason = 'Production evidence is missing or stale for this source revision'
    else if (!handler) reason = 'Action handler not connected'
    commands[id] = Object.freeze({available: !reason, disabled: Boolean(reason), reason})
    if (!reason) connected[id] = actions[handler]
  }
  return Object.freeze({visible, revision, commands: Object.freeze(commands), actions: Object.freeze(connected)})
}

/** Revalidate on click, so a previously enabled button cannot dispatch a stale source. */
export function invokeModaris2DPanelReleaseAction20261027(id, getContext, payload) {
  if (typeof getContext !== 'function') return {ok: false, reason: 'Live workspace context unavailable'}
  const audit = auditModaris2DPanelRelease20261027(getContext())
  if (!audit.commands[id]?.available) return {ok: false, reason: audit.commands[id]?.reason ?? 'Unsupported panel action'}
  return {ok: true, value: audit.actions[id](payload)}
}

export function modaris2DPanelReleaseButtonProps20261027(audit, id) {
  const state = audit?.commands?.[id]
  return {disabled: !state?.available, title: state?.reason || undefined, 'aria-disabled': !state?.available}
}
