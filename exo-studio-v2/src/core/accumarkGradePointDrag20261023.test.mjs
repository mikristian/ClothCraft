import test from 'node:test'
import assert from 'node:assert/strict'
import {buildAccuMarkGradePointDragProposal as drag} from './accumarkGradePointDrag20261023.js'
import {readAccuMarkGradeDeltaMatrix} from './accumarkNumericGradeDelta20261023.js'
import {gradeProject} from './grading.js'

const sizes=['XS','S','M','L','XL','XXL']
function tee(){
  return {grading:{sizes:[...sizes],baseSize:'M',widthPerSizeCm:2,lengthPerSizeCm:1},pieces:[
    {id:'front',points:[{x:3,y:5,industrialGradeRule:{mode:'small-large-incremental',sizes:[...sizes],baseSize:'M',steps:[{dx:-.3,dy:-.6},{dx:-.2,dy:-.4},{dx:.5,dy:.3},{dx:.8,dy:.4},{dx:1,dy:.7}]}},{x:26,y:5},{x:26,y:30},{x:3,y:30}]},
    {id:'back',points:[{x:0,y:0},{x:24,y:0},{x:24,y:30},{x:0,y:30}]},
  ]}
}
const rows=p=>readAccuMarkGradeDeltaMatrix(p,{pieceId:'front',pointIndex:0}).rows
const local=(p,size)=>gradeProject(p,size).pieces.find(piece=>piece.id==='front').points[0]
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} differs from ${b}`)

test('six-size tee drag applies relative movement, preserves base and other sizes, source immutable',()=>{
  const source=tee(),snapshot=structuredClone(source),before=rows(source),from=local(source,'L')
  const result=drag(source,{pieceId:'front',pointIndex:0,size:'L',dxCm:.4,dyCm:-.75})
  close(result.preview.from.x,from.x)
  close(result.preview.from.y,from.y)
  close(result.preview.to.x,from.x+.4)
  close(result.preview.to.y,from.y-.75)
  assert.deepEqual(result.preview.deltaCm,{x:.4,y:-.75})
  assert.equal(result.validation.manufacturingApproved,false)
  const after=rows(result.project)
  for(let i=0;i<sizes.length;i++){
    if(sizes[i]==='L') {close(after[i].dxCm,before[i].dxCm+.4);close(after[i].dyCm,before[i].dyCm-.75)}
    else {close(after[i].dxCm,before[i].dxCm);close(after[i].dyCm,before[i].dyCm)}
  }
  assert.deepEqual(source,snapshot)
  assert.deepEqual(result.project.pieces[1],source.pieces[1])
  close(local(result.project,'M').x,local(source,'M').x)
  close(local(result.project,'M').y,local(source,'M').y)
})

test('consecutive mouse moves use current graded positions, never overwrite the total offset',()=>{
  const source=tee(),old=local(source,'S')
  const first=drag(source,{pieceId:'front',pointIndex:0,size:'S',dxCm:-.25,dyCm:.35})
  const second=drag(first.project,{pieceId:'front',pointIndex:0,size:'S',dxCm:-.55,dyCm:-.1})
  close(second.preview.from.x,first.preview.to.x)
  close(second.preview.from.y,first.preview.to.y)
  close(second.preview.to.x,old.x-.8)
  close(second.preview.to.y,old.y+.25)
})

test('maintainGrowths keeps farther growth differences on either side of base',()=>{
  const source=tee(),before=rows(source)
  for(const size of ['L','S']){
    const result=drag(source,{pieceId:'front',pointIndex:0,size,dxCm:.6,dyCm:-.4,maintainGrowths:true})
    const after=rows(result.project),i=sizes.indexOf(size),base=sizes.indexOf('M'),dir=i>base?1:-1
    for(let j=i;j>=0&&j<sizes.length;j+=dir){close(after[j].dxCm,before[j].dxCm+.6);close(after[j].dyCm,before[j].dyCm-.4)}
    for(let j=0;j<sizes.length;j++)if(j===base||j<i&&dir===1||j>i&&dir===-1){close(after[j].dxCm,before[j].dxCm);close(after[j].dyCm,before[j].dyCm)}
  }
})

test('rejects unsafe drags, locked and named rule targets, duplicate pieces and incompatible sizes',()=>{
  const source=tee(),params={pieceId:'front',pointIndex:0,size:'L',dxCm:.1,dyCm:-.1}
  assert.throws(()=>drag(source,{...params,size:'M'}),/base size/)
  assert.throws(()=>drag(source,{...params,size:'XXXX'}),/unknown size/)
  assert.throws(()=>drag(source,{...params,dxCm:Infinity}),/finite/)
  assert.throws(()=>drag(source,{...params,dyCm:101}),/within 100/)
  assert.throws(()=>drag(source,{...params,maintainGrowths:'yes'}),/boolean/)
  assert.throws(()=>drag(source,{...params,pointIndex:999}),/index/)
  const locked=tee();locked.pieces[0].locked=true
  assert.throws(()=>drag(locked,params),/locked/)
  const named=tee();named.pieces[0].points[0].namedGradeRuleRef={id:'r'}
  assert.throws(()=>drag(named,params),/detach/)
  const stale=tee();stale.pieces[0].points[0].industrialGradeRule.sizes[5]='XXXL'
  assert.throws(()=>drag(stale,params),/incompatible/)
  const duplicate=tee();duplicate.pieces.push(structuredClone(duplicate.pieces[0]))
  assert.throws(()=>drag(duplicate,params),/ambiguous/)
})
