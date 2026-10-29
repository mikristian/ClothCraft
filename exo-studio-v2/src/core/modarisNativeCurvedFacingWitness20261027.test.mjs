import test from 'node:test'
import assert from 'node:assert/strict'
import {verifyNativeCurvedFacingPhysical20261027 as verify} from './modarisNativeCurvedFacingWitness20261027.js'

const sizes=['XS','S','M','L','XL','XXL']
const bad={project:{native_facing_dependency:{version:2},template:{panels:[],seams:[]},
  grade_run:{sizes,baseSize:'M',gradedTemplates:[]}},
  cutlines:{format:'exo-native-graded-cutlines.v1',sourceRevision:4,cuttingAuthorized:false,
    sizes:sizes.map(size=>({size,panels:[]}))},
  sewing:{format:'exo-native-six-size-sewn-balance-audit.v1',sourceRevision:4,
    factoryApproved:false,sizes:sizes.map(size=>({size,seams:[]}))},sourceRevision:4}

test('rejects absent real Rust project, caller-forged physical receipts and factory flags',()=>{
  assert.equal(verify().ok,false)
  assert.equal(verify(bad).ok,false)
  const altered=structuredClone(bad)
  altered.cutlines.cuttingAuthorized=true
  assert.equal(verify(altered).ok,false)
  const altered2=structuredClone(bad)
  altered2.sewing.factoryApproved=true
  assert.equal(verify(altered2).ok,false)
})

test('rejects missing physical source provenance, stale revisions and partial six-size grade records',()=>{
  const source=structuredClone(bad)
  source.project.native_facing_dependency.sourceTemplate={panels:[],seams:[]}
  source.project.grade_run.baseTemplate={panels:[],seams:[]}
  source.cutlines.sizes.pop()
  assert.equal(verify(source).ok,false)
  const stale=structuredClone(bad)
  stale.sourceRevision=5
  assert.equal(verify(stale).ok,false)
  const wrong=structuredClone(bad)
  wrong.project.grade_run.sizes[4]='XXXL'
  assert.equal(verify(wrong).ok,false)
})

test('never returns factory or licensed acceptance even for rejected candidate packets',()=>{
  const r=verify(bad)
  assert.equal(r.ok,false)
  assert.equal(r.nativeCurvedFacingPhysicalAccepted,false)
  assert.equal(r.factoryApproved,false)
  assert.equal(r.licensedModarisAccepted,false)
  assert.equal(r.cuttingAuthorized,false)
})
