import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {create501JeansTemplate} from '../data/jeans501.js'
import {gradeProject} from './grading.js'
import {resolveGradePreviewSize} from './gradePreviewSize.js'

test('first render after changing garment size runs selects base size instead of crashing grading',()=>{
 const tee=createTeeTemplate(),jeans=create501JeansTemplate()
 assert.equal(resolveGradePreviewSize(tee,'M'),'M')
 const selected=resolveGradePreviewSize(jeans,'M')
 assert.equal(selected,'W32')
 assert.equal(gradeProject(jeans,selected).pieces.length,24)
 assert.throws(()=>gradeProject(jeans,'M'),/not in the size set/)
 assert.equal(resolveGradePreviewSize(tee,'W32'),'M','Undo returns to a valid T-shirt base size immediately')
 assert.equal(resolveGradePreviewSize(jeans,'W34'),'W34','Requested valid jeans size is retained')
 assert.equal(resolveGradePreviewSize(jeans,'XS'),'W32')
})

test('one-size DXF reference, recovered projects, and fallbacks preserve input without modifying grading',()=>{
 const jeans=create501JeansTemplate(),copy=structuredClone(jeans)
 const one={grading:{sizes:['W34'],baseSize:'W34'}}
 assert.equal(resolveGradePreviewSize(one,'M'),'W34')
 assert.equal(resolveGradePreviewSize({grading:{sizes:['W34','W36'],baseSize:'UNKNOWN'}},'XS'),'W34')
 assert.equal(resolveGradePreviewSize({grading:{baseSize:'L'}},'XS'),'L')
 assert.equal(resolveGradePreviewSize({},'M'),'M')
 assert.deepEqual(jeans,copy)
})
