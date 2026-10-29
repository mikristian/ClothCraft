import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkMtmDraft20261024 as draft,runAccuMarkMtmBatch20261024 as batch} from './accumarkMtmDraftFoundation20261024.js'
const sizing={chestCm:98,waistCm:82,hipCm:100,bodyLengthCm:70,shoulderWidthCm:44,
 neckCm:39,armholeDepthCm:23,easeChestCm:8,easeWaistCm:6,easeHipCm:6,
 frontNeckDropCm:7,size:'M',fabricId:'cotton'}
test('measurement-driven torso drafting creates two editable reference blocks',()=>{
 const before=structuredClone(sizing),r=draft(sizing)
 assert.equal(r.ok,true,r.reason)
 assert.equal(r.actualBustCircumferenceCm,106)
 assert.equal(r.project.pieces.length,2)
 assert(r.project.pieces.every(x=>x.points.length===7&&x.grainAngleDeg===0))
 assert.equal(r.project.pieces[0].fabricId,'cotton')
 assert.equal(r.project.patternSource.referenceOnly,true)
 assert.equal(r.manufacturingApproved,false)
 assert.deepEqual(sizing,before)
})
test('changing body measurements produces real geometry changes',()=>{
 const a=draft(sizing),b=draft({...sizing,chestCm:108,waistCm:92})
 assert.equal(a.ok,true);assert.equal(b.ok,true)
 assert.notDeepEqual(a.project.pieces[0].points,b.project.pieces[0].points)
 assert.equal(b.actualBustCircumferenceCm-a.actualBustCircumferenceCm,10)
})
test('measurement range, ease, source labels and degenerate block blocked',()=>{
 assert.equal(draft({...sizing,chestCm:0}).code,'INVALID_MEASUREMENTS')
 assert.equal(draft({...sizing,easeChestCm:-3}).code,'INVALID_EASE')
 assert.equal(draft({...sizing,size:'M /../../'}).code,'INVALID_IDENTIFIERS')
 assert.equal(draft({...sizing,frontNeckDropCm:40}).ok,false)
})
test('batch is deterministic, all-or-nothing and size-collision safe',()=>{
 const profile=structuredClone(sizing)
 const result=batch([profile,{...profile,size:'L',chestCm:105}])
 assert.equal(result.ok,true,result.reason)
 assert.equal(result.count,2)
 assert.equal(result.gradeRulesCommitted,false)
 assert(result.projects[1].project.pieces[0].points[3].x>result.projects[0].project.pieces[0].points[3].x)
 assert.equal(batch([profile,{...profile,size:'m'}]).code,'DUPLICATE_SIZE')
 assert.equal(batch([profile,{...profile,size:'L',hipCm:-5}]).ok,false)
})
