import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {inspectStandaloneNotchesAllSizes20261023 as inspect} from './standaloneNotchPreflight20261023.js'
import {gradeProject} from './grading.js'
import {projectToDxf} from './dxf.js'

function withNotch(notch) {
  const project = createTeeTemplate()
  for (const piece of project.pieces) piece.notches = []
  project.pieces[0].notches = [notch]
  return project
}

test('standalone physical notch is checked in every configured size without changing source', () => {
  const project = withNotch({id:'solo',edgeIndex:0,t:0.5,depthCm:0.3})
  const before = structuredClone(project)
  const audit = inspect(project)
  assert.equal(audit.blockers,0,JSON.stringify(audit.issues))
  assert.equal(audit.status,'pass')
  assert.equal(audit.checks.length,project.grading.sizes.length)
  assert.deepEqual(audit.checkedSizes,project.grading.sizes)
  assert.equal(audit.factoryCertified,false)
  assert.equal(audit.factoryDxfGeometryVerified,false)
  assert.deepEqual(project,before)
})

test('independent factory DXF oracle accepts the authored notch at every configured size', () => {
  const project = withNotch({id:'solo',edgeIndex:0,t:0.5,depthCm:0.3})
  for (const size of project.grading.sizes) {
    const dxf = projectToDxf(gradeProject(project,size),size,{cutlineMode:'manufacturing'})
    assert.match(dxf,/NOTCH_FRONT/,`No physical factory notch emitted for ${size}`)
  }
})

test('invalid unpaired edge index is reported with size, piece and notch identity', () => {
  const project = withNotch({id:'bad-edge',edgeIndex:999,t:0.5,depthCm:0.3})
  const audit = inspect(project)
  assert.equal(audit.status,'blocked')
  assert(audit.issues.some(i=>i.code==='INVALID_STANDALONE_NOTCH_EDGE' && i.size==='M' && i.pieceId===project.pieces[0].id && i.notchId==='bad-edge'))
  assert.equal(audit.factoryCuttingAuthorized,false)
})

test('invalid fraction, depth, unsafe allowance and corrupted cached pair are separate blockers', () => {
  const project = withNotch({id:'bad-values',edgeIndex:0,t:Infinity,depthCm:2,x:5})
  const audit = inspect(project)
  const codes = new Set(audit.issues.map(i=>i.code))
  for (const code of ['INVALID_STANDALONE_NOTCH_FRACTION','UNSAFE_STANDALONE_NOTCH_ALLOWANCE','INVALID_STANDALONE_NOTCH_CACHE']) {
    assert(codes.has(code),`${code} missing: ${JSON.stringify(audit.issues)}`)
  }
})

test('duplicate notch identities and invalid size runs are rejected', () => {
  const project = withNotch({id:'same',edgeIndex:0,t:0.4,depthCm:0.3})
  project.pieces[0].notches.push({id:'same',edgeIndex:0,t:0.6,depthCm:0.3})
  assert(inspect(project).issues.some(i=>i.code==='INVALID_NOTCH_ID'))
  project.grading.sizes=['M','M']
  assert.equal(inspect(project).issues[0].code,'INVALID_NOTCH_SIZE_RUN')
})

test('stale cached physical station is identified without silently repairing a graded size', () => {
  const project = withNotch({id:'stale',edgeIndex:0,t:0.5,depthCm:0.3,x:999,y:999})
  const before = structuredClone(project)
  const audit = inspect(project)
  const stale = audit.issues.filter(i=>i.code==='STALE_STANDALONE_NOTCH_CACHE')
  assert.equal(stale.length,project.grading.sizes.length)
  assert(stale.some(i=>i.size==='XS' && i.notchId==='stale'))
  assert.deepEqual(project,before)
})

test('empty notch set cannot imply factory certification', () => {
  const project = withNotch({id:'temporary',edgeIndex:0,t:0.5,depthCm:0.3})
  project.pieces[0].notches=[]
  const audit = inspect(project)
  assert.equal(audit.status,'not_configured')
  assert.equal(audit.factoryCertified,false)
  assert.equal(audit.checks.length,0)
})

test('duplicate source piece IDs and string edgeIndex fail the stricter authored schema', () => {
  const project = withNotch({id:'solo',edgeIndex:'0',t:0.5,depthCm:0.3})
  assert(inspect(project).issues.some(i=>i.code==='INVALID_STANDALONE_NOTCH_EDGE'))
  project.pieces[1].id=project.pieces[0].id
  assert(inspect(project).issues.some(i=>i.code==='DUPLICATE_NOTCH_SOURCE_PIECE'))
})

test('unsupported physical notch type cannot silently fall back to a single DXF cut', () => {
  const project = withNotch({id:'typo',edgeIndex:0,t:0.5,depthCm:0.3,type:'doubel'})
  const audit = inspect(project)
  assert(audit.issues.some(i=>i.code==='UNSUPPORTED_STANDALONE_NOTCH_TYPE' && i.size==='M' && i.notchId==='typo'))
})
