import test from 'node:test'
import assert from 'node:assert/strict'
import {buildAccuMarkRestackedNest} from './accumarkRestackedNestPreview20261023.js'
import {createTemplateProject} from '../data/templates.js'

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} vs ${b}`)
const length=points=>points.reduce((total,p,i)=>total+Math.hypot(p.x-points[(i+1)%points.length].x,p.y-points[(i+1)%points.length].y),0)

test('one-point restack aligns six graded anchors but never changes physical per-size lengths',()=>{
 const source=createTemplateProject('tee'), snapshot=JSON.stringify(source)
 const absolute=buildAccuMarkRestackedNest(source,{pieceId:'front',pointIndex:1,mode:'absolute'})
 const stack=buildAccuMarkRestackedNest(source,{pieceId:'front',pointIndex:1,mode:'stack'})
 assert.deepEqual(absolute.sizeLine,['XS','S','M','L','XL','XXL'])
 assert.equal(absolute.outlines.length,6)
 assert.equal(stack.outlines.length,6)
 const anchor=stack.outlines[0].anchorCm
 for(let i=0;i<6;i++){
  near(stack.outlines[i].anchorCm.x,anchor.x)
  near(stack.outlines[i].anchorCm.y,anchor.y)
  near(length(stack.outlines[i].points),length(absolute.outlines[i].points))
 }
 assert.equal(stack.displayOnly,true)
 assert.equal(stack.manufacturingApproved,false)
 assert.equal(JSON.stringify(source),snapshot)
})

test('invalid mode, point and size run fail without modifying project',()=>{
 const project=createTemplateProject('tee'),saved=JSON.stringify(project)
 assert.throws(()=>buildAccuMarkRestackedNest(project,{pieceId:'front',mode:'rotate'}),/mode/)
 assert.throws(()=>buildAccuMarkRestackedNest(project,{pieceId:'front',pointIndex:1000}),/point/)
 assert.throws(()=>buildAccuMarkRestackedNest(project,{pieceId:'unknown'}),/piece identity/)
 assert.throws(()=>buildAccuMarkRestackedNest(project,{pieceId:'front',samplesPerEdge:2}),/sample/)
 const invalid=structuredClone(project)
 invalid.grading.sizes=['M','M']
 assert.throws(()=>buildAccuMarkRestackedNest(invalid,{pieceId:'front'}),/size run/)
 assert.equal(JSON.stringify(project),saved)
})
