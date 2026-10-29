// Host-side capabilities for the Modaris-inspired command catalog.
// A command is enabled only after both its source prerequisites and a real
// workspace action are present. This module never invokes a native operation.
export const MODARIS_2D_COMMAND_IDS_20261027 = Object.freeze([
  'select','point','line','curve','polygon','move','split','mirror','true-seam','dart',
  'measure','measurement-chart','constraints','reference-recompute',
  'grade-chart','grade-edit','grade-run','grade-audit','sew','seam-walk',
  'sewing-balance','notch','allowance','facing','cutline','industrial-audit',
  'view-2d','view-split','simulate','fit','variant','undo','redo','save','export','interchange',
])

const SELECTION_REQUIRED = new Set(['move','split','mirror','true-seam','dart','measure','seam-walk','notch','allowance','facing'])
const EDGE_REQUIRED = new Set(['split','true-seam','seam-walk','notch'])
const PANEL_REQUIRED = new Set(['move','mirror','dart','measure','allowance','facing'])
const GRADE_REQUIRED = new Set(['grade-run','grade-audit','sewing-balance','reference-recompute'])
const FULL_2D_REQUIRED = new Set(MODARIS_2D_COMMAND_IDS_20261027.filter(id=>id!=='view-2d'))

/**
 * Build the command studio's {actions, capabilities, disabled} props.
 *
 * @param {object} context
 * @param {object|null} context.snapshot  Loaded Rust workspace snapshot.
 * @param {object} context.actions         Actual host functions keyed by catalog ID.
 * @param {object|null} context.selection   Current 2D hit ({panel,edge?}).
 * @param {boolean} context.full2D          Full 2D focus, never split view.
 * @param {boolean} context.busy            Native request in progress.
 * @param {boolean} context.playing         Live simulation running.
 * @param {boolean} context.allow3DActions  Explicit host support for leaving 2D.
 * @param {object} context.verified         Optional source proof by ID (true or {available,reason}).
 */
export function resolveModaris2DCommandCapabilities20261027({
  snapshot=null, actions={}, selection=null, full2D=false, busy=false, playing=false,
  allow3DActions=false, verified={},
}={}) {
  const hasSource=Boolean(snapshot)
  const selectedPanel=selection?.panel||selection?.panelId||null
  const panelKnown=Boolean(selectedPanel && (
    snapshot?.panels?.some?.(panel=>panel.id===selectedPanel) ||
    snapshot?.template?.panels?.some?.(panel=>panel.id===selectedPanel)
  ))
  const hasEdge=panelKnown && selection?.edge!==undefined && selection?.edge!==null
  const hasGrade=Boolean(snapshot?.gradeRunPersisted||snapshot?.gradeRuns?.length||snapshot?.savedGradeRuns?.length)
  const activeSize=Boolean(snapshot?.activeGradedSize)
  const actionsOut={}
  const capabilities={}
  for(const id of MODARIS_2D_COMMAND_IDS_20261027) {
    const handler=actions?.[id]
    let reason=''
    if(!full2D && FULL_2D_REQUIRED.has(id)) reason='Open full 2D workspace to use this command'
    else if(!hasSource && id!=='view-2d') reason='Load a pattern project first'
    else if(busy||playing) reason=playing?'Pause simulation before editing':'Workspace is busy'
    else if(activeSize && (GRADE_REQUIRED.has(id)||SELECTION_REQUIRED.has(id)||id==='sew'||id==='cutline'))
      reason='Restore the authored pattern before editing graded geometry'
    else if(SELECTION_REQUIRED.has(id) && !selectedPanel) reason='Select a pattern piece first'
    else if(PANEL_REQUIRED.has(id) && !panelKnown) reason='Selected pattern piece is unavailable'
    else if(EDGE_REQUIRED.has(id) && !hasEdge) reason='Select a pattern boundary first'
    else if(GRADE_REQUIRED.has(id) && !hasGrade) reason='Generate and save a graded size catalog first'
    else if(id==='undo'&&!snapshot?.canUndo) reason='No undo history'
    else if(id==='redo'&&!snapshot?.canRedo) reason='No redo history'
    else if((id==='view-split'||id==='simulate'||id==='fit')&&!allow3DActions) reason='3D transition is not enabled in this 2D workspace'
    const proof=verified?.[id]
    if(!reason && proof===false)reason='Source capability unverified'
    if(!reason && proof && typeof proof==='object' && proof.available===false)reason=proof.reason||'Source capability unverified'
    if(!reason && typeof handler!=='function')reason='Action handler not connected'
    if(!reason){ actionsOut[id]=handler; capabilities[id]=true }
    else capabilities[id]={available:false,reason}
  }
  return {actions:actionsOut,capabilities,disabled:false}
}

/** The same result can be used for a compact toolbar's disabled state. */
export function modaris2DCommandState20261027(resolved,id) {
  const capability=resolved?.capabilities?.[id]
  return {disabled:capability!==true,reason:capability===true?'':capability?.reason||'Unknown command'}
}
