import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {buildFactoryPackageFiles} from './factoryPackage.js'
import {sha256Bytes} from './sha256Bytes.js'
import {auditFactoryPackageManifestBrowser20261024_0053 as auditLegacy} from './factoryPackageManifestBrowser20261024_0053.mjs'
import {auditFactoryZipConditionalInventory20261024_1000 as auditConditional} from './factoryZipConditionalInventory20261024_1000.mjs'

const enc=new TextEncoder()
const dec=new TextDecoder()
const codes=result=>result.diagnostics.map(row=>row.code)
let cached
function control(){
  if(!cached){
    const project=createTeeTemplate()
    const files=buildFactoryPackageFiles(project)
    assert.equal(auditConditional(files,project).ok,true,'genuine factory output should pass')
    cached={project,files}
  }
  return cached
}
function resign(files){
  const manifest=JSON.parse(dec.decode(files['manifest.json']))
  const paths=Object.keys(files).filter(path=>path!=='manifest.json')
  manifest.files=[...paths,'manifest.json'].sort()
  manifest.sha256=Object.fromEntries(paths.map(path=>[path,sha256Bytes(files[path])]))
  files['manifest.json']=enc.encode(JSON.stringify(manifest))
}
function mutate(change){
  const {project,files:source}=control()
  const files={...source}
  change(files,project)
  resign(files)
  assert.equal(auditLegacy(files,project).ok,true,'tampering must be fully rehashed')
  const result=auditConditional(files,project)
  assert.equal(result.manufacturingApproved,false)
  return result
}
function firstMatching(files,predicate){
  const path=Object.keys(files).find(predicate)
  assert.ok(path,'fixture lacks requested conditional path')
  return path
}

test('genuine six-size package with conditional tee proposals passes without manufacturing approval',()=>{
  const {project,files}=control()
  assert.equal(project.grading.sizes.length,6)
  assert.ok(Object.keys(files).some(p=>p.startsWith('tee-development/')&&p.endsWith('.dxf')))
  assert.equal(auditConditional(files,project).manufacturingApproved,false)
})

for(const [label,predicate] of [
  ['marker SVG',p=>p.startsWith('markers/')&&p.endsWith('.svg')],
  ['marker PDF',p=>p.startsWith('markers/')&&p.endsWith('.pdf')],
  ['grading-rule CSV',p=>p.startsWith('grading-rules/')&&p.endsWith('.csv')],
  ['neckband proposal DXF',p=>p.startsWith('tee-development/')&&p.endsWith('.dxf')],
]){
  test('fully rehashed removal of '+label+' is rejected',()=>{
    let removed
    const result=mutate(files=>{removed=firstMatching(files,predicate);delete files[removed]})
    assert.equal(result.ok,false,removed)
    assert.ok(codes(result).includes('MISSING_CONDITIONAL_ARTIFACT'),JSON.stringify(result.diagnostics))
  })
}

test('fully rehashed orphan conditional file is rejected',()=>{
  const result=mutate(files=>{files['markers/orphan-extra.svg']=enc.encode('<svg/>')})
  assert.equal(result.ok,false)
  assert.ok(codes(result).includes('UNEXPECTED_CONDITIONAL_ARTIFACT'),JSON.stringify(result.diagnostics))
})

test('fully rehashed forged plot QA row claiming unowned fabric is rejected',()=>{
  const result=mutate(files=>{
    const plot=JSON.parse(dec.decode(files['marker-plot-geometry-qa.json']))
    plot.rows.push({...plot.rows[0],fabricId:'unowned-fabric'})
    files['marker-plot-geometry-qa.json']=enc.encode(JSON.stringify(plot))
  })
  assert.equal(result.ok,false)
  assert.ok(codes(result).some(code=>['MISSING_CONDITIONAL_ARTIFACT','MISMATCHED_FABRIC_COVERAGE','INVALID_CONDITIONAL_PLOT_QA'].includes(code)),JSON.stringify(result.diagnostics))
})

test('fully rehashed duplicate plot QA row is rejected',()=>{
  const result=mutate(files=>{
    const plot=JSON.parse(dec.decode(files['marker-plot-geometry-qa.json']))
    plot.rows.push({...plot.rows[0]})
    files['marker-plot-geometry-qa.json']=enc.encode(JSON.stringify(plot))
  })
  assert.equal(result.ok,false)
  assert.ok(codes(result).includes('DUPLICATE_CONDITIONAL_PLOT_QA'),JSON.stringify(result.diagnostics))
})

test('forged zero placement count cannot excuse removal of a real marker PDF',()=>{
  const result=mutate(files=>{
    const plot=JSON.parse(dec.decode(files['marker-plot-geometry-qa.json']))
    const row=plot.rows.find(row=>row.checkedPlacements>0)
    assert.ok(row,'requires a populated marker')
    const source=JSON.parse(dec.decode(files['garment-source.json']))
    const slug=value=>String(value||'garment').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'garment'
    const path=`markers/${slug(source.name)}-${slug(row.fabricId)}-${slug(row.size)}.pdf`
    assert.ok(files[path],path)
    row.checkedPlacements=0
    delete files[path]
    files['marker-plot-geometry-qa.json']=enc.encode(JSON.stringify(plot))
  })
  assert.equal(result.ok,false,'PDF inventory must be independently established from authored markers, even if QA row is forged')
})

test('deleting one authored fabric from all plot QA rows and corresponding markers is rejected',()=>{
  const project=createTeeTemplate()
  project.fabrics.contrast={...project.fabrics.main,id:'contrast',name:'Contrast Jersey'}
  project.pieces.at(-1).fabricId='contrast'
  const sourceFiles=buildFactoryPackageFiles(project)
  assert.equal(auditConditional(sourceFiles,project).ok,true)
  const files={...sourceFiles}
  {
    const plot=JSON.parse(dec.decode(files['marker-plot-geometry-qa.json']))
    const fabric=plot.rows[0].fabricId
    assert.ok(plot.rows.some(row=>row.fabricId!==fabric))
    const source=JSON.parse(dec.decode(files['garment-source.json']))
    const slug=value=>String(value||'garment').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'garment'
    const prefix=`markers/${slug(source.name)}-${slug(fabric)}-`
    for(const path of Object.keys(files)){
      if(path.startsWith(prefix)||path.startsWith(`print-calibration/${slug(source.name)}-${slug(fabric)}-`))delete files[path]
    }
    plot.rows=plot.rows.filter(row=>row.fabricId!==fabric)
    files['marker-plot-geometry-qa.json']=enc.encode(JSON.stringify(plot))
  }
  resign(files)
  assert.equal(auditLegacy(files,project).ok,true)
  const result=auditConditional(files,project)
  assert.equal(result.ok,false,'authored fabric cannot disappear from all marker QA and marker files')
})

test('tampering leaves genuine fixture and original conditional inventory valid',()=>{
  const {project,files}=control()
  assert.equal(auditConditional(files,project).ok,true)
})
