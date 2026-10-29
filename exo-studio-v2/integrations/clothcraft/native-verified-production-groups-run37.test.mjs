import test from 'node:test'
import assert from 'node:assert/strict'
import {createNativeVerifiedProductionOrderRun37} from './native-verified-production-order-run37.mjs'

// The declaration guard must reject before the native marker compiler runs.
// A real marker/export run is intentionally not needed for this negative test.
const project={template:{panels:[
  {id:'front',name:'Front',fabric:'shell',grain_degrees:90},
  {id:'back',name:'Back',fabric:'shell',grain_degrees:90},
]},grade_run:{sizes:['M']}}
let calls=[]
const workspace={request:async packet=>{
  calls.push(packet.op)
  if(packet.op==='snapshot')return {ok:true,data:{revision:9,gradeRunPersisted:true,
    running:false,activeGradedSize:null,template:project.template}}
  if(packet.op==='save')return {ok:true,data:{project}}
  if(packet.op==='grade-run-cutlines')return {ok:true,data:{format:'exo-native-graded-cutlines.v1',
    sizes:[{size:'M',panels:[
      {panel_id:'front',cut:{points:[[0,0],[.2,0],[0,.2]]}},
      {panel_id:'back',cut:{points:[[0,0],[.2,0],[0,.2]]}},
    ]}]}}
  throw Error('UNEXPECTED_NATIVE_OPERATION')
}}

test('one fabric with distinct declared groups is refused before merging placements',async()=>{
  calls=[]
  await assert.rejects(createNativeVerifiedProductionOrderRun37(workspace,{
    expectedRevision:9,quantitiesBySize:{M:{front:1,back:1}},materialsByPanel:{
      front:{fabricId:'shell',groupId:'front-marker'},
      back:{fabricId:'shell',groupId:'back-marker'},
    },
  }),/DISTINCT_MARKER_GROUPS_REQUIRE_GROUP_AWARE_NATIVE_EXPORT/)
  // Source identity is checked twice, before and after the CUT inspection,
  // to catch grade-catalog changes between native reads. The reject must
  // still occur before any marker generation or physical artifact request.
  assert.deepEqual(calls,['snapshot','save','grade-run-cutlines','snapshot','save'],
    'the service must refuse mixed groups after complete source inspection, before marker generation')
})
