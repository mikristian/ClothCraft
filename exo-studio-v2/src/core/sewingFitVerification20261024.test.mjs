import test from 'node:test'
import assert from 'node:assert/strict'
import {inspectSewingFitVerification20261024 as inspect} from './sewingFitVerification20261024.js'

const fixture=()=>{
  const frames=5
  return {
    sourceVerified:true,
    solver:{ok:true,device:'GPU',backendType:'mac_native',pc2:{finite:true}},
    contact:{frames,allFramesAvatarIntersectionFree:true,
      allFramesSelfIntersectionFree:true,allFramesWithinStrainLimit:true,
      perFrame:Array.from({length:frames},(_,frame)=>({frame,
        avatarTriangleIntersectionPairs:0,clothSelfIntersectionPairs:0,
        maxPrincipalStretch:1.02,strainLimitViolatingFaces:0}))},
    sewing:{stitchedPairs:80,framesAnalyzed:frames,finalMeanGapCm:.1,finalMaxGapCm:.4,
      samples:Array.from({length:frames},(_,frame)=>({frame,meanCm:.1,maxCm:.4}))},
    ipcCcd:{framesAudited:frames,allTestedStepsCollisionFree:true,
      steps:Array.from({length:frames-1},(_,i)=>({fromFrame:i,toFrame:i+1,collisionFree:true}))},
    clearance:{framesMeasured:frames,
      final:{frame:frames-1,shoulder:{meanCm:1,p90Cm:2},torso:{meanCm:1.5}}},
  }
}
test('Idle and numerically successful native assembly cannot claim physical fit',()=>{
  assert.equal(inspect().status,'UNVERIFIED')
  const report=inspect({nativeResult:{fitAssessment:{status:'PASS'}},
    nativeAssembly:{status:'STAGING_REQUIRES_REPAIR'}})
  assert.equal(report.realTrajectoryEvidenceAccepted,false)
  assert.equal(report.factoryFitCertified,false)
  assert.ok(report.issues.some(s=>s.includes('initial cloth pose')))
})
test('Server summary alone cannot establish trajectory provenance',()=>{
  const report=inspect({ppfJob:{status:'done',summary:{fitAcceptance:{accepted:true}}}})
  assert.equal(report.status,'SOLVED_REQUIRES_VERIFICATION')
  assert.equal(report.ppfReportedAcceptance,true)
  assert.equal(report.realTrajectoryEvidenceAccepted,false)
  assert.equal(report.manufacturingApproved,false)
})
test('Complete physically checked trajectory is accepted as engineering evidence only',()=>{
  const report=inspect({evidence:fixture()})
  assert.equal(report.status,'EVIDENCE_ACCEPTED')
  assert.equal(report.trajectory.gate.accepted,true)
  assert.equal(report.manufacturingApproved,false)
  assert.equal(report.factoryFitCertified,false)
})
test('Missing source trace, swept CCD, actual crossings, and shoulder clearance all reject',()=>{
  const mutations=[
    e=>{e.sourceVerified=false},
    e=>{e.ipcCcd.steps[1].collisionFree=false},
    e=>{e.contact.perFrame[2].avatarTriangleIntersectionPairs=1},
    e=>{e.contact.perFrame[3].clothSelfIntersectionPairs=1},
    e=>{e.contact.perFrame.pop()},
    e=>{e.clearance.final.shoulder.p90Cm=5},
    e=>{e.sewing.finalMaxGapCm=2},
    e=>{e.solver.pc2.finite=false},
  ]
  for(const mutate of mutations){
    const e=fixture();mutate(e)
    const report=inspect({evidence:e})
    assert.equal(report.realTrajectoryEvidenceAccepted,false)
  }
})
test('Real PPF failure metrics reach Sewing without suppressing fit failure',()=>{
  const report=inspect({ppfJob:{status:'done',summary:{
    fitAcceptance:{accepted:false},contact:{maxAvatarIntersectionPairs:8,maxSelfIntersectionPairs:3},
  }}})
  assert.equal(report.realTrajectoryEvidenceAccepted,false)
  assert.ok(report.issues.some(s=>s.includes('Body intersections detected: 8')))
  assert.ok(report.issues.some(s=>s.includes('Fabric self-intersections detected: 3')))
})
