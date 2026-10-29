import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {gradeProject} from './grading.js'
import {samplePieceBoundary} from './project.js'
import {buildAccuMarkGradeMeasureChart as chart} from './accumarkGradeMeasureChart20261023.js'

test('Foundation Tee six size curved armhole vs sleeve cap measurements are sampled independently',()=>{
  const source=createTeeTemplate(),snapshot=structuredClone(source)
  const result=chart(source,{pieceId:'front',edgeIndices:[1,2],comparePieceId:'sleeve-left',compareEdgeIndices:[0,1]})
  assert.deepEqual(result.sizes,['XS','S','M','L','XL','XXL'])
  assert.equal(result.units,'cm')
  assert.equal(result.rows.length,6)
  for(const row of result.rows){
    const graded=gradeProject(source,row.size)
    const expected=(id,edges)=>{
      const piece=graded.pieces.find(p=>p.id===id)
      return edges.reduce((sum,index)=>{
        const points=samplePieceBoundary(piece,12).edgePaths[index]
        return sum+points.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-points[i].x,p.y-points[i].y),0)
      },0)
    }
    assert.ok(Math.abs(row.totalCm-expected('front',[1,2]))<1e-9)
    assert.ok(Math.abs(row.compareTotalCm-expected('sleeve-left',[0,1]))<1e-9)
    assert.ok(Math.abs(row.differenceCm-(row.totalCm-row.compareTotalCm))<1e-9)
  }
  const base=result.rows.find(r=>r.size==='M')
  assert.equal(base.baseDeltaCm,0)
  assert.deepEqual(source,snapshot)
})

test('single straight edge chart and strict invalid selection handling',()=>{
  const project={grading:{sizes:['S','M','L'],baseSize:'M',widthPerSizeCm:0,lengthPerSizeCm:0},pieces:[{id:'p',points:[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}]}]}
  const result=chart(project,{pieceId:'p',edgeIndices:[0,1]})
  assert.deepEqual(result.rows.map(r=>r.totalCm),[18,18,18])
  assert.ok(result.rows.every(r=>r.baseDeltaCm===0&&!('compareTotalCm'in r)))
  for(const bad of [[-1],[4],[0,0],[1.2],[],['0']])assert.throws(()=>chart(project,{pieceId:'p',edgeIndices:bad}),/INVALID_EDGE_INDICES/)
  assert.throws(()=>chart(project,{pieceId:'p',edgeIndices:[0],comparePieceId:'p'}),/INCOMPLETE_COMPARISON/)
  assert.throws(()=>chart(project,{pieceId:'unknown',edgeIndices:[0]}),/UNKNOWN_OR_DUPLICATE_PIECE/)
  assert.throws(()=>chart({...project,grading:{sizes:['S','S'],baseSize:'S'}},{pieceId:'p',edgeIndices:[0]}),/INVALID_GRADE_SIZES/)
})

test('nonfinite sampled curves reject safely and leave original intact',()=>{
  const project={grading:{sizes:['M'],baseSize:'M'},pieces:[{id:'p',points:[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}],curves:{0:{cx:NaN,cy:2}}}]}
  assert.throws(()=>chart(project,{pieceId:'p',edgeIndices:[0]}),/NONFINITE_SAMPLED_EDGE/)
  assert.ok(Number.isNaN(project.pieces[0].curves[0].cx))
})
