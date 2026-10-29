import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {gradeProject} from './grading.js'
import {projectToDxf} from './dxf.js'
import {preflightPhysicalCutOverlap20261023_2000 as check} from './physicalCutOverlapPreflight20261023_2000.mjs'

function wire(polygons) {
  const lines=['0','SECTION','2','ENTITIES']
  for(const [index,points] of polygons.entries()) {
    lines.push('0','LWPOLYLINE','8','CUT_'+index,'90',String(points.length),'70','1')
    for(const [x,y] of points) lines.push('10',String(x),'20',String(y))
  }
  return [...lines,'0','ENDSEC','0','EOF',''].join('\n')
}
const box=(a,b,c,d)=>[[a,b],[c,b],[c,d],[a,d]]
test('physical overlap detects crossing, containment, coincidence and reversed polygon',()=>{
  const base=box(0,0,5,5)
  for(const other of [box(4,2,8,8),box(1,1,2,2),base,[...base].reverse()]) {
    const result=check(wire([base,other]))
    assert.equal(result.ok,false,JSON.stringify(result))
    assert.equal(result.overlaps.length,1)
    assert.equal(result.manufacturingApproved,false)
  }
})
test('boundary contacts and disjoint shapes have no interior overlap',()=>{
  for(const other of [box(5,0,10,5),box(5,5,10,10),box(5.001,0,10,5)]) {
    const result=check(wire([box(0,0,5,5),other]))
    assert.equal(result.ok,true,JSON.stringify(result))
    assert.equal(result.overlaps.length,0)
  }
})
test('malformed DXF and invalid CUT outlines fail closed',()=>{
  for(const source of [
    '0\nSECTION\n2\nENTITIES\n0\nLWPOLYLINE\n8\nCUT_X\n90',
    wire([[[0,0],[1,0],[2,0]]]),
    wire([[[0,0],[2,2],[0,2],[2,0]]]),
    wire([box(0,0,1,1)]).replace('70\n1','70\n0'),
    wire([box(0,0,1,1)]).replace('10\n0','10\nNaN'),
    wire([box(0,0,1,1)]).replace('90\n4','90\n3'),
    wire([box(0,0,1,1)]).replace('0\nEOF\n',''),
    wire([box(0,0,1,1),box(2,0,3,1)]).replace('CUT_1','CUT_0'),
    wire([Array.from({length:4097},(_,i)=>[Math.cos(2*Math.PI*i/4097),Math.sin(2*Math.PI*i/4097)])]),
  ]) {
    const result=check(source)
    assert.equal(result.ok,false,JSON.stringify(result))
    assert.equal(result.diagnostics[0].code,'INVALID_CUT_DXF')
  }
})
test('actual six graded Foundation Tee manufacturing exports',()=>{
  const project=createTeeTemplate()
  assert.deepEqual(project.grading.sizes,['XS','S','M','L','XL','XXL'])
  for(const size of project.grading.sizes) {
    const graded=gradeProject(project,size)
    const result=check(projectToDxf(graded,size,{cutlineMode:'manufacturing'}))
    assert.equal(result.contourCount,4,JSON.stringify({size,result}))
    assert.equal(result.ok,true,JSON.stringify({size,result}))
  }
})
test('6cm seam allowance packed rectangles reveal real exporter physical CUT overlap',()=>{
  const base=createTeeTemplate()
  const rectangle=(name,id)=>({
    ...structuredClone(base.pieces[0]),id,name,
    points:[{x:0,y:0},{x:20,y:0},{x:20,y:20},{x:0,y:20}],
    curves:{},seamAllowance:6,edgeSeamAllowances:{},
    notches:[],internalLines:[],buttonholes:[],
  })
  const project={...base,pieces:[rectangle('Packing A','packing-a'),rectangle('Packing B','packing-b')],seams:[]}
  let source
  try {source=projectToDxf(project,'M',{cutlineMode:'manufacturing'})}
  catch(error) {
    assert.match(String(error?.message),/overlap|packing|spacing|unsafe|cut/i)
    return
  }
  const result=check(source)
  assert.equal(result.contourCount,2,JSON.stringify(result))
  assert.equal(result.ok,false,JSON.stringify(result))
  assert.equal(result.overlaps.length,1)
})
