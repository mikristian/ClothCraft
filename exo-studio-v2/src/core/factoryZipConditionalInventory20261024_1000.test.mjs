import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {createDefaultProject} from '../data/defaultProject.js'
import {INDUSTRIAL_GRADE_MODES} from './industrialGradeRules.js'
import {buildFactoryPackageFiles} from './factoryPackage.js'
import {sha256Bytes} from './sha256Bytes.js'
import {auditFactoryPackageManifestBrowser20261024_0053} from './factoryPackageManifestBrowser20261024_0053.mjs'
import {auditFactoryZipConditionalInventory20261024_1000 as audit} from './factoryZipConditionalInventory20261024_1000.mjs'

const enc=new TextEncoder(),dec=new TextDecoder()
let fixture
const genuine=()=>Object.fromEntries(Object.entries(fixture??=buildFactoryPackageFiles(createTeeTemplate())).map(([k,v])=>[k,v.slice()]))
function rehash(files){
  const manifest=JSON.parse(dec.decode(files['manifest.json']))
  const paths=Object.keys(files).filter(path=>path!=='manifest.json')
  manifest.files=[...paths,'manifest.json'].sort()
  manifest.sha256=Object.fromEntries(paths.map(path=>[path,sha256Bytes(files[path])]))
  files['manifest.json']=enc.encode(JSON.stringify(manifest))
}
const codes=result=>result.diagnostics.map(d=>d.code)
test('genuine six-size Foundation Tee passes unchanged without manufacturing approval',()=>{
  const files=genuine(),before=structuredClone(files)
  const source=JSON.parse(dec.decode(files['garment-source.json']))
  const result=audit(files,source)
  assert.deepEqual(result,{ok:true,diagnostics:[],manufacturingApproved:false})
  assert.deepEqual(files,before)
})
test('rehashing cannot hide deleted conditional grading, marker or calibration files',()=>{
  const original=genuine()
  for(const prefix of ['grading-rules/','industrial-grading/','markers/','print-calibration/']){
    const path=Object.keys(original).find(k=>k.startsWith(prefix))
    if(!path)continue
    const files=genuine()
    delete files[path]
    rehash(files)
    assert.equal(auditFactoryPackageManifestBrowser20261024_0053(files).ok,true,path)
    assert(codes(audit(files)).includes('MISSING_CONDITIONAL_ARTIFACT'),path)
  }
})
test('unexpected conditional path, duplicate QA rows, and invalid row types fail closed',()=>{
  const extra=genuine()
  extra['markers/unexpected.svg']=enc.encode('surplus')
  rehash(extra)
  assert(codes(audit(extra)).includes('UNEXPECTED_CONDITIONAL_ARTIFACT'))
  for(const alter of [
    rows=>rows.push({...rows[0]}),
    rows=>{rows[0].checkedPlacements='1'},
    rows=>{rows[0].calibrationMode='unknown'},
    rows=>{rows[0].fabricId='unexpected'}
  ]){
    const files=genuine()
    const qa=JSON.parse(dec.decode(files['marker-plot-geometry-qa.json']))
    alter(qa.rows)
    files['marker-plot-geometry-qa.json']=enc.encode(JSON.stringify(qa))
    rehash(files)
    assert.equal(audit(files).ok,false)
  }
})
test('accessor fields are not invoked',()=>{
  const files=genuine()
  let count=0
  Object.defineProperty(files,'garment-source.json',{enumerable:true,get(){count++;throw Error('trap')}})
  const result=audit(files)
  assert.equal(result.ok,false)
  assert.equal(result.manufacturingApproved,false)
  assert.equal(count,0)
})
test('forged zero placements and deleted marker PDF fail despite re-signed manifest',()=>{
  const files=genuine()
  const qa=JSON.parse(dec.decode(files['marker-plot-geometry-qa.json']))
  const row=qa.rows.find(row=>row.checkedPlacements>0)
  assert(row)
  row.checkedPlacements=0
  files['marker-plot-geometry-qa.json']=enc.encode(JSON.stringify(qa))
  const source=JSON.parse(dec.decode(files['garment-source.json']))
  const slug=s=>String(s||'garment').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'garment'
  delete files[`markers/${slug(source.name)}-${slug(row.fabricId)}-${slug(row.size)}.pdf`]
  rehash(files)
  assert.equal(auditFactoryPackageManifestBrowser20261024_0053(files).ok,true)
  const report=audit(files)
  assert.equal(report.ok,false)
  assert(codes(report).includes('MISMATCHED_MARKER_PLACEMENTS'))
  assert(codes(report).includes('MISSING_CONDITIONAL_ARTIFACT'))
})
test('industrial grading sidecar is required even if missing file is rehashed',()=>{
  const project=createDefaultProject()
  const sizes=['XS','S','M','L','XL','XXL']
  project.pieces[0].points[0].industrialGradeRule={
    mode:INDUSTRIAL_GRADE_MODES.SMALL_LARGE_INCREMENTAL,
    sizes,baseSize:'M',
    steps:[
      {dx:0.25,dy:-0.05},{dx:0.4,dy:-0.1},{dx:0.65,dy:0.15},
      {dx:0.9,dy:0.2},{dx:1.2,dy:0.35}
    ]
  }
  const files=buildFactoryPackageFiles(project)
  const path=Object.keys(files).find(p=>p.startsWith('industrial-grading/')&&p.endsWith('.json'))
  assert.ok(path,'expected industrial grading sidecar')
  assert.equal(Object.keys(files).some(p=>p.startsWith('grading-rules/001-')),false)
  assert.deepEqual(audit(files,project),{ok:true,diagnostics:[],manufacturingApproved:false})
  delete files[path]
  rehash(files)
  assert.equal(auditFactoryPackageManifestBrowser20261024_0053(files,project).ok,true)
  const result=audit(files,project)
  assert.equal(result.ok,false)
  assert(codes(result).includes('MISSING_CONDITIONAL_ARTIFACT'))
  assert.equal(result.manufacturingApproved,false)
})
