import test from 'node:test'
import assert from 'node:assert/strict'
import {performance} from 'node:perf_hooks'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {refineNativeUnderarmCreaseMeshResearch} from
  '../src/core/backends/nativeUnderarmCreaseFlipRefinementResearch.js'
import {screenNativeCreaseFoldIntervalContactResearch20261024 as screen} from
  '../src/core/backends/nativeCreaseFoldIntervalContactResearch20261024.js'
import {measureNativeTriangleDistanceM} from
  '../src/core/backends/nativeTriangleDistanceResearch.js'
import {auditNativePrincipalStrain} from
  '../src/core/backends/nativePrincipalStrainAudit.js'
import {inspectNativeIntrapanelStaticContact} from
  '../src/core/backends/nativeIntrapanelContactResearch.js'

const moving=[[.8,0,0],[1.2,0,0],[1,1,0]]
const staticAtPeak=[[0,.1,.9],[0,.9,.9],[0,.5,1.1]]
const make=(fixed=staticAtPeak)=>({verticesM:[...moving,...fixed].map(p=>[...p]),
  faces:[[0,1,2],[3,4,5]]})
const rotate=(p,angle)=>[p[0]*Math.cos(angle)-p[2]*Math.sin(angle),p[1],
  p[0]*Math.sin(angle)+p[2]*Math.cos(angle)]

test('independent midpoint witness catches an unsafe path with safe endpoints',()=>{
  const piece=make(),before=JSON.stringify(piece)
  for(const angle of [0,Math.PI]){
    const distance=measureNativeTriangleDistanceM(moving.map(p=>rotate(p,angle)),staticAtPeak)
    assert.ok(distance>.1,'both endpoint poses are safely separated')
  }
  const atMiddle=measureNativeTriangleDistanceM(moving.map(p=>rotate(p,Math.PI/2)),staticAtPeak)
  assert.ok(atMiddle<1e-10,'independent geometric oracle confirms mid-arc collision')
  const out=screen(piece,{endAngleRadians:Math.PI,maxDepth:8})
  assert.equal(out.nonadjacentIntervalScreenClear,false)
  assert.equal(out.blocker.reason,'sampled-contact')
  assert.ok(out.blocker.distanceMm<.001)
  assert.equal(out.sweptCollisionCertified,false)
  assert.equal(JSON.stringify(piece),before)
})

test('motion bound certifies only disjoint material faces on separated fixture',()=>{
  const piece=make([[-3,0,0],[-3,1,0],[-2.5,.5,0]])
  const out=screen(piece,{endAngleRadians:Math.PI,maxDepth:7})
  assert.equal(out.nonadjacentIntervalScreenClear,true)
  assert.equal(out.certifiedPairs,1)
  assert.equal(out.checkedFacePairs,1)
  assert.equal(out.sourceUnchanged,true)
  assert.equal(out.adjacentHingeContactChecked,false)
  assert.equal(out.physicalAcceptance,false)
  assert.equal(out.sweptCollisionCertified,false)
})

test('a bounded uncertain interval fails closed rather than granting collision clearance',()=>{
  const piece=make([[0,.1,2],[0,.9,2],[0,.5,2.2]])
  const out=screen(piece,{endAngleRadians:Math.PI,maxDepth:0})
  assert.equal(out.nonadjacentIntervalScreenClear,false)
  assert.equal(out.blocker.reason,'unresolved-motion-bound')
  assert.equal(out.sweptCollisionCertified,false)
})

test('invalid geometry and resource budgets fail closed',()=>{
  const piece=make()
  for(const options of [{maxDepth:13},{maxDepth:-1},{maxPairChecks:0},
    {clearanceM:-1},{clearanceM:Infinity},{startAngleRadians:2,endAngleRadians:1},
    {endAngleRadians:Math.PI+1}])
    assert.throws(()=>screen(piece,options),/Invalid bounded crease interval/)
  const malformed=structuredClone(piece)
  malformed.faces[0]=[0,0,1]
  assert.throws(()=>screen(malformed),/Invalid crease interval face indices/)
  const uncertain=make([[0,.1,2],[0,.9,2],[0,.5,2.2]])
  assert.equal(screen(uncertain,{endAngleRadians:Math.PI,maxPairChecks:1}).blocker.reason,
    'work-budget')
})

test('real four-panel tee sleeve interval is not cleared; garment and payload unchanged',()=>{
  const project=createTemplateProject('tee')
  const payload=buildNativeSimulationPayload(project,{quality:'quality'})
  const originalProject=JSON.stringify(project),originalPayload=JSON.stringify(payload)
  const panels=refineNativeUnderarmCreaseMeshResearch(payload).panels
  const t=performance.now()
  const rows=panels.map(panel=>({panelId:panel.panelId,
    illRestTriangles:panel.refinementAfter.illConditioned,
    ...screen(panel,{startAngleRadians:0,endAngleRadians:5*Math.PI/6,
      maxDepth:9,maxPairChecks:150000})}))
  for(let i=0;i<rows.length;i++){
    const row=rows[i],panel=panels[i]
    assert.equal(row.illRestTriangles,15)
    assert.equal(row.nonadjacentIntervalScreenClear,false)
    assert.equal(row.blocker.reason,'sampled-contact')
    assert.ok(row.blocker.distanceMm<1)
    // Reconstruct the witnessed 75-degree pose independently from the
    // original remesh, rather than trusting the interval screen's distance.
    const angle=row.blocker.angleRadians
    const triangle=faceIndex=>panel.faces[faceIndex].map(vertexIndex=>{
      const p=panel.verticesM[vertexIndex]
      return p[0]>1e-8?rotate(p,angle):[...p]
    })
    const distance=measureNativeTriangleDistanceM(
      triangle(row.blocker.faceA),triangle(row.blocker.faceB))*1000
    assert.ok(Math.abs(distance-row.blocker.distanceMm)<1e-8)
    assert.ok(distance<1,'independent oracle rejects the sub-1mm clearance')
    const positions=panel.verticesM.map(p=>p[0]>1e-8?rotate(p,angle):[...p])
    const isolated={pieces:[{id:panel.panelId,
      particleIndices:positions.map((_,index)=>index),
      flatVerticesM:panel.verticesM.map(p=>[...p]),
      faces:panel.faces.map(f=>[...f])}],
    particles:positions.map(position=>({position}))}
    const strain=auditNativePrincipalStrain(isolated,{limitPercent:5})
    const contact=inspectNativeIntrapanelStaticContact(isolated,{clearanceM:.001})
    assert.ok(strain.maximumPrincipalExtensionPercent<1e-8)
    assert.ok(strain.maximumPrincipalCompressionPercent<1e-8)
    assert.ok(contact.nonadjacentNearClearancePairs>0)
    assert.equal(contact.staticDisjointThicknessScreenClear,false)
    row.witnessPoseStrainExtensionPercent=strain.maximumPrincipalExtensionPercent
    row.witnessPoseStrainCompressionPercent=strain.maximumPrincipalCompressionPercent
    row.witnessPoseStaticNearClearancePairs=contact.nonadjacentNearClearancePairs
    assert.equal(row.sweptCollisionCertified,false)
    assert.equal(row.physicalAcceptance,false)
    assert.equal(row.sourceUnchanged,true)
  }
  assert.equal(JSON.stringify(project),originalProject)
  assert.equal(JSON.stringify(payload),originalPayload)
  console.log('CREASE_INTERVAL_QA '+JSON.stringify({runtimeMs:+(performance.now()-t).toFixed(3),
    panels:rows.map(r=>({panelId:r.panelId,illRestTriangles:r.illRestTriangles,
      checkedFacePairs:r.checkedFacePairs,certifiedPairs:r.certifiedPairs,
      boxEvaluations:r.boxEvaluations,distanceEvaluations:r.distanceEvaluations,
      witnessPoseStrainExtensionPercent:r.witnessPoseStrainExtensionPercent,
      witnessPoseStrainCompressionPercent:r.witnessPoseStrainCompressionPercent,
      witnessPoseStaticNearClearancePairs:r.witnessPoseStaticNearClearancePairs,
      blocker:r.blocker})),sourceNonmutation:true,physicalAcceptance:false}))
})
