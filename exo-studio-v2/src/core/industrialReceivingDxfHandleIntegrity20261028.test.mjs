import test from 'node:test'
import assert from 'node:assert/strict'
import {projectToDxf} from './dxf.js'
import {gradeProject} from './grading.js'
import {createTeeTemplate} from '../data/templates.js'
import {inspectIndustrialReceivingDxfHandleIntegrity20261028 as inspect} from './industrialReceivingDxfHandleIntegrity20261028.mjs'

const garment={id:'disposable-r12-handle-test',grading:{sizes:['S','M'],baseSize:'M',
 widthPerSizeCm:0,lengthPerSizeCm:0},pieces:[
 {id:'front',name:'Front',fabricId:'shell',seamAllowance:1,cutQuantity:2,grainAngleDeg:0,
  points:[{x:0,y:0},{x:12,y:0},{x:12,y:9},{x:0,y:9}],
  notches:[{edgeIndex:0,t:.25,depthCm:.4}]},
 {id:'collar',name:'Collar',fabricId:'rib',seamAllowance:.7,cutQuantity:1,grainAngleDeg:0,
  points:[{x:0,y:0},{x:7,y:0},{x:7,y:3},{x:0,y:3}]},
 ]}
const wires=()=>Object.fromEntries(garment.grading.sizes.map(size=>[
 size,projectToDxf(gradeProject(garment,size),size,
  {cutlineMode:'manufacturing',requireGradedGeometry:true})]))
const withHandle=(wire,layer,handle)=>{
 const from=`0\nPOLYLINE\n8\n${layer}\n`
 assert(wire.includes(from),`Physical CUT layer ${layer} missing`)
 return wire.replace(from,`0\nPOLYLINE\n5\n${handle}\n8\n${layer}\n`)
}
const withOwner=(wire,layer)=>{
 const from=`0\nPOLYLINE\n8\n${layer}\n`
 assert(wire.includes(from))
 return wire.replace(from,`0\nPOLYLINE\n330\nAB\n8\n${layer}\n`)
}
const blocked=(wiresBySize,code='RECEIVER_ENTITY_HANDLE_DRIFT')=>{
 const result=inspect(garment,wiresBySize)
 assert.equal(result.ok,false,JSON.stringify(result))
 assert(result.issues.some(x=>x.code===code),JSON.stringify(result.issues))
 assert.equal(result.receiverCadVerified,false)
 assert.equal(result.cuttingAuthorized,false)
 assert.equal(result.factoryApproved,false)
}

test('real two-size two-fabric garment R12 export is handle-safe without granting factory approval',()=>{
 const received=wires(),before=structuredClone(received)
 const result=inspect(garment,received)
 assert.equal(result.ok,true,JSON.stringify(result.issues))
 assert.deepEqual(result.rows.map(row=>row.size),['S','M'])
 assert(result.rows.every(row=>row.uniqueEntityHandles===0))
 assert.equal(result.receiverCadVerified,false)
 assert.equal(result.cuttingAuthorized,false)
 assert.deepEqual(received,before)
})

test('unique optional hex handles can survive a receiving re-export without a fake acceptance claim',()=>{
 const received=wires()
 received.M=withHandle(received.M,'CUT_FRONT_M','00AB')
 received.M=withHandle(received.M,'CUT_COLLAR_M','CD')
 const result=inspect(garment,received)
 assert.equal(result.ok,true,JSON.stringify(result.issues))
 assert.equal(result.rows.find(row=>row.size==='M').uniqueEntityHandles,2)
 assert.equal(result.independentReceiverAuthenticated,false)
})

test('real six-size graded T-shirt R12 CUT/STITCH/notch output has no duplicate receiving handles',()=>{
 const project=createTeeTemplate()
 const bySize=Object.fromEntries(project.grading.sizes.map(size=>[
  size,projectToDxf(gradeProject(project,size),size,
   {cutlineMode:'manufacturing',requireGradedGeometry:true})]))
 const result=inspect(project,bySize)
 assert.equal(result.ok,true,JSON.stringify(result.issues))
 assert.equal(result.rows.length,6)
 assert.equal(result.cuttingAuthorized,false)
 assert.equal(result.receiverCadVerified,false)
})

test('duplicate handles with different leading zeros are rejected even if geometry is unchanged',()=>{
 const received=wires()
 received.M=withHandle(received.M,'CUT_FRONT_M','AB')
 received.M=withHandle(received.M,'CUT_COLLAR_M','00ab')
 blocked(received)
})

test('malformed, zero, duplicated-on-one-entity and unsupported owner handles fail closed',()=>{
 for(const value of ['0','XYZ','123456789ABCDEF01']){
  const received=wires()
  received.S=withHandle(received.S,'CUT_FRONT_S',value)
  blocked(received)
 }
 const duplicate=wires()
 duplicate.M=withHandle(duplicate.M,'CUT_FRONT_M','AB')
 duplicate.M=duplicate.M.replace('5\nAB\n8\nCUT_FRONT_M','5\nAB\n5\nAC\n8\nCUT_FRONT_M')
 blocked(duplicate)
 const owner=wires()
 owner.M=withOwner(owner.M,'CUT_FRONT_M')
 blocked(owner)
})

test('missing graded size cannot silently fall back to locally generated DXF',()=>{
 const received=wires()
 delete received.S
 blocked(received,'INVALID_RECEIVER_HANDLE_SIZE_SET')
})
