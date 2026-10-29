import test from 'node:test'
import assert from 'node:assert/strict'
import {projectToDxf} from './dxf.js'
import {gradeProject} from './grading.js'
import {makeRectanglePiece} from './project.js'

const source=()=>{
  const p={id:'grade-guard',name:'Grade Guard',pieces:[{...makeRectanglePiece(0),id:'front',name:'Front',seamAllowance:1}],seams:[]}
  p.grading={sizes:['XS','S','M','L','XL','XXL'],baseSize:'M',widthPerSizeCm:3,lengthPerSizeCm:1.2}
  return p
}

test('manufacturing DXF refuses a base pattern renamed XS without grading',()=>{
  const project=source(),before=structuredClone(project)
  assert.throws(()=>projectToDxf(project,'XS',{cutlineMode:'manufacturing',requireGradedGeometry:true}),/gradeProject/)
  assert.deepEqual(project,before)
})

test('manufacturing DXF refuses a graded S project masquerading as XL',()=>{
  const wrong=gradeProject(source(),'S')
  assert.equal(wrong.previewSize,'S')
  assert.throws(()=>projectToDxf(wrong,'XL',{cutlineMode:'manufacturing',requireGradedGeometry:true}),/graded preview geometry|size mismatch/)
})

test('graded XS physical DXF and true base size factory DXF remain permitted',()=>{
  const sourceProject=source()
  const graded=gradeProject(sourceProject,'XS')
  const x=projectToDxf(graded,'XS',{cutlineMode:'manufacturing',requireGradedGeometry:true})
  const b=projectToDxf(gradeProject(sourceProject,'M'),'M',{cutlineMode:'manufacturing',requireGradedGeometry:true})
  assert.match(x,/GARMENT_STUDIO_SIZE XS/)
  assert.match(b,/GARMENT_STUDIO_SIZE M/)
  assert.notEqual(x,b)
})
