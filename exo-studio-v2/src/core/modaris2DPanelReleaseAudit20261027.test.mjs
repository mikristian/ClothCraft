import test from 'node:test'
import assert from 'node:assert/strict'
import {auditModaris2DPanelRelease20261027, invokeModaris2DPanelReleaseAction20261027, modaris2DPanelReleaseButtonProps20261027} from './modaris2DPanelReleaseAudit20261027.js'

const snapshot = () => ({revision: 6, sourceId: 'native-42', gradeRunPersisted: true,
  template: {panels: [{id: 'front', polygon: {points: [[0,0], [1,0], [1,1]], edges: [0,1,2]}}],
    seams: [{id: 'seam-1', a: {panel: 'front', edge: 0}}]}})
const names = ['selectPiece','selectPoint','selectSeam','updatePoint','toggleLayer','grade','gradeAudit','industrialAudit','sewingAudit','cutlines','export','openSeam']
const complete = (overrides = {}) => ({full2D: true, snapshot: snapshot(),
  selection: {panel: 'front', anchor: 1, edge: 0, seamId: 'seam-1', revision: 6},
  actions: Object.fromEntries(names.map(id => [id, () => id])),
  nativeCapabilities: Object.fromEntries(names.map(id => [id, true])),
  releaseEvidence: Object.fromEntries(names.map(id => [id, {available:true,revision:6,sourceId:'native-42'}])),
  ...overrides})

test('full-width inspector visibility; split workspace leaves all controls unavailable', () => {
  const split = auditModaris2DPanelRelease20261027(complete({full2D:false}))
  assert.equal(split.visible,false)
  assert.ok(names.every(id => split.commands[id].disabled))
  const full = auditModaris2DPanelRelease20261027(complete())
  assert.equal(full.visible,true)
  assert.ok(names.every(id => full.commands[id].available))
})

test('missing host handlers and unverified native operations fail closed', () => {
  const missing = auditModaris2DPanelRelease20261027(complete({actions:{}}))
  assert.ok(names.every(id => missing.commands[id].disabled))
  const native = auditModaris2DPanelRelease20261027(complete({nativeCapabilities:{}}))
  assert.equal(native.commands.gradeAudit.available,false)
  assert.equal(native.commands.industrialAudit.available,false)
  assert.equal(native.commands.cutlines.available,false)
  assert.equal(native.commands.export.available,false)
  assert.equal(native.commands.selectPiece.available,true)
})

test('source and revision bound production evidence gates exports and audits', () => {
  const stale = auditModaris2DPanelRelease20261027(complete({snapshot:{...snapshot(),revision:7}}))
  assert.equal(stale.commands.export.available,false)
  assert.equal(stale.commands.industrialAudit.available,false)
  const staleProof = auditModaris2DPanelRelease20261027(complete({releaseEvidence:{export:{available:true,revision:6,sourceId:'another'}}}))
  assert.equal(staleProof.commands.export.available,false)
  assert.equal(staleProof.commands.cutlines.available,false)
  const graded = auditModaris2DPanelRelease20261027(complete({snapshot:{...snapshot(),activeGradedSize:'XL'}}))
  assert.equal(graded.commands.export.available,false)
  assert.equal(graded.commands.selectPiece.available,true)
  assert.equal(auditModaris2DPanelRelease20261027(complete({snapshot:null})).commands.export.available,false)
})

test('invalid point, edge, panel or selection revision stops dispatch', () => {
  for (const selection of [
    {panel:'front',anchor:8,revision:6}, {panel:'front',pointIndex:-1,revision:6},
    {panel:'front',anchor:0,pointIndex:1,revision:6}, {panel:'front',edge:99,revision:6},
    {panel:'gone',revision:6}, {panel:'front',revision:5},
  ]) {
    const result = auditModaris2DPanelRelease20261027(complete({selection}))
    assert.equal(result.commands.updatePoint.available,false,JSON.stringify(selection))
  }
  assert.equal(auditModaris2DPanelRelease20261027(complete({selection:{panel:'front',revision:6}})).commands.updatePoint.available,false)
  assert.equal(auditModaris2DPanelRelease20261027(complete({selection:{panel:'front',anchor:0,revision:6}})).commands.updatePoint.available,true)
})

test('click dispatch revalidates live revision and derives disabled props', () => {
  let live = complete()
  let called = 0
  live.actions.export = () => ++called
  const accepted = invokeModaris2DPanelReleaseAction20261027('export', () => live, {revision:6})
  assert.deepEqual(accepted,{ok:true,value:1})
  live = {...live,snapshot:{...live.snapshot,revision:7}}
  const blocked = invokeModaris2DPanelReleaseAction20261027('export', () => live, {revision:6})
  assert.equal(blocked.ok,false)
  assert.equal(called,1)
  assert.equal(modaris2DPanelReleaseButtonProps20261027(auditModaris2DPanelRelease20261027(live),'export').disabled,true)
  assert.equal(invokeModaris2DPanelReleaseAction20261027('export', null).ok,false)
  assert.equal(invokeModaris2DPanelReleaseAction20261027('unknown', () => complete()).ok,false)
})
