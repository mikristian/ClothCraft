// EXO2D-013 independent, source-only group-transform contract.
// No browser, native session, garment write, or installed-app mutation.
import test from 'node:test'
import assert from 'node:assert/strict'
import {planNativePatternGroupMove20261025 as plan} from './nativePatternGroupMove20261025.js'

const garment = () => ({revision:71, panels:[
  {id:'front', layout_2d:[.1,-.2], layout_rotation_degrees:22.5,
    polygon:{points:[[0,0],[.2,0],[0,.3]],edges:['a','b','c']},
    attachments:[{id:'seam-front',edge:'a'}]},
  {id:'back', layout:[1.5,2.5], layout_rotation_degrees:-90,
    polygon:{points:[[0,0],[.2,0],[0,.3]],edges:['d','e','f']},
    attachments:[{id:'seam-back',edge:'d'}]},
  {id:'sleeve', layout_2d:[5,6], layout_rotation_degrees:0},
]})

test('EXO2D-013: implicit layout fallback and negative coordinates preserve attachments', () => {
  const source=garment(), before=structuredClone(source)
  const result=plan(source,['back','front'],[-.25,.75])
  assert.equal(result.ok,true)
  assert.deepEqual(result.commands,[
    {kind:'BoardTransform',panel:'back',origin:[1.25,3.25],rotation_degrees:-90},
    {kind:'BoardTransform',panel:'front',origin:[-.15,.55],rotation_degrees:22.5},
  ])
  assert.deepEqual(source,before,'Planner must not mutate seam IDs or source revision')
})

test('EXO2D-013: zero-delta planning is nonmutating and never selects extra panels', () => {
  const source=garment(), before=structuredClone(source)
  const result=plan(source,['front','back'],[0,0])
  assert.equal(result.ok,true)
  assert.deepEqual(result.commands.map(c=>c.panel),['front','back'])
  assert.deepEqual(result.commands.map(c=>c.origin),[[.1,-.2],[1.5,2.5]])
  assert.deepEqual(source,before)
})

test('EXO2D-013: malformed selection or template fails without partial commands', () => {
  const source=garment(), before=structuredClone(source)
  const invalid=[
    [source,['front','missing'],[.1,.2]],
    [source,['front','front'],[.1,.2]],
    [source,['front','  '],[.1,.2]],
    [source,['front',23],[.1,.2]],
    [source,['front','back'],[Number.MIN_VALUE,Infinity]],
    [{panels:null},['front','back'],[.1,.2]],
  ]
  for(const [template,ids,delta] of invalid){
    const result=plan(template,ids,delta)
    assert.equal(result.ok,false,JSON.stringify({ids,delta}))
    assert.equal(result.commands,undefined,'Reject the entire batch')
  }
  assert.deepEqual(source,before)
})

test('EXO2D-013: maximum accepted distinct selection produces exactly 256 transforms', () => {
  const source={panels:Array.from({length:256},(_,i)=>({id:`p${i}`,layout_2d:[i,0]}))}
  const ids=source.panels.map(p=>p.id)
  const result=plan(source,ids,[.125,-.5])
  assert.equal(result.ok,true)
  assert.equal(result.commands.length,256)
  assert.deepEqual(result.commands.at(-1),
    {kind:'BoardTransform',panel:'p255',origin:[255.125,-.5],rotation_degrees:0})
  assert.equal(plan(source,[...ids,'p256'],[.125,-.5]).ok,false)
})
