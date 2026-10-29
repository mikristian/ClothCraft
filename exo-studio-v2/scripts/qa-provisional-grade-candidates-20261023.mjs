#!/usr/bin/env node
/** Isolated, reproducible development-only diagnostics for pending 501 and
 * imported CLO graded-pattern manufacturing gaps. No source pattern changes.
 * Never outputs a cut-authorized, factory-certified or installed garment.
 */
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {mkdirSync,writeFileSync} from 'node:fs'
import {resolve,dirname,join} from 'node:path'
import {create501JeansTemplate} from '../src/data/jeans501.js'
import {createTemplateProject} from '../src/data/templates.js'
import {canonicalizeCloMaleTshirtProject} from '../src/data/cloMaleTshirtCanonicalization.js'
import {inspectJeans501WaistGradeCandidate} from '../src/core/jeans501WaistGradeCandidate.js'
import {studyCloSmallSizeGrades} from '../src/core/cloSmallSizeGradeStudy.js'
import {inspectManufacturingReleaseReadiness} from '../src/core/manufacturingReleaseReadiness.js'

const out=resolve(process.argv.find(item=>item.startsWith('--out='))?.slice(6)||'docs/qa/graded-topology-20261023')
if(!out.includes('graded-topology-20261023'))throw new Error('Output must stay scoped to graded-topology-20261023 development folder')
mkdirSync(out,{recursive:true})
const save=(name,data)=>writeFileSync(join(out,name),JSON.stringify(data,null,2)+'\n')
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex')

const jeans=create501JeansTemplate()
const jeansBefore=hash(jeans)
const candidate=inspectJeans501WaistGradeCandidate(jeans)
assert.equal(hash(jeans),jeansBefore)
assert.equal(candidate.status,'BLOCKED')
assert.equal(candidate.remainingSeamBlockers,10)
assert.equal(candidate.rows.filter(row=>row.applied).length,20)
assert.equal(candidate.originalIndustrial.blockers,30)
assert.equal(candidate.originalCutlines.blockers,0)

const candidateDetails=Object.fromEntries(Object.entries(candidate.snapshots).map(([size,snapshot])=>{
  assert.equal(snapshot.gradeProvenance?.approved,false)
  assert.equal(snapshot.gradeProvenance?.status,'DEVELOPMENT_ONLY_FACTORY_APPROVAL_REQUIRED')
  assert.equal(snapshot.patternSource?.referenceOnly,true)
  const release=inspectManufacturingReleaseReadiness(snapshot)
  assert.equal(release.factoryCertified,false)
  assert.equal(release.factoryCuttingAuthorized,false)
  assert(release.blockers.some(row=>row.code==='UNAPPROVED_GRADE_TABLE'))
  return [size,{gradeProvenance:snapshot.gradeProvenance,
    seams:candidate.rows.filter(row=>row.size===size).map(({size:omit,...row})=>row),
    industrialBlockers:candidate.checks[size].industrial.blockers,
    cutlineBlockers:candidate.checks[size].cutlines.blockers,
    engineeringRelease:release.status,
    factoryCertified:false,
    referenceOnly:true}]
}))

save('jeans501-waist-yoke-provisional-size-run.json',{
  schema:'exo-jeans501-provisional-seam-matching.v1',
  originalSourceSha256:jeansBefore,originalTemplateId:jeans.templateId,
  declaredSizes:jeans.grading.sizes,baseSize:jeans.grading.baseSize,
  originalManufacturingReadiness:inspectManufacturingReleaseReadiness(jeans),
  originalIndustrialBlockers:candidate.originalIndustrial.blockers,
  provisionalWaistbandSeamPairsAligned:candidate.rows.filter(row=>row.applied).length,
  remainingYokeJunctionPairsBlocked:candidate.remainingSeamBlockers,
  results:candidateDetails,
  sourceModified:hash(jeans)!==jeansBefore,
  approved:false,factoryCertified:false,factoryCuttingAuthorized:false,
  nextAction:'Patternmaker-approved yoke/seat junction grade table, full-size print, CAD import and physical sewn sample required; no bulk cutting.',
})

// Save each disposable graded reference so technicians can study changes
// without transforming the installed original or mistaking it for cut data.
for(const [size,snapshot] of Object.entries(candidate.snapshots)){
  assert(snapshot.patternSource.referenceOnly)
  save(`jeans501-${size}-GRADE_STUDY_REFERENCE_ONLY_DO_NOT_CUT.garment.json`,snapshot)
}

const imported=createTemplateProject('clo-male-tshirt')
const cloBefore=hash(imported)
const canonical=canonicalizeCloMaleTshirtProject(imported)
const study=studyCloSmallSizeGrades(canonical.project)
assert.equal(hash(imported),cloBefore)
assert.equal(canonical.removedPointCount,26)
assert.deepEqual(study.results.map(row=>[row.size,row.blockers]),
  [['XS',16],['S',16],['M',0],['L',0],['XL',0],['XXL',0]])
save('clo-tshirt-canonicalized-xs-s-crossings.json',{
  ...study,exactDuplicateVerticesRemoved:canonical.removedPointCount,
  indexMaps:canonical.indexMaps,
  originalSourceSha256:cloBefore,sourceModified:hash(imported)!==cloBefore,
  factoryCuttingAuthorized:false,
  nextAction:'Obtain licensed, patternmaker-approved XS/S point-grade rules for actual intersecting CUT/STITCH segments; source remains unmodified.',
})

const summary={result:'PASS',factoryCertified:false,originalSourceModified:false,
  jeans:{sizes:jeans.grading.sizes.length,originalBlockers:30,provisionalMatchedPairs:20,stillBlockedPairs:10,
    perSizeReadiness:'PROVISIONAL_UNAPPROVED',candidateDefaultInstalled:false},
  clo:{sizes:study.results.length,removedExactDuplicateVertices:26,blockedCrossingsXS:study.results[0].blockers,
    blockedCrossingsS:study.results[1].blockers,remainingSizeRunsPassing:['M','L','XL','XXL'],originalSourcePreserved:true},
  outputsFolder:out,
  limitations:['No approval to manufacture','No Gerber/Lectra/ASTM receiver validation','No physical sample or confirmed patternmaker ease','No modified default garment']}
save('SUMMARY.json',summary)
console.log(JSON.stringify(summary,null,2))
