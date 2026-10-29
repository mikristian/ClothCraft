import test from 'node:test'
import assert from 'node:assert/strict'
import {expandAccuMarkMarkerDemand,validateAccuMarkMarkerProduction,checkAccuMarkPlotCalibration,buildAccuMarkMarkerOrder} from './accumarkMarkerProduction20261023.js'
const project=()=>({grading:{sizes:['S','M'],baseSize:'M',widthPerSizeCm:0,lengthPerSizeCm:0},pieces:[{id:'front',cutQuantity:1,grainAngleDeg:0,points:[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}]}]})
const options=()=>({quantitiesBySize:{S:1,M:1},fabricWidthCm:30,spacingCm:1,placements:[{size:'S',pieceId:'front',instance:0,x:0,y:0,rotationDeg:0},{size:'M',pieceId:'front',instance:0,x:12,y:0,rotationDeg:0}]})
test('size demand expansion and deterministic valid full marker, immutable inputs',()=>{
  const p=project(),o=options(),source=structuredClone(p),initial=structuredClone(o)
  assert.deepEqual(expandAccuMarkMarkerDemand(p,o.quantitiesBySize).map(d=>d.size),['S','M'])
  const result=validateAccuMarkMarkerProduction(p,o)
  assert.equal(result.ok,true,JSON.stringify(result.issues))
  assert.equal(result.required,2)
  assert.equal(result.unplaced.length,0)
  assert.ok(result.metrics.estimatedFabricCost===0)
  assert.deepEqual(p,source);assert.deepEqual(o,initial)
})
test('missing demand, unplaced, duplicate, mismatched sizes blocked',()=>{
  const p=project(),o=options()
  assert.equal(validateAccuMarkMarkerProduction(p,{...o,quantitiesBySize:{S:1}}).issues[0].code,'MISSING_OR_INVALID_QUANTITIES')
  assert.ok(validateAccuMarkMarkerProduction(p,{...o,placements:o.placements.slice(0,1)}).issues.some(i=>i.code==='UNPLACED_REQUIRED_INSTANCES'))
  assert.ok(validateAccuMarkMarkerProduction(p,{...o,placements:[o.placements[0],o.placements[0]]}).issues.some(i=>i.code==='DUPLICATE_INSTANCE'))
  assert.ok(validateAccuMarkMarkerProduction(p,{...o,placements:[{...o.placements[0],size:'XL'},o.placements[1]]}).issues.some(i=>i.code==='UNREQUESTED_INSTANCE'))
  const noCut=project();delete noCut.pieces[0].cutQuantity
  assert.equal(validateAccuMarkMarkerProduction(noCut,o).issues[0].code,'MISSING_OR_INVALID_CUT_QUANTITY')
})
test('bounds, collisions, spacing, dimensions and rotation restrictions',()=>{
  const p=project(),o=options()
  for(const [placements,code] of [
    [[{...o.placements[0],x:25},o.placements[1]],'OUT_OF_FABRIC'],
    [[o.placements[0],{...o.placements[1],x:10.5}],'PLACEMENT_OVERLAP'],
    [[{...o.placements[0],width:9},o.placements[1]],'SIZE_MISMATCH'],
    [[{...o.placements[0],rotationDeg:180},o.placements[1]],'INVALID_ROTATION_OR_NAP'],
  ]){const result=validateAccuMarkMarkerProduction(p,{...o,placements,nap:true});assert.ok(result.issues.some(i=>i.code===code),JSON.stringify(result.issues))}
  assert.equal(validateAccuMarkMarkerProduction(p,{...o,placements:o.placements.map(a=>({...a,y:2})),costPerMeter:120}).metrics.estimatedFabricCost,12)
})
test('plot calibration checks independent axes',()=>{
  assert.equal(checkAccuMarkPlotCalibration({measuredXmm:100,measuredYmm:100}).ok,true)
  assert.deepEqual(checkAccuMarkPlotCalibration({measuredXmm:100,measuredYmm:97}).issues.map(i=>i.code),['PLOT_Y_SCALE'])
})
test('marker order stacks S and M garment runs with every physical piece and translated outlines',()=>{
  const p=project();p.pieces[0].cutQuantity=2
  const options={quantitiesBySize:{S:2,M:1},fabricWidthCm:30,spacingCm:1,costPerMeter:50,nap:true}
  const before=structuredClone(p),optsBefore=structuredClone(options)
  const a=buildAccuMarkMarkerOrder(p,options),b=buildAccuMarkMarkerOrder(p,options)
  assert.deepEqual(a,b)
  assert.equal(a.validation.ok,true,JSON.stringify(a.validation.issues))
  assert.equal(a.placements.length,6)
  assert.deepEqual(a.placements.map(p=>p.size),['S','S','S','S','M','M'])
  assert.ok(a.placements.every(pl=>pl.outline.length>=3&&pl.outline.every(v=>v.y>=pl.y-1e-6)))
  assert.ok(a.validation.metrics.estimatedFabricCost>0)
  assert.deepEqual(p,before);assert.deepEqual(options,optsBefore)
})
test('marker order reports all unplaced pieces and overlength without silent drops',()=>{
  const p=project(),opts={quantitiesBySize:{S:1,M:1},fabricWidthCm:5,spacingCm:1}
  const tooNarrow=buildAccuMarkMarkerOrder(p,opts)
  assert.equal(tooNarrow.validation.ok,false)
  assert.equal(tooNarrow.unplaced.length,2)
  assert.ok(tooNarrow.validation.issues.some(i=>i.code==='UNPLACED_MARKER_PIECES'))
  const tooLong=buildAccuMarkMarkerOrder(p,{...opts,fabricWidthCm:25,maxLengthCm:5})
  assert.equal(tooLong.validation.ok,false)
  assert.ok(tooLong.validation.issues.some(i=>i.code==='OUT_OF_FABRIC'))
  const missing=buildAccuMarkMarkerOrder(p,{...opts,quantitiesBySize:{S:1}})
  assert.equal(missing.validation.ok,false)
  assert.equal(missing.validation.issues[0].code,'MISSING_OR_INVALID_QUANTITIES')
})
