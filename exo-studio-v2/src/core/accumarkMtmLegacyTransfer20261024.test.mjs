import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkMtmDraft20261024} from './accumarkMtmDraftFoundation20261024.js'
import {transferAccuMarkMtmReference20261024} from './accumarkMtmLegacyTransfer20261024.js'
const params={chestCm:98,waistCm:82,hipCm:100,bodyLengthCm:70,shoulderWidthCm:44,neckCm:39,armholeDepthCm:23,size:'M'}
test('replacement removes stale sewn production refs and yields editable layout defaults',()=>{
 const original={id:'old',name:'Old',pieces:[{id:'old_piece'}],seams:[{a:'old'}],
  productionSpec:{authorized:true},grading:{sizes:['S','M']},render:{camera:{x:1}}}
 const before=structuredClone(original),r=transferAccuMarkMtmReference20261024(original,createAccuMarkMtmDraft20261024(params))
 assert.equal(r.ok,true)
 assert.equal(r.project.seams.length,0)
 assert.equal(r.project.productionSpec,null)
 assert.equal(r.project.patternSource.referenceOnly,true)
 assert.equal(r.project.pieces.length,2)
 assert(r.project.pieces.every(p=>p.layout2d&&p.arrangement3d&&p.locked===false&&p.active3d===false))
 assert.deepEqual(r.project.render,original.render)
 assert.deepEqual(original,before)
})
test('incomplete or unverified draft is refused',()=>{
 assert.throws(()=>transferAccuMarkMtmReference20261024({pieces:[]},{ok:true}),/validated measured draft/)
})
