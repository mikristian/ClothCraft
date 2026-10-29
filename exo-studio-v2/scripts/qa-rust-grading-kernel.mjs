import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {initializeRustGradingKernel,rustGradingKernelReady,rustGradingKernelStatus,gradeMultiPieceBreakTable} from '../src/core/rustGradingKernel.js'
import {gradePointForPiece,gradeProject} from '../src/core/grading.js'
import {createDefaultProject} from '../src/data/defaultProject.js'
import {writeSavedProject,readSavedProject} from '../src/core/projectRestore.js'

const points=[{x:-8,y:0},{x:8,y:0},{x:0,y:0},{x:3,y:0},{x:2,y:0,gradeRule:{enabled:true,dxPerSize:-2,dyPerSize:0}},{x:4,y:0,gradeRule:{enabled:true,dxPerSize:'bad',dyPerSize:-3}}]
const piece={id:'test',points}
const grading={sizes:['XS','M','XL'],baseSize:'M',widthPerSizeCm:3,lengthPerSizeCm:1.2}
const fixtures=[]
for(const size of ['XS','M','XL'])for(const point of points)fixtures.push({size,point,expected:gradePointForPiece(piece,grading,size,point)})
const bytes=readFileSync('public/wasm/exo_grading_kernel.wasm')
const exports=WebAssembly.Module.exports(new WebAssembly.Module(bytes)).map(item=>item.name)
for(const name of ['exo_grading_abi_version','exo_grade_point_x','exo_grade_point_y','exo_grade_rule_coordinate'])assert.ok(exports.includes(name),`missing ${name}`)
for(const name of ['exo_grading_batch_abi_version','exo_grade_multi_piece_batch'])assert.ok(exports.includes(name),`missing ${name}`)
assert.equal(rustGradingKernelStatus().backend,'javascript-fallback')
assert.equal(await initializeRustGradingKernel({bytes}),true)
assert.ok(rustGradingKernelReady())
assert.equal(rustGradingKernelStatus().backend,'rust-wasm')
for(const {size,point,expected} of fixtures){
 const actual=gradePointForPiece(piece,grading,size,point)
 for(const key of ['x','y'])assert.ok(Math.abs(actual[key]-expected[key])<1e-10,`${size} ${key}: ${actual[key]} vs ${expected[key]}`)
}
const project={pieces:[piece],grading,productionSpec:{gradingModel:'seam-locked-affine-v1',referenceHalfChestCm:54,referenceBodyLengthCm:71},customMeasurements:[]}
assert.ok(Number.isFinite(gradeProject(project,'XL').pieces[0].points[0].x))
for(const height of [0,0.5,10,100]){
 const testPiece={points:[{x:-12,y:0},{x:12,y:height}]}
 for(const size of ['XS','XL']){
  const point={x:3,y:height/2,gradeRule:{enabled:true,dxPerSize:'invalid',dyPerSize:-4}}
  const offset=size==='XS'?-1:1
  const centerX=0
  const normalizedY=point.y/Math.max(1,height)
  const expected={x:point.x+Math.sign(point.x-centerX)*3*offset/2*(.55+.45*(1-normalizedY)),y:point.y-4*offset}
  const actual=gradePointForPiece(testPiece,grading,size,point)
  for(const key of ['x','y'])assert.ok(Math.abs(actual[key]-expected[key])<1e-10,`height=${height} ${size} ${key}`)
 }
}
const persisted=createDefaultProject()
persisted.pieces[0].points[0].gradeRule={enabled:true,dxPerSize:-2.5,dyPerSize:1.25,metadata:{author:'fixture'}}
const original=structuredClone(persisted)
const sizes=persisted.grading.sizes
const expected=Object.fromEntries(sizes.map(size=>[size,gradeProject(persisted,size)]))
const storageData=new Map()
const storage={getItem:key=>storageData.get(key)??null,setItem:(key,value)=>storageData.set(key,value)}
writeSavedProject(storage,'grading','backup',persisted)
assert.equal(storage.getItem('grading'),JSON.stringify(persisted),'grading JSON unchanged during save')
const reopened=readSavedProject(storage,'grading','backup')
assert.equal(reopened.status,'primary')
assert.deepEqual(reopened.project,persisted)
for(const size of sizes)assert.deepEqual(gradeProject(reopened.project,size),expected[size],`size ${size} after reopen`)
const edited=structuredClone(persisted)
edited.pieces[0].points[0].gradeRule.dxPerSize=4
const undo=structuredClone(original)
for(const size of sizes)assert.deepEqual(gradeProject(undo,size),expected[size],`size ${size} after undo`)
assert.deepEqual(persisted,original,'grading operations must not mutate authored project')
const industrialPieces=Array.from({length:4},(_,pieceIndex)=>({id:pieceIndex+1,points:Array.from({length:pieceIndex+2},(_,pointIndex)=>({
 id:pointIndex+1,x:pieceIndex*13+pointIndex*2.25,y:pointIndex*4-pieceIndex,
 steps:Array.from({length:5},(_,breakIndex)=>({dx:(breakIndex-2)*.31+pointIndex*.17,dy:(pieceIndex-breakIndex)*.29-pointIndex*.13}))
}))}))
const industrialSizes=['XS','S','M','L','XL','XXL']
const industrial=gradeMultiPieceBreakTable({pieces:industrialPieces,sizes:industrialSizes,baseSize:'M'})
// Directly compare the new native WASM result against the independent JS
// break-table implementation, using real four-piece, six-size arrays.
const blank=[]
const lengths=[industrialPieces.flatMap(piece=>piece.points).length*2,industrialPieces.length,industrialPieces.length,industrialPieces.flatMap(piece=>piece.points).length,industrialPieces.flatMap(piece=>piece.points).length*5*2,industrialPieces.flatMap(piece=>piece.points).length*6*2]
const wasm=await WebAssembly.instantiate(bytes,{})
const native=wasm.instance.exports
const data=[
 industrialPieces.flatMap(piece=>piece.points.flatMap(point=>[point.x,point.y])),
 industrialPieces.map(piece=>piece.id),industrialPieces.map(piece=>piece.points.length),
 industrialPieces.flatMap(piece=>piece.points.map(point=>point.id)),
 industrialPieces.flatMap(piece=>piece.points.flatMap(point=>point.steps.flatMap(step=>[step.dx,step.dy]))),
 new Array(lengths[5]).fill(0),
]
const pointers=[]
try{
 for(let k=0;k<data.length;k++){
  const ptr=native.exo_grading_batch_alloc(data[k].length)
  assert.ok(ptr>0)
  pointers.push(ptr)
  new Float64Array(native.memory.buffer,ptr,data[k].length).set(data[k])
 }
 const code=native.exo_grade_multi_piece_batch_f64(...pointers.slice(0,5),industrialPieces.length,data[3].length,6,2,pointers[5])
 assert.equal(code,0,'native multi-piece operation')
 const direct=Float64Array.from(new Float64Array(native.memory.buffer,pointers[5],data[5].length))
 const expected=industrial.flatMap(grade=>grade.pieces.flatMap(piece=>piece.points.flatMap(point=>[point.x,point.y])))
 for(let index=0;index<direct.length;index++)assert.ok(Math.abs(direct[index]-expected[index])<1e-10,`native JS parity index ${index}`)
 // Even when some earlier pieces are valid, malformed later-point data must
 // leave every output double unchanged.
 new Float64Array(native.memory.buffer,pointers[5],data[5].length).fill(123456)
 const stepView=new Float64Array(native.memory.buffer,pointers[4],data[4].length)
 const previous=stepView[stepView.length-1]
 stepView[stepView.length-1]=NaN
 assert.equal(native.exo_grade_multi_piece_batch_f64(...pointers.slice(0,5),industrialPieces.length,data[3].length,6,2,pointers[5]),-3)
 assert.ok(new Float64Array(native.memory.buffer,pointers[5],data[5].length).every(v=>v===123456))
 stepView[stepView.length-1]=previous
}finally{for(let k=pointers.length-1;k>=0;k--)native.exo_grading_batch_free(pointers[k],data[k].length)}
assert.equal(industrial.length,6)
for(let size=0;size<6;size++)for(let p=0;p<industrialPieces.length;p++)for(let i=0;i<industrialPieces[p].points.length;i++){
 const base=industrialPieces[p].points[i],actual=industrial[size].pieces[p].points[i]
 let x=base.x,y=base.y
 if(size>2)for(let k=2;k<size;k++){x+=base.steps[k].dx;y+=base.steps[k].dy}
 if(size<2)for(let k=1;k>=size;k--){x-=base.steps[k].dx;y-=base.steps[k].dy}
 assert.ok(Math.abs(actual.x-x)<1e-10&&Math.abs(actual.y-y)<1e-10,`industrial ${size}/${p}/${i}`)
 assert.equal(actual.id,base.id)
}
assert.deepEqual(industrial[2].pieces.map(piece=>piece.points.map(({x,y})=>({x,y}))),industrialPieces.map(piece=>piece.points.map(({x,y})=>({x,y}))))
for(const mutate of [
  data=>data.pieces[1].id=1,
  data=>data.pieces[0].points[0].steps[0].dx=NaN,
  data=>data.pieces[0].points[0].steps.pop(),
  data=>data.pieces[0].points[0].id=0,
  data=>data.pieces[0].points[0].x=Infinity,
  data=>{data.pieces[0].points[0].x=Number.MAX_VALUE;data.pieces[0].points[0].steps[2].dx=Number.MAX_VALUE},
]){
 const malformed=structuredClone(industrialPieces)
 mutate({pieces:malformed})
 assert.throws(()=>gradeMultiPieceBreakTable({pieces:malformed,sizes:industrialSizes,baseSize:'M'}))
}
console.log(JSON.stringify({pass:true,fixtures:fixtures.length+8,affine:true,wasmExports:exports,savedProjectParity:true,multiSizes:sizes.length,undoParity:true}))
