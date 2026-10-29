import test from 'node:test'
import assert from 'node:assert/strict'
import {verifyNativeNormalOffsetFacingPhysical20261027 as verify} from './modarisNativeTrueNormalFacingWitness20261027.js'

const sizes=['XS','S','M','L','XL','XXL']
const base={panels:[],seams:[]}
const packet=()=>({
  project:{template:structuredClone(base),native_facing_dependency:{version:3,sourceTemplate:structuredClone(base),
    depthM:.04,allowanceM:.01,parentPanelId:'front',parentEdgeId:'top',facingId:'facing_front'},
    grade_run:{baseSize:'M',sizes,baseTemplate:structuredClone(base),gradedTemplates:sizes.map(()=>structuredClone(base))}},
  cutlines:{format:'exo-native-graded-cutlines.v1',sourceRevision:5,cuttingAuthorized:false,
    sizes:sizes.map(size=>({size,panels:[],seams:[]}))},
  sewing:{format:'exo-native-six-size-sewn-balance-audit.v1',sourceRevision:5,factoryApproved:false,
    sizes:sizes.map(size=>({size,seams:[]}))},sourceRevision:5,
})
test('unverified v3 packet never grants manufacturing or factory release',()=>{
  for(const example of [undefined,{},packet()]){
    const reply=verify(example)
    assert.equal(reply.ok,false)
    assert.equal(reply.cuttingAuthorized,false)
    assert.equal(reply.factoryApproved,false)
    assert.equal(reply.licensedModarisAccepted,false)
  }
})
test('wrong source version, missing sizes and forged physical receipts refuse independently',()=>{
  const modifications=[
    p=>p.project.native_facing_dependency.version=2,
    p=>p.project.grade_run.sizes[2]='XXXL',
    p=>p.project.grade_run.gradedTemplates.pop(),
    p=>p.project.native_facing_dependency.sourceTemplate.panels.push({id:'forged'}),
    p=>p.sourceRevision=4,
    p=>p.cutlines.cuttingAuthorized=true,
    p=>p.sewing.factoryApproved=true,
    p=>p.cutlines.sizes.splice(1,1),
    p=>p.sewing.sizes.splice(1,1),
    p=>p.project.grade_run.baseSize='S',
    p=>p.project.native_facing_dependency.depthM=Infinity,
  ]
  for(const [i,mutation] of modifications.entries()){
    const candidate=packet();mutation(candidate)
    assert.equal(verify(candidate).ok,false,`Forged variant ${i} accepted`)
  }
})
