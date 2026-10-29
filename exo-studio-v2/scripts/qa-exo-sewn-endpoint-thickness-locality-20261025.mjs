import test from 'node:test'
import assert from 'node:assert/strict'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {auditNativeSewnEndpointThicknessLocality20261025 as audit} from
  '../src/core/backends/nativeSewnEndpointThicknessLocalityResearch20261025.js'

const fixture=()=>buildNativeSimulationPayload(createTemplateProject('tee'),
  {quality:'quality'})
const near=(actual,expected,tolerance=1e-6)=>
  assert.ok(Math.abs(actual-expected)<=tolerance,`expected ${actual} ~= ${expected}`)
const synthetic=(positions,sewn=true)=>({
  particles:positions.map(position=>({position})),
  pieces:[{id:'synthetic',particleIndices:[0,1,2,3,4,5],
    flatVerticesM:[[0,0,0],[1,0,0],[0,1,0],
      [3,0,0],[2,0,0],[3,1,0]],
    faces:[[0,1,2],[3,4,5]]}],
  constraints:sewn?[{type:'seam',a:0,b:3,seamId:'authored-seam'}]:[],
})

test('real Foundation Tee: 5 mm sewn-tip excision leaves two sub-1 mm contacts',()=>{
  const source=fixture(),before=JSON.stringify(source)
  const result=audit(source)
  assert.equal(result.totalIntersectionWarnings,6)
  assert.equal(result.witnessInventoryComplete,true)
  assert.equal(result.testedSewnEndpointWitnesses,6)
  assert.equal(result.outsideSewnNeighborhoodClearWitnesses,4)
  assert.equal(result.persistentOutsideSewnNeighborhoodContactWitnesses,2)
  assert.equal(result.allSampledWarningsClearOutsideExcision,false)
  assert.equal(result.originalStaticContactClear,false)
  for(const w of result.witnesses){
    assert.equal(w.faceA,37)
    assert.deepEqual(w.directSewingSeamIds,
      [w.pieceId==='sleeve-left'?'seam-sleeve-l-underarm':
        'seam-sleeve-r-underarm'])
    if(w.faceB===58){
      near(w.outsideSewnNeighborhoodDistanceMm,.8809686670634814)
      assert.equal(w.outsideSewnNeighborhoodClear,false)
    }else{
      assert.ok([64,117].includes(w.faceB))
      assert.ok(w.outsideSewnNeighborhoodDistanceMm>5)
      assert.equal(w.outsideSewnNeighborhoodClear,true)
    }
    assert.equal(w.contactVetoRetained,true)
  }
  assert.equal(result.excisedMaterialNeighborhoodVerified,false)
  assert.equal(result.fullFiniteThicknessCertified,false)
  assert.equal(result.physicalAcceptance,false)
  assert.equal(result.safeToAutoApply,false)
  assert.equal(JSON.stringify(source),before)
})

test('increasing the excision radius does not clear the original contact veto',()=>{
  const source=fixture(),before=JSON.stringify(source)
  const short=audit(source,{materialTipExcisionM:.001})
  const justBelow=audit(source,{materialTipExcisionM:.005675})
  const justAbove=audit(source,{materialTipExcisionM:.0057})
  const wide=audit(source,{materialTipExcisionM:.010})
  assert.equal(short.outsideSewnNeighborhoodClearWitnesses,4)
  assert.equal(short.persistentOutsideSewnNeighborhoodContactWitnesses,2)
  near(short.witnesses[0].outsideSewnNeighborhoodDistanceMm,
    .17619373341270844)
  near(justBelow.witnesses[0].outsideSewnNeighborhoodDistanceMm,
    .9998994371170494)
  near(justAbove.witnesses[0].outsideSewnNeighborhoodDistanceMm,
    1.0043042804523667)
  assert.equal(justBelow.outsideSewnNeighborhoodClearWitnesses,4)
  assert.equal(justAbove.outsideSewnNeighborhoodClearWitnesses,6)
  assert.equal(wide.outsideSewnNeighborhoodClearWitnesses,6)
  assert.equal(wide.allSampledWarningsClearOutsideExcision,true)
  near(wide.witnesses[0].outsideSewnNeighborhoodDistanceMm,
    1.7619373341269464)
  for(const report of [short,justBelow,justAbove,wide]){
    assert.equal(report.originalStaticContactClear,false)
    assert.equal(report.contactVetoRetained,true)
    assert.equal(report.authoredSewingProvenanceAuthenticated,false)
    assert.equal(report.excisedMaterialNeighborhoodVerified,false)
    assert.equal(report.physicalAcceptance,false)
  }
  assert.equal(JSON.stringify(source),before)
})

test('single sewn vertex touch is separated outside its material tip',()=>{
  const source=synthetic([[0,0,0],[1,0,0],[0,1,0],
    [0,0,0],[-1,0,0],[0,0,1]])
  const before=JSON.stringify(source),report=audit(source)
  assert.equal(report.totalIntersectionWarnings,1)
  assert.equal(report.testedSewnEndpointWitnesses,1)
  assert.equal(report.witnesses[0].locality,'outside-excised-sewn-tip-clear')
  near(report.witnesses[0].outsideSewnNeighborhoodDistanceMm,
    5.773502691896258)
  assert.equal(report.originalStaticContactClear,false)
  assert.equal(report.physicalAcceptance,false)
  assert.equal(JSON.stringify(source),before)
})

test('no authored direct seam means no claimed sewn-neighborhood localization',()=>{
  const source=synthetic([[0,0,0],[1,0,0],[0,1,0],
    [0,0,0],[-1,0,0],[0,0,1]],false)
  const before=JSON.stringify(source),report=audit(source)
  assert.equal(report.totalIntersectionWarnings,1)
  assert.equal(report.testedSewnEndpointWitnesses,0)
  assert.equal(report.witnesses[0].locality,'no-unique-direct-sewn-endpoint')
  assert.equal(report.witnesses[0].outsideSewnNeighborhoodClear,null)
  assert.equal(report.allSampledWarningsClearOutsideExcision,false)
  assert.equal(JSON.stringify(source),before)
})

test('missing, blank and duplicated direct seam IDs cannot count as provenance',()=>{
  const positions=[[0,0,0],[1,0,0],[0,1,0],
    [0,0,0],[-1,0,0],[0,0,1]]
  for(const seamId of [undefined,null,'','  ',0]){
    const source=synthetic(positions)
    source.constraints[0].seamId=seamId
    const before=JSON.stringify(source),report=audit(source)
    assert.equal(report.totalIntersectionWarnings,1)
    assert.equal(report.testedSewnEndpointWitnesses,0)
    assert.equal(report.witnesses[0].outsideSewnNeighborhoodClear,null)
    assert.equal(report.witnesses[0].locality,'no-unique-direct-sewn-endpoint')
    assert.equal(report.contactVetoRetained,true)
    assert.equal(JSON.stringify(source),before)
  }
  const source=synthetic(positions)
  source.constraints.push({...source.constraints[0]})
  const before=JSON.stringify(source),report=audit(source)
  assert.equal(report.testedSewnEndpointWitnesses,0)
  assert.equal(report.witnesses[0].locality,'no-unique-direct-sewn-endpoint')
  assert.equal(JSON.stringify(source),before)
})

test('coplanar overlapping triangles remain contact-rejected beyond sewn tip',()=>{
  const source=synthetic([[0,0,0],[1,0,0],[0,1,0],
    [0,0,0],[1,0,0],[0,1,0]])
  const before=JSON.stringify(source),report=audit(source)
  assert.equal(report.totalIntersectionWarnings,1)
  assert.equal(report.witnesses[0].locality,
    'contact-persists-outside-excised-sewn-tip')
  assert.equal(report.witnesses[0].outsideSewnNeighborhoodDistanceMm,0)
  assert.equal(report.originalStaticContactClear,false)
  assert.equal(JSON.stringify(source),before)
})

test('strict transverse piercings cannot be reclassified as sewn-tip clearance',()=>{
  const source=synthetic([[0,0,0],[1,0,0],[0,1,0],
    [.25,.25,-.1],[.25,.25,.1],[.8,.3,.1]])
  const before=JSON.stringify(source),report=audit(source)
  assert.equal(report.totalIntersectionWarnings,1)
  assert.equal(report.witnesses[0].locality,'strict-transverse-piercing')
  assert.equal(report.witnesses[0].outsideSewnNeighborhoodClear,null)
  assert.equal(report.originalStaticContactClear,false)
  assert.equal(JSON.stringify(source),before)
})

test('excision cannot consume an entire material edge and infer safety',()=>{
  const source=synthetic([[0,0,0],[1,0,0],[0,1,0],
    [0,0,0],[-1,0,0],[0,0,1]])
  source.pieces[0].flatVerticesM[1]=[.001,0,0]
  const before=JSON.stringify(source),report=audit(source)
  assert.equal(report.totalIntersectionWarnings,1)
  assert.equal(report.witnesses[0].locality,'insufficient-material-neighborhood')
  assert.equal(report.witnesses[0].outsideSewnNeighborhoodClear,null)
  assert.equal(report.originalStaticContactClear,false)
  assert.equal(JSON.stringify(source),before)
})

test('invalid work/clearance/excision budgets fail before claiming clearance',()=>{
  const source=fixture(),before=JSON.stringify(source)
  for(const materialTipExcisionM of [0,-1,.051,NaN,Infinity,'5',null])
    assert.throws(()=>audit(source,{materialTipExcisionM}),/material excision/)
  for(const clearanceM of [0,-1,.101,NaN,Infinity,'1',null])
    assert.throws(()=>audit(source,{clearanceM}),/clearance/)
  for(const maxPairs of [0,-1,5_000_001,NaN,1.5,'500',null])
    assert.throws(()=>audit(source,{maxPairs}),/work budget/)
  assert.equal(JSON.stringify(source),before)
})
