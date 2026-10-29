import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { evaluateSeamly2DSizeRun20261023, SEAMLY2D_RUNTIME_20261023 } from './seamly2dNativeEngine20261023.mjs'
import { auditSeamlyAamaReceivingRoundtrip20261023, inspectAamaR10Dxf20261023 } from './seamlyAamaReceivingRoundtrip20261023.mjs'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const upstream=path.join(root,'research/oss/pattern-cad/Seamly2D/src/app/share/samples')
const patternPath=path.join(upstream,'patterns/jacket1_52-176.sm2d')
const measurementsPath=path.join(upstream,'measurements/multisize/gost_man_ru.smms')
const fixture=(vertices,insunits='')=>['0','SECTION','2','HEADER','9','$ACADVER','1','AC1009',...(insunits?['9','$INSUNITS','70',insunits]:[]),'0','ENDSEC','0','SECTION','2','BLOCKS','0','ENDSEC','0','SECTION','2','ENTITIES','0','POLYLINE','8','CUT','70','1',...vertices.flatMap(([x,y])=>['0','VERTEX','10',String(x),'20',String(y),'30','0']),'0','SEQEND','0','ENDSEC','0','EOF',''].join('\n')

test('independent reader requires explicit unit scale and rejects ambiguous geometry',()=>{
  const square=fixture([[0,0],[10,0],[10,10],[0,10]])
  assert.throws(()=>inspectAamaR10Dxf20261023(square),/unit declaration/)
  assert.throws(()=>inspectAamaR10Dxf20261023(square,{declaredUnit:'mm',mmPerDrawingUnit:10}),/disagree/)
  const result=inspectAamaR10Dxf20261023(square,{declaredUnit:'mm',mmPerDrawingUnit:1})
  assert.equal(result.contourCount,1)
  assert.equal(result.totalAreaMm2,100)
  assert.equal(result.totalPerimeterMm,40)
  assert.equal(result.contours[0].degree,4)
  assert.equal(result.headerUnitDeclared,false)
  assert.throws(()=>inspectAamaR10Dxf20261023(fixture([[0,0],[10,0],[10,10],[0,10]],'1'),{declaredUnit:'mm',mmPerDrawingUnit:1}),/conflicts/)
  assert.throws(()=>inspectAamaR10Dxf20261023(square.replace('70\n1\n0\nVERTEX','70\n0\n0\nVERTEX'),{declaredUnit:'mm',mmPerDrawingUnit:1}),/Open or unsupported/)
  assert.throws(()=>inspectAamaR10Dxf20261023(square.replace('30\n0\n0\nVERTEX','30\n2\n0\nVERTEX'),{declaredUnit:'mm',mmPerDrawingUnit:1}),/Nonplanar/)
  assert.throws(()=>inspectAamaR10Dxf20261023(square.replace('20\n0\n30\n0','20\n0\n42\n1\n30\n0'),{declaredUnit:'mm',mmPerDrawingUnit:1}),/Curved/)
})

test('genuine two-size AAMA R10 upstream output is hash audited, geometrically graded, and never signed off', {skip: !fs.existsSync(SEAMLY2D_RUNTIME_20261023)},()=>{
  const outputRoot=fs.mkdtempSync(path.join(os.tmpdir(),'exo-seamly-receiver-'))
  try {
    const run=evaluateSeamly2DSizeRun20261023({patternPath,measurementsPath,outputRoot,format:'aama-r10',sizesCm:[48,52],heightCm:176})
    assert.equal(run.ok,true,run.reason)
    // R10 has no $INSUNITS: the explicit mm scale here is a receiving-side assumption.
    const report=auditSeamlyAamaReceivingRoundtrip20261023({run,declaredUnit:'mm',mmPerDrawingUnit:1})
    assert.equal(report.ok,true,report.reason)
    assert.equal(report.status,'LOCAL_DXF_INSPECTION_ONLY')
    assert.equal(report.rows.length,2)
    assert(report.rows.every(row=>row.acadver==='AC1009' && row.contourCount>0 && row.headerUnitDeclared===false))
    assert(report.rows.every(row=>row.totalAreaMm2>0 && row.totalPerimeterMm>0))
    assert(report.rows.some((row,i)=>i>0 && row.totalAreaMm2!==report.rows[0].totalAreaMm2))
    assert.equal(report.manifest.unresolvedSignoff.externalReceiverCAD,false)
    assert.equal(report.manifest.unresolvedSignoff.unitScaleWitness,false)
    assert.equal(report.factoryApproved,false)
    const changed=fs.readFileSync(run.results[0].artifacts[0].filename)
    fs.writeFileSync(run.results[0].artifacts[0].filename,Buffer.concat([changed,Buffer.from('\n')]))
    const mutated=auditSeamlyAamaReceivingRoundtrip20261023({run,declaredUnit:'mm',mmPerDrawingUnit:1})
    assert.equal(mutated.code,'HASH_MISMATCH')
    assert.equal(mutated.factoryApproved,false)
    assert.equal(auditSeamlyAamaReceivingRoundtrip20261023({run:{ok:true,results:[run.results[0]]},declaredUnit:'mm',mmPerDrawingUnit:1}).code,'TWO_SIZES_REQUIRED')
  } finally {fs.rmSync(outputRoot,{recursive:true,force:true})}
})
