import test from 'node:test'
import assert from 'node:assert/strict'
import {performance} from 'node:perf_hooks'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {researchFoundationTeeSleeveQualityContact20261025 as remesh} from
  '../src/core/backends/nativeSleeveCreaseQualityContactResearch20261025.js'
import {auditDetachedSleeveParameterizedConstraintsResearch20261025 as audit} from
  '../src/core/backends/nativeSleeveRemeshParameterizedConstraintsResearch20261025.js'

const payload=()=>buildNativeSimulationPayload(createTemplateProject('tee'),{quality:'quality'})
// Explicit hypothetical parameters, NOT measured fabric calibration.
const parameters=()=>({arealDensityKgPerM2:0.2,
  structuralStiffnessNPerM:1000,hingeStiffnessNmPerRad:0.02,
  timeStepSeconds:1/60})
const area=(v,[a,b,c])=>Math.abs((v[b][0]-v[a][0])*(v[c][1]-v[a][1])-
  (v[b][1]-v[a][1])*(v[c][0]-v[a][0]))/2

test('actual detached sleeves derive conservative parameterized masses and hinge/edge coefficients',()=>{
  const source=payload(),snapshot=JSON.stringify(source),start=performance.now()
  for(const id of ['sleeve-left','sleeve-right']){
    const mesh=remesh(source,id),meshSnapshot=JSON.stringify(mesh)
    const inputs=parameters(),inputSnapshot=JSON.stringify(inputs)
    const result=audit(source,id,mesh,inputs)
    const independentlyLumped=new Array(mesh.flatVerticesM.length).fill(0)
    for(const f of mesh.faces){
      const a=area(mesh.flatVerticesM,f)
      for(const i of f)independentlyLumped[i]+=a/3
    }
    const expectedMass=independentlyLumped.reduce((s,a)=>s+a,0)*inputs.arealDensityKgPerM2
    assert.ok(Math.abs(result.totalMassKg-expectedMass)<1e-12)
    for(let i=0;i<independentlyLumped.length;i++){
      const expected=independentlyLumped[i]*inputs.arealDensityKgPerM2
      assert.ok(Math.abs(result.massesKg[i]-expected)<1e-14)
      assert.ok(Math.abs(result.inverseMassesPerKg[i]*expected-1)<1e-12)
    }
    assert.equal(result.structuralCount,289)
    assert.equal(result.bendingHingeCount,245)
    assert.equal(result.creaseHingeCount,20)
    assert.equal(result.sourceSewingConstraints,41)
    assert.equal(result.sourceSewingEndpointReferences,46)
    for(const edge of result.structural){
      const [a,b]=edge.edge
      const v=mesh.flatVerticesM
      const length=Math.hypot(...v[a].map((x,k)=>x-v[b][k]))
      assert.ok(Math.abs(length-edge.restLengthM)<1e-12)
      assert.ok(Math.abs(edge.complianceMPerN-0.001)<1e-14)
      assert.ok(Math.abs(edge.alphaTilde-3.6)<1e-12)
    }
    for(const h of result.hinges){
      assert.equal(h.restDihedralRad,0)
      assert.ok(Math.abs(h.complianceRadPerNm-50)<1e-12)
      assert.ok(Math.abs(h.alphaTilde-180000)<1e-7)
    }
    assert.deepEqual(result.contact,{intersections:3,nearFoldovers:3,nearClearance:37})
    assert.equal(result.staticContactValid,false)
    assert.equal(result.withinDeclaredStrainLimit,false)
    assert.equal(result.contactExclusionsCreated,0)
    for(const flag of ['contactPolicyImplemented','calibratedMaterialVerified',
      'solverConstraintsRebuilt','physicalAcceptance','continuousContactCertified',
      'safeToAutoApply'])assert.equal(result[flag],false)
    assert.equal(JSON.stringify(mesh),meshSnapshot)
    assert.equal(JSON.stringify(inputs),inputSnapshot)
  }
  assert.equal(JSON.stringify(source),snapshot)
  console.log('PARAMETERIZED_SLEEVE_RUNTIME_MS '+(performance.now()-start).toFixed(2))
})

test('parameter study changes compliance and mass analytically without touching garment state',()=>{
  const source=payload(),mesh=remesh(source,'sleeve-left'),base=parameters()
  const before=JSON.stringify(source),meshBefore=JSON.stringify(mesh)
  const a=audit(source,'sleeve-left',mesh,base)
  const b=audit(source,'sleeve-left',mesh,{...base,arealDensityKgPerM2:0.4,
    structuralStiffnessNPerM:2000,hingeStiffnessNmPerRad:0.04,
    timeStepSeconds:1/120})
  assert.ok(Math.abs(b.totalMassKg/a.totalMassKg-2)<1e-12)
  assert.ok(Math.abs(b.structural[0].alphaTilde/a.structural[0].alphaTilde-2)<1e-12)
  assert.ok(Math.abs(b.hinges[0].alphaTilde/a.hinges[0].alphaTilde-2)<1e-12)
  assert.equal(JSON.stringify(source),before)
  assert.equal(JSON.stringify(mesh),meshBefore)
})

test('invalid units, unsupported pins and damaged sewing or crease fail closed',()=>{
  const source=payload(),mesh=remesh(source,'sleeve-right'),base=parameters()
  for(const key of Object.keys(base))for(const value of [0,-1,Infinity,NaN,'1']){
    assert.throws(()=>audit(source,'sleeve-right',mesh,{...base,[key]:value}),/parameter/i)
  }
  for(const extra of [{unknown:1},{arealDensityKgPerM2:undefined}]){
    assert.throws(()=>audit(source,'sleeve-right',mesh,{...base,...extra}),/parameter/i)
  }
  const getter={...base}
  Object.defineProperty(getter,'arealDensityKgPerM2',{enumerable:true,
    get(){return 0.2}})
  assert.throws(()=>audit(source,'sleeve-right',mesh,getter),/parameter/i)
  const hidden={...base}
  Object.defineProperty(hidden,'hiddenCalibration',{value:true})
  assert.throws(()=>audit(source,'sleeve-right',mesh,hidden),/parameter/i)
  const pins=structuredClone(source)
  pins.anchors=[{particle:pins.pieces.find(p=>p.id==='sleeve-right').particleIndices[0],
    target:[0,0,0],stiffness:.2,axes:'y',type:'fit-anchor'}]
  assert.throws(()=>audit(pins,'sleeve-right',mesh,base),/anchor/i)
  for(const mutate of [a=>{a.target=[NaN,Infinity]},
    a=>{delete a.target},a=>{a.stiffness=NaN},
    a=>{a.axes='invalid'},a=>{a.type='unknown'}]){
    const corrupted=structuredClone(source)
    mutate(corrupted.anchors[0])
    assert.throws(()=>audit(corrupted,'sleeve-right',mesh,base),/anchor/i)
  }
  const badSew=structuredClone(source)
  badSew.constraints.splice(badSew.constraints.findIndex(c=>c.type==='seam'),1)
  assert.throws(()=>audit(badSew,'sleeve-right',mesh,base),/sewing/i)
  const badCrease=structuredClone(mesh)
  badCrease.protectedCreaseEdges=[]
  assert.throws(()=>audit(source,'sleeve-right',badCrease,base),/crease/i)
  assert.ok(source.anchors.length>0,'body-panel anchors remain valid and unchanged')
})
