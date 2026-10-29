import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {unzipSync,strFromU8} from 'fflate'
import {buildSeamlyCadExchangeBundle20261023 as build} from './seamlyCadExchangeBundle20261023.js'
const dxf=['  0','SECTION','  2','ENTITIES','  0','POLYLINE','  8','1','  0','SEQEND','  0','ENDSEC','  0','EOF',''].join('\n').repeat(20)
const hash = value=>createHash('sha256').update(value).digest('hex')
const source={ok:true,engine:'Seamly2D',format:'aama-r10',sizesCm:[48,52],manufacturingApproved:false,
  inputSha256:'a'.repeat(64),measurementsSha256:'b'.repeat(64),
  artifacts:[48,52].map(size=>({sizeCm:size,name:`seamly-${size}_pieces.dxf`,content:dxf,
    sha256:hash(dxf),sizeBytes:dxf.length,localInspection:{status:'LOCAL_INSPECTION_ONLY',sourceUnit:'mm',sourceCutPieces:1,externalReceivingCadApproved:false}}))}

test('graded CAD receiver ZIP has exact original AAMA bytes, unit calibration, unapproved worksheet',async()=>{
  const res=await build(source,{sourceUnit:'mm',sourceFileName:'jacket.sm2d'})
  assert.equal(res.ok,true)
  assert.equal(res.manufacturingApproved,false)
  assert.match(res.filename,/NOT-APPROVED/)
  const files=unzipSync(res.zip)
  const manifest=JSON.parse(strFromU8(files['manifest.json']))
  assert.deepEqual(manifest.sizes.map(x=>x.sizeCm),[48,52])
  for(const row of manifest.sizes) {
    const wire=strFromU8(files[row.filename])
    assert.equal(wire,dxf)
    assert.equal(hash(files[row.filename]),row.sha256)
  }
  assert.equal(manifest.manufacturingApproved,false)
  assert.equal(manifest.physicalSampleApproval,false)
  const worksheet=JSON.parse(strFromU8(files['qa/receiver-acceptance-worksheet.json']))
  assert.equal(worksheet.productionReleaseAuthorized,false)
  assert.equal(worksheet.fitAndConstructionSampleApproved,false)
  assert.equal(worksheet.originalSizeDxfsImportedSuccessfully,false)
  const calibration=strFromU8(files['qa/scale-100mm.dxf'])
  assert.match(calibration,/\n\s*11\n100\n/)
})

test('different confirmed units produce corresponding 100-mm receiver calibration bar',async()=>{
  const withUnit=sourceUnit=>({...source,artifacts:source.artifacts.map(a=>({...a,localInspection:{...a.localInspection,sourceUnit}}))})
  const cm=unzipSync((await build(withUnit('cm'),{sourceUnit:'cm'})).zip)
  const inch=unzipSync((await build(withUnit('inch'),{sourceUnit:'inch'})).zip)
  assert.match(strFromU8(cm['qa/scale-100mm.dxf']),/\n\s*11\n10\n/)
  assert.match(strFromU8(inch['qa/scale-100mm.dxf']),/\n\s*11\n3\.937007874\n/)
})

test('rejects absent user scale, invalid size set, non-original export and missing hashes',async()=>{
  await assert.rejects(build(source),/requires confirmed/)
  await assert.rejects(build({...source,sizesCm:[48]} ,{sourceUnit:'mm'}),/requires a real/)
  await assert.rejects(build({...source,manufacturingApproved:true},{sourceUnit:'mm'}),/requires a real/)
  await assert.rejects(build({...source,artifacts:[source.artifacts[0],source.artifacts[0]]},{sourceUnit:'mm'}),/duplicate/)
  await assert.rejects(build({...source,inputSha256:null},{sourceUnit:'mm'}),/missing original/)
  await assert.rejects(build({...source,artifacts:[{...source.artifacts[0],content:'bad'},source.artifacts[1]]},{sourceUnit:'mm'}),/invalid, unsupported/)
  await assert.rejects(build({...source,artifacts:[{...source.artifacts[0],content:dxf.replace('POLYLINE','LWPOLYLINE')},source.artifacts[1]]},{sourceUnit:'mm'}),/SHA-256/)
})
