import test from 'node:test'
import assert from 'node:assert/strict'
import {gradeProject} from './grading.js'
import {projectToDxf} from './dxf.js'
import {inspectIndustrialReceivingEntityInventory20261028 as inspect} from './industrialReceivingEntityInventory20261028.mjs'

// Disposable two-size, two-fabric manufacturing pattern with real CUT,
// STITCH, NOTCH, GRAIN and LABEL entities. Never touches factory records.
const project={id:'disposable-auxiliary-layer-tee',grading:{sizes:['S','M'],baseSize:'M',
 widthPerSizeCm:0,lengthPerSizeCm:0},pieces:[
 {id:'front',name:'Front',fabricId:'shell',cutQuantity:2,grainAngleDeg:0,
  seamAllowance:1,notches:[{edgeIndex:0,t:.25,depthCm:.3}],
  points:[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}]},
 {id:'collar',name:'Collar',fabricId:'rib',cutQuantity:1,grainAngleDeg:90,
  seamAllowance:1,notches:[],
  points:[{x:0,y:0},{x:7,y:0},{x:7,y:3},{x:0,y:3}]},
]}
const authored=Object.fromEntries(project.grading.sizes.map(size=>[size,
 projectToDxf(gradeProject(project,size),size,{cutlineMode:'manufacturing',requireGradedGeometry:true})]))
const fixture=()=>({...authored})
const refuse=(mutate,code='RECEIVER_ENTITY_INVENTORY_DRIFT')=>{
 const wires=fixture();mutate(wires)
 const result=inspect(project,wires)
 assert.equal(result.ok,false,JSON.stringify(result))
 assert(result.issues.some(issue=>issue.code===code),JSON.stringify(result.issues))
 assert.equal(result.receiverCadVerified,false)
 assert.equal(result.cuttingAuthorized,false)
 assert.equal(result.factoryApproved,false)
}
const replace=(wires,size,needle,withValue)=>{
 assert(wires[size].includes(needle),`Fixture missing ${needle}`)
 wires[size]=wires[size].replace(needle,withValue)
}

test('all-size physical and auxiliary DXF entities match, without granting receiving CAD or CUT approval',()=>{
 const wires=fixture(),before=structuredClone(wires),result=inspect(project,wires)
 assert.equal(result.ok,true,JSON.stringify(result.issues))
 assert.deepEqual(result.rows.map(r=>r.size),['S','M'])
 assert(result.rows.every(r=>r.grainLines===2&&r.labels===2&&r.entities>=8))
 assert.equal(result.receivingAuxiliaryEntitiesVerified,true)
 assert.equal(result.independentReceiverAuthenticated,false)
 assert.equal(result.receiverCadVerified,false)
 assert.equal(result.cuttingAuthorized,false)
 assert.equal(result.factoryApproved,false)
 assert.deepEqual(wires,before)
})

test('grainline direction, position, disappearance and duplicates fail closed',()=>{
 refuse(w=>replace(w,'M','GRAIN_FRONT\n10\n','GRAIN_BROKEN\n10\n'))
 refuse(w=>{w.S=w.S.replace(/(8\nGRAIN_FRONT\n10\n)(-?[\d.]+)/,
  (_,prefix,x)=>`${prefix}${Number(x)+2}`)})
 refuse(w=>{
  const block=/0\nLINE\n8\nGRAIN_FRONT\n[\s\S]*?(?=0\nTEXT\n8\nLABEL_FRONT)/.exec(w.M)?.[0]
  assert(block)
  w.M=w.M.replace(block,'')
 })
 refuse(w=>{
  const block=/0\nLINE\n8\nGRAIN_FRONT\n[\s\S]*?(?=0\nTEXT\n8\nLABEL_FRONT)/.exec(w.M)?.[0]
  assert(block)
  w.M=w.M.replace(block,block+block)
 })
})

test('changed garment-size label and extra cutter-visible geometry fail closed',()=>{
 refuse(w=>replace(w,'M','1\nFront / M','1\nFront / XL'))
 refuse(w=>replace(w,'S','0\nENDSEC\n0\nEOF',
  '0\nLINE\n8\nCUTTER_EXTRA\n10\n0\n20\n0\n11\n100\n21\n100\n0\nENDSEC\n0\nEOF'))
 refuse(w=>replace(w,'S','0\nENDSEC\n0\nEOF',
  '0\nCIRCLE\n8\nEXTRA\n10\n1\n20\n1\n40\n5\n0\nENDSEC\n0\nEOF'),
  'RECEIVER_ENTITY_INSPECTION_REFUSED')
})

test('unsupported bulges and nonplanar or invisible manufacturing geometry are rejected',()=>{
 refuse(w=>replace(w,'M','0\nPOLYLINE\n8\nCUT_FRONT_M\n66\n1\n70\n1',
  '0\nPOLYLINE\n8\nCUT_FRONT_M\n66\n1\n70\n1\n42\n0.5'),
  'RECEIVER_ENTITY_INSPECTION_REFUSED')
 refuse(w=>replace(w,'S','0\nLINE\n8\nGRAIN_FRONT\n',
  '0\nLINE\n8\nGRAIN_FRONT\n60\n1\n'),
  'RECEIVER_ENTITY_INSPECTION_REFUSED')
})

test('size inventory and empty re-export cannot silently use locally regenerated geometry',()=>{
 refuse(w=>{delete w.M},'INVALID_RECEIVER_SIZE_INVENTORY')
 refuse(w=>{w.XL=w.M},'INVALID_RECEIVER_SIZE_INVENTORY')
 refuse(w=>{w.S=''},'RECEIVER_ENTITY_INSPECTION_REFUSED')
})

test('reordered DXF entities and equivalent numeric formatting remain acceptable',()=>{
 const wires=fixture()
 const grain=/0\nLINE\n8\nGRAIN_FRONT\n[\s\S]*?(?=0\nTEXT\n8\nLABEL_FRONT)/.exec(wires.M)?.[0]
 assert(grain)
 wires.M=wires.M.replace(grain,'').replace('0\nENDSEC\n0\nEOF',grain+'0\nENDSEC\n0\nEOF')
 wires.S=wires.S.replace(/(8\nGRAIN_FRONT\n10\n)(-?[\d.]+)/,
  (_,prefix,x)=>`${prefix}${Number(x).toFixed(6)}`)
 const result=inspect(project,wires)
 assert.equal(result.ok,true,JSON.stringify(result.issues))
})
