import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {auditFactoryPackageManifest20261024_0000 as audit} from './factoryPackageManifestAudit20261024_0000.mjs'
import {sha256Bytes} from './sha256Bytes.js'

const enc = new TextEncoder()
const dec = new TextDecoder()
const project = {
  id: 'security-tee', name: 'Security Tee', revision: 2, units: 'cm',
  grading: {baseSize: 'M', sizes: ['S', 'M']},
  pieces: [{id: 'front', points: [{x: 0, y: 0}, {x: 12, y: 0}, {x: 12, y: 20}]}],
}
const bytes = object => enc.encode(JSON.stringify(object))
const decode = buffer => JSON.parse(dec.decode(buffer))
const hash = buffer => createHash('sha256').update(buffer).digest('hex')
const make = () => {
  const files = Object.create(null)
  files['garment-source.json'] = bytes(project)
  files['size-run.json'] = bytes({S:{id:project.id,name:project.name},M:{id:project.id,name:project.name}})
  files['manufacturing-release-readiness.json'] = bytes({manufacturingApproved:false,factoryCertified:false})
  files['patterns/security-tee-s.dxf'] = enc.encode('0\nSECTION\n0\nENDSEC\n0\nEOF')
  files['patterns/security-tee-m.dxf'] = enc.encode('0\nSECTION\n0\nENDSEC\n0\nEOF')
  resign(files)
  return files
}
function resign(files, manifestOverrides = {}) {
  const paths = Object.keys(files).filter(path => path !== 'manifest.json')
  files['manifest.json'] = bytes({
    format: 'garment-studio-factory-package',version:2,
    project:{id:project.id,name:project.name,revision:project.revision,units:project.units},
    grading:project.grading,files:[...paths,'manifest.json'].sort(),
    sha256:Object.fromEntries(paths.map(path => [path,hash(files[path])])),
    ...manifestOverrides,
  })
}
const codes = result => result.diagnostics.map(({code}) => code)

test('positive control: browser SHA-256 matches Node and fully bound manifest stays development-only', () => {
  const files = make()
  for (const [path, content] of Object.entries(files)) {
    if (path !== 'manifest.json') assert.equal(sha256Bytes(content), hash(content), path)
  }
  assert.deepEqual(audit(files,project),{ok:true,diagnostics:[],manufacturingApproved:false})
})

test('rehashed authored geometry is accepted only as self-consistent package, rejected when trusted source supplied', () => {
  const files = make()
  const changed = decode(files['garment-source.json'])
  changed.pieces[0].points[1].x += 1
  files['garment-source.json'] = bytes(changed)
  resign(files)
  assert.equal(audit(files).ok,true)
  assert(codes(audit(files,project)).includes('EXPECTED_PROJECT'))
})

test('archive accessor is refused without executing getter', () => {
  const files = make()
  let invoked = 0
  Object.defineProperty(files,'extra.bin',{enumerable:true,get(){invoked++;throw Error('side effect')}})
  const result = audit(files,project)
  assert.equal(result.ok,false)
  assert(codes(result).includes('FILE_BYTES'))
  assert.equal(invoked,0)
})

test('missing and extra paths fail inventory checks even when payload lengths collide', () => {
  const missing = make()
  delete missing['patterns/security-tee-s.dxf']
  assert(codes(audit(missing,project)).includes('INVENTORY'))
  const extra = make()
  extra['additional.dat'] = new Uint8Array(extra['patterns/security-tee-s.dxf'].byteLength)
  assert(codes(audit(extra,project)).includes('INVENTORY'))
})

test('size-case collision in authored grades is refused after fully rehashing archive', () => {
  const files = make()
  const source = decode(files['garment-source.json'])
  source.grading.sizes = ['S','s']
  files['garment-source.json'] = bytes(source)
  files['size-run.json'] = bytes({S:{id:project.id,name:project.name},s:{id:project.id,name:project.name}})
  resign(files,{grading:source.grading})
  const result = audit(files)
  assert.equal(result.ok,false,'two grade sizes must never map to the same normalized DXF filename')
})

test('self-declared readiness never gives manufacturing approval and true flags are refused', () => {
  const files = make()
  assert.equal(audit(files).manufacturingApproved,false)
  files['manufacturing-release-readiness.json'] = bytes({manufacturingApproved:true,factoryCertified:true,factoryCuttingAuthorized:true,bulkProductionAuthorized:true})
  resign(files)
  const result = audit(files,project)
  assert.equal(result.ok,false)
  assert.equal(codes(result).filter(code => code === 'APPROVAL_FLAG').length,4)
  assert.equal(result.manufacturingApproved,false)
})

test('malformed claimed checksum and forbidden shadow metadata keys are rejected', () => {
  const files = make()
  const manifest = decode(files['manifest.json'])
  manifest.sha256['garment-source.json'] = '0'.repeat(64)
  files['manifest.json'] = bytes(manifest)
  assert(codes(audit(files,project)).includes('HASH_MISMATCH'))
  const shadow = make()
  Object.defineProperty(shadow,'__proto__',{enumerable:true,value:enc.encode('payload')})
  assert(codes(audit(shadow,project)).includes('UNSAFE_PATH'))
})
