import test from 'node:test'
import assert from 'node:assert/strict'
import {nativeShapeBuilderBlockers} from './nativeShapeBuilderPreflight.js'

const template=()=>({seams:[],panels:[
  {id:'a',name:'Front',polygon:{points:[[0,0],[1,0],[1,1],[0,1]],curves:{},notches:{}}},
  {id:'b',name:'Cutout',polygon:{points:[[.5,.5],[1.5,.5],[1.5,1.5],[.5,1.5]]}},
]})

test('allows ordinary native straight-edge union operands',()=>{
  assert.deepEqual(nativeShapeBuilderBlockers(template(),'a','b'),[])
})
test('rejects missing, duplicate or stale operands',()=>{
  assert.ok(nativeShapeBuilderBlockers(template(),'a','a').length)
  assert.ok(nativeShapeBuilderBlockers(template(),'a','gone').length)
})
test('protects curved sewn and decorated authored pattern metadata',()=>{
  const t=template()
  t.panels[0].polygon.curves={side:[[0,0],[.1,.2]]}
  t.panels[1].polygon.notches={edge_1:[{t:.5}]}
  t.panels[1].polygon.annotations=[{text:'keep'}]
  t.seams=[{a:{panel:'a'},b:{panel:'other'}}]
  assert.deepEqual(nativeShapeBuilderBlockers(t,'a','b'),[
    'Front has sewing links.','Front has curves.',
    'Cutout has notches.','Cutout has annotations.',
  ])
})
