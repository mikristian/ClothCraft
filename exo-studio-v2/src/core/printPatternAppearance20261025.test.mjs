import test from 'node:test'
import assert from 'node:assert/strict'
import {printPieces20261025} from './printLayout20261025.js'
import {buildPrintPatternAppearance20261025 as appearance} from './printPatternAppearance20261025.js'
import {sampleInternalCurve} from '../components/nativeInternalCurve.js'

const panel=(id,x=0)=>({id,cutQuantity:id==='front'?2:1,polygon:{
  points:[[x,.1],[x+.2,.1],[x+.2,.4],[x,.4]],edges:['top','right','bottom','left'],curves:{},
  lines:[{id:'horizontal',points:[[x+.02,.2],[x+.18,.2]],tangents:[[0,0],[0,0]]},
    {id:'curved',points:[[x+.03,.25],[x+.17,.25]],tangents:[[.04,-.08],[.04,.08]]}],
  notches:{right:[{t:.5,depth_m:.005}]},seam_allowances:{top:.01}
}})
const source={template:{panels:[panel('front',.3),panel('back',-.5)]}}

test('front/back source panels and quantity copies retain aligned cm geometry',()=>{
  const before=structuredClone(source),pieces=printPieces20261025(source,{native:true})
  assert.equal(pieces.length,3)
  for(const piece of pieces){
    const result=appearance(source,piece,{native:true})
    assert.equal(result.internalLines.length,2)
    assert.equal(result.notches.length,1)
    assert.equal(result.seamAllowances.length,1)
    assert.deepEqual(result.internalLines[0].points[0].map(v=>+v.toFixed(8)),[2,10])
    assert.deepEqual(result.notches[0].points[0].map(v=>+v.toFixed(8)),[20,15])
    assert.equal(result.notches[0].points[1][0],result.notches[0].points[0][0]-.5)
    assert.ok(Math.abs(result.seamAllowances[0].points[0][1]+1)<1e-9)
  }
  assert.deepEqual(source,before)
  assert.deepEqual(appearance(source,pieces[0],{native:true}),appearance(source,pieces[1],{native:true}))
})

test('curved native internal line samples same cubic and coordinates as 2D board',()=>{
  const p=printPieces20261025(source,{native:true})[0],actual=appearance(source,p,{native:true}).internalLines[1].points
  const line=source.template.panels[0].polygon.lines[1]
  const expected=sampleInternalCurve(line.points[0],line.points[1],line.tangents[0],line.tangents[1])
    .map(q=>[(q[0]-.3)*100,(q[1]-.1)*100])
  assert.equal(actual.length,33)
  for(let i=0;i<actual.length;i++)for(let j=0;j<2;j++)assert.ok(Math.abs(actual[i][j]-expected[i][j])<1e-9)
  assert.ok(Math.min(...actual.map(q=>q[1]))<15)
})

test('no fabrication of graphics, unsupported legacy annotation or unknown source',()=>{
  const p=printPieces20261025(source,{native:true})[0]
  const graphicSource=structuredClone(source);graphicSource.template.panels[0].graphics=[{id:'unmapped'}]
  const result=appearance(graphicSource,p,{native:true})
  assert.deepEqual(result.graphics,[])
  assert.match(result.warnings[0],/Graphics omitted/)
  assert.equal(appearance({pieces:[{id:'front'}]},p).internalLines.length,0)
  assert.equal(appearance(source,{...p,sourcePanelId:'missing'},{native:true}).internalLines.length,0)
})
