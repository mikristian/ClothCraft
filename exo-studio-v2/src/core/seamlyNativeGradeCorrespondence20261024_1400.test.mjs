import test from 'node:test'
import assert from 'node:assert/strict'
import {inspectSeamlyNativeGradeCorrespondence20261024_1400 as inspect} from './seamlyNativeGradeCorrespondence20261024_1400.js'

const hash='a'.repeat(64)
const shape=[[0,0],[43,0],[51,11],[39,33],[17,25],[0,15]].map(([x,y])=>({x,y}))
function fixture(other=shape,base=shape){
 const make=(pts,filename)=>({P:{pieceId:'P',sourceBlock:'P',sourceFile:filename,sourceSha256:hash,sourceGeometry:{points:pts,vertexCount:pts.length}}})
 return {ok:true,approved:false,manufacturingApproved:false,sourceUnit:'mm',baseSize:40,sizes:[40,42],sourceBlocks:['P'],bySize:{'40':make(base,'40.dxf'),'42':make(other,'42.dxf')}}
}
const shifted=(pts,offset)=>pts.map((_,i)=>pts[(i+offset)%pts.length])
test('matches cyclic point offset across sizes',()=>{
 const result=inspect(fixture(shifted(shape,2)))
 assert.equal(result.ok,true)
 assert.deepEqual(result.correspondence[0].rows[1].pointIndices,[4,5,0,1,2,3])
 assert.equal(result.correspondence[0].rows[1].reversed,false)
 assert.equal(result.manufacturingApproved,false)
})
test('matches reversed winding and cyclic offset',()=>{
 const result=inspect(fixture(shifted([...shape].reverse(),2)))
 assert.equal(result.ok,true)
 assert.equal(result.correspondence[0].rows[1].reversed,true)
 assert.equal(result.correspondence[0].rows[1].pointMovementsFromBaseMm.every(p=>p.dxMm===0&&p.dyMm===0),true)
})
test('slightly graded asymmetric shape keeps correspondence and real mm movement',()=>{
 const grade=shape.map((p,i)=>({...p,x:p.x+(i===2?3:0),y:p.y+(i===4?2:0)}))
 const result=inspect(fixture(shifted(grade,3)))
 assert.equal(result.ok,true)
 assert.equal(result.correspondence[0].rows[1].pointMovementsFromBaseMm[2].dxMm,3)
 assert.equal(result.correspondence[0].rows[1].pointMovementsFromBaseMm[4].dyMm,2)
})
test('rejects symmetric rectangular shapes with multiple valid mappings',()=>{
 const rectangle=[[0,0],[40,0],[40,20],[0,20]].map(([x,y])=>({x,y}))
 const result=inspect(fixture(rectangle,rectangle))
 assert.equal(result.ok,false)
 assert.equal(result.correspondence[0].rows[1].reason,'AMBIGUOUS_SYMMETRY')
})
test('changed topology blocks mapping',()=>{
 const result=inspect(fixture([...shape,{x:0,y:9}]))
 assert.equal(result.ok,false)
 assert.equal(result.correspondence[0].rows[1].reason,'TOPOLOGY_CHANGED')
})
test('large vertex payload is refused before search',()=>{
 const many=Array.from({length:129},(_,i)=>({x:Math.cos(i*2*Math.PI/129)*20,y:Math.sin(i*2*Math.PI/129)*20}))
 assert.equal(inspect(fixture(many,many)).ok,false)
})
test('malformed and accessor inputs are refused without calling getter',()=>{
 let invoked=false
 const f=fixture()
 Object.defineProperty(f.bySize['42'].P.sourceGeometry,'points',{get(){invoked=true;throw Error('escaped')}})
 const result=inspect(f)
 assert.equal(result.ok,false)
 assert.equal(result.code,'ACCESSOR_REFUSED')
 assert.equal(invoked,false)
 assert.equal(inspect(null).ok,false)
})
test('provenance hashes preserved, no rules or factory approval',()=>{
 const original=fixture(shifted(shape,1));const before=JSON.stringify(original)
 const result=inspect(original)
 assert.equal(result.correspondence[0].rows[1].sourceSha256,hash)
 assert.equal(result.nativeRulesCommitted,false)
 assert.equal(result.factoryExportAllowed,false)
 assert.equal(JSON.stringify(original),before)
})
test('inherited polluted toJSON is never invoked',()=>{
 let invoked=0
 const previous=Object.getOwnPropertyDescriptor(Object.prototype,'toJSON')
 try{
  Object.defineProperty(Object.prototype,'toJSON',{configurable:true,value(){invoked++;throw Error('malicious toJSON')}})
  const result=inspect(fixture(shifted(shape,1)))
  assert.equal(result.ok,true)
  assert.equal(invoked,0)
  assert.equal(result.correspondence[0].rows[1].sourceFile,'42.dxf')
  assert.equal(result.correspondence[0].rows[1].sourceSha256,hash)
 }finally{
  if(previous)Object.defineProperty(Object.prototype,'toJSON',previous)
  else delete Object.prototype.toJSON
 }
})
test('own nonenumerable and symbol provenance metadata fail closed',()=>{
 const hidden=fixture()
 Object.defineProperty(hidden.bySize['42'].P,'sourceSecret',{value:'unseen',enumerable:false})
 assert.equal(inspect(hidden).code,'HIDDEN_METADATA_REFUSED')
 const symbol=fixture()
 symbol.bySize['42'].P[Symbol('provenance')]='unseen'
 assert.equal(inspect(symbol).code,'SYMBOL_METADATA_REFUSED')
})
test('malicious own toJSON function refuses without invocation',()=>{
 const input=fixture();let invoked=false
 input.toJSON=()=>{invoked=true;throw Error('malicious')}
 assert.equal(inspect(input).ok,false)
 assert.equal(invoked,false)
})
test('symmetric source strictly rejects every size and never emits a movement map',()=>{
 const square=[[0,0],[20,0],[20,20],[0,20]].map(([x,y])=>({x,y}))
 const output=inspect(fixture(shifted(square,2),square))
 assert.equal(output.ok,false)
 assert.equal(output.nativeRulesCommitted,false)
 assert.equal(output.correspondence[0].rows.every(row=>row.matched===false&&row.reason==='AMBIGUOUS_SYMMETRY'),true)
 assert.equal(output.correspondence[0].rows.some(row=>row.pointMovementsFromBaseMm),false)
})
