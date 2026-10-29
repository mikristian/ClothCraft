import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {auditFactoryPackageManifestBrowser20261024_0053 as audit} from './factoryPackageManifestBrowser20261024_0053.mjs'

const enc=new TextEncoder()
const serial=value=>enc.encode(JSON.stringify(value))
const source={id:'tee-1',name:'Foundation Tee',revision:3,units:'cm',
  grading:{baseSize:'M',sizes:['XS','S','M','L','XL','XXL']},pieces:[{id:'front',points:[{x:0,y:0},{x:10,y:0},{x:10,y:20}]}]}

function rehash(files){
  const paths=Object.keys(files).filter(path=>path!=='manifest.json')
  files['manifest.json']=serial({format:'garment-studio-factory-package',version:2,
    project:{id:source.id,name:source.name,revision:source.revision,units:source.units},
    grading:source.grading,files:[...paths,'manifest.json'].sort(),
    sha256:Object.fromEntries(paths.map(path=>[path,createHash('sha256').update(files[path]).digest('hex')]))})
}

function build(){
  const files=Object.create(null)
  files['garment-source.json']=serial(source)
  files['size-run.json']=serial(Object.fromEntries(source.grading.sizes.map(size=>[size,{id:source.id,name:source.name}])))
  files['manufacturing-release-readiness.json']=serial({factoryCertified:false,factoryCuttingAuthorized:false,bulkProductionAuthorized:false})
  for(const size of source.grading.sizes)files[`patterns/foundation-tee-${size.toLowerCase()}.dxf`]=enc.encode(`0\nSECTION\n999\n${size}\n0\nEOF`)
  rehash(files)
  return files
}
const codes=(files,expected)=>audit(files,expected).diagnostics.map(item=>item.code)

test('accepts six-size graded inventory with pure SHA-256 and trusted full source, without mutation',()=>{
  const files=build()
  const before=Object.fromEntries(Object.entries(files).map(([path,bytes])=>[path,bytes.slice()]))
  assert.deepEqual(audit(files,source),{ok:true,diagnostics:[],manufacturingApproved:false})
  for(const path of Object.keys(files))assert.deepEqual(files[path],before[path])
})

test('self-consistent rehashed geometry requires independently trusted authored project to reject',()=>{
  const files=build()
  const changed=structuredClone(source)
  changed.pieces[0].points[1].x+=5
  files['garment-source.json']=serial(changed)
  rehash(files)
  assert.equal(audit(files).ok,true)
  assert(codes(files,source).includes('EXPECTED_PROJECT'))
})

test('rejects case-insensitive grading size collisions despite fully rehashed matching archive inventory',()=>{
  const files=build()
  const colliding={...source,grading:{baseSize:'S',sizes:['S','s']}}
  files['garment-source.json']=serial(colliding)
  files['size-run.json']=serial({S:{id:source.id,name:source.name},s:{id:source.id,name:source.name}})
  for(const path of Object.keys(files))if(path.startsWith('patterns/'))delete files[path]
  files['patterns/foundation-tee-s.dxf']=enc.encode('0\nSECTION\n999\nS\n0\nEOF')
  rehash(files)
  const manifest=JSON.parse(new TextDecoder().decode(files['manifest.json']))
  manifest.grading=colliding.grading
  files['manifest.json']=serial(manifest)
  const result=audit(files,colliding)
  assert.equal(result.ok,false)
  assert(result.diagnostics.some(d=>d.code==='GRADING_METADATA'))
  assert.equal(result.manufacturingApproved,false)
})

test('rejects traversal, invalid UTF-8, case collision, invalid SHA-256, and missing graded DXF',()=>{
  const traversal=build()
  traversal['../escape.txt']=enc.encode('x')
  assert(codes(traversal).includes('UNSAFE_PATH'))
  const invalid=build()
  invalid['manifest.json']=Uint8Array.from([0xff,0xfe])
  assert(codes(invalid).includes('INVALID_JSON'))
  invalid['manifest.json']=enc.encode('{bad')
  assert(codes(invalid).includes('INVALID_JSON'))
  const collision=build()
  collision['PATTERNS/foundation-tee-xs.dxf']=enc.encode('x')
  assert(codes(collision).includes('DUPLICATE_PATH'))
  const corrupted=build()
  corrupted['garment-source.json']=serial({...source,name:'Changed Tee'})
  assert(codes(corrupted).includes('HASH_MISMATCH'))
  const missing=build()
  delete missing['patterns/foundation-tee-xxl.dxf']
  rehash(missing)
  assert(codes(missing).includes('MISSING_GRADED_DXF'))
})

test('rejects unsafe accessors and authorized manufacturing flags',()=>{
  const files=build()
  Object.defineProperty(files,'accessor.txt',{enumerable:true,get(){throw new Error('Should not invoke getter')}})
  assert(codes(files).includes('FILE_BYTES'))
  const expected=structuredClone(source)
  Object.defineProperty(expected,'pieces',{get(){throw new Error('Should not invoke getter')}})
  assert(codes(build(),expected).includes('EXPECTED_PROJECT'))
  const flagged=build()
  flagged['manufacturing-release-readiness.json']=serial({manufacturingApproved:true})
  rehash(flagged)
  assert(codes(flagged).includes('APPROVAL_FLAG'))
})

test('auditor and SHA-256 transitive imports avoid Node builtins',()=>{
  for(const path of ['factoryPackageManifestBrowser20261024_0053.mjs','sha256Bytes.js']){
    const module=readFileSync(new URL(path,import.meta.url),'utf8')
    assert.doesNotMatch(module,/\b(?:from\s*['"]node:|import\s*\(\s*['"]node:|require\s*\(\s*['"](?:node:)?(?:crypto|fs|util|process))/)
  }
})
