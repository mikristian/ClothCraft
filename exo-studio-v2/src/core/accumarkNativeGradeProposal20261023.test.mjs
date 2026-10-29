import test from 'node:test'
import assert from 'node:assert/strict'
import {buildAccuMarkNativeGradeProposal20261023 as proposal} from './accumarkNativeGradeProposal20261023.js'
import {buildAccuMarkGradingOverlayGeometry} from './accumarkGradingOverlayGeometry20261023.js'

const fixture=()=>({revision:7,template:{panels:[{id:'front',polygon:{
  points:[[.1,.2],[.3,.2],[.3,.3],[.1,.3]],edges:['a','b','c','d'],subdivisions:2,
  annotations:[{id:'note',position:[.2,.25],text:'QA'}]}}],seams:[]},
  panels:[{id:'front',boundaries:{edge:[0,1,2,3]},layout:[0,0]}],
  uv:[[.1,.2],[.3,.2],[.3,.3],[.1,.3]]})

test('Rust-equivalent affine grade uses compiled 200x100mm bounds and exact millimetre delta',()=>{
  const source=fixture(),before=JSON.stringify(source)
  const result=proposal(source,{panelId:'front',widthDeltaMm:20,heightDeltaMm:-10})
  assert.equal(result.ok,true,result.reason)
  assert.equal(result.accuracy,'exact')
  assert.deepEqual(result.sizes,['BASE','PREVIEW'])
  assert(Math.abs(result.scale[0]-1.1)<1e-12)
  assert(Math.abs(result.scale[1]-.9)<1e-12)
  assert.deepEqual(result.afterMm.map(v=>Number(v.toFixed(8))),[220,90])
  const points=result.sizeRun.PREVIEW.polygon.points
  assert(Math.abs(points[0][0]-.09)<1e-12)
  assert(Math.abs(points[0][1]-.205)<1e-12)
  assert(Math.abs(points[2][0]-.31)<1e-12)
  assert(Math.abs(points[2][1]-.295)<1e-12)
  assert.deepEqual(result.sizeRun.PREVIEW.polygon.annotations[0].position,[.2,.25])
  assert.equal(JSON.stringify(source),before)
  const overlay=buildAccuMarkGradingOverlayGeometry({panelId:'front',basePolygon:result.basePolygon,
    sizeRun:result.sizeRun,sizes:result.sizes,baseSize:result.baseSize,
    selectedSize:result.selectedSize,showVectors:true})
  assert.equal(overlay.paths.length,2)
  assert.equal(overlay.vectors.length,4)
})

test('rejects invalid modes, geometry and unsupported holes or internal lines',()=>{
  for(const key of ['holes','lines']){
    const source=fixture();source.template.panels[0].polygon[key]=[{}]
    assert.equal(proposal(source,{panelId:'front',widthDeltaMm:1,heightDeltaMm:1}).ok,false)
  }
  const source=fixture()
  assert.equal(proposal(source,{panelId:'front',widthDeltaMm:1,heightDeltaMm:1,gradeModeOpen:false}).ok,false)
  assert.equal(proposal(source,{panelId:'front',widthDeltaMm:0,heightDeltaMm:-100}).ok,false)
  assert.equal(proposal(source,{panelId:'front',widthDeltaMm:Infinity,heightDeltaMm:2}).ok,false)
  const bad=fixture();bad.template.panels[0].polygon.points[0][0]=Infinity
  assert.equal(proposal(bad,{panelId:'front',widthDeltaMm:1,heightDeltaMm:1}).ok,false)
})
test('native grading preview preserves named internal Bézier guide with anisotropic tangent scale',()=>{
 const source=fixture(),polygon=source.template.panels[0].polygon
 polygon.lines=[{id:'pocket-guide',points:[[.15,.22],[.25,.28]],tangents:[[.03,.004],[-.01,.02]]}]
 const result=proposal(source,{panelId:'front',widthDeltaMm:20,heightDeltaMm:-10})
 assert.equal(result.ok,true,result.reason)
 const guide=result.sizeRun.PREVIEW.polygon.lines[0]
 assert.equal(guide.id,'pocket-guide')
 assert(Math.abs(guide.points[0][0]-.145)<1e-12)
 assert(Math.abs(guide.points[0][1]-.223)<1e-12)
 assert(Math.abs(guide.tangents[0][0]-.033)<1e-12)
 assert(Math.abs(guide.tangents[0][1]-.0036)<1e-12)
 assert.deepEqual(polygon.lines[0].points,[[.15,.22],[.25,.28]])
 const overlay=buildAccuMarkGradingOverlayGeometry({panelId:'front',basePolygon:result.basePolygon,
   sizeRun:result.sizeRun,sizes:result.sizes,baseSize:'BASE',selectedSize:'PREVIEW'})
 assert.match(overlay.paths[1].localPath,/ M0\.145,0\.223 C/)
 assert(!overlay.paths[1].localPath.endsWith(' Z'),'Open internal line must never be auto-closed')
 const forged=structuredClone(result.sizeRun)
 forged.PREVIEW.polygon.lines[0].id='unrelated-guide'
 assert.throws(()=>buildAccuMarkGradingOverlayGeometry({panelId:'front',
   basePolygon:result.basePolygon,sizeRun:forged,sizes:result.sizes,
   baseSize:'BASE',selectedSize:'PREVIEW'}),/drafting line identity/)
})
test('native graded hole keeps named clockwise cut rim and renders through grade overlay',()=>{
 const source=fixture(),polygon=source.template.panels[0].polygon
 polygon.holes=[{points:[[.15,.22],[.15,.27],[.19,.27],[.19,.22]],
   edges:['hole-l','hole-b','hole-r','hole-t']}]
 const result=proposal(source,{panelId:'front',widthDeltaMm:20,heightDeltaMm:-10})
 assert.equal(result.ok,true,result.reason)
 const hole=result.sizeRun.PREVIEW.polygon.holes[0]
 assert.deepEqual(hole.edges,polygon.holes[0].edges)
 assert(Math.abs(hole.points[0][0]-.145)<1e-12)
 assert(Math.abs(hole.points[0][1]-.223)<1e-12)
 const overlay=buildAccuMarkGradingOverlayGeometry({panelId:'front',basePolygon:result.basePolygon,
   sizeRun:result.sizeRun,sizes:result.sizes,baseSize:'BASE',selectedSize:'PREVIEW'})
 assert.equal(overlay.paths.length,2)
 assert.match(overlay.paths[1].localPath,/M0\.145,0\.223 L0\.145,0\.268/)
 const forged=structuredClone(result.sizeRun)
 forged.PREVIEW.polygon.holes[0].edges[0]='other-rim'
 assert.throws(()=>buildAccuMarkGradingOverlayGeometry({panelId:'front',basePolygon:result.basePolygon,
   sizeRun:forged,sizes:result.sizes,baseSize:'BASE',selectedSize:'PREVIEW'}),/rim identity/)
})

test('curved lobe proposal scales cubic controls, free knot position and independent derivative vectors',()=>{
  const source=fixture(),p=source.template.panels[0].polygon
  p.curves={a:[[.15,.15],[.25,.15]]}
  p.free_curve_points={a:[{id:'k1',t:.5,position:[.2,.16],derivative:[.03,-.015],
    derivative_in:[.01,-.02],derivative_out:[-.02,.04]}]}
  // Native compiled contour captures a cubic lobe above original vertices.
  source.uv.push([.15,.16],[.2,.157],[.25,.16])
  source.panels[0].boundaries.edge.push(4,5,6)
  const original=structuredClone(source)
  const result=proposal(source,{panelId:'front',widthDeltaMm:20,heightDeltaMm:-10})
  assert.equal(result.ok,true,result.reason)
  assert.equal(result.accuracy,'approximate')
  assert.equal(result.boundUncertainty.maxErrorMm,null)
  assert.match(result.boundUncertainty.reason,/0.25 mm/)
  assert.deepEqual(result.beforeMm.map(v=>Math.round(v)),[200,143])
  const sx=1.1,sy=133/143,cx=.2,cy=(.157+.3)/2
  const graded=result.sizeRun.PREVIEW.polygon
  const close=(actual,expected)=>assert(Math.abs(actual-expected)<1e-12,`${actual} != ${expected}`)
  close(graded.curves.a[0][0],cx+(.15-cx)*sx)
  close(graded.curves.a[0][1],cy+(.15-cy)*sy)
  close(graded.free_curve_points.a[0].position[1],cy+(.16-cy)*sy)
  close(graded.free_curve_points.a[0].derivative[0],.03*sx)
  close(graded.free_curve_points.a[0].derivative_in[1],-.02*sy)
  close(graded.free_curve_points.a[0].derivative_out[0],-.02*sx)
  assert.deepEqual(source,original)
})

test('curved preview refuses insufficient sampled coverage, bad vectors and missing extrema',()=>{
  const source=fixture();source.template.panels[0].polygon.curves={a:[[.15,.1],[.25,.1]]}
  assert.match(proposal(source,{panelId:'front',widthDeltaMm:20,heightDeltaMm:10}).reason,/no compiled boundary samples/)
  source.uv.push([.2,.14]);source.panels[0].boundaries.edge.push(4)
  source.template.panels[0].polygon.free_curve_points={a:[{t:.5,position:[.2,.15],derivative_out:[Infinity,0]}]}
  assert.equal(proposal(source,{panelId:'front',widthDeltaMm:20,heightDeltaMm:10}).ok,false)
  source.template.panels[0].polygon.free_curve_points={}
  source.uv[0][0]=.11
  assert.equal(proposal(source,{panelId:'front',widthDeltaMm:20,heightDeltaMm:10}).ok,false)
})

test('rejects stale compiled native UV bounds and degenerate panels',()=>{
  const source=fixture();source.uv[1][0]=.31
  assert.match(proposal(source,{panelId:'front',widthDeltaMm:2,heightDeltaMm:1}).reason,/bounds differ/)
  const narrow=fixture();narrow.template.panels[0].polygon.points=narrow.template.panels[0].polygon.points.map(p=>[.1,p[1]])
  assert.equal(proposal(narrow,{panelId:'front',widthDeltaMm:2,heightDeltaMm:1}).ok,false)
})
