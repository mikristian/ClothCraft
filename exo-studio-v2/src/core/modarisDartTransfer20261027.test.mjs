import test from 'node:test'
import assert from 'node:assert/strict'
import {previewModarisDartTransfer20261027 as preview} from './modarisDartTransfer20261027.js'

const project=()=>({revision:7,pieces:[{id:'front',points:[{x:0,y:0},{x:4,y:0},{x:8,y:0},{x:8,y:8},{x:0,y:8}]}]})
const options={expectedRevision:7,pieceId:'front',apex:{x:22,y:-4},firstLegIndex:1,secondLegIndex:3,rotateFromIndex:1,rotateToIndex:2,targetEdgeIndex:4}

test('pure preview keeps original intact and explains detached cut limitations',()=>{
 const before=project(),snapshot=structuredClone(before)
 const result=preview(before,options)
 assert.equal(result.productionApproved,false)
 assert.equal(result.projectUnchanged,true)
 assert.equal(result.previewPoints.length,5)
 assert.ok(Number.isFinite(result.rotationRadians))
 assert.equal(result.sourceRevision,7)
 assert.match(result.limitations.join(' '),/no transfer\/opening/i)
 assert.deepEqual(before,snapshot)
})

test('stale, unknown, attachments, grading, invalid leg radii and invalid target refuse without mutation',()=>{
 const edits=[
  [p=>{}, {...options,expectedRevision:8}],
  [p=>{}, {...options,pieceId:'missing'}],
  [p=>{p.pieces[0].internalLines=[{id:'unknown-mark',type:'dart'}]}, options],
  [p=>{p.pieces[0].points[0].industrialGradeRule={enabled:true}}, options],
  [p=>{p.grading={sizes:['S','M'],baseSize:'M'}}, options],
  [p=>{p.seams=[{id:'seam'}]}, options],
  [p=>{}, {...options,apex:{x:1,y:2}}],
  [p=>{}, {...options,targetEdgeIndex:1}],
 ]
 edits.forEach(([edit,args],i)=>{
  const p=project();edit(p);const snapshot=structuredClone(p)
  assert.throws(()=>preview(p,args),/refused/,`refusal ${i}`)
  assert.deepEqual(p,snapshot)
 })
})
