import { gradeProject } from './grading.js'
import { measureProject } from './measurements.js'
import { inspectIndustrialPatterns } from './industrialPatternQA.js'
import {sha256Bytes} from './sha256Bytes.js'

/**
 * External factory acceptance worksheet, not a signature generator.
 * Approval evidence must be obtained from a real operator after printing,
 * cutting, sewing and sample fit; EXO never auto-approves its own output.
 */
const finite = value => typeof value === 'number' && Number.isFinite(value)
const stable=value=>Array.isArray(value)?`[${value.map(stable).join(',')}]`:
 value&&typeof value==='object'?
  `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`:
 JSON.stringify(value)

/** Revision identifiers are mutable application metadata, not evidence that
 * a factory sampled THIS pattern. Bind every physical sample worksheet to
 * the actual design, grading, seam, material and measurement source bytes.
 * A digest proves local content consistency only, not external observation.
 */
export function factorySampleSourceDigest(project){
 if(!project||!Array.isArray(project.pieces)||!project.pieces.length)
   throw Error('Factory sample source has no authored garment')
 const canonical=stable({schema:'exo.factory-source.v1',id:project.id||null,
  revision:project.revision??null,units:project.units||'cm',
  pieces:project.pieces,grading:project.grading||null,seams:project.seams||[],
  customMeasurements:project.customMeasurements||[],
  fabrics:project.fabrics||[],materials:project.materials||[],
  fasteners:project.fasteners||[],markerSettings:project.markerSettings||null,
  patternSource:project.patternSource||null,
  construction:project.construction||null})
 if(typeof canonical!=='string'||canonical.length>8_000_000)
   throw Error('Factory sample source exceeds digest capacity')
 return sha256Bytes(new TextEncoder().encode(canonical))
}

export function createFactorySampleWorksheet(project,{sizes=project?.grading?.sizes||[project?.grading?.baseSize||'M']}={}) {
  if(!project || !Array.isArray(project.pieces) || !project.pieces.length || !Array.isArray(sizes) || !sizes.length || new Set(sizes).size!==sizes.length || sizes.some(s=>typeof s!=='string'||!s.trim())) {
    throw new Error('A valid garment project and unique size set are needed for factory sampling')
  }
  const samples = sizes.map(size=>{
    const graded=gradeProject(project,size)
    return {
      size,
      sampleId:null,
      manufacturerName:null,
      materialLot:null,
      fabricSpecificationId:null,
      cutterOperator:null,
      sewnBy:null,
      fitReviewedBy:null,
      approvedBy:null,
      approvedAt:null,
      receiverCad:{product:null,version:null,importedSourceId:null,importPass:null,lossReport:null},
      printCalibration:{media:null,measuredXmm:null,measuredYmm:null,nominalMm:100,photoOrEvidence:null},
      cutInspection:{pieceCountExpected:graded.pieces.length,pieceCountObserved:null,notchAlignment:null,grainlinesVerified:null,cutlineToleranceMm:null,photosOrEvidence:null},
      assembly:{sewingPass:null,notchesWalked:null,gradedSeamEaseReviewed:null,constructionNotes:null},
      fit:{sampleApproved:null,photoOrEvidence:null,observations:null},
      poms:measureProject(graded).map(m=>({id:m.id,nominalDesignCm:m.cm,approvedTargetCm:null,actualSampleCm:null,toleranceCm:null,evidence:null})),
    }
  })
  return {
    schema:'exo-factory-sample-evidence.v1',
    projectId:project.id||null,
    projectName:project.name||null,
    sourceRevision:project.revision??null,
    sourcePatternSha256:factorySampleSourceDigest(project),
    sourceUnits:project.units||'cm',
    sizeRun:[...sizes],
    status:'awaiting_external_sampling',
    evidencePolicy:'Never substitute design dimensions for measured sewn samples, or report pending records as approved.',
    samples,
  }
}

/**
 * Review quality/completeness of returned physical evidence. Even a passing
 * completeness check is NOT factory certification; human provenance and
 * external receiver testing remain independently auditable obligations.
 */
export function inspectFactorySampleEvidence(project,evidence,{calibrationToleranceMm=0.5}={}) {
  const blockers=[]
  const add=(code,scope,message)=>blockers.push({code,scope,message,severity:'blocker'})
  if(!project?.pieces?.length || !project?.grading?.sizes?.length) {
    add('INVALID_PROJECT','Project','Provide a garment and a configured size run.')
    return finish()
  }
  const expected=project.grading.sizes
  if(!finite(calibrationToleranceMm)||calibrationToleranceMm<0||calibrationToleranceMm>5) {
    add('INVALID_CALIBRATION_TOLERANCE','Approval','Tolerance must be a finite 0–5 mm number.')
  }
  if(!evidence || evidence.schema!=='exo-factory-sample-evidence.v1' ||
    evidence.projectId!==(project.id||null) || evidence.sourceRevision!==(project.revision??null) ||
    !Array.isArray(evidence.sizeRun) || JSON.stringify(evidence.sizeRun)!==JSON.stringify(expected) ||
    !Array.isArray(evidence.samples) || evidence.samples.length!==expected.length) {
    add('MISSING_OR_STALE_EVIDENCE','Project','The sampled pattern record must match the current project ID, revision and full size run.')
    return finish()
  }
  try{
    if(evidence.sourcePatternSha256!==factorySampleSourceDigest(project))
      add('FACTORY_SAMPLE_SOURCE_DIGEST_DRIFT','Project',
       'This physical sample worksheet was prepared from a different authored pattern, material, grading or seam definition—even if the project ID and revision are unchanged.')
  }catch(error){add('FACTORY_SOURCE_DIGEST_UNAVAILABLE','Project',String(error.message||error))}
  let inspection
  try{inspection=inspectIndustrialPatterns(project)}catch(error){
    add('INDUSTRIAL_QA_EXCEPTION','Project',`The pattern could not be graded or inspected: ${error.message}`)
  }
  if(inspection?.blockers) add('INDUSTRIAL_PATTERN_BLOCKERS','Project',`${inspection.blockers} unresolved graded contour, seam or measurement issues require a documented correction or approved construction-ease disposition.`)
  const text=(value)=>typeof value==='string'&&value.trim().length>0
  const mark=(scope,value,code,description)=>{if(!text(value))add(code,scope,description)}
  const signatures=new Set()
  const observed=new Set()
  for(const [index,size] of expected.entries()){
    const sample=evidence.samples[index]
    const scope=`Size ${size}`
    if(!sample || sample.size!==size || observed.has(sample.sampleId) || !text(sample.sampleId)){
      add('INVALID_SAMPLE_ID',scope,'Every size needs a unique, traceable physical sample ID in size order.')
      continue
    }
    observed.add(sample.sampleId)
    for(const [key,label] of [['manufacturerName','manufacturer'],['materialLot','fabric/material lot'],['cutterOperator','cutting operator'],['sewnBy','sewing operator'],['fitReviewedBy','fit reviewer'],['approvedBy','named approver']]) {
      mark(scope,sample[key],'MISSING_APPROVAL_PROVENANCE',`Record the physical ${label}.`)
    }
    if(!text(sample.approvedAt) || Number.isNaN(Date.parse(sample.approvedAt)))add('INVALID_APPROVAL_TIME',scope,'Approval requires an actual dated operator record.')
    if(text(sample.approvedBy)) signatures.add(sample.approvedBy)
    const receiver=sample.receiverCad
    if(!receiver || !text(receiver.product) || !text(receiver.version) || !text(receiver.importedSourceId) || receiver.importPass!==true || !text(receiver.lossReport)){
      add('CAD_IMPORT_NOT_PROVEN',scope,'Provide actual destination CAD vendor/version, tested source ID, pass result and referenced loss report.')
    }
    const calibration=sample.printCalibration
    if(!calibration || !text(calibration.media) || !text(calibration.photoOrEvidence) ||
      !finite(calibration.measuredXmm) || !finite(calibration.measuredYmm) ||
      Math.abs(calibration.measuredXmm-100)>calibrationToleranceMm ||
      Math.abs(calibration.measuredYmm-100)>calibrationToleranceMm){
      add('PRINT_SCALE_NOT_PROVEN',scope,'Measure printed 100 mm reference on both axes within signed factory tolerance and retain evidence.')
    }
    const cut=sample.cutInspection
    if(!cut || cut.pieceCountExpected!==project.pieces.length || cut.pieceCountObserved!==cut.pieceCountExpected || cut.notchAlignment!==true || cut.grainlinesVerified!==true ||
      !finite(cut.cutlineToleranceMm) || cut.cutlineToleranceMm<0 || !text(cut.photosOrEvidence)){
      add('CUT_INSPECTION_MISSING',scope,'Inspect piece inventory, notches, grain and actual cutting tolerance against source patterns.')
    }
    if(sample.assembly?.sewingPass!==true || sample.assembly?.notchesWalked!==true || sample.assembly?.gradedSeamEaseReviewed!==true ||
      !text(sample.assembly?.constructionNotes)){
      add('SEWING_SAMPLE_NOT_PROVEN',scope,'Physical sewing, seam walking and approved ease must be recorded.')
    }
    if(sample.fit?.sampleApproved!==true || !text(sample.fit?.photoOrEvidence)){
      add('FIT_SAMPLE_NOT_PROVEN',scope,'Provide external physical fit/sample approval and evidence.')
    }
    const actual=sample.poms
    if(!Array.isArray(actual) || new Set(actual.map(row=>row?.id)).size!==actual.length ||
      actual.some(row=>!text(row.id))) {add('POM_SAMPLE_INVALID',scope,'Provide unique measured POM rows for every design measurement.');continue}
    let nominal=[]
    try{nominal=measureProject(gradeProject(project,size))}catch(error){
      add('POM_MEASUREMENT_FAILED',scope,error.message);continue
    }
    if(!nominal.length)add('MISSING_APPROVED_POM_BASIS',scope,'A garment needs measured, approved points of measure to validate a factory sample.')
    const byId=new Map(actual.map(row=>[row.id,row]))
    if(nominal.some(row=>!byId.has(row.id)) || actual.length!==nominal.length)add('POM_COUNT_MISMATCH',scope,'Sewn sample POM IDs must match the complete design measurement inventory.')
    for(const item of actual){
      if(!finite(item.approvedTargetCm)||!finite(item.actualSampleCm)||!finite(item.toleranceCm)||item.approvedTargetCm<0||item.actualSampleCm<0||item.toleranceCm<0||
        Math.abs(item.approvedTargetCm-item.actualSampleCm)>item.toleranceCm || !text(item.evidence)){
        add('SAMPLE_POM_OUT_OF_TOLERANCE',`${scope} · POM ${item.id}`,'Physical measured POM must fall within an independently approved target/tolerance with evidence.')
      }
    }
  }
  return finish()
  function finish(){return {
    status:blockers.length?'blocked':'evidence_complete_requires_human_factory_release',
    readyForHumanApproval:blockers.length===0,
    factoryCertified:false,
    blockerCount:blockers.length,
    blockers,
    samplesReviewed:Array.isArray(evidence?.samples)?evidence.samples.length:0,
    evidenceScope:'External operator signatures and physical samples cannot be verified by software alone.',
  }}
}
