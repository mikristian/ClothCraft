import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {unzipSync,strFromU8} from 'fflate'
import {applyAccuMarkAtomicGradeRun20261024 as grade} from './accumarkAtomicGradeRun20261024.js'
import {gradeProject} from './grading.js'
import {nestPolygons} from './accumarkPolygonNesting20261024.js'
import {adjustAccuMarkManualMarker20261024 as move} from './accumarkManualMarker20261024.js'
import {optimizeAccuMarkMarkerProduction20261024 as optimize,compareAccuMarkMarkerRollDemand20261024 as roll} from './accumarkMarkerProductionOptimization20261024.js'
import {auditAccuMarkCadInterchangeReceiving20261024 as cad} from './accumarkCadInterchangeReceivingQA20261024.mjs'

const rect=(id,x,w)=>({id,name:id,points:[
 {x,y:0},{x:x+w,y:0},{x:x+w,y:4},{x,y:4}],
 cutQuantity:1,grainAngleDeg:0,seamAllowance:0,marker:{nap:'one-way'},fabricId:'main'})
const base=()=>({id:'live-source-v1',revision:7,grading:{sizes:['S','M','L'],baseSize:'M',widthPerSizeCm:0,lengthPerSizeCm:0},
 pieces:[rect('front',0,4),rect('back',10,4)],seams:[]})
const gradeEdits=()=>[0,1].flatMap(piece=>
 [1,2].map(pointIndex=>({pieceId:piece===0?'front':'back',pointIndex,
 offsetsCm:[{size:'S',dxCm:-.2,dyCm:0},{size:'M',dxCm:0,dyCm:0},{size:'L',dxCm:.25,dyCm:0}]})))

test('atomic grading -> real size-specific source CUTs -> marker geometry -> local optimization -> physically verified roll plies',()=>{
 const project=base(),original=structuredClone(project)
 const graded=grade(project,{edits:gradeEdits()})
 assert.equal(graded.ok,true)
 const single=gradeProject(graded.project,'L')
 const source={...single,grading:undefined}
 const first=nestPolygons(source,{fabricWidth:15,gapCm:1,gap:1,maxLength:40,fabricId:'main'})
 assert.equal(first.ok,true,JSON.stringify(first))
 const second=first.placements[1]
 const stretched=move(source,first,{
  pieceId:second.pieceId,instance:second.instance,x:second.x,y:second.y+10,
  rotationDeg:second.rotationDeg,fabricWidthCm:15,gapCm:1,maxLengthCm:40})
 assert.equal(stretched.ok,true,JSON.stringify(stretched))
 const improvement=optimize(source,stretched,{fabricWidthCm:15,gapCm:1,maxLengthCm:40,maxEvaluations:150})
 assert.equal(improvement.ok,true,JSON.stringify(improvement))
 assert(improvement.optimization.afterLengthCm<improvement.optimization.beforeLengthCm)
 const demand=roll(source,stretched,improvement,{fabricWidthCm:15,gapCm:1,maxLengthCm:40,
  plyCount:6,rolls:[{rollId:'R1',usableLengthCm:300}]})
 assert.equal(demand.ok,true,JSON.stringify(demand))
 assert(demand.materialSavedCm>0)
 assert.equal(demand.manufacturingApproved,false)
 assert.equal(improvement.cuttingAuthorized,false)
 assert.deepEqual(project,original)
})
test('Seamly source ZIP retains audited CAD bytes and catches caller-supplied geometry losses without CAD approval',async()=>{
 const original=readFileSync(new URL('../../research/oss/pattern-cad/runtime/verified-exports/seamly-48-52-cad-receiver-evaluation-NOT-APPROVED.zip',import.meta.url))
 const actual=unzipSync(original)
 const receiver={48:strFromU8(actual['graded-aama/seamly-size-48.dxf']),52:strFromU8(actual['graded-aama/seamly-size-52.dxf'])}
 const accepted=await cad(original,{receiverDxfs:receiver})
 assert.equal(accepted.ok,true,JSON.stringify(accepted.issues))
 assert.equal(accepted.sizes.length,2)
 assert.equal(accepted.manufacturingApproved,false)
 assert.equal(accepted.receiverGeometryCompared,true)
 assert.equal(accepted.receivingCadVerified,false)
 const lost={...receiver,52:receiver[52].replace(/\n\s*10\s*\n\s*(-?\d+\.\d+)/,(_,n)=>'\n 10\n'+String(Number(n)+2))}
 assert.equal((await cad(original,{receiverDxfs:lost})).ok,false)
})
