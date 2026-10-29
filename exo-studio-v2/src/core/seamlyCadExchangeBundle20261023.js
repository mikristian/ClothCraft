import { strToU8, zipSync } from 'fflate'

// Voluntary factory/CAD *evaluation* packet, NOT a manufacturing release.
// Keep native upstream AAMA wires byte-for-byte and include operator QA slots.
const sha = value => typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value)
const text = value => strToU8(value)
const scales = Object.freeze({ mm: 1, cm: 10, inch: 25.4 })
const err = message => { throw new Error('Seamly CAD exchange refused: ' + message) }
const slug = value => String(value || '').replace(/[^a-z0-9_-]/gi, '_').slice(0, 90)

function calibrationDxf(unit) {
  const end = Number((100/scales[unit]).toFixed(9))
  const values = [
    0,'SECTION',2,'HEADER',9,'$ACADVER',1,'AC1009',0,'ENDSEC',
    0,'SECTION',2,'ENTITIES',0,'LINE',8,'QA_100MM_CALIBRATION',
    10,0,20,0,30,0,11,end,21,0,31,0,
    0,'ENDSEC',0,'EOF',
  ]
  return values.map((v,i) => (i%2===0 ? String(v).padStart(3) : String(v))).join('\n') + '\n'
}

/**
 * Build a graded AAMA CAD receiver-evaluation ZIP.
 * All hashes are those returned by the original engine. They are independently
 * compared by the receiver and never imply successful import or sample approval.
 */
export async function buildSeamlyCadExchangeBundle20261023(result, {
  sourceUnit, sourceFileName='source.sm2d', measurementFileName='measurements.smms',
}={}, { subtle = globalThis.crypto?.subtle }={}) {
  if (!result || result.ok !== true || result.engine !== 'Seamly2D' ||
      result.format !== 'aama-r10' || result.manufacturingApproved !== false ||
      !Array.isArray(result.sizesCm) || result.sizesCm.length < 2 ||
      result.sizesCm.length > 6 || !Array.isArray(result.artifacts) ||
      result.artifacts.length !== result.sizesCm.length) err('requires a real two-to-six-size upstream AAMA DXF run')
  if (!Object.hasOwn(scales, sourceUnit)) err('requires confirmed AAMA source units')
  if (!subtle || typeof subtle.digest !== 'function') err('requires SHA-256 digest support')
  if (!sha(result.inputSha256) || !sha(result.measurementsSha256)) err('missing original source checksums')
  const files = {}
  const sizes = []
  const seen = new Set()
  for (const a of result.artifacts) {
    const size = a?.sizeCm
    if (!Number.isInteger(size) || !result.sizesCm.includes(size) || seen.has(size) ||
        !sha(a.sha256) || typeof a.content !== 'string' ||
        a.content.length < 200 || a.content.length > 4*1024*1024 ||
        !a.name.endsWith('.dxf') || a.localInspection?.status!=='LOCAL_INSPECTION_ONLY' ||
        a.localInspection?.sourceUnit!==sourceUnit ||
        !(a.localInspection?.sourceCutPieces>0) || a.localInspection?.externalReceivingCadApproved!==false
        ) err('invalid, unsupported or duplicate graded AAMA DXF, or missing upstream source geometry audit')
    if (!/\nSECTION\s*\n\s*2\s*\nENTITIES\b/.test(a.content) ||
        !/\nEOF\s*$/.test(a.content.trimEnd())) err('DXF entity section/EOF missing')
    seen.add(size)
    const name = `graded-aama/seamly-size-${size}.dxf`
    files[name] = text(a.content)
    const hashed=Array.from(new Uint8Array(await subtle.digest('SHA-256',files[name]))).map(v=>v.toString(16).padStart(2,'0')).join('')
    if (hashed.toLowerCase() !== a.sha256.toLowerCase() || a.sizeBytes !== files[name].length) err('upstream AAMA bytes do not match SHA-256 manifest')
    sizes.push({sizeCm:size,filename:name,sha256:a.sha256,bytes:files[name].length,
      localGeometryAudit:a.localInspection})
  }
  if (seen.size !== result.sizesCm.length) err('graded set contains missing size')
  const manifest = {
    schema:'exo.seamly.receiver-cad-exchange.v1',
    purpose:'INDEPENDENT_RECEIVING_CAD_EVALUATION_NOT_PRODUCTION_RELEASE',
    originEngine:'Seamly2D',
    upstreamSourceSha256:result.inputSha256,
    upstreamMeasurementsSha256:result.measurementsSha256,
    upstreamSourceFile:String(sourceFileName).slice(0,200),
    upstreamMeasurementsFile:String(measurementFileName).slice(0,200),
    format:'AAMA R10 ASCII DXF',sourceUnit,unitsPerMillimeter:1/scales[sourceUnit],
    sizeUnit:'cm',sizes,
    calibration:{file:'qa/scale-100mm.dxf',lineLengthMm:100,
      step:'Import alongside each graded size, print at 1:1 and independently measure the bar with a ruler or caliper.'},
    roleMapping:{
      '1':'Upstream AAMA CUT/OUTLINE (uses built seam allowance if applicable)',
      '8':'Upstream AAMA DRAW/INK (contains drawing contour and potentially internal drawing guides; not certified cut or sewline)',
      '4':'Upstream AAMA NOTCH',
      '7':'Upstream AAMA GRAINLINE',
      '11':'Upstream AAMA INTCUT',
    },
    caveats:[
      'Original DXF may omit $INSUNITS. Use the explicit sourceUnit and verify scale with 100-mm line.',
      'DRAW/INK (layer 8) is not equivalent to independently approved stitch-line topology.',
      'No automatic deduction of seam allowance, notch topology or grading rule correctness is approved.',
      'EXO has not independently verified receiving CAD can open these DXFs without losing entities.',
      'No fitting, garment construction, factory sample or production release has been approved.',
    ],
    receivingFactoryApproval:false,physicalSampleApproval:false,
    manufacturingApproved:false,
  }
  files['manifest.json']=text(JSON.stringify(manifest,null,2))
  files['qa/scale-100mm.dxf']=text(calibrationDxf(sourceUnit))
  files['qa/receiver-acceptance-worksheet.json']=text(JSON.stringify({
    schema:'exo.seamly.receiver-acceptance-worksheet.v1',
    vendor:null,cadProduct:null,cadVersion:null,receivingOperator:null,receiptDate:null,
    originalSizeDxfsImportedSuccessfully:false,
    unitScaleConfirmedBy100MmPrint:false,grainlinesAndNotchesVerified:false,
    cutVersusDrawLayerMappingVerified:false,
    sewlineAndSeamAllowancesPhysicallyConfirmed:false,
    independentGradingRuleComparisonPassed:false,
    materialAndCutQuantityConfirmed:false,
    samplePatternMakerApproved:false,
    fitAndConstructionSampleApproved:false,
    discrepancyReport:null,receiverCadFileHashes:null,
    productionReleaseAuthorized:false,
  },null,2))
  files['qa/README.txt']=text([
    'EXO / Seamly2D AAMA CAD RECEIVER EVALUATION — NOT APPROVED FOR PRODUCTION',
    'Upstream export CAD file hashes and sizes are listed in manifest.json.',
    'Receiver must inspect original DXFs in its own CAD software, verify scale and cutting/drawing layers.',
    'Compare independent receiver-exported files against the upstream geometry and resolve all losses.',
    'Physical plot, sample fit, and production permissions must be supplied by authorized personnel.',
    'The acceptance worksheet is intentionally unapproved; DO NOT prefill approvals.',
  ].join('\n')+'\n')
  return {ok:true,zip:zipSync(files,{level:6}),filename:`seamly-${slug(result.sizesCm.join('-'))}-cad-receiver-evaluation-NOT-APPROVED.zip`,
    manifest,manufacturingApproved:false}
}
