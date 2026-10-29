import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {gradeProject} from './grading.js'
import {inspectIndustrialPatterns} from './industrialPatternQA.js'
import {inspectGradedCutlines} from './industrialCutlineQA.js'
import {inspectGradedNotchPairs} from './industrialNotchQA.js'
import {inspectManufacturingReleaseReadiness} from './manufacturingReleaseReadiness.js'
import {writeSavedProject,readSavedProject} from './projectRestore.js'
import {buildGuardedFactoryPackageFiles20261023_2159} from './guardedFactoryCutPackage20261023_2159.mjs'

const sizes=['XS','S','M','L','XL','XXL']
const memoryStorage=()=>{const map=new Map();return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)}}

test('actual canonical source has four separately drafted panels, fourteen sewn seam pairs and complete six-size grading',()=>{
 const source=createTeeTemplate(),baseline=structuredClone(source)
 assert.deepEqual(source.grading.sizes,sizes)
 assert.deepEqual(source.pieces.map(piece=>piece.id).sort(),['back','front','sleeve-left','sleeve-right'])
 assert.equal(source.seams.length,14)
 for(const size of sizes){
  const graded=gradeProject(source,size)
  assert.equal(graded.pieces.length,4)
  assert(graded.pieces.every(piece=>piece.gradeSize===size))
  assert(graded.pieces.every(piece=>piece.points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))))
 }
 assert.equal(inspectIndustrialPatterns(source).blockers,0)
 assert.equal(inspectGradedCutlines(source).blockers,0)
 assert.equal(inspectGradedNotchPairs(source).status,'pass')
 assert.deepEqual(source,baseline)
})

test('actual saved canonical source reopens and reproduces graded curves, construction, and guarded exported bytes',()=>{
 const source=createTeeTemplate(),storage=memoryStorage()
 writeSavedProject(storage,'tee','tee-backup',source)
 const read=readSavedProject(storage,'tee','tee-backup')
 assert.equal(read.status,'primary')
 assert.deepEqual(read.project,source)
 for(const size of sizes) assert.deepEqual(gradeProject(read.project,size),gradeProject(source,size))
 const original=buildGuardedFactoryPackageFiles20261023_2159(source)
 const reopened=buildGuardedFactoryPackageFiles20261023_2159(read.project)
 assert.deepEqual(reopened,original)
 assert.equal(Object.keys(original).filter(name=>/^patterns\/[^/]+\.dxf$/.test(name)).length,6)
 const report=inspectManufacturingReleaseReadiness(read.project)
 assert.equal(report.factoryCertified,false)
 assert.equal(report.factoryCuttingAuthorized,false)
 assert.equal(report.bulkProductionAuthorized,false)
 assert(report.blockers.some(issue=>issue.code==='EXPERIMENTAL_NECKBAND'))
 assert(report.blockers.some(issue=>issue.code==='EXTERNAL_SAMPLE_EVIDENCE'))
})
