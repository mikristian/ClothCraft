import test from 'node:test'
import assert from 'node:assert/strict'
import {curveDraftDimensions} from './patternCurveDrafting.js'

const hugePolygon=()=>({
  edges:['base','rise','return'],
  points:[[0,0],[1e308,0],[1e308,1]],
})

test('large finite drafting coordinates never produce nonfinite dimension annotations',()=>{
  const polygon=hugePolygon()
  const rows=curveDraftDimensions(polygon,{samples:64})
  assert(rows.length>0,'valid measurable edges should remain visible')
  for(const row of rows){
    assert(Number.isFinite(row.length),`${row.edge}: finite length`)
    assert(row.midpoint.every(Number.isFinite),`${row.edge}: finite label midpoint`)
    assert(Object.values(row.bounds).every(Number.isFinite),`${row.edge}: finite bounds`)
  }
  assert.deepEqual(polygon,hugePolygon(),'measurement must not mutate source geometry')
})

test('invalid midpoint cannot leak from a valid-length extreme diagonal',()=>{
  const rows=curveDraftDimensions(hugePolygon(),{samples:64})
  assert.equal(rows.some(row=>row.edge==='return'),false)
  assert(rows.some(row=>row.edge==='rise'),'unaffected edge should still be measured')
})

test('ordinary curved dimension annotations remain complete',()=>{
  const polygon={edges:['curve','straight','closing'],points:[[0,0],[1,0],[1,1]],curves:{curve:[[.2,.3],[.8,.3]]}}
  const rows=curveDraftDimensions(polygon,{samples:64})
  assert.equal(rows.length,3)
  assert(rows.find(row=>row.edge==='curve').length>1)
  assert(rows.every(row=>row.midpoint.every(Number.isFinite)))
})
