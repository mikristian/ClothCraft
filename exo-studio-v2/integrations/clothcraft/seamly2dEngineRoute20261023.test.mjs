import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {evaluateSeamly2DRequest20261023 as evaluate} from './seamly2dEngineRoute20261023.mjs'
import {SEAMLY2D_RUNTIME_20261023} from './seamly2dNativeEngine20261023.mjs'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const dir=path.join(root,'research/oss/pattern-cad/Seamly2D/src/app/share/samples')
const original=fs.readFileSync(path.join(dir,'patterns/male_shirt.sm2d'),'utf8')
const measurements=fs.readFileSync(path.join(dir,'measurements/individual/male_shirt.smis'),'utf8')
const jacket=fs.readFileSync(path.join(dir,'patterns/jacket1_52-176.sm2d'),'utf8')
const grades=fs.readFileSync(path.join(dir,'measurements/multisize/gost_man_ru.smms'),'utf8')
const actual=fs.existsSync(SEAMLY2D_RUNTIME_20261023)

test('invalid requests are refused before calculation',()=>{
  assert.equal(evaluate(null).code,'INVALID_REQUEST')
  assert.equal(evaluate({patternXml:original,measurementsXml:measurements,format:'svg',factoryApproved:true}).code,'INVALID_REQUEST')
  assert.equal(evaluate({patternXml:original,measurementsXml:measurements,format:'dxf'}).code,'INVALID_FORMAT')
  assert.equal(evaluate({patternXml:original,measurementsXml:measurements,format:'aama-r10'}).code,'SOURCE_UNIT_REQUIRED')
  assert.equal(evaluate({patternXml:original,measurementsXml:measurements,format:'aama-r10',sourceUnit:'mm',sizesCm:[48,52]}).code,'GRADATION_REQUIRES_SMMS')
  assert.equal(evaluate({patternXml:original,measurementsXml:measurements,format:'svg',sizesCm:[46,48,50,52,54,56,58]}).code,'INVALID_SIZE_RUN')
})

test('local HTTP route engine returns original CAD drawing bytes, no approval', {skip:!actual},()=>{
  const snapshot=fs.readFileSync(path.join(dir,'patterns/male_shirt.sm2d'))
  const result=evaluate({patternXml:original,measurementsXml:measurements,format:'aama-r10',sourceUnit:'mm'})
  assert.equal(result.ok,true,result.reason)
  assert.equal(result.manufacturingApproved,false)
  assert.equal(result.artifacts.length,1)
  assert.match(result.artifacts[0].content,/SECTION\s*\n\s*2\s*\nENTITIES/)
  assert.match(result.artifacts[0].name,/\.dxf$/)
  assert.equal(result.artifacts[0].sha256.length,64)
  assert.equal(result.artifacts[0].localInspection.sourceCutPieces,17)
  assert.equal(result.artifacts[0].localInspection.externalReceivingCadApproved,false)
  assert.deepEqual(fs.readFileSync(path.join(dir,'patterns/male_shirt.sm2d')),snapshot)
})

test('size-run route exposes independent upstream DXF geometry', {skip:!actual},()=>{
  const result=evaluate({patternXml:jacket,measurementsXml:grades,format:'aama-r10',sourceUnit:'mm',sizesCm:[48,52],heightCm:176})
  assert.equal(result.ok,true,result.reason)
  assert.deepEqual(result.sizesCm,[48,52])
  assert.equal(result.artifacts.length,2)
  assert.notEqual(result.artifacts[0].sha256,result.artifacts[1].sha256)
  assert.equal(result.manufacturingApproved,false)
})
