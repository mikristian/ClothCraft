import test from 'node:test'
import assert from 'node:assert/strict'
import {sideCurveStation,torsoSideCurveStations,curveDraftDimensions} from './patternCurveDrafting.js'
import {evaluateFreeCurve,addNativeFreeCurvePoint,moveNativeFreeCurvePoint} from './nativeFreeCurvePoints.js'

const fixture=()=>({
  edges:['hem','side-left','shoulder','side-right'],
  points:[[.8,.7],[.2,.7],[.2,.25],[.8,.25]],
  curves:{
    'side-left':[[.14,.57],[.14,.36]],
    'side-right':[[.86,.36],[.86,.57]],
  },
})
test('belly guide endpoint lies on physically evaluated left and right cutlines',()=>{
  const polygon=fixture()
  for(const edge of ['side-left','side-right']){
    const station=sideCurveStation(polygon,edge,.52)
    assert(station)
    assert(Math.abs(station.position[1]-.52)<1e-7)
    assert.deepEqual(evaluateFreeCurve(polygon,edge,station.t),station.position)
    assert(station.t>.02&&station.t<.98)
  }
})
test('four between-chest and belly stations can be mirrored and moved as real free curve knots',()=>{
  const polygon=fixture()
  const stations=torsoSideCurveStations(polygon,.25,.52)
  assert.deepEqual(stations.map(s=>s.edge+':'+s.level),[
    'side-left:between','side-left:belly','side-right:between','side-right:belly'])
  for(const item of stations){
    const created=addNativeFreeCurvePoint(polygon,item.edge,item.t,{mirror:true})
    assert(created?.mark?.mirror_group,item.edge+' must pair left/right')
    const moved=moveNativeFreeCurvePoint(created.polygon,item.edge,created.mark.id,[.012,0])
    assert(moved)
    const physical=moved.free_curve_points[item.edge].find(mark=>mark.id===created.mark.id)
    assert(Math.abs(physical.position[0]-item.position[0]-.012)<1e-7)
  }
})
test('live drafting lengths account for actual cubic bows and sampled outline bounds',()=>{
  const polygon=fixture()
  const rows=curveDraftDimensions(polygon,{samples:128})
  assert.equal(rows.length,4)
  const side=rows.find(row=>row.edge==='side-left')
  assert(side.length>.45,'Curved side length must exceed straight height')
  assert(side.bounds.minX<.16,'Outline bounds include curved fabric beyond native anchor chord')
  assert(side.midpoint.length===2&&side.midpoint.every(Number.isFinite))
})
test('no virtual side marker outside side-seam Y or next to saved free knot',()=>{
  const p=fixture()
  assert.equal(sideCurveStation(p,'side-left',.82),null)
  const a=sideCurveStation(p,'side-right',.52)
  p.free_curve_points={'side-right':[{id:'free_1',t:a.t,position:a.position}]}
  const candidates=torsoSideCurveStations(p,.25,.52)
  assert.equal(candidates.some(item=>item.edge==='side-right'&&item.level==='belly'),false)
})
