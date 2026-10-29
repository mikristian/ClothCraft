import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {unzipSync,strFromU8} from 'fflate'
import {parseSeamlyAamaManufacturingSemantics as parse} from './seamlyAamaManufacturingSemantics20261023.mjs'
import {auditAccuMarkCadInterchangeReceiving20261024 as audit} from './accumarkCadInterchangeReceivingQA20261024.mjs'
import {inspectIndustrialAamaMarkingCoverage20261028 as inspect} from './industrialAamaMarkingCoverage20261028.mjs'

// Independent Seamly2D AAMA exports, used read-only. Injected markings below
// are DISPOSABLE local test modifications, not vendor/receiver evidence.
const zip=readFileSync('research/oss/pattern-cad/runtime/verified-exports/seamly-48-52-cad-receiver-evaluation-NOT-APPROVED.zip')
const entries=unzipSync(zip)
const sizes=['48','52']
const originals=Object.fromEntries(sizes.map(size=>[size,strFromU8(entries[`graded-aama/seamly-size-${size}.dxf`])]))
const policies=Object.fromEntries(sizes.map(size=>[size,Object.fromEntries(
  parse(originals[size],{unit:'mm'}).pieces.map(piece=>[piece.name,
    {expectedNotches:0,requireGrainline:false,napDirectionRequired:false}]))]))
const clone=()=>structuredClone(policies)
const refuse=(result,code)=>{
 assert.equal(result.ok,false,JSON.stringify(result))
 assert(result.issues.some(issue=>issue.code===code),JSON.stringify(result.issues))
 assert.equal(result.cuttingAuthorized,false)
 assert.equal(result.factoryApproved,false)
 assert.equal(result.manufacturingApproved,false)
}
const line=(layer,a,b)=>`  0\nLINE\n  8\n${layer}\n 10\n${a.x}\n 20\n${a.y}\n 30\n0\n 11\n${b.x}\n 21\n${b.y}\n 31\n0\n`
function marked(wire,{notch='valid',grain='valid'}={}){
 const piece=parse(wire,{unit:'mm'}).pieces[0]
 const [a,b]=piece.cutOutlineMm.points
 const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2}
 const near={x:mid.x,y:mid.y+5}
 const notchA=notch==='off-edge'?{x:mid.x+35,y:mid.y+35}:mid
 const notchB=notch==='outward'?{x:mid.x,y:mid.y-5}:notch==='zero'?notchA:near
 const grainA=grain==='outside'?{x:mid.x,y:mid.y-80}:{x:mid.x,y:mid.y+40}
 const grainB=grain==='short'?{x:grainA.x,y:grainA.y+1}:
  {x:grainA.x,y:grainA.y+(grain==='outside'?-40:50)}
 const insert=line('4',notchA,notchB)+line('7',grainA,grainB)
 const blockStart=wire.indexOf('\n  0\nBLOCK\n  8\n1\n  2\n'+piece.name+'\n')
 assert(blockStart>0,'source AAMA BLOCK exists')
 const end=wire.indexOf('\n  0\nENDBLK',blockStart)
 assert(end>blockStart)
 const result=wire.slice(0,end+1)+insert+wire.slice(end+1)
 const parsed=parse(result,{unit:'mm'})
 assert.equal(parsed.pieces[0].notches.length,1)
 assert(parsed.pieces[0].grainline)
 return result
}
const withMarks=(optionsBySize={})=>Object.fromEntries(sizes.map(size=>
 [size,marked(originals[size],optionsBySize[size]||{})]))
const markedPolicy=()=>{
 const p=clone()
 for(const size of sizes){const first=Object.keys(p[size])[0]
  p[size][first]={expectedNotches:1,requireGrainline:true,napDirectionRequired:false}}
 return p
}

test('independent 48/52 source DXF fixture parses, but zero marks never imply production approval',async()=>{
 const baseline=await audit(zip)
 assert.equal(baseline.ok,true,JSON.stringify(baseline.issues))
 assert.deepEqual(baseline.sizes.map(row=>[row.sizeCm,row.cutPieces,row.notches,row.grainlines]),
  [[48,5,0,0],[52,5,0,0]])
 const result=inspect(originals,{unit:'mm',requirementsBySize:clone()})
 assert.equal(result.ok,true,JSON.stringify(result.issues))
 assert.equal(result.pieceRows.length,10)
 assert.equal(result.markingGeometryInspected,true)
 assert.equal(result.napDirectionVerified,false)
 assert.equal(result.receiverCadVerified,false)
 assert.equal(result.aamaCertified,false)
 assert.equal(result.cuttingAuthorized,false)
})

test('required notches and grainlines cannot be silently absent in either graded size',()=>{
 refuse(inspect(originals,{unit:'mm',requirementsBySize:markedPolicy()}),
  'AAMA_REQUIRED_MARKS_MISSING_OR_EXTRA')
 const one=withMarks()
 one['52']=originals['52']
 refuse(inspect(one,{unit:'mm',requirementsBySize:markedPolicy()}),
  'AAMA_REQUIRED_MARKS_MISSING_OR_EXTRA')
})

test('disposable two-size AAMA markings pass local physical CUT anchoring and grainline placement',()=>{
 const result=inspect(withMarks(),{unit:'mm',requirementsBySize:markedPolicy()})
 assert.equal(result.ok,true,JSON.stringify(result.issues))
 assert.equal(result.pieceRows.filter(row=>row.notches===1).length,2)
 assert.equal(result.pieceRows.filter(row=>row.grainlinePresent).length,2)
 assert.equal(result.cuttingAuthorized,false)
 assert.equal(result.factoryApproved,false)
})

test('off-edge, outward, and zero-depth notch marks are rejected despite correct layer inventory',()=>{
 for(const notch of ['off-edge','outward','zero']){
  const wires=withMarks({'48':{notch}})
  refuse(inspect(wires,{unit:'mm',requirementsBySize:markedPolicy()}),
   'AAMA_NOTCH_CUT_ANCHOR_DRIFT')
 }
})

test('grainline outside CUT or too short is rejected, not just counted',()=>{
 for(const grain of ['outside','short']){
  const wires=withMarks({'52':{grain}})
  refuse(inspect(wires,{unit:'mm',requirementsBySize:markedPolicy()}),
   'AAMA_GRAINLINE_GEOMETRY_DRIFT')
 }
})

test('directional nap cannot be certified from undirected layer-7 AAMA LINE',()=>{
 const p=markedPolicy()
 p['48'][Object.keys(p['48'])[0]].napDirectionRequired=true
 refuse(inspect(withMarks(),{unit:'mm',requirementsBySize:p}),
  'AAMA_NAP_DIRECTION_UNPROVEN')
})

test('missing size, missing piece policy, and invalid units fail closed',()=>{
 const wires=withMarks(),p=markedPolicy()
 delete wires['52']
 refuse(inspect(wires,{unit:'mm',requirementsBySize:p}),'INVALID_AAMA_MARKING_POLICY')
 const p2=markedPolicy()
 delete p2['52'][Object.keys(p2['52'])[0]]
 refuse(inspect(withMarks(),{unit:'mm',requirementsBySize:p2}),
  'AAMA_MARKING_PIECE_IDENTITY_DRIFT')
 refuse(inspect(withMarks(),{unit:null,requirementsBySize:markedPolicy()}),
  'INVALID_AAMA_MARKING_POLICY')
})
