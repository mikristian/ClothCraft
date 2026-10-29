import test from 'node:test'
import assert from 'node:assert/strict'
import {offsetGradePoint,distributeGradePoint,smoothGradePoint,redistributeSizeLine} from './accumarkGradeRuleOperations20261023.js'
import {gradeProject} from './grading.js'
import {evaluateIndustrialGradeTable} from './industrialGradeRules.js'

const sizes=['XS','S','M','L','XL']
function project(){
 return {id:'accumark-rectangle',grading:{sizes:[...sizes],baseSize:'M',widthPerSizeCm:1,lengthPerSizeCm:1},
   pieces:[{id:'front',points:[{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10}],internalLines:[],notches:[]}]}
}
function industrial(p,idx,steps){
 p.pieces[0].points[idx].industrialGradeRule={mode:'small-large-incremental',sizes:[...sizes],baseSize:'M',
  steps:steps.map(([dx,dy])=>({dx,dy}))}
}
test('offset grading uses signed physical normal for five sizes and leaves source intact',()=>{
 const p=project(),before=structuredClone(p)
 const graded=offsetGradePoint(p,{pieceId:'front',pointIndex:0,edgeIndex:0,offsetsCm:[-2,-1,0,1,2]})
 assert.deepEqual(p,before)
 assert.equal(graded.pieces[0].points[0].x,0)
 const coords=sizes.map(size=>gradeProject(graded,size).pieces[0].points[0])
 assert.deepEqual(coords.map(a=>a.y),[-2,-1,0,1,2])
 assert(coords.every(point=>point.x===0))
 assert.throws(()=>offsetGradePoint(p,{pieceId:'front',pointIndex:0,edgeIndex:0,offsetsCm:[-2,0,1,2,3]}),/zero at base/)
 assert.throws(()=>offsetGradePoint(p,{pieceId:'front',pointIndex:0,edgeIndex:1e9,offsetsCm:[-2,-1,0,1,2]}),/reference edge/)
})
test('distribute grade preserves smallest/base/largest, fills intermediate values',()=>{
 const p=project();industrial(p,0,[[2,0],[4,0],[1,0],[7,0]])
 const orig=structuredClone(p)
 const res=distributeGradePoint(p,{pieceId:'front',pointIndex:0})
 assert.deepEqual(p,orig)
 const tab=evaluateIndustrialGradeTable(res.pieces[0].points[0].industrialGradeRule)
 assert.deepEqual(sizes.map(size=>tab[size].dx),[-6,-3,0,4,8])
})
test('smooth grading keeps both endpoints and base fixed without source mutation',()=>{
 const p=project();industrial(p,0,[[2,0],[5,0],[1,0],[8,0]])
 const original=structuredClone(p)
 const old=evaluateIndustrialGradeTable(p.pieces[0].points[0].industrialGradeRule)
 const res=smoothGradePoint(p,{pieceId:'front',pointIndex:0,strength:1})
 const tab=evaluateIndustrialGradeTable(res.pieces[0].points[0].industrialGradeRule)
 for(const size of ['XS','M','XL'])assert.deepEqual(tab[size],old[size])
 assert.notEqual(tab.S.dx,old.S.dx)
 assert.notEqual(tab.L.dx,old.L.dx)
 assert.deepEqual(p,original)
 assert.throws(()=>smoothGradePoint(p,{pieceId:'front',pointIndex:0,strength:2}),/strength/)
})
test('size-step redistribution retains named sizes, interpolates new and rejects partial runs',()=>{
 const p=project()
 for(let i=0;i<4;i++)industrial(p,i,[[1+i,0],[1+i,0],[1+i,0],[1+i,0]])
 const before=structuredClone(p)
 const oldPositions=sizes.map((size,i)=>({size,position:i}))
 const next=redistributeSizeLine(p,{oldPositions,newPositions:[
  {size:'XS',position:0},{size:'S',position:1},{size:'M',position:2},{size:'ML',position:2.5},
  {size:'L',position:3},{size:'XL',position:4}]})
 assert.deepEqual(p,before)
 assert.equal(next.grading.sizes.length,6)
 for(const size of sizes)assert.deepEqual(gradeProject(next,size).pieces[0].points.map(({x,y})=>({x,y})),gradeProject(p,size).pieces[0].points.map(({x,y})=>({x,y})))
 const rule=next.pieces[0].points[0].industrialGradeRule
 assert.equal(evaluateIndustrialGradeTable(rule).ML.dx,.5)
 const bad=project()
 assert.throws(()=>redistributeSizeLine(bad,{oldPositions,newPositions:oldPositions}),/complete industrial rules/)
 assert.throws(()=>redistributeSizeLine(p,{oldPositions,newPositions:[{size:'M',position:2},{size:'L',position:1}]}),/strictly increasing/)
})

test('redistribution rejects stale or reordered point grade rules without mutating the project',()=>{
 const oldPositions=sizes.map((size,i)=>({size,position:i}))
 const newPositions=[...oldPositions.slice(0,3),{size:'ML',position:2.5},...oldPositions.slice(3)]
 for(const mutate of [
  rule=>{rule.sizes=['XS','S','L','M','XL']},
  rule=>{rule.baseSize='S'},
  rule=>{rule.steps[1].dx=Infinity},
 ]){
  const p=project()
  for(let i=0;i<4;i++)industrial(p,i,[[1,0],[1,0],[1,0],[1,0]])
  mutate(p.pieces[0].points[2].industrialGradeRule)
  const before=structuredClone(p)
  assert.throws(()=>redistributeSizeLine(p,{oldPositions,newPositions}),/mismatched ordered size line|Invalid industrial grade rule/)
  assert.deepEqual(p,before)
 }
})

test('size-line operations fail closed on empty labels, padded new names and malformed position records',()=>{
 const p=project()
 for(let i=0;i<4;i++)industrial(p,i,[[1,0],[1,0],[1,0],[1,0]])
 const original=structuredClone(p)
 const oldPositions=sizes.map((size,i)=>({size,position:i}))
 const createNew=(size)=>[...oldPositions.slice(0,3),{size,position:2.5},...oldPositions.slice(3)]
 assert.throws(()=>redistributeSizeLine(p,{oldPositions,newPositions:createNew(' ML ')}),/uniquely named/)
 assert.throws(()=>redistributeSizeLine(p,{oldPositions,newPositions:createNew('')}),/uniquely named/)
 assert.throws(()=>redistributeSizeLine(p,{oldPositions,newPositions:[null,...oldPositions.slice(1)]}),/named size records/)
 assert.throws(()=>redistributeSizeLine(p,{oldPositions:[null,...oldPositions.slice(1)],newPositions:oldPositions}),/named size records/)
 const invalid=structuredClone(p)
 invalid.grading.sizes[0]=''
 assert.throws(()=>smoothGradePoint(invalid,{pieceId:'front',pointIndex:0}),/invalid size line/)
 assert.deepEqual(p,original)
})

test('existing size coordinates cannot silently shift within an epsilon',()=>{
 const p=project()
 for(let i=0;i<4;i++)industrial(p,i,[[1,0],[1,0],[1,0],[1,0]])
 const before=structuredClone(p)
 const oldPositions=sizes.map((size,i)=>({size,position:i}))
 const newPositions=oldPositions.map(x=>({...x}))
 newPositions[2].position+=1e-11
 assert.throws(()=>redistributeSizeLine(p,{oldPositions,newPositions}),/existing size position must remain unchanged: M/)
 assert.deepEqual(p,before)
})
