import test from 'node:test'
import assert from 'node:assert/strict'
import {inspectNative24GoldenRun43 as inspect}
  from './check-v2-native-g27-golden-24-run43-20261029.mjs'
const sizes=Array.from({length:24},(_,i)=>String(i+1))
const aliases={Petite:'1',M:'12',Tall:'19',Custom7XL:'24'}
const base={panels:[{id:'golden-rectangle',
  polygon:{points:[[0,0],[.4,0],[.4,.3],[0,.3]],
    edges:['edge-a','edge-b','edge-c','edge-d']}},
  {id:'companion',polygon:{points:[[.6,0],[.8,0],[.8,.2],[.6,.2]],
    edges:['edge-e','edge-f','edge-g','edge-h']}}]}
const fixture=()=>({
  template:structuredClone(base),
  grade_run:{
    schemaVersion:2,sizes:[...sizes],baseSize:'12',
    sizeCorrespondence:{...aliases},
    gradedTemplates:sizes.map(size=>{
      const t=structuredClone(base)
      const dx=(Number(size)-12)/1000
      t.panels[0].polygon.points[1][0]+=dx
      t.panels[0].polygon.points[2][0]+=dx
      return t
    }),
  },
})
test('96 synthetic size/point physical deltas match separately authored 24-size oracle',()=>{
  const result=inspect(fixture(),'golden-rectangle')
  assert.equal(result.pass,true,result.errors.join('; '))
  assert.equal(result.pointsChecked,96)
  assert.equal(result.realRustPersistedCatalog,false)
  assert.equal(result.g27Passed,false)
  assert.equal(result.factoryApproved,false)
})
test('numeric source/alias mismatches fail without inheriting manufacturing approval',()=>{
  const variants=[
    x=>{x.grade_run.sizes.reverse()},
    x=>{x.grade_run.sizes.splice(0,1)},
    x=>{x.grade_run.gradedTemplates.splice(0,1)},
    x=>{x.grade_run.sizeCorrespondence.Petite='2'},
    x=>{delete x.grade_run.sizeCorrespondence.Custom7XL},
    x=>{x.grade_run.sizeCorrespondence.UK10='14'},
    x=>{x.grade_run.gradedTemplates[0].panels[0].polygon.points[1][0]+=.001},
    x=>{x.grade_run.gradedTemplates[23].panels[0].polygon.points[2][1]+=.002},
    x=>{x.grade_run.gradedTemplates[23].panels[0].polygon.points[2][0]*=1000},
    x=>{x.grade_run.gradedTemplates[11].panels[0].polygon.points[1][0]+=.002},
    x=>{x.grade_run.baseSize='13'},
    x=>{x.grade_run.gradedTemplates[2].panels[1].polygon.points[0][0]+=.001},
    x=>{x.grade_run.gradedTemplates[15].panels.pop()},
  ]
  for(const change of variants){
    const x=fixture();change(x)
    assert.equal(inspect(x,'golden-rectangle').pass,false)
    assert.equal(inspect(x,'golden-rectangle').g27Passed,false)
  }
})
