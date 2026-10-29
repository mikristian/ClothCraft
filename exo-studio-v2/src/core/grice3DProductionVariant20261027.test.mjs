import test from 'node:test'
import assert from 'node:assert/strict'
import {buildGriceVariantReadiness20261027 as audit} from './grice3DProductionVariant20261027.js'

const snapshot = () => ({revision: 9,
  template: {panels: [{id: 'front', fabric: 'wool'}, {id: 'back', fabric: 'wool'}, {id: 'rib', fabric: 'wool'}],
    seams: [{id: 'body', a: {panel: 'front'}, b: {panel: 'back'}}]},
  panels: [{id: 'front'}, {id: 'back'}, {id: 'rib'}], seams: [{id: 'body'}]})
const definition = () => ({version: 1, sourceRevision: 9, pieces: [
  {panelId: 'front', quantity: 1, production: true, sendTo3D: true, fabricId: 'wool'},
  {panelId: 'back', quantity: 1, production: true, sendTo3D: true, fabricId: 'wool'},
  {panelId: 'rib', quantity: 1, production: false, sendTo3D: false, fabricId: 'wool'}]})

test('exact native source admits independent production and 3D flags without mutation or factory approval', () => {
  const s = snapshot(), d = definition(), before = structuredClone({s, d})
  const r = audit(s, d)
  assert.equal(r.ok, true)
  assert.equal(r.status, 'pass')
  assert.equal(r.readyFor3D, true)
  assert.equal(r.manufacturerApproved, false)
  assert.equal(r.sourceRevision, 9)
  assert.equal(r.pieceRows.length, 3)
  assert.deepEqual({s, d}, before)
})
test('production-only seam endpoint cannot masquerade as 3D member', () => {
  const d = definition(); d.pieces[1].sendTo3D = false
  const r = audit(snapshot(), d)
  assert.equal(r.readyFor3D, false)
  assert.match(r.blockers.join(' '), /sewn endpoint back excluded/)
})
test('stale definitions, missing entries, duplicate and unknown identifiers fail closed', () => {
  for (const change of [
    d => { d.sourceRevision-- },
    d => { d.pieces.pop() },
    d => { d.pieces[1].panelId = 'front' },
    d => { d.pieces[1].panelId = 'unknown' },
    d => { d.unexpected = true },
    d => { d.pieces[0].fabricId = 'linen' }
  ]) {
    const d = definition(); change(d)
    const r = audit(snapshot(), d)
    assert.equal(r.readyFor3D, false)
    assert.ok(r.blockers.length > 0)
  }
})
test('compiled 3D inventory and sewn relationship must exist', () => {
  const s = snapshot(); s.panels = [{id:'front'}, {id:'rib'}]
  assert.match(audit(s, definition()).blockers.join(' '), /selected 3D panel is absent/)
  const t = snapshot(); t.seams = []
  assert.match(audit(t, definition()).blockers.join(' '), /sewing relationship missing/)
})
test('single rib substitution may be staged only for unsewn source and matching fabric', () => {
  const d = definition(); d.pieces[2].substitutePanelId = 'back'
  const r = audit(snapshot(), d)
  assert.equal(r.ok, true)
  assert.equal(r.pieceRows[2].substitutePanelId, 'back')
  const mismatched = snapshot(); mismatched.template.panels[2].fabric = 'cotton'
  assert.match(audit(mismatched, {...d, pieces: d.pieces.map((p,i) => i===2 ? {...p,fabricId:'cotton'} : p)}).blockers.join(' '), /substitute fabric mismatch/)
})
test('substitution of sewn source requires unsupported remap and is blocked', () => {
  const d = definition(); d.pieces[0].sendTo3D = false; d.pieces[0].substitutePanelId = 'rib'
  d.pieces[2].sendTo3D = true
  assert.match(audit(snapshot(), d).blockers.join(' '), /unsupported sewn boundary remapping/)
})
test('quantity two without compiled two-instance proof requires explicit review', () => {
  const d = definition(); d.pieces[0].quantity = 2
  const r = audit(snapshot(), d)
  assert.equal(r.ok, true)
  assert.equal(r.status, 'review')
  assert.equal(r.readyFor3D, false)
  assert.equal(r.pieceRows[0].requiresPairReview, true)
  assert.match(r.warnings.join(' '), /paired piece requires review/)
})
test('proven two-instance compiled panel can clear pair review', () => {
  const s = snapshot(), d = definition(); s.panels[0].instanceCount = 2; d.pieces[0].quantity = 2
  const r = audit(s, d)
  assert.equal(r.readyFor3D, true)
  assert.equal(r.pieceRows[0].requiresPairReview, false)
})
