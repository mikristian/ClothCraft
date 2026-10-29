import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MODARIS_2D_COMMAND_IDS_20261027,
  resolveModaris2DCommandCapabilities20261027,
  modaris2DCommandState20261027,
} from './modaris2DCommandCapabilities20261027.js'

const snapshot={panels:[{id:'front'}],canUndo:true,canRedo:false,gradeRunPersisted:true}
const allActions=Object.fromEntries(MODARIS_2D_COMMAND_IDS_20261027.map(id=>[id,()=>id]))
const resolve=overrides=>resolveModaris2DCommandCapabilities20261027({snapshot,actions:allActions,full2D:true,allow3DActions:true,selection:{panel:'front',edge:0},...overrides})

test('catalog commands are unique and include the live workspace handlers',()=>{
  assert.equal(new Set(MODARIS_2D_COMMAND_IDS_20261027).size,MODARIS_2D_COMMAND_IDS_20261027.length)
  for(const id of ['select','line','polygon','measurement-chart','grade-chart','grade-edit','sew','cutline','industrial-audit','view-2d','undo','redo','save','export'])
    assert.ok(MODARIS_2D_COMMAND_IDS_20261027.includes(id),id)
})

test('verified full 2D source permits actual actions, while redo needs history',()=>{
  const result=resolve()
  assert.equal(result.capabilities.select,true)
  assert.equal(result.capabilities.split,true)
  assert.equal(result.capabilities['sewing-balance'],true)
  assert.equal(result.actions.undo,allActions.undo)
  assert.equal(modaris2DCommandState20261027(result,'redo').disabled,true)
  assert.match(result.capabilities.redo.reason,/No redo history/)
})

test('half/split workspace never exposes full 2D tools',()=>{
  const result=resolve({full2D:false})
  assert.equal(result.capabilities.select.available,false)
  assert.match(result.capabilities.select.reason,/full 2D/)
  assert.equal(result.capabilities['view-2d'],true)
})

test('missing source, missing action and native busy states fail closed',()=>{
  assert.match(resolve({snapshot:null}).capabilities.line.reason,/Load a pattern/)
  assert.match(resolve({actions:{}}).capabilities.line.reason,/not connected/)
  assert.match(resolve({busy:true}).capabilities.line.reason,/busy/)
  assert.match(resolve({playing:true}).capabilities.line.reason,/Pause simulation/)
})

test('selection is tied to an existing source piece and real boundary index zero',()=>{
  assert.equal(resolve({selection:{panel:'front',edge:0}}).capabilities.split,true)
  assert.match(resolve({selection:null}).capabilities.split.reason,/Select a pattern/)
  assert.match(resolve({selection:{panel:'missing',edge:0}}).capabilities.move.reason,/unavailable/)
  assert.match(resolve({selection:{panel:'front'}}).capabilities.split.reason,/boundary/)
})

test('graded source prerequisites, active-size safety and explicit 3D transitions',()=>{
  assert.match(resolve({snapshot:{...snapshot,gradeRunPersisted:false}}).capabilities['grade-run'].reason,/graded size/)
  assert.match(resolve({snapshot:{...snapshot,activeGradedSize:'M'}}).capabilities.cutline.reason,/authored pattern/)
  assert.match(resolve({allow3DActions:false}).capabilities['view-split'].reason,/3D transition/)
})

test('proof veto and absent command IDs cannot execute',()=>{
  assert.match(resolve({verified:{sew:{available:false,reason:'Native seam bridge unavailable'}}}).capabilities.sew.reason,/bridge unavailable/)
  assert.equal(modaris2DCommandState20261027(resolve(),'not-in-catalog').disabled,true)
  assert.equal(resolve({actions:{line:null}}).actions.line,undefined)
})
