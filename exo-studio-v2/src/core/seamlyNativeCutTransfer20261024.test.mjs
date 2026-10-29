import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {listSeamlyNativeTransferCandidates20261024 as inspect,buildSeamlyNativeCutCommand20261024 as plan} from './seamlyNativeCutTransfer20261024.js'
const file={name:'shirt-aama.dxf',content:fs.readFileSync(new URL('../../research/oss/pattern-cad/runtime/verified-exports/male-shirt-engine-aama_pieces.dxf',import.meta.url),'utf8'),sha256:'a'.repeat(64)}
test('original Seamly CUTs have bounded editable source previews, never sewline/grade certification',()=>{
 const result=inspect(file,{unit:'mm'})
 assert.equal(result.ok,true,result.reason)
 assert.equal(result.pieces.length,17)
 assert(result.pieces.every(p=>p.eligible && p.points.length<=64 && p.deviationMm<=.25))
 assert.equal(result.manufacturingApproved,false)
 assert.equal(result.pieces[0].markers.drawGuides>0,true)
})
test('one authored native Polygon command preserves physical meters with source provenance',()=>{
 const result=plan(file,{unit:'mm',index:13,fabricId:'cotton'})
 assert.equal(result.ok,true,result.reason)
 assert.equal(result.name,'FRONTPANEL')
 assert.equal(result.command.kind,'Polygon')
 assert.equal(result.command.fabric,'cotton')
 assert.equal(result.command.points.length,64)
 assert(result.command.points.every(([x,y])=>Number.isFinite(x)&&Number.isFinite(y)&&Math.abs(x)<5&&Math.abs(y)<5))
 assert.equal(result.geometryDeviationMm<.25,true)
 assert.equal(result.manufacturingApproved,false)
})
test('invalid source units and invalid native fabric/selection refuse without editing',()=>{
 assert.equal(inspect(file,{}).ok,false)
 assert.equal(plan(file,{unit:'mm',index:0,fabricId:''}).code,'INVALID_SELECTION')
 assert.equal(plan(file,{unit:'mm',index:100,fabricId:'fabric'}).ok,false)
 assert.equal(plan({...file,name:'bad.svg'},{unit:'mm',index:0,fabricId:'fabric'}).code,'INVALID_SOURCE')
})
