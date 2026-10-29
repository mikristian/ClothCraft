import test from 'node:test'
import assert from 'node:assert/strict'
import {createModarisGradedNotchLink20261027 as create,reapplyModarisGradedNotchLink20261027 as reapply} from './modarisGradedNotchLink20261027.js'
import {assertFreshModarisGradedNotchLink20261027 as check} from './modarisGradedNotchLinkPersistence20261027.js'
const panel=(id,x,t)=>({id,points:[{x,y:0},{x:x+10,y:0},{x:x+10,y:10},{x,y:10}],edgeNames:['waist','side','hem','back'],notches:[{id:'n',edgeIndex:0,t}]})
const base=()=>({revision:2,units:'cm',grading:{sizes:['S','M','L'],baseSize:'M',widthPerSizeCm:1,lengthPerSizeCm:0.5},pieces:[panel('a',0,.3),panel('b',30,.7)]})
const specs={source:{pieceId:'a',notchId:'n'},target:{pieceId:'b',notchId:'n'}}
const saved=()=>JSON.parse(JSON.stringify(create(base(),{...specs,expectedRevision:2}).project))
test('graphless backward compatible and fully linked save/reopen carries 3-size proof',()=>{
 assert.deepEqual(check(base()),{ok:true,linked:false,manufacturingApproved:false})
 const p=saved(),before=structuredClone(p),result=check(p)
 assert.equal(result.linked,true);assert.deepEqual(result.sizes,['S','M','L'])
 assert.ok(result.proof.every(x=>x.precisionCm===0))
 assert.deepEqual(p,before)
})
test('source edits require reapply before save, then round trip accepted',()=>{
 const p=saved();p.pieces[0].notches[0].t=.62
 assert.throws(()=>check(p),/UNREAPPLIED_SOURCE_OR_TARGET/)
 const updated=reapply(p,{expectedRevision:3}).project
 assert.equal(updated.revision,4)
 assert.equal(check(JSON.parse(JSON.stringify(updated))).linked,true)
})
test('detects root, target, grade, identity, schema and unsafe tampering',()=>{
 for(const mutate of [
  p=>p.pieces[1].notches[0].t=.8,
  p=>p.pieces[1].points[1].x+=1,
  p=>p.grading.widthPerSizeCm=8,
  p=>p.grading.sizes.reverse(),
  p=>p.modarisGradedNotchLink.targetIdentity.edgeIndex=2,
  p=>p.modarisGradedNotchLink.injected=true,
  p=>p.modarisGradedNotchLink.appliedRevision=99,
  p=>p.pieces[0].points[0].x=NaN,
  p=>p.pieces[0].curves={0:{cx:5,cy:4}},
 ]){
  const p=saved();mutate(p)
  assert.throws(()=>check(p))
 }
 const accessor=saved();Object.defineProperty(accessor.pieces[0].notches[0],'t',{enumerable:true,get(){throw Error('getter executed')}})
 assert.throws(()=>check(accessor),/ACCESSOR/)
 const polluted=saved();Object.setPrototypeOf(polluted.modarisGradedNotchLink,{unexpected:true})
 assert.throws(()=>check(polluted),/PROTOTYPE/)
})
