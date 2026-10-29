import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {gradeProject} from './grading.js'
import {projectToDxf} from './dxf.js'
import {strictCutDxfEnvelope20261023_2053 as check} from './strictCutDxfEnvelope20261023_2053.mjs'

const cut=['0','LWPOLYLINE','8','CUT_A','90','4','70','1','10','0','20','0','10','10','20','0','10','10','20','10','10','0','20','10']
const dxf=(entity=cut,pre=['0','SECTION','2','ENTITIES'],post=['0','ENDSEC','0','EOF'])=>[...pre,...entity,...post,''].join('\n')
const oldPolyline=(header=[],vertexExtra=[])=>[
  '0','POLYLINE','8','CUT_OLD','66','1','70','1',...header,
  ...[[0,0],[10,0],[10,10],[0,10]].flatMap(([x,y])=>['0','VERTEX','10',String(x),'20',String(y),...vertexExtra]),
  '0','SEQEND',
]
function expectInvalid(input, name) {
  const r=check(input)
  assert.equal(r.ok,false, name+': '+JSON.stringify(r))
  assert.equal(r.diagnostics[0]?.code,'INVALID_CUT_DXF',name)
  assert.equal(r.manufacturingApproved,false)
}
test('fixes five known envelope and planarity fail-open inputs',()=>{
  expectInvalid(dxf(cut,undefined,['0','EOF']),'missing ENDSEC')
  expectInvalid(dxf(cut,['0','ENDSEC','0','SECTION','2','ENTITIES']),'unmatched ENDSEC')
  expectInvalid(dxf(cut,undefined,['0','ENDSEC','0','ENDSEC','0','EOF']),'extra ENDSEC')
  expectInvalid(dxf([...cut,'38','3']),'nonzero elevation')
  expectInvalid(dxf([...cut,'210','0','220','1','230','0']),'nonplanar extrusion')
})
test('rejects malformed section boundaries, EOF suffix and duplicate ENTITIES',()=>{
  expectInvalid(dxf(['0','SECTION','2','HEADER',...cut]),'nested section')
  expectInvalid(dxf(cut,undefined,['0','ENDSEC','0','EOF','999','AFTER']),'EOF suffix')
  expectInvalid(dxf(cut,undefined,['0','ENDSEC','0','SECTION','2','ENTITIES','0','ENDSEC','0','EOF']),'duplicate ENTITIES')
  expectInvalid(dxf(cut,['0','SECTION','2','HEADER']),'missing ENTITIES')
})
test('rejects duplicate and unsupported CUT planarity values',()=>{
  for(const extras of [
    ['38','0','38','0'],['38','NaN'],['39','2'],['210','1'],
    ['220','Infinity'],['230','0'],['230','-1'],['230','1','230','1'],
  ]) expectInvalid(dxf([...cut,...extras]),extras.join(':'))
})
test('accepts canonical planar optional CUT metadata',()=>{
  const r=check(dxf([...cut,'38','0','39','0','210','0','220','0','230','1']))
  assert.equal(r.ok,true,JSON.stringify(r))
  assert.equal(r.contourCount,1)
  assert.equal(r.manufacturingApproved,false)
})
test('old-style CUT POLYLINE accepts planar geometry and rejects elevated or extruded geometry',()=>{
  for(const header of [[],['10','0','20','0','30','0'],['210','0','220','0','230','1']]) {
    const r=check(dxf(oldPolyline(header)))
    assert.equal(r.ok,true,JSON.stringify({header,r}))
    assert.equal(r.contourCount,1)
    assert.equal(r.manufacturingApproved,false)
  }
  for(const header of [
    ['30','5'],['30','NaN'],['30','0','30','0'],
    ['38','2'],['39','1'],['210','1'],['220','1'],['230','-1'],
  ]) expectInvalid(dxf(oldPolyline(header)),'old POLYLINE header '+header.join(':'))
  expectInvalid(dxf(oldPolyline([],['30','2'])),'old VERTEX nonzero z')
  expectInvalid(dxf(oldPolyline([],['70','64'])),'old VERTEX 3D flag')
  expectInvalid(dxf([...cut,'30','12']),'LWPOLYLINE unsupported z')
})
test('all six Foundation Tee manufacturing DXF exports pass experimental wrapper',()=>{
  const p=createTeeTemplate()
  assert.deepEqual(p.grading.sizes,['XS','S','M','L','XL','XXL'])
  for(const size of p.grading.sizes) {
    const r=check(projectToDxf(gradeProject(p,size),size,{cutlineMode:'manufacturing'}))
    assert.equal(r.ok,true,JSON.stringify({size,r}))
    assert.equal(r.contourCount,4,size)
    assert.equal(r.manufacturingApproved,false)
  }
})
