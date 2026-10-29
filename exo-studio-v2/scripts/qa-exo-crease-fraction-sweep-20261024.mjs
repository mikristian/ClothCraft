import test from 'node:test'
import assert from 'node:assert/strict'
import {createTemplateProject} from '../src/data/templates.js'
import {buildNativeSimulationPayload} from '../src/core/backends/nativePayload.js'
import {refineNativeUnderarmCreaseMeshResearch} from '../src/core/backends/nativeUnderarmCreaseFlipRefinementResearch.js'
import {buildNativeUnderarmCreaseConstraintGraphResearch} from '../src/core/backends/nativeUnderarmCreaseConstraintGraphResearch.js'
import {splitNativeCreaseEdgeResearch20261024 as split} from '../src/core/backends/nativeCreaseEdgeResamplingResearch20261024.js'
import {searchNativeCreaseFractionSweep20261024 as search} from '../src/core/backends/nativeCreaseFractionSweepResearch20261024.js'
import {measureNativeTriangleDistanceM} from '../src/core/backends/nativeTriangleDistanceResearch.js'
import {inspectNativeIntrapanelStaticContact} from '../src/core/backends/nativeIntrapanelContactResearch.js'

const fixture=()=>({panelId:'synthetic',originalVertexCount:4,
  originalParticleIndices:[0,1,2,3],
  verticesM:[[0,0,0],[0,.02,0],[-.01,.01,0],[.01,.01,0]],
  worldPositionsM:[[0,0,0],[0,.02,0],[-.01,.01,0],[.01,.01,0]],
  faces:[[0,2,1],[0,1,3]],creaseEdges:[[0,1]],newVertexProvenance:[]})
const fold=(piece,angle)=>piece.verticesM.map(([x,y])=>x>1e-8?
  [x*Math.cos(angle),y,x*Math.sin(angle)]:[x,y,0])
const contact=(piece,positions)=>inspectNativeIntrapanelStaticContact({
  pieces:[{id:piece.panelId,particleIndices:positions.map((_,i)=>i),
    faces:piece.faces}],particles:positions.map(position=>({position}))},
  {clearanceM:.001,maxPairs:200000})
const weighted=(positions,end)=>[0,1,2].map(k=>
  end.localIndices.reduce((sum,id,j)=>sum+
    positions[id][k]*end.weights[j],0))
const sewing=(piece,pairs,angle)=>{
  const positions=fold(piece,angle)
  const gaps=pairs.map(pair=>{
    const a=weighted(positions,pair.source),b=weighted(positions,pair.target)
    return Math.hypot(...a.map((x,k)=>x-b[k]))*1000
  })
  return {max:Math.max(...gaps),rms:Math.hypot(...gaps)/Math.sqrt(gaps.length)}
}
// Independent exhaustive oracle: do not trust the search's own minimum
// aggregation when verifying a candidate's exact clearance nonregression.
const independentMinimum=piece=>{
  let min=Infinity
  for(let i=0;i<piece.faces.length;i++)for(let j=i+1;j<piece.faces.length;j++){
    if(piece.faces[i].some(k=>piece.faces[j].includes(k)))continue
    const a=piece.faces[i].map(k=>piece.verticesM[k])
    const b=piece.faces[j].map(k=>piece.verticesM[k])
    min=Math.min(min,measureNativeTriangleDistanceM(a,b))
  }
  return min*1000
}

test('synthetic mesh without disjoint face pairs fails closed without mutation',()=>{
  const source=fixture(),frozen=JSON.stringify(source)
  assert.throws(()=>search(source,{edgeIndices:[0],fractions:[.25,.5,.75]}),
    /No disjoint material faces for exact clearance ranking/)
  assert.equal(JSON.stringify(source),frozen)
})

test('both actual sleeves: 30 distinct interpolation fractions are evaluated with independent folded contact and sewing oracles',()=>{
  const project=createTemplateProject('tee')
  const payload=buildNativeSimulationPayload(project,{quality:'quality'})
  const originals=[JSON.stringify(project),JSON.stringify(payload)]
  const refined=refineNativeUnderarmCreaseMeshResearch(payload)
  const graph=buildNativeUnderarmCreaseConstraintGraphResearch(payload)
  const summary=[]
  for(let i=0;i<2;i++){
    const piece=refined.panels[i],before=JSON.stringify(piece)
    const out=search(piece)
    assert.equal(out.tested,15)
    assert.equal(out.requested,15)
    assert.equal(out.budgetExhausted,false)
    assert.equal(out.nonregressingCount,5)
    assert.equal(out.improvedCount,0)
    assert.equal(out.furtherResearchEligibleCount,0)
    assert.ok(Math.abs(out.baselineMinimumClearanceMm-.3839069111)<1e-6)
    assert.equal(new Set(out.results.map(x=>x.edgeIndex+':'+x.fraction)).size,15)
    for(const r of out.results){
      assert.equal(r.baseline.illConditioned,15)
      assert.equal(r.baseline.nearClearancePairs,14)
      assert.equal(r.physicalAcceptance,false)
      assert.equal(r.fold.strainWithinLimit,true)
      assert.equal(r.fold.staticContactClear,false)
      assert.ok(r.fold.principalExtensionPercent<1e-8)
      assert.ok(r.fold.principalCompressionPercent<1e-8)
      if(r.edgeIndex===16){
        assert.equal(r.nonregressing,true)
        assert.equal(r.improved,false)
      }else assert.equal(r.nonregressing,false)
    }
    // Independent re-evaluation of one nonregressing candidate.
    const selected=out.results.find(x=>x.edgeIndex===16&&x.fraction===.2)
    const candidate=split(piece,{edgeIndex:16,fraction:.2}).candidate
    assert.ok(Math.abs(independentMinimum(candidate)-
      selected.candidateMinimumClearanceMm)<1e-8)
    const angle=5*Math.PI/12
    const baseSeam=sewing(piece,graph.panels[i].sewingPairs,angle)
    const newSeam=sewing(candidate,graph.panels[i].sewingPairs,angle)
    assert.ok(Math.abs(newSeam.max-baseSeam.max)<1e-8)
    assert.ok(Math.abs(newSeam.rms-baseSeam.rms)<1e-8)
    assert.ok(Math.abs(newSeam.max-273.706902)<.001)
    assert.ok(Math.abs(newSeam.rms-263.883173)<.001)
    const independentFoldContact=contact(candidate,fold(candidate,angle))
    assert.equal(independentFoldContact.staticDisjointThicknessScreenClear,false)
    assert.equal(independentFoldContact.nonadjacentNearClearancePairs,14)
    assert.equal(JSON.stringify(piece),before)
    summary.push({panelId:piece.panelId,tested:out.tested,
      nonregressing:out.nonregressingCount,improved:out.improvedCount,
      baseMinimumClearanceMm:out.baselineMinimumClearanceMm,
      candidateMinimumClearanceMm:selected.candidateMinimumClearanceMm,
      maxGapMm:newSeam.max,rmsGapMm:newSeam.rms,
      foldedContactClear:false,runtimeMs:out.runtimeMs})
  }
  assert.equal(JSON.stringify(project),originals[0])
  assert.equal(JSON.stringify(payload),originals[1])
  console.log('CREASE_FRACTION_SWEEP_QA '+JSON.stringify({summary,
    sourceNonmutation:true,physicalAcceptance:false}))
})

test('fraction search rejects duplicate trials, unsafe settings and exhausted candidate budgets',()=>{
  const source=fixture(),frozen=JSON.stringify(source)
  for(const options of [
    {edgeIndices:[]},{edgeIndices:[0,0]},{edgeIndices:[1]},
    {fractions:[]},{fractions:[.5,.5]},{fractions:[0]},
    {fractions:[1]},{fractions:[NaN]},
    {maxCandidates:0},{maxCandidates:1,fractions:[.25,.5]},
    {maxWallMs:999},{maxWallMs:30001},{clearanceM:0},
    {foldAngleRadians:-1},{foldAngleRadians:Math.PI+1},
  ])assert.throws(()=>search(source,options),/Invalid bounded crease fraction sweep/)
  assert.equal(JSON.stringify(source),frozen)
})
