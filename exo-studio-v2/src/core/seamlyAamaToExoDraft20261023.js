import {cloneProject, makeRectanglePiece, uniqueId, touchProject} from './project.js'
import {parseSeamlyAamaManufacturingSemantics} from './seamlyAamaManufacturingSemantics20261023.mjs'

// Import the upstream physical CUT once per block. The DRAW outline can be a
// source contour guide, but not another material piece or a verified sewline.
export function createSeamlyAamaExoDraft20261023(original,{file,engine,editable=false,unit}={}) {
  if(!original || !file?.name?.toLowerCase().endsWith('.dxf') ||
    typeof file.content!=='string' || engine?.engine!=='Seamly2D' ||
    engine?.manufacturingApproved!==false) throw Error('Original unapproved Seamly2D AAMA exchange required')
  const ref=parseSeamlyAamaManufacturingSemantics(file.content,{filename:file.name,unit})
  if(!ref.pieces.length || ref.pieces.length>150)throw Error('Unsupported AAMA piece count')
  const next=cloneProject(original)
  next.id=uniqueId('project')
  next.name=`Seamly CUT draft · ${file.name.replace(/\.dxf$/i,'')}`
  next.pieces=ref.pieces.map((item,index)=>{
    const cut=item.cutOutlineMm.points
    const minX=Math.min(...cut.map(p=>p.x)),minY=Math.min(...cut.map(p=>p.y))
    const asCm=p=>({x:(p.x-minX)/10,y:(p.y-minY)/10})
    const piece=makeRectanglePiece(index)
    return {...piece,id:uniqueId('piece'),name:`${item.name} · source CUT`,
      points:cut.map(asCm),curves:{},notches:[],internalLines:[],buttonholes:[],
      seamAllowance:0,sourceLayer:'1',sourceToken:item.name,
      locked:!editable,active3d:false,frozen3d:true,
      seamlySourceGuides:{
        coordinateSystem:'cm relative to source CUT bounding box',
        // AAMA DRAW guides are not independently approved sewing boundaries.
        sewingContourCandidate:item.sewingContourMm?.points?.map(asCm)??null,
        drawingLines:item.drawPaths.map(g=>g.points.map(asCm)),
        internalCutLines:item.internalCuts.map(g=>g.points.map(asCm)),
        notches:item.notches.map(g=>g.points.map(asCm)),
        grainline:item.grainline?.points?.map(asCm)??null,
        closedCutContourProvenance:item.cutOutlineMm.provenance,
        upstreamDiagnosis:item.diagnostics,
      },
      patternImportProvenance:{
        source:'seamly2d-upstream-aama',referenceOnly:true,
        originalSourceLayer:'1',blockName:item.name,
        physicalCutRoleFromOriginalExporter:true,
        independentSewlineNotVerified:true,
        gradedRuleRecovered:false,originalCurveControlsRecovered:false,
        originalSeamAllowancesRecovered:false,
        productionExportAllowed:false,factoryCertified:false,
      }}
  })
  next.seams=[]
  next.customMeasurements=[];next.topstitches=[];next.fasteners=[];next.trims=[]
  next.productionSpec=null
  next.grading={...next.grading,sizes:['BASE'],baseSize:'BASE',widthPerSizeCm:0,lengthPerSizeCm:0}
  next.patternSource={
    type:'seamly2d-upstream-aama-cut-draft',fileName:file.name,
    referenceOnly:true,editableDraft:Boolean(editable),factoryCertified:false,
    originalDxfText:ref.source.originalDxfText,
    originalDxfSha256:file.sha256,
    inputSha256:engine.inputSha256,measurementsSha256:engine.measurementsSha256,
    sourceScale:`explicit ${unit}/unit`,physicalCutLayer:'1',
    drawInkLayer:'8',independentSewlineVerified:false,
    seamAllowanceRecovered:false,gradingRecovered:false,
  }
  touchProject(next)
  return {project:next,semantic:ref}
}
