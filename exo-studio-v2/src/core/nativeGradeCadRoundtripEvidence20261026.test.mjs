import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {gradeProject} from './grading.js'
import {projectToDxf} from './dxf.js'
import {sha256Bytes} from './sha256Bytes.js'
import {auditNativeGradeCadRoundtripEvidence20261026 as audit} from './nativeGradeCadRoundtripEvidence20261026.js'

const digest=value=>sha256Bytes(new TextEncoder().encode(value))
const setup=()=>{
  const project=createTeeTemplate()
  const returnedDxfs=Object.fromEntries(project.grading.sizes.map(size=>[
    size,projectToDxf(gradeProject(project,size),size,{cutlineMode:'manufacturing'})
  ]))
  const sourceSnapshot=JSON.stringify(project),ruleSnapshot=JSON.stringify(project.grading)
  return {project,returnedDxfs,sourceSnapshot,ruleSnapshot,
    declaredSourceSha256:digest(sourceSnapshot),declaredRuleSha256:digest(ruleSnapshot)}
}

test('all six actual parsed DXF geometries match with immutable source/rule manifest and no factory claim',()=>{
  const fixture=setup()
  const before=JSON.stringify(fixture.project)
  const report=audit(fixture.project,fixture)
  assert.equal(report.ok,true,JSON.stringify(report.issues))
  assert.equal(report.status,'LOCAL_SIX_SIZE_DXF_PARITY_ONLY')
  assert.equal(report.sizes.length,6)
  assert(report.sizes.every(row=>row.geometryEqual&&row.parsedEntityCount>0&&row.sourceDxfSha256===row.returnedDxfSha256))
  assert.equal(report.manifest.sourceSha256,fixture.declaredSourceSha256)
  assert.equal(report.manifest.ruleSha256,fixture.declaredRuleSha256)
  assert.equal(report.receivingCadVerified,false)
  assert.equal(report.factoryApproved,false)
  assert.equal(report.physicalSampleApproved,false)
  assert.equal(JSON.stringify(fixture.project),before)
})

test('detects returned DXF coordinate drift in any one of six sizes',()=>{
  const fixture=setup()
  const original=fixture.returnedDxfs.L
  const changed=original.replace(/(0\nVERTEX\n8\nCUT_FRONT_L\n10\n)([-\d.]+)/,
    (_,prefix,value)=>prefix+(Number(value)+2))
  assert.notEqual(changed,original)
  fixture.returnedDxfs.L=changed
  const result=audit(fixture.project,fixture)
  assert.equal(result.ok,false)
  assert(result.issues.some(x=>x.code==='GEOMETRY_MISMATCH'),JSON.stringify(result.issues))
  assert.equal(result.sizes.find(x=>x.size==='L').geometryEqual,false)
})

test('rejects missing six-size receiver artifact, swapped size label, altered notch and unsupported DXF geometry',()=>{
  for(const mode of ['missing','label','notch','bulge']){
    const fixture=setup()
    if(mode==='missing')delete fixture.returnedDxfs.XS
    if(mode==='label')fixture.returnedDxfs.S=fixture.returnedDxfs.S.replace('GARMENT_STUDIO_SIZE S','GARMENT_STUDIO_SIZE L')
    if(mode==='notch'){
      fixture.project.pieces[0].notches=[{id:'a',edgeIndex:0,t:.5,type:'single',depthCm:.3}]
      const updated=setup()
      updated.project.pieces[0].notches=[{id:'a',edgeIndex:0,t:.5,type:'single',depthCm:.3}]
      for(const size of updated.project.grading.sizes)updated.returnedDxfs[size]=projectToDxf(gradeProject(updated.project,size),size,{cutlineMode:'manufacturing'})
      updated.sourceSnapshot=JSON.stringify(updated.project)
      updated.ruleSnapshot=JSON.stringify(updated.project.grading)
      updated.declaredSourceSha256=digest(updated.sourceSnapshot)
      updated.declaredRuleSha256=digest(updated.ruleSnapshot)
      const old=updated.returnedDxfs.M
      updated.returnedDxfs.M=old.replace(/(0\nLINE\n8\nNOTCH_FRONT\n10\n)([-\d.]+)/,(_,head,val)=>head+(Number(val)+1))
      assert.notEqual(updated.returnedDxfs.M,old)
      const report=audit(updated.project,updated)
      assert.equal(report.ok,false)
      assert(report.issues.some(x=>x.code==='GEOMETRY_MISMATCH'),JSON.stringify(report.issues))
      continue
    }
    if(mode==='bulge')fixture.returnedDxfs.M=fixture.returnedDxfs.M.replace('0\nVERTEX\n8\nCUT_FRONT_M\n10','0\nVERTEX\n8\nCUT_FRONT_M\n42\n0.25\n10')
    const report=audit(fixture.project,fixture)
    assert.equal(report.ok,false,mode)
    assert(report.issues.length>0)
  }
})

test('stale source or grading-rule revision and forged hash pins are rejected before geometry comparison',()=>{
  const original=setup()
  for(const mutate of [
    f=>{f.project.grading.rules={...f.project.grading.rules, injected:1}},
    f=>{f.project.revision='stale-other-revision'},
    f=>{f.declaredRuleSha256='0'.repeat(64)},
    f=>{f.declaredSourceSha256='0'.repeat(64)},
  ]){
    const fixture=setup()
    mutate(fixture)
    const report=audit(fixture.project,fixture)
    assert.equal(report.ok,false)
    assert(report.issues.some(x=>x.code==='PROVENANCE_REJECTED'))
    assert.equal(report.receivingCadVerified,false)
  }
  assert.equal(original.project.grading.sizes.length,6)
})
