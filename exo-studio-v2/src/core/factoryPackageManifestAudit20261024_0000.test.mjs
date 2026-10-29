import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {auditFactoryPackageManifest20261024_0000 as audit} from './factoryPackageManifestAudit20261024_0000.mjs'

const enc=new TextEncoder()
const serial=value=>enc.encode(JSON.stringify(value))
const source={id:'tee-1',name:'Foundation Tee',revision:3,units:'cm',grading:{baseSize:'M',sizes:['XS','S','M','L','XL','XXL']}}
const build=()=>{
  const files=Object.create(null)
  files['garment-source.json']=serial(source)
  files['size-run.json']=serial(Object.fromEntries(source.grading.sizes.map(size=>[size,{id:source.id,name:source.name}])))
  files['manufacturing-release-readiness.json']=serial({factoryCertified:false,factoryCuttingAuthorized:false,bulkProductionAuthorized:false})
  for(const size of source.grading.sizes)files[`patterns/foundation-tee-${size.toLowerCase()}.dxf`]=enc.encode(`0\nSECTION\n2\nENTITIES\n999\n${size}\n0\nENDSEC\n0\nEOF`)
  resign(files)
  return files
}
function resign(files){
  const entries=Object.keys(files).filter(path=>path!=='manifest.json')
  files['manifest.json']=serial({format:'garment-studio-factory-package',version:2,
    project:{id:source.id,name:source.name,revision:source.revision,units:source.units},
    grading:source.grading,files:[...entries,'manifest.json'].sort(),
    sha256:Object.fromEntries(entries.map(path=>[path,createHash('sha256').update(files[path]).digest('hex')]))})
}
const codes=files=>audit(files).diagnostics.map(d=>d.code)

test('accepts six-size Foundation Tee inventory, hashes, source metadata, and expected project without mutating bytes',()=>{
  const files=build()
  const old=files['manifest.json'].slice()
  assert.deepEqual(audit(files,source),{ok:true,diagnostics:[],manufacturingApproved:false})
  assert.deepEqual(files['manifest.json'],old)
})

test('rejects malformed JSON and invalid UTF-8 manifest',()=>{
  const files=build()
  files['manifest.json']=enc.encode('{bad')
  assert(codes(files).includes('INVALID_JSON'))
  files['manifest.json']=Uint8Array.from([0xff,0xfe])
  assert(codes(files).includes('INVALID_JSON'))
})

test('rejects traversal, absolute, unsafe names, directory keys, case collisions and byte limits',()=>{
  for(const path of ['../escape.txt','/absolute','foo\\bar','__proto__/x','dir/','x/./y','C:/drive']){
    const files=build()
    Object.defineProperty(files,path,{value:enc.encode('x'),enumerable:true})
    assert(codes(files).includes('UNSAFE_PATH'),path)
  }
  const collision=build()
  collision['PATTERNS/foundation-tee-xs.dxf']=enc.encode('x')
  assert(codes(collision).includes('DUPLICATE_PATH'))
  const oversized=build()
  oversized['oversized.bin']=new Uint8Array(8*1024*1024+1)
  assert(codes(oversized).includes('FILE_BYTES'))
})

test('rejects bad SHA-256 bytes, phantom SHA keys, and altered or unsorted inventory',()=>{
  const files=build()
  files['garment-source.json']=serial({...source,name:'Foundation TEE'})
  assert(codes(files).includes('HASH_MISMATCH'))
  const forged=build()
  const manifest=JSON.parse(new TextDecoder().decode(forged['manifest.json']))
  manifest.sha256['unexpected.json']='0'.repeat(64)
  forged['manifest.json']=serial(manifest)
  assert(codes(forged).includes('HASH_MAP'))
  manifest.files.reverse()
  forged['manifest.json']=serial(manifest)
  assert(codes(forged).includes('INVENTORY'))
})

test('rejects removed graded DXF, size-run mismatch, external expected-project mismatch and true approval flags',()=>{
  const missing=build()
  delete missing['patterns/foundation-tee-xxl.dxf']
  resign(missing)
  assert(codes(missing).includes('MISSING_GRADED_DXF'))
  const mismatched=build()
  mismatched['size-run.json']=serial({XS:{id:source.id,name:source.name}})
  resign(mismatched)
  assert(codes(mismatched).includes('SIZE_RUN'))
  assert(audit(build(),{...source,id:'other'}).diagnostics.some(d=>d.code==='EXPECTED_PROJECT'))
  const approved=build()
  approved['manufacturing-release-readiness.json']=serial({factoryCertified:true,factoryCuttingAuthorized:true,bulkProductionAuthorized:true})
  resign(approved)
  assert.equal(codes(approved).filter(code=>code==='APPROVAL_FLAG').length,3)
})

test('rejects accessor bytes, invalid release JSON and conflicting per-size revision',()=>{
  const getter=build()
  Object.defineProperty(getter,'README.txt',{enumerable:true,get(){throw Error('must not execute')}})
  assert(codes(getter).includes('FILE_BYTES'))
  const readiness=build()
  readiness['manufacturing-release-readiness.json']=enc.encode('{invalid')
  resign(readiness)
  assert(codes(readiness).includes('INVALID_JSON'))
  const mismatch=build()
  const run=JSON.parse(new TextDecoder().decode(mismatch['size-run.json']))
  run.M.revision=999
  mismatch['size-run.json']=serial(run)
  resign(mismatch)
  assert(codes(mismatch).includes('SIZE_RUN'))
})

test('rejects rehashed authored geometry changed without changing project identity',()=>{
  const original={...source,pieces:[{id:'front',points:[{x:0,y:0},{x:10,y:0},{x:10,y:20}]}]}
  const files=build()
  files['garment-source.json']=serial(original)
  resign(files)
  assert.equal(audit(files,original).ok,true)
  const changed=structuredClone(original)
  changed.pieces[0].points[1].x+=2
  files['garment-source.json']=serial(changed)
  resign(files)
  assert.equal(audit(files).ok,true,'self-consistent hashes alone only establish package integrity')
  const bound=audit(files,original)
  assert.equal(bound.ok,false)
  assert(bound.diagnostics.some(d=>d.code==='EXPECTED_PROJECT'))
  assert.equal(bound.manufacturingApproved,false)
})
