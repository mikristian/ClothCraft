import test from 'node:test'
import assert from 'node:assert/strict'
import {buildAccuMarkNativeMultiPanelNest20261023 as nest} from './accumarkNativeMultiPanelNest20261023.js'
import {buildAccuMarkGradingOverlayGeometry} from './accumarkGradingOverlayGeometry20261023.js'

const fixture=()=>({revision:7,template:{panels:[
  {id:'front',polygon:{points:[[.1,.2],[.3,.2],[.3,.3],[.1,.3]],edges:['a','b','c','d']}},
  {id:'back',polygon:{points:[[.4,.2],[.6,.2],[.6,.3],[.4,.3]],edges:['a','b','c','d']}},
],seams:[]},panels:[
  {id:'front',boundaries:{edge:[0,1,2,3]},layout:[0,0]},
  {id:'back',boundaries:{edge:[4,5,6,7]},layout:[1,0]},
],uv:[[.1,.2],[.3,.2],[.3,.3],[.1,.3],[.4,.2],[.6,.2],[.6,.3],[.4,.3]]})

test('six named sizes across two panels have true base, independent affine proposals and no mutation',()=>{
  const snapshot=fixture(),before=structuredClone(snapshot)
  const result=nest(snapshot,{widthStepMm:10,heightStepMm:5})
  assert.equal(result.ok,true,result.reason)
  assert.deepEqual(Object.keys(result.byPanel),['front','back'])
  assert.deepEqual(result.issues,[])
  for(const panelId of ['front','back']){
    const panel=result.byPanel[panelId]
    assert.equal(panel.source,'AFFINE_PROPOSAL_NOT_COMMITTED_GRADING')
    assert.deepEqual(Object.keys(panel.sizeRun),['XS','S','M','L','XL','XXL'])
    assert.deepEqual(panel.sizeRun.M.polygon,snapshot.template.panels.find(p=>p.id===panelId).polygon)
    assert.equal(panel.sizeRun.L.units,'m')
    assert.equal(panel.sizeRun.L.panelId,panelId)
    const width=polygon=>Math.max(...polygon.points.map(p=>p[0]))-Math.min(...polygon.points.map(p=>p[0]))
    assert(Math.abs(width(panel.sizeRun.XS.polygon)-.18)<1e-12)
    assert(Math.abs(width(panel.sizeRun.L.polygon)-.21)<1e-12)
    const geometry=buildAccuMarkGradingOverlayGeometry({...panel,layout:[0,0],showAllSizes:true})
    assert.equal(geometry.paths.length,6)
  }
  assert.deepEqual(snapshot,before)
})

test('invalid inputs reject and malformed panel excludes entire panel, never partial size run',()=>{
  const options={widthStepMm:10,heightStepMm:5}
  for(const params of [
    {...options,sizes:['S','S']},{...options,baseSize:'XXXL'},
    {...options,selectedSize:'XXXL'},{...options,widthStepMm:Infinity},
    {...options,heightStepMm:NaN},{...options,sizes:['__proto__','M']},
    {...options,widthStepMm:0,heightStepMm:0},{...options,enabled:false},
  ])assert.equal(nest(fixture(),params).ok,false,JSON.stringify(params))
  const snapshot=fixture();snapshot.template.panels[1].polygon.lines=[{}]
  const outcome=nest(snapshot,options)
  assert.equal(outcome.ok,true)
  assert.deepEqual(Object.keys(outcome.byPanel),['front'])
  assert.equal(outcome.issues.length,1)
  assert.equal(outcome.issues[0].panelId,'back')
  snapshot.template.panels[0].id='back'
  assert.match(nest(snapshot,options).reason,/duplicated panel/)
})

test('curved proposals preserve cubic controls and knot derivatives and expose approximation',()=>{
  const snapshot=fixture(),polygon=snapshot.template.panels[0].polygon
  polygon.curves={a:[[.15,.15],[.25,.15]]}
  polygon.free_curve_points={a:[{id:'k',t:.5,position:[.2,.16],derivative:[.03,-.015],derivative_in:[.01,-.02],derivative_out:[-.02,.04]}]}
  snapshot.uv.push([.15,.16],[.2,.157],[.25,.16]);snapshot.panels[0].boundaries.edge.push(8,9,10)
  const original=structuredClone(snapshot)
  const result=nest(snapshot,{widthStepMm:10,heightStepMm:5})
  assert.equal(result.ok,true,result.reason)
  assert.equal(result.byPanel.front.accuracy,'approximate')
  assert.equal(result.byPanel.front.boundUncertainty.maxErrorMm,null)
  const base=polygon,larger=result.byPanel.front.sizeRun.L.polygon
  assert.notDeepEqual(larger.curves.a,base.curves.a)
  assert.notDeepEqual(larger.free_curve_points.a[0].derivative,base.free_curve_points.a[0].derivative)
  assert.deepEqual(result.byPanel.front.sizeRun.M.polygon,base)
  assert.deepEqual(snapshot,original)
})
