import test from 'node:test'
import assert from 'node:assert/strict'
import {strictCutDxfEnvelope20261023_2053 as strictCut} from './strictCutDxfEnvelope20261023_2053.mjs'
import {preflightPhysicalCutOverlap20261023_2000 as overlapCut} from './physicalCutOverlapPreflight20261023_2000.mjs'

// Disposable two-size, two-fabric marker. Four separated closed CUT contours;
// no production cutting instructions or factory records are created.
const rows=[['48','shell',0],['48','lining',20],['52','shell',40],['52','lining',60]]
const vertex=(x,y,extra=[])=>['0','VERTEX','10',String(x),'20',String(y),...extra]
const oldCut=(size,fabric,x,{headerFlags=1,header66='1',vertexFlags=0,vertexExtra=[]}={})=>[
  '0','POLYLINE','8',`CUT_${size}_${fabric}`,'66',String(header66),'70',String(headerFlags),
  ...[[x,0],[x+10,0],[x+10,10],[x,10]].flatMap(([vx,vy])=>vertex(vx,vy,['70',String(vertexFlags),...vertexExtra])),
  '0','SEQEND',
]
const lightCut=(size,fabric,x,flags=1)=>[
  '0','LWPOLYLINE','8',`CUT_${size}_${fabric}`,'90','4','70',String(flags),
  ...[[x,0],[x+10,0],[x+10,10],[x,10]].flatMap(([vx,vy])=>['10',String(vx),'20',String(vy)]),
]
const dxf=(mutate=()=>({}))=>[
  '0','SECTION','2','ENTITIES',
  ...rows.flatMap(([size,fabric,x],i)=>oldCut(size,fabric,x,i===0?mutate():{})),
  '0','ENDSEC','0','EOF','',
].join('\n')
const lightDxf=(flags=1)=>[
  '0','SECTION','2','ENTITIES',
  ...rows.flatMap(([size,fabric,x],i)=>lightCut(size,fabric,x,i===0?flags:1)),
  '0','ENDSEC','0','EOF','',
].join('\n')
const inspectors=[['strict envelope',strictCut],['physical overlap preflight',overlapCut]]
function assertRejected(source,label) {
  for(const [name,inspect] of inspectors) {
    const result=inspect(source)
    assert.equal(result.ok,false,`${label} (${name}): ${JSON.stringify(result)}`)
    assert.equal(result.manufacturingApproved,false,`${label} (${name})`)
    assert.equal(result.diagnostics?.[0]?.code,'INVALID_CUT_DXF',`${label} (${name})`)
  }
}

test('two-size two-fabric planar CUT study remains inspection-only',()=>{
  for(const source of [dxf(),dxf(()=>({headerFlags:129})),lightDxf(),lightDxf(129)]) {
    for(const [name,inspect] of inspectors) {
      const result=inspect(source)
      assert.equal(result.ok,true,`${name}: ${JSON.stringify(result)}`)
      assert.equal(result.contourCount,4,name)
      assert.equal(result.manufacturingApproved,false,name)
    }
  }
})

test('rejects old-style CUT header fit, spline, 3D, mesh and noncanonical flags',()=>{
  for(const flags of [0,2,3,5,9,17,33,65,128,-1,1.5,4294967297]) {
    assertRejected(dxf(()=>({headerFlags:flags})),`POLYLINE flags ${flags}`)
  }
})

test('rejects unsupported CUT VERTEX flags instead of flattening to XY',()=>{
  for(const flags of [1,2,8,16,32,64,128,-1,1.5,4294967296]) {
    assertRejected(dxf(()=>({vertexFlags:flags})),`VERTEX flags ${flags}`)
  }
})

test('rejects per-vertex 3D extrusion, elevation, thickness and duplicate metadata',()=>{
  for(const extra of [
    ['210','1'],['220','1'],['230','0'],['210','NaN'],
    ['210','0','210','0'],['220','0','220','0'],['230','1','230','1'],
    ['30','0.5'],['38','2'],['39','1'],
  ]) assertRejected(dxf(()=>({vertexExtra:extra})),`VERTEX metadata ${extra.join(':')}`)
})

test('rejects cross-layer CUT vertices and inconsistent POLYLINE sequence metadata',()=>{
  for(const [name,inspect] of inspectors) {
    const result=inspect(dxf(()=>({vertexExtra:['8','CUT_48_shell']})))
    assert.equal(result.ok,true,`${name}: same-layer VERTEX must remain supported: ${JSON.stringify(result)}`)
    assert.equal(result.manufacturingApproved,false)
  }
  for(const extra of [['8','OTHER'],['8','CUT_OTHER'],['8','CUT_48_shell','8','CUT_48_shell']]) {
    assertRejected(dxf(()=>({vertexExtra:extra})),`VERTEX layer ${extra.join(':')}`)
  }
  for(const value of ['0','2','NaN','']) {
    assertRejected(dxf(()=>({header66:value})),`POLYLINE vertices-follow ${value}`)
  }
  assertRejected(dxf().replace('66\n1\n70\n1','66\n1\n66\n1\n70\n1'),'duplicate POLYLINE vertices-follow')
})

test('rejects noncanonical LWPOLYLINE flags even if closure bit is present',()=>{
  for(const flags of [0,2,3,5,9,128,-1,1.5,4294967297]) {
    assertRejected(lightDxf(flags),`LWPOLYLINE flags ${flags}`)
  }
})
