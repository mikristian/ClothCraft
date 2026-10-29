import test from 'node:test'
import assert from 'node:assert/strict'
import {sampleNativeFreeKnotEdge20261027,verifyModarisNativeFreeKnotReactiveWitness20261027 as verify} from './modarisNativeFreeKnotReactiveWitness20261027.js'

const sizes=['XS','S','M','L','XL','XXL']
const offsets=[-.015,-.007,0,.005,.010,.014]
const edges=['top','right','bottom','left']
const sew={id:'sew-top',a:{panel:'front',edge:'top',range:[0,1]},
  b:{panel:'back',edge:'top',range:[0,1]},notches:[[.25,.25],[.75,.75]],
  reverse_b:true,allow_ease:false,stiffness:1}
const sum=(a,b)=>[a[0]+b[0],a[1]+b[1]]
const scale=(a,n)=>[a[0]*n,a[1]*n]
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]]
const dist=(a,b)=>Math.hypot(...sub(a,b))
function material(id,offset,after,dual=false){
  const shift=after?-.02:0,width=.4+offset+shift
  const first=[.12+offset/3,.03],second=[.28+shift+offset*2/3,.03]
  const slope=shift+offset
  const knots=(dual?[['free_1',.35],['free_2',.65]]:[['free_1',.5]]).map(([knotId,t])=>({
    id:knotId,t,position:[.4*t+slope*t,.03],derivative:[.4+slope,0],
    derivative_in:[.4+slope,0],derivative_out:[.4+slope,0]}))
  return {id,polygon:{points:[[0,0],[width,0],[width,.32],[0,.32]],edges,
    curves:{top:[first,second]},free_curve_points:{top:knots},
    notches:{top:[{t:.25,depth_m:.004},{t:.75,depth_m:.004}]},
    seam_allowances:Object.fromEntries(edges.map(edge=>[edge,.01]))}}
}
function project(after,dual=false){
  const panels=offset=>[material('front',offset,after,dual),material('back',offset,after,dual)]
  return {template:{panels:panels(0),seams:[structuredClone(sew)]},grade_run:{sizes,
    gradedTemplates:sizes.map((_,i)=>({panels:panels(offsets[i]),seams:[structuredClone(sew)]}))}}
}
function station(samples,t){
  const ds=samples.slice(1).map((p,i)=>dist(p,samples[i]))
  const total=ds.reduce((a,b)=>a+b,0)
  let moved=0
  for(let i=0;i<ds.length;i++){
    if(moved+ds[i]>=total*t||i===ds.length-1){
      const a=samples[i],b=samples[i+1],r=(total*t-moved)/ds[i]
      const tangent=scale(sub(b,a),1/ds[i])
      return {point:sum(a,scale(sub(b,a),r)),normal:[tangent[1],-tangent[0]],total}
    }
    moved+=ds[i]
  }
  throw Error('Cannot sample')
}
function cutline(project,revision){
  return {format:'exo-native-graded-cutlines.v1',sourceRevision:revision,revision,
    manufacturerReady:false,cuttingAuthorized:false,sizes:project.grade_run.gradedTemplates.map((t,i)=>({
      size:sizes[i],panels:t.panels.map(p=>{
        const poly=p.polygon,counts=Object.fromEntries(edges.map(edge=>{
          const sampled=sampleNativeFreeKnotEdge20261027(poly,edge)
          return [edge,sampled.slice(1).reduce((sum,q,j)=>sum+dist(q,sampled[j]),0)]
        }))
        const notches=poly.notches.top.map(n=>{
          const s=station(sampleNativeFreeKnotEdge20261027(poly,'top'),n.t)
          const cutStart=sum(s.point,scale(s.normal,.01))
          return {edge_id:'top',t:n.t,depth_m:n.depth_m,cut_start:cutStart,
            inner_end:sub(cutStart,scale(s.normal,n.depth_m))}
        })
        const width=poly.points[1][0]
        return {panel_id:p.id,sewline_edge_lengths_m:counts,
          cut:{edges:edges.map((name,j)=>({name,allowance_m:.01,start:j,end:(j+1)%4})),
            points:[[-.01,-.01],[width+.01,-.01],[width+.01,.33],[-.01,.33]],
            notches,area_m2:(width+.02)*.34,perimeter_m:2*(width+.36)}}
      }),seams:[],
    }))}
}
function sewn(project,revision){return {format:'exo-native-six-size-sewn-balance-audit.v1',
  sourceRevision:revision,factoryApproved:false,easeReviewRequired:false,joinedCurveMutation:false,
  sizes:project.grade_run.gradedTemplates.map((t,i)=>{
    const base=t.panels[0].polygon,samples=sampleNativeFreeKnotEdge20261027(base,'top')
    const total=samples.slice(1).reduce((sum,p,j)=>sum+dist(p,samples[j]),0)
    const side=id=>({panelId:id,edgeId:'top',interval:[0,1],reversed:id==='back',
      fullSewlineM:total,sewnIntervalM:total,cubicControlsM:base.curves.top,
      freeCurvePointIds:base.free_curve_points.top.map(k=>k.id),
      notchPositionsM:[station(samples,.25).point,station(samples,.75).point]})
    return {size:sizes[i],seams:[{seamId:'sew-top',a:side('front'),b:side('back'),
      allowEase:false,requiresEaseReview:false,mismatchM:0,
      notchIntervalLengthsM:[[total*.25,total*.25],[total*.5,total*.5],[total*.25,total*.25]]}]}
  })}}
function fixture(dual=false){
  const beforeProject=project(false,dual),afterProject=project(true,dual)
  return {beforeProject,afterProject,beforeCutlines:cutline(beforeProject,20),
    afterCutlines:cutline(afterProject,21),beforeSewing:sewn(beforeProject,20),
    afterSewing:sewn(afterProject,21),beforeRevision:20,afterRevision:21,
    changedPanelIds:['front','back']}
}
test('separate free-knot spline verifier independently samples six sizes and 24 CUT notches',()=>{
  const f=fixture(),unmodified=structuredClone(f)
  const result=verify(f)
  assert.equal(result.ok,true,result.reason)
  assert.equal(result.verifiedFreeKnotReferences,12)
  assert.equal(result.verifiedPhysicalNotches,24)
  assert.equal(result.verifiedPhysicalCutPanels,12)
  assert.equal(result.nativeFreeKnotPropagationAccepted,true)
  assert.equal(result.factoryApproved,false)
  assert.match(result.gradeAndSewnProofDigest,/^sha256:[a-f0-9]{64}$/)
  assert.deepEqual(f,unmodified)
})
test('two ordered independently graded free knots per sewn edge preserve 24 knot identities and physical marks',()=>{
  const f=fixture(true)
  const result=verify(f)
  assert.equal(result.ok,true,result.reason)
  assert.equal(result.verifiedFreeKnotReferences,24)
  assert.equal(result.verifiedPhysicalNotches,24)
  assert.equal(result.verifiedPhysicalCutPanels,12)
  assert.equal(result.factoryApproved,false)
  const corruptions=[
    x=>{x.afterProject.grade_run.gradedTemplates[0].panels[1].polygon.free_curve_points.top[1].id='free_1'},
    x=>{x.afterProject.grade_run.gradedTemplates[0].panels[1].polygon.free_curve_points.top[1].t=.2},
    x=>{x.afterProject.grade_run.gradedTemplates[4].panels[1].polygon.free_curve_points.top[1].derivative_out[0]+=.002},
    x=>{x.afterProject.template.panels[0].polygon.free_curve_points.top[1].position[0]+=.004},
  ]
  for(const [i,corrupt] of corruptions.entries()){
    const input=fixture(true);corrupt(input)
    assert.equal(verify(input).ok,false,`Two-knot corruption ${i} accepted`)
  }
})
test('refuses forged source and per-size free-curve positions, derivatives, knot IDs and t',()=>{
  const changes=[
    f=>f.afterProject.template.panels[0].polygon.free_curve_points.top[0].position[0]+=.005,
    f=>f.afterProject.grade_run.gradedTemplates[4].panels[1].polygon.free_curve_points.top[0].position[0]+=.002,
    f=>f.afterProject.grade_run.gradedTemplates[4].panels[1].polygon.free_curve_points.top[0].derivative[0]+=.007,
    f=>f.afterProject.grade_run.gradedTemplates[4].panels[1].polygon.free_curve_points.top[0].derivative_in[0]+=.007,
    f=>f.afterProject.grade_run.gradedTemplates[4].panels[1].polygon.free_curve_points.top[0].derivative_out[0]+=.007,
    f=>f.afterProject.grade_run.gradedTemplates[0].panels[0].polygon.free_curve_points.top[0].id='forged',
    f=>f.afterProject.grade_run.gradedTemplates[0].panels[0].polygon.free_curve_points.top[0].t=.4,
    f=>f.afterProject.template.panels[0].polygon.free_curve_points.top[0].mirror_group='g1',
    f=>f.afterProject.grade_run.gradedTemplates[2].panels[0].polygon.free_curve_points.top[0].derivative=undefined,
    f=>f.afterProject.grade_run.gradedTemplates[2].panels[0].polygon.free_curve_points.top[0].position[0]=Number.NaN,
  ]
  for(const [index,change] of changes.entries()){
    const f=fixture();change(f)
    assert.equal(verify(f).ok,false,`Forged curve ${index} accepted`)
  }
})
test('rejects altered real CUT, notch arclength, sewn balance and grade revision provenance',()=>{
  const changes=[
    f=>f.afterCutlines.sizes[0].panels[0].cut.notches.pop(),
    f=>f.afterCutlines.sizes[0].panels[0].cut.notches[0].cut_start[1]+=.004,
    f=>f.afterCutlines.sizes[0].panels[0].cut.edges[0].allowance_m=.02,
    f=>f.afterCutlines.sizes[0].panels[0].sewline_edge_lengths_m.top=.11,
    f=>f.afterSewing.sizes[1].seams[0].a.fullSewlineM=.12,
    f=>f.afterSewing.sizes[0].seams[0].b.notchPositionsM[1][0]+=.01,
    f=>f.afterSewing.sizes[0].seams[0].b.freeCurvePointIds=['wrong'],
    f=>f.afterSewing.sizes[4].seams[0].notchIntervalLengthsM[0][0]+=.001,
    f=>f.afterProject.template.seams[0].allow_ease=true,
    f=>f.afterProject.grade_run.gradedTemplates[4].panels[0].polygon.points[1][0]+=.01,
    f=>f.afterCutlines.sourceRevision=10,
    f=>f.afterRevision=22,
    f=>f.afterCutlines.sizes[0].panels[0].cut.points=structuredClone(f.beforeCutlines.sizes[0].panels[0].cut.points),
  ]
  for(const [index,change] of changes.entries()){
    const f=fixture();change(f)
    assert.equal(verify(f).ok,false,`Forged physical receipt ${index} accepted`)
  }
})
