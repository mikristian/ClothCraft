/** Executable EXO evidence map. Modaris licensed-reference results are unknown. */
export const behavioralMatrix = Object.freeze([
  {
    id: 'numerical-anchor', label: 'Numerical construction anchor',
    exoCommand: 'Anchor',
    evidence: 'qa-v2-native-2d-construction-20261023.mjs',
    checks: {
      selection: 'construction-point panel and point selectors',
      preview: 'SVG preview exists and Rust snapshot remains unchanged before apply',
      geometry: 'native vertex x moves from 400 to 370 mm',
      error: 'unsafe formula disables apply',
      shortcut: null,
      undoRedo: 'native undo is asserted; redo is not covered by this fixture',
      saveReopen: null,
    },
  },
  {
    id: 'cross-panel-anchor-group', label: 'Cross-panel dependent anchor change',
    exoCommand: 'AnchorGroup (two commands in one edit-batch)',
    evidence: 'qa-v2-modaris-cross-piece-ui-20261027.mjs',
    checks: {
      selection: 'source and target panel/anchor selectors',
      preview: 'two-group preview and explicit confirmation required',
      geometry: 'source 400→420 mm, target 300→320 mm, single Rust revision',
      error: null,
      shortcut: null,
      undoRedo: 'browser-issued native undo and redo both assert restored geometry',
      saveReopen: null,
    },
  },
  {
    id: 'notch-and-seam-allowance', label: 'Notch and seam allowance',
    exoCommand: 'Notch / SeamAllowance / RemoveNotch',
    evidence: 'qa-v2-notches-allowances-20261017.mjs',
    checks: {
      selection: 'native panel and named edge passed in commands; GUI selection unverified',
      preview: null,
      geometry: 'native notch t=0.37 and allowance 12 mm stored in polygon',
      error: 'invalid notch parameter t=2 rejected without revision change',
      shortcut: null,
      undoRedo: 'two native undo and redo cycles asserted',
      saveReopen: 'save response inspected; close and reopen not verified',
    },
  },
])

export const matrixDimensions = Object.freeze(['selection','preview','geometry','error','shortcut','undoRedo','saveReopen'])
export const comparisonAuthority = Object.freeze({
  exo: 'local disposable Rust and browser fixtures; validate by executing cited tests',
  modaris: 'unverified: licensed Lectra Modaris behavioral baseline and shortcut mapping unavailable',
  parity: 'no parity claim or Modaris acceptance inferred from EXO test success',
})
