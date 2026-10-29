import assert from 'node:assert/strict'
import test from 'node:test'
import {nativeSourceFingerprint} from './native-production-order-marker-20261029.mjs'
import {generateNativeVerifiedOrderMarkersRun36} from './native-verified-order-handoff-run36-20261029.mjs'

const project={template:{panels:[
  {id:'front',fabric:'shell',grain_degrees:90},
  {id:'back',fabric:'shell',grain_degrees:90},
]},grade_run:{sizes:['M']}}
const observations=[]
const workspace={request:async packet=>{
  observations.push(packet.op)
  if(packet.op==='snapshot')return {ok:true,data:{
    revision:7,gradeRunPersisted:true,activeGradedSize:null,running:false,
    template:project.template,
  }}
  if(packet.op==='save')return {ok:true,data:{project}}
  throw Error('MUST_NOT_READ_CUT_OR_EXPORT_DIFFERENT_GROUPS')
}}
const order={
  sourceFingerprint:nativeSourceFingerprint(project),
  nativeCutlineFingerprint:'a'.repeat(64),
  sizes:['M'],panelIds:['front','back'],
  nativeSourceMaterialByPanel:{
    front:{sourceFabricId:'shell',sourceGrainDegrees:90},
    back:{sourceFabricId:'shell',sourceGrainDegrees:90},
  },
  quantitiesBySize:{M:{front:1,back:1}},
  materialsByPanel:{
    front:{fabricId:'shell',groupId:'MARKER-A',grainAngleDeg:90,nap:'one-way'},
    back:{fabricId:'shell',groupId:'MARKER-B',grainAngleDeg:90,nap:'one-way'},
  },
  cuttingAuthorized:false,
}

test('direct native RUN36 refuses same-fabric different marker groups before reading CUT',async()=>{
  await assert.rejects(
    generateNativeVerifiedOrderMarkersRun36(workspace,order),
    /DISTINCT_MARKER_GROUPS_REQUIRE_GROUP_AWARE_NATIVE_EXPORT/,
  )
  assert.deepEqual(observations,['snapshot','save'])
})
