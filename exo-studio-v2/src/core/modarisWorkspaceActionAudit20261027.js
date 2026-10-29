import {MODARIS_2D_COMMAND_IDS_20261027, resolveModaris2DCommandCapabilities20261027} from './modaris2DCommandCapabilities20261027.js'

const own = (object, key) => Object.prototype.hasOwnProperty.call(object ?? {}, key)
const panelsOf = snapshot => snapshot?.template?.panels ?? snapshot?.panels ?? []
const isIndex = value => Number.isInteger(value) && value >= 0

/** Inspect real host callbacks and source geometry without changing the project. */
export function auditModarisWorkspaceActions20261027(context = {}) {
  const {snapshot, selection, actions = {}, full2D = false, busy = false, playing = false} = context
  const base = resolveModaris2DCommandCapabilities20261027(context)
  const panelId = selection?.panel ?? selection?.panelId
  const panel = Array.isArray(panelsOf(snapshot)) ? panelsOf(snapshot).find(item => item?.id === panelId) : undefined
  const polygon = panel?.polygon
  const points = Array.isArray(polygon?.points) ? polygon.points : []
  const edges = Array.isArray(polygon?.edges) ? polygon.edges : []
  // Native polygons store boundary IDs in `edges`; do not confuse their
  // numeric IDs with the zero-based boundary *position* returned by hit tests.
  // Both representations must resolve to a real edge before enabling tools.
  const edgeExists = value => isIndex(value) && (edges.includes(value) || value < edges.length)
  const edge = selection?.edge
  const anchor = selection?.anchor ?? selection?.pointIndex
  const geometryCommands = new Set(['move','split','mirror','true-seam','dart','measure','seam-walk','notch','allowance','facing'])
  const edgeCommands = new Set(['split','true-seam','seam-walk','notch'])
  const pointCommands = new Set(['move','mirror','dart','measure','allowance','facing'])
  const commands = {}
  for (const id of MODARIS_2D_COMMAND_IDS_20261027) {
    const initial = base.capabilities[id]
    let reason = initial === true ? '' : initial?.reason || 'Unsupported command'
    if (!reason && geometryCommands.has(id) && !panel) reason = 'Selected pattern piece no longer exists'
    if (!reason && edgeCommands.has(id) && !edgeExists(edge)) reason = 'Selected boundary no longer exists'
    if (!reason && pointCommands.has(id) && own(selection, 'anchor') && !isIndex(anchor)) reason = 'Selected point is invalid'
    if (!reason && pointCommands.has(id) && own(selection, 'pointIndex') && !isIndex(anchor)) reason = 'Selected point is invalid'
    if (!reason && pointCommands.has(id) && (own(selection, 'anchor') || own(selection, 'pointIndex')) && anchor >= points.length) reason = 'Selected point no longer exists'
    if (!reason && selection?.revision != null && snapshot?.revision != null && selection.revision !== snapshot.revision && geometryCommands.has(id)) reason = 'Selection belongs to an older pattern revision'
    if (!reason && (busy || playing)) reason = busy ? 'Workspace is busy' : 'Pause simulation before editing'
    if (!reason && !full2D && id !== 'view-2d') reason = 'Open full 2D workspace to use this command'
    commands[id] = Object.freeze({available: !reason, disabled: Boolean(reason), reason})
  }
  return Object.freeze({revision: snapshot?.revision ?? null, commands: Object.freeze(commands), actions: Object.freeze({...actions})})
}

/** Recheck live state just before dispatch, guarding against menu and selection races. */
export function invokeAuditedModarisAction20261027(id, getContext, ...args) {
  if (typeof getContext !== 'function') return {ok:false, reason:'Live workspace context unavailable'}
  const context = getContext()
  const audit = auditModarisWorkspaceActions20261027(context)
  const command = audit.commands[id]
  if (!command || command.disabled) return {ok:false, reason:command?.reason || 'Unsupported command'}
  const handler = context?.actions?.[id]
  if (typeof handler !== 'function') return {ok:false, reason:'Action handler not connected'}
  return {ok:true, value:handler(...args)}
}

/** Supply command props to menus or toolbars with explicit disabled reasons. */
export function modarisAuditedCommandProps20261027(audit, id) {
  const command = audit?.commands?.[id]
  return {disabled:!command?.available, title:command?.reason || undefined, 'aria-disabled':!command?.available}
}
