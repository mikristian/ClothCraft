import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {initializeRustUnfoldKernel,rustUnfoldKernelReady,unfoldWalkIndex,unfoldMirroredEdge,unfoldGradeVector,unfoldNotchParameter} from '../src/core/rustUnfoldKernel.js'
import {unfoldDraftPiece} from '../src/core/draftingUnfold.js'
let seed=0x210021
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32)
const cases=[]
for(let i=0;i<256;i++){
 const angle=random()*Math.PI*2,c=Math.cos(angle),s=Math.sin(angle)
 const transform=([x,y])=>({x:10+c*x-s*y,y:-7+s*x+c*y})
 const points=[[0,0],[0,12],[8,12],[8,0]].map((p,j)=>({...transform(p),id:`p${j}`,custom:{keep:true},gradeRule:{enabled:j%2?'yes':true,dxPerSize:String(random()*8-4),dyPerSize:random()*8-4,authored:'keep'}}))
 const piece={name:'Seed (half)',points,curves:{2:{cx:transform([9,6]).x,cy:transform([9,6]).y}},notches:[{id:'n',edgeIndex:'1',t:String(random()),matchGroupId:'keep',custom:true}],internalLines:[],edgeSeamAllowances:{1:0,2:1.5}}
 for(const edge of [0,1,2,3])cases.push({piece,edge})
}
const half={points:[{x:0,y:0},{x:0,y:12},{x:8,y:12},{x:8,y:0}]}
for(const piece of [
 {...half,locked:true,curves:{0:{cx:1,cy:1}},notches:[{edgeIndex:0}]},
 {...half,curves:{0:{cx:1,cy:1}},notches:[{edgeIndex:0}]},
 {...half,notches:[{edgeIndex:0}]},
 {...half,points:[{x:0,y:0},{x:0,y:0},{x:8,y:12},{x:8,y:0}],notches:[{edgeIndex:0}]},
 {...half,notches:[{edgeIndex:1,t:'bad'},{edgeIndex:2,t:null},{edgeIndex:99,t:0}]},
])for(const edge of [0,-1,'0',3])cases.push({piece,edge})
const run=({piece,edge})=>{const before=JSON.stringify(piece);let result;try{result={value:unfoldDraftPiece(piece,edge)}}catch(e){result={error:e.message}}assert.equal(JSON.stringify(piece),before);return result}
assert.equal(rustUnfoldKernelReady(),false)
assert.equal(await initializeRustUnfoldKernel({bytes:new Uint8Array([0])}),false)
const expected=cases.map(run)
assert.equal(expected[1024].error,'Unlock this pattern before unfolding')
assert.equal(expected[1028].error,'Unfold requires a straight fold edge')
assert.equal(expected[1032].error,'Remove notches from the fold edge before unfolding')
assert.equal(expected[1036].error,'Fold edge must have a nonzero length')
assert.equal(await initializeRustUnfoldKernel({bytes:readFileSync(new URL('../public/wasm/exo_unfold_kernel.wasm',import.meta.url))}),true)
assert.equal(rustUnfoldKernelReady(),true)
cases.forEach((fixture,i)=>assert.deepEqual(run(fixture),expected[i],`seeded unfold ${i}`))
for(let n=3;n<100;n++)for(let fold=0;fold<n;fold++)for(let k=0;k<n;k++){
 assert.equal(unfoldWalkIndex(n,fold,k),(fold+1+k)%n)
 if(k<n-1)assert.equal(unfoldMirroredEdge(n,k),2*n-3-k)
}
for(const t of [NaN,Infinity,-Infinity,0,.5,1,-2])assert.equal(unfoldNotchParameter(t),1-t)
assert.deepEqual(unfoldGradeVector({x:2,y:3},0,1),{x:-2,y:3})
console.log(`Rust unfold WASM parity passed: ${cases.length} seeded unfold/error cases, traversal, metadata, immutability and nonfinite notch arithmetic`)
