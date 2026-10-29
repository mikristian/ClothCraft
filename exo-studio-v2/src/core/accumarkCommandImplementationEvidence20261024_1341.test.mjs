import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import master from '../../research/accumark-v10-playlist/ACCUMARK_MASTER_VERIFIED_COMMAND_CENSUS_20261024.json' with {type:'json'}
import {extractAccuMarkReferencePiece20261024_1341} from './accumarkReferencePieceExtraction20261024_1341.js'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const records=new Map(master.records.map(r=>[r.id,r]))
test('exactly ten previously unverified named vendor actions now have narrower source-tested EXO implementations',()=>{
 const upgraded=['S021','HELP-0088','HELP-0090','HELP-0091',
   'HELP-0102','HELP-0103','HELP-0106','HELP-0141','TB-02','TB-06']
 assert.equal(master.summary.newlyCodeTestedPartialCommandsThisLoop,upgraded.length)
 for(const id of upgraded){
  const row=records.get(id)
  assert(row,id)
  assert.equal(row.status,'partial',id)
  assert.equal(row.engineeringOnly,true,id)
  assert.equal(row.implementationLoop,'20261024_1341',id)
  assert.equal(row.vendorParityTested,false,id)
  assert(fs.existsSync(path.join(root,row.exoCode)),id)
  assert(row.tests.length>=2,id)
  row.tests.forEach(file=>assert(fs.existsSync(path.join(root,file)),id+':'+file))
 }
 assert.equal(master.summary.actionWorkflowRecords,348)
 assert.equal(master.summary.counts.partial,71)
 assert.equal(master.summary.counts.missing,23)
 assert.equal(master.summary.counts.unverified,254)
 assert.equal(master.summary.independentLicensedVendorApplicationComparativeRuns,0)
})
test('extract-piece vendor group remains an unapproved source page, not falsely upgraded to production command',()=>{
 const row=records.get('HELP-0309')
 assert(row)
 assert.equal(row.status,'reference')
 assert.equal(row.kind,'reference')
 assert(row.engineeringReferenceStudy?.scope.includes('absent from factory piece inventory'))
 assert(fs.existsSync(path.join(root,row.engineeringReferenceStudy.code)))
 assert(fs.existsSync(path.join(root,row.engineeringReferenceStudy.test)))
 const p={id:'test-source',pieces:[{id:'front',name:'Front',points:[
  {x:0,y:0},{x:15,y:0},{x:15,y:8},{x:0,y:8}],cutQuantity:2,
  seams:[{id:'waist'}]}],seams:[{pieceA:'front',edgeA:1}],revision:2,
  grading:{sizes:['M'],baseSize:'M',widthPerSizeCm:0,lengthPerSizeCm:0}}
 const before=structuredClone(p)
 const output=extractAccuMarkReferencePiece20261024_1341(p,{sourcePieceId:'front',referenceId:'ref-front'})
 assert.equal(output.study.kind,'DETACHED_REFERENCE_OUTLINE_STUDY')
 assert.deepEqual(output.project.pieces,p.pieces)
 assert.equal(output.project.pieces.length,1)
 assert.equal(output.study.piece.cutQuantity,undefined)
 assert.equal(output.study.piece.seamAllowance,undefined)
 assert.equal(output.provenance.factoryApproved,false)
 assert.deepEqual(p,before)
})
