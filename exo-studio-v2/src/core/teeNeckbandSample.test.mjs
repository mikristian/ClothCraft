import test from 'node:test'
import assert from 'node:assert/strict'
import {unzipSync,strFromU8} from 'fflate'
import {createDefaultProject} from '../data/defaultProject.js'
import {createTeeTemplate} from '../data/templates.js'
import {edgeLength} from './project.js'
import {gradeProject} from './grading.js'
import {createTeeNeckbandSampleSet} from './teeNeckbandSample.js'
import {buildFactoryPackageFiles,buildFactoryPackageZip} from './factoryPackage.js'
import {inspectIndustrialPatterns} from './industrialPatternQA.js'
import {inspectGradedNotchPairs} from './industrialNotchQA.js'

const initial=()=>createTeeTemplate()

test('separate rib neckband proposals derive correct physical dimensions from each graded neckline',()=>{
 const tee=initial(),before=structuredClone(tee)
 const proposals=createTeeNeckbandSampleSet(tee)
 assert.deepEqual(proposals.sizes,tee.grading.sizes)
 assert.equal(proposals.rows.length,6)
 assert.equal(proposals.factoryCertified,false)
 assert.equal(proposals.requiresExternalSewingAndMaterialApproval,true)
 for(let index=0;index<6;index++){
  const row=proposals.rows[index],size=tee.grading.sizes[index],graded=gradeProject(tee,size)
  // Independently measure the actual graded neckline edges 9/10/11.
  const correct=['front','back'].reduce((sum,id)=>{
   const piece=graded.pieces.find(p=>p.id===id)
   return sum+[9,10,11].reduce((part,e)=>part+edgeLength(piece,e),0)
  },0)
  assert.equal(row.size,size)
  assert(Math.abs(row.necklineCm-correct)<1e-8)
  assert(Math.abs(row.proposedCutLengthCm-(correct*.87+2))<1e-8)
  assert.equal(row.proposedCutWidthCm,4.6)
  assert.deepEqual(row.piece.points.map(p=>p.y),[0,0,4.6,4.6])
  assert.equal(row.physicallySampled,false)
  assert.equal(row.ribMaterialStretchVerified,false)
  assert.equal(row.stage,'experimental_cut_proposal_not_approved')
  assert(row.dxf.includes('COORDINATES_MM'))
  assert(row.dxf.includes('CUT_RIB_NECKBAND_CUT_DEVELOPMENT_'))
  assert(!/(?:NaN|Infinity)/.test(row.dxf))
  if(index)assert(row.proposedCutLengthCm>proposals.rows[index-1].proposedCutLengthCm)
 }
 assert.deepEqual(tee,before,'creating an addendum must not mutate the authored garment')
})

test('sample ZIP holds all six labelled addenda without counting proposals as approved production pieces',()=>{
 const tee=initial()
 const files=buildFactoryPackageFiles(tee)
 const prefix='tee-development/neckband-proposal'
 const dxfFiles=Object.keys(files).filter(key=>key.startsWith(prefix)&&key.endsWith('.dxf'))
 assert.equal(dxfFiles.length,6)
 const note=JSON.parse(strFromU8(files[`${prefix}.json`]))
 assert.equal(note.factoryCertified,false)
 assert.equal(note.releaseStatus,'NOT_APPROVED_FOR_CUTTING_OR_BULK_PRODUCTION')
 assert.equal(note.rows.length,6)
 assert(note.limitations.some(item=>item.includes('NOT counted')))
 const summary=strFromU8(files['pattern-pieces.csv'])
 assert(!summary.includes('rib-neckband-XS'))
 const manifest=JSON.parse(strFromU8(files['manifest.json']))
 assert.equal(manifest.files.filter(key=>key.startsWith(prefix)&&key.endsWith('.dxf')).length,6)
 const qa=JSON.parse(strFromU8(files['industrial-pattern-qa.json']))
 assert.equal(qa.blockers,0)
 const notches=JSON.parse(strFromU8(files['industrial-notch-qa.json']))
 assert.equal(notches.checks.length,24)
 assert.equal(notches.blockers,0)
 const cutlines=JSON.parse(strFromU8(files['industrial-cutline-qa.json']))
 assert.equal(cutlines.checks.length,24)
 assert.equal(cutlines.blockers,0)
 assert.equal(strFromU8(files['industrial-cutline-areas.csv']).split('\n').length,25)
 const garmentM=strFromU8(files['patterns/foundation-tee-first-fit-test-m.dxf'])
 assert.match(garmentM,/CUT_LAYER_IS_PHYSICAL_ALLOWANCE_OUTLINE_STITCH_IS_SEWLINE_EXPLICIT_NOTCHES_ONLY/)
 assert.match(garmentM,/STITCH_FRONT/)
 const notchCsv=strFromU8(files['industrial-notch-walk.csv'])
 assert.equal(notchCsv.split('\n').length,25)
 const recipients=JSON.parse(strFromU8(files['factory-sample-approval-gate.json']))
 assert.equal(recipients.factoryCertified,false)
 assert.equal(recipients.status,'blocked')
 assert.equal(inspectGradedNotchPairs(tee).blockers,0)
 const zip=unzipSync(buildFactoryPackageZip(tee))
 assert.deepEqual(JSON.parse(strFromU8(zip[`${prefix}.json`])),note)
})

test('legacy default shell is unchanged, factory QA still reports its 44 real seam construction errors',()=>{
 const shell=createDefaultProject(),before=structuredClone(shell)
 assert.throws(()=>createTeeNeckbandSampleSet(shell),/Foundation Tee/)
 assert.equal(inspectIndustrialPatterns(shell).blockers,44)
 assert(!Object.keys(buildFactoryPackageFiles(shell)).some(path=>path.startsWith('tee-development/')))
 assert.deepEqual(shell,before)
})

test('invalid experimental rib dimensions, stale sizes or missing neckline reject without generating a cut proposal',()=>{
 const tee=initial()
 tee.productionSpec.neckband.proposedRibSewingRatio=NaN
 assert.throws(()=>createTeeNeckbandSampleSet(tee),/invalid experimental/i)
 const invalid=initial();invalid.grading.sizes=['M','M']
 assert.throws(()=>createTeeNeckbandSampleSet(invalid),/size run/i)
 const missing=initial();missing.pieces=missing.pieces.filter(p=>p.id!=='front')
 assert.throws(()=>createTeeNeckbandSampleSet(missing),/missing front\/back neckline/i)
})
