// Independent, research-only local edge-flip certificates. No garment saves,
// native builds, solver promotion or disk-intensive generated artifacts.
import assert from 'node:assert/strict'
import test from 'node:test'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {discoverNativeDevelopableHinges} from '../src/core/backends/nativeDevelopableHingeResearch.js'
import {optimizeTriangleQuality,materialHingeProtectedEdges} from '../src/core/physics/qualityTriangulation.js'
import {auditSingleMaterialEdgeFlip,searchCertifiedPoorFaceFlips} from '../src/core/physics/materialRetriangulationResearch.js'
import {auditNativePrincipalStrain} from '../src/core/backends/nativePrincipalStrainAudit.js'
import {measureNativeSeamResiduals} from '../src/core/backends/nativeSeamCandidateGate.js'
import {inspectStagedAvatarContact} from '../src/core/backends/seamAssembly.js'
import {inspectNativeIntrapanelStaticContact} from '../src/core/backends/nativeIntrapanelContactResearch.js'
import {inspectNativeInterpanelBroadphase} from '../src/core/backends/nativeInterpanelBroadphaseResearch.js'

const sample={vertices:[[0,0],[3,0],[4,1],[0,1]],faces:[[0,1,2],[0,2,3]]}
const flipped={vertices:sample.vertices.map(p=>[...p]),faces:[[1,3,0],[1,2,3]]}
const clone=x=>JSON.parse(JSON.stringify(x))
const independentPoorCount=mesh=>mesh.faces.filter(face=>{
  const [a,b,c]=face.map(i=>mesh.vertices[i])
  const longest=Math.max(Math.hypot(a[0]-b[0],a[1]-b[1]),
    Math.hypot(b[0]-c[0],b[1]-c[1]),Math.hypot(c[0]-a[0],c[1]-a[1]))
  const altitude=Math.abs((b[0]-a[0])*(c[1]-a[1])-
    (b[1]-a[1])*(c[0]-a[0]))/longest
  return altitude<.2||longest/altitude>25
}).length
const boundaryKeys=mesh=>{
  const counts=new Map()
  for(const [a,b,c] of mesh.faces)for(const [i,j] of [[a,b],[b,c],[c,a]]){
    const k=[i,j].sort((x,y)=>x-y).join(':')
    counts.set(k,(counts.get(k)||0)+1)
  }
  return [...counts].filter(([,n])=>n===1).map(([k])=>k).sort()
}

// Independent constraint-graph oracle: infer expected structural edges and
// bending opposite-vertex pairs directly from faces, never from the builder.
function auditRegeneratedClothGraph(payload){
  const counts=values=>{
    const map=new Map()
    for(const value of values)map.set(value,(map.get(value)||0)+1)
    return [...map].sort(([a],[b])=>a.localeCompare(b))
  }
  const pair=(a,b)=>[a,b].sort((x,y)=>x-y).join(':')
  const expectedStructural=[],expectedBend=[]
  for(const piece of payload.pieces){
    const edges=new Map(),ids=piece.particleIndices
    for(const [a,b,c] of piece.faces)for(const [i,j,k] of [[a,b,c],[b,c,a],[c,a,b]]){
      const id=pair(ids[i],ids[j])
      if(!edges.has(id))edges.set(id,[])
      edges.get(id).push(ids[k])
    }
    for(const [id,opposites] of edges){
      expectedStructural.push(id)
      assert.ok(opposites.length<=2,'Nonmanifold experimental mesh')
      if(opposites.length===2)expectedBend.push(pair(...opposites))
    }
  }
  const structural=payload.constraints.filter(c=>c.type==='structural')
  const bending=payload.constraints.filter(c=>c.type==='bend')
  assert.deepEqual(counts(structural.map(c=>pair(c.a,c.b))),counts(expectedStructural),
    'Stale or missing structural edges after retriangulation')
  assert.deepEqual(counts(bending.map(c=>pair(c.a,c.b))),counts(expectedBend),
    'Stale or missing bending opposite-vertex pairs after retriangulation')
  for(const c of [...structural,...bending]){
    assert.ok(Number.isFinite(c.rest)&&c.rest>0)
    assert.ok(Number.isFinite(c.stiffness)&&c.stiffness>0)
  }
  return {structural:structural.length,bending:bending.length}
}

// Separate numerical oracle: graph connectivity alone cannot detect a stale,
// positive rest length. This fixture uses zero fabric shrink, so both distance
// springs and opposite-vertex bend springs must match the unchanged 2D metric.
// Do not apply the no-shrink assertion to arbitrary calibrated fabrics.
function auditUnshrunkMaterialRestLengths(payload){
  const flatByParticle=new Map()
  for(const piece of payload.pieces){
    assert.equal(piece.particleIndices.length,piece.flatVerticesM.length)
    piece.particleIndices.forEach((id,i)=>{
      assert.ok(Number.isInteger(id)&&!flatByParticle.has(id),
        'Duplicate or invalid native particle mapping')
      const p=piece.flatVerticesM[i]
      assert.ok(Array.isArray(p)&&p.length>=2&&p.slice(0,2).every(Number.isFinite),
        'Nonfinite material coordinate')
      flatByParticle.set(id,{panel:piece.id,xy:p})
    })
  }
  let checked=0,maximumErrorM=0
  for(const c of payload.constraints.filter(c=>c.type==='structural'||c.type==='bend')){
    const a=flatByParticle.get(c.a),b=flatByParticle.get(c.b)
    assert.ok(a&&b&&a.panel===b.panel,'Cloth spring crosses material panels')
    const expected=Math.hypot(a.xy[0]-b.xy[0],a.xy[1]-b.xy[1])
    assert.ok(Number.isFinite(expected)&&expected>0,'Degenerate material spring')
    assert.ok(Number.isFinite(c.rest)&&Math.abs(c.rest-expected)<=1e-9,
      `Stale ${c.type} material rest length: expected ${expected}, found ${c.rest}`)
    maximumErrorM=Math.max(maximumErrorM,Math.abs(c.rest-expected))
    checked++
  }
  return {checked,maximumErrorM}
}

test('valid single flip retains exact 2D coordinates, boundary and orientation',()=>{
  const before=JSON.stringify(sample),after=JSON.stringify(flipped)
  const audit=auditSingleMaterialEdgeFlip(sample,flipped)
  assert.equal(audit.approved,true)
  assert.equal(audit.geometryPreserved,true)
  assert.deepEqual(audit.changedFaces,[0,1])
  assert.equal(audit.poorAfter,0)
  assert.equal(JSON.stringify(sample),before)
  assert.equal(JSON.stringify(flipped),after)
})

test('material coordinates and protected fold diagonals cannot be silently changed',()=>{
  const moved=clone(flipped);moved.vertices[1][0]+=.001
  assert.throws(()=>auditSingleMaterialEdgeFlip(sample,moved),/Material coordinates changed/)
  assert.throws(()=>auditSingleMaterialEdgeFlip(sample,flipped,{protectedEdges:[[0,2]]}),
    /Protected material edge removed/)
  assert.throws(()=>auditSingleMaterialEdgeFlip(sample,flipped,{protectedEdges:[[0,7]]}),
    /Invalid protected material edge/)
})

test('false flips, inverted faces and unchanged topology fail closed',()=>{
  assert.throws(()=>auditSingleMaterialEdgeFlip(sample,sample),/Only one interior edge flip/)
  const inverted=clone(flipped);inverted.faces[0].reverse()
  assert.throws(()=>auditSingleMaterialEdgeFlip(sample,inverted),/orientation/)
  const fake=clone(flipped);fake.faces[0]=[0,2,3]
  assert.throws(()=>auditSingleMaterialEdgeFlip(sample,fake),/corresponding diagonal/)
  const malformed=clone(flipped);malformed.faces[1]=[1,1,2]
  assert.throws(()=>auditSingleMaterialEdgeFlip(sample,malformed),/Invalid edge-flip triangle/)
})

test('actual four-panel tee contains a certifiable protected-hinge-safe local flip',()=>{
  const project=createTemplateProject('tee'),projectBefore=JSON.stringify(project)
  const payload=buildNativeSimulationPayload(project,{quality:'quality'})
  const payloadBefore=JSON.stringify(payload)
  const hinges=discoverNativeDevelopableHinges(payload,{maxResults:128})
  let inspected=0,certified=null
  for(const piece of payload.pieces){
    const hinge=hinges.returned.find(h=>h.panelId===piece.id&&
      h.worldAxisAligned&&h.side==='positive')
    assert.ok(hinge,`Missing protected fold axis for ${piece.id}`)
    const mesh={vertices:piece.flatVerticesM.map(v=>[v[0]*100,v[1]*100]),
      faces:piece.faces.map(f=>[...f])}
    const protectedEdges=materialHingeProtectedEdges(mesh,hinge.axisVertices)
    const optimized=optimizeTriangleQuality(mesh,{passes:1,protectedEdges})
    const changed=mesh.faces.map((face,i)=>JSON.stringify([...face].sort((a,b)=>a-b))!==
      JSON.stringify([...optimized.faces[i]].sort((a,b)=>a-b))?i:-1).filter(i=>i>=0)
    for(let x=0;x<changed.length&&!certified;x++)for(let y=x+1;y<changed.length&&!certified;y++){
      const candidate=clone(mesh)
      candidate.faces[changed[x]]=[...optimized.faces[changed[x]]]
      candidate.faces[changed[y]]=[...optimized.faces[changed[y]]]
      inspected++
      try{
        const audit=auditSingleMaterialEdgeFlip(mesh,candidate,{protectedEdges})
        if(audit.approved)certified={panel:piece.id,...audit}
      }catch{/* Other face pairs do not form a single valid flip. */}
    }
    if(certified)break
  }
  assert.ok(certified,'Expected at least one locally safe material-preserving flip')
  assert.equal(certified.materialBoundaryUnchanged,true)
  assert.equal(certified.originalVerticesUnchanged,true)
  assert.equal(certified.fitCertified,false)
  assert.equal(JSON.stringify(payload),payloadBefore)
  assert.equal(JSON.stringify(project),projectBefore)
  console.log('FOUR_PANEL_LOCAL_RETRIANGULATION '+JSON.stringify({
    ...certified,inspected,sourceNonmutation:true,
    note:'Local rest-topology certificate only; no constraints regenerated or fitted garment.'}))
})

test('bounded strict-improvement search repairs a synthetic sliver without moving material',()=>{
  const thin={vertices:[[0,0],[5,0],[2.5,.1],[2.5,-3]],
    faces:[[0,1,2],[1,0,3]]}
  const before=JSON.stringify(thin),oldBoundary=boundaryKeys(thin)
  const result=searchCertifiedPoorFaceFlips(thin,{maxFlips:2,maxCandidates:12})
  assert.equal(independentPoorCount(thin),1)
  assert.equal(result.initialPoor,1)
  assert.equal(result.finalPoor,0)
  assert.equal(independentPoorCount(result.mesh),0)
  assert.equal(result.accepted.length,1)
  assert.ok(result.accepted[0].minimumAltitudeAfterCm>
    result.accepted[0].minimumAltitudeBeforeCm)
  assert.deepEqual(boundaryKeys(result.mesh),oldBoundary)
  assert.deepEqual(result.mesh.vertices,thin.vertices)
  assert.equal(JSON.stringify(thin),before)
  assert.equal(result.fitCertified,false)
})

test('protected diagonals, zero-step budget and malformed inputs fail closed',()=>{
  const thin={vertices:[[0,0],[5,0],[2.5,.1],[2.5,-3]],
    faces:[[0,1,2],[1,0,3]]}
  assert.equal(searchCertifiedPoorFaceFlips(thin,{protectedEdges:[[0,1]]}).finalPoor,1)
  assert.equal(searchCertifiedPoorFaceFlips(thin,{maxFlips:0}).finalPoor,1)
  assert.throws(()=>searchCertifiedPoorFaceFlips(thin,{maxCandidates:0}),/bounded/)
  assert.throws(()=>searchCertifiedPoorFaceFlips(thin,{protectedEdges:[[0,9]]}),/protected/)
  assert.throws(()=>searchCertifiedPoorFaceFlips({...thin,faces:[[0,0,2]]}),/source triangle/)
})

test('four-panel protected-flip baseline: bounded certified search reduces poor faces without garment writes',()=>{
  const project=createTemplateProject('tee'),projectBefore=JSON.stringify(project)
  const payload=buildNativeSimulationPayload(project,{quality:'quality'})
  const payloadBefore=JSON.stringify(payload)
  const hinges=discoverNativeDevelopableHinges(payload,{maxResults:128})
  let before=0,after=0,flips=0,scanned=0
  const t=performance.now()
  for(const piece of payload.pieces){
    const hinge=hinges.returned.find(h=>h.panelId===piece.id&&
      h.worldAxisAligned&&h.side==='positive')
    assert.ok(hinge,`Missing hinge for ${piece.id}`)
    const mesh={vertices:piece.flatVerticesM.map(v=>[v[0]*100,v[1]*100]),
      faces:piece.faces.map(f=>[...f])}
    const protectedEdges=materialHingeProtectedEdges(mesh,hinge.axisVertices)
    const baseline=optimizeTriangleQuality(mesh,{passes:8,protectedEdges})
    const beforeJSON=JSON.stringify(baseline),originalBoundary=boundaryKeys(baseline)
    const result=searchCertifiedPoorFaceFlips(baseline,{
      protectedEdges,maxFlips:4,maxCandidates:2400})
    assert.equal(result.initialPoor,independentPoorCount(baseline))
    assert.equal(result.finalPoor,independentPoorCount(result.mesh))
    assert.deepEqual(result.mesh.vertices,baseline.vertices)
    assert.deepEqual(boundaryKeys(result.mesh),originalBoundary)
    for(const [a,b] of protectedEdges)assert.ok(result.mesh.faces.some(f=>
      f.includes(a)&&f.includes(b)))
    assert.equal(JSON.stringify(baseline),beforeJSON)
    assert.ok(result.scanned<=2400&&result.accepted.length<=4)
    assert.equal(result.fitCertified,false)
    before+=result.initialPoor;after+=result.finalPoor
    flips+=result.accepted.length;scanned+=result.scanned
  }
  assert.equal(before,37,'Expected the existing protected-flip reference mesh')
  assert.equal(after,36,'Expected one independently certified reduction')
  assert.equal(flips,1)
  assert.equal(JSON.stringify(project),projectBefore)
  assert.equal(JSON.stringify(payload),payloadBefore)
  console.log('FOUR_PANEL_BOUNDED_RETRIANGULATION '+JSON.stringify({
    poorBefore:before,poorAfter:after,certifiedFlips:flips,scanned,
    wallMs:+(performance.now()-t).toFixed(2),
    sourceNonmutation:true,fitCertified:false,
    note:'Rest mesh only; native constraints and world pose not regenerated.'}))
})

test('four-panel certified topology regenerates native structural and bend constraints in memory',()=>{
  const project=createTemplateProject('tee'),source=JSON.stringify(project)
  const original=buildNativeSimulationPayload(project,{quality:'quality'})
  const originalState=JSON.stringify(original)
  const discovered=discoverNativeDevelopableHinges(original,{maxResults:128})
  const axes=Object.fromEntries(original.pieces.map(piece=>{
    const hinge=discovered.returned.find(h=>h.panelId===piece.id&&
      h.worldAxisAligned&&h.side==='positive')
    assert.ok(hinge)
    return [piece.id,[hinge.axisVertices]]
  }))
  const options={quality:'quality',experimentalOptimizeMesh:true,
    experimentalProtectedHingeAxesByPiece:axes}
  const baseline=buildNativeSimulationPayload(project,options)
  const baselineState=JSON.stringify(baseline)
  const start=performance.now()
  const candidate=buildNativeSimulationPayload(project,{
    ...options,experimentalCertifiedPoorFaceFlips:true})
  const buildMs=performance.now()-start
  const candidateState=JSON.stringify(candidate)
  assert.deepEqual(candidate.particles,baseline.particles)
  assert.deepEqual(candidate.anchors,baseline.anchors)
  assert.deepEqual(candidate.virtualSeams,baseline.virtualSeams)
  assert.deepEqual(candidate.pieces.map(p=>p.flatVerticesM),baseline.pieces.map(p=>p.flatVerticesM))
  assert.deepEqual(candidate.pieces.map(p=>p.particleIndices),baseline.pieces.map(p=>p.particleIndices))
  let changedFaces=0
  for(let i=0;i<baseline.pieces.length;i++){
    const a=baseline.pieces[i],b=candidate.pieces[i]
    changedFaces+=a.faces.filter((face,j)=>JSON.stringify(face)!==JSON.stringify(b.faces[j])).length
    assert.deepEqual(boundaryKeys({vertices:a.flatVerticesM,faces:a.faces}),
      boundaryKeys({vertices:b.flatVerticesM,faces:b.faces}))
    for(const axis of axes[a.id])assert.ok(b.faces.some(f=>f.includes(axis[0])&&f.includes(axis[1])))
  }
  assert.equal(changedFaces,2,'Expected one certified two-face diagonal replacement')
  assert.equal(candidate.pieces.reduce((n,p)=>n+independentPoorCount({
    vertices:p.flatVerticesM.map(v=>v.map(x=>x*100)),faces:p.faces}),0),36)
  const beforeGraph=auditRegeneratedClothGraph(baseline)
  const afterGraph=auditRegeneratedClothGraph(candidate)
  const beforeRest=auditUnshrunkMaterialRestLengths(baseline)
  const afterRest=auditUnshrunkMaterialRestLengths(candidate)
  assert.deepEqual(afterRest,beforeRest,
    'Certified flips must regenerate the same exact zero-shrink material metric')
  assert.equal(afterRest.checked,afterGraph.structural+afterGraph.bending)
  assert.equal(beforeGraph.structural,afterGraph.structural)
  assert.equal(beforeGraph.bending,afterGraph.bending)
  assert.notDeepEqual(baseline.constraints.filter(c=>c.type==='structural'),
    candidate.constraints.filter(c=>c.type==='structural'))
  assert.notDeepEqual(baseline.constraints.filter(c=>c.type==='bend'),
    candidate.constraints.filter(c=>c.type==='bend'))
  const seamBefore=measureNativeSeamResiduals(baseline)
  const seamAfter=measureNativeSeamResiduals(candidate)
  assert.deepEqual(seamAfter,seamBefore,'Rest-topology-only change must preserve sewing samples')
  const strainBefore=auditNativePrincipalStrain(baseline)
  const strainAfter=auditNativePrincipalStrain(candidate)
  const avatarBefore=inspectStagedAvatarContact(baseline)
  const avatarAfter=inspectStagedAvatarContact(candidate)
  const selfBefore=inspectNativeIntrapanelStaticContact(baseline)
  const selfAfter=inspectNativeIntrapanelStaticContact(candidate)
  const interBefore=inspectNativeInterpanelBroadphase(baseline)
  const interAfter=inspectNativeInterpanelBroadphase(candidate)
  assert.equal(avatarAfter.penetrating,avatarBefore.penetrating)
  assert.ok(strainAfter.withinDeclaredStrainLimit===false)
  assert.ok(avatarAfter.penetrating>0)
  assert.equal(JSON.stringify(project),source)
  assert.equal(JSON.stringify(original),originalState)
  assert.equal(JSON.stringify(baseline),baselineState)
  assert.equal(JSON.stringify(candidate),candidateState)
  assert.throws(()=>buildNativeSimulationPayload(project,{
    quality:'quality',experimentalCertifiedPoorFaceFlips:true}),/require experimental mesh optimization/)
  assert.throws(()=>buildNativeSimulationPayload(project,{
    ...options,experimentalCertifiedPoorFaceFlips:true,experimentalSmoothInteriorMesh:true}),
    /cannot be combined/)
  console.log('FOUR_PANEL_CERTIFIED_REGENERATED_CONSTRAINTS '+JSON.stringify({
    poorFacesBefore:37,poorFacesAfter:36,changedFaces,graph:afterGraph,
    restMetric:afterRest,
    seamBefore:{maxMm:seamBefore.maxGapMm,rmsMm:seamBefore.rmsGapMm},
    seamAfter:{maxMm:seamAfter.maxGapMm,rmsMm:seamAfter.rmsGapMm},
    principalExtensionBeforePercent:strainBefore.maximumPrincipalExtensionPercent,
    principalExtensionAfterPercent:strainAfter.maximumPrincipalExtensionPercent,
    avatarPenetrationsBefore:avatarBefore.penetrating,
    avatarPenetrationsAfter:avatarAfter.penetrating,
    staticSelfIntersectionsBefore:selfBefore.intersectingTrianglePairs,
    staticSelfIntersectionsAfter:selfAfter.intersectingTrianglePairs,
    interpanelPotentialContactsBefore:interBefore.possibleContactPairs,
    interpanelPotentialContactsAfter:interAfter.possibleContactPairs,
    buildMs:+buildMs.toFixed(2),sourceNonmutation:true,
    fitCertified:false,sweptCCDVerified:false}))
})

test('independent graph oracle rejects stale structural and bending constraints',()=>{
  const payload={pieces:[{particleIndices:[0,1,2,3],
    faces:[[0,1,2],[0,2,3]]}],constraints:[
    ...[[0,1],[1,2],[0,2],[2,3],[0,3]].map(([a,b])=>({
      type:'structural',a,b,rest:1,stiffness:1})),
    {type:'bend',a:1,b:3,rest:1,stiffness:1}]}
  assert.deepEqual(auditRegeneratedClothGraph(payload),{structural:5,bending:1})
  const staleStructural=clone(payload)
  staleStructural.constraints[2].a=1
  assert.throws(()=>auditRegeneratedClothGraph(staleStructural),/Stale or missing structural/)
  const staleBend=clone(payload)
  staleBend.constraints.at(-1).b=2
  assert.throws(()=>auditRegeneratedClothGraph(staleBend),/Stale or missing bending/)
  const badRest=clone(payload)
  badRest.constraints[0].rest=0
  assert.throws(()=>auditRegeneratedClothGraph(badRest),assert.AssertionError)
})

test('independent 2D metric oracle rejects positive but stale bend and structural rests',()=>{
  const fixture={pieces:[{id:'test-panel',particleIndices:[0,1,2,3],
    flatVerticesM:[[0,0,0],[1,0,0],[1,1,0],[0,1,0]],
    faces:[[0,1,2],[0,2,3]]}],constraints:[
    ...[[0,1,1],[1,2,1],[0,2,Math.SQRT2],[2,3,1],[0,3,1]]
      .map(([a,b,rest])=>({type:'structural',a,b,rest,stiffness:1})),
    {type:'bend',a:1,b:3,rest:Math.SQRT2,stiffness:1}]}
  assert.deepEqual(auditRegeneratedClothGraph(fixture),{structural:5,bending:1})
  assert.deepEqual(auditUnshrunkMaterialRestLengths(fixture),{checked:6,maximumErrorM:0})
  for(const index of [0,5]){
    const stale=clone(fixture)
    stale.constraints[index].rest*=1.1 // positive, finite and graph-identical
    assert.deepEqual(auditRegeneratedClothGraph(stale),{structural:5,bending:1})
    assert.throws(()=>auditUnshrunkMaterialRestLengths(stale),/Stale .* material rest length/)
  }
  const crossPanel=clone(fixture)
  crossPanel.pieces.push({id:'other',particleIndices:[4],flatVerticesM:[[2,2,0]],faces:[]})
  crossPanel.constraints[0].b=4
  assert.throws(()=>auditUnshrunkMaterialRestLengths(crossPanel),/crosses material panels/)
})
