#!/usr/bin/env node
/** Reproducible local-only unapproved grade-rule and CAD receiver handoff.
 * New output files only: never overwrites original garments or QA evidence.
 */
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {mkdirSync,writeFileSync,existsSync} from 'node:fs'
import {join} from 'node:path'
import {create501JeansTemplate} from '../src/data/jeans501.js'
import {createTemplateProject} from '../src/data/templates.js'
import {canonicalizeCloMaleTshirtProject} from '../src/data/cloMaleTshirtCanonicalization.js'
import {createJeans501ProvisionalIndustrialRuleTable} from '../src/core/jeans501CandidateGradeRuleTable.js'
import {studyCloSmallSizeCrossingRepair} from '../src/core/cloSmallSizeCrossingRepairStudy.js'
import {createRecipientCadExchangeProtocol} from '../src/core/recipientCadExchangeProtocol.js'
import {buildFactoryPackageZip} from '../src/core/factoryPackage.js'

const out='docs/qa/graded-topology-20261023'
mkdirSync(out,{recursive:true})
const save=(file,value)=>{
 const p=join(out,file)
 if(existsSync(p))throw new Error(`Refusing to overwrite previous handoff: ${p}`)
 writeFileSync(p,JSON.stringify(value,null,2)+'\n')
 return p
}
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex')
const originalJeans=create501JeansTemplate()
const sourceHash=digest(originalJeans)
const trial=createJeans501ProvisionalIndustrialRuleTable(originalJeans)
assert.equal(digest(originalJeans),sourceHash)
assert.equal(trial.modifiedPoints.length,24)
assert.deepEqual(trial.numerical,{sewingBlockers:0,cutlineBlockers:0,junctionBlockers:0})
assert.equal(trial.project.patternSource.referenceOnly,true)
assert.throws(()=>buildFactoryPackageZip(trial.project),/Factory package refused/)
const grades=trial.modifiedPoints.map(({pieceId,pointIndex})=>{
 const piece=trial.project.pieces.find(p=>p.id===pieceId)
 const p=piece.points[pointIndex]
 return {pieceId,pointIndex,baseW32:{x:p.x,y:p.y},
   gradeRule:p.industrialGradeRule,
   factoryApproved:false}
})
const p1=save('jeans501-six-size-industrial-grade-rule-study-DO-NOT-CUT.json',{
 schema:'exo-jeans501-candidate-rule-review.v1',sourceId:originalJeans.id,
 sourceSha256:sourceHash,sizes:trial.sizes,baseSize:'W32',
 changedPoints:grades,changedPieces:trial.project.gradeProvenance.changedPieces,
 numericalQA:trial.numerical,
 adjacentConstructionChanges:trial.adjacentConstructionChanges,
 status:'PATTERNMAKER_REVIEW_REQUIRED',
 outstanding:'Approve yoke seat/outseam/topstitch and physically measured waist/hip/rise/inseam POM; verify real received CAD and samples.',
 factoryCertified:false,factoryCuttingAuthorized:false,
})
const p2=save('jeans501-full-coordinated-grade-clone-REFERENCE-ONLY.garment.json',trial.project)
const recipient=createRecipientCadExchangeProtocol(originalJeans)
assert.equal(recipient.sizes.length,6)
const p3=save('jeans501-gerber-lectra-recipient-CAD-acceptance-PENDING.json',recipient)

const imported=createTemplateProject('clo-male-tshirt')
const importedHash=digest(imported)
const canonical=canonicalizeCloMaleTshirtProject(imported)
const crossing=studyCloSmallSizeCrossingRepair(canonical.project)
assert.equal(digest(imported),importedHash)
assert.equal(crossing.manufacturingExportAllowed,false)
const xs=crossing.results.find(item=>item.size==='XS')
const small=crossing.results.find(item=>item.size==='S')
assert.equal(xs.blockers,16)
assert.equal(small.blockers,16)
const p4=save('clo-small-size-crossing-vertex-map-REVIEW-REQUIRED.json',{
 sourceProjectId:imported.id,sourceSha256:importedHash,
 canonicalization:canonical.project.canonicalizationProvenance,
 crossingStudy:crossing,sourceModified:false,factoryCertified:false,
 correctionApplied:false,requiresPatternmakerGradeTable:true,
})
console.log(JSON.stringify({status:'PASS',jeans:{originalSourcePreserved:true,changedPoints:trial.modifiedPoints.length,
  sizes:trial.sizes.length,numerical:trial.numerical,installed:false,factoryApproved:false},
  clo:{sourcePreserved:true,XS:xs.blockers,S:small.blockers,correctionApplied:false},
  receiverCad:{vendorTestPerformed:false,actualGradeRulesApproved:false},
  files:[p1,p2,p3,p4],diskSafety:'no build/install; no existing file overwritten'},null,2))
