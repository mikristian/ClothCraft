import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash,webcrypto} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {inspectSeamlyNativeSizeRun20261024 as inspect} from './seamlyNativeSizeRunBridge20261024.js'
const content=readFileSync(new URL('../../research/oss/pattern-cad/runtime/verified-exports/male-shirt-engine-aama_pieces.dxf',import.meta.url),'utf8')
const hash=s=>createHash('sha256').update(s).digest('hex')
const make=(text=content,sizes=[48,52])=>({ok:true,engine:'Seamly2D',format:'aama-r10',manufacturingApproved:false,sizesCm:sizes,
 artifacts:sizes.map(size=>({sizeCm:size,name:`graded-${size}.dxf`,content:text,sha256:hash(text),sizeBytes:Buffer.byteLength(text),
 localInspection:{sourceUnit:'mm'}}))})
const options={sourceUnit:'mm',baseSize:48,fabricId:'cotton'}
const deps={subtle:webcrypto.subtle}
test('real verified upstream Seamly AAMA fixture maps each size into separate CUT-only previews and retains originals',async()=>{
 const run=make(),snapshot=structuredClone(run),r=await inspect(run,options,deps)
 assert.equal(r.ok,true,r.reason)
 assert.equal(r.sourceBlocks.length,17)
 assert.deepEqual(r.sizes,[48,52])
 assert.equal(r.approved,false)
 assert.equal(r.nativeRulesCommitted,false)
 assert.equal(r.nativeEditsApplied,false)
 assert.equal(r.blockers.length,0)
 const piece=r.gradeInspector.FRONTPANEL
 assert.equal(piece.rows.length,2)
 assert(piece.rows.every(p=>p.nativeProposal.points.length<=64&&p.nativeProposal.fabric==='cotton'))
 assert(piece.rows.every(p=>p.pointMovementsFromBaseMm.every(m=>m.dxMm===0&&m.dyMm===0)))
 assert.equal(r.originalSources['48'].originalDxfText,content)
 assert.deepEqual(run,snapshot)
})
test('rejects content tampering, byte mismatches, unit mismatch, and absent SHA256 implementation',async()=>{
 const run=make()
 run.artifacts[1].content+=' '
 assert.equal((await inspect(run,options,deps)).code,'HASH_MISMATCH')
 run.artifacts[1].sha256=hash(run.artifacts[1].content)
 assert.equal((await inspect(run,options,deps)).code,'HASH_MISMATCH')
 assert.equal((await inspect(make(),{},deps)).code,'SOURCE_UNIT_REQUIRED')
 assert.equal((await inspect(make(),options,{subtle:null})).code,'SHA256_UNAVAILABLE')
 assert.equal((await inspect(make(),{...options,sourceUnit:'cm'},deps)).code,'UNIT_CONFLICT')
})
test('rejects case-folded duplicate sizes with individually valid hashed DXFs',async()=>{
 const run=make(content,['S','s'])
 assert.equal((await inspect(run,{...options,baseSize:'S'},deps)).code,'SIZE_COLLISION')
})
test('rejects unmatched blocks and malformed CUT geometries even when content is freshly hashed',async()=>{
 const renamed=content.replaceAll('FRONTPANEL','FRONTPART')
 const run=make()
 run.artifacts[1]={...make(renamed).artifacts[1]}
 assert.equal((await inspect(run,options,deps)).code,'INVENTORY_MISMATCH')
 const malformed=content.replace('POLYLINE','CIRCLE')
 const bad=make(malformed)
 assert.equal((await inspect(bad,options,deps)).ok,false)
})
