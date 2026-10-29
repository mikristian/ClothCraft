import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkNativeRuleSet} from './accumarkNativePointRuleSet20261023.js'
import {prepareNativeGradeCatalog20261025} from './nativeGradeCatalogBridge20261025.js'
import {inspectNativeGradeAuthenticCutBundle20261026 as inspect} from './nativeGradeAuthenticCutBundle20261026.js'

const SIZES=['XS','S','M','L','XL','XXL']
function fixture(){
 const snapshot={revision:9,template:{name:'CUT',panels:[{id:'front',name:'Front',
  polygon:{points:[[0,0],[.2,0],[.2,.3],[0,.3]],edges:['a','b','c','d'],
   seam_allowances:{a:.01,b:.01,c:.01,d:.01},notches:{a:[{t:.5,depth:.004}]}}}],
  seams:[],fabrics:[]}}
 const ruleSet=createAccuMarkNativeRuleSet(snapshot).ruleSet
 const proposal=prepareNativeGradeCatalog20261025(snapshot,{template:snapshot.template},ruleSet)
 assert(proposal.ok,proposal.reason)
 const status={revision:9,persistedInProject:true,manufacturingApproved:false,
  catalog:proposal.gradeRun}
 const response={format:'exo-native-graded-cutlines.v1',sourceRevision:9,revision:9,
  manufacturerReady:false,cuttingAuthorized:false,sizes:SIZES.map(size=>({
   size,seams:[],panels:[{panel_id:'front',sewline_edge_lengths_m:{a:.2,b:.3,c:.2,d:.3},
    cut:{points:[[-.01,-.01],[.21,-.01],[.21,.31],[-.01,.31]],
     perimeter_m:1.08,area_m2:.0704,
     edges:['a','b','c','d'].map((name,index)=>({name,allowance_m:.01,start:index,end:(index+1)%4})),
     notches:[{edge_id:'a',t:.5,depth_m:.004,cut_start:[.1,-.01],inner_end:[.1,-.006]}]}}]
  }))}
 return {snapshot,ruleSet,status,response}
}
test('complete six-size geometry can be inspected but cannot authenticate Rust or approve CUT',()=>{
 const value=fixture()
 const blocked=inspect(value.snapshot,value.ruleSet,value.status,value.response)
 assert.equal(blocked.code,'UNAUTHENTICATED_RPC')
 const result=inspect(value.snapshot,value.ruleSet,value.status,value.response,{liveRustRpc:true})
 assert.equal(result.ok,true,JSON.stringify(result))
 assert.deepEqual(result.verifiedSizes,SIZES)
 for(const field of ['authoritativeRust','independentlyVerified','approvedForSizing',
  'manufacturerReady','manufacturingApproved','cuttingAuthorized'])assert.equal(result[field],false)
})
test('missing, stale, duplicate, altered grade and spoofed release proofs fail closed',()=>{
 const variants=[
  [item=>{item.response.revision++},'STALE_NATIVE_PROOF'],
  [item=>{item.response.sourceRevision++},'STALE_NATIVE_PROOF'],
  [item=>{item.status.revision++},'STALE_NATIVE_PROOF'],
  [item=>{item.response.manufacturerReady=true},'SPOOFED_APPROVAL'],
  [item=>{item.response.cuttingAuthorized=true},'SPOOFED_APPROVAL'],
  [item=>{item.status.manufacturingApproved=true},'SPOOFED_APPROVAL'],
  [item=>{item.response.sizes.pop()},'SIZE_COVERAGE'],
  [item=>{item.response.sizes[2].size='XS'},'INVALID_CUT_BUNDLE'],
  [item=>{item.response.sizes[0].panels=[]},'INVALID_CUT_BUNDLE'],
  [item=>{item.response.sizes[0].panels[0].cut.edges.pop()},'INVALID_CUT_BUNDLE'],
  [item=>{item.response.sizes[0].panels[0].cut.edges[0].start=900},'INVALID_CUT_BUNDLE'],
  [item=>{item.response.sizes[0].panels[0].cut.edges[0].allowance_m=.3},'INVALID_CUT_BUNDLE'],
  [item=>{item.response.sizes[0].panels[0].cut.notches[0].t=.25},'INVALID_CUT_BUNDLE'],
  [item=>{item.response.sizes[0].panels[0].cut.notches[0].depth_m=.03},'INVALID_CUT_BUNDLE'],
  [item=>{item.response.sizes[0].panels[0].cut.notches[0].cut_start=[Infinity,0]},'INVALID_CUT_BUNDLE'],
  [item=>{item.response.sizes[0].panels[0].cut.points[0][0]=NaN},'INVALID_CUT_BUNDLE'],
  [item=>{item.ruleSet.panels.front.pointOffsetsMm.L[1][0]=17},'STALE_NATIVE_CATALOG'],
  [item=>{item.snapshot.template.panels[0].polygon.points[0][0]=2},'STALE_NATIVE_CATALOG'],
 ]
 for(const [index,[change,code]] of variants.entries()){
  const value=fixture();change(value)
  const result=inspect(value.snapshot,value.ruleSet,value.status,value.response,{liveRustRpc:true})
  assert.equal(result.ok,false,'case '+index)
  assert.equal(result.code,code,'case '+index)
  assert.equal(result.cuttingAuthorized,false)
  assert.equal(result.independentlyVerified,false)
 }
})
