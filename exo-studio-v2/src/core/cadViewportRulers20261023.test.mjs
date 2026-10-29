import test from 'node:test'
import assert from 'node:assert/strict'
import {calculateCadRuler20261023} from './cadViewportRulers20261023.js'

test('physical conversion is consistent between metre and centimetre SVG boards',()=>{
  const native=calculateCadRuler20261023({startWorld:0,spanWorld:1,worldUnitsPerPixel:.001,worldToMetres:1,units:'mm'})
  const draft=calculateCadRuler20261023({startWorld:0,spanWorld:100,worldUnitsPerPixel:.1,worldToMetres:.01,units:'mm'})
  assert.equal(native.ok,true)
  assert.deepEqual(native.ticks.map(t=>[t.positionPx,t.label]),draft.ticks.map(t=>[t.positionPx,t.label]))
  assert.equal(native.majorDisplay,100)
})
test('negative coordinates and inches retain correct world labels',()=>{
  const result=calculateCadRuler20261023({startWorld:-.5,spanWorld:1,worldUnitsPerPixel:.001,units:'in'})
  assert.equal(result.ok,true)
  assert.ok(result.ticks.some(t=>t.major&&Number(t.label)<0))
  assert.ok(result.ticks.some(t=>t.major&&Number(t.label)>0))
  assert.ok(result.ticks.every(t=>t.positionPx>=-1e-6&&t.positionPx<=1000+1e-6))
})
test('invalid scales and impractical density fail closed',()=>{
  assert.equal(calculateCadRuler20261023({startWorld:NaN,spanWorld:1,worldUnitsPerPixel:.01}).ok,false)
  assert.equal(calculateCadRuler20261023({startWorld:0,spanWorld:1,worldUnitsPerPixel:0}).ok,false)
  assert.equal(calculateCadRuler20261023({startWorld:0,spanWorld:1,worldUnitsPerPixel:.01,units:'parsec'}).ok,false)
})
