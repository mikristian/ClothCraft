import test from 'node:test'
import assert from 'node:assert/strict'
import {planNativeManySewing20261025 as many,planNativeSymmetricSewing20261025 as symmetric} from './nativeSewingBatchPlans20261025.js'

const poly=(w=.2,h=.4)=>({points:[[0,0],[w,0],[w,h],[0,h]],edges:['top','right','bottom','left'],curves:{},notches:{},seam_allowances:{},free_curve_points:{},internal_lines:[],holes:[]})
const panels=ids=>ids.map(id=>({id,polygon:poly()}))
const source=(ids=['front','back','sleeve'])=>({revision:8,template:{panels:panels(ids),seams:[]}})
const ref=(panel,edge='right',range)=>({panel,edge,...(range?{range}:{})})

test('many partitions primary by physical target lengths and emits atomic native command',()=>{
  const snapshot=source(),before=structuredClone(snapshot)
  const result=many(snapshot,{primary:ref('front'),targets:[ref('back','top'),ref('sleeve','right')],expectedRevision:8,ease:true})
  assert.equal(result.ok,true,result.reason)
  assert.equal(result.command.kind,'SewMany')
  assert.equal(result.command.pairs.length,2)
  assert.ok(Math.abs(result.pairs[0].a.range[1]-1/3)<1e-10)
  assert.deepEqual(result.pairs[1].a.range,[result.pairs[0].a.range[1],1])
  assert.deepEqual(result.pairs[0].b.range,[0,1])
  assert.deepEqual(snapshot,before)
  assert.equal(result.manufacturingApproved,false)
})

test('many rejects overlapping targets and original occupied intervals atomically',()=>{
  const snapshot=source()
  assert.equal(many(snapshot,{primary:ref('front'),targets:[ref('back'),ref('back')]}).ok,false)
  snapshot.template.seams.push({a:ref('front','right',[0,.3]),b:ref('sleeve','top',[0,.6])})
  assert.match(many(snapshot,{primary:ref('front'),targets:[ref('back')]}).reason,/overlap/)
  assert.equal(snapshot.template.seams.length,1)
})

test('many checks stale revision and explicitly required ease',()=>{
  const snapshot=source()
  assert.match(many(snapshot,{primary:ref('front'),targets:[ref('back')],expectedRevision:7}).reason,/Stale/)
  assert.equal(many(snapshot,{primary:ref('front'),targets:[ref('back','top')]}).ok,false)
  assert.equal(many(snapshot,{primary:ref('front'),targets:[ref('back','top')],ease:true}).ok,true)
})

test('symmetric resolves explicit paired names, preserving boundaries and options',()=>{
  const snapshot=source(['body-left','body-right','arm-left','arm-right'])
  const result=symmetric(snapshot,{a:ref('body-left'),b:ref('arm-left'),reverse:true,expectedRevision:8})
  assert.equal(result.ok,true,result.reason)
  assert.equal(result.command.kind,'SewSymmetric')
  assert.equal(result.command.original.a.panel,'body-left')
  assert.equal(result.command.mirrored.a.panel,'body-right')
  assert.equal(result.command.mirrored.b.panel,'arm-right')
  assert.equal(result.command.mirrored.reverse,true)
})

test('symmetric refuses invented mirrors and occupied mirrored intervals',()=>{
  assert.match(symmetric(source(),{a:ref('front'),b:ref('back')}).reason,/explicit left\/right/)
  assert.match(symmetric(source(['body-left','arm-left']),{a:ref('body-left'),b:ref('arm-left')}).reason,/Missing mirrored/)
  const snapshot=source(['body-left','body-right','arm-left','arm-right'])
  snapshot.template.seams.push({a:ref('body-right','right',[.2,.8]),b:ref('arm-right','top',[0,.6])})
  assert.match(symmetric(snapshot,{a:ref('body-left'),b:ref('arm-left')}).reason,/overlap/)
})

test('symmetric resolves right/left edge names on the same front and back panels',()=>{
  const snapshot=source(['front','back'])
  for(const panel of snapshot.template.panels)panel.polygon.edges=['side-left','side-right','cuff-right','cuff-left']
  const result=symmetric(snapshot,{a:ref('front','side-left'),b:ref('back','side-left')})
  assert.equal(result.ok,true,result.reason)
  assert.deepEqual(result.command.mirrored.a,{panel:'front',edge:'side-right',side:'top',range:[0,1]})
  assert.deepEqual(result.command.mirrored.b,{panel:'back',edge:'side-right',side:'top',range:[0,1]})
  snapshot.template.panels[1].polygon.edges[1]='different'
  assert.match(symmetric(snapshot,{a:ref('front','side-left'),b:ref('back','side-left')}).reason,/Missing mirrored edge/)
})
