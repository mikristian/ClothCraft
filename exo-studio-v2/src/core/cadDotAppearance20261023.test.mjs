import test from 'node:test'
import assert from 'node:assert/strict'
import {cadDotStep20261023,cadColor20261023} from './cadDotAppearance20261023.js'
test('native and draft editors choose the same physical grid stations',()=>{
  assert.equal(cadDotStep20261023(.001,1),cadDotStep20261023(.1,.01)/100)
  assert.ok(cadDotStep20261023(.0001,1)<cadDotStep20261023(.01,1))
})
test('invalid settings never produce renderable SVG geometry or styles',()=>{
  assert.equal(cadDotStep20261023(0),null)
  assert.equal(cadDotStep20261023(Infinity),null)
  assert.equal(cadColor20261023('url(javascript:alert(1))','#174e39'),'#174e39')
  assert.equal(cadColor20261023('#224488','#000000'),'#224488')
})
