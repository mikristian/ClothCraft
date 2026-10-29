import assert from 'node:assert/strict'
import {freeTangentDragDelta} from '../src/core/freeTangentDrag.js'
import {editNativeFreeCurveTangent} from '../src/core/nativeFreeCurvePoints.js'
const p={points:[[0,0],[.2,0],[.2,.1],[0,.1]],edges:['a','b','c','d'],curves:{},free_curve_points:{a:[{id:'k1',t:.5,position:[.1,0]}]}}
for(const side of ['in','out']){
 const delta=[.006,-.004],saved=JSON.stringify(p),r=editNativeFreeCurveTangent(p,'a','k1',freeTangentDragDelta(delta,side),{side,breakTangents:true})
 const mark=r.free_curve_points.a[0],sign=side==='in'?-1:1
 const before=[.1+sign*.2*.18,0],after=mark.position.map((n,i)=>n+sign*mark['derivative_'+side][i]*.18)
 after.forEach((n,i)=>assert(Math.abs(n-before[i]-delta[i])<1e-12))
 mark['derivative_'+(side==='in'?'out':'in')].forEach((v,i)=>assert(Math.abs(v-[.2,0][i])<1e-12));assert.equal(JSON.stringify(p),saved)
}
assert.equal(freeTangentDragDelta([NaN,0],'out'),null)
assert.equal(freeTangentDragDelta([0,0],'invalid'),null)
console.log(JSON.stringify({pass:true,incomingFollowsPointer:true,outgoingFollowsPointer:true,oppositeHandlePreserved:true,sourceImmutable:true}))
