// Local, trusted-UI-only Seamly2D evaluation. The original upstream engine
// runs in a separate process, and its results are unapproved CAD artifacts.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { evaluateSeamly2DPattern20261023, evaluateSeamly2DSizeRun20261023 } from './seamly2dNativeEngine20261023.mjs'
import {inspectAamaR10Dxf20261023} from './seamlyAamaReceivingRoundtrip20261023.mjs'
import {parseSeamlyAamaManufacturingSemantics} from '../../src/core/seamlyAamaManufacturingSemantics20261023.mjs'

const text = value => typeof value === 'string' && value.length > 0
const fail = (code, reason) => ({ ok:false, code, reason, manufacturingApproved:false })

export function evaluateSeamly2DRequest20261023(body, { outputRoot = os.tmpdir() } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).some(key => !['patternXml','measurementsXml','format','sizesCm','sizeCm','heightCm','sourceUnit'].includes(key))) {
    return fail('INVALID_REQUEST', 'Unsupported Seamly2D request')
  }
  if (!text(body.patternXml) || body.patternXml.length > 4*1024*1024 ||
      !text(body.measurementsXml) || body.measurementsXml.length > 2*1024*1024) {
    return fail('INVALID_SOURCE', 'Expected Seamly2D .sm2d and SeamlyMe XML within input limits')
  }
  const measurementsTag = /^\s*(?:<\?xml[^>]*>\s*)?<(smis|smms)(?:\s|>)/i.exec(body.measurementsXml)?.[1]?.toLowerCase()
  if (!measurementsTag) return fail('INVALID_MEASUREMENTS', 'Only SeamlyMe .smis or .smms XML accepted')
  if (!['svg','aama-r10'].includes(body.format)) return fail('INVALID_FORMAT', 'Choose SVG or AAMA R10 DXF')
  if (body.format==='aama-r10' && !['mm','cm','inch'].includes(body.sourceUnit)) return fail('SOURCE_UNIT_REQUIRED','Declare AAMA drawing units before evaluating for CAD exchange')
  if (body.sizesCm !== undefined &&
      (body.sizeCm !== undefined || !Array.isArray(body.sizesCm) || body.sizesCm.length > 6)) {
    return fail('INVALID_SIZE_RUN', 'Choose one size or 2–6 graded sizes per download')
  }
  let temp
  try {
    temp = fs.mkdtempSync(path.join(outputRoot, 'exo-seamly-request-'))
    const patternPath = path.join(temp, 'uploaded.sm2d')
    const measurementsPath = path.join(temp, `uploaded.${measurementsTag}`)
    fs.writeFileSync(patternPath, body.patternXml, { flag: 'wx' })
    fs.writeFileSync(measurementsPath, body.measurementsXml, { flag: 'wx' })
    const request = {
      patternPath, measurementsPath, format: body.format, outputRoot: temp,
      ...(body.heightCm !== undefined ? { heightCm:body.heightCm } : {}),
    }
    const result = body.sizesCm !== undefined
      ? evaluateSeamly2DSizeRun20261023({...request,sizesCm:body.sizesCm})
      : evaluateSeamly2DPattern20261023({...request,...(body.sizeCm!==undefined?{sizeCm:body.sizeCm}:{})})
    if (!result.ok) return fail(result.code || 'ENGINE_FAILED', result.reason)
    const runs = Array.isArray(result.results) ? result.results : [result]
    let total = 0
    const artifacts = []
    for (const run of runs) {
      for (const entry of run.artifacts) {
        const bytes = fs.readFileSync(entry.filename)
        total += bytes.length
        if (total > 8*1024*1024) return fail('OUTPUT_TOO_LARGE', 'Seamly2D output exceeds 8 MB response cap')
        let localInspection=null
        if(body.format==='aama-r10') {
          const declaredUnit=body.sourceUnit==='inch'?'in':body.sourceUnit
          const mmPerDrawingUnit={mm:1,cm:10,inch:25.4}[body.sourceUnit]
          const inspected=inspectAamaR10Dxf20261023(bytes,{declaredUnit,mmPerDrawingUnit})
          const semantics=parseSeamlyAamaManufacturingSemantics(bytes.toString('utf8'),{unit:body.sourceUnit,filename:entry.name})
          const count=semantics.pieces.length
          if(count<1 || count>150 || semantics.pieces.some(piece=>piece.cutOutlineMm?.points?.length<3))
            return fail('UNSAFE_AAMA_GEOMETRY','Original AAMA physical CUT outlines missing')
          localInspection={status:'LOCAL_INSPECTION_ONLY',sourceUnit:body.sourceUnit,
            sourceCutPieces:count,closedContourInventory:inspected.contourCount,
            physicalCutLayer:'1',drawingGuideLayer:'8',
            notchCount:semantics.pieces.reduce((v,p)=>v+p.notches.length,0),
            grainlineCount:semantics.pieces.filter(p=>p.grainline).length,
            internalCutCount:semantics.pieces.reduce((v,p)=>v+p.internalCuts.length,0),
            independentScaleVerified:false,externalReceivingCadApproved:false,physicalSampleApproved:false,
            unsupportedEntities:inspected.entityKindsOutsideClosedOutlines,
          }
        }
        artifacts.push({
          name: entry.name.replace(/^exo-seamly-evaluated/, 'seamly-'+(run.sizeCm??'draft')),
          sizeCm:run.sizeCm, sha256:entry.sha256, sizeBytes:bytes.length,
          content:bytes.toString('utf8'),localInspection,
        })
      }
    }
    return {
      ok:true, engine:'Seamly2D', calculation:'upstream-executable',
      inputSha256:runs[0].inputSha256, measurementsSha256:runs[0].measurementsSha256,
      format:body.format,sourceUnit:body.sourceUnit??null,sizeCm:body.sizeCm??null, sizesCm:body.sizesCm??null,
      heightCm:body.heightCm??null, artifacts, manufacturingApproved:false,
      qualification:'Pattern-calculated CAD exchange only. External receiving CAD validation, piece semantics and physical sample approval are required.',
    }
  } catch (error) {
    return fail('EVALUATION_FAILED', error instanceof Error ? error.message : String(error))
  } finally {
    if (temp) { try { fs.rmSync(temp, { recursive:true, force:true }) } catch {} }
  }
}
