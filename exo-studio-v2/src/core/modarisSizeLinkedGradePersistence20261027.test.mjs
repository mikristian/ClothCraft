import test from 'node:test'
import assert from 'node:assert/strict'
import {createModarisSizeLinkedGrade} from './modarisSizeLinkedGrade20261027.js'
import {assertFreshModarisSizeLinkedGradeProject20261027 as assertFresh} from './modarisSizeLinkedGradePersistence20261027.js'
const rule=(n=1)=>({mode:'small-large-incremental',sizes:['S','M','L'],baseSize:'M',steps:[{dx:n,dy:1},{dx:n,dy:1}]})
const piece=(id,n)=>({id,points:[{id:'a',x:0,y:0,industrialGradeRule:rule(n)},{id:'b',x:20,y:0,industrialGradeRule:rule()},{id:'c',x:20,y:20,industrialGradeRule:rule()},{id:'d',x:0,y:20,industrialGradeRule:rule()}]})
const fixture=()=>({units:'cm',grading:{sizes:['S','M','L'],baseSize:'M'},pieces:[piece('front',2),piece('back',1)]})
const linked=()=>createModarisSizeLinkedGrade(fixture(),[{source:{pieceId:'front',pointIndex:0},target:{pieceId:'back',pointIndex:0}}]).project
test('valid linked graph survives exact saved JSON roundtrip without mutation',()=>{
 const p=linked(),raw=JSON.stringify(p),roundtrip=JSON.parse(raw)
 assert.strictEqual(assertFresh(p),p)
 assert.strictEqual(assertFresh(roundtrip),roundtrip)
 assert.equal(JSON.stringify(p),raw)
})
test('old graphless project remains backward compatible',()=>{
 const p=fixture();assert.strictEqual(assertFresh(p),p)
})
test('stale source point, rule changes, size drift and altered target fail closed',()=>{
 for(const update of [
  p=>{p.pieces[0].points[0].x+=1},
  p=>{p.pieces[0].points[0].industrialGradeRule.steps[0].dx+=3},
  p=>{p.pieces[1].points[0].industrialGradeRule.steps[0].dx+=3},
  p=>{p.grading.sizes=['S','M','XL']},
  p=>{p.modarisSizeLinkedGrade.units='mm'},
  p=>{p.modarisSizeLinkedGrade.links[0].sourceTopology.pointIds[0]='forged'},
  p=>{p.modarisSizeLinkedGrade.links[0].appliedRule.steps[0].dx+=1},
 ]){
  const p=linked();update(p);const before=JSON.stringify(p)
  assert.throws(()=>assertFresh(p),/Modaris grade persistence/)
  assert.equal(JSON.stringify(p),before)
 }
})
test('serialized graph unknown fields and forged link identities are refused',()=>{
 const p=linked();p.modarisSizeLinkedGrade.links[0].unexpected=true
 assert.throws(()=>assertFresh(JSON.parse(JSON.stringify(p))),/forged link fields/)
 const q=linked();q.modarisSizeLinkedGrade.links[0].target.pointIndex=1
 assert.throws(()=>assertFresh(q))
})
