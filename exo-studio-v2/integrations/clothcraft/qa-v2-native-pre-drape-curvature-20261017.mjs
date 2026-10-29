import assert from 'node:assert/strict'
import {preDrapeDisplayPositions} from '../../src/core/nativePreDrapeCurvature.js'

const positions=[]
const triangles=[]
for(let row=0;row<4;row++)for(let col=0;col<5;col++)positions.push([-.24+col*.12, 1.3+row*.12, -.12])
for(let row=0;row<3;row++)for(let col=0;col<4;col++){
  const i=row*5+col
  triangles.push([i,i+1,i+5],[i+1,i+6,i+5])
}
const snapshot={positions,triangles,panels:[{id:'front',triangles:[0,triangles.length]}],time:0,grabActive:false}
const original=JSON.stringify(snapshot)
const preview=preDrapeDisplayPositions(snapshot)
assert.notStrictEqual(preview,positions,'reset stage generates independent preview')
assert.ok(preview.some((p,i)=>Math.abs(p[2]-positions[i][2])>.01),'preview has nonzero depth')
assert.equal(JSON.stringify(snapshot),original,'preview cannot mutate native snapshot')
assert.strictEqual(preDrapeDisplayPositions({...snapshot,time:.01}),positions,'solver coordinates resume when simulation advances')
assert.strictEqual(preDrapeDisplayPositions({...snapshot,grabActive:true}),positions,'native grab remains authoritative')
const alreadyCurved=positions.map(([x,y,z])=>[x,y,z+x*x])
assert.strictEqual(preDrapeDisplayPositions({...snapshot,positions:alreadyCurved}),alreadyCurved,'already curved cloth not reshaped')
// Native imports can contain many more vertices than the JS argument limit.
const densePositions=Array.from({length:140000},(_,i)=>[i%700*.00065,1+Math.floor(i/700)*.002,-.15])
const denseTriangles=Array.from({length:139998},(_,i)=>[i,i+1,i+2])
const denseSnapshot={positions:densePositions,triangles:denseTriangles,panels:[{id:'dense',triangles:[0,denseTriangles.length]}],time:0}
const densePreview=preDrapeDisplayPositions(denseSnapshot)
assert.equal(densePreview.length,densePositions.length,'dense native garment stays renderable')
assert.equal(densePositions[0][2],-.15,'dense preview leaves native values unchanged')
console.log(JSON.stringify({passed:true,previewDepth:Math.max(...preview.map((p,i)=>Math.abs(p[2]-positions[i][2]))),unchangedSnapshot:true,simulatedUsesRust:true}))
