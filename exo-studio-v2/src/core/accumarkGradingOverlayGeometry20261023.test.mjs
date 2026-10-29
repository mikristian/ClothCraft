import test from 'node:test'
import assert from 'node:assert/strict'
import {buildAccuMarkGradingOverlayGeometry,gradeOverlayPointToBoard} from './accumarkGradingOverlayGeometry20261023.js'

const polygon=(width,curve=true)=>({points:[[0,0],[width,0],[width,1],[0,1]],
  edges:['bottom','right','top','left'],curves:curve?{1:{cx:width+.2,cy:.5}}:{}})
const base=polygon(1),sizes=['S','M','L']
const sizeRun={S:{panelId:'front',units:'m',polygon:polygon(.9)},
  M:{panelId:'front',units:'m',polygon:polygon(1)},
  L:{panelId:'front',units:'m',polygon:polygon(1.1)}}

test('native metres: graded curved outlines and 90-degree rotated layout match panel world transform',()=>{
  const result=buildAccuMarkGradingOverlayGeometry({panelId:'front',basePolygon:base,sizeRun,sizes,
    baseSize:'M',selectedSize:'L',layout:[2,3],boardOffset:[.5,-.2],rotationDegrees:90,
    showAllSizes:true,showVectors:true,showPointLabels:true})
  assert.equal(result.paths.length,3)
  assert.equal(result.paths[2].localPath.includes('Q1.3,0.5 1.1,1'),true)
  const p=result.paths[2].points[1]
  assert(Math.abs(p[0]-2.5)<1e-10)
  assert(Math.abs(p[1]-3.9)<1e-10)
  assert.equal(result.vectors.length,2)
  assert(Math.abs(result.vectors[0].lengthCm-10)<1e-8)
  assert.equal(result.points.length,4)
})

test('default display is uncluttered and reveals only base and selected outlines',()=>{
  const result=buildAccuMarkGradingOverlayGeometry({panelId:'front',basePolygon:base,sizeRun,sizes,
    baseSize:'M',selectedSize:'L'})
  assert.deepEqual(result.paths.filter(p=>p.visible).map(p=>p.size),['M','L'])
  assert.equal(result.vectors.length,0)
  assert.equal(result.points.length,0)
})

test('centimetre PatternEditor mapping flips Y and preserves cm SVG viewBox',()=>{
  const point=gradeOverlayPointToBoard([10,20],{units:'cm',layout:[1,2],invertY:true})
  assert.deepEqual(point,[1.1,1.8])
  const converted=buildAccuMarkGradingOverlayGeometry({panelId:'front',basePolygon:polygon(100),
    sizeRun:{M:{panelId:'front',units:'cm',polygon:polygon(100)}},sizes:['M'],baseSize:'M',
    units:'cm',outputUnits:'cm',layout:[1,2],invertY:true})
  assert.deepEqual(converted.paths[0].points[2],[101,1])
})

test('rejects mismatched panel identity, units and topology rather than drawing unrelated grading',()=>{
  const options={panelId:'front',basePolygon:base,sizeRun,sizes,baseSize:'M'}
  assert.throws(()=>buildAccuMarkGradingOverlayGeometry({...options,sizeRun:{...sizeRun,
    L:{...sizeRun.L,panelId:'back'}}}),/does not match panel/)
  assert.throws(()=>buildAccuMarkGradingOverlayGeometry({...options,sizeRun:{...sizeRun,
    L:{...sizeRun.L,units:'cm'}}}),/mismatched source units/)
  assert.throws(()=>buildAccuMarkGradingOverlayGeometry({...options,sizeRun:{...sizeRun,
    L:{...sizeRun.L,polygon:{points:[[0,0],[1,0],[0,1]]}}}}),/topology mismatch/)
  assert.throws(()=>buildAccuMarkGradingOverlayGeometry({...options,sizeRun:{...sizeRun,
    M:{...sizeRun.M,polygon:polygon(1.01)}}}),/Base grading snapshot differs/)
})

test('overlay never mutates source geometry',()=>{
  const original=JSON.stringify({base,sizeRun})
  buildAccuMarkGradingOverlayGeometry({panelId:'front',basePolygon:base,sizeRun,sizes,
    baseSize:'M',selectedSize:'S',showVectors:true})
  assert.equal(JSON.stringify({base,sizeRun}),original)
})

test('native edge names use two cubic controls and a free Hermite knot, including rotated curve bounds',()=>{
  const native={points:[[0,0],[1,0],[1,1],[0,1]],edges:['bottom','right','top','left'],
    curves:{bottom:[[.15,-.8],[.85,-.8]]},
    free_curve_points:{bottom:[{id:'free_1',t:.5,position:[.5,-1],derivative:[1,0]}]}}
  const before=JSON.stringify(native)
  const run={M:{panelId:'front',units:'m',polygon:native}}
  const output=buildAccuMarkGradingOverlayGeometry({panelId:'front',basePolygon:native,sizeRun:run,
    sizes:['M'],baseSize:'M',layout:[2,3],rotationDegrees:90})
  const {localPath,bounds}=output.paths[0]
  assert.match(localPath,/L0\.5,-1/)
  assert.doesNotMatch(localPath,/Q| C/)
  assert.equal((localPath.match(/L/g)||[]).length,99)
  assert.ok(bounds.maxX>2.99)
  assert.ok(Math.abs(bounds.minX-1)<1e-10)
  assert.ok(Math.abs(bounds.maxY-4)<1e-10)
  assert.equal(JSON.stringify(native),before)
})
