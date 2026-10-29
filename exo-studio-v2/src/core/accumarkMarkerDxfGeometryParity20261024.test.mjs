import test from 'node:test'
import assert from 'node:assert/strict'
import { createTeeTemplate } from '../data/templates.js'
import { gradeProject } from './grading.js'
import { projectToDxf } from './dxf.js'
import { buildFabricMarkers } from './marker.js'
import { auditMarkerDxfGeometryParity20261024 as audit } from './accumarkMarkerDxfGeometryParity20261024.mjs'

const source = () => {const p=createTeeTemplate();p.grading.sizes=['M'];return p}
function fixture(project=source()){
  const graded=gradeProject(project,'M')
  return {project,dxfBySize:{M:projectToDxf(graded,'M',{cutlineMode:'manufacturing',requireGradedGeometry:true})},markersBySize:{M:buildFabricMarkers(graded)}}
}
test('real DXF/marker parity reports quantitative geometric error, preserves project',()=>{
  const data=fixture(),before=structuredClone(data.project)
  const result=audit(data.project,data)
  assert.equal(result.sizes.length,1)
  assert.equal(result.checkedPlacements,data.markersBySize.M.main?.placements.length ?? Object.values(data.markersBySize.M).reduce((n,m)=>n+m.placements.length,0))
  assert.ok(result.measurements.every(m=>Number.isFinite(m.hausdorffCm)&&Number.isFinite(m.areaDifferenceCm2)))
  assert.deepEqual(data.project,before)
  assert.equal(result.factoryApproved,false)
})
test('perturbed exact DXF CUT is detected',()=>{
  const data=fixture(),first=data.dxfBySize.M.indexOf('\n10\n')
  assert.ok(first>0)
  const match=/((?:\n0\nPOLYLINE\n)[\s\S]*?\n0\nVERTEX\n[\s\S]*?\n10\n)([-+\d.eE]+)/.exec(data.dxfBySize.M)
  assert.ok(match)
  data.dxfBySize.M=data.dxfBySize.M.replace(match[0],match[1]+String(Number(match[2])+90))
  assert.ok(audit(data.project,data).issues.some(x=>x.code==='CUT_MARKER_GEOMETRY_MISMATCH'))
})
test('perturbed placement contour, unplaced pieces, and overlapping placement are refused',()=>{
  const data=fixture(),marker=Object.values(data.markersBySize.M)[0]
  marker.placements[0].outline[0].x+=2
  assert.ok(audit(data.project,data).issues.some(x=>x.code==='CUT_MARKER_GEOMETRY_MISMATCH'))
  marker.unusedPieces=1
  assert.ok(audit(data.project,data).issues.some(x=>x.code==='UNUSED_MARKER_PIECES'))
})
test('missing exact DXF refuses rather than recreating bytes',()=>{
  const data=fixture();delete data.dxfBySize.M
  assert.ok(audit(data.project,data).issues.some(x=>x.code==='MISSING_EXACT_DXF'))
})
test('all six Foundation Tee sizes achieve measured independent CUT to marker parity',()=>{
  const project=createTeeTemplate(),dxfBySize={}
  for(const size of project.grading.sizes)dxfBySize[size]=projectToDxf(gradeProject(project,size),size,{cutlineMode:'manufacturing',requireGradedGeometry:true})
  const result=audit(project,{dxfBySize})
  assert.equal(result.ok,true,JSON.stringify(result.issues))
  assert.equal(result.sizes.length,6)
  assert.equal(result.checkedPlacements,24)
  assert.ok(Math.max(...result.measurements.map(m=>m.hausdorffCm))<0.08)
  assert.equal(result.factoryApproved,false)
})
test('unsupported CUT entities and duplicate CUT piece names fail closed',()=>{
  const data=fixture()
  const unsupported='\n0\nLINE\n8\nCUT_FAKE_M\n10\n1\n20\n1\n11\n2\n21\n2'
  data.dxfBySize.M=data.dxfBySize.M.replace('\n0\nENDSEC\n0\nEOF',unsupported+'\n0\nENDSEC\n0\nEOF')
  assert.ok(audit(data.project,data).issues.some(x=>x.code==='INVALID_DXF'))
  const dup=fixture()
  dup.project.pieces[1].name=dup.project.pieces[0].name
  assert.ok(audit(dup.project,dup).issues.some(x=>x.code==='AMBIGUOUS_PIECE_NAME'))
})
test('missing instance and physically overlapping placements fail closed',()=>{
  const data=fixture(),marker=Object.values(data.markersBySize.M)[0]
  assert.ok(marker.placements.length>=2)
  marker.placements[1].outline=structuredClone(marker.placements[0].outline)
  assert.ok(audit(data.project,data).issues.some(x=>x.code==='OVERLAPPING_MARKER_PLACEMENTS'),'identical positive-area contours must overlap')
  marker.placements[1].outline=structuredClone(marker.placements[0].outline).map(p=>({x:p.x+0.1,y:p.y+0.1}))
  const issues=audit(data.project,data).issues
  assert.ok(issues.some(x=>x.code==='OVERLAPPING_MARKER_PLACEMENTS'),JSON.stringify(issues))
  marker.placements.pop()
  assert.ok(audit(data.project,data).issues.some(x=>x.code==='MISSING_INSTANCE'))
})
test('duplicate DXF units, missing EOF, bulged CUT vertex, and tampered marker gap fail closed',()=>{
  const data=fixture(),base=data.dxfBySize.M
  for(const changed of [
    base.replace('\n9\n$INSUNITS','\n9\n$INSUNITS\n70\n1\n9\n$INSUNITS'),
    base.replace(/\n0\nEOF\s*$/,''),
    base.replace(/(\n0\nVERTEX\n8\nCUT_[^\n]+\n)/,'$1'+'42\n0.5\n'),
  ]){
    assert.notEqual(changed,base)
    data.dxfBySize.M=changed
    assert.ok(audit(data.project,data).issues.some(x=>x.code==='INVALID_DXF'))
  }
  data.dxfBySize.M=base
  Object.values(data.markersBySize.M)[0].gap=0.01
  assert.ok(audit(data.project,data).issues.some(x=>x.code==='MARKER_SETTINGS_MISMATCH'))
})
test('DXF project and size metadata must match uniquely as group 999 comments',()=>{
  const data=fixture(),original=data.dxfBySize.M
  const projectId=data.project.id||'untitled'
  for(const tampered of [
    original.replace(`GARMENT_STUDIO_PROJECT ${projectId}`,'GARMENT_STUDIO_PROJECT other-project'),
    original.replace(`GARMENT_STUDIO_SIZE M`,'GARMENT_STUDIO_SIZE XS'),
    original.replace(`999\nGARMENT_STUDIO_PROJECT ${projectId}`,`999\nGARMENT_STUDIO_PROJECT ${projectId}\n999\nGARMENT_STUDIO_PROJECT ${projectId}`),
    original.replace('999\nGARMENT_STUDIO_SIZE M','999\nGARMENT_STUDIO_SIZE M\n999\nGARMENT_STUDIO_SIZE M'),
    original.replace(`999\nGARMENT_STUDIO_PROJECT ${projectId}`,'999\nGARMENT_STUDIO_PROJECT other-project'),
  ]){
    assert.notEqual(tampered,original)
    data.dxfBySize.M=tampered
    assert.ok(audit(data.project,data).issues.some(i=>i.code==='INVALID_DXF'),JSON.stringify(audit(data.project,data).issues))
  }
})
test('noninteger, negative, nonnumeric and clamped cut quantities are rejected',()=>{
  for(const quantity of [0,-1,1.5,100,'2','invalid',NaN,Infinity]){
    const data=fixture()
    data.project.pieces[0].cutQuantity=quantity
    const result=audit(data.project,data)
    assert.equal(result.ok,false,`cutQuantity=${String(quantity)}`)
    assert.ok(result.issues.some(i=>i.code==='INVALID_CUT_QUANTITY'),`cutQuantity=${String(quantity)}`)
  }
})
test('duplicate INSUNITS group 70 and duplicate CUT POLYLINE flags reject valid-first values',()=>{
  const data=fixture(),base=data.dxfBySize.M
  const attacks=[
    base.replace('9\n$INSUNITS\n70\n4','9\n$INSUNITS\n70\n4\n70\n1'),
    base.replace('9\n$INSUNITS\n70\n4','9\n$INSUNITS\n70\n4\n70\n4'),
    base.replace(/(0\nPOLYLINE\n8\nCUT_[^\n]+\n66\n1\n70\n1)/,'$1\n70\n0'),
    base.replace(/(0\nPOLYLINE\n8\nCUT_[^\n]+\n66\n1\n70\n1)/,'$1\n70\n1'),
  ]
  for(const tampered of attacks){
    assert.notEqual(tampered,base,'test must alter exact wire')
    data.dxfBySize.M=tampered
    const result=audit(data.project,data)
    assert.equal(result.ok,false,JSON.stringify(result.issues))
    assert.ok(result.issues.some(issue=>issue.code==='INVALID_DXF'),JSON.stringify(result.issues))
  }
})
