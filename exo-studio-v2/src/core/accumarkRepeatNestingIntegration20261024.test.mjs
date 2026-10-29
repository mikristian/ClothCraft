import test from 'node:test'
import assert from 'node:assert/strict'
import {nestPolygons} from './accumarkPolygonNesting20261024.js'
import {validateAccuMarkMaterialRepeatQA as validate} from './accumarkMaterialRepeatQA20261024.js'
import {seamAllowanceBoundary} from './project.js'
const shape=[{x:0,y:0},{x:2,y:0},{x:2,y:2},{x:0,y:2}]
const piece=id=>({id,name:id,points:shape.map(p=>({...p})),grainAngleDeg:0,
  cutQuantity:1,seamAllowance:0,marker:{nap:'one-way'}})
test('real polygon-aware nesting feeds independently verified material repeat without altering source',()=>{
 const project={pieces:[piece('front'),piece('back')]},old=structuredClone(project)
 const nested=nestPolygons(project,{fabricWidth:12,gap:.25})
 assert.equal(nested.ok,true,JSON.stringify(nested))
 assert.equal(nested.placements.length,2)
 const [a,b]=nested.placements
 const repeat={x:Math.max(.001,Math.abs(a.x-b.x)),y:Math.max(.001,Math.abs(a.y-b.y))}
 const sources=Object.fromEntries(project.pieces.map(piece=>[piece.id,{cutline:seamAllowanceBoundary(piece,8),
   anchor:{x:0,y:0},group:'matched-body',size:'BASE',shade:'A',nap:piece.marker.nap,
   grainAngleDeg:piece.grainAngleDeg,cutQuantity:piece.cutQuantity,foldVerified:false}]))
 const args={project,nesting:{...nested,placements:nested.placements.map(p=>({...p,size:'BASE'}))},
   fabricWidthCm:12,repeatCm:repeat,sourcesByPieceId:sources,quantitiesBySize:{BASE:1},
   shadeZones:[{shade:'A',minY:0,maxY:nested.metrics.length+5}],toleranceCm:.01}
 const checked=validate(args)
 assert.equal(checked.ok,true,JSON.stringify(checked.issues))
 assert.equal(checked.cuttingAuthorized,false)
 sources.back.anchor.x=.35
 const altered=validate(args)
 assert.equal(altered.ok,false)
 assert(altered.issues.some(i=>i.code==='REPEAT_REGISTRATION_MISMATCH'))
 assert.deepEqual(project,old)
})
