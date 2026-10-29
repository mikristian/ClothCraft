import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash,webcrypto} from 'node:crypto'
import {inspectSeamlyNativeSizeRun20261024} from './seamlyNativeSizeRunBridge20261024.js'
import {inspectSeamlyNativeGradeCorrespondence20261024_1400} from './seamlyNativeGradeCorrespondence20261024_1400.js'
import {repairAccuMarkRepeatPlacement20261024_1400} from './accumarkRepeatGuidedPlacement20261024_1400.js'
import {validateAccuMarkMaterialRepeatQA} from './accumarkMaterialRepeatQA20261024.js'

test('original 17-block Seamly DXF size-run provides provenance-checked correspondence without false industrial rule import',async()=>{
 const original=readFileSync(new URL('../../research/oss/pattern-cad/runtime/verified-exports/male-shirt-engine-aama_pieces.dxf',import.meta.url),'utf8')
 const sha=createHash('sha256').update(original).digest('hex')
 const run={ok:true,engine:'Seamly2D',format:'aama-r10',manufacturingApproved:false,
  sizesCm:[48,52],artifacts:[48,52].map(size=>({
   name:'real-geometry-'+size+'.dxf',sizeCm:size,sha256:sha,
   content:original,sizeBytes:Buffer.byteLength(original),localInspection:{sourceUnit:'mm'}
  }))}
 const pristine=structuredClone(run)
 const imported=await inspectSeamlyNativeSizeRun20261024(run,
  {sourceUnit:'mm',baseSize:48},{subtle:webcrypto.subtle})
 assert.equal(imported.ok,true,imported.reason)
 assert.equal(imported.sourceBlocks.length,17)
 const correspondence=inspectSeamlyNativeGradeCorrespondence20261024_1400(imported)
 assert.equal(correspondence.correspondence.length,17)
 assert.equal(correspondence.manufacturingApproved,false)
 assert.equal(correspondence.factoryExportAllowed,false)
 assert.equal(correspondence.nativeRulesCommitted,false)
 assert(correspondence.blockers.some(s=>s.includes('symmetric')),'Symmetric factory CUTs need independent vertex IDs')
 const everySha=correspondence.correspondence.flatMap(p=>p.rows)
 assert(everySha.length>=34)
 assert(everySha.every(r=>r.sourceSha256===sha))
 assert.deepEqual(run,pristine)
})
test('automated motif adjustment never converts a QA-only source into a production-approved CUT marker',()=>{
 const unitSquare=[{x:0,y:0},{x:2,y:0},{x:2,y:2},{x:0,y:2}]
 const place=(pieceId,x,y)=>({pieceId,instance:0,size:'M',x,y,rotationDeg:0,
  outline:unitSquare.map(p=>({x:p.x+x,y:p.y+y}))})
 const sourcesByPieceId={}
 for(const id of ['front','back'])sourcesByPieceId[id]={
  cutline:structuredClone(unitSquare),anchor:{x:1,y:1},group:'matched-body',size:'M',
  shade:'A',nap:'one-way',grainAngleDeg:0,cutQuantity:1}
 const args={project:{pieces:[{id:'front',cutQuantity:1,marker:{nap:'one-way'}},{id:'back',cutQuantity:1,marker:{nap:'one-way'}}]},
  nesting:{ok:true,placements:[place('front',0,0),place('back',11,10)],unplaced:[],errors:[]},
  fabricWidthCm:25,repeatCm:{x:10,y:10},sourcesByPieceId,
  quantitiesBySize:{M:1},shadeZones:[{shade:'A',minY:0,maxY:50}],toleranceCm:.001}
 const original=structuredClone(args)
 const repaired=repairAccuMarkRepeatPlacement20261024_1400(args,{
  target:{pieceId:'back',size:'M',instance:0},maxLengthCm:50,gapCm:1.5})
 assert.equal(repaired.ok,true,repaired.detail)
 assert.equal(repaired.qa.ok,true)
 assert.equal(validateAccuMarkMaterialRepeatQA({...args,nesting:repaired.nesting}).ok,true)
 assert.equal(repaired.cuttingAuthorized,false)
 assert.equal(repaired.manufacturingApproved,false)
 assert.deepEqual(args,original)
})
