import test from 'node:test'
import assert from 'node:assert/strict'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {auditCanonicalFoundationTeeSewnContactLocality20261025 as audit} from
  '../src/core/backends/nativeCanonicalTeeSewnContactProvenanceResearch20261025.js'
import {auditNativeSewnEndpointThicknessLocality20261025 as unauthenticated} from
  '../src/core/backends/nativeSewnEndpointThicknessLocalityResearch20261025.js'

const fixture=()=>buildNativeSimulationPayload(createTemplateProject('tee'),
  {quality:'quality'})
const rejected=source=>{
  const before=JSON.stringify(source)
  assert.throws(()=>audit(source),/canonical material\/sewing identity mismatch/)
  assert.equal(JSON.stringify(source),before)
}

test('original tee passes source-code-derived seam and material identity, not contact',()=>{
  const source=fixture(),before=JSON.stringify(source)
  const report=audit(source)
  assert.equal(report.codeGeneratedCanonicalTeeMaterialIdentityMatched,true)
  assert.equal(report.codeGeneratedCanonicalTeeSewingIdentityMatched,true)
  assert.equal(report.codeGeneratedCanonicalTeeStaticSolverParametersMatched,true)
  assert.equal(report.codeGeneratedReferenceIndependentlySigned,false)
  assert.equal(report.authoredSewingProvenanceAuthenticated,false)
  assert.equal(report.totalIntersectionWarnings,6)
  assert.equal(report.testedSewnEndpointWitnesses,6)
  assert.equal(report.persistentOutsideSewnNeighborhoodContactWitnesses,2)
  assert.equal(report.outsideSewnNeighborhoodClearWitnesses,4)
  assert.equal(report.originalStaticContactClear,false)
  assert.equal(report.contactVetoRetained,true)
  assert.equal(report.physicalAcceptance,false)
  assert.equal(JSON.stringify(source),before)
})

test('world-space rigid motion is allowed but never interpreted as certification',()=>{
  const source=fixture()
  for(const particle of source.particles)
    particle.position=particle.position.map((v,i)=>v+[.021,-.014,.003][i])
  const before=JSON.stringify(source),report=audit(source)
  assert.equal(report.codeGeneratedCanonicalTeeSewingIdentityMatched,true)
  assert.equal(report.persistentOutsideSewnNeighborhoodContactWitnesses,2)
  assert.equal(report.originalStaticContactClear,false)
  assert.equal(report.physicalAcceptance,false)
  assert.equal(JSON.stringify(source),before)
})

test('forged plausible underarm seam cannot authorize sewn-tip locality',()=>{
  const source=fixture()
  const seam=source.constraints.find(c=>c.type==='seam'&&
    c.seamId==='seam-sleeve-l-underarm')
  const replacement=source.constraints.find(c=>c.type==='seam'&&
    c.seamId==='seam-sleeve-l-front-upper')
  seam.a=replacement.a
  seam.b=replacement.b
  // Same count, recognized seam ID and valid particle indices, but not the
  // canonical pair. A self-derived seam inventory would miss this forgery.
  rejected(source)
})

test('added valid-looking direct seam is not accepted as provenance',()=>{
  const source=fixture()
  const sleeve=source.pieces.find(p=>p.id==='sleeve-left')
  source.constraints.push({type:'seam',seamId:'seam-sleeve-l-underarm',
    a:sleeve.particleIndices[4],b:sleeve.particleIndices[7],rest:0})
  assert.equal(unauthenticated(source).originalStaticContactClear,false)
  rejected(source)
})

test('missing, duplicate, relabeled and reversed direct seam controls',()=>{
  for(const mode of ['missing','duplicate','relabel','reverse']){
    const source=fixture()
    const index=source.constraints.findIndex(c=>c.type==='seam')
    if(mode==='missing')source.constraints.splice(index,1)
    if(mode==='duplicate')source.constraints.push({...source.constraints[index]})
    if(mode==='relabel')source.constraints[index].seamId='seam-side-r'
    if(mode==='reverse'){
      const c=source.constraints[index]
      ;[c.a,c.b]=[c.b,c.a]
      const report=audit(source)
      assert.equal(report.codeGeneratedCanonicalTeeSewingIdentityMatched,true)
      continue
    }
    rejected(source)
  }
})

test('source-material tampering and altered topology are rejected',()=>{
  for(const mode of ['flat','face','indices','particle','extraVirtual']){
    const source=fixture(),piece=source.pieces.find(p=>p.id==='sleeve-left')
    if(mode==='flat')piece.flatVerticesM[4][0]+=.00001
    if(mode==='face')piece.faces[37].reverse()
    if(mode==='indices'){
      const x=piece.particleIndices[4]
      piece.particleIndices[4]=piece.particleIndices[7]
      piece.particleIndices[7]=x
    }
    if(mode==='particle')source.particles[piece.particleIndices[4]].pieceId='front'
    if(mode==='extraVirtual')source.virtualSeams.push({a:0,b:1})
    rejected(source)
  }
})

test('independently exposed solver and fabric provenance bypasses reject',()=>{
  for(const mode of ['seamRest','seamStiffness','fabricId',
    'fabricLaw','thickness','exclusions','structuralPair','particleMass',
    'solverSettings','avatarState']){
    const source=fixture(),seam=source.constraints.find(c=>c.type==='seam')
    if(mode==='seamRest')seam.rest=1000
    if(mode==='seamStiffness')seam.stiffness=0
    if(mode==='fabricId')source.pieces[0].fabricId='forged-fabric'
    if(mode==='fabricLaw')source.pieces[0].fabric.bend=0
    if(mode==='thickness')source.particles[0].thickness=100
    if(mode==='exclusions')source.collisionExclusions=[]
    if(mode==='particleMass')source.particles[0].invMass=0
    if(mode==='solverSettings')source.settings={...source.settings,
      extraUnvalidatedSolver:true}
    if(mode==='avatarState')source.avatar={...source.avatar,
      extraUnvalidatedAvatar:true}
    if(mode==='structuralPair'){
      const structural=source.constraints.find(c=>c.type==='structural')
      structural.b=structural.b+1
    }
    rejected(source)
  }
})

test('invalid provenance structures reject without changing the input',()=>{
  for(const mode of ['missingPieces','missingConstraints','missingParticles',
    'missingVirtual','extraPanel','missingFace']){
    const source=fixture()
    if(mode==='missingPieces')delete source.pieces
    if(mode==='missingConstraints')delete source.constraints
    if(mode==='missingParticles')delete source.particles
    if(mode==='missingVirtual')delete source.virtualSeams
    if(mode==='extraPanel')source.pieces.push(structuredClone(source.pieces[0]))
    if(mode==='missingFace')source.pieces[0].faces.pop()
    rejected(source)
  }
})

test('options accessor cannot mutate sewing physics after provenance preflight',()=>{
  const source=fixture(),before=JSON.stringify(source)
  let getterCalls=0
  const options={get clearanceM(){
    getterCalls++
    source.constraints.find(c=>c.type==='seam').rest=1000
    return .001
  }}
  assert.throws(()=>audit(source,options),/Invalid canonical sewn-tip options/)
  assert.equal(getterCalls,0)
  assert.equal(JSON.stringify(source),before)
  assert.throws(()=>audit(source,{allowPhysicalAcceptance:true}),
    /Invalid canonical sewn-tip options/)
  assert.equal(audit(source,{clearanceM:.001}).physicalAcceptance,false)
  assert.equal(JSON.stringify(source),before)
})

test('proxy option descriptor trap cannot bypass post-snapshot provenance',()=>{
  const source=fixture()
  const options=new Proxy({}, {ownKeys(){
    source.constraints.find(c=>c.type==='seam').rest=1000
    return []
  }})
  // A malicious Proxy trap is caller-controlled and may itself mutate state,
  // but its mutation occurs BEFORE the independent provenance check.
  assert.throws(()=>audit(source,options),/canonical material\/sewing identity mismatch/)
})
