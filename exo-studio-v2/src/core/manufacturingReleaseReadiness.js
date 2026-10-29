import {inspectProduction} from './productionPreflight.js'
import {inspectIndustrialPatterns} from './industrialPatternQA.js'
import {inspectGradedCutlines} from './industrialCutlineQA.js'
import {auditGradedSizeRunGeometry} from './gradedSizeRunGeometryAudit.js'
import {inspectGradedNotchPairs} from './industrialNotchQA.js'
import {createFactorySampleWorksheet,inspectFactorySampleEvidence} from './factorySampleApproval.js'
import {inspectGradedSeamJunctions,JEANS501_YOKE_JUNCTIONS} from './gradedSeamJunctionQA.js'
import {inspectStandaloneNotchesAllSizes20261023} from './standaloneNotchPreflight20261023.js'
import {inspectIndustrialDoubleNotches20261023} from './industrialDoubleNotchPreflight20261023.js'

/** Machine-checkable engineering disposition for all sizes. Never issues a
 * manufacturing approval or equates successfully parsed DXF with AAMA/ASTM.
 * A blocked project may still be exported as an explicitly UNAPPROVED study.
 */
export function inspectManufacturingReleaseReadiness(project,{checks=null}={}){
  const blocked=[]
  const add=(code,reason,count)=>blocked.push({code,reason,blockerCount:count})
  const report=(name,get)=>{
    try{return checks?.[name]??get()}
    catch(error){add(`${name.toUpperCase()}_FAILED`,String(error.message||error),1);return null}
  }
  const production=report('production',()=>inspectProduction(project))
  const industrial=report('industrial',()=>inspectIndustrialPatterns(project))
  const cutlines=report('cutlines',()=>inspectGradedCutlines(project))
  const gradedTopology=report('gradedTopology',()=>auditGradedSizeRunGeometry(project))
  const notches=report('notches',()=>inspectGradedNotchPairs(project))
  // This physical notch gate must independently inspect the live project even
  // when factoryPackage supplies precomputed (or caller-injected) QA checks.
  let standaloneNotches=null
  try {standaloneNotches=inspectStandaloneNotchesAllSizes20261023(project)}
  catch(error){add('STANDALONE_PHYSICAL_NOTCH_QA_FAILED',String(error?.message||error),1)}
  // Always inspect the actual graded CUT geometry. Injected check summaries
  // must never bypass endpoint clipping or physical double-notch validation.
  let industrialDoubleNotches=null
  try {industrialDoubleNotches=inspectIndustrialDoubleNotches20261023(project)}
  catch(error){add('INDUSTRIAL_DOUBLE_NOTCH_QA_FAILED',String(error?.message||error),1)}
  const junctions=report('junctions',()=>inspectGradedSeamJunctions(project,{
    junctions:project?.templateId==='jeans-501'?JEANS501_YOKE_JUNCTIONS:project?.gradingJunctionConstraints||[],
  }))
  const sample=report('sample',()=>inspectFactorySampleEvidence(project,createFactorySampleWorksheet(project)))
  const summaries=[
    ['PRODUCTION_PREFLIGHT',production?.blockers,'Basic geometry, fabrics, markers or sewing references require correction'],
    ['INDUSTRIAL_PATTERN_QA',industrial?.blockers,'Graded sewing lengths, contours or measurements do not pass strict QA'],
    ['PHYSICAL_CUTLINE_QA',cutlines?.blockers,'A physical CUT or STITCH contour is unsafe'],
    ['GRADE_TOPOLOGY_QA',gradedTopology?.issues?.length,'Grading inverted or collapsed at least one drafted panel'],
    ['SEWING_NOTCH_QA',notches?.blockers,'Explicit sewing notch pairs do not align'],
  ]
  if(junctions?.status!=='not_configured')summaries.push([
    'GRADED_SHARED_JUNCTION_QA',junctions?.blockers,'Authored base-size shared sewn-edge endpoints drift apart during grading',
  ])
  for(const [code,value,message] of summaries){
    if(value==null)add(`${code}_INCOMPLETE`,`No verified result for ${code}`,1)
    else if(!Number.isSafeInteger(value)||value<0)add(`${code}_INVALID`,'Invalid QA blocker count',1)
    else if(value>0)add(code,message,value)
  }
  if(standaloneNotches){
    if(!Array.isArray(standaloneNotches.issues)||!Number.isSafeInteger(standaloneNotches.blockers)||
      standaloneNotches.blockers<0||standaloneNotches.blockers!==standaloneNotches.issues.length||
      !['pass','blocked','not_configured'].includes(standaloneNotches.status)||
      (standaloneNotches.status==='blocked')!==(standaloneNotches.blockers>0)){
      add('STANDALONE_PHYSICAL_NOTCH_QA_INVALID','Invalid all-size physical notch inspection result',1)
    }else if(standaloneNotches.blockers>0){
      for(const issue of standaloneNotches.issues){
        const size=String(issue?.size??'unknown')
        const pieceId=String(issue?.pieceId??'unknown')
        const notchId=String(issue?.notchId??'unknown')
        add('STANDALONE_PHYSICAL_NOTCH_QA',`${issue?.code??'INVALID_NOTCH'}: ${size} / ${pieceId} / ${notchId}: ${issue?.message??'Invalid physical notch'}`,1)
      }
    }
    // A valid zero-notch project is legitimately not_configured; independent
    // inventory/provenance controls must establish whether notches are expected.
  }
  if(industrialDoubleNotches){
    if(!Array.isArray(industrialDoubleNotches.issues)||!Array.isArray(industrialDoubleNotches.checks)||
      !Number.isSafeInteger(industrialDoubleNotches.blockers)||industrialDoubleNotches.blockers<0||
      industrialDoubleNotches.blockers!==industrialDoubleNotches.issues.length||
      !['pass','blocked','not_configured'].includes(industrialDoubleNotches.status)||
      (industrialDoubleNotches.status==='blocked')!==(industrialDoubleNotches.blockers>0)||
      !Array.isArray(industrialDoubleNotches.checkedSizes)||
      (industrialDoubleNotches.issues.length===0 && industrialDoubleNotches.status==='pass' && industrialDoubleNotches.checks.length===0)){
      add('INDUSTRIAL_DOUBLE_NOTCH_QA_INVALID','Invalid graded industrial double-notch inspection result',1)
    }else if(industrialDoubleNotches.blockers>0){
      for(const issue of industrialDoubleNotches.issues){
        const size=String(issue?.size??'unknown'),pieceId=String(issue?.pieceId??'unknown'),notchId=String(issue?.notchId??'unknown')
        add('INDUSTRIAL_DOUBLE_NOTCH_QA',`${issue?.code??'INVALID_NOTCH'}: ${size} / ${pieceId} / ${notchId}: ${issue?.message??'Invalid physical double notch'}`,1)
      }
    }
  }
  if(project?.gradeProvenance?.status==='DEVELOPMENT_ONLY_FACTORY_APPROVAL_REQUIRED'){
    add('UNAPPROVED_GRADE_TABLE','Imported or source-locked trim does not contain externally approved multi-size grading rules',1)
  }
  if(project?.canonicalizationProvenance?.status==='DEVELOPMENT_ONLY_FACTORY_APPROVAL_REQUIRED'){
    add('UNAPPROVED_IMPORTED_CANONICALIZATION','Opt-in source normalization has no industrial receiving-CAD or patternmaker approval',1)
  }
  if(project?.patternSource?.referenceOnly||project?.pieces?.some(piece=>piece?.patternImportProvenance?.referenceOnly)){
    add('REFERENCE_ONLY_PATTERN','A physical CUT import does not reconstruct an authored editable garment',1)
  }
  if(project?.productionSpec?.neckband?.requiresSeparateNeckbandCutPattern===true){
    add('EXPERIMENTAL_NECKBAND','The proposed neckband is omitted from the approved marker/BOM and requires fabric/sampling signoff',1)
  }
  if(sample && (!Number.isSafeInteger(sample.blockerCount)||sample.blockerCount<0||
    !Array.isArray(sample.blockers)||sample.blockers.length!==sample.blockerCount||
    !['blocked','evidence_complete_requires_human_factory_release'].includes(sample.status)||
    sample.readyForHumanApproval!==(sample.blockerCount===0)||sample.factoryCertified!==false||
    (sample.status==='blocked')!==(sample.blockerCount>0))){
    add('EXTERNAL_SAMPLE_EVIDENCE_INVALID','Invalid external sample evidence blocker count',1)
  }else if(sample?.blockerCount>0){
    add('EXTERNAL_SAMPLE_EVIDENCE','CAD receiving, printed scale, cutting, sewn fit and named approval evidence are incomplete',sample.blockerCount)
  }else if(!sample){add('EXTERNAL_SAMPLE_EVIDENCE_MISSING','No authenticated physical factory sample records',1)}
  const geometryIssueCodes=new Set(['PRODUCTION_PREFLIGHT','INDUSTRIAL_PATTERN_QA','PHYSICAL_CUTLINE_QA','GRADE_TOPOLOGY_QA','SEWING_NOTCH_QA','GRADED_SHARED_JUNCTION_QA',
    'PRODUCTION_PREFLIGHT_INCOMPLETE','INDUSTRIAL_PATTERN_QA_INCOMPLETE','PHYSICAL_CUTLINE_QA_INCOMPLETE','GRADE_TOPOLOGY_QA_INCOMPLETE','SEWING_NOTCH_QA_INCOMPLETE','GRADED_SHARED_JUNCTION_QA_INCOMPLETE',
    'PRODUCTION_PREFLIGHT_INVALID','INDUSTRIAL_PATTERN_QA_INVALID','PHYSICAL_CUTLINE_QA_INVALID','GRADE_TOPOLOGY_QA_INVALID','SEWING_NOTCH_QA_INVALID','GRADED_SHARED_JUNCTION_QA_INVALID'])
  const engineeringGeometryPass=!blocked.some(item=>geometryIssueCodes.has(item.code)||item.code.startsWith('STANDALONE_PHYSICAL_NOTCH_QA')||item.code.startsWith('INDUSTRIAL_DOUBLE_NOTCH_QA')||item.code.endsWith('_FAILED'))
  return {
    schema:'exo-manufacturing-release-readiness.v1',
    status:blocked.length?'BLOCKED_NOT_APPROVED':'EVIDENCE_COMPLETE_REQUIRES_INDEPENDENT_HUMAN_RELEASE',
    factoryCertified:false,
    factoryCuttingAuthorized:false,
    bulkProductionAuthorized:false,
    engineeringGeometryPass,
    configuredSizes:Array.isArray(project?.grading?.sizes)?[...project.grading.sizes]:[],
    digitalCounts:{productionBlockers:production?.blockers??null,industrialPatternBlockers:industrial?.blockers??null,
      physicalCutlineBlockers:cutlines?.blockers??null,gradedTopologyFindings:gradedTopology?.issues?.length??null,
      pairedNotchBlockers:notches?.blockers??null,
      standalonePhysicalNotchBlockers:standaloneNotches?.blockers??null,
      industrialDoubleNotchBlockers:industrialDoubleNotches?.blockers??null,
      sharedJunctionBlockers:junctions?.status==='not_configured'?null:junctions?.blockers??null,
      externalEvidenceBlockers:sample?.blockerCount??null},
    blockers:blocked,
    disclaimer:'Engineering checks and a self-hashed ZIP never authorize cutting, mass production, or prove Gerber/Lectra/ASTM compatibility. Independent operator, receiver CAD and physical sample acceptance are necessary.',
  }
}
