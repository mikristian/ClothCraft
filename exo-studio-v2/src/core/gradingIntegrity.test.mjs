import {test} from 'node:test'
import assert from 'node:assert/strict'
import {gradePiece,sizeOffset,buildSizeRun} from './grading.js'
const grading={sizes:['S','M','L'],baseSize:'M',widthPerSizeCm:3,lengthPerSizeCm:1}
const piece={id:'front',points:[{id:'p0',x:0,y:0,label:'neck',gradeRule:{enabled:true,dxPerSize:.5,dyPerSize:-.2}},{id:'p1',x:20,y:0},{id:'p2',x:20,y:30},{id:'p3',x:0,y:30}],internalLines:[]}
test('graded points preserve identifiers and editable rules after JSON reopen without aliasing the base',()=>{
 const graded=gradePiece(piece,grading,'L'),reopened=JSON.parse(JSON.stringify(graded))
 assert.equal(reopened.points[0].id,'p0');assert.equal(reopened.points[0].label,'neck')
 assert.deepEqual(reopened.points[0].gradeRule,piece.points[0].gradeRule)
 assert.equal(reopened.points[0].x,.5);assert.equal(reopened.points[0].y,-.2)
 assert.equal(reopened.points[1].id,'p1')
 graded.points[0].gradeRule.dxPerSize=99
 assert.equal(piece.points[0].gradeRule.dxPerSize,.5)
 const base=gradePiece(piece,grading,'M');base.points[0].gradeRule.dxPerSize=99
 assert.equal(piece.points[0].gradeRule.dxPerSize,.5)
})
test('unknown and duplicate size names cannot silently map to another size or overwrite a size run',()=>{
 assert.throws(()=>sizeOffset(grading,'XXXL'),/size/i)
 assert.throws(()=>sizeOffset({...grading,baseSize:'Q'},'L'),/base/i)
 assert.throws(()=>buildSizeRun({pieces:[piece],grading:{...grading,sizes:['M','L','L']}}),/unique/i)
 assert.throws(()=>sizeOffset({...grading,sizes:['M','']},'M'),/size/i)
})
