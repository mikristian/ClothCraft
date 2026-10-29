import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {unzipSync,zipSync,strFromU8,strToU8} from 'fflate'
import {auditAccuMarkCadInterchangeReceiving20261024 as audit} from './accumarkCadInterchangeReceivingQA20261024.mjs'

const fixture=readFileSync('research/oss/pattern-cad/runtime/verified-exports/seamly-48-52-cad-receiver-evaluation-NOT-APPROVED.zip')
const entries=()=>unzipSync(fixture)
const manifest=f=>JSON.parse(strFromU8(f['manifest.json']))
const replaceManifest=(f,m)=>{f['manifest.json']=strToU8(JSON.stringify(m));return zipSync(f)}

test('independent source ZIP checks actual five-piece graded 48 and 52 inventory',async()=>{
  const a=await audit(fixture)
  assert.equal(a.ok,true,JSON.stringify(a.issues))
  assert.equal(a.sourcePreserved,true)
  assert.equal(a.receivingCadVerified,false)
  assert.deepEqual(a.sizes.map(s=>[s.sizeCm,s.cutPieces]),[[48,5],[52,5]])
  assert.equal(a.manufacturingApproved,false)
})
test('caller-supplied equivalent receiver DXFs match geometry without independent CAD verification',async()=>{
  const f=entries()
  const r=await audit(fixture,{receiverDxfs:{48:strFromU8(f['graded-aama/seamly-size-48.dxf']),52:strFromU8(f['graded-aama/seamly-size-52.dxf'])}})
  assert.equal(r.ok,true,JSON.stringify(r.issues))
  assert.equal(r.receiverGeometryCompared,true)
  assert.equal(r.receivingCadVerified,false)
  assert.equal(r.manufacturingApproved,false)
})
test('rejects tampered wire content regardless of original manifest hash',async()=>{
  const f=entries();f['graded-aama/seamly-size-48.dxf'][200]^=1
  const r=await audit(zipSync(f))
  assert.equal(r.ok,false);assert.equal(r.bytesVerified,false)
  assert.ok(r.issues.some(i=>i.code==='BYTE_HASH_MISMATCH'))
})
test('fails closed if claimed cm differs from actual mm packet',async()=>{
  const f=entries(),m=manifest(f);m.sourceUnit='cm'
  const r=await audit(replaceManifest(f,m))
  assert.equal(r.ok,false)
  assert.ok(r.issues.some(i=>i.code==='CALIBRATION'))
})
test('rejects malformed and truncated ZIP',async()=>{
  const r=await audit(fixture.subarray(0,fixture.length-12))
  assert.equal(r.ok,false)
  assert.ok(r.issues.some(i=>i.code==='ZIP_DIRECTORY'))
})
test('rejects ZIP traversal even if accompanying manifest is valid',async()=>{
  const f=entries();f['../escape.dxf']=strToU8('payload')
  const r=await audit(zipSync(f))
  assert.equal(r.ok,false);assert.ok(r.issues.some(i=>i.code==='ZIP_PATH'))
})
test('duplicate size rows cannot represent two legitimate grades',async()=>{
  const f=entries(),m=manifest(f);m.sizes[1].sizeCm=m.sizes[0].sizeCm
  const r=await audit(replaceManifest(f,m))
  assert.equal(r.ok,false);assert.ok(r.issues.some(i=>i.code==='SIZE_PROVENANCE'))
})
test('receiving geometry loss detected even when source packet remains intact',async()=>{
  const f=entries(),a=strFromU8(f['graded-aama/seamly-size-48.dxf'])
  const changed=a.replace(/\n\s*10\s*\n\s*(-?\d+\.\d+)/,(_whole,n)=>'\n 10\n'+String(Number(n)+5))
  assert.notEqual(changed,a)
  const r=await audit(fixture,{receiverDxfs:{48:changed,52:strFromU8(f['graded-aama/seamly-size-52.dxf'])}})
  assert.equal(r.ok,false)
  assert.ok(r.issues.some(i=>['GEOMETRY_LOSS','DXF_PARSE_OR_COMPARE'].includes(i.code)))
})
test('receiver missing a size fails without misrepresenting approval',async()=>{
  const f=entries()
  const r=await audit(fixture,{receiverDxfs:{48:strFromU8(f['graded-aama/seamly-size-48.dxf'])}})
  assert.equal(r.ok,false)
  assert.equal(r.manufacturingApproved,false)
  assert.ok(r.issues.some(i=>i.code==='RECEIVER_MISSING'))
})
test('in-memory malicious manifest accessor never executes',async()=>{
  const f=entries(),m=manifest(f)
  let called=0
  Object.defineProperty(m,'sourceUnit',{enumerable:true,get(){called++;throw Error('getter executed')}})
  const r=await audit({manifest:m,files:f})
  assert.equal(called,0)
  assert.equal(r.ok,false)
  assert.ok(r.issues.some(i=>i.code==='MANIFEST'))
})
test('rejects duplicate central-directory ZIP names before extraction',async()=>{
  const zipped=zipSync({'a.txt':strToU8('one'),'b.txt':strToU8('two')})
  const bytes=new Uint8Array(zipped)
  const needle=strToU8('b.txt')
  let matched=0
  for(let i=0;i+needle.length<=bytes.length;i++){
    if(needle.every((value,k)=>bytes[i+k]===value) && i>=46 && bytes[i-46]===0x50 && bytes[i-45]===0x4b && bytes[i-44]===1 && bytes[i-43]===2){
      bytes.set(strToU8('a.txt'),i);matched++
    }
  }
  assert.equal(matched,1)
  const r=await audit(bytes)
  assert.equal(r.ok,false)
  assert.ok(r.issues.some(i=>i.code==='ZIP_PATH'))
})
test('rejects forged source evaluation worksheet claims instead of treating them as real receiving evidence',async()=>{
  const files=entries()
  const worksheet=JSON.parse(strFromU8(files['qa/receiver-acceptance-worksheet.json']))
  worksheet.originalSizeDxfsImportedSuccessfully=true
  worksheet.samplePatternMakerApproved=true
  worksheet.fitAndConstructionSampleApproved=true
  files['qa/receiver-acceptance-worksheet.json']=strToU8(JSON.stringify(worksheet))
  const result=await audit(zipSync(files))
  assert.equal(result.ok,false)
  assert(result.issues.some(x=>x.code==='APPROVAL'))
})
test('rejects extraneous receiver size data, even when the expected sizes match',async()=>{
  const files=entries()
  const wires={48:strFromU8(files['graded-aama/seamly-size-48.dxf']),
    52:strFromU8(files['graded-aama/seamly-size-52.dxf']),
    49:strFromU8(files['graded-aama/seamly-size-48.dxf'])}
  const result=await audit(fixture,{receiverDxfs:wires})
  assert.equal(result.ok,false)
  assert(result.issues.some(x=>x.code==='RECEIVER_INPUT'))
})
