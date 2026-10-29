import test from 'node:test'
import assert from 'node:assert/strict'
import {editAccuMarkGradeDelta,readAccuMarkGradeDeltaMatrix} from './accumarkNumericGradeDelta20261023.js'
import {gradeProject} from './grading.js'

const sizes=['XS','S','M','L','XL','XXL']
const rule={mode:'small-large-incremental',sizes,baseSize:'M',steps:[{dx:.2,dy:-.5},{dx:.4,dy:-.2},{dx:.7,dy:.3},{dx:1.1,dy:.5},{dx:1.4,dy:.9}]}
function fixture(withRule=true){
  return {grading:{sizes:[...sizes],baseSize:'M',widthPerSizeCm:2,lengthPerSizeCm:1},pieces:[{id:'panel',points:[{id:'a',x:0,y:0,...(withRule?{industrialGradeRule:structuredClone(rule)}:{})},{id:'b',x:15,y:0},{id:'c',x:15,y:12},{id:'d',x:0,y:12}]}]}
}
const matrix=p=>readAccuMarkGradeDeltaMatrix(p,{pieceId:'panel',pointIndex:0}).rows

test('reads actual authored industrial nonuniform size offsets with fixed base',()=>{
 const p=fixture(),rows=matrix(p)
 assert.deepEqual(rows.map(r=>Number(r.dxCm.toFixed(8))),[-.6,-.4,0,.7,1.8,3.2])
 assert.equal(rows[2].dyCm,0)
 assert.deepEqual(matrix(p),matrix(p))
})

test('cumulative edit preserves other axis and independent sizes without mutating input',()=>{
 const p=fixture(),source=structuredClone(p),before=matrix(p)
 const result=editAccuMarkGradeDelta(p,{pieceId:'panel',pointIndex:0,size:'L',dxCm:2.75})
 const rows=matrix(result.project)
 assert.equal(rows[3].dxCm,2.75)
 assert.deepEqual(rows.map(r=>r.dyCm),before.map(r=>r.dyCm))
 assert.deepEqual(rows.filter(r=>r.size!=='L'),before.filter(r=>r.size!=='L'))
 assert.deepEqual(p,source)
 assert.equal(result.validation.sizes.length,6)
})

test('maintain growths preserves outward increments on each side of base',()=>{
 const p=fixture(),before=matrix(p)
 const high=editAccuMarkGradeDelta(p,{pieceId:'panel',pointIndex:0,size:'L',dxCm:1.25,maintainGrowths:true}).project
 const h=matrix(high)
 assert(Math.abs(h[4].dxCm-before[4].dxCm-.55)<1e-9)
 assert(Math.abs(h[5].dxCm-before[5].dxCm-.55)<1e-9)
 assert.equal(h[1].dxCm,before[1].dxCm)
 const low=editAccuMarkGradeDelta(p,{pieceId:'panel',pointIndex:0,size:'S',dyCm:-1.6,maintainGrowths:true}).project
 const l=matrix(low)
 assert(Math.abs(l[0].dyCm-before[0].dyCm-(l[1].dyCm-before[1].dyCm))<1e-9)
 assert.equal(l[3].dyCm,before[3].dyCm)
})

test('incremental edit uses neighbor toward base on either side',()=>{
 const p=fixture(),old=matrix(p)
 const upper=matrix(editAccuMarkGradeDelta(p,{pieceId:'panel',pointIndex:0,size:'XL',mode:'incremental',dyCm:2}).project)
 assert(Math.abs(upper[4].dyCm-old[3].dyCm-2)<1e-9)
 const lower=matrix(editAccuMarkGradeDelta(p,{pieceId:'panel',pointIndex:0,size:'S',mode:'incremental',dxCm:-3}).project)
 assert(Math.abs(lower[1].dxCm-old[2].dxCm+3)<1e-9)
})

test('automatic point grades convert from actual evaluated positions; all sizes remain evaluable',()=>{
 const p=fixture(false),prior=matrix(p)
 const next=editAccuMarkGradeDelta(p,{pieceId:'panel',pointIndex:0,size:'XXL',dyCm:4}).project
 const after=matrix(next)
 assert.deepEqual(after.slice(0,-1).map(r=>r.dxCm),prior.slice(0,-1).map(r=>r.dxCm))
 for(const size of sizes)assert(Number.isFinite(gradeProject(next,size).pieces[0].points[0].x))
})

test('rejects invalid edits, rule references, stale size lines, and unsafe breaks',()=>{
 const p=fixture()
 const spec={pieceId:'panel',pointIndex:0,size:'M',dxCm:1}
 assert.throws(()=>editAccuMarkGradeDelta(p,spec),/base size/)
 assert.throws(()=>editAccuMarkGradeDelta(p,{...spec,size:'L',dxCm:Infinity}),/finite/)
 assert.throws(()=>editAccuMarkGradeDelta(p,{...spec,size:'L',dxCm:201}),/100 cm/)
 assert.throws(()=>editAccuMarkGradeDelta(p,{...spec,size:'unknown'}),/unknown target/)
 assert.throws(()=>editAccuMarkGradeDelta(p,{...spec,size:'L',mode:'invalid'}),/mode/)
 p.pieces[0].points[0].namedGradeRuleRef={id:'reference',version:1,units:'cm'}
 assert.throws(()=>editAccuMarkGradeDelta(p,{...spec,size:'L'}),/detach/)
 delete p.pieces[0].points[0].namedGradeRuleRef
 p.pieces[0].points[0].industrialGradeRule.sizes=['XS','S','M','L','XL','wrong']
 assert.throws(()=>editAccuMarkGradeDelta(p,{...spec,size:'L'}),/incompatible/)
})
