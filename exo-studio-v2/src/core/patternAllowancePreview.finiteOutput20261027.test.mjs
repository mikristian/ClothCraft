import test from 'node:test'
import assert from 'node:assert/strict'
import {seamAllowancePreviewPoints} from './patternAllowancePreview.js'

test('extreme finite allowance offsets fail closed instead of leaking Infinity into CAD canvas',()=>{
  assert.deepEqual(seamAllowancePreviewPoints([[1e308,0],[1e308,1e308]],1e308),[])
  const finite=seamAllowancePreviewPoints([[0,0],[1e308,0]],1e308)
  assert.ok(finite.length===2 && finite.every(p=>p.every(Number.isFinite)))
})

test('duplicate input stations produce the same preview as the clean outline',()=>{
  const points=[[0,0],[.2,0],[.2,0],[.2,.2],[.2,.2]]
  const copy=structuredClone(points)
  assert.deepEqual(seamAllowancePreviewPoints(points,.01),seamAllowancePreviewPoints([[0,0],[.2,0],[.2,.2]],.01))
  assert.deepEqual(points,copy)
})
