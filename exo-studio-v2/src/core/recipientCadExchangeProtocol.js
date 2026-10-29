import {gradeProject} from './grading.js'
import {projectToDxf} from './dxf.js'
import {sha256Bytes} from './sha256Bytes.js'

const utf8=new TextEncoder()
const finite=n=>typeof n==='number'&&Number.isFinite(n)
const nonempty=s=>typeof s==='string'&&s.trim().length>0

/** A real receiver workflow must be run by a human in licensed CAD software.
 * These are source-linked acceptance TARGETS, not results. Layout offsets in
 * EXO DXF are intentionally not modeled as authored point coordinates.
 */
export function createRecipientCadExchangeProtocol(project){
  if(!Array.isArray(project?.pieces)||!project.pieces.length||
    !Array.isArray(project?.grading?.sizes)||!project.grading.sizes.length||
    new Set(project.grading.sizes).size!==project.grading.sizes.length||
    project?.patternSource?.referenceOnly||project.pieces.some(piece=>piece?.patternImportProvenance?.referenceOnly)){
    throw new Error('Recipient CAD protocol requires a complete authored multi-size project; locked references are refused')
  }
  const sizes=project.grading.sizes.map(size=>{
    const graded=gradeProject(project,size)
    const dxfs=projectToDxf(graded,size,{cutlineMode:'manufacturing',requireGradedGeometry:true})
    // Autodesk R12 standard DXF was chosen by EXO and must NOT be mislabeled
    // ASTM D6673: D6673 explicitly specifies R13 and ASCII grade rules.
    if(!dxfs.includes('AC1009'))throw new Error(`Unexpected generated generic DXF format for ${size}`)
    return {
      size,
      outboundGenericDXF:{profile:'EXO-manufacturing-R12-not-ASTM-AAMA',headerVersion:'AC1009',units:'mm',
        sha256:sha256Bytes(utf8.encode(dxfs)),
        note:'One DXF per size. Layer names, rather than an ASTM/AAMA graded nest and vendor rule table, are used.'},
      pieceCount:graded.pieces.length,
      expectedPieces:graded.pieces.map(piece=>({
        sourceId:piece.id,
        sourceName:piece.name,
        baseVertexCount:project.pieces.find(original=>original.id===piece.id)?.points.length??null,
        gradedVertexCount:piece.points.length,
        authoredBezierControls:Object.keys(piece.curves||{}).length,
        authoredNotches:(piece.notches||[]).length,
        authoredInternalLines:(piece.internalLines||[]).length,
        grainAngleDeg:Number(piece.grainAngleDeg||0),
        pointCoordinatesCm:piece.points.map(point=>{
          if(!finite(point.x)||!finite(point.y))throw new Error(`Nonfinite ${size}/${piece.id} point`)
          return [point.x,point.y]
        }),
      })),
      destinationEvidence:{vendor:null,product:null,version:null,operator:null,importedAt:null,
        actualDXFOrNativeFile:null,lossReport:null,returnedGradingRuleFile:null,
        sourceIdsMatched:null,sizeIdentityPreserved:null,allNotchesChecked:null,
        allInternalMarksChecked:null,grainDirectionChecked:null,
        actualFactoryCADImportPass:null,actualFactoryCADExportPass:null,
        gradeRulePointMappingVerified:null,measuredPhysicalDimensionParity:null},
    }
  })
  return {
    schema:'exo-recipient-cad-exchange-protocol.v1',
    projectId:project.id??null,sourceRevision:project.revision??null,sourceUnits:project.units||'cm',
    status:'AWAITING_ACTUAL_EXTERNAL_CAD_EXCHANGE',
    requestedRecipients:['Gerber AccuMark','Lectra Modaris'],
    targetCadInterchange:'Explicit receiver-tested AAMA/ASTM model/nest with tested grade-rule source',
    currentExportProfile:'EXO-specific generic AutoCAD R12 DXF + source-native JSON/CSV grading',
    currentExportASTMOrAAMACertified:false,
    vendorFixtureAvailable:false,actualCADRoundTripPerformed:false,
    sizes,
    externalSteps:[
      'Open in a licensed receiving Gerber AccuMark Pattern Design / Data Conversion Utility or Lectra Modaris/Pattern Converter. Record vendor, product, version and operator.',
      'Attempt an explicitly named vendor conversion. A readable plain AutoCAD DXF alone is not ASTM/AAMA acceptance.',
      'Save native style/piece model and return export plus any required ASCII .RUL grade table; retain complete source and recipient files.',
      'Match style, size range, every pattern piece, point IDs and grading increments, curve semantics, notches, grain and internal marks against the authored source.',
      'Measure full-scale dimensional differences at approved POMs and source landmarks and record all shape/grade losses by size.',
      'Independently print 100-mm calibration and cut/sew/fit test pieces, with named operator/factory acceptance and signed product-spec tolerances.',
    ],
    standardsBoundary:'ASTM D6673 describes DXF Version 13 plus separate ASCII grade rule data and explicitly does not interchange sewn relationships, cutter commands or full marker plans; a generic R12 file is NOT conformant proof.',
    signedFactoryApproval:false,bulkCuttingAuthorized:false,
  }
}

/** Human-supplied untrusted CAD observations are only assessed for completeness;
 * a self-reported pass can NEVER become a cryptographically verified or factory
 * certified result without externally validated original application records.
 */
export function inspectRecipientCadExchangeEvidence(protocol,returned){
  const blockers=[]
  const fail=(code,scope)=>blockers.push({code,scope})
  if(!protocol||protocol.schema!=='exo-recipient-cad-exchange-protocol.v1'||
    !Array.isArray(protocol.sizes)||!protocol.sizes.length)throw new Error('Invalid CAD protocol')
  if(!returned||returned.projectId!==protocol.projectId||returned.sourceRevision!==protocol.sourceRevision||
    !Array.isArray(returned.sizes)||returned.sizes.length!==protocol.sizes.length){
    fail('STALE_OR_MISSING_RECIPIENT_RESULTS','project')
  }else for(const [index,requested] of protocol.sizes.entries()){
    const actual=returned.sizes[index]
    if(!actual||actual.size!==requested.size||
      actual.sourceDXFSha256!==requested.outboundGenericDXF.sha256){
      fail('RECEIVER_SOURCE_FILE_MISMATCH',requested.size)
      continue
    }
    const record=actual.destinationEvidence
    if(!record||!nonempty(record.vendor)||!nonempty(record.product)||!nonempty(record.version)||
      !nonempty(record.operator)||!nonempty(record.importedAt)||Number.isNaN(Date.parse(record.importedAt))||
      !nonempty(record.actualDXFOrNativeFile)||!nonempty(record.lossReport)||!nonempty(record.returnedGradingRuleFile)){
      fail('REAL_CAD_RECEIVER_EVIDENCE_MISSING',requested.size)
    }
    for(const field of ['sourceIdsMatched','sizeIdentityPreserved','allNotchesChecked',
      'allInternalMarksChecked','grainDirectionChecked','actualFactoryCADImportPass',
      'actualFactoryCADExportPass','gradeRulePointMappingVerified','measuredPhysicalDimensionParity']){
      if(record?.[field]!==true)fail(`UNVERIFIED_${field.toUpperCase()}`,requested.size)
    }
  }
  return {schema:'exo-recipient-cad-exchange-observations.v1',
    status:blockers.length?'BLOCKED_OR_UNVERIFIED':'EXTERNAL_RECEIVER_EVIDENCE_RECORDED_REQUIRES_INDEPENDENT_AUDIT',
    blockers,blockerCount:blockers.length,
    factoryCertified:false,factoryCuttingAuthorized:false,
    note:'User-filled or self-reported CAD observations are not signed vendor provenance, ASTM certification, or a physically approved production sample.'}
}
