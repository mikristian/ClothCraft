import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {buildFactoryPackageFiles} from './factoryPackage.js'
import {sha256Bytes} from './sha256Bytes.js'
import {auditFactoryPackageManifestBrowser20261024_0053} from './factoryPackageManifestBrowser20261024_0053.mjs'
import {auditFactoryZipSemanticInventory20261024_0853 as audit} from './factoryZipSemanticInventory20261024_0853.mjs'

const enc=new TextEncoder()
const dec=new TextDecoder()
const cloneFiles=files=>Object.fromEntries(Object.entries(files).map(([key,value])=>[key,value.slice()]))
function rehash(files){
  const manifest=JSON.parse(dec.decode(files['manifest.json']))
  const paths=Object.keys(files).filter(path=>path!=='manifest.json')
  manifest.files=[...paths,'manifest.json'].sort()
  manifest.sha256=Object.fromEntries(paths.map(path=>[path,sha256Bytes(files[path])]))
  files['manifest.json']=enc.encode(JSON.stringify(manifest))
}
let fixture
function genuine(){
  if(!fixture)fixture=buildFactoryPackageFiles(createTeeTemplate())
  return cloneFiles(fixture)
}
const codes=result=>result.diagnostics.map(d=>d.code)

test('genuine six-size Foundation Tee inventory passes without bytes or approval changed',()=>{
  const files=genuine(),before=cloneFiles(files)
  const project=JSON.parse(dec.decode(files['garment-source.json']))
  const projectBefore=structuredClone(project)
  const result=audit(files,project)
  assert.deepEqual(result,{ok:true,diagnostics:[],manufacturingApproved:false})
  assert.deepEqual(files,before)
  assert.deepEqual(project,projectBefore)
})

test('fully rehashed missing fixed manufacturing evidence is refused, despite matching manifest SHA',()=>{
  for(const path of ['manufacturing-release-readiness.json','industrial-pattern-qa.json',
    'factory-sample-approval-gate.json','recipient-cad-acceptance-plan.json','marker-plot-geometry-qa.json',
    'industrial-notch-walk.csv']){
    const files=genuine()
    delete files[path]
    rehash(files)
    assert.equal(auditFactoryPackageManifestBrowser20261024_0053(files).ok,true,path)
    const result=audit(files)
    assert.equal(result.ok,false,path)
    assert(codes(result).includes('MISSING_MANDATORY_ARTIFACT'),path)
    assert.equal(result.manufacturingApproved,false)
  }
})

test('modified size QA inventory and surplus size DXF cannot pass after correct rehash',()=>{
  const files=genuine()
  const report=JSON.parse(dec.decode(files['marker-dxf-geometry-qa.json']))
  report.sizes=report.sizes.slice(1)
  files['marker-dxf-geometry-qa.json']=enc.encode(JSON.stringify(report))
  rehash(files)
  assert.equal(auditFactoryPackageManifestBrowser20261024_0053(files).ok,true)
  assert(codes(audit(files)).includes('MISSING_SIZE_QA'))
  const extra=genuine()
  const existing=Object.keys(extra).find(path=>path.startsWith('patterns/')&&path.endsWith('.dxf'))
  assert(existing)
  extra['patterns/not-an-authored-size.dxf']=extra[existing].slice()
  rehash(extra)
  assert(codes(audit(extra)).includes('UNEXPECTED_SIZE_DXF'))
})

test('accessor archive keys are rejected without invoking getters',()=>{
  const files=genuine()
  let accessed=0
  Object.defineProperty(files,'industrial-pattern-qa.json',{enumerable:true,get(){accessed++;throw Error('trap')}})
  const result=audit(files)
  assert.equal(result.ok,false)
  assert.equal(accessed,0)
  assert.equal(result.manufacturingApproved,false)
})
