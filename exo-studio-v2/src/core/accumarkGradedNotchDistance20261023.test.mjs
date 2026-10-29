import test from 'node:test'
import assert from 'node:assert/strict'
import {applyAccuMarkGradedNotchDistance,applyAccuMarkNotchArcStationsToGraded,inspectAccuMarkGradedNotchDistance} from './accumarkGradedNotchDistance20261023.js'
import {gradeProject} from './grading.js'
import {edgeLength,edgePointAt} from './project.js'

function fixture(){
 return {grading:{sizes:['S','M','L'],baseSize:'M',widthPerSizeCm:2,lengthPerSizeCm:1},pieces:[{id:'front',points:[{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10}],curves:{0:{cx:5,cy:-4}},notches:[{id:'n1',edgeIndex:0,t:.3,x:0,y:0,depth:.7,type:'double',group:'pair'}]}]}
}
test('curved edge station persists physically across sizes and preserves notch metadata',()=>{
 const source=fixture(),snapshot=structuredClone(source)
 const {project,validation}=applyAccuMarkGradedNotchDistance(source,{pieceId:'front',notchId:'n1',distanceCm:3,from:'end'})
 assert.deepEqual(source,snapshot)
 assert.equal(validation.sizes.length,3)
 const base=project.pieces[0].notches[0]
 assert.equal(base.depth,.7)
 assert.equal(base.type,'double')
 assert.equal(base.group,'pair')
 for(const size of source.grading.sizes){
  const graded=gradeProject(project,size)
  const before=structuredClone(graded)
  const result=applyAccuMarkNotchArcStationsToGraded(graded,project,size)
  assert.deepEqual(graded,before)
  const piece=result.pieces[0],notch=piece.notches[0]
  assert.ok(Math.abs((1-notch.t)*edgeLength(piece,0)-3)<1e-7)
  const point=edgePointAt(piece,0,notch.t,64).point
  assert.equal(notch.x,point.x)
  assert.equal(notch.y,point.y)
 }
 assert.equal(inspectAccuMarkGradedNotchDistance(project,{pieceId:'front',notchId:'n1'}).rows.length,3)
})
test('rejects invalid stations, stale IDs and bad topology',()=>{
 const p=fixture()
 assert.throws(()=>applyAccuMarkGradedNotchDistance(p,{pieceId:'front',notchId:'missing',distanceCm:2}),/Missing notch/)
 assert.throws(()=>applyAccuMarkGradedNotchDistance(p,{pieceId:'front',notchId:'n1',distanceCm:100}),/outside edge/)
 assert.throws(()=>applyAccuMarkGradedNotchDistance(p,{pieceId:'front',notchId:'n1',distanceCm:NaN}),/Invalid/)
 const {project}=applyAccuMarkGradedNotchDistance(p,{pieceId:'front',notchId:'n1',distanceCm:2})
 const graded=gradeProject(project,'L')
 graded.pieces[0].notches[0].edgeIndex=1
 assert.throws(()=>applyAccuMarkNotchArcStationsToGraded(graded,project,'L'),/topology/)
})
