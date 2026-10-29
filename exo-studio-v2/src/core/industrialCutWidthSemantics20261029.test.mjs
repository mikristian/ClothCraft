import test from 'node:test'
import assert from 'node:assert/strict'
import {strictCutDxfEnvelope20261023_2053 as strictCut} from './strictCutDxfEnvelope20261023_2053.mjs'
import {preflightPhysicalCutOverlap20261023_2000 as overlapCut} from './physicalCutOverlapPreflight20261023_2000.mjs'

// Disposable two-size/two-fabric garment. First two centerline contours have
// a 0.5 mm gap: a 1 mm-wide DXF stroke would occupy that gap, but our polygon
// inspector does not model stroke width. Never authorize cutting from this test.
const pieces=[['48','shell',0],['48','lining',10.5],['52','shell',40],['52','lining',60]]
const corners=x=>[[x,0],[x+10,0],[x+10,10],[x,10]]
const envelope=entities=>['0','SECTION','2','ENTITIES',...entities,'0','ENDSEC','0','EOF',''].join('\n')
const oldDxf=({headExtra=[],vertexExtra=[]}={})=>envelope(pieces.flatMap(([size,fabric,x],i)=>[
  '0','POLYLINE','8',`CUT_${size}_${fabric}`,'66','1','70','1',...(i===0?headExtra:[]),
  ...corners(x).flatMap(([vx,vy],j)=>[
    '0','VERTEX','10',String(vx),'20',String(vy),...(i===0&&j===0?vertexExtra:[]),
  ]),
  '0','SEQEND',
]))
const lightDxf=({headerExtra=[],vertexExtra=[],everyVertexExtra=[]}={})=>envelope(pieces.flatMap(([size,fabric,x],i)=>[
  '0','LWPOLYLINE','8',`CUT_${size}_${fabric}`,'90','4','70','1',...(i===0?headerExtra:[]),
  ...corners(x).flatMap(([vx,vy],j)=>[
    '10',String(vx),'20',String(vy),...(i===0&&j===0?vertexExtra:[]),...(i===0?everyVertexExtra:[]),
  ]),
]))
const inspectors=[['strict envelope',strictCut],['standalone physical CUT',overlapCut]]
function expectValid(source,description) {
  for (const [name,inspect] of inspectors) {
    const result=inspect(source)
    assert.equal(result.ok,true,`${description} / ${name}: ${JSON.stringify(result)}`)
    assert.equal(result.contourCount,4)
    assert.deepEqual(result.overlaps,[])
    assert.equal(result.manufacturingApproved,false)
  }
}
function expectInvalid(source,description) {
  for (const [name,inspect] of inspectors) {
    const result=inspect(source)
    assert.equal(result.ok,false,`${description} / ${name}: ${JSON.stringify(result)}`)
    assert.equal(result.diagnostics?.[0]?.code,'INVALID_CUT_DXF',`${description} / ${name}`)
    assert.equal(result.manufacturingApproved,false)
  }
}

test('disposable multi-size, multi-fabric zero-width CUT remains inspection-only',()=>{
  expectValid(oldDxf(),'old-style absent width')
  expectValid(oldDxf({headExtra:['40','0','41','0'],vertexExtra:['40','0','41','0']}),'explicit old-style zero width')
  expectValid(lightDxf(),'lightweight absent width')
  expectValid(lightDxf({headerExtra:['43','0'],vertexExtra:['40','0','41','0']}),'explicit lightweight zero width')
  expectValid(lightDxf({everyVertexExtra:['40','0','41','0']}),'zero widths repeated across different lightweight vertices')
})

test('old-style POLYLINE default widths cannot hide physical contour occupancy',()=>{
  for (const code of [40,41]) {
    for (const value of ['1','-0.5','NaN','Infinity','']) {
      expectInvalid(oldDxf({headExtra:[String(code),value]}),`POLYLINE group ${code} value ${value}`)
    }
    expectInvalid(oldDxf({headExtra:[String(code),'0',String(code),'0']}),`duplicate POLYLINE group ${code}`)
  }
})

test('old-style VERTEX widths cannot hide physical contour occupancy',()=>{
  for (const code of [40,41]) {
    for (const value of ['1','-0.5','NaN','Infinity','']) {
      expectInvalid(oldDxf({vertexExtra:[String(code),value]}),`VERTEX group ${code} value ${value}`)
    }
    expectInvalid(oldDxf({vertexExtra:[String(code),'0',String(code),'0']}),`duplicate VERTEX group ${code}`)
  }
})

test('LWPOLYLINE per-vertex and constant widths are not flattened to zero',()=>{
  for (const code of [40,41]) {
    for (const value of ['1','-1','NaN','Infinity','']) {
      expectInvalid(lightDxf({vertexExtra:[String(code),value]}),`LWPOLYLINE group ${code} value ${value}`)
    }
  }
  for (const value of ['1','-1','NaN','Infinity','']) {
    expectInvalid(lightDxf({headerExtra:['43',value]}),`LWPOLYLINE constant width ${value}`)
  }
  expectInvalid(lightDxf({headerExtra:['43','0','43','0']}),'duplicate LWPOLYLINE constant width')
  for (const code of [40,41]) {
    expectInvalid(lightDxf({vertexExtra:[String(code),'0',String(code),'0']}),`duplicate width ${code} on one LWPOLYLINE vertex`)
    expectInvalid(lightDxf({headerExtra:[String(code),'0']}),`orphan width ${code} before first LWPOLYLINE vertex`)
  }
})
