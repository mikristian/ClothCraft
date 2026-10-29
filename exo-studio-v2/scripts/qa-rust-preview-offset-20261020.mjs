import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createTemplateProject} from '../src/data/templates.js'
import {inwardOffsetEdge} from '../src/core/garmentPreviewGeometry.js'
import {initializeRustPreviewOffsetKernel,rustPreviewOffsetStatus,rustPreviewInwardPoint} from '../src/core/rustPreviewOffsetKernel.js'
let seed=0x16001600
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296)
const fixtures=[]
for(let i=0;i<2048;i++)fixtures.push({point:{x:(random()-.5)*200,y:(random()-.5)*200},a:{x:(random()-.5)*200,y:(random()-.5)*200},b:{x:(random()-.5)*200,y:(random()-.5)*200},sign:i%2?1:-1,offset:(random()-.5)*10})
fixtures.push({point:{x:1,y:2},a:{x:5,y:6},b:{x:5,y:6},sign:1,offset:.75})
const before=fixtures.map(f=>rustPreviewInwardPoint(f.point,f.a,f.b,f.sign,f.offset))
const projects=['tee','hoodie','jeans-501'].map(createTemplateProject)
const renderBefore=projects.map(project=>project.pieces.slice(0,8).map(piece=>piece.points.map((_,i)=>inwardOffsetEdge(piece,i,.65))))
assert.equal(await initializeRustPreviewOffsetKernel({bytes:readFileSync('public/wasm/exo_preview_offset_kernel.wasm')}),true)
let maxError=0
for(let i=0;i<fixtures.length;i++)for(const axis of ['x','y']){
 const actual=rustPreviewInwardPoint(...[fixtures[i].point,fixtures[i].a,fixtures[i].b,fixtures[i].sign,fixtures[i].offset])[axis]
 const error=Math.abs(actual-before[i][axis]);maxError=Math.max(maxError,error)
 assert.ok(error<=1e-10*Math.max(1,Math.abs(before[i][axis])),`case ${i} ${axis}: ${error}`)
}
for(let i=0;i<projects.length;i++)for(let j=0;j<renderBefore[i].length;j++)for(let k=0;k<renderBefore[i][j].length;k++){
 const a=renderBefore[i][j][k],b=inwardOffsetEdge(projects[i].pieces[j],k,.65)
 assert.equal(a.length,b.length)
 for(let n=0;n<a.length;n++)for(const axis of ['x','y'])assert.ok(Math.abs(a[n][axis]-b[n][axis])<1e-9)
}
console.log(JSON.stringify({pass:true,backend:rustPreviewOffsetStatus().backend,seed:'0x16001600',randomCases:fixtures.length,templates:projects.length,maxError}))
