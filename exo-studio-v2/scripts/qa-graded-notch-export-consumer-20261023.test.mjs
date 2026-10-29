import test from 'node:test'
import assert from 'node:assert/strict'
import {createTemplateProject} from '../src/data/templates.js'
import {gradeProject} from '../src/core/grading.js'
import {projectToDxf} from '../src/core/dxf.js'
import {buildFactoryPackageFiles} from '../src/core/factoryPackage.js'
import {inspectManufacturingReleaseReadiness} from '../src/core/manufacturingReleaseReadiness.js'
import {getEdgeSeamAllowance} from '../src/core/project.js'
import {strFromU8} from 'fflate'

function withNotch() {
  const project=createTemplateProject('tee')
  const piece=project.pieces.find(p=>p.points.some((_,i)=>getEdgeSeamAllowance(p,i)>0.75))
  assert(piece,'expected an edge with adequate manufacturing notch clearance')
  const edgeIndex=piece.points.findIndex((_,i)=>getEdgeSeamAllowance(piece,i)>0.75)
  piece.notches=[{id:'consumer-probe',edgeIndex,t:0.37,type:'single',depthCm:0.3,x:1e8,y:-1e8}]
  return {project,pieceId:piece.id}
}

test('graded manufacturing DXF derives physical notch from edgeIndex/t, ignoring stale finite x/y cache',()=>{
  const {project,pieceId}=withNotch()
  const size=project.grading.sizes.at(-1)
  const graded=gradeProject(project,size)
  const stale=graded.pieces.find(p=>p.id===pieceId).notches[0]
  assert.equal(stale.edgeIndex,project.pieces.find(p=>p.id===pieceId).notches[0].edgeIndex)
  const baseline=projectToDxf(graded,size,{cutlineMode:'manufacturing'})
  assert.match(baseline,/NOTCH_/)
  stale.x=Number.NaN
  stale.y=Number.POSITIVE_INFINITY
  assert.equal(projectToDxf(graded,size,{cutlineMode:'manufacturing'}),baseline)
  stale.x=-900000
  stale.y=900000
  assert.equal(projectToDxf(graded,size,{cutlineMode:'manufacturing'}),baseline)
})

test('invalid notch arclength or unsafe physical depth does not yield approved factory geometry',()=>{
  const {project,pieceId}=withNotch()
  const piece=project.pieces.find(p=>p.id===pieceId)
  piece.notches[0].depthCm=999
  assert.throws(()=>projectToDxf(project,project.grading.baseSize,{cutlineMode:'manufacturing'}),/Unsafe manufacturing notch depth/)
  piece.notches[0].depthCm=0.3
  piece.notches[0].t=Number.NaN
  assert.throws(()=>projectToDxf(project,project.grading.baseSize,{cutlineMode:'manufacturing'}),/Invalid manufacturing DXF notch fraction/)
})

test('out-of-range authored notch is rejected instead of silently omitted by manufacturing DXF',()=>{
  const {project,pieceId}=withNotch()
  const piece=project.pieces.find(p=>p.id===pieceId)
  piece.notches[0].edgeIndex=piece.points.length+10
  const before=structuredClone(project)
  assert.throws(()=>projectToDxf(project,project.grading.baseSize,{cutlineMode:'manufacturing'}),/Invalid manufacturing DXF notch edgeIndex/)
  assert.deepEqual(project,before,'a rejected factory export must not mutate the authored garment')
  const release=inspectManufacturingReleaseReadiness(project)
  assert.equal(release.factoryCertified,false)
  assert.equal(release.factoryCuttingAuthorized,false)
})

test('factory ZIP DXF consumer stays consistent with direct graded export even with stale cached coordinates',()=>{
  const {project}=withNotch()
  const size=project.grading.sizes[0]
  const files=buildFactoryPackageFiles(project)
  const filenames=Object.keys(files).filter(name=>name.startsWith('patterns/')&&name.endsWith(`-${size.toLowerCase()}.dxf`))
  assert.equal(filenames.length,1)
  assert.equal(strFromU8(files[filenames[0]]),projectToDxf(gradeProject(project,size),size,{cutlineMode:'manufacturing'}))
  const release=JSON.parse(strFromU8(files['manufacturing-release-readiness.json']))
  assert.equal(release.factoryCertified,false)
  assert.equal(release.factoryCuttingAuthorized,false)
  assert.equal(release.bulkProductionAuthorized,false)
})

test('grade provenance and reference-only source cannot bypass factory certification',()=>{
  const {project}=withNotch()
  project.gradeProvenance={status:'DEVELOPMENT_ONLY_FACTORY_APPROVAL_REQUIRED',source:'consumer-probe'}
  const readiness=inspectManufacturingReleaseReadiness(project)
  assert(readiness.blockers.some(b=>b.code==='UNAPPROVED_GRADE_TABLE'))
  assert.equal(readiness.factoryCertified,false)
  assert.equal(readiness.factoryCuttingAuthorized,false)
  assert.equal(readiness.bulkProductionAuthorized,false)
  project.patternSource={referenceOnly:true}
  assert(inspectManufacturingReleaseReadiness(project).blockers.some(b=>b.code==='REFERENCE_ONLY_PATTERN'))
  assert.throws(()=>buildFactoryPackageFiles(project),/Factory package refused/)
})
