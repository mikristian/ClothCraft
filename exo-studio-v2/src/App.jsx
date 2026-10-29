import PatternDesignToolPanel from './components/PatternDesignToolPanel.jsx'
import AccuMark2DLibrary from './components/AccuMark2DLibrary.jsx'
import {offsetGradePoint,distributeGradePoint,smoothGradePoint,redistributeSizeLine} from './core/accumarkGradeRuleOperations20261023.js'
import {applyAccuMarkPatternOperation} from './core/accumarkPatternOperations20261023.js'
import {applyAccuMarkPointLineOperation} from './core/accumarkPointLineTools20261023.js'
import {applyAccuMarkGradeAxisOperation} from './core/accumarkGradeAxisOperations20261023.js'
import {editAccuMarkGradeDelta} from './core/accumarkNumericGradeDelta20261023.js'
import {buildAccuMarkGradePointDragProposal} from './core/accumarkGradePointDrag20261023.js'
import {applyAccuMarkGradeBatch} from './core/accumarkGradeBatch20261023.js'
import {applyAccuMarkJoinedEndGradeRule} from './core/accumarkJoinedEndGrading20261023.js'
import {applyAccuMarkGradedNotchDistance} from './core/accumarkGradedNotchDistance20261023.js'
import {applyAccuMarkGradeConstraint} from './core/accumarkGradeConstraints20261023.js'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ExoUniversalPanelHandles20261028 from './components/ExoUniversalPanelHandles20261028.jsx'
import './patternFocusExpanded.css'
import {
  Activity,
  Hand,
  Move3D,
  Rotate3d,
  FolderOpen,
  ChevronDown,
  ChevronLeft,
  Box,
  Cpu,
  Download,
  Eye,
  FileDown,
  FileSpreadsheet,
  Link2,
  Lock,
  MapPin,
  MousePointer2,
  Pause,
  PenTool,
  Play,
  Plus,
  Redo2,
  Ruler,
  RotateCcw,
  Save,
  Scissors,
  Sparkles,
  Spline,
  Trash2,
  Undo2,
  Unlock,
  Upload,
  ArrowDownToLine,
  Check,
  ChevronRight,
  CircleHelp,
  EyeOff,
  Focus,
  Grid3X3,
  Table2,
  LayoutPanelTop,
  Layers3,
  Maximize2,
  PanelLeft,
  PanelRight,
  Search,
  Settings2,
  Shirt,
  SlidersHorizontal,
  Star,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import PatternEditor from './components/PatternEditor.jsx'
import GarmentViewport from './components/GarmentViewport.jsx'
import FoamPaddingEditor from './components/FoamPaddingEditor.jsx'
import FoamMaterialPropertyEditor from './components/FoamMaterialPropertyEditor.jsx'
import ClothCraftWorkspace from './components/ClothCraftWorkspace.jsx'
import {readPatternReferences,savePatternReferences,validatePatternReferences} from './core/nativePatternReferences20261025.js'
import PrintLayoutStudio from './components/PrintLayoutStudio.jsx'
import ClothCraftPreview from './components/ClothCraftPreview.jsx'
import FabricMaterialPreview from './components/FabricMaterialPreview.jsx'
import ZozoReferenceDressViewer from './components/ZozoReferenceDressViewer.jsx'
import WorkspaceCommandPalette from './components/WorkspaceCommandPalette.jsx'
import StudioSettingsDialog from './components/StudioSettingsDialog.jsx'
import StudioCustomToolbar from './components/StudioCustomToolbar.jsx'
import StudioCustomToolbarCollection from './components/StudioCustomToolbarCollection.jsx'
import StudioWorkspaceWidgets from './components/StudioWorkspaceWidgets.jsx'
import CloFinishingToolWidgets from './components/CloFinishingToolWidgets.jsx'
import {STUDIO_CUSTOMIZATION_KEY,DEFAULT_STUDIO_CUSTOMIZATION,loadStudioCustomization,normalizeStudioCustomization,saveStudioCustomization} from './core/studioCustomization.js'
import {getModarisExoRoute20261028} from './core/modarisCustomToolbarRoute20261028.js'
import {nativeSolverBadge20261028} from './core/nativeSolverBadge20261028.js'
import {checkModarisToolbarPreconditions20261028} from './core/modarisToolbarPreconditions20261028.js'
import {studioResolvedPalette} from './core/studioThemePresets.js'
import {resolveExoGradeChartThemes20261028} from './core/exoSettingsColorPresets20261028.js'
import {resolveExoPatternCrystalSurface20261029} from './core/exoPatternCrystalGlass20261029.js'
import {STUDIO_THEME_IDS} from './core/studioThemePresets.js'
import {initializeRustThemeKernel,rustThemeKernelReady,rustThemeGlowEnabled,rustThemeNestVisible,rustThemeColorTokens} from './core/rustThemeKernel.js'
import {readableUiInk} from './core/interfaceColorContrast.js'
import {contrastRatio} from './core/interfaceColorContrast.js'
import {cadAutoContrastColors} from './core/cadAutoContrast.js'
import {loadThemeSchedule,resolveScheduledTheme,applySavedThemePreset} from './core/themePresetManager.js'
import {APP_AUTOMATION_ACTIONS,installAppAutomation} from './core/clothcraftAppAutomation.js'
import { loadZozoDressReference } from './core/zozoReferenceDress.js'
import { readSavedProject, validateSavedProject, writeSavedProject } from './core/projectRestore.js'
import {finalizeIndustrialAllowanceMutation20261027} from './core/industrialAllowanceMutationTransaction20261027.js'
import {applyModarisSizeLinkedGradeMutation} from './core/modarisSizeLinkedGradeMutation20261027.js'
import {reapplyIndustrialAllowanceGraph} from './core/industrialAllowanceGraph20261027.js'
import {recoverFactorySourceFromZip} from './core/factorySourceRecovery.js'
import { CLO_MENUS, GarmentSilhouette, LibraryChrome, ObjectBrowser } from './components/CloUI.jsx'
import FabricCatalog from './components/FabricCatalog.jsx'
import HardwareLibrary from './components/HardwareLibrary.jsx'
import ImportedHardwareInspector from './components/ImportedHardwareInspector.jsx'
import SceneEnvironmentPropertyEditor from './components/SceneEnvironmentPropertyEditor.jsx'
import {normalizeCloImportedHardwareManifest,CLO_IMPORT_MANIFEST_URL} from './data/cloImportedHardwareCatalog.js'
import {importedCloHardwareDimensions} from './core/importedCloHardwareDimensions.js'
import LibraryAssetHover from './components/LibraryAssetHover.jsx'
import GarmentLibraryPreview from './components/GarmentLibraryPreview.jsx'
import ProjectFileLibrary from './components/ProjectFileLibrary.jsx'
import DigitalTechPackStudio from './components/DigitalTechPackStudio.jsx'
import TechPackWorkspace from './components/TechPackWorkspace.jsx'
import {loadNativeTechPackWorkspace,saveNativeTechPackWorkspace} from './core/nativeTechPackWorkspaceStorage.js'
import {buildTraditionalTechPackHTML} from './core/digitalTechPack.js'
import {buildPortableTechPackHTML,buildMarketplaceTechPackListing} from './core/techPackHtmlExport.js'
import WorkspaceSharingPanel,{WorkspaceSharingHeader} from './components/WorkspaceSharingPanel.jsx'
import {PHOTO_SHOOT_SETS,getPhotoShootSet} from './data/photoShootSets.js'
import {collaboration,followProjectEvents,leaveProjectPresence,readSharedProjectMapping,updateSharedProjectMapping} from './core/projectCollaborationClient.js'
import CloTopMenuDropdown from './components/CloTopMenuDropdown.jsx'
import {listProjects as listLibraryProjects,listCollections as listLibraryCollections,createCollection as createLibraryCollection,saveProject as saveLibraryProject,getProject as getLibraryProject,getRevision as getLibraryRevision,listRevisions as listLibraryRevisions,listAttachments as listLibraryAttachments,addRevision as addLibraryRevision,saveAttachment as saveLibraryAttachment,deleteAttachment as deleteLibraryAttachment,downloadAttachment as retrieveLibraryAttachment,exportLibraryBackup,importLibraryBackup} from './core/projectFileLibrary.js'
import {requestNativeLibraryProject} from './core/nativeProjectLibraryBridge.js'
import {ensurePreservedGarmentsInLibrary,PRESERVED_DENIM_LIBRARY_ID,PRESERVED_TSHIRT_LIBRARY_ID} from './core/preservedGarmentExamples.js'
import {projectPatternPreview,captureVisibleCanvasPreview} from './core/projectLibraryPreview.js'
import Library3DAssetPreview from './components/Library3DAssetPreview.jsx'
import StageCatalog from './components/StageCatalog.jsx'
import StagePropertyPanel from './components/StagePropertyPanel.jsx'
import { listStagePresets, normalizeStageId } from './data/stagePresets.js'
import RightToolPalette from './components/RightToolPalette.jsx'
import Clo3DReferenceToolbar from './components/Clo3DReferenceToolbar.jsx'
import {getClo7NativeCapability} from './core/clo7NativeToolCapabilities.js'
import {getCloNativeMenuRoute} from './core/cloNativeMenuBridge.js'
import {applyDraftHardwareAction} from './core/clo7NativeHardwareActions.js'
import CloPropertyEditorAccordion from './components/CloPropertyEditorAccordion.jsx'
import {applyCloDraftProperty,validateCloDraftProperty,resolveCloDraftTarget} from './core/cloPropertyCommands.js'
import PatternLibraryThumbnail from './components/PatternLibraryThumbnail.jsx'
import PatternIntelligenceLibrary from './components/PatternIntelligenceLibrary.jsx'
import PatternFlatSheetPreview from './components/PatternFlatSheetPreview.jsx'
import {parseSvgPattern} from './core/svgPatternImport.js'
import {interpretAssistantIntent,ASSISTANT_ACTIONS} from './core/assistantActions.js'
import CadToolIcon from './components/CadToolIcon.jsx'
import MarkerPreview from './components/MarkerPreview.jsx'
import SeamWalkPreview from './components/SeamWalkPreview.jsx'
import SewingAssemblyInspector20261024 from './components/SewingAssemblyInspector20261024.jsx'
import {applySewingAssemblyAction20261024} from './core/sewingAssemblyWorkflow20261024.js'
import { createDefaultProject, FABRIC_PRESETS, FABRIC_SCAN_COVERAGE } from './data/defaultProject.js'
import { WASH_EFFECTS, normalizeWashSpec } from './core/clothWashProcedurals.js'
import { digitalWashSuitability } from './core/fabricWashSuitability.js'
import { clo7FabricReadout } from './core/clo7FabricReadout.js'
import { calibrateFabricEvidence } from './core/fabricEvidenceCalibration.js'
import { FABRIC_REALISM_SHOWCASE } from './core/fabricRealismShowcase.js'
import { fabricSwatchStyle } from './core/fabricSwatchStyle.js'
import { groupApparelPresets } from './data/apparelMaterialExpansion.js'
import { listHardwarePresets, getHardwarePreset, hardwareToPatternAnnotation } from './data/hardwarePresets.js'
import {resolveHardwareStyle,validateHardwareStyleEdit} from './core/hardwareStyleProperties.js'
import { createTemplateProject, GARMENT_TEMPLATES } from './data/templates.js'
import { arrangePatternProject, inferPatternBodyRole } from './core/patternBodyArrangement.js'
import { prepareNativePatternExport } from './core/nativePatternExportPreparation.js'
import {templateMatchesFolder} from './data/libraryFolderTree.js'
import { cloneProject, closestEdgeFraction, edgeLength, getEdgeSeamAllowance, makeRectanglePiece, pieceArea, projectArea, samplePieceBoundary, seamLengthReport, seamWalkReport, touchProject, uniqueId } from './core/project.js'
import { auditSewingConstruction, validateNewSeam } from './core/sewingConstruction.js'
import { draftingSplitFractions, splitParameterAtArcFraction } from './core/draftingSplit.js'
import { isDraftEditValid } from './core/draftingTopology.js'
import { deletedPointEdgeIndex, planDraftPointDeletion } from './core/draftingPointDeletion.js'
import { unfoldDraftPiece } from './core/draftingUnfold.js'
import { pieceCenter } from './core/trims.js'
import { buildSizeRun, gradePointForPiece, gradeProject, sizeOffset } from './core/grading.js'
import IndustrialGradeWorkbench from './components/IndustrialGradeWorkbench.jsx'
import { gradeRulesToCsv, parseGradeRulesCsv } from './core/gradeRuleCsv.js'
import { exportIndustrialGradeCsv, parseIndustrialGradeCsv } from './core/industrialGradeCsv.js'
import { buildFabricMarkers, buildMarker } from './core/marker.js'
import {inspectIndustrialCadInterchange20261028} from './core/industrialCadRoundtripGate20261028.mjs'
import {inspectIndustrialMarkerCutWorkflow20261028} from './core/industrialMarkerCutWorkflow20261028.mjs'
import { parseDxfPatterns, projectToDxf } from './core/dxf.js'
import { inspectModarisNativeIntake20261028 } from './core/modarisNativeFormatIntake20261028.mjs'
import { CAD_FORMAT_AVAILABILITY_20261028 } from './core/cadFormatAvailability20261028.mjs'
import { buildMeasurementSizeRun, buildTechPack, measurementRunToCSV } from './core/measurements.js'
import { parseSeamlyMeasurements, applySeamlyMeasurements } from './core/seamlyMeasurements.js'
import { parseSeamlyConstructionReference } from './core/seamlyConstructionReference.js'
import SeamlyNativeEngineStudio20261023 from './components/SeamlyNativeEngineStudio20261023.jsx'
import { parseSeamlyUpstreamDxfReference } from './core/seamlyUpstreamDxfReference20261023.js'
import { createSeamlyAamaExoDraft20261023 } from './core/seamlyAamaToExoDraft20261023.js'
import { WORKSPACE_PROFILES, WORKSPACE_PROFILE_KEY, WORKSPACE_VIEW_KEY, VIEWPORT_LAYOUTS, normalizeWorkspaceProfile, patternFocusToolbarIds } from './core/workspaceProfiles.js'
import { indexWorkspaceCommands } from './core/workspaceCommandIndex.js'
import { buildFactoryPackageZip } from './core/factoryPackage.js'
import { downloadAccuMarkGuardedFactoryPackage20261023 } from './core/accumarkGuardedFactoryDownload20261023.js'
import { projectToBomXml } from './core/bomXml.js'
import { markerToPdf, markerToSvg } from './core/markerArtifacts.js'
import {prepareNativeProductionOrderRequest,summarizeNativeVerifiedOrder} from './core/nativeVerifiedProductionOrderClient20261029.js'
import { inspectProduction } from './core/productionPreflight.js'
import { inspectIndustrialPatterns } from './core/industrialPatternQA.js'
import { inspectGradedCutlines } from './core/industrialCutlineQA.js'
import {auditGradedSizeRunGeometry} from './core/gradedSizeRunGeometryAudit.js'
import {inspectGradedSeamJunctions,JEANS501_YOKE_JUNCTIONS} from './core/gradedSeamJunctionQA.js'
import {resolveGradePreviewSize} from './core/gradePreviewSize.js'
import { buildFabricCostRun } from './core/productionCost.js'
import { listSimulationBackends } from './core/backends/registry.js'
import { NATIVE_QUALITY_PROFILES } from './core/backends/nativePayload.js'
import { garmentCodeToProject, projectToGarmentCode } from './core/garmentCode.js'
import { assertGarmentCodeImportable } from './core/garmentCodeImportPreflight.js'
import { getNativeServiceHealth } from './core/backends/nativeServiceClient.js'
import { getPpfServiceHealth, getPpfJob, getPpfJobPreview, submitPpfFinalSolve } from './core/backends/ppfServiceClient.js'
import { generateFabricPbrFromImage } from './core/fabricPbrGenerator.js'
import { classifyFabricPbrFilename } from './core/fabricPbrFileNaming.js'

// First-fit tests use an isolated autosave slot; opening a test tee must never
// replace the user's previously saved jeans, hoodie, or other working garment.
const TEE_TEST_SESSION = new URLSearchParams(window.location.search).get('testSession') === 'tee'
// Public builds must not advertise optional private or unbundled avatar assets.
const PUBLIC_DISTRIBUTION = import.meta.env.VITE_PUBLIC_DISTRIBUTION === '1'
const STUDIO_SAVED_WORKSPACE_KEY='exo.savedDesignerWorkspace.v1'
const FABRIC_PRESET_GROUPS = groupApparelPresets(FABRIC_PRESETS)
const buttonValuesFromPreset = (preset,style=null) => ({
  name:preset?.name||'Custom Button',hardwarePresetId:preset?.id||'four-hole-shirt-button',
  diameterCm:(style?.widthMm??preset?.dimensionsMm.diameter??preset?.dimensionsMm.capDiameter??18)/10,
  widthMm:style?.widthMm??preset?.dimensionsMm.width??preset?.dimensionsMm.diameter??preset?.dimensionsMm.capDiameter??18,
  heightMm:style?.heightMm??preset?.dimensionsMm.height??preset?.dimensionsMm.diameter??preset?.dimensionsMm.capDiameter??18,
  thicknessMm:style?.thicknessMm??preset?.dimensionsMm.thickness??preset?.dimensionsMm.frontThickness??preset?.dimensionsMm.capHeight??2,
  weightGrams:preset?.dimensionsMm.weightGrams??1,
  holes:preset?.holes??0,holeDiameterMm:preset?.dimensionsMm.holeDiameter??1.4,
  holeSpacingMm:preset?.dimensionsMm.holeSpacing??4,
  color:style?.color??preset?.pbr.baseColor??'#222222',roughness:style?.roughness??preset?.pbr.roughness??.5,
  metalness:style?.metalness??preset?.pbr.metalness??0,reflectionIntensity:style?.reflectionIntensity??1,clearcoat:style?.clearcoat??.12,
  materialType:style?.materialType??preset?.material??'Custom',
  angleDeg:0,threadLengthMm:2,threadType:'Cross',threadColor:'#e5e5e5',
})
const zipperValuesFromPreset = preset => {
  const d=preset?.dimensionsMm||{}
  const isInvisible=preset?.zipperType==='invisible-coil'
  const isMetal=preset?.zipperType==='metal'
  return {
    name:preset?.name||'Zipper',hardwarePresetId:preset?.id||'coil-zipper-5',
    widthCm:(d.tapeWidthEachSide??14)/10,tapeWidthMm:d.tapeWidthEachSide??14,
    chainWidthMm:d.nominalChainWidth??5,tapeThicknessMm:0.55,
    toothPitchMm:isMetal?2.8:2.2,
    toothThicknessMm:isMetal?1.5:0.8,
    sliderWidthMm:d.sliderWidth??Math.max(5,(d.nominalChainWidth??5)*1.38),
    sliderLengthMm:d.sliderLength??Math.max(6,(d.nominalChainWidth??5)*1.85),
    sliderThicknessMm:1.8,
    pullerWidthMm:d.pullWidth??Math.max(4,(d.nominalChainWidth??5)*.84),
    pullerLengthMm:d.pullLength??Math.max(6,(d.nominalChainWidth??5)*2.7),
    pullerThicknessMm:0.8,stopperThicknessMm:1.65,
    weightGrams:d.weightGrams??undefined,
    type:preset?.zipperType||'coil',separating:Boolean(preset?.separating),
    offsetCm:0,startExtensionMm:0,endExtensionMm:0,
    twoWay:Boolean(preset?.twoWay),sliderFraction:1,bottomSliderFraction:0,fastened:true,openFrom:'end',
    tapeColor:isInvisible?'#d8d1c6':'#282c32',
    teethColor:isInvisible?'#d4cec5':isMetal?'#c29a58':(preset?.pbr.baseColor||'#899096'),
    sliderColor:isMetal?'#b99351':'#a4a9ae',pullerColor:isMetal?'#c4a164':'#b8bdc2',
    stopperColor:isMetal?'#b08b4c':'#7a8188',
    tapeMaterialType:'polyester',
    teethMaterialType:isMetal?'metal':'nylon',sliderMaterialType:'metal',
    metalness:preset?.pbr.metalness??0.65,roughness:preset?.pbr.roughness??0.38,
    tapeRoughness:.89,teethRoughness:isMetal?.28:.56,
    sliderRoughness:.27,pullerRoughness:.3,stopperRoughness:.33,
    reflectionIntensity:1,clearcoat:.12,tapeSheen:.55,
    color:preset?.pbr.baseColor||'#777777',
  }
}
const zipperCompatibleSeams=(project,pieceId,edgeIndex)=> (project?.seams||[]).filter(seam=>
  ['normal','zipper',undefined].includes(seam.type) && [seam.a,seam.b].some(edge=>edge?.pieceId===pieceId&&edge.edgeIndex===edgeIndex))
const syncPairedZipperSeam=(project,zipper)=>{
  const seam=(project.seams||[]).find(item=>item.id===zipper.pairedSeamId)
  if(!seam)return
  seam.type='zipper'
  seam.openFrom=zipper.openFrom||'end'
  const primaryOpen=zipper.fastened===false?1:1-Math.max(0,Math.min(1,Number(zipper.sliderFraction??1)))
  if(zipper.twoWay){
    const oppositeOpen=zipper.fastened===false?0:Math.max(0,Math.min(1,Number(zipper.bottomSliderFraction??0)))
    seam.openStartFraction=zipper.openFrom==='start'?primaryOpen:oppositeOpen
    seam.openEndFraction=zipper.openFrom==='start'?oppositeOpen:primaryOpen
    // Keep the original field as informational compatibility only. The Draft
    // physics solver consumes the two explicit ends when both exist.
    seam.openFraction=primaryOpen
  }else{
    delete seam.openStartFraction
    delete seam.openEndFraction
    seam.openFraction=primaryOpen
  }
}
const restoreZipperSeamIfUnused=(project,zipper)=>{
  if(!zipper?.pairedSeamId||zipper.pairedSeamPreviousType==='zipper')return
  const stillUsed=(project.pieces||[]).some(piece=>(piece.zippers||[]).some(item=>item.pairedSeamId===zipper.pairedSeamId&&item.id!==zipper.id))
  if(stillUsed)return
  const seam=(project.seams||[]).find(item=>item.id===zipper.pairedSeamId)
  if(seam?.type!=='zipper')return
  seam.type=zipper.pairedSeamPreviousType||'normal'
  delete seam.openFraction
  delete seam.openFrom
  delete seam.openStartFraction
  delete seam.openEndFraction
}
const AVAILABLE_AVATARS = PUBLIC_DISTRIBUTION ? [{ name: 'MakeHuman', model: 'makehuman-base' }] : [
  { name: 'CLO Thomas', model: 'clo-thomas' },
  { name: 'Theo', model: 'theo' },
  { name: 'Nora', model: 'nora' },
  { name: 'MakeHuman', model: 'makehuman-base' },
]
const HANGER_LIBRARY = [
  {id:'wood',name:'Tailored Wood Hanger',construction:'Imported Innerscene 3D shoulder-form GLB',finish:'Wood body · steel hook · source CC0'},
  {id:'trouser-clip',name:'Trouser Clip Rail',construction:'Imported Innerscene 3D clip-rail GLB',finish:'Brushed steel · wood · source CC0'},
]
const STAGE_LIBRARY = [
  {id:'studio',name:'Classic Studio',type:'Photographic studio',light:'Neutral key, bounced fill'},
  {id:'softbox',name:'Softbox',type:'Product photography',light:'Large diffused source'},
  {id:'neutral',name:'Neutral White',type:'White infinity backdrop',light:'Even color-reference lighting'},
  {id:'dramatic',name:'Dramatic Contrast',type:'Editorial presentation',light:'Directional key, dark fill'},
]
const FEATURED_STAGE_IDS = ['EXO01', 'R02', 'R03', 'S01', 'S10']
const OPTIONAL_AVATAR_URLS = {
  'clo-thomas': '/avatars/clo-thomas.glb',
  theo: '/avatars/opensew/theo.glb',
  nora: '/avatars/opensew/nora.glb',
}
const STORAGE_KEY = TEE_TEST_SESSION ? 'garment-studio-tee-first-fit-project-v2' : 'garment-studio-project-v1'
const BACKUP_STORAGE_KEY = `${STORAGE_KEY}-last-good`
let projectRestoreNotice = ''
let projectRestoreBlocked = false
const DESKTOP_THOMAS_BOOTSTRAP_KEY = TEE_TEST_SESSION ? 'garment-studio-tee-test-thomas-bootstrap-v1' : 'garment-studio-desktop-thomas-bootstrap-v1'
const MAX_HISTORY = 60
const SIMULATION_BACKENDS = listSimulationBackends()

const SECTIONS = ['Pattern', 'Sewing', 'Fabric', 'Avatar', 'Fit', 'Production', 'Render', 'Animation']
const STUDIO_COMMANDS = indexWorkspaceCommands(CLO_MENUS)

function loadProject() {
  try {
    const desktopThomas = !PUBLIC_DISTRIBUTION && new URLSearchParams(window.location.search).get('defaultAvatar') === 'clo-thomas'
    const restored = readSavedProject(localStorage, STORAGE_KEY, BACKUP_STORAGE_KEY)
    if (restored.status === 'failed') {
      projectRestoreBlocked = true
      projectRestoreNotice = `Saved project could not be restored (${restored.error}). Original data was preserved. Import a project or export the backup before saving.`
    }
    if (restored.status === 'backup') {
      projectRestoreBlocked = true
      projectRestoreNotice = `Recovered last good project backup. ${restored.error === 'Primary saved project is missing' ? 'The primary save was missing.' : 'The damaged original was preserved.'} Use Save to accept the recovered project.`
    }
    if (restored.project) {
      const parsed = restored.project
      if ((parsed.version || 1) < 21) {
        parsed.version = 21
        parsed.pieces = (parsed.pieces || []).map((piece) => ({
          ...piece,
          arrangement3d: {
            ...piece.arrangement3d,
            y: (piece.arrangement3d?.y ?? 0) < 0.7 ? 0.98 : piece.arrangement3d.y,
            z: Math.sign(piece.arrangement3d?.z || 1) * Math.min(0.255, Math.abs(piece.arrangement3d?.z || 0.245)),
            flip: piece.id === 'back' ? false : Boolean(piece.arrangement3d?.flip),
            wrap: piece.id === 'front' ? 'front' : piece.id === 'back' ? 'back' : piece.arrangement3d?.wrap,
          },
        }))
        parsed.simulation = {
          ...parsed.simulation,
          backendId: parsed.simulation?.backendId || 'browser-pbd',
          nativeQuality: parsed.simulation?.nativeQuality || (
            parsed.simulation?.nativeClothModel === 'strain-triangle' && parsed.simulation?.nativeBendingModel === 'isometric-xpbd'
              ? 'quality'
              : parsed.simulation?.nativeBendingModel === 'isometric-xpbd'
                ? 'balanced'
                : 'draft'
          ),
          nativeClothModel: parsed.simulation?.nativeClothModel || 'distance',
          nativeBendingModel: parsed.simulation?.nativeBendingModel || 'distance',
          autoFitTacks: parsed.simulation?.autoFitTacks !== false,
          substeps: Math.max(1, Math.min(4, Math.round(parsed.simulation?.substeps ?? 2))),
          resolution: Math.min(1, parsed.simulation?.resolution ?? 1),
          curveSegments: Math.max(2, Math.min(4, parsed.simulation?.curveSegments ?? 2)),
          collisions: parsed.simulation?.collisions !== false,
          selfCollision: parsed.simulation?.selfCollision !== false,
          selfCollisionMargin: parsed.simulation?.selfCollisionMargin ?? 0.002,
        }
        parsed.grading = {
          baseSize: parsed.grading?.baseSize || 'M',
          sizes: parsed.grading?.sizes?.length ? parsed.grading.sizes : ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
          widthPerSizeCm: parsed.grading?.widthPerSizeCm ?? 3,
          lengthPerSizeCm: parsed.grading?.lengthPerSizeCm ?? 1.2,
        }
        parsed.avatar = {
          ...parsed.avatar,
          armAngleDeg: parsed.avatar?.armAngleDeg ?? 6,
        }
        parsed.markerSettings = {
          fabricWidthCm: parsed.markerSettings?.fabricWidthCm ?? 150,
          gapCm: parsed.markerSettings?.gapCm ?? 1.5,
        }
        const defaults = createDefaultProject()
        const existingPieceIds = new Set((parsed.pieces || []).map((piece) => piece.id))
        for (const piece of defaults.pieces) {
          if (['sleeve-left', 'sleeve-right'].includes(piece.id) && !existingPieceIds.has(piece.id)) {
            parsed.pieces.push(cloneProject(piece))
          }
        }
        const existingSeamIds = new Set((parsed.seams || []).map((seam) => seam.id))
        for (const seam of defaults.seams) {
          if (seam.id.includes('sleeve-') && !existingSeamIds.has(seam.id)) parsed.seams.push(cloneProject(seam))
        }
        for (const defaultSeam of defaults.seams) {
          const currentSeam = parsed.seams.find((seam) => seam.id === defaultSeam.id)
          if (currentSeam && currentSeam.reverseB === undefined && defaultSeam.reverseB !== undefined) currentSeam.reverseB = defaultSeam.reverseB
        }
        for (const defaultPiece of defaults.pieces) {
          const currentPiece = parsed.pieces.find((piece) => piece.id === defaultPiece.id)
          if (currentPiece && !currentPiece.curves && defaultPiece.curves) currentPiece.curves = cloneProject(defaultPiece.curves)
          if (currentPiece && currentPiece.grainAngleDeg === undefined) currentPiece.grainAngleDeg = defaultPiece.grainAngleDeg ?? 0
          if (currentPiece && !currentPiece.notches?.length && defaultPiece.notches?.length) currentPiece.notches = cloneProject(defaultPiece.notches)
          if (currentPiece && !currentPiece.topstitches?.length && defaultPiece.topstitches?.length) currentPiece.topstitches = cloneProject(defaultPiece.topstitches)
          if (currentPiece && !currentPiece.bindings?.length && defaultPiece.bindings?.length) currentPiece.bindings = cloneProject(defaultPiece.bindings)
          if (currentPiece && currentPiece.simulationResolution === undefined && defaultPiece.simulationResolution !== undefined) currentPiece.simulationResolution = defaultPiece.simulationResolution
        }
        for (const piece of parsed.pieces || []) {
          if (piece.grainAngleDeg === undefined) piece.grainAngleDeg = 0
          piece.layerIndex = Math.max(0, Math.min(8, Math.round(piece.layerIndex || 0)))
          piece.notches = piece.notches || []
          piece.topstitches = piece.topstitches || []
          piece.bindings = piece.bindings || []
          piece.graphics = piece.graphics || []
          piece.zippers = piece.zippers || []
          piece.buttons = piece.buttons || []
          piece.buttonholes = piece.buttonholes || []
          piece.surfaceAttachments = piece.surfaceAttachments || []
          piece.cutQuantity = Math.max(1, Math.round(piece.cutQuantity || 1))
          piece.marker = piece.marker || { allowCrossGrain: false }
          piece.frozen3d = piece.frozen3d === true
          piece.active3d = piece.active3d !== false
        }
        parsed.fabrics = parsed.fabrics || { main: { ...FABRIC_PRESETS.fleece, id: 'main', name: 'Main Fabric' } }
        for (const [fabricId, fabricItem] of Object.entries(parsed.fabrics)) {
          fabricItem.id = fabricItem.id || fabricId
          fabricItem.name = fabricItem.name || (fabricId === 'main' ? 'Main Fabric' : fabricId)
        }
        const leftSleeve = parsed.pieces.find((piece) => piece.id === 'sleeve-left')
        const rightSleeve = parsed.pieces.find((piece) => piece.id === 'sleeve-right')
        if (leftSleeve?.arrangement3d) leftSleeve.arrangement3d.x = -0.285
        if (rightSleeve?.arrangement3d) rightSleeve.arrangement3d.x = 0.285
      }
      parsed.fasteners = parsed.fasteners || []
      parsed.customMeasurements = parsed.customMeasurements || []
      parsed.avatar = {
        ...createDefaultProject().avatar,
        ...(parsed.avatar || {}),
      }
      parsed.simulation = parsed.simulation || createDefaultProject().simulation
      parsed.simulation.wind = {
        enabled: Boolean(parsed.simulation.wind?.enabled),
        speed: parsed.simulation.wind?.speed ?? 4,
        directionDeg: parsed.simulation.wind?.directionDeg ?? 0,
        turbulence: parsed.simulation.wind?.turbulence ?? 0.18,
        response: parsed.simulation.wind?.response ?? 0.025,
      }
      // When opening a private desktop build containing the user's own CLO
      // export, select Thomas once without replacing or discarding the project.
      if (desktopThomas && !localStorage.getItem(DESKTOP_THOMAS_BOOTSTRAP_KEY)) {
        parsed.avatar = { ...parsed.avatar, name: 'CLO Thomas', model: 'clo-thomas' }
        localStorage.setItem(DESKTOP_THOMAS_BOOTSTRAP_KEY, '1')
      }
      if (PUBLIC_DISTRIBUTION && !['makehuman-base', 'custom-export'].includes(parsed.avatar?.model)) {
        parsed.avatar = { ...parsed.avatar, model: 'makehuman-base', name: 'MakeHuman' }
      }
      return validateSavedProject(parsed)
    }
  } catch (error) {
    console.warn('Could not restore garment project', error)
    projectRestoreBlocked = true
    projectRestoreNotice = `Project restoration failed (${error.message}). Existing saved data remains untouched until you explicitly save or import a project.`
  }
  const initial = TEE_TEST_SESSION ? createTemplateProject('tee') : createDefaultProject()
  if (!PUBLIC_DISTRIBUTION && new URLSearchParams(window.location.search).get('defaultAvatar') === 'clo-thomas') {
    initial.avatar = { ...initial.avatar, name: 'CLO Thomas', model: 'clo-thomas' }
    try { localStorage.setItem(DESKTOP_THOMAS_BOOTSTRAP_KEY, '1') } catch { /* private mode */ }
  }
  return initial
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value)))
}

function splitPieceEdgeInProject(next, pieceId, edgeIndex, t = 0.5) {
  const piece = next.pieces.find((item) => item.id === pieceId)
  if (!piece || piece.points.length < 2) return null
  const count = piece.points.length
  const a = piece.points[edgeIndex]
  const b = piece.points[(edgeIndex + 1) % count]
  if (!a || !b) return null
  const safeT = Math.max(0.05, Math.min(0.95, t))
  const oldCurves = { ...(piece.curves || {}) }
  const oldEdgeAllowances = { ...(piece.edgeSeamAllowances || {}) }
  const curve = oldCurves[edgeIndex]
  let inserted
  let leftControl = null
  let rightControl = null
  if (curve) {
    const q0 = {
      x: a.x + (curve.cx - a.x) * safeT,
      y: a.y + (curve.cy - a.y) * safeT,
    }
    const q1 = {
      x: curve.cx + (b.x - curve.cx) * safeT,
      y: curve.cy + (b.y - curve.cy) * safeT,
    }
    inserted = {
      x: q0.x + (q1.x - q0.x) * safeT,
      y: q0.y + (q1.y - q0.y) * safeT,
    }
    leftControl = { cx: q0.x, cy: q0.y }
    rightControl = { cx: q1.x, cy: q1.y }
  } else {
    inserted = {
      x: a.x + (b.x - a.x) * safeT,
      y: a.y + (b.y - a.y) * safeT,
    }
  }
  if (a.gradeRule?.enabled && b.gradeRule?.enabled) {
    inserted.gradeRule = {
      enabled: true,
      dxPerSize: Number(a.gradeRule.dxPerSize || 0) + (Number(b.gradeRule.dxPerSize || 0) - Number(a.gradeRule.dxPerSize || 0)) * safeT,
      dyPerSize: Number(a.gradeRule.dyPerSize || 0) + (Number(b.gradeRule.dyPerSize || 0) - Number(a.gradeRule.dyPerSize || 0)) * safeT,
    }
  }

  const splitArcFraction = closestEdgeFraction(piece, edgeIndex, inserted, 64)
  piece.points.splice(edgeIndex + 1, 0, inserted)

  const nextCurves = {}
  for (const [rawIndex, value] of Object.entries(oldCurves)) {
    const index = Number(rawIndex)
    if (index === edgeIndex) continue
    nextCurves[index > edgeIndex ? index + 1 : index] = value
  }
  if (leftControl) nextCurves[edgeIndex] = leftControl
  if (rightControl) nextCurves[edgeIndex + 1] = rightControl
  piece.curves = nextCurves
  const nextEdgeAllowances = {}
  for (const [rawIndex, value] of Object.entries(oldEdgeAllowances)) {
    const index = Number(rawIndex)
    if (index < edgeIndex) nextEdgeAllowances[index] = value
    else if (index > edgeIndex) nextEdgeAllowances[index + 1] = value
    else {
      nextEdgeAllowances[edgeIndex] = value
      nextEdgeAllowances[edgeIndex + 1] = value
    }
  }
  piece.edgeSeamAllowances = nextEdgeAllowances

  piece.notches = (piece.notches || []).map((notch) => {
    if (notch.edgeIndex < edgeIndex) return notch
    if (notch.edgeIndex > edgeIndex) return { ...notch, edgeIndex: notch.edgeIndex + 1 }
    const notchT = Math.max(0, Math.min(1, notch.t ?? 0.5))
    if (notchT <= splitArcFraction) return { ...notch, t: splitArcFraction > 0 ? notchT / splitArcFraction : 0 }
    return {
      ...notch,
      edgeIndex: edgeIndex + 1,
      t: (notchT - splitArcFraction) / Math.max(0.001, 1 - splitArcFraction),
    }
  })

  for (const collection of ['topstitches', 'bindings', 'zippers']) {
    const remapped = []
    for (const item of piece[collection] || []) {
      if (item.edgeIndex < edgeIndex) remapped.push(item)
      else if (item.edgeIndex > edgeIndex) remapped.push({ ...item, edgeIndex: item.edgeIndex + 1 })
      else {
        remapped.push({ ...item, edgeIndex })
        remapped.push({ ...item, id: uniqueId(`${collection}-split`), edgeIndex: edgeIndex + 1 })
      }
    }
    piece[collection] = remapped
  }

  const endpointRange = (endpoint) => {
    let start = clamp(Number(endpoint?.startT ?? 0), 0, 1)
    let end = clamp(Number(endpoint?.endT ?? 1), 0, 1)
    if (start > end) [start, end] = [end, start]
    return { start, end }
  }
  const rangedEndpoint = (endpoint, nextEdgeIndex, start, end) => {
    const result = { ...endpoint, edgeIndex: nextEdgeIndex }
    if (start <= 0.0001 && end >= 0.9999) {
      delete result.startT
      delete result.endT
    } else {
      result.startT = clamp(start, 0, 1)
      result.endT = clamp(end, 0, 1)
    }
    return result
  }
  const shiftedEndpoint = (endpoint) => (
    endpoint.pieceId === pieceId && endpoint.edgeIndex > edgeIndex
      ? { ...endpoint, edgeIndex: endpoint.edgeIndex + 1 }
      : { ...endpoint }
  )
  const splitLocalEndpoint = (endpoint) => {
    const { start, end } = endpointRange(endpoint)
    const split = splitArcFraction
    if (end <= split + 1e-6) {
      return { single: rangedEndpoint(endpoint, edgeIndex, start / Math.max(split, 1e-6), end / Math.max(split, 1e-6)) }
    }
    if (start >= split - 1e-6) {
      const denominator = Math.max(1e-6, 1 - split)
      return { single: rangedEndpoint(endpoint, edgeIndex + 1, (start - split) / denominator, (end - split) / denominator) }
    }
    const progress = (split - start) / Math.max(1e-6, end - start)
    return {
      progress: clamp(progress, 0, 1),
      low: rangedEndpoint(endpoint, edgeIndex, start / Math.max(split, 1e-6), 1),
      high: rangedEndpoint(endpoint, edgeIndex + 1, 0, (end - split) / Math.max(1e-6, 1 - split)),
    }
  }

  const remappedSeams = []
  const splitSeamGroups = new Map()
  for (const sourceSeam of next.seams || []) {
    const seam = cloneProject(sourceSeam)
    const aMatches = seam.a?.pieceId === pieceId && seam.a?.edgeIndex === edgeIndex
    const bMatches = seam.b?.pieceId === pieceId && seam.b?.edgeIndex === edgeIndex
    if (!aMatches && !bMatches) {
      seam.a = shiftedEndpoint(seam.a)
      seam.b = shiftedEndpoint(seam.b)
      remappedSeams.push(seam)
      continue
    }
    // Sewing one edge to itself is not a normal garment construction case;
    // keep it deterministic by remapping each endpoint independently rather
    // than multiplying the seam graph combinatorially.
    if (aMatches && bMatches) {
      const aSplit = splitLocalEndpoint(seam.a)
      const bSplit = splitLocalEndpoint(seam.b)
      seam.a = aSplit.single || aSplit.low
      seam.b = bSplit.single || bSplit.low
      remappedSeams.push(seam)
      continue
    }

    const side = aMatches ? 'a' : 'b'
    const otherSide = aMatches ? 'b' : 'a'
    const local = splitLocalEndpoint(seam[side])
    seam[otherSide] = shiftedEndpoint(seam[otherSide])
    if (local.single) {
      seam[side] = local.single
      remappedSeams.push(seam)
      continue
    }

    const other = seam[otherSide]
    const otherRange = endpointRange(other)
    const reverse = Boolean(seam.reverseB)
    const splitProgress = local.progress
    let firstOther
    let secondOther
    if (side === 'a') {
      const splitOther = reverse
        ? otherRange.end - (otherRange.end - otherRange.start) * splitProgress
        : otherRange.start + (otherRange.end - otherRange.start) * splitProgress
      firstOther = reverse
        ? rangedEndpoint(other, other.edgeIndex, splitOther, otherRange.end)
        : rangedEndpoint(other, other.edgeIndex, otherRange.start, splitOther)
      secondOther = reverse
        ? rangedEndpoint(other, other.edgeIndex, otherRange.start, splitOther)
        : rangedEndpoint(other, other.edgeIndex, splitOther, otherRange.end)
      seam.a = local.low
      seam.b = firstOther
      const second = { ...cloneProject(seam), id: uniqueId('seam-split'), name: `${sourceSeam.name || sourceSeam.id} · 2`, a: local.high, b: secondOther }
      remappedSeams.push(seam, second)
      splitSeamGroups.set(sourceSeam.id, [seam.id, second.id])
    } else {
      const progressAlongA = reverse ? 1 - splitProgress : splitProgress
      const safeProgress = clamp(progressAlongA, 0, 1)
      const splitOther = otherRange.start + (otherRange.end - otherRange.start) * safeProgress
      firstOther = rangedEndpoint(other, other.edgeIndex, otherRange.start, splitOther)
      secondOther = rangedEndpoint(other, other.edgeIndex, splitOther, otherRange.end)
      seam.a = firstOther
      seam.b = reverse ? local.high : local.low
      const second = { ...cloneProject(seam), id: uniqueId('seam-split'), name: `${sourceSeam.name || sourceSeam.id} · 2`, a: secondOther, b: reverse ? local.low : local.high }
      remappedSeams.push(seam, second)
      splitSeamGroups.set(sourceSeam.id, [seam.id, second.id])
    }
  }
  next.seams = remappedSeams

  if (splitSeamGroups.size) {
    const endpointContainsNotch = (endpoint, notchPieceId, notchEdgeIndex, notchT) => {
      if (!endpoint || endpoint.pieceId !== notchPieceId || endpoint.edgeIndex !== notchEdgeIndex) return false
      const { start, end } = endpointRange(endpoint)
      const tValue = clamp(Number(notchT ?? 0.5), 0, 1)
      return tValue >= start - 0.002 && tValue <= end + 0.002
    }
    const groups = new Map()
    for (const pattern of next.pieces || []) {
      for (const notch of pattern.notches || []) {
        if (!notch.matchGroupId || !notch.matchedSeamId || !splitSeamGroups.has(notch.matchedSeamId)) continue
        if (!groups.has(notch.matchGroupId)) groups.set(notch.matchGroupId, [])
        groups.get(notch.matchGroupId).push({ pattern, notch })
      }
    }
    for (const entries of groups.values()) {
      const sourceSeamId = entries[0]?.notch?.matchedSeamId
      const candidateIds = splitSeamGroups.get(sourceSeamId) || []
      const candidate = candidateIds
        .map((candidateId) => next.seams.find((item) => item.id === candidateId))
        .find((candidateSeam) => candidateSeam && entries.every(({ pattern, notch }) => (
          endpointContainsNotch(candidateSeam.a, pattern.id, notch.edgeIndex, notch.t) ||
          endpointContainsNotch(candidateSeam.b, pattern.id, notch.edgeIndex, notch.t)
        )))
      if (!candidate) continue
      for (const { notch } of entries) notch.matchedSeamId = candidate.id
    }
  }

  return { inserted, splitArcFraction }
}

function NumberField({ value, onChange, min, max, step = 1, suffix, ariaLabel }) {
  return (
    <label className="number-field">
      <input
        type="number"
        value={Number(value).toFixed(step < 1 ? 2 : 0).replace(/\.00$/, '')}
        min={min}
        max={max}
        step={step}
        aria-label={ariaLabel}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      {suffix && <span>{suffix}</span>}
    </label>
  )
}

function SliderRow({ label, value, min, max, step, onChange, display }) {
  return (
    <div className="control-row slider-row">
      <div className="control-label"><span>{label}</span><strong>{display ?? value}</strong></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </div>
  )
}

function MiniStat({ label, value }) {
  return <div className="mini-stat"><span>{label}</span><strong>{value}</strong></div>
}

function mirroredEdgeIndex(edgeIndex, edgeCount) {
  return (edgeCount - 2 - Number(edgeIndex) + edgeCount) % edgeCount
}

function seamRange(endpoint) {
  let start = clamp(Number(endpoint?.startT ?? 0), 0, 1)
  let end = clamp(Number(endpoint?.endT ?? 1), 0, 1)
  if (start > end) [start, end] = [end, start]
  return { start, end, span: Math.max(1e-6, end - start) }
}

function seamFractionAtProgress(seam, side, progress) {
  const q = clamp(progress, 0, 1)
  const range = seamRange(seam?.[side])
  if (side === 'b' && seam?.reverseB) return range.end - range.span * q
  return range.start + range.span * q
}

function mapFractionAcrossSeam(seam, fromSide, fraction) {
  const sourceRange = seamRange(seam?.[fromSide])
  const naturalProgress = clamp((Number(fraction) - sourceRange.start) / sourceRange.span, 0, 1)
  const seamProgress = fromSide === 'b' && seam?.reverseB ? 1 - naturalProgress : naturalProgress
  const targetSide = fromSide === 'a' ? 'b' : 'a'
  return seamFractionAtProgress(seam, targetSide, seamProgress)
}

function buildLinkedMirror(source, target) {
  if (!source?.points?.length || !target) return target
  const xs = source.points.map((point) => point.x)
  const centerX = (Math.min(...xs) + Math.max(...xs)) * 0.5
  const edgeCount = source.points.length
  const mirrorPoint = (point) => ({ ...point, x: centerX - (point.x - centerX) })
  const keep = {
    id: target.id,
    name: target.name,
    layout2d: cloneProject(target.layout2d),
    arrangement3d: cloneProject(target.arrangement3d),
    linkedMirrorSourceId: source.id,
  }
  const next = cloneProject(source)
  Object.assign(next, keep)
  next.points = source.points.map(mirrorPoint).reverse()
  next.curves = source.curves
    ? Object.fromEntries(Object.entries(source.curves).map(([edgeIndex, curve]) => [
      mirroredEdgeIndex(edgeIndex, edgeCount),
      { cx: centerX - (curve.cx - centerX), cy: curve.cy },
    ]))
    : undefined
  next.internalLines = (source.internalLines || []).map((line) => ({
    ...cloneProject(line),
    id: `${target.id}-${line.id}`,
    a: mirrorPoint(line.a),
    b: mirrorPoint(line.b),
  }))
  next.pins = (source.pins || []).map((pin) => ({ ...cloneProject(pin), id: `${target.id}-${pin.id}`, x: centerX - (pin.x - centerX) }))
  next.buttons = (source.buttons || []).map((button) => ({ ...cloneProject(button), id: `${target.id}-${button.id}`, x: centerX - (button.x - centerX) }))
  next.buttonholes = (source.buttonholes || []).map((buttonhole) => ({
    ...cloneProject(buttonhole),
    id: `${target.id}-${buttonhole.id}`,
    x: centerX - (buttonhole.x - centerX),
    orientationDeg: -(buttonhole.orientationDeg || 0),
  }))
  next.graphics = (source.graphics || []).map((graphic) => ({
    ...cloneProject(graphic),
    id: `${target.id}-${graphic.id}`,
    x: centerX - (graphic.x - centerX),
    rotationDeg: -(graphic.rotationDeg || 0),
  }))
  next.foamPads = (source.foamPads || []).map(pad=>({
    ...cloneProject(pad),
    id:`${target.id}-${pad.id}`,
    x:centerX-(Number(pad.x||0)-centerX),
    rotationDeg:-(Number(pad.rotationDeg)||0),
    points:(pad.points||[]).map(point=>({...point,x:-point.x})).reverse(),
  }))
  next.notches = (source.notches || []).map((notch) => ({
    ...cloneProject(notch),
    id: `${target.id}-${notch.id}`,
    edgeIndex: mirroredEdgeIndex(notch.edgeIndex, edgeCount),
    t: 1 - (notch.t ?? 0.5),
  }))
  for (const collection of ['topstitches', 'bindings', 'zippers']) {
    next[collection] = (source[collection] || []).map((item) => ({
      ...cloneProject(item),
      id: `${target.id}-${item.id}`,
      edgeIndex: mirroredEdgeIndex(item.edgeIndex, edgeCount),
    }))
  }
  next.grainAngleDeg = -(source.grainAngleDeg || 0)
  return next
}

function syncLinkedMirrors(project) {
  const pieces = project.pieces || []
  const sources = new Map(pieces.map((piece) => [piece.id, piece]))
  project.pieces = pieces.map((piece) => {
    if (!piece.linkedMirrorSourceId) return piece
    const source = sources.get(piece.linkedMirrorSourceId)
    return source ? buildLinkedMirror(source, piece) : { ...piece, linkedMirrorSourceId: undefined }
  })
}

function imageFileToDataUrl(file, maxDimension = 1024) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read image file'))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error('Unsupported image file'))
      image.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight))
        const width = Math.max(1, Math.round(image.naturalWidth * scale))
        const height = Math.max(1, Math.round(image.naturalHeight * scale))
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext('2d')
        context.clearRect(0, 0, width, height)
        context.drawImage(image, 0, 0, width, height)
        resolve({
          src: canvas.toDataURL('image/png'),
          sourceWidth: image.naturalWidth,
          sourceHeight: image.naturalHeight,
        })
      }
      image.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

export default function App() {
  // The hybrid reuses the *entire* real EXO chrome, including original menus,
  // asset library, both tool rails, object browser and property editor. Only
  // the dual 3D/2D center is replaced with the native ClothCraft workspace.
  const clothcraftHybrid = new URLSearchParams(window.location.search).get('engine') === 'clothcraft'
  const appAutomationHandlersRef = useRef({})
  const [studioCustomization,setStudioCustomization] = useState(loadStudioCustomization)
  const lastAutoThemeRef=useRef(null)
  useEffect(()=>{
    const media=window.matchMedia?.('(prefers-color-scheme: dark)')
    const refresh=()=>{
      const selected=resolveScheduledTheme(loadThemeSchedule(),{prefersDark:media?.matches===true,now:new Date()})
      if(!selected){lastAutoThemeRef.current=null;return}
      const key=`${selected.scheme}:${selected.themeId}`
      if(lastAutoThemeRef.current===key)return
      lastAutoThemeRef.current=key
      setStudioCustomization(previous=>selected.preset
        ?applySavedThemePreset(previous,selected.preset)
        :previous.appearance.theme===selected.themeId?previous:
          normalizeStudioCustomization({...previous,appearance:{...previous.appearance,theme:selected.themeId}}))
    }
    refresh()
    const minute=window.setInterval(refresh,60_000)
    const changed=()=>refresh()
    media?.addEventListener?.('change',changed)
    window.addEventListener('visibilitychange',changed)
    window.addEventListener('exo-theme-schedule-changed',changed)
    window.addEventListener('storage',changed)
    return ()=>{window.clearInterval(minute);media?.removeEventListener?.('change',changed);window.removeEventListener('visibilitychange',changed);window.removeEventListener('exo-theme-schedule-changed',changed);window.removeEventListener('storage',changed)}
  },[])
  const [previewStudioTheme,setPreviewStudioTheme] = useState(null)
  const [previewIconColor,setPreviewIconColor]=useState(null)
  const [previewTwoDPalette,setPreviewTwoDPalette]=useState(null)
  const [previewTwoDPattern,setPreviewTwoDPattern]=useState(null)
  const [previewGradeChartThemes,setPreviewGradeChartThemes]=useState({values:null,compare:null})
  const previewGradeChart=useCallback((kind,preset)=>{
    if(!['values','compare'].includes(kind))return
    setPreviewGradeChartThemes(previous=>previous[kind]===preset?previous:{...previous,[kind]:preset})
  },[])
  const gradeChartThemeVars=useMemo(()=>Object.fromEntries(['values','compare'].flatMap(kind=>{
    const themes=resolveExoGradeChartThemes20261028(
      studioCustomization.preferences,
      studioResolvedPalette(previewStudioTheme||studioCustomization.appearance.theme,studioCustomization.appearance.panelFinish),
      previewGradeChartThemes)
    const preset=themes[kind]
    return [['paper','paper'],['header','header'],['stripe','stripe'],['line','line'],
      ['ink','ink'],['muted','muted'],['selected','selected'],['field','field']]
      .map(([role,key])=>[`--exo-${kind}-chart-${role}`,preset[key]])
  })),[previewGradeChartThemes,studioCustomization.preferences,previewStudioTheme,studioCustomization.appearance.theme,studioCustomization.appearance.panelFinish])
  const [themeHoveredTarget,setThemeHoveredTarget] = useState(null)
  const [themePickRequestedKey,setThemePickRequestedKey] = useState(null)
  const [themePickFocusKey,setThemePickFocusKey] = useState(null)
  const appearancePalette=useMemo(()=>studioResolvedPalette(previewStudioTheme||studioCustomization.appearance.theme,studioCustomization.appearance.panelFinish),[previewStudioTheme,studioCustomization.appearance.theme,studioCustomization.appearance.panelFinish])
  const [rustThemeReady,setRustThemeReady] = useState(rustThemeKernelReady)
  useEffect(()=>{
    let mounted=true
    void initializeRustThemeKernel().then(ready=>{if(mounted)setRustThemeReady(ready)})
    return ()=>{mounted=false}
  },[])
  const rustThemeTokens=useMemo(()=>rustThemeReady?rustThemeColorTokens(
    studioCustomization.appearance,studioCustomization.preferences,
    appearancePalette.textColor
  ):null,[rustThemeReady,studioCustomization,appearancePalette.textColor])
  const interfaceColorTokens=useMemo(()=>{
    if(!rustThemeTokens)return null
    const a=studioCustomization.appearance
    const ink=rustThemeTokens['--exo-interface-ink']
    const brightness=a.interfaceBrightness??1
    const autoContrast=a.autoContrast!==false
    const readable=(fore,bg)=>readableUiInk(fore,bg,{brightness,autoContrast})
    const libraryBg=a.panelLibraryColor!=='auto'?rustThemeTokens['--exo-library-panel-color']:appearancePalette.sidebarColor
    const objectBg=a.panelObjectBrowserColor!=='auto'?rustThemeTokens['--exo-object-panel-color']:appearancePalette.panelColor
    const leftBg=a.leftRailColor!=='auto'?rustThemeTokens['--exo-left-rail-color']:appearancePalette.sidebarColor
    const rightBg=a.rightRailColor!=='auto'?rustThemeTokens['--exo-right-rail-color']:appearancePalette.sidebarColor
    const inherited=a.panelTextInheritsGlobal!==false?ink:appearancePalette.textColor
    return {
      '--exo-interface-ink':readable(ink,appearancePalette.panelColor),
      '--exo-library-text-ink':readable(inherited,libraryBg),
      '--exo-object-text-ink':readable(inherited,objectBg),
      '--exo-left-rail-ink':readable(inherited,leftBg),
      '--exo-right-rail-ink':readable(inherited,rightBg),
      '--exo-library-panel-icon-ink':readable(a.libraryIconColor!=='auto'?rustThemeTokens['--exo-library-icon-color']:inherited,libraryBg),
      '--exo-object-panel-icon-ink':readable(a.objectBrowserIconColor!=='auto'?rustThemeTokens['--exo-object-icon-color']:inherited,objectBg),
      '--exo-ui-icon-ink':readable(a.globalToolbarIconColor!=='auto'?rustThemeTokens['--exo-ui-icon-ink']:ink,appearancePalette.sidebarColor),
      '--exo-2d-horizontal-ink':readable(rustThemeTokens['--exo-2d-horizontal-ink'],studioCustomization.preferences.twoDCanvasColor!=='auto'?rustThemeTokens['--exo-2d-canvas-color']:'#c6c7c9'),
      '--exo-2d-vertical-ink':readable(rustThemeTokens['--exo-2d-vertical-ink'],studioCustomization.preferences.twoDCanvasColor!=='auto'?rustThemeTokens['--exo-2d-canvas-color']:'#c6c7c9'),
      '--exo-3d-horizontal-ink':readable(rustThemeTokens['--exo-3d-horizontal-ink'],'#2a343f'),
      '--exo-3d-vertical-ink':readable(rustThemeTokens['--exo-3d-vertical-ink'],'#2a343f'),
    }
  },[rustThemeTokens,appearancePalette,studioCustomization.appearance,studioCustomization.preferences.twoDCanvasColor])
  const rustUiPreferences=useMemo(()=>({
    ...studioCustomization.preferences,
    twoDAutoContrast:studioCustomization.preferences.twoDAutoContrast!==false,
    twoDCanvasTheme:previewTwoDPalette?.theme??studioCustomization.preferences.twoDCanvasTheme,
    twoDCanvasColor:previewTwoDPalette
      ?previewTwoDPalette.canvas
      :rustThemeTokens && studioCustomization.preferences.twoDCanvasColor!=='auto'
      ?rustThemeTokens['--exo-2d-canvas-color']:'auto',
    twoDGridColor:previewTwoDPalette
      ?previewTwoDPalette.grid
      :rustThemeTokens && studioCustomization.preferences.twoDGridColor!=='auto'
      ?rustThemeTokens['--exo-2d-grid-color']:'auto',
    twoDGridStyle:previewTwoDPalette?.style??studioCustomization.preferences.twoDGridStyle,
    exoGradeChartThemes:resolveExoGradeChartThemes20261028(
      studioCustomization.preferences,appearancePalette,previewGradeChartThemes),
    ...(previewTwoDPattern?.point?{twoDPointColor:previewTwoDPattern.point}:{}),
    ...(previewTwoDPattern?.edge?{twoDEdgeColor:previewTwoDPattern.edge}:{}),
    ...(previewTwoDPattern?.selection?{twoDSelectionColor:previewTwoDPattern.selection}:{}),
    ...(previewTwoDPattern?.notch?{twoDNotchColor:previewTwoDPattern.notch}:{}),
    ...(previewTwoDPattern?.paper?{twoDPatternColor:previewTwoDPattern.paper}:{}),
    twoDPatternSurfaceStyle:resolveExoPatternCrystalSurface20261029(
      studioCustomization.appearance,studioCustomization.preferences,previewTwoDPattern),
    twoDRulerMarkColor:rustThemeTokens && studioCustomization.preferences.twoDRulerMarkColor!=='auto'
      ?rustThemeTokens['--exo-2d-ruler-mark-color']:'auto',
    twoDRulerGlassColor:rustThemeTokens && studioCustomization.preferences.twoDRulerGlassColor!=='auto'
      ?rustThemeTokens['--exo-2d-ruler-glass-color']:'auto',
    twoDRulerGlow:!!rustThemeTokens&&rustThemeGlowEnabled(studioCustomization.preferences.twoDRulerGlow),
  }),[studioCustomization.preferences,rustThemeTokens,previewTwoDPalette,previewTwoDPattern,previewGradeChartThemes,appearancePalette])
  const themeContrastAudit=useMemo(()=>{
    const a=studioCustomization.appearance,p=studioCustomization.preferences
    const palette=appearancePalette
    const canvas=p.twoDCanvasColor!=='auto'?p.twoDCanvasColor:p.twoDCanvasTheme==='accumark-green'?'#174e39':'#c6c7c9'
    const drafting=cadAutoContrastColors({canvas,paper:p.twoDPatternColor,grid:p.twoDGridColor,edge:p.twoDEdgeColor,
      point:p.twoDPointColor,selection:p.twoDSelectionColor,notch:p.twoDNotchColor,ruler:p.twoDRulerMarkColor})
    const auto=p.twoDAutoContrast!==false
    const display=(adaptive,chosen,defaultColor)=>auto?adaptive:(chosen&&chosen!=='auto'?chosen:defaultColor)
    const libraryBg=a.panelLibraryColor!=='auto'?a.panelLibraryColor:palette.sidebarColor
    const objectBg=a.panelObjectBrowserColor!=='auto'?a.panelObjectBrowserColor:palette.panelColor
    const cases=[
      ['Library text and icons',interfaceColorTokens?.['--exo-library-text-ink']||palette.textColor,libraryBg],
      ['Object Browser text and icons',interfaceColorTokens?.['--exo-object-text-ink']||palette.textColor,objectBg],
      ['2D rulers and measurements',display(drafting.ruler,p.twoDRulerMarkColor,'#34434d'),canvas],
      ['2D pattern outlines',display(drafting.edge,p.twoDEdgeColor,'#293642'),drafting.patternPaper],
      ['Selected grading lines',display(drafting.gradeMain,p.twoDSelectionColor,'#c06d12'),canvas],
      ['Base grading lines',display(drafting.gradeBase,p.twoDEdgeColor,'#284f6c'),canvas],
      ['Pattern points',display(drafting.point,p.twoDPointColor,'#9d5a24'),drafting.patternPaper],
      ['Pattern notches',display(drafting.notch,p.twoDNotchColor,'#ac2940'),drafting.patternPaper],
    ]
    return cases.map(([label,foreground,background])=>({label,foreground,background,ratio:contrastRatio(foreground,background),pass:contrastRatio(foreground,background)>=4.5}))
  },[studioCustomization,appearancePalette,interfaceColorTokens])
  const fixThemeContrast=useCallback(()=>setStudioCustomization(prev=>normalizeStudioCustomization({...prev,appearance:{...prev.appearance,autoContrast:true},preferences:{...prev.preferences,twoDAutoContrast:true}})),[])
  const hadStoredStudioCustomization=useRef((()=>{
    try{return Boolean(localStorage.getItem(STUDIO_CUSTOMIZATION_KEY))}catch{return false}
  })())
  const [studioSettingsOpen,setStudioSettingsOpen] = useState(false)
  const [studioSettingsTab,setStudioSettingsTab] = useState('workspace')
  const closeStudioSettings=useCallback(()=>{setPreviewStudioTheme(null);setThemeHoveredTarget(null);setStudioSettingsOpen(false)},[])
  const beginThemePick=useCallback(key=>{setPreviewStudioTheme(null);setThemeHoveredTarget(null);setThemePickRequestedKey(key||'globalToolbarIconColor');setStudioSettingsOpen(false)},[])
  const pickThemePart=useCallback(event=>{
    if(!themePickRequestedKey)return
    const target=event.target
    if(target?.closest?.('.exo-theme-pick-cancel')){setThemePickRequestedKey(null);return}
    const closest=(selector)=>Boolean(target?.closest?.(selector))
    let key=themePickRequestedKey
    if(closest('.cc-board .cc-v2-board-orientation,.pattern-editor-shell .cc-v2-board-orientation'))key='twoDViewerHorizontalColor'
    else if(closest('.cc-viewport-2d .clo-corner-toolkit,.cc-board .clo-corner-toolkit,.pattern-editor-shell .clo-corner-toolkit'))key='twoDViewerVerticalColor'
    else if(closest('.cc-viewport-3d .cc-v2-orientation,.cc-scene .cc-v2-orientation'))key='threeDViewerHorizontalColor'
    else if(closest('.cc-viewport-3d .clo-corner-toolkit,.cc-scene .clo-corner-toolkit'))key='threeDViewerVerticalColor'
    else if(closest('.asset-browser,.clo-library-top,.clo-library-search'))key='panelLibraryColor'
    else if(closest('.clo-object-browser,.clo-inspector,.clo-property-panel'))key='panelObjectBrowserColor'
    else if(closest('.tool-rail,.clo-left-3d-column'))key='leftRailColor'
    else if(closest('.clo-right-tool-palette,.clo-right-tool-grid'))key='rightRailColor'
    event.preventDefault();event.stopPropagation()
    setThemePickRequestedKey(null);setThemePickFocusKey(key)
    setStudioSettingsTab('theme');setStudioSettingsOpen(true)
  },[themePickRequestedKey])
  useEffect(()=>{saveStudioCustomization(studioCustomization)},[studioCustomization])
  const [project, setProject] = useState(loadProject)
  const [techPackOpen,setTechPackOpen]=useState(()=>new URLSearchParams(window.location.search).get('techpack')==='1')
  const [techPackWorkspaceOpen,setTechPackWorkspaceOpen]=useState(()=>new URLSearchParams(window.location.search).get('techpackWorkspace')==='1')
  const [nativeTechPackSnapshot,setNativeTechPackSnapshot]=useState(null)
  const [nativeTechPackDraft,setNativeTechPackDraft]=useState(null)
  const [nativeTechPackLoading,setNativeTechPackLoading]=useState(false)
  const [nativeTechPackSaveError,setNativeTechPackSaveError]=useState('')
  const [techPackInitialTab,setTechPackInitialTab]=useState('traditional')
  const techPackPrintableHTML=useMemo(()=>{
    if(!techPackOpen)return ''
    try{return buildTraditionalTechPackHTML(project,project.techPackStudio)}
    catch(error){console.warn('Tech Pack document preview unavailable',error);return ''}
  },[project,techPackOpen])
  const [fileLibraryOpen,setFileLibraryOpen] = useState(false)
  const [fileLibraryStartSave,setFileLibraryStartSave] = useState(false)
  const [fileLibraryEntries,setFileLibraryEntries] = useState([])
  const [fileLibraryCollections,setFileLibraryCollections] = useState([])
  const [fileLibraryCurrentId,setFileLibraryCurrentId] = useState('')
  const [fileLibraryError,setFileLibraryError] = useState('')
  const [fileLibraryLoading,setFileLibraryLoading] = useState(false)
  const [fileCollaboration,setFileCollaboration] = useState({online:false,profile:null,teams:[],projects:[],shares:[],comments:[],presence:[],members:[],revisionHistory:[],activity:[],activeTeamId:'',selectedLocalId:'',error:''})
  const collaborationRoomAbort=useRef(null)
  const collaborationRoomId=useRef('')
  const collaborationSessionId=useRef('')
  const sewingConstructionAudit = useMemo(() => auditSewingConstruction(project), [project])
  const [selectedPieceId, setSelectedPieceId] = useState('front')
  const [activeSection, setActiveSection] = useState('Pattern')
  const [patternFocusActive, setPatternFocusActive] = useState(() => { try { return localStorage.getItem('exo.patternFocusWorkspace.v1') === 'true' } catch { return false } })
  const patternFocusReturnRef = useRef(null)
  useEffect(() => { try { localStorage.setItem('exo.patternFocusWorkspace.v1', String(patternFocusActive)) } catch {} }, [patternFocusActive])
  const [tool, setTool] = useState('select')
  // Floating CLO-style tool controls belong to the workspace session, not the
  // saved garment document. Both dialogs can remain open while the tool changes.
  const [activeFinishingTool,setActiveFinishingTool] = useState(null)
  useEffect(()=>{
    const onGradingClosed=()=>setTool(current=>['grading-edit','grading-auto'].includes(current)?'select':current)
    window.addEventListener('exo-clothcraft-grading-panel-closed',onGradingClosed)
    return ()=>window.removeEventListener('exo-clothcraft-grading-panel-closed',onGradingClosed)
  },[])
  // Selected flat fabric starts with an on-garment unified XYZ + rotation
  // gizmo, not a camera-orientation circle floating in the corner.
  const [viewportTool, setViewportTool] = useState('transform')
  // 3D mesh inspection is intentionally a non-destructive selection mode.
  // Unlike physical cloth editing it doesn't alter the pattern or solver.
  const [meshSelection, setMeshSelection] = useState(null)
  const [showSewingGuides, setShowSewingGuides] = useState(true)
  const [arrangementSpread, setArrangementSpread] = useState(0)
  const [assetCategory, setAssetCategory] = useState('Garment')
  const [libraryFolder,setLibraryFolder] = useState('all')
  const [librarySearch, setLibrarySearch] = useState('')
  const [libraryThumbnails, setLibraryThumbnails] = useState(true)
  const [objectTab, setObjectTab] = useState('Scene')
  const [openMenu, setOpenMenu] = useState(null)
  useEffect(()=>{
    if(!openMenu)return
    const closeOutside=event=>{if(!event.target.closest?.('.clo-menu-group'))setOpenMenu(null)}
    const closeOnEscape=event=>{if(event.key==='Escape')setOpenMenu(null)}
    document.addEventListener('pointerdown',closeOutside)
    document.addEventListener('keydown',closeOnEscape)
    return()=>{
      document.removeEventListener('pointerdown',closeOutside)
      document.removeEventListener('keydown',closeOnEscape)
    }
  },[openMenu])
  const [simulationMenuOpen, setSimulationMenuOpen] = useState(false)
  const [leftSimulationMenuOpen, setLeftSimulationMenuOpen] = useState(false)
  const [animationWorkspaceActive, setAnimationWorkspaceActive] = useState(false)
  const [printLayoutActive, setPrintLayoutActive] = useState(false)
  const [animationPlaying, setAnimationPlaying] = useState(false)
  const animationReturnLayoutRef = useRef('split')
  const animationReturnSectionRef = useRef('Pattern')
  const focusReturnPanelsRef = useRef(null)
  const focusWorkspace = (kind) => {
    setTechPackWorkspaceOpen(false)
    if (!animationWorkspaceActive && !printLayoutActive) {
      animationReturnLayoutRef.current = viewportLayout
      animationReturnSectionRef.current = activeSection
      focusReturnPanelsRef.current = {libraryVisible,inspectorVisible,leftToolsCollapsed,rightToolsCollapsed,showObjectBrowser,objectTab}
    }
    if (visibleRunning) simForVisibleEngine()
    if (animationWorkspaceActive && kind !== 'animation') window.dispatchEvent(new Event('exo-clothcraft-animation-stop'))
    setAnimationPlaying(false)
    setAnimationWorkspaceActive(kind === 'animation')
    setPrintLayoutActive(kind === 'print')
    setLibraryVisible(false)
    setInspectorVisible(kind === 'print')
    setLeftToolsCollapsed(true)
    setRightToolsCollapsed(true)
    setViewportLayout(kind === 'print' ? 'split' : '3d')
    if(kind === 'print') {
      setShowObjectBrowser(false)
      setObjectTab('Fabric')
    }
    setActiveSection(kind === 'animation' ? 'Animation' : 'Production')
    setLeftSimulationMenuOpen(false)
    setSimulationMenuOpen(false)
  }
  const enterAnimationWorkspace = () => {
    focusWorkspace('animation')
  }
  const enterPrintLayoutWorkspace = () => focusWorkspace('print')
  const enterTechPackWorkspace = () => {
    if (printLayoutActive || animationWorkspaceActive) exitFocusedWorkspace()
    setTechPackOpen(false)
    setTechPackWorkspaceOpen(true)
    setSimulationMenuOpen(false)
    setLeftSimulationMenuOpen(false)
    setOpenMenu(null)
    setLibraryVisible(true)
    setInspectorVisible(true)
    setShowObjectBrowser(true)
    setLeftToolsCollapsed(false)
    setRightToolsCollapsed(false)
    setSidebarView('library')
    if(clothcraftHybrid)window.dispatchEvent(new Event('exo-clothcraft-techpack-request'))
  }
  const exitFocusedWorkspace = () => {
    setAnimationWorkspaceActive(false)
    setPrintLayoutActive(false)
    setAnimationPlaying(false)
    setViewportLayout(animationReturnLayoutRef.current)
    setActiveSection(animationReturnSectionRef.current)
    if (focusReturnPanelsRef.current) {
      const {libraryVisible,inspectorVisible,leftToolsCollapsed,rightToolsCollapsed,showObjectBrowser,objectTab} = focusReturnPanelsRef.current
      setLibraryVisible(libraryVisible)
      setInspectorVisible(inspectorVisible)
      setLeftToolsCollapsed(leftToolsCollapsed)
      setRightToolsCollapsed(rightToolsCollapsed)
      setShowObjectBrowser(showObjectBrowser)
      setObjectTab(objectTab)
    }
    focusReturnPanelsRef.current = null
    setLeftSimulationMenuOpen(false)
    window.dispatchEvent(new Event('exo-clothcraft-animation-stop'))
  }
  const exitAnimationWorkspace = exitFocusedWorkspace
  useEffect(()=>{
    const update=event=>setAnimationPlaying(Boolean(event.detail?.playing))
    window.addEventListener('exo-clothcraft-animation-playback',update)
    return()=>window.removeEventListener('exo-clothcraft-animation-playback',update)
  },[])
  const [show2DGrid, setShow2DGrid] = useState(true)
  const [show2DSeams, setShow2DSeams] = useState(false)
  const [layout2DSignal, setLayout2DSignal] = useState(0)
  const [compactTools, setCompactTools] = useState(false)
  const [leftToolsCollapsed,setLeftToolsCollapsed] = useState(false)
  const [rightToolsCollapsed,setRightToolsCollapsed] = useState(false)
  // Restore the original full Object Browser rather than honoring a stale saved
  // collapsed setting from previous layout experiments.
  const [showObjectBrowser, setShowObjectBrowser] = useState(true)
  const [libraryVisible, setLibraryVisible] = useState(true)
  const [inspectorVisible, setInspectorVisible] = useState(true)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [viewportLayout, setViewportLayout] = useState(() => {
    try {
      const value = JSON.parse(localStorage.getItem(WORKSPACE_VIEW_KEY) || '{}').layout
      // A previous drafting-only session must not reopen with the entire 3D
      // viewport missing. The 2D-only focus still works when chosen explicitly.
      return value === '2d' ? 'split' : Object.hasOwn(VIEWPORT_LAYOUTS, value) ? value : 'split'
    } catch { return 'split' }
  })
  const prior2DModeRef = useRef(false)
  const [viewportSplit, setViewportSplit] = useState(() => {
    try {
      const value = Number(JSON.parse(localStorage.getItem(WORKSPACE_VIEW_KEY) || '{}').split ?? 50)
      return Number.isFinite(value) ? clamp(value, 20, 80) : 50
    } catch { return 50 }
  })
  // viewportLayout must be initialized before the transition effect is evaluated.
  useEffect(()=>{
    const in2D=viewportLayout==='2d'||patternFocusActive
    // Apply the compact 2D starting layout only on entry. Subsequent renders
    // must respect a user's manual expansion of the inspector.
    if(in2D&&!prior2DModeRef.current){setShowObjectBrowser(true);setRightToolsCollapsed(false);setInspectorVisible(false)}
    prior2DModeRef.current=in2D
  },[viewportLayout,patternFocusActive])
  useEffect(()=>{
    if(!clothcraftHybrid)return
    const onGraphicPicked=()=>{
      setObjectTab('Graphic')
      setActiveSection('Fabric')
      setShowObjectBrowser(true)
      // 2D graphics can be selected and dragged without opening the inspector.
      if(viewportLayout!=='2d'&&!patternFocusActive)setInspectorVisible(true)
    }
    window.addEventListener('exo-clothcraft-graphic-picked',onGraphicPicked)
    return()=>window.removeEventListener('exo-clothcraft-graphic-picked',onGraphicPicked)
  },[clothcraftHybrid,viewportLayout,patternFocusActive])
  const collapsed3DReturnLayoutRef = useRef('split')
  const collapse3DForPatterns = () => {
    if (viewportLayout === '2d') return
    collapsed3DReturnLayoutRef.current = viewportLayout
    setViewportLayout('2d')
    setActiveSection('Production')
    setObjectTab('Grading')
    setShowObjectBrowser(true)
    setInspectorVisible(false)
    setLeftToolsCollapsed(false)
    setRightToolsCollapsed(false)
    setSidebarView('library')
    setLibraryVisible(false)
    setLayout2DSignal(signal => signal + 1)
  }
  const restoreCollapsed3D = () => {
    setViewportLayout(collapsed3DReturnLayoutRef.current === '2d' ? 'split' : collapsed3DReturnLayoutRef.current)
    setLayout2DSignal(signal => signal + 1)
  }
  // Two distinct 3D actions: the main chevron expands ONLY the workspace's
  // 3D pane; the adjacent expand arrow enters full-window/native fullscreen.
  // Neither operation remounts the live Rust/WebGL scene.
  const [studio3DFullscreen, setStudio3DFullscreen] = useState(false)
  const expanded3DReturnLayoutRef = useRef('split')
  const fullscreen3DReturnLayoutRef = useRef('split')
  const owned3DFullscreenRef = useRef(false)
  const exit3DStudio = () => {
    setStudio3DFullscreen(false)
    setViewportLayout(fullscreen3DReturnLayoutRef.current)
    window.webkit?.messageHandlers?.exoStudioFullscreen?.postMessage('exit')
    if (document.fullscreenElement === document.documentElement) {
      document.exitFullscreen?.().catch(() => {})
    }
    owned3DFullscreenRef.current = false
  }
  const toggle3DStudio = () => {
    if (studio3DFullscreen) {
      exit3DStudio()
      setViewportLayout(expanded3DReturnLayoutRef.current)
    } else if (viewportLayout === '3d') {
      setViewportLayout(expanded3DReturnLayoutRef.current === '3d' ? 'split' : expanded3DReturnLayoutRef.current)
    } else {
      expanded3DReturnLayoutRef.current = viewportLayout === '2d' ? 'split' : viewportLayout
      setViewportLayout('3d')
    }
  }
  const toggle3DStudioFullscreen = () => {
    if (studio3DFullscreen) {
      exit3DStudio()
    } else {
      fullscreen3DReturnLayoutRef.current = viewportLayout
      setStudio3DFullscreen(true)
      setViewportLayout('3d')
      // Browser fullscreen where supported; fixed full-window CSS also works
      // in the installed macOS WKWebView where the API may be unavailable.
      const nativeFullscreen = window.webkit?.messageHandlers?.exoStudioFullscreen
      if (nativeFullscreen) nativeFullscreen.postMessage('enter')
      else if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().then(() => {
          owned3DFullscreenRef.current = document.fullscreenElement === document.documentElement
        }).catch(() => {})
      }
    }
  }
  useEffect(() => {
    if (!studio3DFullscreen) return
    const onFullscreenChange = () => {
      if (!document.fullscreenElement && owned3DFullscreenRef.current) exit3DStudio()
    }
    const onKeyDown = event => {
      if (event.key === 'Escape' && !document.fullscreenElement && !event.defaultPrevented) {
        event.preventDefault()
        exit3DStudio()
      }
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('exo-native-3d-fullscreen-exited', exit3DStudio)
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('exo-native-3d-fullscreen-exited', exit3DStudio)
    }
  }, [studio3DFullscreen])
  const viewportResizeRef = useRef(null)
  // Workspace chrome has its own preferences; changing panel dimensions must
  // never alter the stored garment or the physics history.
  const [libraryWidth, setLibraryWidth] = useState(() => {
    try { return clamp(localStorage.getItem('garment-studio-library-width') || 232, 160, 350) } catch { return 232 }
  })
  const [inspectorWidth, setInspectorWidth] = useState(() => {
    try { return clamp(localStorage.getItem('garment-studio-inspector-width') || 392, 295, 540) } catch { return 392 }
  })
  const [objectBrowserHeight, setObjectBrowserHeight] = useState(() => {
    try { return clamp(localStorage.getItem('garment-studio-object-browser-height') || 390, 230, 650) } catch { return 390 }
  })
  const [sidebarView, setSidebarView] = useState('library')
  const panelDragRef = useRef(null)
  const [showTopWorkspaceTabs, setShowTopWorkspaceTabs] = useState(() => {
    try { return localStorage.getItem('garment-studio-show-top-tabs') !== 'false' } catch { return true }
  })
  const [fitCameraSignal, setFitCameraSignal] = useState(0)
  const [running, setRunning] = useState(false)
  const [clothcraftLive, setClothcraftLive] = useState(null)
  const [nativePatternReferences,setNativePatternReferences] = useState([])
  const [referenceLoadedKey,setReferenceLoadedKey] = useState(null)
  const [selectedNativeReferenceId,setSelectedNativeReferenceId] = useState(null)
  const referenceProjectKey = clothcraftHybrid ? clothcraftLive?.referenceKey || null : null
  useEffect(()=>{
    let valid=true
    setReferenceLoadedKey(null)
    setNativePatternReferences([])
    setSelectedNativeReferenceId(null)
    if(!referenceProjectKey)return()=>{valid=false}
    readPatternReferences(referenceProjectKey).then(items=>{
      if(!valid)return
      setNativePatternReferences(items)
      setReferenceLoadedKey(referenceProjectKey)
    }).catch(error=>{
      if(!valid)return
      setCommandResult(`Could not open saved tracing references: ${error.message}`)
      setReferenceLoadedKey(referenceProjectKey)
    })
    return()=>{valid=false}
  },[referenceProjectKey])
  const updateNativePatternReferences=next=>{
    if(!referenceProjectKey||referenceLoadedKey!==referenceProjectKey)return
    try{setNativePatternReferences(validatePatternReferences(next))}
    catch(error){setCommandResult(`Reference update blocked: ${error.message}`)}
  }
  useEffect(()=>{
    if(!referenceProjectKey||referenceLoadedKey!==referenceProjectKey)return undefined
    const timer=window.setTimeout(()=>{
      savePatternReferences(referenceProjectKey,nativePatternReferences).catch(error=>
        setCommandResult(`Could not save tracing references: ${error.message}`))
    },350)
    return()=>window.clearTimeout(timer)
  },[nativePatternReferences,referenceProjectKey,referenceLoadedKey])
  const [graphicMeasurementsVisible,setGraphicMeasurementsVisible] = useState(()=>{
    try{return localStorage.getItem('exo-v2-show-2d-graphic-measurements')!=='false'}catch{return true}
  })
  const [selectedDraftEdge, setSelectedDraftEdge] = useState(null)
  const [hasSimulated, setHasSimulated] = useState(false)
  const [wireframe, setWireframe] = useState(false)
  const [analysisMode, setAnalysisMode] = useState('surface')
  const [selectedFabricId, setSelectedFabricId] = useState('main')
  const [selectedObjectForProperties, setSelectedObjectForProperties] = useState(null)
  const [foamPropertySelection,setFoamPropertySelection]=useState(null)
  const [environmentSelection,setEnvironmentSelection] = useState(null)
  // The first Camera selection must show the actual factory viewport lens and
  // orbit, not arbitrary UI defaults that suddenly move the model on edit.
  const initialSceneCamera=clothcraftHybrid
    ?{name:'Default Camera',fieldOfView:34,viewType:'spherical',distanceMm:3982,horizontalAngle:37.7,verticalAngle:10.1,nearClipMm:5,farClipMm:150000,physicalCamera:false,focalLengthMm:50,sensorWidthMm:36}
    :{name:'Default Camera',fieldOfView:34,viewType:'spherical',distanceMm:4276,horizontalAngle:12.2,verticalAngle:6.7,nearClipMm:20,farClipMm:30000,physicalCamera:false,focalLengthMm:50,sensorWidthMm:36}
  const onDraftEdgeSelection=useCallback(value=>{
    setSelectedDraftEdge(previous=>previous?.pieceId===value?.pieceId&&previous?.edgeIndex===value?.edgeIndex?previous:value)
    if(value)setSelectedObjectForProperties(null)
  },[])
  const [markerFabricId, setMarkerFabricId] = useState('main')
  const [seamWalkId, setSeamWalkId] = useState(null)
  const [seamWalkProgress, setSeamWalkProgress] = useState(0.5)
  const [trimEdgeIndex, setTrimEdgeIndex] = useState(0)
  const [hardwareChoice, setHardwareChoice] = useState({
    button:'four-hole-shirt-button', buttonhole:'horizontal-buttonhole', zipper:'coil-zipper-5',
  })
  const [requestedGradePreviewSize, setGradePreviewSize] = useState('M')
  // Project imports, History and Undo can replace XS–XXL with a completely
  // different grading size run. Guard on the FIRST render, before effects and
  // before the Production viewport calls gradeProject; do not crash at "M"
  // after restoring a W28–W38 factory ZIP.
  const gradePreviewSize=resolveGradePreviewSize(project,requestedGradePreviewSize)
  const [showGradeNest, setShowGradeNest] = useState(true)
  const [nativeNestVisible,setNativeNestVisible]=useState(false)
  useEffect(()=>{
    if(!clothcraftHybrid)return undefined
    const receive=event=>setNativeNestVisible(Boolean(event.detail?.visible))
    window.addEventListener('exo-native-nest-state',receive)
    window.dispatchEvent(new CustomEvent('exo-native-nest-state-request'))
    return()=>window.removeEventListener('exo-native-nest-state',receive)
  },[clothcraftHybrid])
  const [focusedGradePoint,setFocusedGradePoint] = useState(null)
  const [gradeWorkbenchSection,setGradeWorkbenchSection]=useState('rules')
  const [gradeRuleClipboard, setGradeRuleClipboard] = useState(null)
  const [exportSelectedPatternOnly, setExportSelectedPatternOnly] = useState(false)
  const [meshExportSignal, setMeshExportSignal] = useState(0)
  const [glbExportSignal, setGlbExportSignal] = useState(0)
  const [renderSignal, setRenderSignal] = useState(0)
  const [nativeSolveSignal, setNativeSolveSignal] = useState(0)
  const [nativeServiceStatus, setNativeServiceStatus] = useState('checking')
  const [nativeSolveStatus, setNativeSolveStatus] = useState('idle')
  const [nativeLastSolve, setNativeLastSolve] = useState(null)
  // A short solver proof is safe by default on Apple Metal; large frame runs
  // can spend minutes resolving sleeve/body contacts before reaching a drape.
  const [ppfFrames, setPpfFrames] = useState(60)
  const [ppfSewing, setPpfSewing] = useState({ status: 'idle', phase: 'idle', jobId: null, error: null, summary: null, artifacts: null })
  const [ppfPreview, setPpfPreview] = useState(null)
  const [ppfPreviewError, setPpfPreviewError] = useState('')
  const [ppfPreviewLoading, setPpfPreviewLoading] = useState(false)
  const [zozoReference, setZozoReference] = useState(null)
  const [zozoReferenceLoading, setZozoReferenceLoading] = useState(false)
  const [zozoReferenceError, setZozoReferenceError] = useState('')
  const [zozoReferenceFrame, setZozoReferenceFrame] = useState(240)
  const [zozoReferencePlaying, setZozoReferencePlaying] = useState(false)
  const [zozoReferenceBodyVisible, setZozoReferenceBodyVisible] = useState(true)
  const [automaticPpfOnSimulate, setAutomaticPpfOnSimulate] = useState(() => {
    try { return localStorage.getItem('garment-studio-auto-ppf-on-simulate-v1') === 'true' } catch { return false }
  })
  const ppfAutoRunRequestRef = useRef(false)
  const [hdriUrl, setHdriUrl] = useState('')
  const [hdriName, setHdriName] = useState('')
  const [resetSignal, setResetSignal] = useState(0)
  const [undoStack, setUndoStack] = useState([])
  const [redoStack, setRedoStack] = useState([])
  const [saveState, setSaveState] = useState(projectRestoreBlocked ? 'modified' : 'saved')
  const [stats, setStats] = useState({ vertices: 0, constraints: 0, seams: 0, fasteners: 0, treatments: 0, trims: 0, anchors: 0, manualPins: 0, internal: 0, elapsed: 0, averageStrain: 0, maxStrain: 0, averageEaseCm: 0, averagePressureIndex: 0, maxPressureIndex: 0, contactRatio: 0, tightRatio: 0, looseRatio: 0, backendId: 'browser-pbd', backendFrame: 0, backendElapsedMs: 0, backendError: null })
  const [command, setCommand] = useState('')
  const [araiOpen, setAraiOpen] = useState(false)
  const [araiLastPrompt, setAraiLastPrompt] = useState('')
  const [commandResult, setCommandResult] = useState(projectRestoreNotice || 'Ready for garment commands')
  const [avatarAvailability, setAvatarAvailability] = useState({ 'makehuman-base': true })
  const [clothCraftBusy, setClothCraftBusy] = useState(false)
  const [clothCraftMeshPreview, setClothCraftMeshPreview] = useState(null)
  const [clothCraftContactSteps, setClothCraftContactSteps] = useState(3)
  const [clothCraftContactResult, setClothCraftContactResult] = useState(null)
  useEffect(() => {
    let active = true
    // A private desktop build can have different installed avatar assets than
    // the source checkout. Do not offer nonexistent CLO/rigged meshes as usable.
    void Promise.all(Object.entries(OPTIONAL_AVATAR_URLS).map(async ([model, url]) => {
      try {
        const response = await fetch(url, { method: 'HEAD', cache: 'no-store' })
        return [model, response.ok]
      } catch { return [model, false] }
    })).then(entries => {
      if (!active) return
      setAvatarAvailability(current => ({ ...current, ...Object.fromEntries(entries) }))
    })
    return () => { active = false }
  }, [])
  useEffect(() => {
    const selected = project.avatar?.model
    if (avatarAvailability[selected] !== false) return
    mutateProject(next => {
      next.avatar.model = 'makehuman-base'
      next.avatar.name = 'MakeHuman Base'
    })
    setCommandResult(`${selected} model is not installed in this build. Restored MakeHuman without changing the garment or measurements.`)
  }, [avatarAvailability, project.avatar?.model])
  useEffect(() => {
    if (!clothcraftHybrid) return undefined
    const nativeApplied = event => {
      const model = event.detail?.model
      if (!['makehuman-base', 'clo-thomas'].includes(model)) return
      mutateProject(next => {
        next.avatar.model = model
        next.avatar.name = model === 'clo-thomas' ? 'CLO Thomas' : 'MakeHuman Base'
      })
      setCommandResult(`${model === 'clo-thomas' ? 'CLO Thomas' : 'MakeHuman'} now renders in the native 2D and 3D views.`)
    }
    window.addEventListener('exo-clothcraft-native-avatar-applied', nativeApplied)
    return () => window.removeEventListener('exo-clothcraft-native-avatar-applied', nativeApplied)
  }, [clothcraftHybrid])
  const [transformDraft, setTransformDraft] = useState({ scaleX: 100, scaleY: 100, rotateDeg: 0, slashCm: 4 })
  const importInputRef = useRef(null)
  const factoryDxfReferenceInputRef = useRef(null)
  const gradeRuleCsvInputRef = useRef(null)
  const industrialGradeCsvInputRef = useRef(null)
  const seamlyMeasureInputRef = useRef(null)
  const seamlyPatternInputRef = useRef(null)
  const svgPatternInputRef = useRef(null)
  const graphicInputRef = useRef(null)
  const fabricTextureInputRef = useRef(null)
  const fabricEvidenceInputRef = useRef(null)
  const fabricNormalInputRef = useRef(null)
  const fabricRoughnessInputRef = useRef(null)
  const fabricMetalnessInputRef = useRef(null)
  const fabricOpacityInputRef = useRef(null)
  const fabricDisplacementInputRef = useRef(null)
  const fabricPbrSetInputRef = useRef(null)
  const [fabricGeneratingPbr, setFabricGeneratingPbr] = useState(false)
  const hdriInputRef = useRef(null)
  const avatarMeshInputRef = useRef(null)
  const [customAvatar, setCustomAvatar] = useState(null)

  useEffect(() => {
    let active = true
    getNativeServiceHealth()
      .then((health) => { if (active) setNativeServiceStatus(health?.ok ? 'ready' : 'offline') })
      .catch(() => { if (active) setNativeServiceStatus('offline') })
    return () => { active = false }
  }, [])
  useEffect(() => {
    try { localStorage.setItem('garment-studio-show-top-tabs', String(showTopWorkspaceTabs)) } catch { /* browser privacy mode */ }
  }, [showTopWorkspaceTabs])
  useEffect(() => {
    try { localStorage.setItem(WORKSPACE_VIEW_KEY, JSON.stringify({layout: viewportLayout, split: viewportSplit})) } catch { /* browser privacy mode */ }
  }, [viewportLayout, viewportSplit])
  useEffect(() => {
    const onPaletteShortcut = event => {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandPaletteOpen(open => !open)
      } else if (event.key === 'Escape') setCommandPaletteOpen(false)
    }
    window.addEventListener('keydown', onPaletteShortcut, true)
    return () => window.removeEventListener('keydown', onPaletteShortcut, true)
  }, [])
  useEffect(() => {
    try { localStorage.setItem('garment-studio-auto-ppf-on-simulate-v1', String(automaticPpfOnSimulate)) } catch { /* browser privacy mode */ }
  }, [automaticPpfOnSimulate])
  useEffect(() => {
    try {
      localStorage.setItem('garment-studio-library-width', String(libraryWidth))
      localStorage.setItem('garment-studio-inspector-width', String(inspectorWidth))
      localStorage.setItem('garment-studio-object-browser-height', String(objectBrowserHeight))
    } catch { /* browser privacy mode */ }
  }, [libraryWidth, inspectorWidth, objectBrowserHeight])
  const beginPanelResize = (panel, event) => {
    if (event.button !== 0) return
    event.preventDefault()
    panelDragRef.current = { panel, x: event.clientX, y: event.clientY, libraryWidth, inspectorWidth, objectBrowserHeight }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const movePanelResize = (event) => {
    const start = panelDragRef.current
    if (!start) return
    if (start.panel === 'library') setLibraryWidth(clamp(start.libraryWidth + event.clientX - start.x, 160, Math.min(350, window.innerWidth * .25)))
    if (start.panel === 'inspector') setInspectorWidth(clamp(start.inspectorWidth + start.x - event.clientX, 295, Math.min(540, window.innerWidth * .42)))
    if (start.panel === 'objects') setObjectBrowserHeight(clamp(start.objectBrowserHeight + event.clientY - start.y, 230, Math.max(270, window.innerHeight - 300)))
  }
  const endPanelResize = () => { panelDragRef.current = null }

  const updateStudioCustomization = (nextValue,{applyTheme=true}={}) => {
    const next=normalizeStudioCustomization(nextValue)
    if(applyTheme){
      const palette=studioResolvedPalette(next.appearance.theme,next.appearance.panelFinish)
      next.appearance={...next.appearance,accent:palette.accent,sidebarColor:palette.sidebarColor,panelColor:palette.panelColor}
    }
    if(next.appearance.studioColor!==studioCustomization.appearance.studioColor
      &&next.appearance.backgroundMode===studioCustomization.appearance.backgroundMode){
      next.appearance.backgroundMode='color'
    }
    const workspace=next.workspace
    const existing=studioCustomization.workspace
    if(workspace.libraryWidth!==existing.libraryWidth)setLibraryWidth(workspace.libraryWidth)
    if(workspace.inspectorWidth!==existing.inspectorWidth)setInspectorWidth(workspace.inspectorWidth)
    if(workspace.objectBrowserHeight!==existing.objectBrowserHeight)setObjectBrowserHeight(workspace.objectBrowserHeight)
    if(workspace.viewportLayout!==existing.viewportLayout)setViewportLayout(workspace.viewportLayout)
    if(workspace.viewportSplit!==existing.viewportSplit)setViewportSplit(workspace.viewportSplit)
    if(workspace.topTabsVisible!==existing.topTabsVisible)setShowTopWorkspaceTabs(workspace.topTabsVisible)
    if(workspace.objectBrowserVisible!==existing.objectBrowserVisible)setShowObjectBrowser(workspace.objectBrowserVisible)
    if(next.preferences.showGrid!==studioCustomization.preferences.showGrid)setShow2DGrid(next.preferences.showGrid)
    if(next.preferences.showGuides!==studioCustomization.preferences.showGuides)setShowSewingGuides(next.preferences.showGuides)
    setStudioCustomization(next)
  }

  const resetStudioCustomization = () => {
    const defaults=normalizeStudioCustomization(DEFAULT_STUDIO_CUSTOMIZATION)
    updateStudioCustomization(defaults,{applyTheme:false})
    setLibraryVisible(true)
    setInspectorVisible(true)
    setCommandResult('Restored original EXO 3D studio gradient, default lighting and positions, toolbar layout and preferences. Garment geometry unchanged.')
  }
  const resetEnvironmentCustomization = () => {
    const d=DEFAULT_STUDIO_CUSTOMIZATION.appearance
    updateStudioCustomization({
      ...studioCustomization,
      appearance:{...studioCustomization.appearance,
        backgroundMode:'default',floorMode:'default',environmentPreset:'studio',
        studioColor:d.studioColor,floorColor:d.floorColor,lightColor:d.lightColor,lightIntensity:d.lightIntensity,
        lightPositionX:d.lightPositionX,lightPositionY:d.lightPositionY,lightPositionZ:d.lightPositionZ,
      },
    },{applyTheme:false})
    setCommandResult('Restored original gray-gradient studio, key light and neutral illumination. Garment fabric and geometry unchanged.')
  }
  useEffect(()=>{
    try{
      if(!hadStoredStudioCustomization.current)return
      const stored=studioCustomization
      setLibraryWidth(stored.workspace.libraryWidth)
      setInspectorWidth(stored.workspace.inspectorWidth)
      setObjectBrowserHeight(stored.workspace.objectBrowserHeight)
      setViewportLayout(stored.workspace.viewportLayout)
      setViewportSplit(stored.workspace.viewportSplit)
      setShowTopWorkspaceTabs(stored.workspace.topTabsVisible)
      setShowObjectBrowser(true)
      // Saved workspace preferences must not reopen the shared inspector when
      // restoring directly into 2D or an active full 2D drafting session.
      setInspectorVisible(stored.workspace.viewportLayout === '2d' || patternFocusActive ? false : true)
      setShow2DGrid(stored.preferences.showGrid)
      setShowSewingGuides(stored.preferences.showGuides)
    }catch{/* no access to local workspace preferences */}
  },[])

  // Resizable 3D/2D divider is a workspace preference, not garment geometry.
  const beginViewportResize = event => {
    if (event.button !== 0 || !['split','stack'].includes(viewportLayout)) return
    event.preventDefault()
    viewportResizeRef.current = event.pointerId
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const moveViewportResize = event => {
    if (viewportResizeRef.current !== event.pointerId) return
    const rect = event.currentTarget.parentElement.getBoundingClientRect()
    const stacked = viewportLayout === 'stack'
    const size = stacked ? rect.height : rect.width
    const position = stacked ? event.clientY - rect.top : event.clientX - rect.left
    if (size > 1) setViewportSplit(Math.round(clamp(position / size * 100, 20, 80)))
  }
  const endViewportResize = () => { viewportResizeRef.current = null }

  const applyWorkspaceProfile = (source, { announce = true } = {}) => {
    const profile = normalizeWorkspaceProfile(source)
    setPatternFocusActive(profile.patternFocus)
    setActiveSection(profile.section)
    setObjectTab(profile.tab)
    setTool(profile.tool)
    setViewportTool(profile.viewportTool)
    setLibraryWidth(profile.libraryWidth)
    setInspectorWidth(profile.inspectorWidth)
    setObjectBrowserHeight(profile.objectBrowserHeight)
    setShowObjectBrowser(profile.objectBrowserVisible)
    setShowTopWorkspaceTabs(profile.topTabsVisible)
    setLibraryVisible(profile.libraryVisible)
    setInspectorVisible(profile.inspectorVisible)
    setViewportLayout(profile.viewportLayout)
    setViewportSplit(profile.viewportSplit)
    setStudioCustomization(previous=>normalizeStudioCustomization({...previous,workspace:{
      ...previous.workspace,libraryWidth:profile.libraryWidth,inspectorWidth:profile.inspectorWidth,
      objectBrowserHeight:profile.objectBrowserHeight,viewportLayout:profile.viewportLayout,
      viewportSplit:profile.viewportSplit,topTabsVisible:profile.topTabsVisible,
      objectBrowserVisible:profile.objectBrowserVisible,
    }}))
    if (announce) setCommandResult(`Applied ${profile.name}. Garment geometry, saved physics and editing history remain unchanged.`)
    return profile
  }

  const saveCustomWorkspace = () => {
    const profile = normalizeWorkspaceProfile({
      name: 'My workspace', section: activeSection, tab: objectTab, tool, viewportTool,
      libraryWidth, inspectorWidth, objectBrowserHeight,
      objectBrowserVisible: showObjectBrowser, topTabsVisible: showTopWorkspaceTabs,
      libraryVisible, inspectorVisible,
      viewportLayout, viewportSplit,
    })
    try {
      localStorage.setItem(WORKSPACE_PROFILE_KEY, JSON.stringify(profile))
      const complete=normalizeStudioCustomization({...studioCustomization,workspace:{
        ...studioCustomization.workspace,libraryWidth,inspectorWidth,objectBrowserHeight,
        viewportLayout,viewportSplit,topTabsVisible:showTopWorkspaceTabs,
        objectBrowserVisible:showObjectBrowser,
      }})
      localStorage.setItem(STUDIO_SAVED_WORKSPACE_KEY,JSON.stringify(complete))
      setCommandResult('Saved panel layout, custom toolbar and appearance as a designer workspace snapshot. Garment unchanged.')
    } catch {
      setCommandResult('Could not store this workspace layout; check local browser storage permissions.')
    }
  }

  const restoreCustomWorkspace = () => {
    try {
      const source = localStorage.getItem(WORKSPACE_PROFILE_KEY)
      if (!source) throw new Error('No custom layout has been saved')
      applyWorkspaceProfile(JSON.parse(source))
      const saved=localStorage.getItem(STUDIO_SAVED_WORKSPACE_KEY)
      if(saved)updateStudioCustomization(JSON.parse(saved),{applyTheme:false})
    } catch (error) {
      setCommandResult(`Unable to restore saved workspace: ${error.message}`)
    }
  }

  // Pattern drafting starts without a web of sewing links. Switching into
  // Sewing restores the exact correspondence lines for edge matching.
  // The SEAMS toggle within each workspace remains a manual override.
  useEffect(() => {
    setShow2DSeams(activeSection === 'Sewing')
  }, [activeSection])

  // Preserve drape mode while editing pattern geometry. The viewport builds a
  // fresh physical mesh for changed topology and re-establishes the canonical
  // body dressing pose, rather than returning the garment to flat staging.
  useEffect(() => {
    setArrangementSpread(0)
  }, [project.revision])

  const toggleSimulation = () => {
    if (running) { setRunning(false); return }
    setArrangementSpread(0)
    setHasSimulated(true)
    setRunning(true)
    // Trigger the optional higher-fidelity local Metal contact solve only on
    // the initial garment drape, never when simply resuming paused fabric.
    // It runs in isolation from the interactive PBD solve. A contact-invalid
    // result cannot replace the user’s cloth, patterns or source seams.
    if (!hasSimulated && automaticPpfOnSimulate && project.seams.length) {
      ppfAutoRunRequestRef.current = true
    }
  }

  const applyGarmentTemplate = async (templateId, { unsewn = false } = {}) => {
    const next = createTemplateProject(templateId)
    if (unsewn) {
      next.name = `${next.name} · Draft outlines`
      next.seams=[];next.fasteners=[];next.trims=[];next.topstitches=[]
      for (const piece of next.pieces || []) {
        piece.notches=[];piece.buttonholes=[];piece.seamAllowance=0
        piece.edgeSeamAllowances={};piece.internalLines=[];piece.bindings=[]
      }
    }
    if (clothcraftHybrid) {
      setCommandResult(`Preparing ${next.name} panels and sewing edges for the native 3D workspace…`)
      try {
        const prepared=prepareNativePatternExport(next)
        if(prepared.report.removedSeams)throw Error(`Cannot export: ${prepared.report.removedSeams} sewing relationships touch microscopic cutline edges. Inspect those seams in 2D before converting.`)
        const bridgeUrl = window.location.port === '5486' ? 'http://127.0.0.1:5485' : window.location.port === '5386' ? 'http://127.0.0.1:5385'
          : (import.meta.env.VITE_CLOTHCRAFT_BRIDGE_URL || 'http://127.0.0.1:5193')
        const response = await fetch(`${bridgeUrl}/export`, {
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({document:prepared.document}),
        })
        const conversion = await response.json()
        if (!response.ok || !conversion.ok || !conversion.template?.panels?.length)
          throw new Error(conversion.error || 'The native converter rejected these pattern pieces')
        // Capture the authoritative, locally saved native document to retain
        // its required FittingProject fields and the selected collision avatar.
        const saved = await requestNativeLibraryProject('capture')
        await requestNativeLibraryProject('open', {
          ...saved.project,template:conversion.template,state:null,mesh_signature:null,
          print_graphics:[],imported_hardware:[],
        })
        setViewportLayout('split')
        setActiveSection('Pattern');setObjectTab('Pattern')
        const prepNote=prepared.report.reversed.length||prepared.report.removed.length
          ? ` Normalized ${prepared.report.reversed.length} reversed outlines and ${prepared.report.removed.length} microscopic cutline edges in the exported copy.`:''
        setCommandResult(`Opened ${next.name} in native 2D + 3D: ${conversion.template.panels.length} editable panels, ${conversion.template.seams.length} sewn-edge relationships.${prepNote} Source drafts remain unchanged; simulate and validate physical fit.`)
      } catch(error) {
        setCommandResult(`Could not load ${next.name} into the native editor: ${error.message}`)
      }
      return
    }
    pushUndo(cloneProject(project))
    setProject(next)
    setSelectedPieceId(next.pieces[0]?.id || null)
    setSelectedFabricId(Object.keys(next.fabrics || {})[0] || 'main')
    setMarkerFabricId(Object.keys(next.fabrics || {})[0] || 'main')
    setSeamWalkId(null)
    setSeamWalkProgress(0.5)
    setGradePreviewSize(next.grading?.baseSize || 'M')
    setTool('select')
    // Start a newly selected garment in a clean 3D inspection pose. The
    // transform gizmo appears again as soon as Move/Rotate is chosen.
    setViewportTool('orbit')
    setRunning(false)
    setAnalysisMode('surface')
    setResetSignal((signal) => signal + 1)
    setCommandResult(`Loaded ${next.name} foundation with ${next.pieces.length} pattern${next.pieces.length === 1 ? '' : 's'} and ${next.seams.length} sewing relationship${next.seams.length === 1 ? '' : 's'}`)
  }
  const arrangeCurrentPatternsIn3D = () => {
    const arranged = arrangePatternProject(project)
    const classified = arranged.pieces.filter(p=>inferPatternBodyRole(p,arranged)).length
    if (!classified) {
      setCommandResult('Name each pattern by position (for example Left Front Leg, Right Back Leg, Front, Back or Sleeve Left), or select a 3D placement role in Pattern properties.')
      return
    }
    mutateProject(next=>{next.pieces=arranged.pieces})
    setRunning(false);setHasSimulated(false);setArrangementSpread(0)
    setResetSignal(signal=>signal+1)
    setViewportLayout('split');setActiveSection('Pattern')
    setCommandResult(`Arranged ${classified} pattern panels around the avatar with their authored cutlines, ${project.seams.length} sewing edges and assigned fabrics preserved.`)
  }
  const openUnsewnPatternTemplate=(templateId)=>{
    if (clothcraftHybrid) {void applyGarmentTemplate(templateId,{unsewn:true});return}
    const next=createTemplateProject(templateId)
    next.name=`${next.name} · Draft outlines`
    next.seams=[]
    next.fasteners=[]
    next.trims=[]
    next.topstitches=[]
    next.grading?.sizeLabels&& (next.grading.sizeLabels=[...next.grading.sizeLabels])
    for(const piece of next.pieces||[]){
      piece.notches=[]
      piece.buttonholes=[]
      piece.seamAllowance=0
      piece.edgeSeamAllowances={}
      piece.internalLines=[]
      piece.bindings=[]
    }
    pushUndo(cloneProject(project))
    touchProject(next)
    setProject(next)
    setSelectedPieceId(next.pieces[0]?.id||null)
    setActiveSection('Pattern')
    setObjectTab('Pattern')
    setTool('select')
    setViewportLayout('2d')
    setRunning(false)
    setHasSimulated(false)
    setLayout2DSignal(n=>n+1)
    setCommandResult(`Opened ${next.pieces.length} editable, unsewn 2D pattern outlines. Sewing and seam allowance are available later as separate steps.`)
  }
  const correctTeeArmholes = () => {
    const reference = createTemplateProject('tee')
    const byId = new Map(reference.pieces.map((piece) => [piece.id, piece]))
    // An explicit, undoable engineering update of only the relevant tee
    // cutline coordinates. No silent migration of saved user projects.
    // Keep existing materials, sewing IDs, selected styling and 3D placement.
    mutateProject((next) => {
      for (const piece of next.pieces) {
        const corrected = byId.get(piece.id)
        if (!corrected || !['front','back','sleeve-left','sleeve-right'].includes(piece.id)) continue
        if (piece.points.length !== corrected.points.length) continue
        if (piece.id.startsWith('sleeve-')) {
          for (const index of [1,2,5,6]) piece.points[index] = { ...piece.points[index], ...cloneProject(corrected.points[index]) }
          piece.curves = cloneProject(corrected.curves)
        } else {
          for (const index of [2,7]) piece.points[index] = { ...piece.points[index], ...cloneProject(corrected.points[index]) }
          piece.curves = {...(piece.curves || {}),...Object.fromEntries([1,2,6,7].map(i=>[i,cloneProject(corrected.curves[i])]))}
        }
        piece.edgeSeamAllowances = { ...(piece.edgeSeamAllowances || {}), ...corrected.edgeSeamAllowances }
        if (piece.id === 'front' || piece.id === 'back') piece.bindings = cloneProject(corrected.bindings)
        for (const notch of piece.notches || []) {
          const correction = corrected.notches?.find(item => item.id === notch.id)
          if (correction) {
            notch.matchGroupId = correction.matchGroupId
            notch.matchedSeamId = correction.matchedSeamId
            notch.t = correction.t // physical seam-walk position, not a visual-only group ID
          }
        }
      }
      next.productionSpec = cloneProject(reference.productionSpec)
    })
    setLayout2DSignal(value => value + 1)
    setRunning(false)
    setCommandResult('Applied the regular-fit M T-shirt development block: recessed armscyes, matching separate sleeve caps, hem/neck allowances and matched seam notches. Confirm fit before factory release; Undo available.')
  }
  const gestureStartRef = useRef(null)

  const selectedPiece = project.pieces.find((piece) => piece.id === selectedPieceId) || null
  const importedSelection=selectedObjectForProperties?.source==='imported'||selectedObjectForProperties?.source==='imported-library'
    ?selectedObjectForProperties:null
  const importedPlacedRecord=importedSelection?.source==='imported'
    ?(clothcraftHybrid
      ?(clothcraftLive?.importedHardware||[]).find(entry=>entry.id===importedSelection.itemId)
      :project.pieces.find(piece=>piece.id===importedSelection.pieceId)?.importedHardwarePlacements?.find(entry=>entry.id===importedSelection.itemId))
    :null
  const importedPlacement=importedPlacedRecord&&clothcraftHybrid?{
    ...importedPlacedRecord,
    x:(importedPlacedRecord.positionMm?.[0]||0)/10,
    y:(importedPlacedRecord.positionMm?.[1]||0)/10,
    liftMm:importedPlacedRecord.positionMm?.[2]||1,
    rotationDeg:importedPlacedRecord.rotationDegrees?.[2]||0,
    widthMm:(importedPlacedRecord.dimensionsMm?.[0]||10)*(importedPlacedRecord.scale?.[0]||1),
    heightMm:(importedPlacedRecord.dimensionsMm?.[1]||10)*(importedPlacedRecord.scale?.[1]||1),
    depthMm:(importedPlacedRecord.dimensionsMm?.[2]||3)*(importedPlacedRecord.scale?.[2]||1),
  }:importedPlacedRecord
  const importedPanelName=clothcraftHybrid
    ?clothcraftLive?.panelRefs?.find(item=>item.id===(importedPlacedRecord?.panel||clothcraftLive?.selection?.panelId))?.name||clothcraftLive?.panelRefs?.[0]?.name||''
    :project.pieces.find(item=>item.id===importedSelection?.pieceId)?.name||selectedPiece?.name||''
  const draftLine = selectedDraftEdge&&project.pieces.find(piece=>piece.id===selectedDraftEdge.pieceId)
  const draftLineSelection = draftLine&&selectedDraftEdge.edgeIndex<draftLine.points.length
    ? {kind:'line',source:'exo',panelId:draftLine.id,panelName:draftLine.name,
       edgeId:`Edge ${selectedDraftEdge.edgeIndex+1}`,length2DCm:edgeLength(draftLine,selectedDraftEdge.edgeIndex),
       length3DCm:null,elongationPercent:null,seamIds:project.seams.filter(seam=>
         [seam.a,seam.b].some(side=>side?.pieceId===draftLine.id&&side.edgeIndex===selectedDraftEdge.edgeIndex)).map(seam=>seam.name||seam.id)} : null
  const fabric = project.fabrics?.[selectedFabricId] || project.fabrics?.main || FABRIC_PRESETS.fleece
  const totalArea = useMemo(() => projectArea(project), [project])
  const selectedArea = selectedPiece ? pieceArea(selectedPiece) : 0
  const productionProject = useMemo(
    () => gradeProject(project, gradePreviewSize || project.grading?.baseSize || 'M'),
    [project, gradePreviewSize],
  )
  const productionPreflight = useMemo(() => inspectProduction(project), [project])
  // Run this heavier, independent all-size audit only in production mode.
  // An ordinary structural preflight may pass while stitch lengths diverge
  // across XS–XXL; neither audit alone is manufacturer certification.
  const industrialPatternAudit = useMemo(() => activeSection === 'Production' ? inspectIndustrialPatterns(project) : null, [project,activeSection])
  const industrialCutlineAudit = useMemo(() => activeSection === 'Production' ? inspectGradedCutlines(project) : null, [project,activeSection])
  const [deepProductionAudit,setDeepProductionAudit]=useState(null)
  const [deepProductionBusy,setDeepProductionBusy]=useState(false)
  useEffect(()=>{setDeepProductionAudit(null)},[project])
  const runDeepProductionAudit=async()=>{
    if(deepProductionBusy)return
    setDeepProductionBusy(true)
    // Yield a frame for the status UI before running bounded verification.
    await new Promise(resolve=>window.setTimeout(resolve,25))
    try{
      const cad=inspectIndustrialCadInterchange20261028(project)
      const marker=inspectIndustrialMarkerCutWorkflow20261028(project,{maxCandidates:30000})
      setDeepProductionAudit({cad,marker,revision:project.revision??null})
    }catch(error){setDeepProductionAudit({error:String(error?.message||error),revision:project.revision??null})}
    finally{setDeepProductionBusy(false)}
  }
  const gradedGeometryAudit = useMemo(() => activeSection === 'Production' ? auditGradedSizeRunGeometry(project) : null, [project,activeSection])
  const gradedJunctionAudit = useMemo(() => {
    if(activeSection!=='Production')return null
    if(project.templateId!=='jeans-501'&&!project.gradingJunctionConstraints?.length)return null
    try{return inspectGradedSeamJunctions(project,{
      junctions:project.templateId==='jeans-501'?JEANS501_YOKE_JUNCTIONS:project.gradingJunctionConstraints,
    })}catch(error){return {status:'blocked',blockers:1,checks:[],issues:[{code:'JUNCTION_AUDIT_FAILED',scope:'Grading',message:error.message}]}}
  },[project,activeSection])
  const productionCosts = useMemo(() => buildFabricCostRun(project), [project])
  const displayProject = activeSection === 'Production' ? productionProject : project
  const gradeNestProjects = useMemo(() => {
    // The full on-canvas 2D nest owns its own graded geometry cache; avoid
    // grading every piece twice (once for the old selected-only nest).
    if (viewportLayout === '2d') return []
    if ((activeSection !== 'Production' && viewportLayout !== '2d') || !showGradeNest) return []
    return (project.grading?.sizes || []).map((size) => gradeProject(project, size))
  }, [activeSection, viewportLayout, showGradeNest, project])
  const fabricMarkers = useMemo(() => buildFabricMarkers(
    productionProject,
    productionProject.markerSettings?.fabricWidthCm ?? 150,
    productionProject.markerSettings?.gapCm ?? 1.5,
  ), [productionProject])
  const markerFabricIds = Object.keys(fabricMarkers)
  const marker = fabricMarkers[markerFabricId] || fabricMarkers[markerFabricIds[0]] || buildMarker(
    productionProject,
    productionProject.markerSettings?.fabricWidthCm ?? 150,
    productionProject.markerSettings?.gapCm ?? 1.5,
  )
  const measurementRun = useMemo(() => buildMeasurementSizeRun(project), [project])
  const productionMeasurements = measurementRun[gradePreviewSize] || []
  const seamWalk = useMemo(() => {
    if (!seamWalkId) return null
    const seam = project.seams.find((item) => item.id === seamWalkId)
    return seam ? seamWalkReport(project, seam, 33) : null
  }, [project, seamWalkId])
  const productionFabricArea = useMemo(() => (productionProject.pieces || [])
    .filter((piece) => (piece.fabricId || 'main') === (marker.fabricId || markerFabricId))
    .reduce((sum, piece) => sum + pieceArea(piece) * Math.max(1, Math.round(Number(piece.cutQuantity || 1))), 0), [productionProject, marker.fabricId, markerFabricId])

  useEffect(() => {
    if (!markerFabricIds.length) return
    if (!fabricMarkers[markerFabricId]) setMarkerFabricId(markerFabricIds[0])
  }, [markerFabricId, markerFabricIds.join('|')])

  useEffect(() => {
    const edgeCount = selectedPiece?.points?.length || 0
    setTrimEdgeIndex((value) => edgeCount ? Math.max(0, Math.min(edgeCount - 1, value)) : 0)
  }, [selectedPieceId, selectedPiece?.points?.length])

  const pushUndo = (snapshot) => {
    setUndoStack((stack) => [...stack, snapshot].slice(-MAX_HISTORY))
    setRedoStack([])
  }

  const mutateProject = (mutator, { record = true, verifiedAllowanceReapply = null } = {}) => {
    const before = cloneProject(project)
    const draft = cloneProject(project)
    mutator(draft)
    syncLinkedMirrors(draft)
    let finished
    try {
      // Reconcile source-linked size rules while this edit is still only a
      // candidate. Either grade or allowance failure aborts the whole Undo
      // transaction, including the original source edit.
      const graded=applyModarisSizeLinkedGradeMutation(before,draft)
      finished=finalizeIndustrialAllowanceMutation20261027(before,graded.project,{
        verifiedAllowanceReapply,verifiedGradeDraft:graded.validation.linked?draft:null,
      })
    } catch (error) {
      setCommandResult(`Linked 2D dependency edit blocked: ${error.message}. The source garment and Undo history remain unchanged.`)
      throw error
    }
    if(finished.reactivelyReapplied)
      setCommandResult(`Regenerated seam-value targets from ${finished.changedSources.length} linked source edge(s). Review size-run cutlines before production.`)
    if (record) pushUndo(before)
    setProject(finished.project)
    setSaveState('modified')
  }

  // The right Property Editor and future agents share a typed property
  // allowlist. Unknown fields, wrong object IDs and out-of-range inputs
  // are rejected *before* the undoable garment transaction is created.
  const editCloObjectProperty=(selection,field,value)=>{
    // V2's EXO draft hardware annotations retain their own typed editor while
    // Rust runs cloth physics. These edits never masquerade as Rust commands.
    const draftHardware=['button','buttonhole','zipper','binding','fastener','topstitch','puckering']
    if(clothcraftHybrid && !(selection?.source==='draft'&&draftHardware.includes(String(selection.type).toLowerCase())))
      return{ok:false,error:'Native garment properties use the separate Rust API'}
    const result=validateCloDraftProperty(project,selection,field,value)
    if(!result.ok){setCommandResult(result.error);return result}
    mutateProject(next=>{
      applyCloDraftProperty(next,selection,field,result.value)
      if(selection.type?.toLowerCase()==='button'&&field==='hardwarePresetId'){
        const preset=getHardwarePreset(result.value)
        const target=resolveCloDraftTarget(next,selection)
        if(target&&preset)Object.assign(target,buttonValuesFromPreset(preset,resolveHardwareStyle(next,preset.id)))
      }
      if(selection.type?.toLowerCase()==='buttonhole'&&field==='hardwarePresetId'){
        const preset=getHardwarePreset(result.value)
        const target=resolveCloDraftTarget(next,selection)
        if(target&&preset)Object.assign(target,{
          lengthCm:Number(preset.dimensionsMm?.length??18)/10,
          widthCm:Number(preset.dimensionsMm?.openingWidth??preset.dimensionsMm?.stitchedWidth??2)/10,
          openingShape:preset.openingShape==='keyhole'?'keyhole':'horizontal',
          eyeDiameterMm:Number(preset.dimensionsMm?.eyeDiameter??5),
          stitchBorderWidthMm:Number(preset.dimensionsMm?.stitchBorderWidth??preset.dimensionsMm?.stitchedWidth??2.4),
          threadColor:preset.pbr?.baseColor||'#575757',
        })
      }
      if(selection.type?.toLowerCase()==='zipper'){
        const target=resolveCloDraftTarget(next,selection)
        if(target&&field==='hardwarePresetId'){
          const preset=getHardwarePreset(result.value)
          if(preset){
            const retained={id:target.id,edgeIndex:target.edgeIndex,offsetCm:target.offsetCm,
              pairedSeamId:target.pairedSeamId,pairedSeamPreviousType:target.pairedSeamPreviousType,sliderFraction:target.sliderFraction,
              bottomSliderFraction:preset.twoWay?(target.bottomSliderFraction??0):0,
              startExtensionMm:target.startExtensionMm,endExtensionMm:target.endExtensionMm,
              fastened:target.fastened,openFrom:target.openFrom}
            Object.assign(target,zipperValuesFromPreset(preset),retained)
          }
        }
        if(target&&field==='edgeIndex'&&target.pairedSeamId&&!zipperCompatibleSeams(next,selection.pieceId,target.edgeIndex).some(seam=>seam.id===target.pairedSeamId)){
          restoreZipperSeamIfUnused(next,target)
          delete target.pairedSeamId
          delete target.pairedSeamPreviousType
        }
        if(target)syncPairedZipperSeam(next,target)
      }
    })
    setCommandResult(`${selection.name||selection.type} · ${field} updated. Undo is available.`)
    return result
  }
  const editHardwareLibraryStyle=(presetId,field,value)=>{
    const result=validateHardwareStyleEdit(project,presetId,field,value)
    if(!result.ok){setCommandResult(result.error);return result}
    mutateProject(next=>{
      next.hardwareStyles={...(next.hardwareStyles||{}),
        [presetId]:{...resolveHardwareStyle(next,presetId),[field]:result.value}}
    },{record:false})
    setCommandResult(`${getHardwarePreset(presetId)?.name||'Button'} · ${field} updated in project library style.`)
    return result
  }
  const editNativeProperty=({kind,id,field,value,revision})=>{
    if(!clothcraftHybrid||!['pattern','fabric'].includes(kind)||!id)
      return Promise.resolve({ok:false,error:'Select a native pattern or fabric'})
    return new Promise(resolve=>{
      const requestId='exo-property-'+Date.now()+'-'+Math.random().toString(36).slice(2)
      let timer
      const finish=detail=>{
        window.removeEventListener('exo-clothcraft-property-result',receive)
        window.clearTimeout(timer)
        resolve({ok:Boolean(detail.ok),error:detail.error})
      }
      const receive=event=>{
        if(event.detail?.requestId!==requestId)return
        finish(event.detail)
      }
      window.addEventListener('exo-clothcraft-property-result',receive)
      timer=window.setTimeout(()=>finish({ok:false,error:'Native property update timed out; changes were not confirmed'}),15000)
      window.dispatchEvent(new CustomEvent('exo-clothcraft-edit-property',{
        detail:{requestId,kind,id,field,value,revision}
      }))
    })
  }
  // A single-fabric preset is distinct from the native whole-garment JSON.
  // A draft import changes one existing fabric and remains undoable; native
  // physical parameters are delegated to the Rust command boundary.
  const importFabricPreset=({kind,id,entry})=>{
    if(!id||!entry)return Promise.resolve({ok:false,error:'Select a fabric before opening a preset'})
    if(kind==='draft'){
      if(clothcraftHybrid)return Promise.resolve({ok:false,error:'Draft fabric import is unavailable in native mode'})
      if(!Object.hasOwn(project.fabrics||{},id))return Promise.resolve({ok:false,error:'Selected fabric no longer exists'})
      mutateProject(next=>{next.fabrics[id]={...next.fabrics[id],...entry,id}})
      setSelectedFabricId(id)
      setCommandResult(`Imported ${entry.name} into selected fabric; Undo restores its previous values.`)
      return Promise.resolve({ok:true})
    }
    if(!clothcraftHybrid||kind!=='native')return Promise.resolve({ok:false,error:'Unknown fabric file target'})
    return new Promise(resolve=>{
      const requestId='exo-fabric-import-'+Date.now()+'-'+Math.random().toString(36).slice(2)
      const receive=event=>{
        if(event.detail?.requestId!==requestId)return
        window.clearTimeout(timer)
        window.removeEventListener('exo-clothcraft-fabric-preset-result',receive)
        if(event.detail?.ok){
          const nextId=event.detail.fabricId||id
          setSelectedObjectForProperties({source:'native',type:'fabric',id:nextId,name:entry.name})
          setCommandResult(`Imported ${entry.name} into native cloth fabric; garment undo is available.`)
        }else setCommandResult(event.detail?.error||'Native fabric import failed')
        resolve({ok:Boolean(event.detail?.ok),error:event.detail?.error})
      }
      window.addEventListener('exo-clothcraft-fabric-preset-result',receive)
      const timer=window.setTimeout(()=>receive({detail:{requestId,ok:false,error:'Fabric import timed out; check native workspace state'}}),30000)
      window.dispatchEvent(new CustomEvent('exo-clothcraft-import-fabric-preset',{detail:{requestId,id,entry}}))
    })
  }

  const beginGesture = () => {
    if (!gestureStartRef.current) gestureStartRef.current = cloneProject(project)
  }

  const endGesture = () => {
    if (!gestureStartRef.current) return
    pushUndo(gestureStartRef.current)
    gestureStartRef.current = null
  }

  const undo = () => {
    if (!undoStack.length) return
    const previous = undoStack[undoStack.length - 1]
    setRedoStack((stack) => [...stack, cloneProject(project)].slice(-MAX_HISTORY))
    setUndoStack((stack) => stack.slice(0, -1))
    setProject(previous)
    setSaveState('modified')
  }

  const redo = () => {
    if (!redoStack.length) return
    const next = redoStack[redoStack.length - 1]
    setUndoStack((stack) => [...stack, cloneProject(project)].slice(-MAX_HISTORY))
    setRedoStack((stack) => stack.slice(0, -1))
    setProject(next)
    setSaveState('modified')
  }

  // CLO-style History panel: jump to an actual previous document snapshot.
  // Keep every skipped state on the Redo branch in its original order, so a
  // history jump is reversible by the same undo/redo engine as toolbar edits.
  const restoreHistorySnapshot = (index) => {
    if (!Number.isInteger(index) || index < 0 || index >= undoStack.length) return
    const target = cloneProject(undoStack[index])
    const forward = undoStack.slice(index + 1).map(cloneProject).reverse()
    setRedoStack(stack => [...stack, cloneProject(project), ...forward].slice(-MAX_HISTORY))
    setUndoStack(undoStack.slice(0, index))
    setProject(target)
    setSelectedPieceId(pieceId => target.pieces?.some(piece => piece.id === pieceId) ? pieceId : (target.pieces?.[0]?.id || null))
    setRunning(false)
    gestureStartRef.current = null
    setSaveState('modified')
    setCommandResult(`Returned to revision ${target.revision ?? 'unknown'} via History. Redo steps remain available.`)
  }

  const saveProject = () => {
    try {
      writeSavedProject(localStorage, STORAGE_KEY, BACKUP_STORAGE_KEY, project)
      projectRestoreBlocked = false
      setSaveState('saved')
      setCommandResult('Project saved. Previous valid revision kept as recovery backup.')
    } catch (error) {
      setSaveState('modified')
      setCommandResult(`Save failed: ${error.message}`)
    }
  }

  // The File Library stores complete, editable snapshots separately from the
  // current autosave and from Rust's live workspace. Save operations never
  // overwrite unrelated named projects.
  const remoteLibraryEntries = projects => (projects||[]).map(item=>({
    id:`team:${item.id}`,sharedProjectId:item.id,name:item.name||'Shared project',
    category:'garment',status:'working',createdAt:item.updatedAt,updatedAt:item.updatedAt,
    description:'Team project · shared versioned snapshot',currentVersion:item.revision,
    revisions:[],attachments:[],collection:'',tags:['Shared'],
  }))
  const refreshFileLibrary = async () => {
    const [records,collections] = await Promise.all([listLibraryProjects(),listLibraryCollections()])
    const entries = await Promise.all(records.map(async record => {
      const [revisions,attachments]=await Promise.all([listLibraryRevisions(record.id),listLibraryAttachments(record.id)])
      return {...record,collectionId:record.collection||'',revisions,attachments,
        measurements:record.metadata?.measurements||{},previewUrl:record.previewUrl||''}
    }))
    setFileLibraryEntries([...entries,...remoteLibraryEntries(fileCollaboration.projects)])
    setFileLibraryCollections(collections)
    return entries
  }
  const refreshFileCollaboration = async () => {
    try {
      const state=await collaboration.state()
      let profile=state.profile
      const designerName=studioCustomization.profile.displayName||studioCustomization.profile.brandName
      const personalAvatar=studioCustomization.profile.avatarDataUrl
      const syncLocalName=designerName&&(!profile?.displayName||profile.displayName===profile.userId)
      const syncLocalAvatar=personalAvatar&&personalAvatar.length<=180000&&personalAvatar!==profile?.avatarDataUrl
      if(syncLocalName||syncLocalAvatar) {
        profile=(await collaboration.updateProfile({displayName:syncLocalName?designerName:profile?.displayName||designerName||'Designer',bio:studioCustomization.profile.bio||'',...(syncLocalAvatar?{avatarDataUrl:personalAvatar}:{})})).profile
      }
      const teams=state.teams||[],projects=state.projects||[]
      setFileCollaboration(previous=>({...previous,online:true,error:'',profile,teams,projects,
        shares:state.shares||[],activeTeamId:previous.activeTeamId&&teams.some(team=>team.id===previous.activeTeamId)
          ?previous.activeTeamId:teams[0]?.id||''}))
      setFileLibraryEntries(previous=>[
        ...previous.filter(entry=>!entry.sharedProjectId),...remoteLibraryEntries(projects),
      ])
      return state
    } catch(error) {
      setFileCollaboration(previous=>({...previous,online:false,error:'Collaboration server unavailable. Your personal files remain accessible.'}))
      return null
    }
  }
  const openFileLibrary = async () => {
    setOpenMenu(null)
    setFileLibraryOpen(true)
    setFileLibraryError('')
    setFileLibraryLoading(true)
    try { await ensurePreservedGarmentsInLibrary();await refreshFileLibrary(); await refreshFileCollaboration() }
    catch(error){setFileLibraryError(error.message||'Unable to read saved projects')}
    finally{setFileLibraryLoading(false)}
  }
  const captureCurrentLibraryDocument = async () => {
    const engine=clothcraftHybrid?'native':'legacy'
    const data=clothcraftHybrid?await requestNativeLibraryProject('capture'):null
    const snapshot=clothcraftHybrid?data.project:cloneProject(project)
    if(engine==='legacy')validateSavedProject(snapshot)
    if(engine==='native'&&!snapshot?.template?.panels)throw Error('The native editor returned an incomplete save')
    const name=clothcraftHybrid?data.name:project.name
    // Prefer a live camera frame when WebGL supports readback. Fall back to
    // authored 2D geometry: every preview remains grounded in saved patterns.
    const previewUrl=captureVisibleCanvasPreview()||projectPatternPreview(snapshot,engine)
    return {engine,snapshot,name,previewUrl}
  }
  const archiveCurrentProject = async ({name,status='working',category='garment',collectionId='',notes=''}) => {
    const data=await captureCurrentLibraryDocument()
    const details=data.engine==='native'?data.snapshot.template:data.snapshot
    const panels=data.engine==='native'?details.panels:details.pieces
    const fabrics=data.engine==='native'?details.fabrics:Object.values(details.fabrics||{})
    const saved=await saveLibraryProject({name:name||data.name,status,category,collection:collectionId||'',notes,
      snapshot:data.snapshot,snapshotFormat:data.engine,previewUrl:data.previewUrl,
      metadata:{panels:panels?.length||0,seams:(details.seams||[]).length,
        measurements:details.measurements||details.customMeasurements||{},sourceEngine:data.engine},
      fabricBOM:(Array.isArray(fabrics)?fabrics:[]).map(f=>({id:f.id,name:f.name||f.id,composition:f.composition||'',color:f.color||''})),
      specs:{size:details.grading?.baseSize||'',sourceProjectId:details.id||''}})
    setFileLibraryCurrentId(saved.id)
    await refreshFileLibrary()
    return saved
  }
  const openSavedFileRecord = async (entry,overrideSnapshot=null,overrideFormat=null) => {
    try {
      const sharedId=entry.sharedProjectId||(String(entry.id).startsWith('team:')?String(entry.id).slice(5):null)
      const shared=sharedId?await collaboration.snapshot(sharedId):null
      const record=sharedId?{id:entry.id,name:entry.name||'Shared garment',
        snapshot:shared?.snapshot?.project,snapshotFormat:shared?.snapshot?.snapshotFormat,currentVersion:shared?.revision}:await getLibraryProject(entry.id)
      if(!record?.snapshot)throw Error('This file has no saved garment snapshot')
      const format=overrideFormat||record.snapshotFormat||'legacy'
      const snapshot=overrideSnapshot||record.snapshot
      if((format==='native')!==clothcraftHybrid){
        if(overrideSnapshot)throw Error('Open this project in its matching editor first, then select the earlier revision')
        sessionStorage.setItem('exo.fileLibrary.pendingOpen',record.id)
        const url=new URL(window.location.href)
        url.searchParams.set('engine',format==='native'?'clothcraft':'legacy')
        window.location.assign(url.toString())
        return
      }
      if(format==='native')await requestNativeLibraryProject('open',snapshot)
      else {
        validateSavedProject(snapshot)
        pushUndo(cloneProject(project))
        setProject(cloneProject(snapshot))
        setSelectedPieceId(snapshot.pieces?.[0]?.id||null)
        setRunning(false)
        projectRestoreBlocked=false
      }
      setFileLibraryCurrentId(record.id)
      if(sharedId) setFileCollaboration(previous=>({...previous,activity:[{action:`Opened shared revision ${shared.revision}`,createdAt:new Date().toISOString()},...previous.activity].slice(0,25)}))
      setFileLibraryOpen(false)
      setFileLibraryError('')
      setCommandResult(`Opened ${record.name} from File Library · V${record.currentVersion||1}`)
      return true
    }catch(error){setFileLibraryError(error.message||'Saved project could not be opened');return false}
  }
  const previousTeeMigrationRef=useRef(false)
  useEffect(()=>{
    // One-time local handoff requested for this desktop workspace: preserve
    // the exact live 501 before reopening the user's previous T-shirt. Never
    // do this to a different garment or repeat after the first successful run.
    if(!clothcraftHybrid||previousTeeMigrationRef.current||!clothcraftLive?.name||clothcraftLive.busy)return
    if(!/501|denim|jeans/i.test(clothcraftLive.name)||Number(clothcraftLive.panels)<20)return
    const key='exo.techpack-preserved-denim-switched-to-tee.20261025'
    try{if(localStorage.getItem(key)==='done')return}catch{return}
    previousTeeMigrationRef.current=true
    void (async()=>{
      await ensurePreservedGarmentsInLibrary()
      const captured=await captureCurrentLibraryDocument()
      const live=captured.snapshot
      if(captured.engine!=='native'||!Array.isArray(live?.template?.panels)||live.template.panels.length<20||
        !/501|denim|jeans/i.test(live.template.name||''))throw Error('The active garment changed; preserved backup retained, no switch performed')
      const record=await getLibraryProject(PRESERVED_DENIM_LIBRARY_ID)
      if(!record||record.snapshotFormat!=='native')throw Error('Preserved denim record is missing')
      // New revision of the preserved 501 project; never replace the earlier
      // archived version or an unrelated saved user project.
      await saveLibraryProject({id:PRESERVED_DENIM_LIBRARY_ID,snapshot:live,snapshotFormat:'native',
        notes:'Captured actual active 501 denim project immediately before opening the previous T-shirt',
        label:'Live denim handoff',previewUrl:captured.previewUrl})
      const tee=await getLibraryProject(PRESERVED_TSHIRT_LIBRARY_ID)
      if(!tee?.snapshot?.template?.panels||tee.snapshotFormat!=='native')throw Error('Previous T-shirt snapshot unavailable; denim is safely stored')
      await requestNativeLibraryProject('open',tee.snapshot)
      localStorage.setItem(key,'done')
      setFileLibraryCurrentId(PRESERVED_TSHIRT_LIBRARY_ID)
      setCommandResult('Preserved 501 denim as a reopenable project in File Library. Opened the previous EXO T-shirt.')
      await refreshFileLibrary()
    })().catch(error=>{
      setFileLibraryError(`T-shirt handoff was not completed; original garment unchanged: ${error.message}`)
    }).finally(()=>{previousTeeMigrationRef.current=false})
  },[clothcraftHybrid,clothcraftLive?.name,clothcraftLive?.panels,clothcraftLive?.busy])
  const updateSavedFileRecord = async (id,changes) => {
    await saveLibraryProject({id,...changes,...('collectionId'in changes?{collection:changes.collectionId||''}:{})})
    await refreshFileLibrary()
  }
  const saveFileRevision = async (id,{label='',notes=''}) => {
    if(fileLibraryCurrentId!==id)throw Error('Open this saved project before creating its next sample version')
    const capture=await captureCurrentLibraryDocument()
    const record=await getLibraryProject(id)
    if(record?.snapshotFormat!==capture.engine)throw Error('The current editor does not match this saved project')
    await addLibraryRevision(id,{snapshot:capture.snapshot,snapshotFormat:capture.engine,notes,label})
    await saveLibraryProject({id,previewUrl:capture.previewUrl})
    await refreshFileLibrary()
  }
  const restoreSavedFileRevision = async (entry,revision) => {
    try {
      const saved=await getLibraryRevision(revision.id)
      if(!saved||saved.projectId!==entry.id)throw Error('That revision is missing')
      const opened=await openSavedFileRecord(entry,saved.snapshot,saved.snapshotFormat)
      if(opened)setCommandResult(`Opened ${revision.label||'saved revision'} from ${entry.name}. Save a new version to retain these changes.`)
    }catch(error){setFileLibraryError(error.message||'Unable to restore version')}
  }
  const uploadFileToLibrary = async (id,file,{category='other'}={}) => {
    await saveLibraryAttachment(id,{blob:file,name:file.name,category,mimeType:file.type})
    await refreshFileLibrary()
  }
  const removeLibraryAttachment = async (id,attachmentId) => {
    if(!window.confirm('Remove this linked file from the project archive?'))return
    await deleteLibraryAttachment(attachmentId)
    await refreshFileLibrary()
  }
  const downloadLibraryFile = async (id,attachment) => {
    const item=await retrieveLibraryAttachment(attachment.id)
    const url=URL.createObjectURL(item.blob),a=document.createElement('a')
    a.href=url;a.download=item.name;a.click()
    window.setTimeout(()=>URL.revokeObjectURL(url),10000)
  }
  const exportFileLibrary = async () => {
    const backup=await exportLibraryBackup()
    const url=URL.createObjectURL(new Blob([JSON.stringify(backup)],{type:'application/json'})),a=document.createElement('a')
    a.href=url;a.download=`exo-file-library-${new Date().toISOString().slice(0,10)}.json`;a.click()
    window.setTimeout(()=>URL.revokeObjectURL(url),10000)
  }
  const importFileLibrary = async file => {
    const backup=JSON.parse(await file.text())
    await importLibraryBackup(backup,{conflict:'copy'})
    await refreshFileLibrary()
  }
  const fileLibraryImportRef=React.useRef(null)
  const chooseFileLibraryBackup=()=>fileLibraryImportRef.current?.click()
  const importChosenFileLibraryBackup=async event=>{
    const file=event.target.files?.[0]
    event.target.value=''
    if(!file)return
    try{await importFileLibrary(file);setFileLibraryError('')}
    catch(error){setFileLibraryError(error.message||'Library backup could not be imported')}
  }
  const sharedIdForLibraryItem=id=>String(id).startsWith('team:')?String(id).slice(5):readSharedProjectMapping()[id]?.remoteId||''
  const makeTeamForSharing=async(name,existingTeamId='')=>{
    if(existingTeamId)return existingTeamId
    const current=await collaboration.teams()
    if(current.teams?.[0])return current.teams[0].id
    return (await collaboration.createTeam(name||'My design studio')).team.id
  }
  const publishLibraryRecordToTeam=async(id,teamId,{remember=true}={})=>{
    const record=await getLibraryProject(id)
    if(!record?.snapshot)throw Error('Save this project to File Library before sharing it')
    const cached=remember?readSharedProjectMapping()[id]:null
    if(cached?.remoteId&&cached.teamId===teamId)return cached.remoteId
    const created=await collaboration.createProject({teamId,name:record.name||'Garment project'})
    const remoteId=created.project.id
    const published=await collaboration.publish(remoteId,0,{name:record.name,sourceLibraryId:id,
      snapshotFormat:record.snapshotFormat||'legacy',project:record.snapshot})
    if(remember)updateSharedProjectMapping(id,{remoteId,teamId,revision:published.revision})
    return remoteId
  }
  const watchSharedLibraryProject=async localId=>{
    const remoteId=sharedIdForLibraryItem(localId)
    if(remoteId===collaborationRoomId.current && collaborationRoomAbort.current&&!collaborationRoomAbort.current.signal.aborted) {
      setFileCollaboration(previous=>({...previous,selectedLocalId:localId}))
      return
    }
    collaborationRoomAbort.current?.abort()
    collaborationRoomId.current=''
    setFileCollaboration(previous=>({...previous,selectedLocalId:localId,comments:[],presence:[],members:[],revisionHistory:[]}))
    if(!remoteId||!fileCollaboration.online)return
    if(!collaborationSessionId.current)collaborationSessionId.current=crypto.randomUUID()
    const sessionId=collaborationSessionId.current
    const controller=new AbortController()
    collaborationRoomAbort.current=controller
    collaborationRoomId.current=remoteId
    controller.signal.addEventListener('abort',()=>{
      window.clearInterval(heartbeat)
      void leaveProjectPresence(remoteId,sessionId)
      if(collaborationRoomId.current===remoteId)collaborationRoomId.current=''
    },{once:true})
    let heartbeat
    const pullComments=async()=>{
      const payload=await collaboration.comments(remoteId)
      if(!controller.signal.aborted)setFileCollaboration(previous=>({...previous,
        comments:(payload.comments||[]).map(item=>{
          const author=previous.members.find(member=>member.userId===item.authorId)?.profile
          return {...item,targetId:localId,body:item.text,
            avatarDataUrl:author?.avatarDataUrl,
            authorName:author?.displayName|| (item.authorId===previous.profile?.userId?previous.profile?.displayName||'You':item.authorId)}
        })}))
    }
    await pullComments()
    if(controller.signal.aborted)return
    const pullPeopleAndHistory=async()=>{
      const [members,history]=await Promise.all([collaboration.members(remoteId),collaboration.history(remoteId)])
      if(controller.signal.aborted)return
      setFileCollaboration(previous=>({...previous,
        members:members.members||[],
        comments:previous.comments.map(item=>{
          const author=members.members?.find(person=>person.userId===item.authorId)?.profile
          return author?{...item,authorName:author.displayName||item.authorName,avatarDataUrl:author.avatarDataUrl}:item
        }),
        revisionHistory:(history.history||[]).map(item=>({
          ...item,authorProfile:members.members?.find(person=>person.userId===item.authorId)?.profile,
        })),
      }))
    }
    await pullPeopleAndHistory()
    if(controller.signal.aborted)return
    const onlineMembers=members=>(members||[]).filter(person=>person.online).map(person=>({id:person.userId,displayName:person.profile?.displayName||person.userId,avatarDataUrl:person.profile?.avatarDataUrl,role:person.role,online:true}))
    const present=await collaboration.presence(remoteId,sessionId)
    if(controller.signal.aborted){void leaveProjectPresence(remoteId,sessionId);return}
    if(!controller.signal.aborted)setFileCollaboration(previous=>({...previous,presence:onlineMembers(present.members)}))
    heartbeat=window.setInterval(()=>{if(!controller.signal.aborted)void collaboration.presence(remoteId,sessionId).catch(()=>{})},25000)
    void followProjectEvents(remoteId,event=>{
      if(controller.signal.aborted)return
      if(event.type==='comment')void pullComments().catch(()=>{})
      if(event.type==='presence')setFileCollaboration(previous=>({...previous,presence:onlineMembers(event.data.members),members:event.data.members||previous.members}))
      if(event.type==='membership'||event.type==='revision')void pullPeopleAndHistory().catch(()=>{})
      if(event.type==='revision')void refreshFileCollaboration()
      if(event.type==='revision'||event.type==='comment')setFileCollaboration(previous=>({...previous,activity:[{action:event.type==='revision'?'New shared garment revision':'New comment',createdAt:new Date().toISOString()},...previous.activity].slice(0,25)}))
    },controller.signal).catch(error=>{if(!controller.signal.aborted)setFileCollaboration(previous=>({...previous,error:`Live project updates disconnected: ${error.message}`}))})
  }
  const handleFileCollaborationAction=async(action,payload={})=>{
    if(action==='profile.settings'){
      setStudioSettingsTab('profile')
      setStudioSettingsOpen(true)
      return
    }
    if(action==='profile.update'){
      const displayName=String(payload.displayName||'').trim()
      if(!displayName)throw Error('Enter a designer name')
      const avatarUpdate=typeof payload.avatarDataUrl==='string'&&payload.avatarDataUrl.startsWith('data:image/')?{avatarDataUrl:payload.avatarDataUrl}:{}
      if(fileCollaboration.online)await collaboration.updateProfile({displayName,bio:studioCustomization.profile.bio||'',...avatarUpdate})
      setStudioCustomization(previous=>normalizeStudioCustomization({...previous,profile:{...previous.profile,displayName,...avatarUpdate}}))
      setFileCollaboration(previous=>({...previous,profile:{...previous.profile,displayName,...avatarUpdate}}))
      return
    }
    if(!fileCollaboration.online)throw Error('Start the local collaboration service to share and comment with teammates')
    if(action==='team.create'){
      const result=await collaboration.createTeam(String(payload.name||'').trim())
      setFileCollaboration(previous=>({...previous,activeTeamId:result.team.id}))
    } else if(action==='team.select'){
      if(!fileCollaboration.teams.some(team=>team.id===payload.teamId))throw Error('Team is not available')
      setFileCollaboration(previous=>({...previous,activeTeamId:payload.teamId}))
      return
    } else if(action==='project.select'){
      await watchSharedLibraryProject(payload.targetId)
      return
    } else if(action==='share.create'){
      const kind=payload.targetType
      let targetType='project',targetId=''
      if(kind==='project'){
        if(String(payload.targetId).startsWith('team:'))targetId=sharedIdForLibraryItem(payload.targetId)
        else {
          const preferred=fileCollaboration.activeTeamId
          const teamId=await makeTeamForSharing(studioCustomization.profile.brandName||'My design studio',preferred)
          targetId=await publishLibraryRecordToTeam(payload.targetId,teamId)
        }
      }else if(kind==='collection'||kind==='library'){
        const collection=kind==='collection'?fileLibraryCollections.find(item=>item.id===payload.targetId):null
        if(kind==='collection'&&!collection)throw Error('Select a collection to share')
        const name=kind==='library'?'Shared File Library':`Shared collection · ${collection.name}`
        const team=(await collaboration.createTeam(name)).team
        const records=await listLibraryProjects()
        const selected=kind==='collection'?records.filter(item=>item.collection===collection.id):records
        for(const record of selected)await publishLibraryRecordToTeam(record.id,team.id,{remember:false})
        targetType='team';targetId=team.id
      }else throw Error('Choose a project, collection, or library')
      const invite=await collaboration.share({targetType,targetId,email:payload.email,permission:payload.permission})
      setFileCollaboration(previous=>({...previous,lastInviteToken:invite.inviteToken,
        lastInviteEmail:payload.email,lastInviteTarget:kind,activity:[{action:`Invitation created for ${payload.email}. Copy the token to share it securely; no email was sent.`,createdAt:new Date().toISOString()},...previous.activity].slice(0,25)}))
    } else if(action==='share.update')await collaboration.updateShare(payload.shareId,payload.permission)
    else if(action==='share.revoke')await collaboration.revokeShare(payload.shareId)
    else if(action==='share.redeem')await collaboration.redeemShare(String(payload.inviteToken||'').trim())
    else if(action==='comment.create'){
      let remoteId=sharedIdForLibraryItem(payload.targetId)
      if(!remoteId){const teamId=await makeTeamForSharing(studioCustomization.profile.brandName||'My design studio',fileCollaboration.activeTeamId);remoteId=await publishLibraryRecordToTeam(payload.targetId,teamId)}
      await collaboration.comment(remoteId,payload.body)
      await watchSharedLibraryProject(payload.targetId)
    } else if(action==='snapshot.publish'){
      const id=payload.targetId,remoteId=sharedIdForLibraryItem(id)
      if(!remoteId)throw Error('Share this saved project first to create a team copy')
      const isRemote=String(id).startsWith('team:')
      const localRecord=isRemote?null:await getLibraryProject(id)
      const captured=fileLibraryCurrentId===id?await captureCurrentLibraryDocument():null
      if(!captured&&!localRecord?.snapshot)throw Error('Open the shared project before publishing changes')
      const mapping=readSharedProjectMapping()[id]
      const expectedRevision=isRemote?(fileCollaboration.projects.find(p=>p.id===remoteId)?.revision??0):(mapping?.revision??0)
      const published=await collaboration.publish(remoteId,expectedRevision,{name:captured?.name||localRecord?.name,
        snapshotFormat:captured?.engine||localRecord.snapshotFormat,project:captured?.snapshot||localRecord.snapshot})
      if(!isRemote)updateSharedProjectMapping(id,{revision:published.revision})
      setFileCollaboration(previous=>({...previous,activity:[{action:`Published shared garment revision ${published.revision}`,createdAt:new Date().toISOString()},...previous.activity].slice(0,25)}))
    } else if(action==='snapshot.open'){
      const id=payload.targetId,remoteId=sharedIdForLibraryItem(id)
      if(!remoteId)throw Error('This project has no team snapshot')
      if(String(id).startsWith('team:'))await openSavedFileRecord({id,sharedProjectId:remoteId,name:fileCollaboration.projects.find(item=>item.id===remoteId)?.name})
      else {
        const shared=await collaboration.snapshot(remoteId)
        if(!shared.snapshot?.project)throw Error('Shared project has no garment snapshot')
        await openSavedFileRecord({id},shared.snapshot.project,shared.snapshot.snapshotFormat)
        updateSharedProjectMapping(id,{revision:shared.revision})
      }
    }else throw Error(`Unknown collaboration action: ${action}`)
    await refreshFileCollaboration()
  }
  useEffect(()=>{void refreshFileCollaboration()},[])
  // Joining a garment also joins its live presence room, even when the user
  // never opens the Sharing sidebar. The top-right avatar row follows the
  // current garment rather than a previously selected library file.
  useEffect(()=>{
    if(!fileCollaboration.online)return
    if(fileLibraryCurrentId)void watchSharedLibraryProject(fileLibraryCurrentId).catch(()=>{})
  },[fileLibraryCurrentId,fileCollaboration.online])
  useEffect(()=>{
    const leave=()=>collaborationRoomAbort.current?.abort()
    window.addEventListener('pagehide',leave)
    return()=>{window.removeEventListener('pagehide',leave);leave()}
  },[])
  useEffect(()=>{
    if(sidebarView!=='sharing')return
    void Promise.all([refreshFileLibrary(),refreshFileCollaboration()])
  },[sidebarView])
  const selectFileLibraryAsset=(type,id)=>{
    if(type==='photoShootSets'){
      const preset=getPhotoShootSet(id)
      if(!preset)return
      setStudioCustomization(previous=>normalizeStudioCustomization({...previous,appearance:{...previous.appearance,
        environmentPreset:preset.environmentPreset,backgroundMode:'color',studioColor:preset.background,
        lightColor:preset.lightColor,lightIntensity:preset.lightIntensity,
        lightPositionX:preset.lightPosition[0],lightPositionY:preset.lightPosition[1],lightPositionZ:preset.lightPosition[2]}}))
      updateRenderSetting('environmentPreset',preset.environmentPreset)
      setCommandResult(`Photo shoot set applied: ${preset.name}. Adjust backdrop and lighting in Studio Settings.`)
      setFileLibraryOpen(false)
      return
    }
    const folders={hardware:'Hardware and Trims',studioSets:'Stage',fabrics:'Fabric'}
    const catalog={hardware:listHardwarePresets(),studioSets:listStagePresets(),fabrics:Object.values(FABRIC_PRESETS)}
    const item=catalog[type]?.find(asset=>(asset.id||asset.name)===id)
    const category=folders[type]
    if(!category)return
    setAssetCategory(category)
    setLibraryFolder('all')
    setLibrarySearch(item?.name||'')
    setLibraryVisible(true)
    setSidebarView('library')
    setFileLibraryOpen(false)
    setActiveSection(type==='studioSets'?'Render':type==='hardware'?'Sewing':'Fabric')
  }
  useEffect(()=>{
    const id=sessionStorage.getItem('exo.fileLibrary.pendingOpen')
    if(!id)return
    sessionStorage.removeItem('exo.fileLibrary.pendingOpen')
    const timer=window.setTimeout(()=>{void openSavedFileRecord({id})},1000)
    return()=>window.clearTimeout(timer)
  },[])

  useEffect(() => {
    if(!studioCustomization.preferences.autoSave)return undefined
    const timer = window.setTimeout(() => {
      if (projectRestoreBlocked) return
      try {
        writeSavedProject(localStorage, STORAGE_KEY, BACKUP_STORAGE_KEY, project)
        setSaveState('saved')
      } catch (error) {
        console.warn('Autosave failed', error)
        setSaveState('modified')
        setCommandResult(`Autosave failed: ${error.message}`)
      }
    }, 550)
    return () => window.clearTimeout(timer)
  }, [project,studioCustomization.preferences.autoSave])

  useEffect(() => {
    const handler = (event) => {
      const editing = Boolean(event.target?.closest?.('input,textarea,select,[contenteditable="true"]'))
      // Let native text fields handle their own editing and undo shortcuts.
      if (editing) return
      if (event.code === 'Space' && (animationWorkspaceActive || printLayoutActive)) {
        event.preventDefault()
        if (animationWorkspaceActive && !event.repeat) window.dispatchEvent(new Event('exo-clothcraft-animation-toggle'))
        return
      }
      if (clothcraftHybrid) {
        // The embedded Rust workspace owns shortcuts while it has focus. In
        // V2 chrome (menus, sidebars, palettes) send global shortcuts to that
        // same native document, never to the hidden legacy project.
        if(event.defaultPrevented||event.target?.closest?.('.cc-embedded-root'))return
        const modified=(event.metaKey||event.ctrlKey)&&!event.altKey
        const key=event.key.toLowerCase()
        let nativeCommand=null
        if(modified&&key==='s')nativeCommand='save'
        else if(modified&&key==='z')nativeCommand=event.shiftKey?'redo':'undo'
        else if(modified&&key==='y')nativeCommand='redo'
        else if(!event.metaKey&&!event.ctrlKey&&!event.altKey&&event.code==='Space'&&!event.target?.closest?.('button,[role="button"]'))nativeCommand='toggle-sim'
        if(nativeCommand){
          event.preventDefault()
          window.dispatchEvent(new CustomEvent('exo-clothcraft-command',{detail:nativeCommand}))
        }
        return
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        saveProject()
        return
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
        return
      }
      if (event.code === 'Space') {
        event.preventDefault()
        toggleSimulation()
        return
      }
      if (!event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) {
        const in2D = Boolean(event.target?.closest?.('.pattern-canvas'))
        if (in2D) {
          if (event.key.toLowerCase() === 'a') { setTool('select'); setActiveSection('Pattern') }
          if (event.key.toLowerCase() === 'z') { setTool('point'); setActiveSection('Pattern') }
          if (event.key.toLowerCase() === 'p') { setTool('pin'); setActiveSection('Pattern') }
        } else {
          if (event.key.toLowerCase() === 't') setViewportTool('transform')
          if (event.key.toLowerCase() === 'g') setViewportTool('move')
          if (event.key.toLowerCase() === 'r') setViewportTool('rotate')
          if (event.key.toLowerCase() === 'q' || event.key === 'Escape') setViewportTool('orbit')
          // CLO divided-gizmo keys, while retaining existing G/R/T aliases.
          if (event.key.toLowerCase() === 'w') setViewportTool('move')
          if (event.key.toLowerCase() === 'e') setViewportTool('rotate')
          if (event.key.toLowerCase() === 'h') setViewportTool('hand')
          if (event.key.toLowerCase() === 'v') setShowSewingGuides(value => !value)
        }
      }
      // Nudge only the flat 3D arrangement, never a live physical solve.
      if (!event.metaKey && !event.altKey && !hasSimulated && selectedPieceId &&
          event.target?.closest?.('.three-mount') &&
          ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault()
        const amount = event.shiftKey ? 0.01 : 0.0025
        const depth = event.ctrlKey
        const offset = depth
          ? { x: 0, y: 0, z: event.key === 'ArrowUp' ? -amount : event.key === 'ArrowDown' ? amount : 0 }
          : { x: event.key === 'ArrowLeft' ? -amount : event.key === 'ArrowRight' ? amount : 0,
              y: event.key === 'ArrowUp' ? amount : event.key === 'ArrowDown' ? -amount : 0, z: 0 }
        moveStagedPanel(selectedPieceId, offset)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  const movePiece = (pieceId, layout2d) => {
    mutateProject((next) => {
      const piece = next.pieces.find((item) => item.id === pieceId)
      if (piece) piece.layout2d = layout2d
    }, { record: false })
  }

  const tidy2DPatterns = () => {
    const pieces = project.pieces || []
    if (!pieces.length) return
    // Pack the drawn boundary boxes, not their pattern origin points. Preserve
    // shape, curve control points, stable IDs, seam graph, and each local
    // pattern coordinate while placing complete pieces in separated cells.
    const dimensions = pieces.map((piece) => {
      const points = samplePieceBoundary(piece, 16).points
      const minX = Math.min(0, ...points.map((point) => point.x))
      const maxX = Math.max(0, ...points.map((point) => point.x))
      const minY = Math.min(0, ...points.map((point) => point.y))
      const maxY = Math.max(0, ...points.map((point) => point.y))
      return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY }
    })
    const columns = Math.max(1, Math.min(pieces.length <= 4 ? 2 : 3, pieces.length))
    const columnWidths = Array.from({ length: columns }, () => 0)
    const rowHeights = Array.from({ length: Math.ceil(pieces.length / columns) }, () => 0)
    dimensions.forEach((item, i) => {
      const col = i % columns, row = Math.floor(i / columns)
      columnWidths[col] = Math.max(columnWidths[col], item.width)
      rowHeights[row] = Math.max(rowHeights[row], item.height)
    })
    const gap = 23
    const xOffsets = columnWidths.map((_, i) => 20 + columnWidths.slice(0, i).reduce((total, width) => total + width + gap, 0))
    const yOffsets = rowHeights.map((_, i) => 33 + rowHeights.slice(0, i).reduce((total, height) => total + height + gap, 0))
    mutateProject((next) => {
      next.pieces.forEach((piece, i) => {
        const item = dimensions[i]
        piece.layout2d = {
          x: xOffsets[i % columns] - item.minX,
          y: yOffsets[Math.floor(i / columns)] + item.maxY,
        }
      })
    })
    setLayout2DSignal((value) => value + 1)
    setCommandResult('Arranged 2D pattern pieces in separated drafting rows. All pattern shapes, sewing edges, and 3D placements are preserved.')
  }

  const moveStagedPanel = (pieceId, offset) => {
    mutateProject((next) => {
      const piece = next.pieces.find((item) => item.id === pieceId)
      if (!piece) return
      piece.arrangement3d = piece.arrangement3d || {}
      for (const [axis, delta] of [['X', offset.x], ['Y', offset.y], ['Z', offset.z]]) {
        const field = `stagingOffset${axis}`
        const previous = Number(piece.arrangement3d[field] || 0)
        const nextValue = clamp(previous + Number(delta || 0), -2, 2)
        piece.arrangement3d[field] = nextValue
        // Record actual user translation separately: shipped garment
        // templates already contain intentional staging corrections and
        // those must not be mistaken for manually mispositioned fabric.
        const manualField = `userPlacementDelta${axis}`
        piece.arrangement3d[manualField] = clamp(Number(piece.arrangement3d[manualField] || 0) + (nextValue - previous), -2, 2)
      }
      if (offset.rotation) {
        for (const axis of ['X', 'Y', 'Z']) {
          const value = Number(offset.rotation[axis.toLowerCase()])
          if (Number.isFinite(value)) {
            if(Math.abs(value-Number(piece.arrangement3d[`stagingRotation${axis}`]||0))>1e-6)
              piece.arrangement3d.userPlacementRotationEdited=true
            piece.arrangement3d[`stagingRotation${axis}`] = value
          }
        }
      }
    })
    setCommandResult('Transformed selected 3D panel. 2D drafting geometry and sewing connections remain linked.')
  }

  const setStagedPlacementField = (pieceId, field, value) => {
    if (hasSimulated) return
    if (!/^staging(Offset|Rotation)[XYZ]$/.test(field)) return
    mutateProject((next) => {
      const piece = next.pieces.find(item => item.id === pieceId)
      if (!piece) return
      piece.arrangement3d = piece.arrangement3d || {}
      const previous = Number(piece.arrangement3d[field] || 0)
      const nextValue = field.startsWith('stagingOffset')
        ? clamp(Number(value) / 100, -2, 2)
        : clamp(Number(value), -360, 360)
      piece.arrangement3d[field] = nextValue
      if (field.startsWith('stagingOffset')) {
        const manualField = `userPlacementDelta${field.at(-1)}`
        piece.arrangement3d[manualField] = clamp(Number(piece.arrangement3d[manualField] || 0) + (nextValue - previous), -2, 2)
      } else if(Math.abs(nextValue-previous)>1e-6) {
        piece.arrangement3d.userPlacementRotationEdited=true
      }
    })
  }
  const resetStagedPlacement = (pieceId) => {
    if (hasSimulated) return
    mutateProject((next) => {
      const piece = next.pieces.find(item => item.id === pieceId)
      if (!piece) return
      piece.arrangement3d = piece.arrangement3d || {}
      for (const axis of ['X', 'Y', 'Z']) {
        piece.arrangement3d[`stagingOffset${axis}`] = 0
        piece.arrangement3d[`stagingRotation${axis}`] = 0
        piece.arrangement3d[`userPlacementDelta${axis}`] = 0
      }
      piece.arrangement3d.userPlacementRotationEdited=false
    })
  }

  const selectIn3D = (pieceId) => {
    setSelectedPieceId(pieceId)
    // Select inside the 3D model and activate the on-fabric rotation circles
    // plus XYZ movement arrows rather than a camera widget in the corner.
    if (pieceId && viewportTool === 'orbit' && (!hasSimulated || (
      !running && (project.simulation?.backendId || 'browser-pbd') === 'browser-pbd'
    ))) setViewportTool('transform')
    if (pieceId && !['Sewing', 'Production'].includes(activeSection)) setActiveSection('Pattern')
  }

  const movePoint = (pieceId, pointIndex, point) => {
    const original = project.pieces.find(item => item.id === pieceId)
    if (!original || original.locked || !isDraftEditValid(original,{pointIndex,point},{curveSamples:8})) return
    mutateProject((next) => {
      const piece = next.pieces.find((item) => item.id === pieceId)
      if (piece?.points?.[pointIndex] && !piece.locked) {
        // Preserve the vertex's grading, source-curve and parametric metadata
        // when only its X/Y coordinates are being dragged.
        piece.points[pointIndex] = { ...piece.points[pointIndex], x:point.x, y:point.y }
      }
    }, { record: false })
  }

  const setPointPrecision = (pieceId, pointIndex, point) => {
    // Numeric CAD edits are discrete history operations. Pointer drags use
    // their own begin/end gesture transaction instead.
    const original = project.pieces.find(item => item.id === pieceId)
    if (!original || original.locked || !isDraftEditValid(original,{pointIndex,point},{curveSamples:24})) {
      setCommandResult('Invalid pattern edit: cutting boundaries must remain closed and non-self-intersecting.')
      return false
    }
    mutateProject((next) => {
      const piece = next.pieces.find((item) => item.id === pieceId)
      if (piece?.points?.[pointIndex] && !piece.locked) {
        // A numeric XY edit must not erase persistent vertex metadata such as
        // grading, source references or IDs when a caller supplies only XY.
        piece.points[pointIndex] = {
          ...piece.points[pointIndex],
          x: point.x,
          y: point.y,
        }
      }
    })
    return true
  }

  const moveCurve = (pieceId, edgeIndex, curve) => {
    const original = project.pieces.find(item => item.id === pieceId)
    if (!original || original.locked || !isDraftEditValid(original,{edgeIndex,curve},{curveSamples:8})) return
    mutateProject((next) => {
      const piece = next.pieces.find((item) => item.id === pieceId)
      if (!piece) return
      piece.curves = { ...(piece.curves || {}) }
      if (curve) piece.curves[edgeIndex] = curve
      else delete piece.curves[edgeIndex]
    }, { record: false })
  }

  const setCurvePrecision = (pieceId, edgeIndex, curve) => {
    // A numeric curve edit or straighten is a single undoable CAD transaction.
    // Pointer drags continue to use their existing gesture history.
    if (curve && (!Number.isFinite(curve.cx) || !Number.isFinite(curve.cy)
      || Math.abs(curve.cx) > 100000 || Math.abs(curve.cy) > 100000)) return false
    if (!Number.isInteger(edgeIndex) || edgeIndex < 0) return false
    const source = project.pieces.find(item => item.id === pieceId)
    if (!source || source.locked || edgeIndex >= source.points.length) return false
    if (!isDraftEditValid(source,{edgeIndex,curve},{curveSamples:24})) {
      setCommandResult('Invalid pattern curve: the new cutline overlaps or crosses itself.')
      return false
    }
    mutateProject((next) => {
      const piece = next.pieces.find(item => item.id === pieceId)
      if (!piece || piece.locked || edgeIndex >= piece.points.length) return
      piece.curves = { ...(piece.curves || {}) }
      if (curve) piece.curves[edgeIndex] = { cx: curve.cx, cy: curve.cy }
      else delete piece.curves[edgeIndex]
    })
    return true
  }

  useEffect(() => {
    setTransformDraft({ scaleX: 100, scaleY: 100, rotateDeg: 0, slashCm: 4 })
  }, [selectedPieceId])

  const transformPieceGeometry = (piece, mapPoint) => {
    piece.points = piece.points.map((point) => mapPoint(point))
    if (piece.curves) {
      piece.curves = Object.fromEntries(Object.entries(piece.curves).map(([edgeIndex, curve]) => {
        const transformed = mapPoint({ x: curve.cx, y: curve.cy })
        return [edgeIndex, { cx: transformed.x, cy: transformed.y }]
      }))
    }
    piece.internalLines = (piece.internalLines || []).map((line) => ({
      ...line,
      a: mapPoint(line.a),
      b: mapPoint(line.b),
    }))
    piece.pins = (piece.pins || []).map((pin) => ({ ...pin, ...mapPoint(pin) }))
  }

  const applyPatternTransform = () => {
    if (!selectedPiece) return
    const sx = clamp(transformDraft.scaleX, 10, 300) / 100
    const sy = clamp(transformDraft.scaleY, 10, 300) / 100
    const rotation = clamp(transformDraft.rotateDeg, -180, 180) * Math.PI / 180
    mutateProject((next) => {
      const piece = next.pieces.find((item) => item.id === selectedPiece.id)
      if (!piece) return
      const center = {
        x: piece.points.reduce((sum, point) => sum + point.x, 0) / piece.points.length,
        y: piece.points.reduce((sum, point) => sum + point.y, 0) / piece.points.length,
      }
      const cos = Math.cos(rotation)
      const sin = Math.sin(rotation)
      transformPieceGeometry(piece, (point) => {
        const x = (point.x - center.x) * sx
        const y = (point.y - center.y) * sy
        return {
          x: center.x + x * cos - y * sin,
          y: center.y + x * sin + y * cos,
        }
      })
      piece.grainAngleDeg = (piece.grainAngleDeg || 0) + clamp(transformDraft.rotateDeg, -180, 180)
    })
    setTransformDraft((current) => ({ ...current, scaleX: 100, scaleY: 100, rotateDeg: 0 }))
    setCommandResult('Applied precise scale/rotation to outline, curves, internal geometry, and grain direction.')
  }

  const applySlashSpread = () => {
    if (!selectedPiece) return
    const amount = clamp(transformDraft.slashCm, -20, 30)
    mutateProject((next) => {
      const piece = next.pieces.find((item) => item.id === selectedPiece.id)
      if (!piece) return
      const xs = piece.points.map((point) => point.x)
      const ys = piece.points.map((point) => point.y)
      const centerX = (Math.min(...xs) + Math.max(...xs)) * 0.5
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)
      const height = Math.max(1, maxY - minY)
      transformPieceGeometry(piece, (point) => {
        const hemInfluence = 1 - Math.max(0, Math.min(1, (point.y - minY) / height))
        const side = Math.sign(point.x - centerX)
        return {
          x: point.x + side * amount * 0.5 * hemInfluence,
          y: point.y,
        }
      })
    })
    setCommandResult(`Applied ${amount.toFixed(1)} cm slash/spread change at the hem while holding the top edge.`)
  }

  const edgeIsSewn = (pieceId, edgeIndex) => project.seams.some((seam) => (
    (seam.a.pieceId === pieceId && seam.a.edgeIndex === edgeIndex)
    || (seam.b.pieceId === pieceId && seam.b.edgeIndex === edgeIndex)
  ))

  const splitPatternEdge = (pieceId, edgeIndex, t = 0.5) => {
    mutateProject((next) => {
      splitPieceEdgeInProject(next, pieceId, edgeIndex, t)
    })
    setCommandResult(edgeIsSewn(pieceId, edgeIndex)
      ? 'Sewn pattern edge split; seam ranges were remapped across the new topology.'
      : 'Pattern edge split with a new editable anchor point.')
  }

  const splitPatternEdgePrecise = (pieceId, edgeIndex, options) => {
    const source = project.pieces.find(item => item.id === pieceId)
    if (!source || source.locked) return
    // Validate all requested geometry *before* entering the Undo transaction.
    const fractions = draftingSplitFractions(source, edgeIndex, options)
    mutateProject(next => {
      let currentIndex = edgeIndex
      let previousFraction = 0
      for (const target of fractions) {
        const piece = next.pieces.find(item => item.id === pieceId)
        const remainder = (target - previousFraction) / (1 - previousFraction)
        // For Bézier edges a half-parameter split does NOT mean half-length;
        // use the exact arc-length inverse on the remaining curve section.
        const parameter = splitParameterAtArcFraction(piece, currentIndex, remainder)
        const result = splitPieceEdgeInProject(next, pieceId, currentIndex, parameter)
        if (!result) throw new Error('Unable to split the selected pattern edge')
        currentIndex += 1
        previousFraction = target
      }
    })
    setCommandResult('Split edge into ' + (fractions.length + 1) +
      ' true-length segments. Existing notch and sewing references were remapped in one Undo step.')
  }

  const unfoldPatternEdge = (pieceId, foldEdgeIndex) => {
    const source = project.pieces.find(item => item.id === pieceId)
    if (!source || source.locked) return { ok:false, message:'Select and unlock a pattern' }
    const blockers = ['topstitches','bindings','zippers','buttons','buttonholes','graphics','pins']
      .filter(name => (source[name] || []).length > 0)
    if (blockers.length) {
      const message = 'Unfold this piece before adding ' + blockers.join(', ') +
        ' to avoid dropping manufacturing details'
      setCommandResult(message)
      return { ok:false, message }
    }
    if (source.linkedMirrorSourceId) {
      return { ok:false, message:'Unfold the original half-pattern, not its linked mirror' }
    }
    const linkedFoldSeam = (project.seams || []).some(seam =>
      [seam.a,seam.b].some(end => end?.pieceId === pieceId && end.edgeIndex === foldEdgeIndex))
    if (linkedFoldSeam) {
      return { ok:false, message:'Fold edge is sewn: remove that sewing relation before unfolding' }
    }
    try {
      const result = unfoldDraftPiece(source,foldEdgeIndex)
      mutateProject(next => {
        const index = next.pieces.findIndex(item => item.id === pieceId)
        if (index < 0) return
        next.pieces[index] = result.piece
        for (const seam of next.seams || []) {
          for (const endpoint of [seam.a,seam.b]) {
            if (endpoint?.pieceId !== pieceId) continue
            const mapped = result.edgeMap[endpoint.edgeIndex]
            if (!Number.isInteger(mapped)) throw new Error('Unfold would break a sewn edge')
            endpoint.edgeIndex = mapped
          }
        }
      })
      setCommandResult('Unfolded the half-pattern across the selected straight edge. Curves, notch positions, internal lines and remaining sewing edges were remapped.')
      return { ok:true }
    } catch (error) {
      setCommandResult(error.message)
      return { ok:false, message:error.message }
    }
  }

  const deletePatternPoint = (pieceId, pointIndex) => {
    const piece = project.pieces.find((item) => item.id === pieceId)
    let deletion
    try {
      deletion = planDraftPointDeletion(piece, pointIndex)
    } catch (error) {
      setCommandResult(error.message)
      return
    }
    const count = deletion.count
    const previousEdge = deletion.previous
    const currentEdge = pointIndex
    if (edgeIsSewn(pieceId, previousEdge) || edgeIsSewn(pieceId, currentEdge)) {
      setCommandResult('Unsew the adjacent edge before deleting this point.')
      return
    }
    mutateProject((next) => {
      const target = next.pieces.find((item) => item.id === pieceId)
      if (!target || target.points.length <= 3) return
      const oldCount = target.points.length
      const oldEdgeAllowances = { ...(target.edgeSeamAllowances || {}) }
      const oldPreviousEdge = (pointIndex - 1 + oldCount) % oldCount
      const oldCurrentEdge = pointIndex
      const mergedAllowance = Math.max(
        getEdgeSeamAllowance(target, oldPreviousEdge),
        getEdgeSeamAllowance(target, oldCurrentEdge),
      )
      // Geometry was validated before the undo transaction: keep every
      // surviving point object (including grading IDs) and indexed curve.
      target.points.splice(pointIndex, 1)
      target.curves = { ...deletion.curves }
      const nextEdgeAllowances = {}
      const mergedEdgeIndex = pointIndex === 0 ? oldCount - 2 : pointIndex - 1
      for (const [rawIndex, value] of Object.entries(oldEdgeAllowances)) {
        const index = Number(rawIndex)
        if (index === oldPreviousEdge || index === oldCurrentEdge) continue
        if (pointIndex === 0) {
          if (index > 0 && index < oldCount - 1) nextEdgeAllowances[index - 1] = value
        } else {
          nextEdgeAllowances[index > pointIndex ? index - 1 : index] = value
        }
      }
      if (Math.abs(mergedAllowance - Number(target.seamAllowance || 0)) > 1e-6) nextEdgeAllowances[mergedEdgeIndex] = mergedAllowance
      target.edgeSeamAllowances = nextEdgeAllowances

      for (const seam of next.seams) {
        for (const endpoint of [seam.a, seam.b]) {
          if (endpoint.pieceId !== pieceId) continue
          if (pointIndex === 0 && endpoint.edgeIndex > 0) endpoint.edgeIndex -= 1
          else if (pointIndex > 0 && endpoint.edgeIndex > pointIndex) endpoint.edgeIndex -= 1
        }
      }
      target.notches = (target.notches || []).map((notch) => {
        if (pointIndex === 0) return { ...notch, edgeIndex: notch.edgeIndex > 0 ? notch.edgeIndex - 1 : notch.edgeIndex }
        return { ...notch, edgeIndex: notch.edgeIndex > pointIndex ? notch.edgeIndex - 1 : notch.edgeIndex }
      })
      // Hardware and finishing entities also refer to numeric outline edges.
      // Deleting a non-adjacent vertex must retarget them to the same edge.
      for (const collection of ['topstitches', 'bindings', 'zippers']) {
        target[collection] = (target[collection] || []).map((item) => {
          const mapped = deletedPointEdgeIndex(item.edgeIndex, pointIndex, oldCount)
          return mapped === null ? item : { ...item, edgeIndex: mapped }
        })
      }
    })
    setCommandResult('Pattern point removed and edge indices repaired.')
  }

  const createInternalLine = (pieceId, line) => {
    mutateProject((next) => {
      const piece = next.pieces.find((item) => item.id === pieceId)
      if (!piece) return
      piece.internalLines = piece.internalLines || []
      piece.internalLines.push({
        id: uniqueId('internal'),
        name: `Internal ${piece.internalLines.length + 1}`,
        type: 'construction',
        widthCm: 2.5,
        ...line,
      })
    }, { record: false })
  }

  const updateInternalLine = (pieceId, lineId, field, value) => {
    mutateProject((next) => {
      const piece = next.pieces.find((item) => item.id === pieceId)
      const line = piece?.internalLines?.find((item) => item.id === lineId)
      if (line) line[field] = value
    })
  }

  const removeInternalLine = (pieceId, lineId) => {
    mutateProject((next) => {
      const piece = next.pieces.find((item) => item.id === pieceId)
      if (piece) piece.internalLines = (piece.internalLines || []).filter((line) => line.id !== lineId)
    })
  }

  const createPin = (pieceId, point) => {
    mutateProject((next) => {
      const piece = next.pieces.find((item) => item.id === pieceId)
      if (!piece) return
      piece.pins = piece.pins || []
      piece.pins.push({ id: uniqueId('pin'), x: point.x, y: point.y, stiffness: 1 })
    })
    setCommandResult('Manual cloth pin added. It will hold this location during simulation.')
  }

  const removePin = (pieceId, pinId) => {
    mutateProject((next) => {
      const piece = next.pieces.find((item) => item.id === pieceId)
      if (piece) piece.pins = (piece.pins || []).filter((pin) => pin.id !== pinId)
    })
    setCommandResult('Manual cloth pin removed.')
  }

  const createSeam = (a, b) => {
    const partial = [a, b].some((endpoint) => endpoint.startT !== undefined || endpoint.endT !== undefined)
    const created = applySewingAssemblyAction20261024(project, {
      kind:'seam.create', id:uniqueId('seam'),
      name:`${partial ? 'Free sewing' : 'Segment sewing'} ${project.seams.length + 1}`,
      a,b,reverseB:false,
    })
    if (!created.ok) {
      setCommandResult(created.detail || 'Invalid sewing selection')
      return
    }
    mutateProject((next) => {
      next.seams.push(created.seam)
    })
    setCommandResult(created.warning || `${partial ? 'Free' : 'Segment'} sewing created and linked to the 3D solver`)
  }

  const createFastener = (a, b) => {
    if (!a || !b) return
    mutateProject((next) => {
      next.fasteners = next.fasteners || []
      next.fasteners.push({
        id: uniqueId('fastener'),
        name: `Fastener ${next.fasteners.length + 1}`,
        type: 'button',
        a,
        b,
        closed: true,
        diameterCm: 1.8,
      })
    })
    setCommandResult('Fastener pair created. Configure button, snap, or hook and its open/closed state in Sewing.')
  }

  const updateFastener = (fastenerId, field, value) => {
    mutateProject((next) => {
      const fastener = (next.fasteners || []).find((item) => item.id === fastenerId)
      if (fastener) fastener[field] = value
    })
  }

  const removeFastener = (fastenerId) => {
    mutateProject((next) => {
      next.fasteners = (next.fasteners || []).filter((item) => item.id !== fastenerId)
    })
  }

  const createCustomMeasurement = (a, b) => {
    if (!a || !b || a.pieceId !== b.pieceId) {
      setCommandResult('Tape measurements must use two points on the same pattern piece')
      return
    }
    const id = uniqueId('measure')
    mutateProject((next) => {
      next.customMeasurements = next.customMeasurements || []
      next.customMeasurements.push({
        id,
        pieceId: a.pieceId,
        label: `Custom measure ${next.customMeasurements.length + 1}`,
        a: { x: a.x, y: a.y },
        b: { x: b.x, y: b.y },
        toleranceCm: 0.5,
      })
    })
    setCommandResult(`Added ${(Math.hypot(b.x - a.x, b.y - a.y)).toFixed(1)} cm tape measurement`)
  }

  const updateCustomMeasurement = (measurementId, field, value) => {
    mutateProject((next) => {
      const measurement = (next.customMeasurements || []).find((item) => item.id === measurementId)
      if (measurement) measurement[field] = value
    })
  }

  const removeCustomMeasurement = (measurementId) => {
    mutateProject((next) => {
      next.customMeasurements = (next.customMeasurements || []).filter((item) => item.id !== measurementId)
    })
  }

  const addPiece = () => {
    const piece = makeRectanglePiece(project.pieces.length)
    mutateProject((next) => next.pieces.push(piece))
    setSelectedPieceId(piece.id)
    setTool('point')
  }

  const addPolygonPiece = () => {
    // A real five-vertex clipped-corner pattern, not merely a polygon-shaped
    // toolbar symbol that still creates an unrelated rectangular draft.
    const piece = makeRectanglePiece(project.pieces.length)
    piece.name = `Polygon ${project.pieces.length + 1}`
    piece.points = [
      { x: -18, y: 0 }, { x: 18, y: 0 }, { x: 18, y: 26 },
      { x: 9, y: 36 }, { x: -18, y: 36 },
    ]
    // Place new draft pieces in the currently empty lower drafting region,
    // with their 3D proxy in front of the avatar rather than beyond the
    // camera's right edge. Their locations remain editable in both views.
    piece.layout2d = { x: 248, y: 193 }
    piece.arrangement3d = { x: 0.08, y: 1.02, z: 0.72, flip: false }
    mutateProject((next) => next.pieces.push(piece))
    setSelectedPieceId(piece.id)
    setTool('point')
    setActiveSection('Pattern')
    setCommandResult('Created a 5-point clipped-corner polygon. Edit its nodes in the 2D window.')
  }

  const deletePieceById = (pieceId) => {
    if (clothcraftHybrid) {
      window.dispatchEvent(new CustomEvent('exo-clothcraft-command',{detail:'delete-selected'}))
      return
    }
    if (!pieceId || !project.pieces.some(piece => piece.id === pieceId)) return
    mutateProject((next) => {
      const ids = new Set([pieceId])
      for (const piece of next.pieces) {
        if (piece.liningForPieceId === pieceId || piece.interfacingForPieceId === pieceId) ids.add(piece.id)
      }
      next.pieces = next.pieces.filter((piece) => !ids.has(piece.id))
      next.seams = next.seams.filter((seam) => !ids.has(seam.a?.pieceId) && !ids.has(seam.b?.pieceId))
      next.fasteners = (next.fasteners || []).filter((fastener) => !ids.has(fastener.a?.pieceId) && !ids.has(fastener.b?.pieceId))
      next.customMeasurements = (next.customMeasurements || []).filter((measurement) => !ids.has(measurement.pieceId))
      for (const piece of next.pieces) {
        if (ids.has(piece.fusedToPieceId)) {
          delete piece.fusedToPieceId
          delete piece.interfacingForPieceId
        }
        if (ids.has(piece.liningForPieceId)) delete piece.liningForPieceId
      }
    })
    setSelectedPieceId(null)
  }
  const deleteSelectedPiece = () => deletePieceById(selectedPiece?.id)

  const removeSeam = (seamId) => {
    const deleted=applySewingAssemblyAction20261024(project,{kind:'seam.delete',seamId})
    if(!deleted.ok){setCommandResult(deleted.detail);return}
    mutateProject((next) => {
      next.seams = next.seams.filter((seam) => seam.id !== seamId)
    })
  }

  const updateSeam = (seamId, field, value) => {
    const edited=applySewingAssemblyAction20261024(project,{kind:'seam.update',seamId,field,value})
    if(!edited.ok){setCommandResult(edited.detail);return}
    mutateProject((next) => {
      const index=next.seams.findIndex((seam)=>seam.id===seamId)
      if(index>=0)next.seams[index]=edited.seam
    })
  }

  const setSeamPartial = (seamId, enabled) => {
    const current = project.seams.find((item) => item.id === seamId)
    if (!current) return
    const proposed = cloneProject(current)
    if (enabled) {
      proposed.a = { ...proposed.a, startT: proposed.a?.startT ?? 0.25, endT: proposed.a?.endT ?? 0.75 }
      proposed.b = { ...proposed.b, startT: proposed.b?.startT ?? 0.25, endT: proposed.b?.endT ?? 0.75 }
    } else {
      delete proposed.a.startT
      delete proposed.a.endT
      delete proposed.b.startT
      delete proposed.b.endT
    }
    const validation = validateNewSeam(project, proposed, { excludeSeamId: seamId })
    if (!validation.ok) {
      setCommandResult(validation.messages[0])
      return
    }
    mutateProject((next) => {
      const seam = next.seams.find((item) => item.id === seamId)
      if (!seam) return
      if (enabled) {
        seam.a = { ...seam.a, startT: seam.a?.startT ?? 0.25, endT: seam.a?.endT ?? 0.75 }
        seam.b = { ...seam.b, startT: seam.b?.startT ?? 0.25, endT: seam.b?.endT ?? 0.75 }
        seam.useExactCorrespondence = true
      } else {
        seam.a = { ...seam.a }
        seam.b = { ...seam.b }
        delete seam.a.startT
        delete seam.a.endT
        delete seam.b.startT
        delete seam.b.endT
      }
    })
  }

  const updateSeamRange = (seamId, side, field, value) => {
    const existing = project.seams.find((item) => item.id === seamId)
    if (!existing) return
    const preview = cloneProject(existing)
    const previewEndpoint = preview?.[side]
    if (!previewEndpoint) return
    const nextValue = clamp(Number(value), 0, 1)
    const piece = project.pieces.find((item) => item.id === previewEndpoint.pieceId)
    const minimumGap = Math.min(0.5, 0.01 / Math.max(0.01, edgeLength(piece, previewEndpoint.edgeIndex)))
    if (field === 'startT') previewEndpoint.startT = Math.max(0, Math.min(nextValue, Number(previewEndpoint.endT ?? 1) - minimumGap))
    if (field === 'endT') previewEndpoint.endT = Math.min(1, Math.max(nextValue, Number(previewEndpoint.startT ?? 0) + minimumGap))
    const validation = validateNewSeam(project, preview, { excludeSeamId: seamId })
    if (!validation.ok) {
      setCommandResult(validation.messages[0])
      return
    }
    mutateProject((next) => {
      const seam = next.seams.find((item) => item.id === seamId)
      if (!seam) return
      seam[side] = previewEndpoint
      seam.useExactCorrespondence = true
    })
  }

  const autoEaseSeam = (seamId) => {
    const seam = project.seams.find((item) => item.id === seamId)
    if (!seam) return
    const report = seamLengthReport(project, seam)
    if (report.mismatchPercent <= 0.25) {
      setCommandResult(`${seam.name} is already length matched`)
      return
    }
    const longerSide = report.lengthA >= report.lengthB ? 'a' : 'b'
    const shorter = Math.min(report.lengthA, report.lengthB)
    const longer = Math.max(report.lengthA, report.lengthB)
    const ratio = longer > 0 ? clamp(shorter / longer, 0.3, 1.2) : 1
    mutateProject((next) => {
      const target = next.seams.find((item) => item.id === seamId)
      if (!target) return
      target.type = 'ease'
      target.easeSide = longerSide
      target.ratio = ratio
    })
    setCommandResult(`${seam.name}: easing ${longerSide.toUpperCase()} to ${(ratio * 100).toFixed(1)}% to match the shorter edge`)
  }

  const addSeamWalkNotches = (seamId) => {
    const seam = project.seams.find((item) => item.id === seamId)
    if (!seam) return
    mutateProject((next) => {
      const targetSeam = next.seams.find((item) => item.id === seamId)
      const pieceA = next.pieces.find((item) => item.id === targetSeam?.a?.pieceId)
      const pieceB = next.pieces.find((item) => item.id === targetSeam?.b?.pieceId)
      if (!targetSeam || !pieceA || !pieceB) return
      pieceA.notches = pieceA.notches || []
      pieceB.notches = pieceB.notches || []
      for (const [fraction, type] of [[0.25, 'single'], [0.5, 'double'], [0.75, 'single']]) {
        const sourceFraction = seamFractionAtProgress(targetSeam, 'a', fraction)
        const targetFraction = seamFractionAtProgress(targetSeam, 'b', fraction)
        const existing = pieceA.notches.find((notch) => notch.edgeIndex === targetSeam.a.edgeIndex && Math.abs(Number(notch.t ?? 0.5) - sourceFraction) < 0.025 && notch.matchedSeamId === seamId)
        if (existing) continue
        const groupId = uniqueId('notch-match')
        pieceA.notches.push({
          id: uniqueId('notch'),
          edgeIndex: targetSeam.a.edgeIndex,
          t: sourceFraction,
          type,
          depthCm: 0.45,
          matchGroupId: groupId,
          matchedSeamId: seamId,
        })
        pieceB.notches.push({
          id: uniqueId('notch'),
          edgeIndex: targetSeam.b.edgeIndex,
          t: targetFraction,
          type,
          depthCm: 0.45,
          matchGroupId: groupId,
          matchedSeamId: seamId,
        })
      }
    })
    setCommandResult(`${seam.name}: added matched quarter, center, and three-quarter seam-walk notches`)
  }

  const createNotch = (pieceId, edgeIndex, t = 0.5) => {
    mutateProject((next) => {
      const piece = next.pieces.find((item) => item.id === pieceId)
      if (!piece) return
      piece.notches = piece.notches || []
      piece.notches.push({
        id: uniqueId('notch'),
        edgeIndex,
        t: clamp(t, 0.02, 0.98),
        type: 'single',
        depthCm: 0.45,
      })
    })
    setCommandResult('Pattern notch added and linked to the selected edge')
  }

  const notchSeams = (pieceId, edgeIndex, t = 0.5) => project.seams.filter((seam) => {
    for (const endpoint of [seam.a, seam.b]) {
      if (endpoint?.pieceId !== pieceId || endpoint.edgeIndex !== edgeIndex) continue
      const range = seamRange(endpoint)
      const notchT = clamp(Number(t ?? 0.5), 0, 1)
      if (notchT >= range.start - 1e-6 && notchT <= range.end + 1e-6) return true
    }
    return false
  })

  const matchNotchAcrossSeam = (pieceId, notchId, seamId) => {
    const sourcePieceNow = project.pieces.find((item) => item.id === pieceId)
    const sourceNotchNow = sourcePieceNow?.notches?.find((item) => item.id === notchId)
    const seamNow = project.seams.find((item) => item.id === seamId)
    if (!sourceNotchNow || !seamNow) return
    const sideNow = seamNow.a?.pieceId === pieceId && seamNow.a?.edgeIndex === sourceNotchNow.edgeIndex
      ? 'a'
      : seamNow.b?.pieceId === pieceId && seamNow.b?.edgeIndex === sourceNotchNow.edgeIndex
        ? 'b'
        : null
    if (!sideNow) return
    const rangeNow = seamRange(seamNow[sideNow])
    const sourceTNow = Number(sourceNotchNow.t ?? 0.5)
    if (sourceTNow < rangeNow.start - 1e-6 || sourceTNow > rangeNow.end + 1e-6) {
      setCommandResult('Move the notch into the stitched seam range before matching it across the seam.')
      return
    }
    mutateProject((next) => {
      const sourcePiece = next.pieces.find((item) => item.id === pieceId)
      const sourceNotch = sourcePiece?.notches?.find((item) => item.id === notchId)
      const seam = next.seams.find((item) => item.id === seamId)
      if (!sourcePiece || !sourceNotch || !seam) return
      const sourceIsA = seam.a?.pieceId === pieceId && seam.a?.edgeIndex === sourceNotch.edgeIndex
      const sourceIsB = seam.b?.pieceId === pieceId && seam.b?.edgeIndex === sourceNotch.edgeIndex
      if (!sourceIsA && !sourceIsB) return
      const targetEndpoint = sourceIsA ? seam.b : seam.a
      const targetPiece = next.pieces.find((item) => item.id === targetEndpoint?.pieceId)
      if (!targetPiece) return
      const matchGroupId = sourceNotch.matchGroupId || uniqueId('notch-match')
      const targetT = mapFractionAcrossSeam(seam, sourceIsA ? 'a' : 'b', Number(sourceNotch.t ?? 0.5))
      sourceNotch.matchGroupId = matchGroupId
      sourceNotch.matchedSeamId = seam.id
      targetPiece.notches = targetPiece.notches || []
      let targetNotch = targetPiece.notches.find((item) => item.matchGroupId === matchGroupId)
      if (!targetNotch) {
        targetNotch = {
          id: uniqueId('notch'),
          edgeIndex: targetEndpoint.edgeIndex,
          t: clamp(targetT, 0, 1),
          type: sourceNotch.type || 'single',
          depthCm: Number(sourceNotch.depthCm ?? 0.45),
          matchGroupId,
          matchedSeamId: seam.id,
        }
        targetPiece.notches.push(targetNotch)
      } else {
        targetNotch.edgeIndex = targetEndpoint.edgeIndex
        targetNotch.t = clamp(targetT, 0, 1)
        targetNotch.type = sourceNotch.type || 'single'
        targetNotch.depthCm = Number(sourceNotch.depthCm ?? 0.45)
        targetNotch.matchedSeamId = seam.id
      }
    })
    const seam = project.seams.find((item) => item.id === seamId)
    setCommandResult(`Matched notch across ${seam?.name || 'the sewn seam'}`)
  }

  const updateNotch = (pieceId, notchId, field, value) => {
    mutateProject((next) => {
      const piece = next.pieces.find((item) => item.id === pieceId)
      const notch = piece?.notches?.find((item) => item.id === notchId)
      if (!notch) return
      const seam = notch.matchedSeamId ? next.seams.find((item) => item.id === notch.matchedSeamId) : null
      let nextValue = value
      if (field === 't' && seam) {
        const sourceSide = seam.a?.pieceId === pieceId && seam.a?.edgeIndex === notch.edgeIndex
          ? 'a'
          : seam.b?.pieceId === pieceId && seam.b?.edgeIndex === notch.edgeIndex
            ? 'b'
            : null
        if (sourceSide) {
          const range = seamRange(seam[sourceSide])
          nextValue = clamp(Number(value), range.start, range.end)
        }
      }
      notch[field] = nextValue
      if (!notch.matchGroupId || !seam) return
      if (!seam) return
      for (const targetPiece of next.pieces) {
        for (const targetNotch of targetPiece.notches || []) {
          if (targetNotch.id === notch.id || targetNotch.matchGroupId !== notch.matchGroupId) continue
          if (field === 'type' || field === 'depthCm') targetNotch[field] = value
          if (field === 't') {
            const sourceIsA = seam.a?.pieceId === pieceId && seam.a?.edgeIndex === notch.edgeIndex
            const sourceIsB = seam.b?.pieceId === pieceId && seam.b?.edgeIndex === notch.edgeIndex
            if (sourceIsA || sourceIsB) targetNotch.t = clamp(mapFractionAcrossSeam(seam, sourceIsA ? 'a' : 'b', Number(nextValue)), 0, 1)
          }
        }
      }
    })
  }

  const removeNotch = (pieceId, notchId) => {
    mutateProject((next) => {
      const piece = next.pieces.find((item) => item.id === pieceId)
      const notch = piece?.notches?.find((item) => item.id === notchId)
      if (!piece || !notch) return
      const matchGroupId = notch.matchGroupId
      if (matchGroupId) {
        for (const item of next.pieces) item.notches = (item.notches || []).filter((candidate) => candidate.matchGroupId !== matchGroupId)
      } else {
        piece.notches = (piece.notches || []).filter((candidate) => candidate.id !== notchId)
      }
    })
  }

  const addTopstitch = (pieceId, edgeIndex) => {
    mutateProject((next) => {
      const piece = next.pieces.find((item) => item.id === pieceId)
      if (!piece) return
      piece.topstitches = piece.topstitches || []
      piece.topstitches.push({
        id: uniqueId('topstitch'),
        edgeIndex,
        offsetCm: 0.7,
        rows: 1,
        rowGapCm: 0.45,
        stitchLengthMm: 3,
        color: '#8d8d8d',
      })
    })
    setCommandResult('EXO draft topstitch added with editable stitch rows and thread appearance; native Rust seam physics is unchanged')
  }

  const addBinding = (pieceId, edgeIndex) => {
    mutateProject((next) => {
      const piece = next.pieces.find((item) => item.id === pieceId)
      if (!piece) return
      piece.bindings = piece.bindings || []
      piece.bindings.push({
        id: uniqueId('binding'),
        edgeIndex,
        ratio: 0.96,
        stiffness: 0.72,
        widthCm: 1.8,
        color: '#3b3b3b',
      })
    })
    setCommandResult('Edge binding added with a 96% stay ratio')
  }

  const addZipper = (pieceId, edgeIndex, presetId = hardwareChoice.zipper) => {
    const preset = getHardwarePreset(presetId)
    const id=uniqueId('zipper')
    // Reuse an existing zipper seam if present; converting a normal garment
    // seam (e.g. a T-shirt shoulder) to a zipper requires explicit selection.
    const seam=zipperCompatibleSeams(project,pieceId,edgeIndex).find(item=>item.type==='zipper')
    mutateProject((next) => {
      const piece = next.pieces.find((item) => item.id === pieceId)
      if (!piece) return
      piece.zippers = piece.zippers || []
      const inheritedPrevious=seam&&next.pieces.flatMap(p=>(p.zippers||[])).find(item=>item.pairedSeamId===seam.id)?.pairedSeamPreviousType
      const zipper={id,edgeIndex,...zipperValuesFromPreset(preset),...(seam?{pairedSeamId:seam.id,pairedSeamPreviousType:inheritedPrevious||'zipper'}:{})}
      piece.zippers.push(zipper)
      if(seam)syncPairedZipperSeam(next,zipper)
    })
    setCommandResult(`${preset?.name || 'Zipper'} placed on edge ${edgeIndex+1}. ${seam?'The existing seam is paired for EXO draft zipper open/close.':'Pair a sewn edge in the right editor to control fabric closure.'}`)
    return {id,pieceId,seamId:seam?.id||null}
  }

  const addButtonRow = (pieceId, count = 5) => {
    const preset = getHardwarePreset(hardwareChoice.button)
    mutateProject((next) => {
      const piece = next.pieces.find((item) => item.id === pieceId)
      if (!piece?.points?.length) return
      piece.buttons = piece.buttons || []
      const center = pieceCenter(piece)
      const ys = piece.points.map((point) => point.y)
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)
      const top = maxY - (maxY - minY) * 0.25
      const bottom = minY + (maxY - minY) * 0.22
      for (let index = 0; index < count; index += 1) {
        const t = count === 1 ? 0.5 : index / (count - 1)
        const id = uniqueId('button')
        piece.buttons.push({
          id, x:center.x, y:top+(bottom-top)*t,
          ...buttonValuesFromPreset(preset,resolveHardwareStyle(next,preset?.id)),
          ...(preset ? hardwareToPatternAnnotation(preset.id,{
            x:center.x,y:top+(bottom-top)*t,annotationId:id,
          }) : {}),
          holes:preset?.holes ?? (preset?.mount==='shank'||preset?.mount==='tack'?0:4),
        })
      }
    })
    setCommandResult(`${count} × ${preset?.name || 'buttons'} added to ${selectedPiece?.name || 'pattern'}`)
  }

  const addButtonholeRow = (pieceId, count = 5) => {
    const preset = getHardwarePreset(hardwareChoice.buttonhole)
    mutateProject((next) => {
      const piece = next.pieces.find((item) => item.id === pieceId)
      if (!piece?.points?.length) return
      piece.buttonholes = piece.buttonholes || []
      const center = pieceCenter(piece)
      const ys = piece.points.map((point) => point.y)
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)
      const top = maxY - (maxY - minY) * 0.25
      const bottom = minY + (maxY - minY) * 0.22
      for (let index = 0; index < count; index += 1) {
        const t = count === 1 ? 0.5 : index / (count - 1)
        const buttonholeId = uniqueId('buttonhole')
        const pairedButton = piece.buttons?.length === count ? piece.buttons[index] : null
        piece.buttonholes.push({
          id: buttonholeId,
          x: center.x,
          y: top + (bottom - top) * t,
          lengthCm: 2.4,
          widthCm: 0.35,
          orientationDeg: 0,
          color: '#575757',
          pairedButtonId: pairedButton?.id || null,
          ...(preset ? hardwareToPatternAnnotation(preset.id,{
            x:center.x,y:top+(bottom-top)*t,annotationId:buttonholeId,
          }) : {}),
        })
        if (pairedButton) pairedButton.pairedButtonholeId = buttonholeId
      }
    })
    setCommandResult(`${count} × ${preset?.name || 'buttonholes'} added to ${selectedPiece?.name || 'pattern'}`)
  }

  // A Library asset is inspected in the existing right panel. Placement is
  // explicit, and the new scene object is immediately selected for editing.
  const placeHardwarePreset = presetId => {
    const preset=getHardwarePreset(presetId)
    if(!preset||clothcraftHybrid||!selectedPiece)return
    setHardwareChoice(current=>({...current,[preset.kind]:preset.id}))
    if(preset.kind==='zipper'){
      const placed=addZipper(selectedPiece.id,trimEdgeIndex,preset.id)
      setObjectTab('Zipper')
      setSelectedObjectForProperties({source:'draft',type:'zipper',id:`${selectedPiece.id}-${placed.id}`,
        pieceId:selectedPiece.id,itemId:placed.id,name:preset.name})
      setActiveSection('Sewing')
      return
    }
    if(!['button','buttonhole'].includes(preset.kind))return
    const itemId=uniqueId(preset.kind)
    const position=pieceCenter(selectedPiece)
    mutateProject(next=>{
      const piece=next.pieces.find(item=>item.id===selectedPiece.id)
      if(!piece)return
      const object=hardwareToPatternAnnotation(preset.id,{...position,annotationId:itemId})
      if(preset.kind==='button'){
        piece.buttons=[...(piece.buttons||[]),{...object,...buttonValuesFromPreset(preset,resolveHardwareStyle(next,preset?.id)),id:itemId,x:position.x,y:position.y}]
      }else{
        piece.buttonholes=[...(piece.buttonholes||[]),{lengthCm:2.4,widthCm:.35,color:preset.pbr.baseColor,...object}]
      }
    })
    setObjectTab(preset.kind==='button'?'Button':'Buttonhole')
    setSelectedObjectForProperties({source:'draft',type:preset.kind,id:`${selectedPiece.id}-${itemId}`,pieceId:selectedPiece.id,itemId,name:preset.name})
    setActiveSection('Sewing')
    setCommandResult(`${preset.name} placed on ${selectedPiece.name}. Edit its dimensions and finish on the right.`)
  }
  const nativeImportedHardwareCommand=detail=>new Promise(resolve=>{
    const requestId=`native-imported-${Date.now()}-${Math.random().toString(36).slice(2,8)}`
    let timeout
    const received=event=>{
      if(event.detail?.requestId!==requestId)return
      window.removeEventListener('exo-clothcraft-imported-hardware-result',received)
      clearTimeout(timeout)
      resolve(event.detail)
    }
    window.addEventListener('exo-clothcraft-imported-hardware-result',received)
    timeout=window.setTimeout(()=>{window.removeEventListener('exo-clothcraft-imported-hardware-result',received);resolve({ok:false,error:'Native hardware update timed out'})},15000)
    window.dispatchEvent(new CustomEvent('exo-clothcraft-imported-hardware-command',{detail:{...detail,requestId}}))
  })
  const placeImportedCloAsset=async asset=>{
    const raw=asset?.original||asset
    const model=asset?.model||raw?.glb
    const assetId=raw?.id
    if(typeof model!=='string'||!/^\/clo-hardware-converted\/models\/[a-z0-9-]+\.glb$/i.test(model)||!assetId){
      setCommandResult('This hardware reference has no converted 3D mesh to place. Its source definition remains in the library.')
      return
    }
    const id=uniqueId('clo-hardware')
    if(clothcraftHybrid){
      const panel=clothcraftLive?.selection?.panelId||clothcraftLive?.panelRefs?.[0]?.id
      if(!panel){setCommandResult('Select a native pattern before placing imported hardware.');return}
      const result=await nativeImportedHardwareCommand({action:'place',assetId,panel,id})
      if(!result.ok){setCommandResult(result.error||'Could not place imported hardware in native garment');return}
      setSelectedObjectForProperties({source:'imported',type:'imported-hardware',id:`imported-hardware:${id}`,itemId:id,pieceId:panel,name:asset.name||raw.name})
    }else{
      const piece=selectedPiece||project.pieces?.[0]
      if(!piece){setCommandResult('Select a pattern before placing imported hardware.');return}
      const bounds=importedCloHardwareDimensions(raw)
      const center=pieceCenter(piece)
      const placed={id,importedAssetId:assetId,assetId,glbUrl:model,name:asset.name||raw.name,
        sourcePath:raw.sourcePath||'',thumbnail:asset.thumbnail||raw.thumbnail,
        x:center.x,y:center.y,widthMm:clamp(Number(bounds[0])||10,.5,250),
        heightMm:clamp(Number(bounds[1])||10,.5,250),depthMm:clamp(Number(bounds[2])||3,.1,80),
        rotationDeg:0,liftMm:1,visible:true,color:'#ffffff',metalness:0,roughness:.5,opacity:1,
        reflectionIntensity:1,clearcoat:0,weightGrams:0,materialType:'original'}
      mutateProject(next=>{
        const target=next.pieces.find(item=>item.id===piece.id)
        if(target)target.importedHardwarePlacements=[...(target.importedHardwarePlacements||[]),placed]
      })
      setSelectedObjectForProperties({source:'imported',type:'imported-hardware',id:`imported-hardware:${id}`,itemId:id,pieceId:piece.id,name:placed.name})
    }
    setObjectTab('Trim');setShowObjectBrowser(true);setActiveSection('Sewing')
    if(viewportLayout!=='2d'&&!patternFocusActive)setInspectorVisible(true)
    setCommandResult(`Placed original 3D hardware: ${asset.name||raw.name}. ${viewportLayout==='2d'||patternFocusActive?'Expand the Property Editor when you want to edit dimensions and material.':'Edit dimensions and material in the right Property Editor.'}`)
  }
  const editImportedCloPlacement=async(field,value)=>{
    const selection=selectedObjectForProperties
    if(selection?.source!=='imported')return
    const bounds={widthMm:[.5,250],heightMm:[.5,250],depthMm:[.1,80],x:[-500,500],y:[-500,500],rotationDeg:[-360,360],liftMm:[0,30],roughness:[0,1],metalness:[0,1],opacity:[0,1],reflectionIntensity:[0,3],clearcoat:[0,1],weightGrams:[0,500]}
    if(Object.hasOwn(bounds,field)&&(!Number.isFinite(Number(value))||Number(value)<bounds[field][0]||Number(value)>bounds[field][1])){
      setCommandResult(`${field} must be within ${bounds[field][0]}–${bounds[field][1]}`);return
    }
    if(field==='color'&&!/^#[0-9a-f]{6}$/i.test(String(value))){setCommandResult('Enter a six-digit hardware color');return}
    if(field==='materialType'&&!['original','metal','plastic','nylon','textile','ceramic','glass'].includes(value)){setCommandResult('Choose a supported hardware material family');return}
    if(!['visible','color','materialType',...Object.keys(bounds)].includes(field))return
    if(clothcraftHybrid){
      const result=await nativeImportedHardwareCommand({action:'update',id:selection.itemId,field,value})
      if(!result.ok)setCommandResult(result.error||'Native hardware property update failed')
    }else mutateProject(next=>{
      const entry=next.pieces.find(piece=>piece.id===selection.pieceId)?.importedHardwarePlacements?.find(item=>item.id===selection.itemId)
      if(entry)entry[field]=value
    })
  }
  const removeImportedCloPlacement=async()=>{
    const selected=selectedObjectForProperties
    if(selected?.source!=='imported')return
    if(clothcraftHybrid){const out=await nativeImportedHardwareCommand({action:'remove',id:selected.itemId});if(!out.ok){setCommandResult(out.error);return}}
    else mutateProject(next=>{
      const piece=next.pieces.find(item=>item.id===selected.pieceId)
      if(piece)piece.importedHardwarePlacements=(piece.importedHardwarePlacements||[]).filter(item=>item.id!==selected.itemId)
    })
    setSelectedObjectForProperties(null)
    setCommandResult('Imported hardware removed from garment. Original asset remains in the library.')
  }
  const duplicateImportedCloPlacement=async()=>{
    const selected=selectedObjectForProperties
    if(selected?.source!=='imported')return
    if(clothcraftHybrid){const out=await nativeImportedHardwareCommand({action:'duplicate',id:selected.itemId});if(!out.ok)setCommandResult(out.error||'Could not duplicate hardware');return}
    const id=uniqueId('clo-hardware')
    mutateProject(next=>{
      const piece=next.pieces.find(item=>item.id===selected.pieceId)
      const source=piece?.importedHardwarePlacements?.find(item=>item.id===selected.itemId)
      if(source)piece.importedHardwarePlacements.push({...source,id,x:source.x+1})
    })
    setSelectedObjectForProperties({...selected,itemId:id,id:`imported-hardware:${id}`})
  }
  const pairZipperToSeam=(pieceId,zipperId,seamId)=>{
    const zipper=project.pieces.find(piece=>piece.id===pieceId)?.zippers?.find(item=>item.id===zipperId)
    const available=zipper?zipperCompatibleSeams(project,pieceId,zipper.edgeIndex):[]
    if(seamId&&!available.some(seam=>seam.id===seamId)){
      setCommandResult('Choose a sewing relationship that uses the selected zipper edge.')
      return
    }
    mutateProject(next=>{
      const target=next.pieces.find(piece=>piece.id===pieceId)?.zippers?.find(item=>item.id===zipperId)
      if(!target)return
      if(target.pairedSeamId!==seamId)restoreZipperSeamIfUnused(next,target)
      if(seamId){
        const chosen=next.seams.find(seam=>seam.id===seamId)
        if(chosen?.id!==target.pairedSeamId){
          const inherited=next.pieces.flatMap(piece=>(piece.zippers||[])).find(item=>item.id!==target.id&&item.pairedSeamId===seamId)?.pairedSeamPreviousType
          target.pairedSeamPreviousType=inherited||chosen?.type||'normal'
        }
        target.pairedSeamId=seamId
        syncPairedZipperSeam(next,target)
      }else{
        delete target.pairedSeamId
        delete target.pairedSeamPreviousType
      }
    })
    setCommandResult(seamId?'Zipper paired with sewn edges; the slider now updates the draft seam opening.':'Zipper unpaired. Hardware remains visible without fabric-closure mechanics.')
  }

  const updateButtonhole = (pieceId, buttonholeId, field, value) => {
    mutateProject((next) => {
      const buttonhole = next.pieces.find((item) => item.id === pieceId)?.buttonholes?.find((item) => item.id === buttonholeId)
      if (buttonhole) buttonhole[field] = value
    })
  }

  const removeButtonhole = (pieceId, buttonholeId) => {
    mutateProject((next) => {
      const piece = next.pieces.find((item) => item.id === pieceId)
      if (!piece) return
      const buttonhole = (piece.buttonholes || []).find((item) => item.id === buttonholeId)
      if (buttonhole?.pairedButtonId) {
        const button = (piece.buttons || []).find((item) => item.id === buttonhole.pairedButtonId)
        if (button?.pairedButtonholeId === buttonholeId) button.pairedButtonholeId = null
      }
      piece.buttonholes = (piece.buttonholes || []).filter((item) => item.id !== buttonholeId)
    })
  }

  const addRibNeckband = () => {
    const front = project.pieces.find((piece) => piece.arrangement3d?.wrap === 'front' && piece.points?.length >= 12)
    const back = project.pieces.find((piece) => piece.arrangement3d?.wrap === 'back' && piece.points?.length >= 12)
    if (!front || !back) {
      setCommandResult('Neckband generator needs a front and back upper-body pattern with a segmented neckline')
      return
    }
    if (project.pieces.some((piece) => piece.generatedRole === 'neckband')) {
      setCommandResult('This garment already has a generated neckband')
      return
    }

    const ratio = 0.88
    const widthCm = 4
    const attachments = [
      { pieceId: front.id, edgeIndex: 11 },
      { pieceId: front.id, edgeIndex: 10 },
      { pieceId: front.id, edgeIndex: 9 },
      { pieceId: back.id, edgeIndex: 9 },
      { pieceId: back.id, edgeIndex: 10 },
      { pieceId: back.id, edgeIndex: 11 },
    ]
    const segmentLengths = attachments.map(({ pieceId, edgeIndex }) => {
      const piece = project.pieces.find((item) => item.id === pieceId)
      return edgeLength(piece, edgeIndex) * ratio
    })
    const totalLength = segmentLengths.reduce((sum, value) => sum + value, 0)
    const neckRadiusM = Math.max(0.048, Math.min(0.09, (totalLength / 100) / (Math.PI * 2)))
    let cursor = -totalLength * 0.5
    const bottom = [{ x: cursor, y: 0 }]
    for (const length of segmentLengths) {
      cursor += length
      bottom.push({ x: cursor, y: 0 })
    }
    const neckbandId = uniqueId('neckband')
    const points = [
      ...bottom,
      { x: cursor, y: widthCm },
      { x: -totalLength * 0.5, y: widthCm },
    ]

    mutateProject((next) => {
      const mainFabric = next.fabrics?.main || FABRIC_PRESETS.jersey
      if (!next.fabrics.rib) {
        next.fabrics.rib = {
          ...cloneProject(mainFabric),
          id: 'rib',
          name: '1×1 Rib Knit',
          gsm: Math.max(180, Math.round((mainFabric.gsm || 220) * 0.9)),
          stretchWarp: Math.max(0.20, mainFabric.stretchWarp || 0),
          stretchWeft: Math.max(0.38, mainFabric.stretchWeft || 0),
          bend: Math.min(0.64, mainFabric.bend ?? 0.65),
          damping: 0.987,
        }
      }
      next.pieces.push({
        id: neckbandId,
        name: 'Rib Neckband',
        generatedRole: 'neckband',
        points,
        layout2d: { x: 145, y: 42 },
        arrangement3d: { x: 0, y: 1.595, z: 0, radius: neckRadiusM, wrap: 'neck', phaseDeg: 180, direction: -1 },
        simulationResolution: 2,
        grainAngleDeg: 90,
        layerIndex: 1,
        notches: [],
        topstitches: [{ id: `${neckbandId}-topstitch`, edgeIndex: 7, offsetCm: 0.55, rows: 1, rowGapCm: 0.4, stitchLengthMm: 2.8, color: '#737373' }],
        bindings: [],
        graphics: [],
        zippers: [],
        buttons: [],
        internalLines: [],
        pins: [],
        seamAllowance: 0.7,
        fabricId: 'rib',
        cutQuantity: 1,
        locked: false,
      })
      attachments.forEach((attachment, index) => {
        next.seams.push({
          id: uniqueId('neck-seam'),
          name: `Neckband segment ${index + 1}`,
          type: 'normal',
          a: { pieceId: neckbandId, edgeIndex: index },
          b: attachment,
          reverseB: index < 3,
        })
      })
      next.seams.push({
        id: uniqueId('neckband-loop'),
        name: 'Neckband center-back closure',
        a: { pieceId: neckbandId, edgeIndex: 6 },
        b: { pieceId: neckbandId, edgeIndex: 8 },
      })
    })
    setSelectedPieceId(neckbandId)
    setSelectedFabricId('rib')
    setCommandResult(`Generated ${totalLength.toFixed(1)} cm rib neckband at ${Math.round(ratio * 100)}% of neckline length`)
  }

  const addStandCollar = () => {
    const front = project.pieces.find((piece) => piece.arrangement3d?.wrap === 'front' && piece.points?.length >= 12)
    const back = project.pieces.find((piece) => piece.arrangement3d?.wrap === 'back' && piece.points?.length >= 12)
    if (!front || !back) {
      setCommandResult('Stand collar generator needs a front and back upper-body pattern with a segmented neckline')
      return
    }
    if (project.pieces.some((piece) => piece.generatedRole === 'stand-collar')) {
      setCommandResult('This garment already has a generated stand collar')
      return
    }

    const ratio = 1.015
    const widthCm = 8
    const attachments = [
      { pieceId: front.id, edgeIndex: 11 },
      { pieceId: front.id, edgeIndex: 10 },
      { pieceId: front.id, edgeIndex: 9 },
      { pieceId: back.id, edgeIndex: 9 },
      { pieceId: back.id, edgeIndex: 10 },
      { pieceId: back.id, edgeIndex: 11 },
    ]
    const segmentLengths = attachments.map(({ pieceId, edgeIndex }) => {
      const piece = project.pieces.find((item) => item.id === pieceId)
      return edgeLength(piece, edgeIndex) * ratio
    })
    const totalLength = segmentLengths.reduce((sum, value) => sum + value, 0)
    const neckRadiusM = Math.max(0.055, Math.min(0.11, (totalLength / 100) / (Math.PI * 2)))
    let cursor = -totalLength * 0.5
    const bottom = [{ x: cursor, y: 0 }]
    for (const length of segmentLengths) {
      cursor += length
      bottom.push({ x: cursor, y: 0 })
    }
    const collarId = uniqueId('stand-collar')
    const points = [
      ...bottom,
      { x: cursor, y: widthCm },
      { x: -totalLength * 0.5, y: widthCm },
    ]

    mutateProject((next) => {
      next.pieces.push({
        id: collarId,
        name: 'Stand Collar',
        generatedRole: 'stand-collar',
        points,
        layout2d: { x: 145, y: 52 },
        arrangement3d: { x: 0, y: 1.59, z: 0, radius: neckRadiusM, wrap: 'neck', phaseDeg: 180, direction: -1 },
        simulationResolution: 2,
        grainAngleDeg: 90,
        layerIndex: 1,
        notches: [],
        topstitches: [
          { id: `${collarId}-top`, edgeIndex: 7, offsetCm: 0.6, rows: 1, rowGapCm: 0.4, stitchLengthMm: 3, color: '#777777' },
        ],
        bindings: [],
        graphics: [],
        zippers: [],
        buttons: [],
        internalLines: [
          { id: `${collarId}-roll`, type: 'fold', a: { x: -totalLength * 0.48, y: widthCm * 0.52 }, b: { x: totalLength * 0.48, y: widthCm * 0.52 }, foldAngleDeg: 155 },
        ],
        pins: [],
        seamAllowance: 1,
        fabricId: 'main',
        cutQuantity: 1,
        locked: false,
      })
      attachments.forEach((attachment, index) => {
        next.seams.push({
          id: uniqueId('collar-seam'),
          name: `Collar neckline segment ${index + 1}`,
          type: 'normal',
          a: { pieceId: collarId, edgeIndex: index },
          b: attachment,
          reverseB: index < 3,
        })
      })
      next.seams.push({
        id: uniqueId('collar-loop'),
        name: 'Collar center-back closure',
        a: { pieceId: collarId, edgeIndex: 6 },
        b: { pieceId: collarId, edgeIndex: 8 },
      })
    })
    setSelectedPieceId(collarId)
    setCommandResult(`Generated ${widthCm.toFixed(1)} cm stand collar from the measured neckline`)
  }

  const addTwoPanelHood = () => {
    const front = project.pieces.find((piece) => piece.arrangement3d?.wrap === 'front' && piece.points?.length >= 12)
    const back = project.pieces.find((piece) => piece.arrangement3d?.wrap === 'back' && piece.points?.length >= 12)
    if (!front || !back) {
      setCommandResult('Hood generator needs a front and back upper-body pattern with a segmented neckline')
      return
    }
    if (project.pieces.some((piece) => ['neckband', 'stand-collar', 'hood-left', 'hood-right'].includes(piece.generatedRole))) {
      setCommandResult('Remove the existing generated neckline construction before adding a hood')
      return
    }
    if (edgeIsSewn(front.id, 10) || edgeIsSewn(back.id, 10)) {
      setCommandResult('The center neckline edges must be unsewn before generating a two-panel hood')
      return
    }

    const leftId = uniqueId('hood-left')
    const rightId = uniqueId('hood-right')

    mutateProject((next) => {
      splitPieceEdgeInProject(next, front.id, 10, 0.5)
      splitPieceEdgeInProject(next, back.id, 10, 0.5)
      const nextFront = next.pieces.find((piece) => piece.id === front.id)
      const nextBack = next.pieces.find((piece) => piece.id === back.id)
      if (!nextFront || !nextBack) return

      // The tee neckline finish is replaced by the hood-to-neck seam.
      for (const bodyPiece of [nextFront, nextBack]) {
        bodyPiece.bindings = (bodyPiece.bindings || []).filter((item) => item.edgeIndex < 9 || item.edgeIndex > 12)
        bodyPiece.topstitches = (bodyPiece.topstitches || []).filter((item) => item.edgeIndex < 9 || item.edgeIndex > 12)
      }

      const rightAttachments = [
        { endpoint: { pieceId: nextFront.id, edgeIndex: 10 }, reverseB: true },
        { endpoint: { pieceId: nextFront.id, edgeIndex: 9 }, reverseB: true },
        { endpoint: { pieceId: nextBack.id, edgeIndex: 9 }, reverseB: false },
        { endpoint: { pieceId: nextBack.id, edgeIndex: 10 }, reverseB: false },
      ]
      const leftAttachments = [
        { endpoint: { pieceId: nextFront.id, edgeIndex: 11 }, reverseB: false },
        { endpoint: { pieceId: nextFront.id, edgeIndex: 12 }, reverseB: false },
        { endpoint: { pieceId: nextBack.id, edgeIndex: 12 }, reverseB: true },
        { endpoint: { pieceId: nextBack.id, edgeIndex: 11 }, reverseB: true },
      ]

      const buildHoodPiece = (id, name, attachments, wrap, layoutX) => {
        const lengths = attachments.map(({ endpoint }) => {
          const piece = next.pieces.find((item) => item.id === endpoint.pieceId)
          return edgeLength(piece, endpoint.edgeIndex)
        })
        const bottom = [{ x: 0, y: 0 }]
        let cursor = 0
        for (const length of lengths) {
          cursor += length
          bottom.push({ x: cursor, y: 0 })
        }
        const total = Math.max(24, cursor)
        return {
          id,
          name,
          generatedRole: wrap,
          hoodState: 'up',
          points: [
            ...bottom,
            { x: total, y: 31 },
            { x: total * 0.62, y: 49 },
            { x: total * 0.08, y: 41 },
          ],
          curves: {
            4: { cx: total + 3.5, cy: 16 },
            5: { cx: total * 0.93, cy: 48 },
            6: { cx: total * 0.34, cy: 55 },
            7: { cx: -2.5, cy: 21 },
          },
          layout2d: { x: layoutX, y: 52 },
          arrangement3d: { x: 0, y: 1.59, z: 0, wrap },
          simulationResolution: 1,
          grainAngleDeg: 0,
          layerIndex: 1,
          notches: [{ id: `${id}-neck-notch`, edgeIndex: 1, t: 0.5, type: 'single', depthCm: 0.45 }],
          topstitches: [{ id: `${id}-opening-stitch`, edgeIndex: 7, offsetCm: 2.1, rows: 2, rowGapCm: 0.5, stitchLengthMm: 3, color: '#777777' }],
          bindings: [],
          graphics: [],
          zippers: [],
          buttons: [],
          internalLines: [],
          pins: [],
          seamAllowance: 1,
          fabricId: 'main',
          cutQuantity: 1,
          marker: { allowCrossGrain: false },
          locked: false,
        }
      }

      const leftHood = buildHoodPiece(leftId, 'Hood Left', leftAttachments, 'hood-left', 62)
      const rightHood = buildHoodPiece(rightId, 'Hood Right', rightAttachments, 'hood-right', 248)
      next.pieces.push(leftHood, rightHood)

      const attachHood = (hood, attachments, sideName) => {
        attachments.forEach(({ endpoint, reverseB }, index) => {
          next.seams.push({
            id: uniqueId('hood-neck'),
            name: `${sideName} hood neckline ${index + 1}`,
            type: 'normal',
            a: { pieceId: hood.id, edgeIndex: index },
            b: endpoint,
            reverseB,
          })
        })
      }
      attachHood(leftHood, leftAttachments, 'Left')
      attachHood(rightHood, rightAttachments, 'Right')

      for (const edgeIndex of [4, 5, 6]) {
        next.seams.push({
          id: uniqueId('hood-center'),
          name: `Hood center seam ${edgeIndex - 3}`,
          type: 'normal',
          a: { pieceId: leftId, edgeIndex },
          b: { pieceId: rightId, edgeIndex },
          reverseB: false,
        })
      }
    })

    setSelectedPieceId(leftId)
    setCommandResult('Generated two-panel hood with measured neckline attachment and center crown seam')
  }

  const setGeneratedHoodState = (state) => {
    mutateProject((next) => {
      for (const piece of next.pieces || []) {
        if (['hood-left', 'hood-right'].includes(piece.generatedRole)) piece.hoodState = state
      }
    })
    setRunning(false)
    setResetSignal((signal) => signal + 1)
    setCommandResult(`Hood set ${state}`)
  }

  const addRibFinishSet = () => {
    const front = project.pieces.find((piece) => piece.arrangement3d?.wrap === 'front')
    const back = project.pieces.find((piece) => piece.arrangement3d?.wrap === 'back')
    const leftSleeve = project.pieces.find((piece) => piece.arrangement3d?.wrap === 'left-arm')
    const rightSleeve = project.pieces.find((piece) => piece.arrangement3d?.wrap === 'right-arm')
    if (!front || !back || !leftSleeve || !rightSleeve) {
      setCommandResult('Rib finish generator needs front, back, left sleeve, and right sleeve patterns')
      return
    }
    if (project.pieces.some((piece) => ['rib-waistband', 'rib-cuff-left', 'rib-cuff-right'].includes(piece.generatedRole))) {
      setCommandResult('This garment already has generated rib cuffs or waistband')
      return
    }

    const cuffRatio = 0.92
    const waistbandRatio = 0.94
    const cuffHeightCm = 9
    const waistbandHeightCm = 10
    const leftCuffId = uniqueId('rib-cuff-left')
    const rightCuffId = uniqueId('rib-cuff-right')
    const waistbandId = uniqueId('rib-waistband')

    mutateProject((next) => {
      const mainFabric = next.fabrics?.main || FABRIC_PRESETS.fleece
      if (!next.fabrics.rib) {
        next.fabrics.rib = {
          ...cloneProject(mainFabric),
          id: 'rib',
          name: '1×1 Rib Knit',
          gsm: Math.max(260, Math.round((mainFabric.gsm || 350) * 0.78)),
          stretchWarp: Math.max(0.22, mainFabric.stretchWarp || 0),
          stretchWeft: Math.max(0.42, mainFabric.stretchWeft || 0),
          bend: Math.min(0.68, mainFabric.bend ?? 0.7),
          damping: 0.987,
        }
      }

      const makeCuff = (id, name, sleeve, wrap, layoutX) => {
        const sleeveLength = edgeLength(sleeve, 3)
        const circumference = sleeveLength * cuffRatio
        const half = circumference * 0.5
        const radius = Math.max(0.055, Math.min(0.082, (circumference / 100) / (Math.PI * 2)))
        const cuff = {
          id,
          name,
          generatedRole: id.includes('left') ? 'rib-cuff-left' : 'rib-cuff-right',
          points: [
            { x: -half, y: 0 },
            { x: half, y: 0 },
            { x: half, y: cuffHeightCm },
            { x: -half, y: cuffHeightCm },
          ],
          layout2d: { x: layoutX, y: 206 },
          arrangement3d: { x: 0, y: 0, z: 0, wrap, radius, alongOffsetM: 0.075 },
          simulationResolution: 2,
          grainAngleDeg: 90,
          layerIndex: 1,
          notches: [],
          topstitches: [{ id: `${id}-finish`, edgeIndex: 0, offsetCm: 1.2, rows: 2, rowGapCm: 0.4, stitchLengthMm: 3, color: '#777777' }],
          bindings: [],
          graphics: [],
          zippers: [],
          buttons: [],
          internalLines: [{ id: `${id}-fold`, type: 'fold', a: { x: -half * 0.95, y: cuffHeightCm * 0.5 }, b: { x: half * 0.95, y: cuffHeightCm * 0.5 }, foldAngleDeg: 175 }],
          pins: [],
          seamAllowance: 0.8,
          fabricId: 'rib',
          cutQuantity: 1,
          marker: { allowCrossGrain: false },
          locked: false,
        }
        next.pieces.push(cuff)
        next.seams.push(
          {
            id: uniqueId('cuff-attach'),
            name: `${name} attachment`,
            type: 'normal',
            a: { pieceId: id, edgeIndex: 2 },
            b: { pieceId: sleeve.id, edgeIndex: 3 },
            reverseB: true,
          },
          {
            id: uniqueId('cuff-loop'),
            name: `${name} loop closure`,
            type: 'normal',
            a: { pieceId: id, edgeIndex: 1 },
            b: { pieceId: id, edgeIndex: 3 },
            reverseB: true,
          },
        )
      }

      const nextLeftSleeve = next.pieces.find((piece) => piece.id === leftSleeve.id)
      const nextRightSleeve = next.pieces.find((piece) => piece.id === rightSleeve.id)
      makeCuff(leftCuffId, 'Left Rib Cuff', nextLeftSleeve, 'left-wrist', 52)
      makeCuff(rightCuffId, 'Right Rib Cuff', nextRightSleeve, 'right-wrist', 268)

      const nextFront = next.pieces.find((piece) => piece.id === front.id)
      const nextBack = next.pieces.find((piece) => piece.id === back.id)
      const frontLength = edgeLength(nextFront, 4) * waistbandRatio
      const backLength = edgeLength(nextBack, 4) * waistbandRatio
      const total = frontLength + backLength
      const half = total * 0.5
      const waist = {
        id: waistbandId,
        name: 'Rib Waistband',
        generatedRole: 'rib-waistband',
        points: [
          { x: -half, y: waistbandHeightCm },
          { x: -half + frontLength, y: waistbandHeightCm },
          { x: half, y: waistbandHeightCm },
          { x: half, y: 0 },
          { x: -half + frontLength, y: 0 },
          { x: -half, y: 0 },
        ],
        layout2d: { x: 145, y: 238 },
        arrangement3d: { x: 0, y: 0.89, z: 0, wrap: 'waist-band', phaseDeg: 180, direction: -1, easeM: 0.018 },
        simulationResolution: 2,
        grainAngleDeg: 90,
        layerIndex: 1,
        notches: [{ id: `${waistbandId}-side-notch`, edgeIndex: 0, t: 1, type: 'single', depthCm: 0.45 }],
        topstitches: [{ id: `${waistbandId}-finish`, edgeIndex: 3, offsetCm: 1.2, rows: 2, rowGapCm: 0.45, stitchLengthMm: 3, color: '#777777' }],
        bindings: [],
        graphics: [],
        zippers: [],
        buttons: [],
        internalLines: [{ id: `${waistbandId}-fold`, type: 'fold', a: { x: -half * 0.96, y: waistbandHeightCm * 0.5 }, b: { x: half * 0.96, y: waistbandHeightCm * 0.5 }, foldAngleDeg: 175 }],
        pins: [],
        seamAllowance: 0.8,
        fabricId: 'rib',
        cutQuantity: 1,
        marker: { allowCrossGrain: false },
        locked: false,
      }
      next.pieces.push(waist)
      next.seams.push(
        {
          id: uniqueId('waistband-front'),
          name: 'Waistband to front hem',
          type: 'normal',
          a: { pieceId: waistbandId, edgeIndex: 0 },
          b: { pieceId: nextFront.id, edgeIndex: 4 },
          reverseB: false,
        },
        {
          id: uniqueId('waistband-back'),
          name: 'Waistband to back hem',
          type: 'normal',
          a: { pieceId: waistbandId, edgeIndex: 1 },
          b: { pieceId: nextBack.id, edgeIndex: 4 },
          reverseB: true,
        },
        {
          id: uniqueId('waistband-loop'),
          name: 'Waistband loop closure',
          type: 'normal',
          a: { pieceId: waistbandId, edgeIndex: 2 },
          b: { pieceId: waistbandId, edgeIndex: 5 },
          reverseB: true,
        },
      )
    })

    setSelectedPieceId(waistbandId)
    setSelectedFabricId('rib')
    setCommandResult('Generated separate rib cuffs and waistband from measured sleeve/body hems')
  }

  const addKangarooPocket = () => {
    const front = project.pieces.find((piece) => piece.arrangement3d?.wrap === 'front')
    if (!front) {
      setCommandResult('Kangaroo pocket generator needs a front upper-body pattern')
      return
    }
    if (project.pieces.some((piece) => piece.generatedRole === 'kangaroo-pocket')) {
      setCommandResult('This garment already has a generated kangaroo pocket')
      return
    }

    const pocketId = uniqueId('kangaroo-pocket')
    const targetYOffset = 10
    const points = [
      { x: -21, y: 0 },
      { x: 21, y: 0 },
      { x: 24, y: 14 },
      { x: 16, y: 24 },
      { x: -16, y: 24 },
      { x: -24, y: 14 },
    ]

    mutateProject((next) => {
      const nextFront = next.pieces.find((piece) => piece.id === front.id)
      if (!nextFront) return
      next.pieces.push({
        id: pocketId,
        name: 'Kangaroo Pocket',
        generatedRole: 'kangaroo-pocket',
        points,
        curves: {
          1: { cx: 23, cy: 6 },
          2: { cx: 23, cy: 19 },
          4: { cx: -23, cy: 19 },
          5: { cx: -23, cy: 6 },
        },
        layout2d: { x: 158, y: 166 },
        arrangement3d: { x: 0, y: 0.98 + targetYOffset / 100, z: 0, wrap: 'front' },
        simulationResolution: 2,
        grainAngleDeg: 0,
        layerIndex: 2,
        notches: [],
        topstitches: [
          { id: `${pocketId}-bottom`, edgeIndex: 0, offsetCm: 0.7, rows: 1, rowGapCm: 0.4, stitchLengthMm: 3, color: '#777777' },
          { id: `${pocketId}-right-opening`, edgeIndex: 2, offsetCm: 1.4, rows: 2, rowGapCm: 0.45, stitchLengthMm: 3, color: '#777777' },
          { id: `${pocketId}-top`, edgeIndex: 3, offsetCm: 0.7, rows: 1, rowGapCm: 0.4, stitchLengthMm: 3, color: '#777777' },
          { id: `${pocketId}-left-opening`, edgeIndex: 4, offsetCm: 1.4, rows: 2, rowGapCm: 0.45, stitchLengthMm: 3, color: '#777777' },
        ],
        bindings: [],
        graphics: [],
        zippers: [],
        buttons: [],
        internalLines: [],
        pins: [],
        surfaceAttachments: [
          { id: `${pocketId}-bottom-stitch`, targetPieceId: nextFront.id, sourceEdgeIndex: 0, targetA: { x: -21, y: targetYOffset }, targetB: { x: 21, y: targetYOffset }, stiffness: 0.96 },
          { id: `${pocketId}-right-lower-stitch`, targetPieceId: nextFront.id, sourceEdgeIndex: 1, targetA: { x: 21, y: targetYOffset }, targetB: { x: 24, y: targetYOffset + 14 }, stiffness: 0.95 },
          { id: `${pocketId}-top-stitch`, targetPieceId: nextFront.id, sourceEdgeIndex: 3, targetA: { x: 16, y: targetYOffset + 24 }, targetB: { x: -16, y: targetYOffset + 24 }, stiffness: 0.96 },
          { id: `${pocketId}-left-lower-stitch`, targetPieceId: nextFront.id, sourceEdgeIndex: 5, targetA: { x: -24, y: targetYOffset + 14 }, targetB: { x: -21, y: targetYOffset }, stiffness: 0.95 },
        ],
        seamAllowance: 1,
        fabricId: 'main',
        cutQuantity: 1,
        marker: { allowCrossGrain: false },
        locked: false,
      })
    })
    setSelectedPieceId(pocketId)
    setCommandResult('Generated kangaroo pocket with real interior surface-stitch constraints and open hand entries')
  }

  const updatePieceTrim = (pieceId, collection, trimId, field, value) => {
    mutateProject((next) => {
      const piece = next.pieces.find((item) => item.id === pieceId)
      const trim = piece?.[collection]?.find((item) => item.id === trimId)
      if (trim) trim[field] = value
    })
  }

  const removePieceTrim = (pieceId, collection, trimId) => {
    mutateProject((next) => {
      const piece = next.pieces.find((item) => item.id === pieceId)
      if(piece){
        const removed=piece[collection]?.find(item=>item.id===trimId)
        if(!removed)return
        if(collection==='buttons'||collection==='buttonholes'){
          applyDraftHardwareAction(next,{kind:collection==='buttons'?'button':'buttonhole',pieceId,operation:'remove',itemId:trimId})
        }else{
          piece[collection]=(piece[collection]||[]).filter(item=>item.id!==trimId)
          if(collection==='zippers')restoreZipperSeamIfUnused(next,removed)
        }
      }
    })
  }

  // Object Browser creation selects the new record immediately so the lower
  // Property Editor exposes its true typed fields on the first click. In hybrid
  // mode these are editable EXO draft annotations, never Rust hardware forces.
  const createBrowserConstructionObject=(tab, requestedPieceId)=>{
    const kind=String(tab||'').toLowerCase()==='trim'?'binding':String(tab||'').toLowerCase()
    const collection={button:'buttons',buttonhole:'buttonholes',zipper:'zippers',binding:'bindings',topstitch:'topstitches',puckering:'puckerings'}[kind]
    const piece=project.pieces.find(item=>item.id===requestedPieceId)||
      selectedPiece||project.pieces.find(item=>/front/i.test(item.name+' '+item.id))||project.pieces[0]
    if(!collection||!piece?.points?.length){setCommandResult('Select a draft pattern before creating an annotation');return}
    const id=uniqueId(kind)
    const center=pieceCenter(piece)
    const edgeIndex=Math.min(Math.max(0,trimEdgeIndex),piece.points.length-1)
    const preset=kind==='button'?getHardwarePreset(hardwareChoice.button):
      kind==='zipper'?getHardwarePreset(hardwareChoice.zipper):
      kind==='buttonhole'?getHardwarePreset(hardwareChoice.buttonhole):null
    const created={id}
    if(kind==='button')Object.assign(created,{x:center.x,y:center.y,...buttonValuesFromPreset(preset,resolveHardwareStyle(project,preset?.id))})
    if(kind==='buttonhole')Object.assign(created,{x:center.x,y:center.y,lengthCm:Number(preset?.dimensionsMm?.length??24)/10,
      widthCm:Number(preset?.dimensionsMm?.openingWidth??preset?.dimensionsMm?.stitchedWidth??3.5)/10,
      orientationDeg:Number(preset?.orientationDeg??0),color:'#575757',hardwarePresetId:preset?.id,
      openingShape:preset?.openingShape==='keyhole'?'keyhole':'horizontal',
      eyeDiameterMm:Number(preset?.dimensionsMm?.eyeDiameter??5),
      stitchBorderWidthMm:Number(preset?.dimensionsMm?.stitchBorderWidth??preset?.dimensionsMm?.stitchedWidth??2.4),
      threadColor:preset?.pbr?.baseColor||'#575757',recessColor:'#08090c',
      threadRoughness:.86,threadMetalness:0,reflectionIntensity:1})
    if(kind==='zipper')Object.assign(created,{edgeIndex,...zipperValuesFromPreset(preset)})
    if(kind==='binding')Object.assign(created,{edgeIndex,widthCm:1.8,ratio:.96,stiffness:.72,color:'#3b3b3b',
      roughness:.85,metalness:0,reflectionIntensity:1})
    if(kind==='topstitch')Object.assign(created,{edgeIndex,offsetCm:.7,rows:1,rowGapCm:.45,stitchLengthMm:3,color:'#aaaaaa'})
    if(kind==='puckering')Object.assign(created,{edgeIndex,amplitudeMm:1.5,spacingMm:8,widthCm:1.2,strength:.4,color:'#adadad',visible:true})
    mutateProject(next=>{
      const target=next.pieces.find(item=>item.id===piece.id)
      if(target)target[collection]=[...(target[collection]||[]),created]
    })
    setSelectedPieceId(piece.id)
    setObjectTab(tab)
    setActiveSection('Sewing')
    setShowObjectBrowser(true)
    // Adding a 2D annotation must not interrupt canvas dragging by
    // automatically expanding Object Browser / Property Editor.
    if(viewportLayout!=='2d'&&!patternFocusActive)setInspectorVisible(true)
    setSelectedObjectForProperties({source:'draft',type:kind,id:`${piece.id}:${collection}:${id}`,
      pieceId:piece.id,itemId:id,name:created.name||`${tab} · ${piece.name}`})
    setCommandResult(`${tab} annotation created. ${viewportLayout==='2d'||patternFocusActive?'Expand the right Property Editor to edit its EXO draft properties.':'Edit its EXO draft properties below.'} Native Rust physics is unchanged.`)
  }
  const removeBrowserConstructionObject=selection=>{
    if(selection?.type==='imported-hardware'){
      setSelectedObjectForProperties({source:'imported',type:'imported-hardware',id:selection.id,itemId:selection.itemId,pieceId:selection.pieceId,name:'Imported hardware'})
      if(clothcraftHybrid){nativeImportedHardwareCommand({action:'remove',id:selection.itemId}).then(result=>{if(!result.ok)setCommandResult(result.error||'Could not remove imported hardware')})}
      else mutateProject(next=>{const piece=next.pieces.find(p=>p.id===selection.pieceId);if(piece)piece.importedHardwarePlacements=(piece.importedHardwarePlacements||[]).filter(item=>item.id!==selection.itemId)})
      setSelectedObjectForProperties(null)
      return
    }
    if(selection?.type==='fastener'&&selection.itemId!=null){
      mutateProject(next=>{next.fasteners=(next.fasteners||[]).filter(item=>String(item.id)!==String(selection.itemId))})
      setSelectedObjectForProperties(null)
      setCommandResult('Fastener pair removed; Undo is available.')
      return
    }
    if(!selection?.pieceId || !selection?.itemId)return
    const collection=({button:'buttons',buttonhole:'buttonholes',zipper:'zippers',binding:'bindings',topstitch:'topstitches',puckering:'puckerings'})[String(selection.type).toLowerCase()]
    if(!collection||!project.pieces.some(piece=>piece.id===selection.pieceId))return
    removePieceTrim(selection.pieceId,collection,selection.itemId)
    setSelectedObjectForProperties(null)
    setCommandResult(`${selection.type} removed from EXO draft annotation. Undo is available.`)
  }

  const importGraphic = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !selectedPiece) return
    try {
      const image = await imageFileToDataUrl(file)
      const aspect = image.sourceWidth / Math.max(1, image.sourceHeight)
      const widthCm = 20
      const heightCm = clamp(widthCm / Math.max(0.1, aspect), 4, 32)
      const center = pieceCenter(selectedPiece)
      mutateProject((next) => {
        const piece = next.pieces.find((item) => item.id === selectedPiece.id)
        if (!piece) return
        piece.graphics = piece.graphics || []
        piece.graphics.push({
          id: uniqueId('graphic'),
          name: file.name,
          src: image.src,
          x: center.x,
          y: center.y,
          widthCm,
          heightCm,
          rotationDeg: 0,
          opacity: 1,
        })
      })
      setCommandResult(`Placed ${file.name} on ${selectedPiece.name}`)
    } catch (error) {
      setCommandResult(`Artwork import failed: ${error.message}`)
    }
  }

  const updateGraphic = (pieceId, graphicId, field, value) => {
    mutateProject((next) => {
      const piece = next.pieces.find((item) => item.id === pieceId)
      const graphic = piece?.graphics?.find((item) => item.id === graphicId)
      if (graphic) graphic[field] = value
    })
  }

  const removeGraphic = (pieceId, graphicId) => {
    mutateProject((next) => {
      const piece = next.pieces.find((item) => item.id === pieceId)
      if (piece) piece.graphics = (piece.graphics || []).filter((item) => item.id !== graphicId)
    })
  }

  const addFoamPadding = (pieceId, shapes) => {
    mutateProject(next=>{
      const piece=next.pieces.find(item=>item.id===pieceId)
      if(!piece)return
      piece.foamPads=piece.foamPads||[]
      const center=pieceCenter(piece)
      for(const shape of (Array.isArray(shapes)?shapes:[shapes])){
        piece.foamPads.push({...shape,x:center.x,y:center.y,id:uniqueId('foam-pad')})
      }
    })
    setCommandResult('Foam shapes added. Position them on the garment, adjust depth, and enable stitch guides.')
  }

  const updateFoamPadding = (pieceId,id,fields,{record=true}={}) => mutateProject(next=>{
    const pad=next.pieces.find(item=>item.id===pieceId)?.foamPads?.find(item=>item.id===id)
    if(pad)Object.assign(pad,fields)
  },{record})

  const removeFoamPadding = (pieceId,id) => mutateProject(next=>{
    const piece=next.pieces.find(item=>item.id===pieceId)
    if(piece)piece.foamPads=(piece.foamPads||[]).filter(item=>item.id!==id)
  })

  const updateSelectedPiece = (field, value) => {
    if (!selectedPiece) return
    mutateProject((next) => {
      const piece = next.pieces.find((item) => item.id === selectedPiece.id)
      if (piece) piece[field] = value
    })
  }

  const updateSelectedEdgeAllowance = (edgeIndex, value) => {
    if (!selectedPiece) return
    mutateProject((next) => {
      const piece = next.pieces.find((item) => item.id === selectedPiece.id)
      if (!piece) return
      piece.edgeSeamAllowances = { ...(piece.edgeSeamAllowances || {}) }
      const clamped = clamp(value, 0, 8)
      if (Math.abs(clamped - Number(piece.seamAllowance || 0)) < 1e-6) delete piece.edgeSeamAllowances[edgeIndex]
      else piece.edgeSeamAllowances[edgeIndex] = clamped
    })
  }

  // Numeric edits in the 2D canvas go through the same undoable document
  // transaction as the Property Editor; never mutate a rendered copy.
  const updatePatternEdgeAllowance = (pieceId, edgeIndex, value) => {
    if (!Number.isInteger(edgeIndex) || !Number.isFinite(value) || value < 0 || value > 8) return
    mutateProject((next) => {
      const piece = next.pieces.find(item => item.id === pieceId)
      if (!piece || piece.locked || edgeIndex >= piece.points.length) return
      piece.edgeSeamAllowances = { ...(piece.edgeSeamAllowances || {}) }
      if (Math.abs(value - Number(piece.seamAllowance || 0)) < 1e-6) delete piece.edgeSeamAllowances[edgeIndex]
      else piece.edgeSeamAllowances[edgeIndex] = value
    })
  }

  const resetSelectedEdgeAllowances = () => {
    if (!selectedPiece) return
    mutateProject((next) => {
      const piece = next.pieces.find((item) => item.id === selectedPiece.id)
      if (piece) piece.edgeSeamAllowances = {}
    })
    setCommandResult(`Reset ${selectedPiece.name} edge seam allowances to the pattern default`)
  }

  const updateSelectedArrangement = (field, value) => {
    if (!selectedPiece) return
    mutateProject((next) => {
      const piece = next.pieces.find((item) => item.id === selectedPiece.id)
      if (!piece) return
      piece.arrangement3d = piece.arrangement3d || { x: 0, y: 0.9, z: 0.2, flip: false }
      piece.arrangement3d[field] = value
      if (field === 'wrap' && value === 'front') piece.arrangement3d.z = Math.abs(piece.arrangement3d.z || 0.245)
      if (field === 'wrap' && value === 'back') piece.arrangement3d.z = -Math.abs(piece.arrangement3d.z || 0.245)
    })
  }

  const updateSelectedMarker = (field, value) => {
    if (!selectedPiece) return
    mutateProject((next) => {
      const piece = next.pieces.find((item) => item.id === selectedPiece.id)
      if (!piece) return
      piece.marker = piece.marker || { allowCrossGrain: false }
      piece.marker[field] = value
    })
  }

  const duplicateSelectedPiece = (mirrored = false, linked = false) => {
    if (clothcraftHybrid) {
      window.dispatchEvent(new CustomEvent('exo-clothcraft-command',{detail:mirrored?'mirror-selected':'duplicate-selected'}))
      return
    }
    if (!selectedPiece) return
    const source = cloneProject(selectedPiece)
    const xs = source.points.map((point) => point.x)
    const centerX = (Math.min(...xs) + Math.max(...xs)) * 0.5
    source.id = uniqueId('piece')
    source.name = `${selectedPiece.name}${linked ? ' Linked Mirror' : mirrored ? ' Mirror' : ' Copy'}`
    source.layout2d = { x: selectedPiece.layout2d.x + 72, y: selectedPiece.layout2d.y }
    source.arrangement3d = {
      ...(selectedPiece.arrangement3d || {}),
      x: (selectedPiece.arrangement3d?.x || 0) + (mirrored ? -0.65 : 0.65),
      wrap: undefined,
    }
    source.pins = (source.pins || []).map((pin) => ({ ...pin, id: uniqueId('pin') }))
    if (mirrored) {
      const edgeCount = source.points.length
      source.points = source.points
        .map((point) => ({ x: centerX - (point.x - centerX), y: point.y }))
        .reverse()
      if (source.curves) {
        source.curves = Object.fromEntries(Object.entries(source.curves).map(([edgeIndex, curve]) => {
          const oldIndex = Number(edgeIndex)
          const newIndex = (edgeCount - 2 - oldIndex + edgeCount) % edgeCount
          return [newIndex, { cx: centerX - (curve.cx - centerX), cy: curve.cy }]
        }))
      }
      source.internalLines = (source.internalLines || []).map((line) => ({
        ...line,
        a: { x: centerX - (line.a.x - centerX), y: line.a.y },
        b: { x: centerX - (line.b.x - centerX), y: line.b.y },
      }))
      source.pins = (source.pins || []).map((pin) => ({ ...pin, x: centerX - (pin.x - centerX) }))
      source.buttons = (source.buttons || []).map((button) => ({ ...button, id: uniqueId('button'), x: centerX - (button.x - centerX) }))
      source.buttonholes = (source.buttonholes || []).map((buttonhole) => ({
        ...buttonhole,
        id: uniqueId('buttonhole'),
        x: centerX - (buttonhole.x - centerX),
        orientationDeg: -(buttonhole.orientationDeg || 0),
      }))
      source.notches = (source.notches || []).map((notch) => ({
        ...notch,
        id: uniqueId('notch'),
        edgeIndex: (edgeCount - 2 - notch.edgeIndex + edgeCount) % edgeCount,
        t: 1 - (notch.t ?? 0.5),
      }))
      source.grainAngleDeg = -(source.grainAngleDeg || 0)
    }
    if (linked) source.linkedMirrorSourceId = selectedPiece.id
    mutateProject((next) => next.pieces.push(source))
    setSelectedPieceId(source.id)
  }

  const createLiningCopy = () => {
    if (!selectedPiece) return
    if (selectedPiece.generatedRole === 'lining') {
      setCommandResult('This pattern is already a lining piece')
      return
    }
    const liningId = uniqueId('lining')
    mutateProject((next) => {
      const shell = next.pieces.find((item) => item.id === selectedPiece.id)
      if (!shell) return
      if (next.pieces.some((piece) => piece.liningForPieceId === shell.id)) {
        setCommandResult(`${shell.name} already has a lining copy`)
        return
      }

      if (!next.fabrics.lining) {
        next.fabrics.lining = {
          ...cloneProject(FABRIC_PRESETS.silk),
          id: 'lining',
          name: 'Lightweight Lining',
          gsm: 82,
          friction: 0.16,
          bend: 0.36,
          damping: 0.991,
          thickness: 0.001,
          color: '#7b7b80',
        }
      }

      const lining = cloneProject(shell)
      lining.id = liningId
      lining.name = `${shell.name} Lining`
      lining.generatedRole = 'lining'
      lining.liningForPieceId = shell.id
      lining.layerIndex = Math.max(0, (shell.layerIndex || 0))
      shell.layerIndex = Math.max(1, (shell.layerIndex || 0) + 1)
      lining.fabricId = 'lining'
      lining.layout2d = {
        x: (shell.layout2d?.x || 0) + 66,
        y: (shell.layout2d?.y || 0) + 12,
      }
      lining.arrangement3d = {
        ...(shell.arrangement3d || {}),
        surfaceOffsetM: Number(shell.arrangement3d?.surfaceOffsetM || 0) - 0.004,
      }
      lining.graphics = []
      lining.topstitches = []
      lining.bindings = []
      lining.zippers = []
      lining.buttons = []
      lining.buttonholes = []
      lining.surfaceAttachments = shell.points.map((_, edgeIndex) => ({
        id: `${liningId}-edge-${edgeIndex}`,
        targetPieceId: shell.id,
        sourceEdgeIndex: edgeIndex,
        targetEdgeIndex: edgeIndex,
        restM: 0.0025,
        stiffness: 0.84,
      }))
      lining.marker = { allowCrossGrain: false }
      lining.linkedMirrorSourceId = undefined
      next.pieces.push(lining)
    })
    setSelectedPieceId(liningId)
    setSelectedFabricId('lining')
    setCommandResult(`Created separate lining layer for ${selectedPiece.name}`)
  }

  const createInterfacingCopy = () => {
    if (!selectedPiece) return
    if (selectedPiece.generatedRole === 'interfacing') {
      setCommandResult('This pattern is already an interfacing piece')
      return
    }
    const interfacingId = uniqueId('interfacing')
    mutateProject((next) => {
      const shell = next.pieces.find((item) => item.id === selectedPiece.id)
      if (!shell) return
      if (next.pieces.some((piece) => piece.interfacingForPieceId === shell.id)) {
        setCommandResult(`${shell.name} already has a fused interfacing copy`)
        return
      }
      next.fabrics = next.fabrics || {}
      if (!next.fabrics.interfacing) next.fabrics.interfacing = { ...cloneProject(FABRIC_PRESETS.interfacing), id: 'interfacing', name: 'Fusible Interfacing' }

      const interfacing = cloneProject(shell)
      interfacing.id = interfacingId
      interfacing.name = `${shell.name} Interfacing`
      interfacing.generatedRole = 'interfacing'
      interfacing.interfacingForPieceId = shell.id
      interfacing.fusedToPieceId = shell.id
      interfacing.fuseStiffness = 0.985
      interfacing.fuseGapM = 0.001
      interfacing.fabricId = 'interfacing'
      interfacing.layerIndex = shell.layerIndex || 0
      interfacing.layout2d = {
        x: (shell.layout2d?.x || 0) + 76,
        y: (shell.layout2d?.y || 0) + 18,
      }
      interfacing.arrangement3d = {
        ...(shell.arrangement3d || {}),
        surfaceOffsetM: Number(shell.arrangement3d?.surfaceOffsetM || 0) - 0.002,
      }
      interfacing.graphics = []
      interfacing.topstitches = []
      interfacing.bindings = []
      interfacing.zippers = []
      interfacing.buttons = []
      interfacing.buttonholes = []
      interfacing.surfaceAttachments = []
      interfacing.pins = []
      interfacing.linkedMirrorSourceId = undefined
      interfacing.marker = { allowCrossGrain: false }
      interfacing.strengthened = false
      interfacing.visible3d = false
      next.pieces.push(interfacing)
    })
    setSelectedPieceId(interfacingId)
    setSelectedFabricId('interfacing')
    setCommandResult(`Created fused interfacing layer for ${selectedPiece.name}`)
  }

  const unlinkSelectedMirror = () => {
    if (!selectedPiece?.linkedMirrorSourceId) return
    mutateProject((next) => {
      const piece = next.pieces.find((item) => item.id === selectedPiece.id)
      if (piece) delete piece.linkedMirrorSourceId
    })
    setCommandResult(`${selectedPiece.name} is now an independent pattern`)
  }

  const updateFabric = (field, value) => {
    mutateProject((next) => {
      const target = next.fabrics?.[selectedFabricId] || next.fabrics?.main
      if (target) target[field] = value
    })
  }
  const importFabricLabMeasurements = async (event) => {
    const file=event.target.files?.[0]
    event.target.value=''
    if(!file)return
    try{
      if(file.size>4*1024*1024)throw new Error('Measurement JSON exceeds the 4 MB safety limit')
      const record=JSON.parse(await file.text())
      const presetId=fabric.catalogPresetId||
        Object.keys(FABRIC_PRESETS).find(key=>FABRIC_PRESETS[key].name===fabric.name)
      if(!presetId)throw new Error('Choose a fabric catalog preset before importing a lab specimen')
      if(record.fabricId!==presetId)throw new Error(`Lab record is for ${record.fabricId}; selected preset is ${presetId}`)
      const checked=calibrateFabricEvidence(record,FABRIC_PRESETS)
      mutateProject(next=>{
        const target=next.fabrics?.[selectedFabricId]||next.fabrics?.main
        if(!target)return
        // Only units that map *directly* to this cloth solver are applied.
        // Tensile, bending, and shear observations remain recorded pending
        // an independently validated constitutive model fitting process.
        if(checked.physical.arealMassKgM2)target.gsm=checked.physical.arealMassKgM2.value*1000
        if(checked.physical.thicknessM)target.thickness=checked.physical.thicknessM.value
        target.calibration={
          status:'imported-unverified',grade:checked.grade,
          specimenId:record.provenance.sampleId,
          evidenceUri:record.provenance.evidenceUri,
          source:record.provenance.sourceReference,
          note:'User-supplied measurement document; instrument traceability has not been independently verified.',
        }
        target.calibrationEvidence=record
        target.calibrationSuggestions=checked.solverSuggestions
      })
      setCommandResult(`Imported ${checked.grade}-coverage specimen evidence for ${presetId}; directly measured areal mass and thickness updated where provided. Solver stretch/shear/bend calibration requires separate validation.`)
    }catch(error){
      setCommandResult(`Laboratory evidence import rejected: ${error.message}`)
    }
  }
  const updateFabricWash = (updates) => {
    mutateProject((next) => {
      const target = next.fabrics?.[selectedFabricId] || next.fabrics?.main
      if (!target) return
      target.wash = normalizeWashSpec({ ...target.wash, ...updates })
    })
  }

  const applyFabricPreset = (presetId) => {
    const preset = FABRIC_PRESETS[presetId]
    if (!preset) return
    mutateProject((next) => {
      const current = next.fabrics?.[selectedFabricId] || next.fabrics?.main
      const targetId = current?.id || selectedFabricId || 'main'
      // A newly chosen scan-backed preset must install its OWN CC0 source;
      // otherwise the editor silently retained the previous fabric's photo.
      // Manually uploaded textures remain deliberate user overrides.
      const texture = current?.texture?.src && !current.texture.scanAssetId
        ? cloneProject(current.texture) : null
      next.fabrics[targetId] = { ...preset, id: targetId, catalogPresetId:presetId, name: preset.name, ...(current?.pricePerMeter != null ? { pricePerMeter: current.pricePerMeter } : {}), ...(texture ? { texture } : {}) }
    })
  }

  const importFabricTexture = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const image = await imageFileToDataUrl(file, 1536)
      mutateProject((next) => {
        const target = next.fabrics?.[selectedFabricId] || next.fabrics?.main
        if (!target) return
        const usedScan=Boolean(target.texture?.scanAssetId)
        target.texture = {
          ...(target.texture || {}),
          src: image.src,
          name: file.name,
          repeatWidthCm: target.texture?.repeatWidthCm ?? 20,
          repeatHeightCm: target.texture?.repeatHeightCm ?? 20,
          rotationDeg: target.texture?.rotationDeg ?? 0,
        }
        if (usedScan) {
          // Do not associate hand-uploaded color with the previous stock scan
          // or its unmatched normal/roughness maps.
          for(const field of ['scanAssetId','scanSource','license','originalSourceUrl','scanMatch','originalPhotoColor','photoReferenceIsShared','normalSrc','roughnessSrc'])
            delete target.texture[field]
          target.photoReference={status:'user-uploaded-texture',license:'user-responsibility',sourceFile:file.name}
        }
        // Photo-derived maps belong to the previous image; authored imported
        // PBR maps are kept intact when a user changes the color texture.
        for (const key of ['normal', 'roughness']) {
          if (target.texture[`${key}Name`] === 'Auto from textile image') {
            delete target.texture[`${key}Src`]
            delete target.texture[`${key}Name`]
          }
        }
      })
      setCommandResult(`Applied ${file.name} as the ${fabric.name || 'fabric'} surface texture`)
    } catch (error) {
      setCommandResult(`Fabric texture import failed: ${error.message}`)
    }
  }

  const updateFabricTexture = (field, value) => {
    mutateProject((next) => {
      const target = next.fabrics?.[selectedFabricId] || next.fabrics?.main
      if (!target) return
      target.texture = target.texture || { src: '', name: 'Texture', repeatWidthCm: 20, repeatHeightCm: 20, rotationDeg: 0 }
      target.texture[field] = value
    })
  }

  const autoGenerateFabricPbr = async () => {
    if (fabricGeneratingPbr || !fabric.texture?.src) return
    const fabricId = selectedFabricId
    const source = fabric.texture.src
    setFabricGeneratingPbr(true)
    try {
      const result = await generateFabricPbrFromImage(source,{maxSize:512})
      let added=0
      mutateProject((next) => {
        const target=next.fabrics?.[fabricId]
        if (!target?.texture || target.texture.src!==source) return
        for (const key of ['normal','roughness']) {
          if (target.texture[`${key}Src`]) continue
          target.texture[`${key}Src`]=result[`${key}Src`]
          target.texture[`${key}Name`]='Auto from textile image'
          added++
        }
      })
      setCommandResult(added
        ? `Created ${added} estimated PBR map(s) from ${result.width}×${result.height} textile pixels. Fine-tune for physical accuracy.`
        : 'Normal and roughness maps already assigned; preserved existing user-authored maps.')
    } catch (error) {
      setCommandResult(`Photo-to-PBR generation failed: ${error.message}`)
    } finally {
      setFabricGeneratingPbr(false)
    }
  }

  const importFabricPbrMap = async (event, kind) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !['normal', 'roughness', 'metalness', 'opacity', 'displacement'].includes(kind)) return
    try {
      const image = await imageFileToDataUrl(file, 1536)
      mutateProject((next) => {
        const target = next.fabrics?.[selectedFabricId] || next.fabrics?.main
        if (!target) return
        target.texture = target.texture || { src: '', name: 'Texture', repeatWidthCm: 20, repeatHeightCm: 20, rotationDeg: 0 }
        target.texture[`${kind}Src`] = image.src
        target.texture[`${kind}Name`] = file.name
      })
      setCommandResult(`Applied ${file.name} as the ${fabric.name || 'fabric'} ${kind} map`)
    } catch (error) {
      setCommandResult(`${kind} map import failed: ${error.message}`)
    }
  }

  const importFabricPbrSet = async (event) => {
    const files=Array.from(event.target.files || [])
    event.target.value=''
    if (!files.length) return
    const recognized=files.map(file=>({file,kind:classifyFabricPbrFilename(file.name)}))
      .filter(item=>item.kind)
    if (!recognized.length) {
      setCommandResult('No supported maps found. Use filenames with _diff, _nor_gl, _rough, _metal, _opacity or _height. DirectX/packed maps require conversion.')
      return
    }
    try {
      const imported=await Promise.all(recognized.map(async item=>({
        ...item,image:await imageFileToDataUrl(item.file,1536),
      })))
      const targetFabricId=selectedFabricId
      mutateProject((next)=>{
        const target=next.fabrics?.[targetFabricId]
        if (!target) return
        target.texture=target.texture || {repeatWidthCm:20,repeatHeightCm:20,rotationDeg:0}
        for (const {file,kind,image} of imported) {
          const prefix=kind==='color' ? '' : kind
          target.texture[prefix ? `${prefix}Src` : 'src']=image.src
          target.texture[prefix ? `${prefix}Name` : 'name']=file.name
        }
      })
      setCommandResult(`Imported ${imported.length} fabric PBR channel(s). ${files.length-imported.length} unmatched or unsupported file(s) ignored.`)
    } catch (error) {
      setCommandResult(`PBR set import failed: ${error.message}`)
    }
  }

  const removeFabricPbrMap = (kind) => {
    if (!['normal', 'roughness', 'metalness', 'opacity', 'displacement'].includes(kind)) return
    mutateProject((next) => {
      const target = next.fabrics?.[selectedFabricId] || next.fabrics?.main
      if (!target?.texture) return
      delete target.texture[`${kind}Src`]
      delete target.texture[`${kind}Name`]
    })
    setCommandResult(`${kind[0].toUpperCase()}${kind.slice(1)} map removed`)
  }

  const removeFabricTexture = () => {
    mutateProject((next) => {
      const target = next.fabrics?.[selectedFabricId] || next.fabrics?.main
      if (!target?.texture) return
      delete target.texture.src
      delete target.texture.name
      // Keep any custom repeat/rotation settings when the final image is
      // removed: those values should still apply to the next imported map.
      const customMapping=Number(target.texture.repeatWidthCm??20)!==20||
        Number(target.texture.repeatHeightCm??20)!==20||
        Number(target.texture.rotationDeg??0)!==0
      if (!customMapping&&!['normalSrc','roughnessSrc','metalnessSrc','opacitySrc','displacementSrc'].some(key => target.texture[key])) delete target.texture
    })
    setCommandResult('Fabric color texture removed; PBR detail maps were preserved')
  }

  const addFabricSwatch = () => {
    const id = uniqueId('fabric')
    mutateProject((next) => {
      const source = next.fabrics?.[selectedFabricId] || next.fabrics?.main || FABRIC_PRESETS.fleece
      next.fabrics = next.fabrics || {}
      next.fabrics[id] = {
        ...cloneProject(source),
        id,
        name: `Fabric ${Object.keys(next.fabrics).length + 1}`,
      }
    })
    setSelectedFabricId(id)
    setSelectedObjectForProperties({source:'draft',type:'fabric',id,name:project.fabrics?.[id]?.name||'New Fabric'})
  }

  // The Object Browser actions edit the same project records as the lower
  // Property Editor. A copied swatch or trim receives a new persistent ID.
  const copyObjectBrowserRow = row => {
    if(!row)return
    if(row.type==='fabric'){
      if(clothcraftHybrid){setCommandResult('Native Rust currently edits existing fabric records. New native fabric IDs are not supported.');return}
      const source=project.fabrics?.[row.id]
      if(!source)return
      const id=uniqueId('fabric')
      const name=`${source.name||'Fabric'} Copy`
      mutateProject(next=>{next.fabrics={...next.fabrics,[id]:{...cloneProject(source),id,name}}})
      setSelectedFabricId(id)
      setSelectedObjectForProperties({source:'draft',type:'fabric',id,name})
      setCommandResult(`Copied ${source.name||'fabric'} into a separate, editable fabric swatch.`)
      return
    }
    if(clothcraftHybrid&&row.type==='graphic'){
      window.dispatchEvent(new CustomEvent('exo-clothcraft-copy-graphic',{detail:{id:row.id}}))
      return
    }
    if(row.type==='imported-hardware'&&clothcraftHybrid){
      nativeImportedHardwareCommand({action:'duplicate',id:row.itemId}).then(result=>{if(!result.ok)setCommandResult(result.error||'Could not copy imported hardware')})
      return
    }
    if(row.type==='imported-hardware'&&!clothcraftHybrid){
      const piece=project.pieces.find(item=>item.id===row.pieceId)
      const source=piece?.importedHardwarePlacements?.find(item=>String(item.id)===String(row.itemId))
      if(!source)return
      const id=uniqueId('clo-hardware')
      mutateProject(next=>{const target=next.pieces.find(item=>item.id===piece.id);target.importedHardwarePlacements=[...(target.importedHardwarePlacements||[]),{...cloneProject(source),id,x:Number(source.x||0)+1}]})
      setSelectedObjectForProperties({source:'imported',type:'imported-hardware',id:`imported-hardware:${id}`,itemId:id,pieceId:piece.id,name:source.name})
      setCommandResult('Copied original imported 3D hardware into a new editable placement.')
      return
    }
    const collection=row.collection
    const piece=project.pieces.find(item=>item.id===row.pieceId)
    const source=piece?.[collection]?.find(item=>String(item.id)===String(row.itemId))
    if(!collection||!source)return
    const id=uniqueId(row.type||'object')
    const copy={...cloneProject(source),id}
    if(Number.isFinite(copy.x))copy.x+=1
    if(Number.isFinite(copy.y))copy.y+=1
    mutateProject(next=>{const target=next.pieces.find(item=>item.id===piece.id);target[collection]=[...(target[collection]||[]),copy]})
    setSelectedObjectForProperties({source:'draft',type:row.type,id:row.type==='graphic'?id:`${piece.id}:${collection}:${id}`,itemId:id,pieceId:piece.id,collection,name:`${row.name} Copy`})
    setCommandResult(`Copied ${row.name} on ${piece.name}.`)
  }
  const assignObjectBrowserRow = row => {
    if(!row)return
    if(row.type==='fabric'){
      if(clothcraftHybrid){
        window.dispatchEvent(new CustomEvent('exo-clothcraft-assign-fabric',{detail:{id:row.id}}))
      }else if(selectedPieceId&&project.pieces.some(piece=>piece.id===selectedPieceId)){
        assignFabric(row.id)
      }else setCommandResult('Select a garment pattern before assigning this fabric.')
      return
    }
    if(clothcraftHybrid&&row.type==='graphic'){
      window.dispatchEvent(new CustomEvent('exo-clothcraft-assign-graphic',{detail:{id:row.id}}))
      return
    }
    const target=project.pieces.find(piece=>piece.id===selectedPieceId)
    if(!target){setCommandResult('Select the destination pattern before assigning an object.');return}
    if(row.pieceId===target.id){setCommandResult(`${row.name} is already on ${target.name}.`);return}
    const sourcePiece=project.pieces.find(piece=>piece.id===row.pieceId)
    const collection=row.collection
    const source=sourcePiece?.[collection]?.find(item=>String(item.id)===String(row.itemId))
    if(!source){setCommandResult('Select an existing object to assign.');return}
    const id=uniqueId(row.type||'object'),copy={...cloneProject(source),id}
    if(Number.isFinite(copy.x)&&Number.isFinite(copy.y)){
      const a=pieceCenter(sourcePiece),b=pieceCenter(target)
      copy.x+=b.x-a.x;copy.y+=b.y-a.y
    }
    mutateProject(next=>{const piece=next.pieces.find(item=>item.id===target.id);piece[collection]=[...(piece[collection]||[]),copy]})
    setSelectedObjectForProperties({source:'draft',type:row.type,id:row.type==='graphic'?id:`${target.id}:${collection}:${id}`,itemId:id,pieceId:target.id,collection,name:row.name})
    setCommandResult(`Assigned ${row.name} to ${target.name} as a separate editable object.`)
  }

  const addFabricPresetSwatch = (presetId) => {
    const preset = FABRIC_PRESETS[presetId]
    if (!preset) return
    const id = uniqueId('fabric')
    mutateProject((next) => {
      next.fabrics = next.fabrics || {}
      next.fabrics[id] = {...cloneProject(preset), id}
    })
    setSelectedFabricId(id)
    setActiveSection('Fabric')
    setObjectTab('Fabric')
    setShowObjectBrowser(true)
    setCommandResult(`Added ${preset.name} as a new swatch. Assign it to a pattern in Fabric properties.`)
  }

  // A library swatch click must affect the visible garment, not merely open
  // an inspector. Assign it to the active pattern without changing any
  // underlying draft shape, sewing topology, or the other fabric swatches.
  const assignFabric = (fabricId, allPieces = false) => {
    if (!project.fabrics?.[fabricId]) return
    mutateProject((next) => {
      for (const piece of next.pieces || []) {
        if (allPieces || piece.id === selectedPieceId) piece.fabricId = fabricId
      }
    })
    setSelectedFabricId(fabricId)
    setActiveSection('Fabric')
    setObjectTab('Fabric')
    setCommandResult(`Applied ${project.fabrics[fabricId].name || fabricId} to ${allPieces ? 'all pattern pieces' : (selectedPiece?.name || 'the selected pattern')}. The 3D cloth material updates with the project.`)
  }
  const addAndApplyFabricPreset = (presetId, {allPieces=false} = {}) => {
    const preset = FABRIC_PRESETS[presetId]
    if (!preset) return
    // Double-clicking a fabric must change an actual garment panel. Keep an
    // existing catalog swatch when it was previously imported, rather than
    // creating identical swatches on every double-click.
    const existing=Object.entries(project.fabrics||{}).find(([,item])=>item.catalogPresetId===presetId)
    const id=existing?.[0]||uniqueId('fabric')
    const selectedIsInGarment=project.pieces.some(piece=>piece.id===selectedPieceId)
    const applyEveryPiece=allPieces||!selectedIsInGarment
    mutateProject((next) => {
      next.fabrics = next.fabrics || {}
      if(!existing)next.fabrics[id] = { ...cloneProject(preset), id, catalogPresetId:presetId }
      for (const piece of next.pieces||[])if(applyEveryPiece||piece.id===selectedPieceId)piece.fabricId=id
    })
    setSelectedFabricId(id)
    setActiveSection('Fabric')
    setObjectTab('Fabric')
    setShowObjectBrowser(true)
    setSelectedObjectForProperties({source:'draft',type:'fabric',id,name:preset.name})
    setCommandResult(`Applied ${preset.name} to ${applyEveryPiece?'all garment panels':(selectedPiece?.name||'selected pattern')}. The 3D PBR maps now use the selected textile.`)
  }

  const activateFabricFromLibrary = (presetId, options={}) => {
    const preset=FABRIC_PRESETS[presetId]
    if(!preset)return
    if(clothcraftHybrid){
      // Rust's running garment is a separate authoritative document. Send the
      // catalog choice through its active editor; editing project.fabrics here
      // would silently change an unrelated draft instead.
      window.dispatchEvent(new CustomEvent('exo-clothcraft-apply-preset',{
        detail:{presetId,allPieces:Boolean(options.allPieces)},
      }))
      setActiveSection('Fabric')
      setObjectTab('Fabric')
      setShowObjectBrowser(true)
      return
    }
    addAndApplyFabricPreset(presetId,options)
  }

  const deleteFabricSwatch = (fabricId) => {
    if (fabricId === 'main') return
    mutateProject((next) => {
      if (!next.fabrics?.[fabricId]) return
      delete next.fabrics[fabricId]
      for (const piece of next.pieces || []) {
        if (piece.fabricId === fabricId) piece.fabricId = 'main'
      }
    })
    setSelectedFabricId('main')
  }

  const updateAvatar = (field, value) => {
    mutateProject((next) => {
      next.avatar[field] = value
    })
  }

  const importAvatarMesh = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!['glb', 'obj'].includes(extension)) {
      setCommandResult('Export the CLO avatar to OBJ or GLB first. Native .avt files are not supported by the 3D viewport.')
      return
    }
    if (file.size > 80 * 1024 * 1024) {
      setCommandResult('Avatar file exceeds the 80 MB interactive import limit. Optimize the mesh before import.')
      return
    }
    const url = URL.createObjectURL(file)
    setCustomAvatar((previous) => { if (previous?.url) URL.revokeObjectURL(previous.url); return { url, type: extension, name: file.name } })
    setAvatarModel('custom-export')
    setCommandResult(`Loaded ${file.name} as the visual avatar. Physics remains on the measurement-based collision body.`)
  }

  const setAvatarModel = (model) => {
    if (clothcraftHybrid) {
      if (!['makehuman-base', 'clo-thomas'].includes(model)) {
        setCommandResult('Native V2 currently supports MakeHuman and CLO Thomas fitting avatars. Select either to load its actual collision body.')
        return
      }
      window.dispatchEvent(new CustomEvent('exo-clothcraft-select-avatar', {detail:{model}}))
      setCommandResult(`Loading ${model === 'clo-thomas' ? 'CLO Thomas' : 'MakeHuman'} into the native 2D and 3D viewports…`)
      return
    }
    if (avatarAvailability[model] === false) {
      setCommandResult(`${model} model is not installed. Select an available avatar or import an OBJ / GLB file.`)
      return
    }
    mutateProject((next) => {
      next.avatar.model = model
      if (model === 'clo-thomas') {
        next.avatar.name = 'CLO Thomas'
        next.avatar.armAngleDeg = Math.min(25, Number(next.avatar.armAngleDeg ?? 6))
      } else if (model === 'custom-export') {
        next.avatar.name = 'Imported CLO avatar mesh'
      } else if (model === 'theo') {
        next.avatar.name = 'Theo Fitting'
        next.avatar.armAngleDeg = 60
      } else if (model === 'nora') {
        next.avatar.name = 'Nora Fitting'
        next.avatar.armAngleDeg = 60
      } else {
        next.avatar.name = 'MakeHuman Base'
        next.avatar.armAngleDeg = Math.min(25, Number(next.avatar.armAngleDeg ?? 6))
      }
    })
  }

  const updateSimulation = (field, value) => {
    mutateProject((next) => {
      next.simulation[field] = value
    })
  }

  const startPpfSewing = async (options = {}) => {
    // onClick passes a browser event. Do not destructure arbitrary event
    // objects as fit configuration or preserve flags.
    const preserveInteractiveSimulation = options?.preserveInteractiveSimulation === true
    if (!project.seams.length || ['queued', 'running', 'connecting'].includes(ppfSewing.status)) return
    setPpfPreview(null)
    setPpfPreviewError('')
    setPpfSewing({ status: 'connecting', phase: 'health', jobId: null, error: null, summary: null, artifacts: null })
    try {
      const health = await getPpfServiceHealth()
      if (!health.ready) throw new Error(health.busy
        ? 'Another PPF solve is in progress. Wait for it to finish.'
        : 'PPF Metal is not ready (check solver runtime and available disk space).')
      if (!preserveInteractiveSimulation) setRunning(false)
      const job = await submitPpfFinalSolve(cloneProject(project), { frames: ppfFrames })
      setPpfSewing({ status: job.status, phase: job.phase, jobId: job.id, error: null, summary: job.summary, artifacts: null })
      setCommandResult(`PPF physical sewing started: ${job.id}`)
    } catch (error) {
      setPpfSewing({ status: 'error', phase: 'connection', jobId: null, error: error.message || String(error), summary: null, artifacts: null })
    }
  }

  const openZozoReference = async () => {
    if (zozoReference) { setZozoReference(null); setZozoReferencePlaying(false); return }
    setZozoReferenceLoading(true)
    setZozoReferenceError('')
    try {
      const reference = await loadZozoDressReference()
      setZozoReference(reference)
      setZozoReferenceFrame(reference.manifest.frames - 1)
      setZozoReferencePlaying(false)
      setRunning(false)
      setActiveSection('Fit')
      setCommandResult('Opened original ZOZO/Codim-IPC dress and pinned body with real saved Metal simulation. Experimental contact failures remain; your editable project is unchanged.')
    } catch (error) {
      setZozoReferenceError(error.message || String(error))
    } finally {
      setZozoReferenceLoading(false)
    }
  }

  useEffect(() => {
    if (!zozoReference || !zozoReferencePlaying) return undefined
    const timer = window.setInterval(() => setZozoReferenceFrame(frame => (frame + 1) % zozoReference.manifest.frames), 1000 / zozoReference.manifest.frameRate)
    return () => window.clearInterval(timer)
  }, [zozoReference, zozoReferencePlaying])

  const showPpfPreview = async (jobId = ppfSewing.jobId, frame = null, stage = null) => {
    if (!jobId || (ppfSewing.status !== 'done' && stage !== 'initial-assembly')) return
    setPpfPreviewLoading(true)
    setPpfPreviewError('')
    try {
      const preview = await getPpfJobPreview(jobId, { frame, stage })
      if (preview.format !== 'garment-studio.ppf-preview.v1') throw new Error('Unsupported PPF preview format')
      setRunning(false)
      setArrangementSpread(0)
      setPpfPreview(preview)
      setCommandResult(preview.stage === 'initial-assembly'
        ? 'Showing verified starting arrangement only. Sewing and continuous body-contact simulation are unfinished.'
        : preview.accepted
          ? `Showing accepted ZOZO PPF frame ${preview.frame + 1}/${preview.frames}`
          : `Showing experimental ZOZO PPF frame ${preview.frame + 1}/${preview.frames}. This result failed full fit validation.`)
    } catch (error) {
      setPpfPreviewError(error?.message || String(error))
    } finally {
      setPpfPreviewLoading(false)
    }
  }

  useEffect(() => {
    if (!ppfAutoRunRequestRef.current || !hasSimulated) return
    ppfAutoRunRequestRef.current = false
    if (['queued', 'running', 'connecting'].includes(ppfSewing.status)) return
    // Do not stop the interactive drape while its optional final quality
    // check runs in Blender. The asynchronous job checks actual body contact.
    void startPpfSewing({ preserveInteractiveSimulation: true })
  }, [hasSimulated, ppfSewing.status])

  useEffect(() => {
    if (!ppfSewing.jobId || !['queued', 'running'].includes(ppfSewing.status)) return undefined
    let active = true
    const poll = async () => {
      try {
        const job = await getPpfJob(ppfSewing.jobId)
        if (!active) return
        setPpfSewing({ status: job.status, phase: job.phase, jobId: job.id,
          error: job.error || null, summary: job.summary || null, artifacts: job.artifacts || null })
        if (job.status === 'done') {
          const acceptance = job.summary?.fitAcceptance
          setCommandResult(acceptance?.accepted
            ? `Validated PPF fit saved in Blender: ${job.artifacts?.blend || 'completed'}`
            : `PPF experimental solve is NOT approved as a fitted garment: ${job.summary?.contact?.maxAvatarIntersectionPairs || 0} body crossings, ${job.summary?.contact?.maxSelfIntersectionPairs || 0} self crossings. Source pattern and live cloth preserved.`)
        }
      } catch (error) {
        if (active) setPpfSewing((state) => ({ ...state, status: 'error', error: error.message || String(error) }))
      }
    }
    poll()
    const timer = setInterval(poll, 1500)
    return () => { active = false; clearInterval(timer) }
  }, [ppfSewing.jobId, ppfSewing.status])

  const updateRenderSetting = (field, value) => {
    mutateProject((next) => {
      next.render = next.render || { environmentPreset: 'studio', exposure: 1.1, showEnvironment: false, widthPx: 2048, heightPx: 2560 }
      next.render[field] = value
    })
  }

  const updateStageSetting = (field, value) => {
    mutateProject(next=>{
      next.render=next.render||{}
      next.render.stageSettings={...(next.render.stageSettings||{}),[field]:value}
    })
  }

  const editSceneEnvironmentProperties=patch=>{
    if(!patch||typeof patch!=='object')return
    mutateProject(next=>{
      next.render=next.render||{}
      for(const [key,value] of Object.entries(patch)){
        if(key==='camera'||key==='light'){
          const target=key==='light'&&environmentSelection?.id==='light-2'?'light2':key
          next.render[target]={...(key==='camera'?initialSceneCamera:{}),...(next.render[target]||{}),...value}
        }else next.render[key]=value
      }
    })
  }

  const updateRenderResolution = (widthPx, heightPx) => {
    mutateProject((next) => {
      next.render = next.render || { environmentPreset: 'studio', exposure: 1.1, showEnvironment: false, widthPx: 2048, heightPx: 2560 }
      next.render.widthPx = Math.round(clamp(widthPx, 512, 6144))
      next.render.heightPx = Math.round(clamp(heightPx, 512, 6144))
    })
  }

  const importHdri = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (hdriUrl) URL.revokeObjectURL(hdriUrl)
    const url = URL.createObjectURL(file)
    setHdriUrl(url)
    setHdriName(file.name)
    updateRenderSetting('environmentPreset', 'studio')
    setCommandResult(`Loaded HDRI environment ${file.name}`)
  }

  const clearHdri = () => {
    if (hdriUrl) URL.revokeObjectURL(hdriUrl)
    setHdriUrl('')
    setHdriName('')
    setCommandResult('Restored built-in studio environment')
  }

  const updateWind = (field, value) => {
    mutateProject((next) => {
      next.simulation.wind = next.simulation.wind || { enabled: false, speed: 4, directionDeg: 0, turbulence: 0.18, response: 0.025 }
      next.simulation.wind[field] = value
    })
  }

  const applySimulationQuality = (quality) => {
    const presets = {
      draft: { substeps: 1, iterations: 7 },
      balanced: { substeps: 2, iterations: 7 },
      final: { substeps: 4, iterations: 7 },
    }
    const preset = presets[quality]
    if (!preset) return
    mutateProject((next) => {
      next.simulation = { ...next.simulation, ...preset }
    })
    setCommandResult(`Simulation quality set to ${quality}`)
  }

  const updateGrading = (field, value) => {
    mutateProject((next) => {
      next.grading = next.grading || { baseSize: 'M', sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] }
      next.grading[field] = value
    })
  }

  const automaticGradeDelta = (piece, point) => {
    const sizes = project.grading?.sizes || ['M']
    const baseSize = project.grading?.baseSize || sizes[0]
    const baseIndex = Math.max(0, sizes.indexOf(baseSize))
    const previewSize = sizes[baseIndex + 1] || sizes[baseIndex - 1] || baseSize
    const offset = sizeOffset(project.grading, previewSize)
    if (!offset) return { dxPerSize: 0, dyPerSize: 0 }
    const automaticPoint = gradePointForPiece(piece, project.grading, previewSize, { ...point, gradeRule: undefined, industrialGradeRule: undefined })
    return {
      dxPerSize: (automaticPoint.x - point.x) / offset,
      dyPerSize: (automaticPoint.y - point.y) / offset,
    }
  }

  const setPointGradeRuleEnabled = (pieceId, pointIndex, enabled) => {
    mutateProject((next) => {
      const piece = next.pieces.find((item) => item.id === pieceId)
      const point = piece?.points?.[pointIndex]
      if (!piece || !point) return
      if(enabled)delete point.industrialGradeRule
      if (!enabled) {
        point.gradeRule = undefined
        return
      }
      const sizes = next.grading?.sizes || ['M']
      const baseSize = next.grading?.baseSize || sizes[0]
      const baseIndex = Math.max(0, sizes.indexOf(baseSize))
      const previewSize = sizes[baseIndex + 1] || sizes[baseIndex - 1] || baseSize
      const offset = sizeOffset(next.grading, previewSize)
      const automaticPoint = gradePointForPiece(piece, next.grading, previewSize, { ...point, gradeRule: undefined })
      point.gradeRule = {
        enabled: true,
        dxPerSize: offset ? (automaticPoint.x - point.x) / offset : 0,
        dyPerSize: offset ? (automaticPoint.y - point.y) / offset : 0,
      }
    })
  }

  const updatePointGradeRule = (pieceId, pointIndex, field, value) => {
    mutateProject((next) => {
      const point = next.pieces.find((item) => item.id === pieceId)?.points?.[pointIndex]
      if (!point) return
      delete point.industrialGradeRule
      point.gradeRule = point.gradeRule || { enabled: true, dxPerSize: 0, dyPerSize: 0 }
      point.gradeRule.enabled = true
      point.gradeRule[field] = value
    })
  }

  const copyPointGradeRule = (piece, pointIndex) => {
    const point = piece?.points?.[pointIndex]
    if (!point) return
    if(point.industrialGradeRule){setCommandResult('This point uses individual size-break rules. Edit its full break table in Industrial Grading instead of copying one average increment.');return}
    const automatic = automaticGradeDelta(piece, point)
    const rule = point.gradeRule?.enabled ? point.gradeRule : automatic
    setGradeRuleClipboard({
      dxPerSize: Number(rule.dxPerSize) || 0,
      dyPerSize: Number(rule.dyPerSize) || 0,
    })
  }

  const pastePointGradeRule = (pieceId, pointIndex) => {
    if (!gradeRuleClipboard) return
    mutateProject((next) => {
      const point = next.pieces.find((piece) => piece.id === pieceId)?.points?.[pointIndex]
      if (!point) return
      delete point.industrialGradeRule
      point.gradeRule = { ...point.gradeRule, enabled: true, ...gradeRuleClipboard }
    })
  }

  const pastePointGradeRuleToAll = (pieceId) => {
    if (!gradeRuleClipboard) return
    mutateProject((next) => {
      const piece = next.pieces.find((item) => item.id === pieceId)
      if (!piece) return
      for (const point of piece.points || []) {
        delete point.industrialGradeRule
        point.gradeRule = { ...point.gradeRule, enabled: true, ...gradeRuleClipboard }
      }
    })
    setCommandResult('Copied X/Y grade increments applied to every point in the selected piece. Undo is available.')
  }

  const resetPieceGradeRules = (pieceId) => {
    mutateProject((next) => {
      const piece = next.pieces.find((item) => item.id === pieceId)
      if (!piece) return
      for (const point of piece.points || []) { delete point.gradeRule; delete point.industrialGradeRule }
    })
    setCommandResult('Selected pattern points restored to automatic grading. Undo is available.')
  }

  const exportPieceGradeRules = () => {
    if (!selectedPiece) return
    try {
      const blob = new Blob([gradeRulesToCsv(selectedPiece)], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${String(project.name || 'garment').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${selectedPiece.id}-grade-rules.csv`
      link.click()
      URL.revokeObjectURL(url)
      setCommandResult(`Exported ${selectedPiece.points.length} point grade rules for ${selectedPiece.name}. Coordinates are centimeters per size.`)
    } catch (error) { setCommandResult(`Grade-rule export failed: ${error.message}`) }
  }

  const exportPieceSizeBreaks = () => {
    if (!selectedPiece) return
    try {
      const blob = new Blob([exportIndustrialGradeCsv(selectedPiece, project.grading)], {type: 'text/csv;charset=utf-8'})
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${String(project.name || 'garment').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${String(selectedPiece.id).replace(/[^a-z0-9-]+/gi, '-')}-industrial-size-breaks.csv`
      link.click()
      URL.revokeObjectURL(url)
      setCommandResult('Exported all authored industrial size breaks for the selected piece. Original pattern unchanged.')
    } catch (error) { setCommandResult(`Industrial grade export rejected: ${error.message}`) }
  }

  const importPieceSizeBreaks = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !selectedPiece) return
    try {
      if (file.size > 1024 * 1024) throw new Error('Size-break CSV must be under 1 MB')
      const source = await file.text()
      const pieceId = selectedPiece.id
      parseIndustrialGradeCsv(source, selectedPiece, project.grading)
      mutateProject(next => {
        const piece = next.pieces.find(p => p.id === pieceId)
        if (!piece) throw new Error('Pattern piece no longer exists')
        const rows = parseIndustrialGradeCsv(source, piece, next.grading)
        for (const {pointIndex, rule} of rows) {
          piece.points[pointIndex].industrialGradeRule = structuredClone(rule)
          delete piece.points[pointIndex].gradeRule
        }
      })
      setCommandResult('Imported validated individual size-break rules. Base geometry unchanged; undo is available. Factory approval still required.')
    } catch (error) { setCommandResult(`Industrial grade import rejected without changes: ${error.message}`) }
  }

  const importPieceGradeRules = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !selectedPiece) return
    try {
      if (file.size > 1024 * 1024) throw new Error('Grade-rule CSV must be under 1 MB')
      const text = await file.text()
      const rules = parseGradeRulesCsv(text, selectedPiece)
      const pieceId = selectedPiece.id
      mutateProject(next => {
        const target = next.pieces.find(piece => piece.id === pieceId)
        if (!target) throw new Error('The selected pattern piece no longer exists')
        // Revalidate within the undo transaction. An asynchronous file read
        // must not apply an old grade table to a newly edited cutline.
        parseGradeRulesCsv(text, target)
        target.points.forEach((point, index) => {
          if (rules[index]) point.gradeRule = { ...rules[index] }
          else delete point.gradeRule
        })
      })
      setCommandResult(`Imported ${rules.length} validated grading rules for ${selectedPiece.name}. Undo is available; base cutlines are unchanged.`)
    } catch (error) { setCommandResult(`Grade-rule import rejected without changes: ${error.message}`) }
  }

  const updateMarkerSetting = (field, value) => {
    mutateProject((next) => {
      next.markerSettings = next.markerSettings || { fabricWidthCm: 150, gapCm: 1.5 }
      next.markerSettings[field] = value
    })
  }

  const updateMarkerFabricWidth = (fabricId, value) => {
    mutateProject((next) => {
      next.markerSettings = next.markerSettings || { fabricWidthCm: 150, gapCm: 1.5 }
      next.markerSettings.fabricWidthsCm = { ...(next.markerSettings.fabricWidthsCm || {}) }
      next.markerSettings.fabricWidthsCm[fabricId] = value
    })
  }

  const updateMarkerFabricPrice = (fabricId, value) => {
    mutateProject((next) => {
      if (!next.fabrics?.[fabricId]) return
      next.fabrics[fabricId].pricePerMeter = value === '' ? null : Math.max(0, Number(value))
    })
  }

  const resetSimulation = () => {
    setRunning(false)
    setHasSimulated(false)
    setArrangementSpread(0)
    setShowSewingGuides(true)
    setResetSignal((value) => value + 1)
    setCommandResult('Flat 3D pattern pieces restored around the avatar; press SIMULATE to drape')
  }

  const requestNativeSolve = async () => {
    setRunning(false)
    setHasSimulated(true)
    setAnalysisMode('surface')
    setNativeSolveStatus('checking')
    try {
      const health = await getNativeServiceHealth()
      if (!health?.ok) throw new Error('Native solver service is unavailable')
      setNativeServiceStatus('ready')
      setNativeSolveStatus('solving')
      setCommandResult('Native XPBD is solving the current garment…')
      setNativeSolveSignal((signal) => signal + 1)
    } catch (error) {
      setNativeServiceStatus('offline')
      setNativeSolveStatus('error')
      setCommandResult(`Native solver unavailable: ${error.message}`)
    }
  }

  const applyNativeQuality = (quality) => {
    const profile = NATIVE_QUALITY_PROFILES[quality] || NATIVE_QUALITY_PROFILES.draft
    mutateProject((next) => {
      next.simulation.nativeQuality = profile.id
      next.simulation.nativeClothModel = profile.clothModel
      next.simulation.nativeBendingModel = profile.bendingModel
    })
    setNativeSolveStatus('idle')
    setCommandResult(`Native XPBD quality set to ${profile.label}`)
  }

  const handleNativeSolve = (event) => {
    if (event.status === 'solving') {
      setNativeSolveStatus('solving')
      setNativeLastSolve(null)
      return
    }
    if (event.status === 'done') {
      const fitStatus = event.fitAssessment?.status || 'UNVERIFIED'
      setNativeSolveStatus(fitStatus === 'FAILED' ? 'unfit' : 'done')
      setNativeLastSolve({ elapsedMs: Number(event.elapsedMs || 0), stats: event.stats || {}, fitAssessment:event.fitAssessment || null, fitTrajectory:event.fitTrajectory || null, payload:event.payload || {} })
      const milliseconds = Number(event.elapsedMs || 0).toFixed(1)
      const seamMm = Number((event.stats?.seamAverageDistance || 0) * 1000).toFixed(1)
      setCommandResult(`Native XPBD numerical solve completed in ${milliseconds} ms · fit ${fitStatus}. Average seam distance ${seamMm} mm; this is not factory or collision-CCD approved.`)
      return
    }
    if (event.status === 'error') {
      setNativeSolveStatus('error')
      setCommandResult(`Native XPBD solve failed: ${event.error}`)
    }
  }

  const exportProject = () => {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'garment'}.garment.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const sendToClothCraft = async (bake = false) => {
    setClothCraftBusy(true)
    setCommandResult('Sending current garment to local ClothCraft Rust tools…')
    try {
      const operation = bake ? 'bake' : 'validate'
      const bridgeUrl = window.location.port === '5486' ? 'http://127.0.0.1:5485' : window.location.port === '5386' ? 'http://127.0.0.1:5385'
        : (import.meta.env.VITE_CLOTHCRAFT_BRIDGE_URL || 'http://127.0.0.1:5193')
      const response = await fetch(`${bridgeUrl}/${operation}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document: project }),
      })
      const result = await response.json()
      if (!response.ok || !result.ok) throw new Error(result.error || 'ClothCraft rejected this document')
      const download = (data, name, type) => {
        const href = URL.createObjectURL(new Blob([data], { type }))
        const anchor = document.createElement('a')
        anchor.href = href
        anchor.download = name
        anchor.click()
        setTimeout(() => URL.revokeObjectURL(href), 1000)
      }
      download(JSON.stringify(result.template, null, 2), `${project.name.replace(/[^\w-]+/g, '-').toLowerCase()}-clothcraft-template.json`, 'application/json')
      if (bake && result.baking?.artifacts?.includes('cloth.obj')) {
        const meshResponse = await fetch(`${bridgeUrl}/artifacts/cloth.obj`)
        if (!meshResponse.ok) throw new Error('ClothCraft baking passed, but the generated OBJ could not be downloaded')
        const obj = await meshResponse.text()
        download(obj, 'clothcraft-baked-geometry.obj', 'text/plain')
        setClothCraftMeshPreview({ obj, garmentName: project.name })
      }
      setCommandResult(`ClothCraft Rust ${bake ? 'bake' : 'validation'} passed: ${result.rustValidation?.panels || result.template.panels.length} panels, ${result.rustValidation?.seams || result.template.seams.length} seams. ${result.warnings.length} export warnings. This is flat garment geometry; body fit is unverified.`)
    } catch (error) {
      setCommandResult(`ClothCraft integration unavailable or rejected project: ${error.message}. Start the local bridge with npm run clothcraft:serve.`)
    } finally {
      setClothCraftBusy(false)
    }
  }

  const runClothCraftOgc = async () => {
    setClothCraftBusy(true)
    setClothCraftContactResult(null)
    setCommandResult('ClothCraft Rust VBD + OGC is testing your garment against the selected body mesh…')
    try {
      const bridgeUrl = window.location.port === '5486' ? 'http://127.0.0.1:5485' : window.location.port === '5386' ? 'http://127.0.0.1:5385'
        : (import.meta.env.VITE_CLOTHCRAFT_BRIDGE_URL || 'http://127.0.0.1:5193')
      const response = await fetch(`${bridgeUrl}/contact-simulate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document: project, avatarModel: project.avatar?.model,
          steps: clothCraftContactSteps }),
      })
      const result = await response.json()
      setClothCraftContactResult(result)
      if (!response.ok || !result.ok) throw new Error(result.error || 'Rust OGC run failed')
      if (!result.artifacts?.cloth || !result.artifacts?.avatar) {
        throw new Error('Rust OGC did not produce the mesh and avatar diagnostic pair')
      }
      const [clothResponse, avatarResponse] = await Promise.all([
        fetch(`${bridgeUrl}${result.artifacts.cloth}`),
        fetch(`${bridgeUrl}${result.artifacts.avatar}`),
      ])
      if (!clothResponse.ok || !avatarResponse.ok) throw new Error('Generated contact mesh could not be fetched')
      const [obj, avatarObj] = await Promise.all([clothResponse.text(), avatarResponse.text()])
      setClothCraftMeshPreview({ obj, avatarObj, diagnostics: result,
        garmentName: project.name, kind: 'ogc' })
      setCommandResult(`ClothCraft Rust OGC: ${result.completedSteps} steps on ${project.avatar.name}. Worst seam gap ${result.maxSeamGapMm.toFixed(1)} mm, contacts ${result.activeContacts}. ${result.reason} Original EXO simulation is unchanged.`)
    } catch (error) {
      setCommandResult(`ClothCraft VBD + OGC unavailable or failed: ${error.message}. EXO simulation remains unchanged.`)
    } finally {
      setClothCraftBusy(false)
    }
  }

  const exportGarmentCode = () => {
    const payload = projectToGarmentCode(project)
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'garment'}-garmentcode.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setCommandResult(`GarmentCode JSON exported with ${Object.keys(payload.pattern.panels).length} panels and ${payload.pattern.stitches.length} stitches`)
  }

  const exportSizeRun = () => {
    const payload = {
      format: 'garment-studio-size-run',
      version: 1,
      sourceProject: project.id,
      sourceRevision: project.revision,
      baseSize: project.grading?.baseSize || 'M',
      rules: project.grading,
      sizes: buildSizeRun(project),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'garment'}-size-run.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const exportDxf = () => {
    if (exportSelectedPatternOnly && !selectedPiece) {
      setCommandResult('Choose a pattern piece in the 2D workspace before exporting selected-pattern DXF.')
      return
    }
    try {
      const exportedProject = exportSelectedPatternOnly
        ? { ...productionProject, pieces: productionProject.pieces.filter((piece) => piece.id === selectedPiece.id) }
        : productionProject
      const dxf = projectToDxf(exportedProject, gradePreviewSize)
      const blob = new Blob([dxf], { type: 'application/dxf' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'garment'}-${gradePreviewSize.toLowerCase()}${exportSelectedPatternOnly ? `-${selectedPiece.id}` : ''}.dxf`
      anchor.click()
      URL.revokeObjectURL(url)
      setCommandResult(`${exportSelectedPatternOnly ? `Selected pattern '${selectedPiece.name}'` : 'All garment patterns'} exported as standard layered DXF in millimeters. AAMA/ASTM conformity has not been independently verified.`)
    } catch (error) {
      setCommandResult(`DXF export blocked: ${error.message}`)
    }
  }

  const exportBomXml = () => {
    const blob = new Blob([projectToBomXml(project)], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'garment'}-bom.xml`
    anchor.click()
    URL.revokeObjectURL(url)
    setCommandResult('BOM XML exported in the open EXO Sample 3D schema (not a proprietary CLO BOM format).')
  }

  const exportMarker = (format) => {
    if (!marker.placements.length) {
      setCommandResult('No marker was exported: no cut patterns fit this fabric width. Adjust the width or pattern geometry.')
      return
    }
    const data = format === 'pdf'
      ? markerToPdf(marker, { size: gradePreviewSize, project: productionProject, calibration: true })
      : markerToSvg(marker, { size: gradePreviewSize, fabricName: project.fabrics?.[marker.fabricId]?.name || marker.fabricId, project: productionProject, calibration: true })
    const blob = new Blob([data], { type: format === 'pdf' ? 'application/pdf' : 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'garment'}-${gradePreviewSize.toLowerCase()}-${marker.fabricId || 'main'}-marker.${format}`
    anchor.click()
    URL.revokeObjectURL(url)
    setCommandResult(`${format.toUpperCase()} DEVELOPMENT PREVIEW marker exported at intended physical 1:1 scale with a 100 mm verification ruler where the page fits. UNVERIFIED: this browser-side export is NOT a Rust-source-verified factory cutting release. ${marker.unusedPieces ? `WARNING: ${marker.unusedPieces} requested cut pieces were NOT placed.` : 'Review scale and cutter compatibility with your factory.'} Print at 100%, then measure the calibration ruler before cutting.`)
  }

  // Explicitly separate a source-verified native Rust production order from
  // the legacy visual marker preview. This is not a cutter authorization.
  const inspectVerifiedNativeProductionSource = async () => {
    try {
      const bridge = import.meta.env.VITE_CLOTHCRAFT_BRIDGE_URL || 'http://127.0.0.1:5193'
      const reply = await fetch(`${bridge}/production/native-verified/v1/source`, {
        method:'POST',headers:{'Content-Type':'application/json'},body:'{}',
      })
      const payload=await reply.json()
      if(!reply.ok||payload.ok!==true||!payload.source)throw Error(payload.code||'Native source not available')
      const source=payload.source
      setCommandResult(`NATIVE VERIFIED ORDER SOURCE INSPECTED: Rust revision ${source.revision}; ${source.sizes.length} sizes and ${source.panels.length} source panels. No production order, marker export, or cutting authorization has been issued. Explicit per-size quantities and fabric declarations must be verified separately.`)
    } catch (error) {
      setCommandResult(`NATIVE PRODUCTION ORDER BLOCKED: ${error.message}. The legacy PDF/SVG marker buttons remain DEVELOPMENT PREVIEW ONLY.`)
    }
  }
  const createVerifiedNativeProductionStudy = async () => {
    try {
      const bridge=import.meta.env.VITE_CLOTHCRAFT_BRIDGE_URL || 'http://127.0.0.1:5193'
      const inspect=await fetch(`${bridge}/production/native-verified/v1/source`,{
        method:'POST',headers:{'Content-Type':'application/json'},body:'{}',
      })
      const inspected=await inspect.json()
      if(!inspect.ok||inspected.ok!==true||!inspected.source)throw Error(inspected.code||'NATIVE_SOURCE_UNAVAILABLE')
      const source=inspected.source
      // Deliberately uses a one-of-each, same-fabric development study only.
      // Operators must use separately approved quantities/materials for manufacturing.
      const quantities=Object.fromEntries(source.sizes.map(size=>[
        size,Object.fromEntries(source.panels.map(panel=>[panel.id,1]))]))
      const materials=Object.fromEntries(source.panels.map(panel=>[
        panel.id,{fabricId:panel.sourceFabricId,groupId:panel.sourceFabricId}]))
      const packet=prepareNativeProductionOrderRequest(source,quantities,materials)
      const response=await fetch(`${bridge}/production/native-verified/v1/order`,{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(packet),
      })
      const answer=await response.json()
      if(!response.ok||answer.ok!==true||!answer.result)throw Error(answer.code||'NATIVE_ORDER_REJECTED')
      const study=summarizeNativeVerifiedOrder(answer.result)
      setCommandResult(`NATIVE VERIFIED DEVELOPMENT STUDY: Rust revision ${study.sourceRevision}; ${study.sizeCount} graded sizes, ${study.placements} CUT placements; each panel quantity is 1 per size. NO factory approval, no cutting authorization and no production PDF/SVG released.`)
    }catch(error){
      setCommandResult(`NATIVE VERIFIED ORDER STUDY BLOCKED: ${error.message}. No factory cutting authorization or production artifact was issued.`)
    }
  }
  const exportVerifiedNativeProductionStudy = async () => {
    try {
      const bridge=import.meta.env.VITE_CLOTHCRAFT_BRIDGE_URL || 'http://127.0.0.1:5193'
      const inspect=await fetch(`${bridge}/production/native-verified/v1/source`,{
        method:'POST',headers:{'Content-Type':'application/json'},body:'{}',
      })
      const inspected=await inspect.json()
      if(!inspect.ok||inspected.ok!==true||!inspected.source)throw Error(inspected.code||'NATIVE_SOURCE_UNAVAILABLE')
      const source=inspected.source
      // Test-only one-per-panel order. Never use UI preview geometry as CUT authority.
      const quantities=Object.fromEntries(source.sizes.map(size=>[
        size,Object.fromEntries(source.panels.map(panel=>[panel.id,1]))]))
      const materials=Object.fromEntries(source.panels.map(panel=>[
        panel.id,{fabricId:panel.sourceFabricId,groupId:panel.sourceFabricId}]))
      const packet=prepareNativeProductionOrderRequest(source,quantities,materials)
      const response=await fetch(`${bridge}/production/native-verified/v1/export`,{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(packet),
      })
      const answer=await response.json()
      if(!response.ok||answer.ok!==true||!answer.result)throw Error(answer.code||'NATIVE_EXPORT_BLOCKED')
      const result=answer.result
      if(result.factoryApproved!==false||result.cuttingAuthorized!==false)throw Error('INVALID_NATIVE_EXPORT_AUTHORIZATION')
      setCommandResult(`NATIVE VERIFIED DEVELOPMENT ARTIFACTS GENERATED for Rust revision ${result.sourceRevision}. Review the source-verified manifest and linked marker studies in the local native bridge output. These remain UNAPPROVED and NOT authorized for physical cutting.`)
    }catch(error){
      setCommandResult(`NATIVE VERIFIED DEVELOPMENT EXPORT BLOCKED: ${error.message}. No physical cutting authorization granted.`)
    }
  }

  const exportMeasurements = () => {
    const csv = measurementRunToCSV(project)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'garment'}-pom-spec.csv`
    anchor.click()
    URL.revokeObjectURL(url)
    setCommandResult('POM measurement spec exported for the full size run')
  }

  const exportTechPack = () => {
    const payload = buildTechPack(project)
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'garment'}-tech-pack.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setCommandResult('Structured tech pack exported with POMs, materials, construction, grading, and marker data')
  }

  const printTraditionalTechPack = (versionId) => {
    // Print the complete embedded factory document directly whenever possible;
    // opening the Editor must not require a separate web page.
    if(!versionId){
      const frame=document.querySelector('.dtp-paper-frame')
      if(frame?.contentWindow){try{frame.contentWindow.focus();frame.contentWindow.print();return}catch{/* fallback below */}}
    }
    const html = buildTraditionalTechPackHTML(project,project.techPackStudio,{versionId})
    const preview=window.open('','_blank')
    if(!preview){setCommandResult('Please allow the printable Tech Pack pop-up, or download the editable JSON from Tech Pack Studio.');return}
    preview.document.open();preview.document.write(html);preview.document.close()
    preview.focus()
    if(preview.document.readyState==='complete')preview.print()
    else preview.addEventListener('load',()=>preview.print(),{once:true})
  }
  const exportDigitalTechPack = () => {
    const payload={format:'exo-digital-tech-pack',schemaVersion:1,projectName:project.name,
      source:buildTechPack(project),studio:project.techPackStudio||null}
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'})
    const url=URL.createObjectURL(blob),anchor=document.createElement('a')
    anchor.href=url;anchor.download=`${(project.name||'garment').toLowerCase().replace(/[^a-z0-9]+/g,'-')}-digital-tech-pack.json`
    anchor.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000)
    setCommandResult('Digital tech pack downloaded with working draft, immutable revision snapshots and local feedback; this does not publish it to a factory.')
  }
  const exportTechPackHTML = (versionId) => {
    const html=buildPortableTechPackHTML(project,project.techPackStudio,{versionId})
    const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}))
    const anchor=document.createElement('a')
    anchor.href=url;anchor.download=`${(project.name||'garment').toLowerCase().replace(/[^a-z0-9]+/g,'-')}-digital-tech-pack${versionId?'-'+versionId:''}.html`
    anchor.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000)
    setCommandResult('Portable HTML tech pack exported. It can be hosted on Vercel as a read-only document. Hosting this file publicly exposes its contained factory specifications; secure collaborative editing requires authenticated backend access.')
  }
  const exportTechPackMarketplaceListing = () => {
    const safeListing=buildMarketplaceTechPackListing(project,project.techPackStudio)
    const url=URL.createObjectURL(new Blob([JSON.stringify(safeListing,null,2)],{type:'application/json'}))
    const anchor=document.createElement('a')
    anchor.href=url;anchor.download='exo-marketplace-tech-pack-listing-draft.json';anchor.click()
    window.setTimeout(()=>URL.revokeObjectURL(url),1000)
    setCommandResult('Created a private Marketplace Hub listing draft. No pattern measurements, supplier information, costs, production PDFs or team discussions were included; no listing was published.')
  }
  const openTechPackStudio=(tab='traditional')=>{
    setTechPackInitialTab(tab)
    setTechPackOpen(true)
  }
  useEffect(()=>{
    if(!techPackWorkspaceOpen||!clothcraftHybrid)return
    const receive=event=>setNativeTechPackSnapshot(event.detail||null)
    window.addEventListener('exo-clothcraft-techpack-snapshot',receive)
    window.dispatchEvent(new Event('exo-clothcraft-techpack-request'))
    return()=>window.removeEventListener('exo-clothcraft-techpack-snapshot',receive)
  },[techPackWorkspaceOpen,clothcraftHybrid,clothcraftLive?.revision])
  useEffect(()=>{
    if(!techPackWorkspaceOpen||!clothcraftHybrid)return
    const key=String(clothcraftLive?.referenceKey||clothcraftLive?.name||'default')
    let active=true
    setNativeTechPackLoading(true)
    setNativeTechPackSaveError('')
    setNativeTechPackDraft(null)
    void loadNativeTechPackWorkspace(key).then(value=>{
      if(!active)return
      if(value){setNativeTechPackDraft(value);return}
      try{setNativeTechPackDraft(JSON.parse(localStorage.getItem(`exo-native-techpack-workspace-v1:${key}`)||'null'))}
      catch{setNativeTechPackDraft(null)}
    }).catch(error=>{
      if(!active)return
      setNativeTechPackSaveError(`Local tech pack storage: ${error.message}`)
      try{setNativeTechPackDraft(JSON.parse(localStorage.getItem(`exo-native-techpack-workspace-v1:${key}`)||'null'))}
      catch{setNativeTechPackDraft(null)}
    }).finally(()=>{if(active)setNativeTechPackLoading(false)})
    return()=>{active=false}
  },[techPackWorkspaceOpen,clothcraftHybrid,clothcraftLive?.referenceKey,clothcraftLive?.name])

  const exportFactoryPackage = () => {
    try {
      const result = downloadAccuMarkGuardedFactoryPackage20261023(project)
      if (!result.ok) throw new Error(result.reason)
      setCommandResult(`Guarded factory ZIP downloaded: ${result.filename}. Size DXFs and physical CUT outlines passed the guarded preflight. External receiver CAD and physical sample approval are still required.`)
    } catch (error) {
      setCommandResult(`Factory package blocked: ${error.message}`)
    }
  }

  const downloadObj = (obj) => {
    const blob = new Blob([obj], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    const size = activeSection === 'Production' ? gradePreviewSize : (project.grading?.baseSize || 'M')
    anchor.download = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'garment'}-${String(size).toLowerCase()}-3d.obj`
    anchor.click()
    URL.revokeObjectURL(url)
    setCommandResult(`3D garment OBJ exported from the current ${running ? 'draped' : 'arranged'} mesh`)
  }

  const requestObjExport = () => setMeshExportSignal((signal) => signal + 1)

  const downloadGlb = (payload) => {
    const contents = payload instanceof ArrayBuffer ? payload : JSON.stringify(payload)
    const blob = new Blob([contents], { type: payload instanceof ArrayBuffer ? 'model/gltf-binary' : 'model/gltf+json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    const size = activeSection === 'Production' ? gradePreviewSize : (project.grading?.baseSize || 'M')
    anchor.download = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'garment'}-${String(size).toLowerCase()}-3d.${payload instanceof ArrayBuffer ? 'glb' : 'gltf'}`
    anchor.click()
    URL.revokeObjectURL(url)
    setCommandResult('3D garment GLB exported with mesh and material data')
  }

  const requestGlbExport = () => setGlbExportSignal((signal) => signal + 1)

  const downloadRenderStill = ({ dataUrl, width, height }) => {
    const anchor = document.createElement('a')
    anchor.href = dataUrl
    anchor.download = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'garment'}-${width}x${height}-render.png`
    anchor.click()
    setCommandResult(`Rendered ${width}×${height} PNG from the current camera and drape`)
  }

  const requestRenderStill = () => setRenderSignal((signal) => signal + 1)

  const importProject = async (event,{manufacturingImport=null}={}) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const source = /\.zip$/i.test(file.name) ? null : await file.text()
      if (/\.zip$/i.test(file.name)) {
        const recovered=recoverFactorySourceFromZip(await file.arrayBuffer())
        // Validation and full source/grade parity run BEFORE mutating undo,
        // currently open garment, or autosaved project state.
        pushUndo(cloneProject(project))
        setProject(recovered.project)
        projectRestoreBlocked = false
        setSelectedPieceId(recovered.project.pieces[0]?.id||null)
        setRunning(false)
        setHasSimulated(false)
        setTool('select')
        setCommandResult(`Restored editable factory source with all ${recovered.verifiedSizes.length} graded sizes and ${recovered.verifiedFiles} SHA-256-verified package files. External manufacturing approval is NOT inferred; previous garment can be restored with Undo.`)
      } else if (/\.(mdl|vet|iba|rul)$/i.test(file.name)) {
        const inspection=inspectModarisNativeIntake20261028({fileName:file.name,bytes:new Uint8Array(await file.arrayBuffer())})
        setCommandResult(inspection.ok
          ? `${inspection.format}: ${inspection.status}. ${inspection.reason} Current garment was NOT changed.`
          : `CAD native intake refused: ${inspection.code}. Current garment was NOT changed.`)
      } else if (/\.dxf$/i.test(file.name)) {
        const imported = parseDxfPatterns(source,manufacturingImport?{manufacturingImport}:{})
        const next = cloneProject(project)
        next.id = uniqueId('project')
        next.name = file.name.replace(/\.dxf$/i, '') || 'Imported DXF'
        next.pieces = imported.pieces
        next.seams = []
        if(imported.manufacturingReference){
          const size=imported.referenceSize
          next.grading={...next.grading,sizes:[size],baseSize:size,widthPerSizeCm:0,lengthPerSizeCm:0}
          next.customMeasurements=[]
          next.topstitches=[]
          next.fasteners=[]
          next.trims=[]
          next.productionSpec=null
          next.patternSource={type:'manufacturing-dxf-reference',fileName:file.name,size,
            referenceOnly:true,profile:imported.referenceMode,factoryCertified:false}
        }
        touchProject(next)
        pushUndo(cloneProject(project))
        setProject(arrangePatternProject(next))
        projectRestoreBlocked = false
        setSelectedPieceId(next.pieces[0]?.id || null)
        setTool('select')
        setRunning(false)
        setCommandResult(imported.manufacturingReference
          ? `Imported ${next.pieces.length} locked, CUT-only manufacturing reference shapes (${imported.referenceSize}). No new seam allowances or grading were inferred. This is NOT an editable factory-approved garment; factory ZIP export is disabled. Use garment-source.json to recover the authored project.`
          : `Imported ${next.pieces.length} closed DXF pattern${next.pieces.length === 1 ? '' : 's'} at ${(imported.scaleToCm * 10).toFixed(2)} mm/unit. Sewing is intentionally left unassigned for review.`)
      } else {
        const parsed = JSON.parse(source)
        if (parsed?.pattern?.panels && Array.isArray(parsed?.pattern?.stitches)) {
          // The broader PyGarment schema can express units, cubic controls and
          // disconnected loops that our narrower editor cannot yet preserve.
          // Reject unsupported imports before touching the active project.
          assertGarmentCodeImportable(parsed)
          const imported = garmentCodeToProject(parsed, createDefaultProject())
          pushUndo(cloneProject(project))
          touchProject(imported)
          setProject(imported)
          projectRestoreBlocked = false
          setSelectedPieceId(imported.pieces[0]?.id || null)
          setSelectedFabricId(Object.keys(imported.fabrics || {})[0] || 'main')
          setMarkerFabricId(Object.keys(imported.fabrics || {})[0] || 'main')
          setRunning(false)
          setResetSignal((signal) => signal + 1)
          setCommandResult(`Imported GarmentCode pattern with ${imported.pieces.length} panels and ${imported.seams.length} stitches`)
        } else {
          validateSavedProject(parsed)
          pushUndo(cloneProject(project))
          touchProject(parsed)
          setProject(parsed)
          projectRestoreBlocked = false
          setSelectedPieceId(parsed.pieces[0]?.id || null)
          setCommandResult(`Loaded ${file.name}`)
        }
      }
    } catch (error) {
      setCommandResult(`Import failed: ${error.message}`)
    } finally {
      event.target.value = ''
    }
  }
  const importSvgPattern=async event=>{
    const file=event.target.files?.[0]
    event.target.value=''
    if(!file)return
    try{
      if(!/\.svg$/i.test(file.name))throw new Error('Choose an SVG exported from Illustrator, Inkscape or vector CAD')
      if(file.size>3*1024*1024)throw new Error('SVG pattern exceeds 3MB')
      const outlines=parseSvgPattern(await file.text(),{fileName:file.name})
      const next=cloneProject(project)
      next.name=file.name.replace(/\.svg$/i,'')||'Imported SVG draft'
      next.pieces=outlines.pieces
      next.seams=[];next.fasteners=[];next.trims=[];next.topstitches=[]
      next.patternSource={type:'svg',fileName:file.name,scaleToCm:outlines.scaleToCm}
      touchProject(next)
      pushUndo(cloneProject(project))
      setProject(arrangePatternProject(next))
      setSelectedPieceId(next.pieces[0]?.id||null)
      setTool('select');setActiveSection('Pattern');setObjectTab('Pattern')
      setViewportLayout('2d');setLayout2DSignal(v=>v+1)
      setRunning(false);setHasSimulated(false)
      setCommandResult(`Imported ${next.pieces.length} editable SVG cutlines from ${file.name} into 2D. Zero seams were created; add or generate sewing separately.`)
    }catch(error){
      setCommandResult(`SVG pattern import refused: ${error.message}`)
    }
  }

  const importSeamlyMeasurements = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      if (!/\.(smis|smms)$/i.test(file.name)) throw new Error('Choose a SeamlyMe .smis or .smms measurement file')
      if (file.size > 2 * 1024 * 1024) throw new Error('Seamly measurement file exceeds the 2 MB safety limit')
      const parsed = parseSeamlyMeasurements(await file.text(), { filename: file.name })
      mutateProject(next => {
        const updated = applySeamlyMeasurements(next, parsed)
        next.measurementLibrary = updated.measurementLibrary
      })
      setCommandResult(`Imported ${parsed.measurementCount} SeamlyMe measurements from ${file.name}. Saved as an editable-project measurement library; no drafting geometry or avatar measurements were changed.`)
    } catch (error) {
      setCommandResult(`SeamlyMe import refused: ${error.message}`)
    }
  }

  const applySeamlyToAvatar = () => {
    const library = project.measurementLibrary?.seamly
    if (!library) return
    mutateProject(next => {
      const updated = applySeamlyMeasurements(next, library, { applyToAvatar: true })
      next.avatar = updated.avatar
    })
    setCommandResult('Applied directly comparable SeamlyMe body circumferences and height to the avatar. Original 2D pattern and sewing remain unchanged; Seamly parametric .sm2d formulas are not yet evaluated.')
  }

  const importSeamlyConstructionGraph = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      if (!/\.sm2d$/i.test(file.name)) throw new Error('Choose a Seamly2D .sm2d drafting construction')
      if (file.size > 4 * 1024 * 1024) throw new Error('Seamly construction graph exceeds the 4 MB safety limit')
      const graph = parseSeamlyConstructionReference(await file.text(), {filename:file.name})
      mutateProject(next => { next.seamlyConstructionReference=graph })
      setCommandResult(`Saved Seamly2D reference ${file.name}: ${graph.toolCount} construction tools in ${graph.blocks.length} blocks, with ${graph.incrementCount} original increment formulas. Current garment pattern and sewing were not changed.`)
    } catch (error) {
      setCommandResult(`Seamly2D construction import refused: ${error.message}`)
    }
  }

  const openSeamlyCalculatedDraft = (file, engine, {editable=false,unit}={}) => {
    try {
      const {project:next,semantic}=createSeamlyAamaExoDraft20261023(project,{file,engine,editable,unit})
      pushUndo(cloneProject(project))
      setProject(next)
      setSelectedPieceId(next.pieces[0]?.id||null)
      setRunning(false);setHasSimulated(false);setTool('select')
      setActiveSection('Pattern');setObjectTab('Pattern');setViewportLayout('2d')
      setLayout2DSignal(value=>value+1)
      setCommandResult(`Opened ${next.pieces.length} upstream Seamly CUT pieces as ${editable?'editable UNAPPROVED draft':'locked references'} in EXO draft workspace. Layer 8 DRAW guides and notches/grainlines preserved in provenance, not duplicated as patterns. Native Rust session is unchanged. Sewing roles, allowance widths and grading remain unapproved; factory export blocked. Undo restores previous draft.`)
    } catch(error){setCommandResult(`Seamly2D 2D import refused: ${error.message}`)}
  }

  const runCommand = (event) => {
    event?.preventDefault?.()
    const raw = command.trim()
    if (!raw) return
    setAraiLastPrompt(raw)
    const intent=interpretAssistantIntent(raw,{
      fabrics:FABRIC_PRESETS,
      stages:listStagePresets(),
      templates:GARMENT_TEMPLATES,
      hangers:HANGER_LIBRARY,
    })
    if(intent){
      const args=intent.args||{}
      switch(intent.action){
        case 'library.open':
          setSidebarView('library');setLibraryVisible(true);setAssetCategory(args.category);setLibraryFolder('all')
          setCommandResult(`Opened the ${args.category} library.`);break
        case 'workspace.view':
          setViewportLayout(args.layout);setCommandResult(`Viewing ${args.layout.toUpperCase()} workspace.`);break
        case 'pattern.importSvg':
          svgPatternInputRef.current?.click()
          setCommandResult('Choose an SVG outline file. Import will add editable 2D patterns without sewing.');break
        case 'pattern.loadOutline':openUnsewnPatternTemplate(args.templateId);break
        case 'fabric.apply':
          activateFabricFromLibrary(args.presetId)
          break
        case 'stage.select':
          updateRenderSetting('stageId',args.stageId);setCommandResult(`Selected stage ${args.stageId}.`);break
        case 'hanger.select':
          updateRenderSetting('hangerPreset',args.hangerId);setCommandResult(`Selected hanger ${args.hangerId}.`);break
        case 'simulation.start':
          if(clothcraftHybrid)rustCommand('toggle-sim')
          else toggleSimulation()
          setCommandResult('Simulation command submitted to the current engine.');break
        case 'simulation.reset':
          if(clothcraftHybrid)rustCommand('reset-position')
          else resetSimulation()
          setCommandResult('Simulation reset requested.');break
        case 'project.save':
          if(clothcraftHybrid)rustCommand('save')
          else saveProject()
          setCommandResult('Save command submitted.');break
        case 'history.undo':
          undoForVisibleEngine();setCommandResult('Undo requested.');break
        case 'history.redo':
          redoForVisibleEngine();setCommandResult('Redo requested.');break
        case 'render.exportStill':
          if(clothcraftHybrid)setCommandResult('Native rendering export is not currently exposed through the assistant. Use the Render panel export.')
          else requestRenderStill()
          break
      }
      setCommand('')
      return
    }
    const lower = raw.toLowerCase()
    const percent = Number(lower.match(/(-?\d+(?:\.\d+)?)\s*%/)?.[1])
    const centimeters = Number(lower.match(/(-?\d+(?:\.\d+)?)\s*(?:cm|centimeter)/)?.[1])

    if ((lower.includes('widen') || lower.includes('wider')) && selectedPiece && Number.isFinite(percent)) {
      mutateProject((next) => {
        const piece = next.pieces.find((item) => item.id === selectedPiece.id)
        const center = piece.points.reduce((sum, point) => sum + point.x, 0) / piece.points.length
        const scale = 1 + percent / 100
        piece.points = piece.points.map((point) => ({ ...point, x: center + (point.x - center) * scale }))
      })
      setCommandResult(`${selectedPiece.name} widened ${percent}%`)
    } else if (lower.includes('crop') && selectedPiece && Number.isFinite(centimeters)) {
      mutateProject((next) => {
        const piece = next.pieces.find((item) => item.id === selectedPiece.id)
        const maxY = Math.max(...piece.points.map((point) => point.y))
        piece.points = piece.points.map((point) => {
          const influence = Math.max(0, 1 - point.y / Math.max(1, maxY * 0.36))
          return { ...point, y: point.y + centimeters * influence }
        })
      })
      setCommandResult(`${selectedPiece.name} cropped approximately ${centimeters} cm from the hem`)
    } else if (lower.includes('seam allowance') && selectedPiece && Number.isFinite(centimeters)) {
      updateSelectedPiece('seamAllowance', clamp(centimeters, 0, 8))
      setCommandResult(`Seam allowance set to ${centimeters} cm`)
    } else if (lower.includes('heavier')) {
      updateFabric('gsm', clamp(fabric.gsm + 40, 40, 900))
      setCommandResult('Fabric weight increased by 40 gsm')
    } else if (lower.includes('lighter')) {
      updateFabric('gsm', clamp(fabric.gsm - 40, 40, 900))
      setCommandResult('Fabric weight reduced by 40 gsm')
    } else if (lower.includes('reset') && lower.includes('sim')) {
      resetSimulation()
    } else if (lower.includes('simulate') || lower.includes('drape')) {
      setHasSimulated(true)
      setArrangementSpread(0)
      setRunning(true)
      setCommandResult('Simulation started')
    } else {
      setCommandResult('I could not match that request to a verified action. Try: show fabrics, import SVG, use Foundation Tee pattern, 2D view, apply Rigid Denim, simulate, undo, or save. Other tools need an explicit capability implementation.')
    }
    setCommand('')
  }

  const estimatedLength = marker.length / 100

  // Menu commands all route through existing editor actions. Unimplemented CLO
  // functionality appears disabled in the menu inventory instead of pretending
  // to modify the garment or running a no-op.
  const executeStudioAction = (action) => {
    setOpenMenu(null)
    setSimulationMenuOpen(false)
    if(['file.techpack','file.techpack.print','file.techpack.references','file.techpack.html','file.techpack.marketplace'].includes(action)){
      enterTechPackWorkspace();return
    }
    // Command search and native AppKit dispatch use this handler too. A draft
    // file converter must never operate on the hidden React document in V2.
    if(clothcraftHybrid&&[
      'file.import.dxf','file.import.svg','file.export.obj','file.export.glb',
      'file.export.dxf','file.export.pdf','file.export.svg',
      'file.export.factory','file.export.bom','render.capture',
    ].includes(action)){
      setCommandResult('This file format or capture is available in the classic drafting workspace. Native Rust export is available through File → Export → Project / garment document.')
      return
    }
    if(action==='file.library'){
      void openFileLibrary()
      return
    }
    if(action==='file.save-as'){
      setFileLibraryStartSave(true)
      void openFileLibrary()
      return
    }
    if(action==='file.info'){
      if(clothcraftHybrid){
        setCommandResult(`Native garment: ${clothcraftLive?.name||'Current project'} · ${clothcraftLive?.panelRefs?.length??clothcraftLive?.panels?.length??'—'} panels. Open File Library to view stored revisions and metadata.`)
      }else{
        setCommandResult(`${project.name}: ${project.pieces.length} patterns · ${project.seams?.length||0} seams · ${Object.keys(project.fabrics||{}).length} fabrics · revision ${project.revision??0}.`)
      }
      return
    }
    if(action.startsWith('file.add.')){
      const categories={garment:'Garment',pattern:'Patterns',avatar:'Avatar',fabric:'Fabric',stage:'Stage'}
      setAssetCategory(categories[action.slice(9)]||'Garment')
      setLibraryFolder('all')
      setSidebarView('library')
      setLibraryVisible(true)
      return
    }
    if(action==='edit.properties'){
      setInspectorVisible(true)
      setShowObjectBrowser(true)
      return
    }
    if(action==='edit.deselect'){
      if(clothcraftHybrid)window.dispatchEvent(new CustomEvent('exo-clothcraft-command',{detail:'select:none'}))
      else setSelectedPieceId(null)
      return
    }
    if(action.startsWith('file.import.')){
      if(action==='file.import.dxf')importInputRef.current?.click()
      if(action==='file.import.svg')svgPatternInputRef.current?.click()
      return
    }
    if(action.startsWith('file.export.')){
      const exporters={
        'file.export.obj':requestObjExport,
        'file.export.glb':requestGlbExport,
        'file.export.dxf':exportDxf,
        'file.export.pdf':()=>exportMarker('pdf'),
        'file.export.svg':()=>exportMarker('svg'),
        'file.export.factory':exportFactoryPackage,
        'file.export.bom':exportBomXml,
      }
      exporters[action]?.()
      return
    }
    if(action==='edit.duplicate'){
      if(clothcraftHybrid)window.dispatchEvent(new CustomEvent('exo-clothcraft-command',{detail:'duplicate-selected'}))
      else duplicateSelectedPiece()
      return
    }
    if(action==='display.background2d'){
      window.dispatchEvent(new CustomEvent('exo-open-2d-background-image',{
        detail:{editor:clothcraftHybrid?'native':'draft',action:'open'},
      }))
      return
    }
    if(['settings.workspace','settings.appearance','settings.profile','settings.preferences','settings.files','settings.plugins'].includes(action)){
      setStudioSettingsTab(({ 'settings.files':'filesApi' })[action]||action.split('.')[1])
      setStudioSettingsOpen(true)
      return
    }
    // The CLO-style menus and macOS native menu must operate on the same Rust
    // document visible in V2. Running legacy mutators here changes a hidden
    // shadow project and makes Save/Undo/Draw appear broken to the user.
    const nativeRoute=clothcraftHybrid?getCloNativeMenuRoute(action):null
    if(nativeRoute){
      if(nativeRoute.type==='command'){
        if(action.startsWith('3d.')){
          const native3dTool={'3d.orbit':'orbit','3d.transform':'transform','3d.move':'move','3d.rotate':'rotate','3d.hand':'hand'}[action]
          if(native3dTool)setViewportTool(native3dTool)
          if(action==='3d.seams')setShowSewingGuides(value=>!value)
        }
        if(action==='2d.add'){setTool('polygon');setActiveSection('Pattern')}
        if(action==='2d.mirror')setActiveSection('Pattern')
        window.dispatchEvent(new CustomEvent('exo-clothcraft-command',{detail:nativeRoute.command}))
      }else if(nativeRoute.type==='tool'){
        setTool(nativeRoute.tool)
        setActiveSection(nativeRoute.section)
        if(action==='sewing.segment'||action==='sewing.free'||action==='sewing.edit'){
          const nativeAction={
            'sewing.segment':'sewing.segmentSew',
            'sewing.free':'sewing.freeSew',
            'sewing.edit':'sewing.editExisting',
          }[action]
          window.dispatchEvent(new CustomEvent('exo-clothcraft-toolbar-activated',{detail:{nativeAction}}))
          window.dispatchEvent(new CustomEvent('exo-clothcraft-command',{detail:action==='sewing.edit'?'mode:edit':'mode:sew'}))
        }
        window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:nativeRoute.tool}}))
      }else if(nativeRoute.type==='fit'){
        setActiveSection('Fit');setAnalysisMode('strain')
      }else if(nativeRoute.type==='analysis'){
        setAnalysisMode(nativeRoute.value)
      }else if(nativeRoute.type==='unsupported'){
        setCommandResult(nativeRoute.reason)
      }
      return
    }
    switch (action) {
      case 'file.new': applyGarmentTemplate(GARMENT_TEMPLATES[0]?.id); break
      case 'file.open': importInputRef.current?.click(); break
      case 'file.save': saveProject(); break
      case 'file.export': exportProject(); break
      case 'edit.undo': undo(); break
      case 'edit.redo': redo(); break
      case 'edit.delete': deleteSelectedPiece(); break
      case '3d.simulate': toggleSimulation(); break
      case '3d.reset': resetSimulation(); break
      case '3d.orbit': setViewportTool('orbit'); break
      case '3d.transform': setViewportTool('transform'); break
      case '3d.move': setViewportTool('move'); break
      case '3d.rotate': setViewportTool('rotate'); break
      case '3d.hand': setViewportTool('hand'); break
      case '3d.camera': setFitCameraSignal(value => value + 1); break
      case '3d.fit': setAnalysisMode('ease'); setActiveSection('Fit'); break
      case '3d.seams': setShowSewingGuides(value => !value); break
      case '2d.select': setActiveSection('Pattern'); setTool('select'); break
      case '2d.points': setActiveSection('Pattern'); setTool('point'); break
      case '2d.split': setActiveSection('Pattern'); setTool('split'); break
      case '2d.curve': setActiveSection('Pattern'); setTool('curve'); break
      case '2d.internal': setActiveSection('Pattern'); setTool('internal'); break
      case '2d.notch': setActiveSection('Pattern'); setTool('notch'); break
      case '2d.pin': setActiveSection('Pattern'); setTool('pin'); break
      case '2d.measure': setActiveSection('Pattern'); setTool('measure'); break
      case '2d.mirror': duplicateSelectedPiece(true); setActiveSection('Pattern'); break
      case '2d.add': addPiece(); setActiveSection('Pattern'); break
      case 'sewing.sew': setActiveSection('Sewing'); setTool('sew'); break
      case 'sewing.inspect': setActiveSection('Sewing'); break
      case 'sewing.fastener': setActiveSection('Sewing'); setTool('fastener'); break
      case 'materials.fabric': setObjectTab('Fabric'); setActiveSection('Fabric'); break
      case 'materials.edit': setActiveSection('Fabric'); break
      case 'materials.add': addFabricSwatch(); setObjectTab('Fabric'); setActiveSection('Fabric'); break
      case 'materials.graphic': graphicInputRef.current?.click(); break
      case 'avatar.library': setAssetCategory('Avatar');setLibraryFolder('all'); setActiveSection('Avatar'); break
      case 'avatar.properties': setActiveSection('Avatar'); break
      case 'avatar.import': avatarMeshInputRef.current?.click(); break
      case 'workspace.production': setActiveSection('Production'); break
      case 'object.scene': setObjectTab('Scene'); setShowObjectBrowser(true); setActiveSection('Pattern'); break
      case 'object.buttons': setObjectTab('Button'); setShowObjectBrowser(true); setActiveSection('Sewing'); break
      case 'object.buttonholes': setObjectTab('Buttonhole'); setShowObjectBrowser(true); setActiveSection('Sewing'); break
      case 'object.topstitch': setObjectTab('Topstitch'); setShowObjectBrowser(true); setActiveSection('Sewing'); break
      case 'object.trim': setObjectTab('Trim'); setShowObjectBrowser(true); setActiveSection('Sewing'); break
      case 'object.grading': setObjectTab('Grading'); setShowObjectBrowser(true); setActiveSection('Production'); break
      case 'object.pom': setObjectTab('POM'); setShowObjectBrowser(true); setActiveSection('Production'); break
      case 'render.workspace': setActiveSection('Render'); break
      case 'render.capture': setRenderSignal(value => value + 1); break
      case 'display.surface': setAnalysisMode('surface'); setWireframe(false); break
      case 'display.wireframe': setWireframe(value => !value); break
      case 'display.strain': setAnalysisMode('strain'); break
      case 'display.grid': setShow2DGrid(value => !value); break
      case 'settings.workspace': setStudioSettingsOpen(true); break
      case 'workspace.profile.patternFocus': applyWorkspaceProfile(WORKSPACE_PROFILES.patternFocus); break
      case 'workspace.profile.drafting': applyWorkspaceProfile(WORKSPACE_PROFILES.drafting); break
      case 'workspace.profile.sewing': applyWorkspaceProfile(WORKSPACE_PROFILES.sewing); break
      case 'workspace.profile.materials': applyWorkspaceProfile(WORKSPACE_PROFILES.materials); break
      case 'workspace.profile.render': applyWorkspaceProfile(WORKSPACE_PROFILES.render); break
      case 'workspace.profile.save': saveCustomWorkspace(); break
      case 'workspace.profile.restore': restoreCustomWorkspace(); break
      case 'workspace.view.split': setViewportLayout('split'); break
      case 'workspace.view.stack': setViewportLayout('stack'); break
      case 'workspace.view.2d': setViewportLayout('2d'); break
      case 'workspace.view.3d': setViewportLayout('3d'); break
      case 'workspace.view.reset': setViewportLayout('split'); setViewportSplit(50); break
      case 'workspace.panel.objects': setShowObjectBrowser(value => !value); break
      case 'workspace.panel.toggle-library': setLibraryVisible(value => !value); break
      case 'workspace.panel.toggle-inspector': setInspectorVisible(value => !value); break
      case 'workspace.panel.library': setSidebarView('library'); break
      case 'workspace.panel.history': setSidebarView('history'); break
      case 'settings.top-tabs': setShowTopWorkspaceTabs(value => !value); break
      case 'settings.simulation': setActiveSection('Fit'); break
      case 'help.reference': setCommandResult('CLO-style controls: use the icon tooltips; unfinished tools are labeled planned. The editor remains an independent garment simulator.'); break
      case 'help.shortcuts': setCommandResult('SPACE simulate/pause · ⌘S save · ⌘Z undo · 3D: Q select/orbit, W move, E rotate, H fabric hand, V sewing guides, T combined gizmo, G/R aliases; arrows nudge panels (Ctrl+↑/↓ depth). 2D: A select/transform, Z edit points, P pin, arrows move selected pattern 1 cm, F fit, Shift+F focus. Some CLO commands remain unimplemented.'); break
      default: break
    }
  }

  // The macOS native shell sends the same actions from its actual menu bar.
  const actionRef = useRef(executeStudioAction)
  actionRef.current = executeStudioAction
  useEffect(() => {
    const onNativeMenu = (event) => actionRef.current?.(event.detail)
    window.addEventListener('garment-studio-native-action', onNativeMenu)
    return () => window.removeEventListener('garment-studio-native-action', onNativeMenu)
  }, [])

  const libraryItemMatches = (name) => name.toLowerCase().includes(librarySearch.trim().toLowerCase())
  const rustCommand = (command) => window.dispatchEvent(new CustomEvent('exo-clothcraft-command', {detail: command}))
  const simForVisibleEngine = () => clothcraftHybrid ? rustCommand('toggle-sim') : toggleSimulation()
  const resetForVisibleEngine = () => clothcraftHybrid ? rustCommand('reset') : resetSimulation()
  const saveForVisibleEngine = () => clothcraftHybrid ? rustCommand('save') : saveProject()
  const exportForVisibleEngine = () => clothcraftHybrid ? rustCommand('export') : exportProject()
  const undoForVisibleEngine = () => clothcraftHybrid ? rustCommand('undo') : undo()
  const redoForVisibleEngine = () => clothcraftHybrid ? rustCommand('redo') : redo()
  const runCustomToolbarAction = id => {
    if(id==='exo:add-anchor-point'){setTool('split');setActiveSection('Pattern');window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'split'}}));return}
    if(id==='exo:grade-nest-xs-xxl'){
      if(clothcraftHybrid){
        // The saved Liquid Glass button must control the actual Rust-backed
        // 2D grading overlay, not the unrelated legacy PatternEditor state.
        window.dispatchEvent(new CustomEvent('exo-clothcraft-pattern-studio-command',{detail:{command:'toggle-native-nest'}}))
      }else setShowGradeNest(value=>!value)
      return
    }
    if(typeof id==='string'&&id.startsWith('modaris:')){
      const route=getModarisExoRoute20261028(id)
      if(!route){
        setCommandResult(`${id}: this Modaris catalog command has no verified EXO implementation yet. It can be saved to custom toolbars as a reference.`)
        return
      }
      const readiness=checkModarisToolbarPreconditions20261028(route,{
        nativeMode:clothcraftHybrid,full2D:viewportLayout==='2d',session:clothcraftLive,
      })
      if(!readiness.ok){setCommandResult(readiness.reason);return}
      if(route.kind==='layout'){
        setViewportLayout(route.action)
        setCommandResult(`${route.tool.label}: switched to EXO ${route.action.toUpperCase()} layout.`)
        return
      }
      if(route.kind==='settings'){
        setStudioSettingsTab(route.action)
        setStudioSettingsOpen(true)
        return
      }
      if(route.kind==='panel'){
        setShowObjectBrowser(true)
        setInspectorVisible(true)
        return
      }
      if(route.kind==='app'){
        if(['select','point','grid'].includes(route.action)){runCustomToolbarAction(route.action);return}
        if(route.action==='simulate')simForVisibleEngine()
        else if(route.action==='undo')undoForVisibleEngine()
        else if(route.action==='redo')redoForVisibleEngine()
        else if(route.action==='save')saveForVisibleEngine()
        else if(route.action==='export')exportForVisibleEngine()
        return
      }
      if(route.kind==='native')rustCommand(route.action)
      else if(route.kind==='canvas'){
        setTool(route.action)
        rustCommand('mode:edit')
        window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:route.action}}))
      }
      else if(route.kind==='studio')window.dispatchEvent(new CustomEvent('exo-clothcraft-pattern-studio-command',{detail:{command:route.action}}))
      else if(route.kind==='f7-size')window.dispatchEvent(new CustomEvent('exo-clothcraft-pattern-studio-command',{detail:{command:'f7-size-evolution',action:route.action}}))
      else if(route.kind==='grade24')window.dispatchEvent(new CustomEvent('exo-clothcraft-pattern-studio-command',{detail:{command:'custom-grade-tool',toolId:route.action}}))
      else if(route.kind==='tool')window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:route.action}}))
      setCommandResult(`${route.tool.label}: sent the EXO command. Check the native tool's result and prerequisites before treating the operation as complete.`)
      return
    }
    if(typeof id==='string'&&id.startsWith('grade24:')){window.dispatchEvent(new CustomEvent('exo-clothcraft-pattern-studio-command',{detail:{command:'custom-grade-tool',toolId:id.slice(8)}}));return}
    if(id==='foam-padding'){
      setActiveSection('Pattern')
      if(clothcraftHybrid)window.dispatchEvent(new Event('exo-clothcraft-open-foam-padding'))
      else requestAnimationFrame(()=>document.querySelector('[aria-label="Foam padding and trapunto tool"]')?.scrollIntoView({block:'nearest',behavior:'smooth'}))
      return
    }
    if(id==='zipper'||id==='trim'){
      setObjectTab(id==='zipper'?'Zipper':'Trim')
      setShowObjectBrowser(true)
      setInspectorVisible(true)
      setActiveSection('Sewing')
      return
    }
    if(id==='simulate'){simForVisibleEngine();return}
    if(id==='reset'){resetForVisibleEngine();return}
    if(id==='save'){saveForVisibleEngine();return}
    if(id==='grid'){setShow2DGrid(value=>!value);return}
    if(id==='seams'){setShowSewingGuides(value=>!value);return}
    if(id==='library'){setLibraryVisible(value=>!value);return}
    if(id==='properties'){setInspectorVisible(value=>!value);return}
    if(id==='fit'){
      if(clothcraftHybrid)window.dispatchEvent(new Event('exo-clothcraft-fit-camera'))
      else setFitCameraSignal(value=>value+1)
      return
    }
    if(id==='move3d'||id==='rotate3d'){
      setViewportTool(id==='move3d'?'move':'rotate')
      if(clothcraftHybrid)rustCommand(id==='move3d'?'mode:move3d':'mode:rotate3d')
      return
    }
    if(!['select','point','sew'].includes(id))return
    setTool(id)
    setActiveSection(id==='sew'?'Sewing':'Pattern')
    if(clothcraftHybrid){
      rustCommand(id==='sew'?'mode:sew':'mode:edit')
      window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:id==='point'?'point':id==='sew'?'sew':'select'}}))
    }
  }
  useEffect(()=>{if(clothcraftHybrid)rustCommand(`analysis:${analysisMode==='strain'?'strain':'surface'}`)},[clothcraftHybrid,analysisMode])
  const visibleRunning = clothcraftHybrid ? Boolean(clothcraftLive?.running) : running
  const clo7ThreeDHandlers={
    simulate:simForVisibleEngine,
    transform:()=>setViewportTool('transform'),
    'mesh-select':()=>{setViewportTool('mesh-select');setWireframe(true)},
    pin:()=>setTool('pin'),
    seams:()=>setShowSewingGuides(value=>!value),
    'avatar-panel':()=>setActiveSection('Avatar'),
    'fabric-panel':()=>{setActiveSection('Fabric');setObjectTab('Fabric');setShowObjectBrowser(true)},
    'material-panel':()=>{setActiveSection('Fabric');setObjectTab('Fabric');setShowObjectBrowser(true)},
    'buttons-panel':()=>{setActiveSection('Sewing');setObjectTab('Button');setShowObjectBrowser(true)},
    'trim-panel':()=>{setActiveSection('Sewing');setObjectTab('Trim');setShowObjectBrowser(true)},
    fastener:()=>setTool('fastener'),
  }
  const enabledClo3D = slot => clothcraftHybrid ? getClo7NativeCapability('3d',slot.id)?.mode==='native' : Boolean(slot.action && clo7ThreeDHandlers[slot.action] &&
    (!clothcraftHybrid || !['mesh-select','pin','fastener'].includes(slot.action)))
  // The reference strip is a stable physical tool map: filtering out
  // unavailable buttons collapses rows and makes entire CLO tool families
  // appear missing. Keep all observed positions in the original order;
  // execution eligibility is controlled by the individual capability.
  const draftHardwareForCloSlot=slotId=>({
    '3d:B11':'button',
    '3d:B13':'zipper',
    '3d:B17':'binding',
    '2d:B11':'topstitch',
  })[slotId]||null
  const createCloDraftHardware=(slot,dimension)=>{
    const kind=draftHardwareForCloSlot(`${dimension}:${slot.id}`)
    if(clothcraftHybrid||!selectedPiece||!kind)return
    try{
      let result
      mutateProject(next=>{
        result=applyDraftHardwareAction(next,{
          kind,pieceId:selectedPiece.id,edgeIndex:trimEdgeIndex,
        })
      })
      setCommandResult(`${result.kind} saved on ${selectedPiece.name} as EXO draft construction. Undo is available; native Rust fabric/constraints were not modified.`)
      setActiveSection('Sewing')
    }catch(error){setCommandResult(`EXO draft construction refused: ${error.message}`)}
  }
  const editValidatedDraftHardware=(kind,pieceId,operation,itemId,options={})=>{
    try{
      let result
      mutateProject(next=>{
        result=applyDraftHardwareAction(next,{kind,pieceId,operation,itemId,...options})
      })
      setCommandResult(`${kind} ${operation === 'remove' ? 'removed' : operation === 'update' ? 'updated' : 'placed'} · ${result.id}`)
      return result
    }catch(error){
      setCommandResult(`Hardware edit refused: ${error.message}`)
      return null
    }
  }
  const activateCloTool = (slot,dimension) => {
    if(dimension==='2d'&&(slot.id==='B04'||slot.id==='B05')){
      const widget=slot.id==='B04'?'sewing':'steam'
      if(clothcraftHybrid)window.dispatchEvent(new CustomEvent('exo-clothcraft-toolbar-activated',{detail:{nativeAction:null}}))
      setActiveFinishingTool(widget)
      setTool(widget==='sewing'?'seam-measure':'steam-preview')
      if(clothcraftHybrid){
        // The movable tool-specific widget owns these controls; do not take
        // over the Object Browser or create an unrelated bottom inspector.
        rustCommand('mode:edit')
        window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'select'}}))
        window.dispatchEvent(new CustomEvent('exo-clothcraft-3d-tool',{detail:{tool:'off'}}))
        setViewportTool(current=>current==='mesh-select'?'orbit':current)
      }
      if(widget==='sewing'){
        if(!clothcraftHybrid&&project.seams?.length){
          setSeamWalkId(current=>current||project.seams[0].id)
        }
      }
      return
    }
    setActiveFinishingTool(null)
    const capability=getClo7NativeCapability(dimension,slot.id)
    // A toolbar click activates the actual tool immediately. The old
    // information-card/Run intermediary obstructed sewing and pattern editing.
    // Unsupported commands remain explicitly non-operational and unobtrusive.
    if(!capability||capability.mode==='unavailable'){
      if(clothcraftHybrid){
        window.dispatchEvent(new CustomEvent('exo-clothcraft-toolbar-activated',{detail:{nativeAction:null}}))
        window.dispatchEvent(new CustomEvent('exo-clothcraft-3d-tool',{detail:{tool:'off'}}))
        setTool(current=>['mesh-select','garment-measure','garment-measure-edit','avatar-measure','avatar-measure-edit','line-3d'].includes(current)?'select':current)
        setViewportTool(current=>current==='mesh-select'?'orbit':current)
      }
      setCommandResult(`${slot.label}: ${capability?.reason||'No native implementation is available yet.'}`)
      return
    }
    if(clothcraftHybrid && !(dimension==='3d'&&slot.id==='A03'))
      setTool(current=>['mesh-select','garment-measure','garment-measure-edit','avatar-measure','avatar-measure-edit','line-3d'].includes(current)?'select':current)
    // Tool-only actions retain their own canvas cursor. Inspector and popup
    // actions release a previous drawing cursor as they are activated.
    if(clothcraftHybrid&&dimension==='2d'&&!new Set([
      'A01','A02','A04','A05','A08','A09','A11','A12','A13','A14','A15','B02','B03',
    ]).has(slot.id)){
      window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'select'}}))
    }
    // Switching tool families dismisses a previous native construction form.
    if(clothcraftHybrid && capability?.mode==='native')window.dispatchEvent(new CustomEvent('exo-clothcraft-toolbar-activated',{
      detail:{nativeAction:capability?.nativeAction||null}
    }))
    // A transient 3D mesh-brush selection must not keep intercepting pointer
    // events after the user picks another CLO 3D or 2D editing tool.
    if(clothcraftHybrid && !(dimension==='3d'&&slot.id==='A03')){
      window.dispatchEvent(new CustomEvent('exo-clothcraft-3d-tool',{detail:{tool:'off'}}))
      setViewportTool(current=>current==='mesh-select'?'orbit':current)
    }
    // The tool strip is the control surface. Unavailable reference positions
    // stay disabled; working actions and inspector navigation run in place.
    if(!clothcraftHybrid){
      if(draftHardwareForCloSlot(`${dimension}:${slot.id}`)&&selectedPiece){
        createCloDraftHardware(slot,dimension)
        return
      }
      if(dimension==='3d'&&enabledClo3D(slot))clo7ThreeDHandlers[slot.action]?.()
      else if(dimension==='2d'){
        const action={select:'select',point:'point',internal:'internal',sew:'sew'}[slot.action]
        if(action){setTool(action);setActiveSection(action==='sew'?'Sewing':'Pattern')}
        else if(slot.action==='create-polygon')addPolygonPiece()
      }
      return
    }
    // Trigger real native V2 actions only; a CLO reference slot is never
    // silently redirected to a cosmetically similar unrelated tool.
    switch(capability?.nativeAction){
      case 'simulation.toggle':simForVisibleEngine();break
      case 'viewport3d.selectMove':
        setViewportTool('transform');rustCommand('mode:move3d');break
      case 'dimensions.measureAvatar':
      case 'dimensions.measureAvatarEdit':
        setTool(capability.nativeAction==='dimensions.measureAvatar'?'avatar-measure':'avatar-measure-edit');
        setViewportTool('orbit');rustCommand('mode:edit');
        window.dispatchEvent(new CustomEvent('exo-clothcraft-3d-tool',{detail:{tool:capability.nativeAction==='dimensions.measureAvatar'?'avatar-measure':'avatar-measure-edit'}}));break
      case 'dimensions.measureGarment':
      case 'dimensions.measureGarmentEdit':
        setTool(capability.nativeAction==='dimensions.measureGarment'?'garment-measure':'garment-measure-edit');
        setViewportTool('orbit');rustCommand('mode:edit');
        window.dispatchEvent(new CustomEvent('exo-clothcraft-3d-tool',{detail:{tool:capability.nativeAction==='dimensions.measureGarment'?'garment-measure':'garment-measure-edit'}}));break
      case 'pattern3d.drawInternalLine':
        setTool('line-3d');setViewportTool('orbit');rustCommand('mode:edit');
        window.dispatchEvent(new CustomEvent('exo-clothcraft-3d-tool',{detail:{tool:'line-3d'}}));break
      case 'sewing.editExisting':
        // Edit Sewing is a direct picking tool, like Segment/Free Sewing.
        // Do NOT switch the inspector to Sewing: that opens a bottom editor.
        setTool('seam-edit');rustCommand('mode:edit');
        window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'seam-edit'}}));
        break
      case 'arrangement.reset2d':rustCommand('reset-2d');break
      case 'simulation.redrape':rustCommand('redrape');break
      case 'arrangement.reset3d':
        resetForVisibleEngine();break
      case 'pattern2d.selectTransform':
        setTool('select');rustCommand('mode:edit');
        window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'select'}}));break
      case 'pattern2d.editPoints':
        setTool('point');rustCommand('mode:edit');
        window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'point'}}));break
      case 'pattern2d.fullnessRuffle':
        setTool('fullness');rustCommand('mode:edit');break
      case 'pattern2d.pleatGuides':
        // Pleat guides are placed by clicking the fabric with the tool cursor.
        // No Property Editor takeover or bottom parameter dialog is needed.
        setTool('pleat-guides');rustCommand('mode:edit');
        window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'pleat'}}));break
      case 'pattern2d.drawPolygon':
        setTool('polygon');rustCommand('mode:pen');break
      case 'pattern2d.basePolygon':
        setTool('base-polygon');rustCommand('tool:base-polygon');break
      case 'pattern2d.traceContour':
        // Trace produces an independent Rust polygon with the exact authored
        // straight contour/fabric, never a visual duplicate or a fake CLO
        // shortcut. The native workspace owns selection and revision.
        setTool('trace');rustCommand('trace-selected');break
      case 'pattern2d.addAnnotation':
        setTool('annotation');rustCommand('mode:edit');
        window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'annotation'}}));break
      case 'pattern2d.editAnnotation':
        setTool('annotation-edit');rustCommand('mode:edit');
        window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'editAnnotation'}}));break
      case 'viewport3d.meshBrushSelect':
        setTool('mesh-select');setViewportTool('mesh-select');rustCommand('mode:edit');
        window.dispatchEvent(new CustomEvent('exo-clothcraft-3d-tool',{detail:{tool:'mesh-brush'}}));break
      case 'pattern2d.drawInternalLine':
        // Internal geometry is drawn inside the selected pattern directly.
        // Selecting this tool must not replace the object/property inspector.
        setTool('internal');rustCommand('mode:line');
        window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'internal'}}));break
      case 'pattern2d.placeNotch':
        setTool('notch');rustCommand('mode:edit');
        window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'notch'}}));break
      case 'pattern2d.setSeamAllowanceGuide':
        setTool('allowance');rustCommand('mode:edit');
        window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'allowance'}}));break
      case 'sewing.segmentSew':
      case 'sewing.freeSew':
        setTool(capability.nativeAction==='sewing.segmentSew'?'segment-sew':'free-sew');rustCommand('mode:sew');
        window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'sew'}}));break
      case 'pattern2d.fillPanel':
        // Configuration uses the same centered floating panel as Steam.
        setTool('fill-panel');
        rustCommand('mode:edit');break
      case 'pattern2d.editGrading':
      case 'pattern2d.autoGrading':
        setTool(capability.nativeAction==='pattern2d.editGrading'?'grading-edit':'grading-auto');
        rustCommand('mode:edit');break
      case 'pattern2d.walkSeam':
        setTool('walk-seam');
        rustCommand('mode:edit');break
      default:
        // Toolbar tools never navigate or replace the Property Editor.
        if(capability?.inspectionAction==='sewing.inspectSeams'){
          setTool('seam-measure')
        }
        if(capability?.inspectionAction==='dimensions.measureTemporary'){
          rustCommand('mode:edit');
          setTool(slot.id==='A11'?'measure-edit':'measure')
          window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:slot.id==='A11'?'measure-edit':'measure'}}))
        }
    }
  }
  useEffect(() => {
    if (!clothcraftHybrid) return undefined
    const onStatus = event => {
      setClothcraftLive(event.detail)
      if(typeof event.detail?.showGraphicMeasurements==='boolean')setGraphicMeasurementsVisible(event.detail.showGraphicMeasurements)
      const mode={edit:'orbit',move3d:'move',rotate3d:'rotate',stretch3d:'hand'}[event.detail?.mode]
      if(mode)setViewportTool(current=>current==='mesh-select'&&mode==='orbit'?current:mode)
    }
    window.addEventListener('exo-clothcraft-status', onStatus)
    return () => window.removeEventListener('exo-clothcraft-status', onStatus)
  }, [clothcraftHybrid])
  useEffect(()=>{
    if(!clothcraftHybrid){setFoamPropertySelection(null);return undefined}
    const select=event=>{
      const pad=event.detail?.pad
      setFoamPropertySelection(pad||null)
      if(pad){
        setEnvironmentSelection(null)
        setSelectedObjectForProperties(null)
        setActiveSection('Pattern')
        if(viewportLayout!=='2d'&&!patternFocusActive)setInspectorVisible(true)
      }
    }
    window.addEventListener('exo-clothcraft-foam-selection',select)
    return()=>window.removeEventListener('exo-clothcraft-foam-selection',select)
  },[clothcraftHybrid,viewportLayout,patternFocusActive])
  useEffect(()=>{
    if(!clothcraftHybrid)return undefined
    // Viewport selection supersedes any older Fabric/Trim/Object Browser
    // context, even when the user reselects the same physical edge.
    const onNativePick=event=>{setFoamPropertySelection(null);setSelectedObjectForProperties(null);setObjectTab('Scene');setActiveSection(event.detail?.avatar?'Avatar':event.detail?.kind==='sewing'?'Sewing':'Pattern')}
    window.addEventListener('exo-clothcraft-native-pick',onNativePick)
    return()=>window.removeEventListener('exo-clothcraft-native-pick',onNativePick)
  },[clothcraftHybrid])
  useEffect(()=>{
    if(!clothcraftHybrid)return undefined
    const selectFabric=event=>{
      const id=event.detail?.id
      if(typeof id!=='string')return
      const ref=clothcraftLive?.fabricRefs?.find(f=>f.id===id)
      if(!ref)return
      setSelectedObjectForProperties({...ref,source:'native',type:'fabric'})
      setObjectTab('Fabric')
      setActiveSection('Fabric')
      setShowObjectBrowser(true)
    }
    window.addEventListener('exo-clothcraft-select-fabric',selectFabric)
    return()=>window.removeEventListener('exo-clothcraft-select-fabric',selectFabric)
  },[clothcraftHybrid,clothcraftLive?.fabricRefs])
  useEffect(() => {
    if (!clothcraftHybrid) return
    rustCommand(`set-wireframe:${wireframe}`)
  }, [clothcraftHybrid,wireframe])
  useEffect(() => {
    if (!clothcraftHybrid) return
    rustCommand(`set-seams:${showSewingGuides}`)
  }, [clothcraftHybrid,showSewingGuides])
  useEffect(() => {
    if (!clothcraftHybrid) return
    const modes={select:'edit',point:'edit',curve:'edit',sew:'sew',internal:'line'}
    if (modes[tool]) rustCommand(`mode:${modes[tool]}`)
  }, [clothcraftHybrid,tool])
  useEffect(() => {
    if (!clothcraftHybrid) return
    const modes={orbit:'edit',transform:'move3d',move:'move3d',rotate:'rotate3d',hand:'stretch3d'}
    if (modes[viewportTool]) rustCommand(`mode:${modes[viewportTool]}`)
  }, [clothcraftHybrid,viewportTool])
  useEffect(() => {
    if (!clothcraftHybrid||!selectedPieceId) return
    rustCommand(`select:${selectedPieceId}`)
  }, [clothcraftHybrid,selectedPieceId,clothcraftLive?.name])

  // Same-page automation covers interface features that live outside the
  // native Rust agent: themes, scene presets, the File Library and catalogs.
  // A queued, allowlisted event protocol accepts no arbitrary JavaScript or
  // shell commands and always uses the same UI state transitions as clicks.
  const automationFail=(code,message)=>{throw Object.assign(new Error(message),{code})}
  const requiresString=(value,key)=>{
    if(typeof value!=='string'||!value.trim()||value.length>180)automationFail('INVALID_ARGUMENTS',`${key} must be a nonempty string`)
    return value.trim()
  }
  appAutomationHandlersRef.current={
    'app.capabilities':()=>({version:1,scope:'current browser tab',actions:APP_AUTOMATION_ACTIONS}),
    'app.status':()=>({engine:clothcraftHybrid?'native':'legacy',project:clothcraftHybrid?clothcraftLive?.name||null:project.name,
      revision:clothcraftHybrid?clothcraftLive?.revision??null:project.revision,
      section:activeSection,viewport:viewportLayout,activeTool:tool,libraryOpen:fileLibraryOpen,
      nativeReady:clothcraftHybrid?Boolean(clothcraftLive):null}),
    'app.project.summary':()=>clothcraftHybrid
      ?{engine:'native',name:clothcraftLive?.name||null,revision:clothcraftLive?.revision??null,
        panels:clothcraftLive?.panelRefs?.map(panel=>({id:panel.id,name:panel.name,fabric:panel.fabric}))||[],
        seams:clothcraftLive?.seamRefs?.length||0,fabrics:clothcraftLive?.fabricRefs?.map(f=>({id:f.id,name:f.name}))||[],
        graphics:clothcraftLive?.graphicRefs?.length||0,running:Boolean(clothcraftLive?.running)}
      :{engine:'legacy',name:project.name,revision:project.revision,pieces:project.pieces?.map(piece=>({id:piece.id,name:piece.name}))||[],
        seams:project.seams?.length||0,fabrics:Object.keys(project.fabrics||{}),renderStage:project.render?.stageId||'none'},
    'app.project.save':async()=>{
      if(clothcraftHybrid){const result=await requestNativeLibraryProject('capture');return{saved:true,engine:'native',name:result.name}}
      writeSavedProject(localStorage,STORAGE_KEY,BACKUP_STORAGE_KEY,project)
      setSaveState('saved')
      return{saved:true,engine:'legacy',name:project.name,revision:project.revision}
    },
    'app.library.open':async()=>{await openFileLibrary();return{opened:true}},
    'app.library.list':async()=>{
      const records=await listLibraryProjects()
      return{entries:records.map(({id,name,status,category,collection,currentVersion,updatedAt,createdAt})=>({id,name,status,category,collectionId:collection,currentVersion,updatedAt,createdAt}))}
    },
    'app.library.collections.list':async()=>({collections:await listLibraryCollections()}),
    'app.library.collections.create':async({name})=>{
      const label=requiresString(name,'name')
      const saved=await createLibraryCollection({name:label})
      await refreshFileLibrary()
      return{id:saved.id,name:saved.name}
    },
    'app.library.capture':async({name,status='working',category='garment',collectionId='',notes=''})=>{
      const label=requiresString(name,'name')
      if(!['working','development','sample','finished','base-pattern'].includes(status))automationFail('INVALID_ARGUMENTS','Unknown project status')
      if(!['garment','pattern','fabric','hardware','button','zipper','trim','studio-set','techpack','other'].includes(category))automationFail('INVALID_ARGUMENTS','Unknown project category')
      if(typeof notes!=='string'||notes.length>3000)automationFail('INVALID_ARGUMENTS','Project notes exceed 3000 characters')
      if(typeof collectionId!=='string')automationFail('INVALID_ARGUMENTS','Invalid collection ID')
      const saved=await archiveCurrentProject({name:label,status,category,collectionId,notes})
      return{id:saved.id,name:saved.name,status:saved.status,engine:saved.snapshotFormat}
    },
    'app.library.project.open':async({id})=>{
      const identifier=requiresString(id,'id')
      const saved=await getLibraryProject(identifier)
      if(!saved)automationFail('NOT_FOUND','Saved library project not found')
      const opened=await openSavedFileRecord(saved)
      if(!opened)automationFail('OPEN_FAILED','Library editor could not open the selected project')
      return{opened:true,id:identifier,name:saved.name}
    },
    'app.assets.list':({category})=>{
      if(category==='studioSets')return{assets:listStagePresets().map(item=>({id:item.id,name:item.name,kind:item.kind}))}
      if(category==='hardware')return{assets:listHardwarePresets().map(item=>({id:item.id,name:item.name,kind:item.kind}))}
      if(category==='fabrics')return{assets:Object.entries(FABRIC_PRESETS).map(([id,item])=>({id,name:item.name||id}))}
      if(category==='garments')return{assets:GARMENT_TEMPLATES.map(item=>({id:item.id,name:item.name}))}
      return automationFail('INVALID_ARGUMENTS','category must be garments, fabrics, hardware or studioSets')
    },
    'app.appearance.get':()=>({theme:studioCustomization.appearance.theme,panelFinish:studioCustomization.appearance.panelFinish,
      liquidGlass:studioCustomization.appearance.liquidGlass,workspace:{viewportLayout:studioCustomization.workspace.viewportLayout,
        libraryWidth:studioCustomization.workspace.libraryWidth,inspectorWidth:studioCustomization.workspace.inspectorWidth}}),
    'app.appearance.setTheme':({theme})=>{
      if(!STUDIO_THEME_IDS.has(theme))automationFail('INVALID_ARGUMENTS','Unknown installed color theme')
      updateStudioCustomization({...studioCustomization,appearance:{...studioCustomization.appearance,theme}})
      return{theme,applied:true}
    },
    'app.workspace.setLayout':({layout})=>{
      if(!['split','stack','3d','2d'].includes(layout))automationFail('INVALID_ARGUMENTS','Layout must be split, stack, 3d or 2d')
      updateStudioCustomization({...studioCustomization,workspace:{...studioCustomization.workspace,viewportLayout:layout}})
      return{layout,applied:true}
    },
    'app.scene.setStage':({id})=>{
      if(!['none',...listStagePresets().map(stage=>stage.id)].includes(id))automationFail('INVALID_ARGUMENTS','Unknown installed studio stage')
      updateRenderSetting('stageId',id)
      return{stage:id,applied:true}
    },
  }
  useEffect(()=>installAppAutomation(()=>appAutomationHandlersRef.current),[])

  const togglePatternGradingStudio=()=>{
    if(!patternFocusActive){
      patternFocusReturnRef.current={layout:viewportLayout,section:activeSection}
      setViewportLayout('2d');setActiveSection('Production');setObjectTab('Grading');setShowObjectBrowser(true);setInspectorVisible(false);setLeftToolsCollapsed(false);setRightToolsCollapsed(false);setPatternFocusActive(true)
      if(!document.fullscreenElement)document.documentElement.requestFullscreen?.().catch(()=>{})
    }else{
      setPatternFocusActive(false)
      setViewportLayout(patternFocusReturnRef.current?.layout||'split')
      setActiveSection(patternFocusReturnRef.current?.section||'Pattern')
      if(document.fullscreenElement===document.documentElement)document.exitFullscreen?.().catch(()=>{})
    }
  }
  return (
    <div id="exo-pattern-glass-shell" className={`app-shell ${showTopWorkspaceTabs ? '' : 'workspace-tabs-hidden'} ${clothcraftHybrid ? 'exo-v2-shell' : ''} ${patternFocusActive&&!clothcraftHybrid?'pattern-focus-expanded':''}`}
      data-focus-workspace={techPackWorkspaceOpen?'techpack':animationWorkspaceActive?'animation':printLayoutActive?'print':'default'}
      onClickCapture={pickThemePart} data-theme-picking={themePickRequestedKey?'true':'false'} data-theme-hover-target={themeHoveredTarget||''}
      data-studio-customized="true" data-studio-theme={previewStudioTheme||studioCustomization.appearance.theme}
      data-studio-theme-preview={previewStudioTheme?'true':'false'}
      data-icon-color-preview={previewIconColor?'true':'false'}
      data-2d-palette-preview={previewTwoDPalette?'true':'false'}
      data-studio-liquid-glass={studioCustomization.appearance.liquidGlass?'true':'false'}
      data-pattern-clear-glass={studioCustomization.appearance.patternClearGlass!==false?'true':'false'}
      data-glass-icon-color={studioCustomization.appearance.glassIconColor}
      data-glass-library={studioCustomization.appearance.glassLibrary?'true':'false'}
      data-glass-inspector={studioCustomization.appearance.glassInspector?'true':'false'}
      data-glass-toolbars={studioCustomization.appearance.glassToolbars?'true':'false'}
      data-glass-menu={studioCustomization.appearance.glassMenu?'true':'false'}
      data-glass-widgets={studioCustomization.appearance.glassWidgets?'true':'false'}
      data-studio-theme-engine={rustThemeTokens?'rust-wasm':'unavailable'}
      data-global-toolbar-glow={rustThemeTokens&&rustThemeGlowEnabled(studioCustomization.appearance.globalToolbarGlow)?'true':'false'}
      data-2d-toolbar-glow={rustThemeTokens&&rustThemeGlowEnabled(studioCustomization.appearance.twoDToolbarGlow)?'true':'false'}
      data-global-toolbar-color-custom={rustThemeTokens&&studioCustomization.appearance.globalToolbarIconColor!=='auto'?'true':'false'}
      data-2d-toolbar-color-custom={rustThemeTokens&&studioCustomization.appearance.twoDToolbarIconColor!=='auto'?'true':'false'}
      data-2d-glass-color-custom={rustThemeTokens&&studioCustomization.appearance.twoDToolbarGlassColor!=='auto'?'true':'false'}
      data-2d-point-custom={previewTwoDPattern?.point||rustThemeTokens&&studioCustomization.preferences.twoDPointColor!=='auto'?'true':'false'}
      data-2d-edge-custom={(previewTwoDPattern?.edge!==undefined?previewTwoDPattern.edge!=='auto':Boolean(rustThemeTokens&&studioCustomization.preferences.twoDEdgeColor!=='auto'))?'true':'false'}
      data-2d-selection-custom={previewTwoDPattern?.selection||rustThemeTokens&&studioCustomization.preferences.twoDSelectionColor!=='auto'?'true':'false'}
      data-2d-notch-custom={previewTwoDPattern?.notch||rustThemeTokens&&studioCustomization.preferences.twoDNotchColor!=='auto'?'true':'false'}
      data-2d-pattern-custom={previewTwoDPattern?.paper||rustThemeTokens&&studioCustomization.preferences.twoDPatternColor!=='auto'?'true':'false'}
      data-2d-horizontal-custom={rustThemeTokens&&studioCustomization.appearance.twoDViewerHorizontalColor!=='auto'?'true':'false'}
      data-2d-vertical-custom={rustThemeTokens&&studioCustomization.appearance.twoDViewerVerticalColor!=='auto'?'true':'false'}
      data-3d-horizontal-custom={rustThemeTokens&&studioCustomization.appearance.threeDViewerHorizontalColor!=='auto'?'true':'false'}
      data-3d-vertical-custom={rustThemeTokens&&studioCustomization.appearance.threeDViewerVerticalColor!=='auto'?'true':'false'}
      data-library-panel-custom={rustThemeTokens&&studioCustomization.appearance.panelLibraryColor!=='auto'?'true':'false'}
      data-object-panel-custom={rustThemeTokens&&studioCustomization.appearance.panelObjectBrowserColor!=='auto'?'true':'false'}
      data-left-rail-custom={rustThemeTokens&&studioCustomization.appearance.leftRailColor!=='auto'?'true':'false'}
      data-right-rail-custom={rustThemeTokens&&studioCustomization.appearance.rightRailColor!=='auto'?'true':'false'}
      data-library-icon-custom={rustThemeTokens&&studioCustomization.appearance.libraryIconColor!=='auto'?'true':'false'}
      data-object-icon-custom={rustThemeTokens&&studioCustomization.appearance.objectBrowserIconColor!=='auto'?'true':'false'}
      data-interface-ink-custom={rustThemeTokens&&(studioCustomization.appearance.interfaceInkColor!=='auto'||studioCustomization.appearance.interfaceBrightness!==1)?'true':'false'}
      data-interface-auto-contrast={studioCustomization.appearance.autoContrast!==false?'true':'false'}
      data-panel-text-inherits-global={studioCustomization.appearance.panelTextInheritsGlobal!==false?'true':'false'}
      data-liquid-glass-glow={rustThemeTokens&&studioCustomization.appearance.liquidGlassGlow?'true':'false'}
      data-toolbar-glow-selected-only={studioCustomization.appearance.toolbarGlowSelectedOnly?'true':'false'}
      data-panel-glow-selected-only={studioCustomization.appearance.panelGlowSelectedOnly?'true':'false'}
      data-studio-panel-order={studioCustomization.workspace.panelOrder}
      data-studio-language={studioCustomization.preferences.language}
      data-studio-theme-mode={appearancePalette.mode==='light'?'light':'dark'}
      style={{'--studio-accent':appearancePalette.accent,
        '--studio-glass-backdrop':studioCustomization.appearance.glassBackdrop,
        '--studio-glass-fill':({clear:'37%',balanced:'51%',rich:'68%'})[studioCustomization.appearance.glassDensity]||'51%',
        '--studio-glass-blur':({crisp:'0px',soft:'10px',smooth:'17px'})[studioCustomization.appearance.glassBlur]||'17px',
        '--studio-sidebar':appearancePalette.sidebarColor,
        '--studio-panel':appearancePalette.panelColor,
        '--studio-text':appearancePalette.textColor,
        '--studio-muted':appearancePalette.mutedColor,
        '--studio-border':appearancePalette.borderColor,
        '--exo-toolbar-glow-radius':`${Math.round((studioCustomization.appearance.toolbarGlowStrength||0)*13)}px`,
        '--exo-panel-glow-radius':`${Math.round((studioCustomization.appearance.panelGlowStrength||0)*14)}px`,
        '--exo-ruler-glow-radius':`${Math.round((studioCustomization.preferences.twoDRulerGlowStrength||0)*10)}px`,
        '--exo-glass-glow-radius':`${Math.round((studioCustomization.appearance.liquidGlassGlowStrength||0)*24)}px`,
        ...(rustThemeTokens||{}),...(interfaceColorTokens||{}),...gradeChartThemeVars,
        '--exo-preview-icon-color':previewIconColor||'#ffffff',
        ...(previewTwoDPattern?.point?{'--exo-2d-point-color':previewTwoDPattern.point}:null),
        ...(previewTwoDPattern?.edge&&previewTwoDPattern.edge!=='auto'?{'--exo-2d-edge-color':previewTwoDPattern.edge}:null),
        ...(previewTwoDPattern?.selection?{'--exo-2d-selection-color':previewTwoDPattern.selection}:null),
        ...(previewTwoDPattern?.notch?{'--exo-2d-notch-color':previewTwoDPattern.notch}:null),
        ...(previewTwoDPattern?.paper?{'--exo-2d-pattern-color':previewTwoDPattern.paper}:null),
        ...(previewTwoDPalette?{
          '--exo-2d-canvas-color':previewTwoDPalette.canvas==='auto'?(previewTwoDPalette.theme==='accumark-green'?'#174e39':'#c6c7c9'):previewTwoDPalette.canvas,
          '--exo-2d-grid-color':previewTwoDPalette.grid==='auto'?(previewTwoDPalette.theme==='accumark-green'?'#b9e2cc':'#34434d'):previewTwoDPalette.grid,
        }:null)}}>
      <style>{Object.entries(studioCustomization.workspace.nativeToolIconColors||{}).filter(([key,color])=>/^((2d|3d):[AB][0-9]{2}|pattern:[a-z0-9-]+)$/.test(key)&&/^#[0-9a-f]{6}$/i.test(color)).map(([key,color])=>{
        const selector=key.startsWith('pattern:')?`[data-pattern-design-tool="${key.slice(8)}"]`:`[data-clo-slot="${key}"]`
        return `.app-shell[data-studio-customized="true"]:not([data-icon-color-preview="true"]) :is(.tool-rail,.clo-right-tool-palette,.exo-pattern-toolpanel,.clo-inspector) ${selector} svg{color:${color}!important;stroke:currentColor!important}.app-shell[data-studio-customized="true"]:not([data-icon-color-preview="true"]) :is(.tool-rail,.clo-right-tool-palette,.exo-pattern-toolpanel,.clo-inspector) ${selector} .cad-tool-icon-mask{color:${color}!important;background-color:currentColor!important}`
      }).join('\n')}</style>
      {themePickRequestedKey&&<div className="exo-theme-pick-banner" role="status">Select a toolbar or panel to customize its appearance <button className="exo-theme-pick-cancel" type="button" onClick={()=>setThemePickRequestedKey(null)}>Cancel</button></div>}
      <input type="file" hidden ref={fileLibraryImportRef} accept=".json,application/json" aria-label="Import File Library backup" onChange={importChosenFileLibraryBackup}/>
      <input type="file" hidden ref={gradeRuleCsvInputRef} accept=".csv,text/csv" aria-label="Import selected piece grading rules CSV" onChange={importPieceGradeRules}/>
      <input type="file" hidden ref={industrialGradeCsvInputRef} accept=".csv,text/csv" aria-label="Import selected piece industrial size breaks CSV" onChange={importPieceSizeBreaks}/>
      {!clothcraftHybrid&&techPackOpen&&<DigitalTechPackStudio key={techPackInitialTab} initialTab={techPackInitialTab}
        project={project} value={project.techPackStudio} nativeMode={clothcraftHybrid}
        onChange={nextState=>{setProject(current=>({...current,techPackStudio:nextState}));setSaveState('modified')}}
        onClose={()=>setTechPackOpen(false)}
        printableHTML={techPackPrintableHTML}
        onPrint={printTraditionalTechPack} onExport={exportDigitalTechPack} onExportHTML={exportTechPackHTML}
        profileName={studioCustomization.profile?.displayName||studioCustomization.profile?.brandName||'Designer'}
        sharingAvailable={fileCollaboration.online}
        onOpenSharing={()=>{setTechPackOpen(false);setLibraryVisible(true);setSidebarView('sharing')}}/>}
      {fileLibraryOpen&&<>
        <ProjectFileLibrary
          initialDialog={fileLibraryStartSave?'save':undefined}
          entries={fileLibraryEntries}
          collections={fileLibraryCollections}
          activeProjectId={fileLibraryCurrentId}
          collaboration={{...fileCollaboration,profile:{...studioCustomization.profile,...fileCollaboration.profile}}}
          onCollaborationAction={handleFileCollaborationAction}
          currentProject={{name:clothcraftHybrid?clothcraftLive?.name||'Current Rust garment':project.name}}
          currentTechPack={clothcraftHybrid?nativeTechPackDraft:project.nativeTechPackWorkspace}
          onOpenTechPack={()=>{setFileLibraryOpen(false);enterTechPackWorkspace()}}
          assetCatalog={{
            hardware:listHardwarePresets().map(item=>({id:item.id,name:item.name,kind:item.kind,material:item.material,previewUrl:item.previewImage||`/hardware-thumbnails/${item.id}.png`})),
            studioSets:listStagePresets().map(item=>({id:item.id,name:item.name,kind:item.kind,previewUrl:`/stage-posters/${item.id}.png`})),
            photoShootSets:PHOTO_SHOOT_SETS.map(item=>({id:item.id,name:item.name,kind:item.kind,color:item.background,description:item.description})),
            fabrics:Object.values(FABRIC_PRESETS).map(item=>({id:item.id||item.name,name:item.name,color:item.color})),
          }}
          onClose={()=>{setFileLibraryOpen(false);setFileLibraryStartSave(false);setFileLibraryError('')}}
          onSaveCurrent={archiveCurrentProject}
          onOpenProject={openSavedFileRecord}
          onOpenRevision={restoreSavedFileRevision}
          onCreateCollection={async values=>{await createLibraryCollection(values);await refreshFileLibrary()}}
          onUpdateProject={updateSavedFileRecord}
          onAddRevision={saveFileRevision}
          onUploadFile={uploadFileToLibrary}
          onDeleteAttachment={removeLibraryAttachment}
          onDownloadAttachment={downloadLibraryFile}
          onSelectAsset={selectFileLibraryAsset}
          onExportBackup={exportFileLibrary}
          onImportBackup={chooseFileLibraryBackup}
        />
        {(fileLibraryError||fileLibraryLoading)&&<div role={fileLibraryError?'alert':'status'} style={{position:'fixed',top:73,right:26,zIndex:16000,maxWidth:480,padding:'12px 16px',border:'1px solid #747a80',background:'#292c30',color:'#f0f2f3',borderRadius:7,boxShadow:'0 8px 28px #0008'}}>{fileLibraryError||'Loading saved projects and assets…'}{fileLibraryError&&<button type="button" style={{marginLeft:12}} onClick={()=>setFileLibraryError('')}>Dismiss</button>}</div>}
      </>}
      <div className="clo-mac-menu" role="menubar" aria-label="EXO Sample 3D application menus">
        <div className="clo-app-menu-brand"><span className="clo-brand-dot">◈</span><strong>EXO Sample 3D</strong></div>
        {(studioCustomization.profile.brandName||studioCustomization.profile.displayName||studioCustomization.profile.logoDataUrl||studioCustomization.profile.avatarDataUrl)&&
          <button type="button" className="studio-personal-brand" aria-label="Edit designer profile"
            title="Edit designer identity" onClick={()=>{setStudioSettingsTab('profile');setStudioSettingsOpen(true)}}>
            {(studioCustomization.profile.logoDataUrl||studioCustomization.profile.avatarDataUrl)&&<img src={studioCustomization.profile.logoDataUrl||studioCustomization.profile.avatarDataUrl} alt="" />}
            <span>{studioCustomization.profile.brandName||studioCustomization.profile.displayName||'Designer'}</span>
          </button>}
        {CLO_MENUS.map(menu => <div className={`clo-menu-group ${['Preferences','Settings','Help'].includes(menu.title)?'flyout-left':''}`} key={menu.title}>
          <button type="button" className={openMenu === menu.title ? 'active' : ''} aria-expanded={openMenu === menu.title} aria-haspopup="menu"
            onMouseEnter={()=>{if(openMenu&&openMenu!==menu.title)setOpenMenu(menu.title)}}
            onKeyDown={event=>{if(event.key==='Escape')setOpenMenu(null);if(event.key==='ArrowDown'){event.preventDefault();setOpenMenu(menu.title)}}}
            onClick={() => { setSimulationMenuOpen(false); setOpenMenu(openMenu === menu.title ? null : menu.title) }}>{menu.title}</button>
          {openMenu === menu.title && <CloTopMenuDropdown menu={menu} nativeMode={clothcraftHybrid} onAction={executeStudioAction} onDismiss={()=>setOpenMenu(null)}/>}
        </div>)}
        <div className="clo-menu-spacer"/>
        <div className="clo-header-primary-actions" aria-label="Essential garment workspace actions">
          <button type="button" className="clo-header-pattern-launch" aria-label="Open Pattern workspace" title="Open pattern editing workspace" onClick={()=>{setActiveSection('Pattern');setShowTopWorkspaceTabs(true);setOpenMenu(null)}}><Grid3X3 size={14}/><span>PATTERN</span></button>
          <button type="button" className="clo-command-launch clo-header-search-launch" aria-label="Search commands" title="Find working commands · ⌘K" onClick={() => setCommandPaletteOpen(true)}><Search size={15}/><span>SEARCH</span></button>
          <button type="button" className={`clo-command-launch clo-arai-launch ${araiOpen ? 'active' : ''}`} aria-label="Open ARAI assistant chat" aria-controls="clo-arai-chat" aria-expanded={araiOpen} title="Open ARAI garment assistant" onClick={() => { setOpenMenu(null); setAraiOpen(open => !open) }}><Sparkles size={14}/><span>AI</span></button>
          <div className="clo-simulate-control">
            <button className={`clo-simulate-main ${visibleRunning ? 'running' : ''}`} disabled={printLayoutActive} onClick={animationWorkspaceActive ? () => window.dispatchEvent(new Event('exo-clothcraft-animation-toggle')) : simForVisibleEngine} title={printLayoutActive?'Exit print layout to simulate':animationWorkspaceActive?'Animate or pause':'Simulate or pause visible garment · Space'}><ArrowDownToLine size={16}/><span>{printLayoutActive?'PRINT':animationWorkspaceActive?'ANIM':visibleRunning ? 'PAUSE' : 'SIM'}</span></button>
            <button className="clo-simulate-arrow" title="Simulation and workspace modes" aria-label="Simulation and workspace modes" aria-haspopup="menu" aria-controls="exo-simulate-mode-dropdown" aria-expanded={simulationMenuOpen} onClick={() => { setLeftSimulationMenuOpen(false); setOpenMenu(null); setSimulationMenuOpen(value => !value) }}><ChevronDown size={13}/></button>
            {simulationMenuOpen && <div id="exo-simulate-mode-dropdown" className="clo-simulation-popover exo-simulate-clear-glass" role="menu" aria-label="Simulation mode and workspace options" data-simulate-glass="clear" onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();setSimulationMenuOpen(false)}}}>
              <strong>Simulation mode</strong>
              {!clothcraftHybrid&&<>
              <button onClick={() => { applySimulationQuality('balanced'); setSimulationMenuOpen(false) }}><Check size={14}/> Normal · Balanced</button>
              <button onClick={() => { applySimulationQuality('final'); setSimulationMenuOpen(false) }}><SlidersHorizontal size={14}/> Fitting · Quality</button>
              <button onClick={() => { applySimulationQuality('draft'); setSimulationMenuOpen(false) }}><Activity size={14}/> Fast · Draft</button>
              <button disabled title="GPU cloth simulation has not yet been implemented"><Cpu size={14}/> GPU simulation <small>PLANNED</small></button>
              <button onClick={requestNativeSolve} disabled={nativeServiceStatus !== 'ready'} title={nativeServiceStatus === 'ready' ? 'Solve using connected native XPBD service' : 'Native solver service is offline'}><Box size={14}/> Native XPBD solve {nativeServiceStatus !== 'ready' ? <small>OFFLINE</small> : null}</button>
              </>}
              <button type="button" onClick={enterAnimationWorkspace}><Play size={14}/> Animation Studio</button>
              <button type="button" onClick={enterPrintLayoutWorkspace}><Grid3X3 size={14}/> Print Layout</button>
              <button type="button" onClick={enterTechPackWorkspace}><FileSpreadsheet size={14}/> Techpack Workspace</button>
              <button type="button" onClick={()=>{setSimulationMenuOpen(false);setLeftSimulationMenuOpen(false);setFileLibraryStartSave(false);void openFileLibrary()}}><FolderOpen size={14}/> File Library · Saved garments</button>
            </div>}
          </div>
          <button className={`save-button ${saveState}`} disabled={clothcraftHybrid&&clothcraftLive?.busy} onClick={saveForVisibleEngine}><Save size={15} />{clothcraftHybrid ? 'SAVE' : saveState === 'saved' ? 'SAVED' : 'SAVE'}</button>
        </div>
        <div className="clo-header-secondary-tools" aria-label="Additional garment tools">

          <button type="button" className="clo-header-scroll-button" aria-label="Previous toolbar tools" title="Previous toolbar tools" onClick={event=>event.currentTarget.nextElementSibling?.scrollBy({left:-245,behavior:'smooth'})}><ChevronLeft size={14}/></button>
          <div className="file-actions clo-compact-file-actions">
          <button type="button" className="clo-command-launch" aria-label="Open Studio Settings" title="Customize workspace, toolbar, themes and profile" onClick={()=>{setStudioSettingsTab('workspace');setStudioSettingsOpen(true)}}><Settings2 size={16}/></button>
          <button type="button" className="clo-top-tabs-toggle" title="Show / hide top workspace tabs" aria-pressed={showTopWorkspaceTabs} onClick={() => setShowTopWorkspaceTabs(value => !value)}><LayoutPanelTop size={15}/></button>
          {showTopWorkspaceTabs && <select className="clo-workspace-select" aria-label="Workspace" value={activeSection} onChange={(event) => setActiveSection(event.target.value)}>{SECTIONS.map((section) => <option key={section} value={section}>{section}</option>)}</select>}
          <select className="clo-workspace-select clo-layout-preset-select" aria-label="CLO-style workspace layout presets" value="" onChange={(event) => {
            const key = event.target.value
            if (key === 'save') saveCustomWorkspace()
            else if (key === 'restore') restoreCustomWorkspace()
            else if (WORKSPACE_PROFILES[key]) applyWorkspaceProfile(WORKSPACE_PROFILES[key])
          }}>
            <option value="">LAYOUT</option>
            {Object.entries(WORKSPACE_PROFILES).map(([key, profile]) => <option key={key} value={key}>{profile.name}</option>)}
            <option value="save">Save my layout</option>
            <option value="restore">Restore my layout</option>
          </select>
          <select className="clo-workspace-select clo-window-mode-select" aria-label="3D and 2D window arrangement" value={viewportLayout} onChange={event => setViewportLayout(event.target.value)}>
            {Object.entries(VIEWPORT_LAYOUTS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          {!clothcraftHybrid&&<button type="button" className={`clo-command-launch ${patternFocusActive?'active':''}`} aria-label={patternFocusActive?'Exit full-screen 2D grading workspace':'Open full-screen 2D grading workspace'} aria-pressed={patternFocusActive} title="Separate full-window 2D pattern drafting with XS–XXL grading tools" onClick={togglePatternGradingStudio}><Grid3X3 size={15}/><span>{patternFocusActive?'EXIT 2D':'2D GRADE FULL'}</span></button>}
          {viewportLayout === '2d' && <button type="button" className="clo-command-launch" aria-label="Restore 3D garment panel" title="Restore both 3D and 2D viewports" onClick={() => {setViewportLayout('split');setViewportSplit(50)}}><Box size={15}/><span>3D</span></button>}
          <button type="button" className="clo-command-launch clo-panel-toggle" aria-label="Toggle asset browser panel" aria-pressed={libraryVisible} title="Show / hide Library" onClick={() => setLibraryVisible(value => !value)}><PanelLeft size={15}/></button>
          <button type="button" className="clo-command-launch clo-panel-toggle" aria-label="Show or hide Property Editor" aria-pressed={inspectorVisible} title="Show / hide Property Editor" onClick={() => setInspectorVisible(value => !value)}><PanelRight size={15}/></button>
          {clothcraftHybrid && <div className="exo-v2-rust-engine" role="status" title="Actual ClothCraft Rust VBD + OGC engine · experimental fit">
            <span className="exo-v2-rust-dot"/><span>ClothCraft <strong>RUST</strong></span>
          </div>}
          {clothcraftHybrid && <button className="exo-v2-top-action" aria-label="Step ClothCraft Rust simulation" title="Advance ClothCraft Rust simulation one step" disabled={clothcraftLive?.busy||visibleRunning} onClick={() => rustCommand('step')}><Activity size={13}/> STEP</button>}
          {clothcraftHybrid && <button className="exo-v2-top-action" aria-label="Reset pattern position outside avatar" title="Restore the garment's original off-body arrangement without deleting patterns, seams or materials; recover an invalid saved drape if needed" onClick={() => rustCommand('reset-position')}><RotateCcw size={13}/> RESET PANELS</button>}
          <button className="icon-button" title="Undo" disabled={clothcraftHybrid ? clothcraftLive?.busy||!clothcraftLive?.canUndo : !undoStack.length} onClick={undoForVisibleEngine}><Undo2 size={17} /></button>
          <button className="icon-button" title="Redo" disabled={clothcraftHybrid ? clothcraftLive?.busy||!clothcraftLive?.canRedo : !redoStack.length} onClick={redoForVisibleEngine}><Redo2 size={17} /></button>
          <span className="toolbar-divider" />
          <button className="icon-button" title="Import garment" onClick={() => importInputRef.current?.click()}><Upload size={17} /></button>
          <button className="icon-button" title="Export visible garment" disabled={clothcraftHybrid&&clothcraftLive?.busy} onClick={exportForVisibleEngine}><Download size={17} /></button>
          <input ref={importInputRef} hidden type="file" accept=".json,.garment,.dxf,.zip,.mdl,.vet,.iba,.rul" onChange={importProject} />
          <input ref={factoryDxfReferenceInputRef} hidden type="file" accept=".dxf" onChange={event=>importProject(event,{manufacturingImport:'cut-reference'})}/>
          <input ref={svgPatternInputRef} hidden type="file" accept=".svg,image/svg+xml" onChange={importSvgPattern}/>
          <input ref={seamlyMeasureInputRef} hidden type="file" accept=".smis,.smms" onChange={importSeamlyMeasurements} />
          <input ref={seamlyPatternInputRef} hidden type="file" accept=".sm2d" onChange={importSeamlyConstructionGraph} />
          <input ref={graphicInputRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={importGraphic} />
          <input ref={fabricTextureInputRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={importFabricTexture} />
          <input ref={fabricEvidenceInputRef} hidden type="file" accept="application/json,.json" onChange={importFabricLabMeasurements} />
          <input ref={fabricNormalInputRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => importFabricPbrMap(event, 'normal')} />
          <input ref={fabricRoughnessInputRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => importFabricPbrMap(event, 'roughness')} />
          <input ref={fabricMetalnessInputRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => importFabricPbrMap(event, 'metalness')} />
          <input ref={fabricOpacityInputRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => importFabricPbrMap(event, 'opacity')} />
          <input ref={fabricDisplacementInputRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => importFabricPbrMap(event, 'displacement')} />
          <input ref={fabricPbrSetInputRef} hidden type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={importFabricPbrSet} />
          <input ref={avatarMeshInputRef} hidden type="file" accept=".obj,.glb" onChange={importAvatarMesh} />
          <input ref={hdriInputRef} hidden type="file" accept=".hdr,image/vnd.radiance" onChange={importHdri} />
          </div>
          <button type="button" className="clo-header-scroll-button" aria-label="More toolbar tools" title="Scroll to more toolbar controls" onClick={event=>event.currentTarget.previousElementSibling?.scrollBy({left:245,behavior:'smooth'})}><ChevronRight size={14}/></button>
        </div>
        <WorkspaceSharingHeader
          collaboration={fileCollaboration}
          profile={studioCustomization.profile}
          onOpenSharing={()=>{setLibraryVisible(true);setSidebarView('sharing');setOpenMenu(null)}}
          onOpenProfile={()=>{setStudioSettingsTab('profile');setStudioSettingsOpen(true)}}
          onSaveProfile={payload=>handleFileCollaborationAction('profile.update',payload)}
        />
      </div>

      {araiOpen && <section id="clo-arai-chat" className="clo-arai-popover" role="dialog" aria-label="ARAI garment assistant" onKeyDown={event => { if (event.key === 'Escape') setAraiOpen(false) }}>
        <header className="clo-arai-header"><div><Sparkles size={16}/><strong>ARAI</strong><span>GARMENT ASSISTANT</span></div><button type="button" title="Close ARAI chat" aria-label="Close ARAI chat" onClick={() => setAraiOpen(false)}>×</button></header>
        <div className="clo-arai-conversation" aria-live="polite">
          {araiLastPrompt && <div className="clo-arai-message user"><small>YOU</small><p>{araiLastPrompt}</p></div>}
          <div className="clo-arai-message assistant"><small>ARAI</small><p>{commandResult}</p></div>
        </div>
        <form className="command-bar" onSubmit={runCommand}>
          <Sparkles size={15}/>
          <input autoFocus aria-label="EXO tool assistant" value={command} onChange={event => setCommand(event.target.value)} placeholder="Ask ARAI to edit, navigate or use a tool…"/>
          <button type="submit" title={`${ASSISTANT_ACTIONS.length} verified assistant actions plus pattern editing verbs`}>SEND</button>
        </form>
        <p className="clo-arai-hint">Commands execute through verified EXO tools. Use ⌘K to browse all commands.</p>
      </section>}

      {studioSettingsOpen&&<StudioSettingsDialog value={studioCustomization} initialTab={studioSettingsTab}
        onPreviewTheme={setPreviewStudioTheme} onPreviewIconColor={setPreviewIconColor} onPreviewTwoDPalette={setPreviewTwoDPalette} onPreviewTwoDPattern={setPreviewTwoDPattern} onPreviewGradeChart={previewGradeChart} onHoverTarget={setThemeHoveredTarget} onPickTarget={beginThemePick} focusKey={themePickFocusKey}
        contrastAudit={themeContrastAudit} onFixContrast={fixThemeContrast}
        onChange={updateStudioCustomization} onClose={closeStudioSettings}
        onApplyWorkspace={updateStudioCustomization} onSaveWorkspace={saveCustomWorkspace}
        onRestoreWorkspace={restoreCustomWorkspace} onReset={resetStudioCustomization}
        onResetEnvironment={resetEnvironmentCustomization}/>}
      <main className="main-layout clo-adjustable-panels" data-library-visible={libraryVisible} data-inspector-visible={inspectorVisible} data-left-tools-collapsed={leftToolsCollapsed} data-right-tools-collapsed={rightToolsCollapsed} data-pattern-workspace={viewportLayout==='2d'} style={{ '--library-width': `${libraryWidth}px`, '--inspector-width': `${inspectorWidth}px`, '--object-browser-height': `${objectBrowserHeight}px`, '--effective-library-width': libraryVisible ? `${libraryWidth}px` : '0px', '--effective-inspector-width': inspectorVisible ? `${inspectorWidth}px` : '0px' }}>
        <ExoUniversalPanelHandles20261028 libraryVisible={libraryVisible} inspectorVisible={inspectorVisible} onInspectorVisibleChange={setInspectorVisible} leftVisible={!leftToolsCollapsed} rightVisible={!rightToolsCollapsed}/>
        <button type="button" className="exo-panel-edge-toggle exo-library-edge-toggle" aria-label={libraryVisible?'Collapse library panel':'Expand library panel'} aria-expanded={libraryVisible} onClick={()=>setLibraryVisible(value=>!value)}>{libraryVisible?<ChevronLeft size={14}/>:<ChevronRight size={14}/>}</button>
        <button type="button" className="exo-panel-edge-toggle exo-left-tools-edge-toggle" aria-label={leftToolsCollapsed?'Expand left tools panel':'Collapse left tools panel'} aria-expanded={!leftToolsCollapsed} onClick={()=>setLeftToolsCollapsed(value=>!value)}>{leftToolsCollapsed?<ChevronRight size={14}/>:<ChevronLeft size={14}/>}</button>
        <button type="button" className="exo-panel-edge-toggle exo-right-independent-tools-arrow" aria-label={rightToolsCollapsed?'Expand right tools toolbar':'Collapse right tools toolbar'} aria-expanded={!rightToolsCollapsed} title={rightToolsCollapsed?'Expand right tools toolbar':'Collapse right tools toolbar'} onClick={()=>setRightToolsCollapsed(value=>!value)}>{rightToolsCollapsed?<ChevronLeft size={14}/>:<ChevronRight size={14}/>}</button>

        <nav className="clo-edge-tabs" aria-label="Workspace side panels">
          <button type="button" aria-pressed={sidebarView === 'library' && libraryVisible} className={sidebarView === 'library' && libraryVisible ? 'active' : ''} onClick={() => { setLibraryVisible(true); setSidebarView('library') }} title="Open asset library">LIBRARY</button>
          <button type="button" aria-pressed={sidebarView === 'history' && libraryVisible} className={sidebarView === 'history' && libraryVisible ? 'active' : ''} onClick={() => { setLibraryVisible(true); setSidebarView('history') }} title="Open undo and redo history">HISTORY</button>
          <button type="button" aria-pressed={sidebarView === 'sharing' && libraryVisible} className={sidebarView === 'sharing' && libraryVisible ? 'active' : ''} onClick={() => {setLibraryVisible(true);setSidebarView('sharing')}} title="Open shared projects, collaborators and comments">SHARING</button>
        </nav>
        <aside className="asset-browser" hidden={!libraryVisible}>
          <div id="exo-techpack-library-host" className="exo-techpack-library-host" hidden={!techPackWorkspaceOpen}/>
          {sidebarView === 'sharing' ? <WorkspaceSharingPanel
            collaboration={{...fileCollaboration,profile:{...studioCustomization.profile,...fileCollaboration.profile}}}
            entries={fileLibraryEntries} collections={fileLibraryCollections}
            onAction={handleFileCollaborationAction}
            onRefresh={()=>Promise.all([refreshFileLibrary(),refreshFileCollaboration(),...(fileCollaboration.selectedLocalId?[watchSharedLibraryProject(fileCollaboration.selectedLocalId)]:[])])}
            onOpenLibrary={()=>{setFileLibraryStartSave(false);void openFileLibrary()}}
            onOpenProfile={()=>{setStudioSettingsTab('profile');setStudioSettingsOpen(true)}}
          /> : sidebarView === 'history' ? <section className="clo-history-browser">
            <header>History</header>
            <p>Recorded garment snapshots · current session</p>
            <div className="clo-history-actions">
              <button type="button" onClick={undoForVisibleEngine} disabled={clothcraftHybrid ? !clothcraftLive?.canUndo : !undoStack.length}><Undo2 size={15}/> Undo <span>{clothcraftHybrid ? clothcraftLive?.canUndo ? '1+' : '0' : undoStack.length}</span></button>
              <button type="button" onClick={redoForVisibleEngine} disabled={clothcraftHybrid ? !clothcraftLive?.canRedo : !redoStack.length}><Redo2 size={15}/> Redo <span>{clothcraftHybrid ? clothcraftLive?.canRedo ? '1+' : '0' : redoStack.length}</span></button>
            </div>
            <div className="clo-history-timeline" role="list" aria-label="Recent garment history">
              <div className="clo-history-current" role="listitem"><strong>Current · revision {project.revision ?? '—'}</strong><span>{project.pieces.length} patterns · {project.seams.length} seams</span></div>
              {undoStack.map((snapshot, index) => ({snapshot,index})).reverse().slice(0, 20).map(({snapshot,index}) => <button role="listitem" type="button" key={`${index}-${snapshot.id || ''}-${snapshot.revision || ''}`} data-undo-index={index} title={`Restore garment revision ${snapshot.revision ?? index}`} onClick={() => restoreHistorySnapshot(index)}>
                <span>Revision {snapshot.revision ?? '—'}</span><small>{snapshot.pieces?.length ?? 0} patterns · {snapshot.seams?.length ?? 0} seams</small>
              </button>)}
              {!undoStack.length && <div className="clo-history-empty">Edit a pattern to create an undo checkpoint.</div>}
            </div>
            <div className="clo-history-note">Select a revision to restore it. Skipped edits remain accessible through Redo. Session history is not a replacement for saving your project.</div>
          </section> : <>
          <LibraryChrome category={assetCategory} setCategory={setAssetCategory} folder={libraryFolder} setFolder={setLibraryFolder}
            fabricGroups={FABRIC_PRESET_GROUPS} search={librarySearch} setSearch={setLibrarySearch} thumbnails={libraryThumbnails} setThumbnails={setLibraryThumbnails}>
            {assetCategory==='Patterns'&&<div className="exo-pattern-import-bar">
              <button type="button" className="wide-action" onClick={()=>svgPatternInputRef.current?.click()}><Upload size={13}/>IMPORT SVG / ILLUSTRATOR OUTLINES</button>
              {!clothcraftHybrid&&<button type="button" className="wide-action" onClick={arrangeCurrentPatternsIn3D}><Box size={13}/>ARRANGE CURRENT 2D IN 3D</button>}
              <span>2D outlines only · zero sewing · choose patterns to edit in the 2D viewport</span>
            </div>}
            {assetCategory==='Patterns'&&<PatternIntelligenceLibrary search={librarySearch}/>}
            {(assetCategory === 'Garment' || assetCategory === 'Patterns') ? GARMENT_TEMPLATES.filter(template => libraryItemMatches(template.name)&&templateMatchesFolder(template,libraryFolder)).map((template) => (
              <LibraryAssetHover key={`${assetCategory}-${template.id}`} category={assetCategory} id={template.id} title={template.name}
                description={template.description || 'Garment construction template with editable 2D panels.'}
                details={[["Asset type",assetCategory==='Patterns'?'2D production pattern':'Garment template'],['Action','Click to load template'],['Source','EXO local drafting geometry']]}
                source={assetCategory==='Patterns'
                  ? 'Flat 2D view of the editable, unsewn template cutlines. SVG/Illustrator outlines can be imported separately.'
                  : 'Curved 3D visual study made from the EXO garment template\'s real pattern outlines and referenced seam edges. Curvature is illustrative, not a solved fabric simulation.'}
                preview={assetCategory==='Patterns'
                  ? <div className="exo-library-template-preview exo-library-template-preview--flat"><PatternFlatSheetPreview name={template.name} templateId={template.id}/></div>
                  : <div className="exo-library-template-preview exo-library-template-preview--curved"><GarmentLibraryPreview name={template.name} templateId={template.id}/></div>}>
              <button className="asset-template garment-tile" onClick={() => assetCategory==='Patterns'?openUnsewnPatternTemplate(template.id):applyGarmentTemplate(template.id)} title={`${template.name} · ${template.description}`}>
                <span className="asset-template-icon">{assetCategory === 'Patterns' ? <PatternLibraryThumbnail templateId={template.id} name={template.name}/> : <GarmentSilhouette type={template.name}/>}</span><span className="asset-template-label">{template.name}</span>
              </button>
              </LibraryAssetHover>
            )) : assetCategory === 'Fabric' || assetCategory === 'Material' ? <FabricCatalog key={assetCategory} groups={FABRIC_PRESET_GROUPS} folderFilter={libraryFolder} projectFabrics={project.fabrics} search={librarySearch} coverage={FABRIC_SCAN_COVERAGE} nativeMode={clothcraftHybrid} onAssignFabric={assignFabric} onApplyPreset={addAndApplyFabricPreset} onActivatePreset={activateFabricFromLibrary} onInspectDraft={id => { setCommandResult(`${FABRIC_PRESETS[id].name} is available in the EXO fabric library. Double-click to apply it to the selected native panel.`); setActiveSection('Fabric') }}/>: assetCategory === 'Avatar' ? AVAILABLE_AVATARS.filter(({ name,model }) => libraryItemMatches(name) && (libraryFolder==='all'||libraryFolder===model||(libraryFolder==='reference'&&model!=='makehuman-base')||(libraryFolder==='base'&&model==='makehuman-base'))).map(({ name, model }) => (
              <LibraryAssetHover key={model} category="Avatar" id={model} title={name}
                description="3D body reference for garment presentation and fitting, where the corresponding model is installed."
                details={[["Asset",model],['Availability',clothcraftHybrid&&!['makehuman-base','clo-thomas'].includes(model)?'3D preview only; no native collision body':avatarAvailability[model]===true?'Installed locally':'Asset unavailable'],['Action','Click to set fitting avatar']]}
                source="Preview is visual. Imported avatar geometry may not have calibrated physical collision."
                preview={<Library3DAssetPreview kind="avatar" variant={model} height={230}/> }>
                <button className="asset-template garment-tile" aria-disabled={avatarAvailability[model] !== true} onClick={() => { if(avatarAvailability[model]!==true) return;setActiveSection('Avatar'); setAvatarModel(model) }}><span className="asset-template-icon avatar-library-thumbnail">♙</span><span className="asset-template-label">{name}{clothcraftHybrid&&!['makehuman-base','clo-thomas'].includes(model)?' · Preview only':avatarAvailability[model] === false ? ' · Not installed' : ''}</span></button>
              </LibraryAssetHover>
            )) : assetCategory === 'Hanger' ? HANGER_LIBRARY.filter(item=>libraryItemMatches(`${item.name} ${item.finish} ${item.construction}`)&&(libraryFolder==='all'||libraryFolder===item.id)).map(item=>(
              <LibraryAssetHover key={item.id} category="Hanger" id={item.id} title={item.name} description={item.construction}
                details={[["Finish",item.finish],["Construction",item.construction],["3D asset",item.id === 'wood' ? 'Innerscene Shoulder Form · CC0 GLB' : item.id === 'trouser-clip' ? 'Innerscene Clip Rail · CC0 GLB' : 'Original EXO procedural 3D'],["Action","Click to display hanger"]]}
                source={item.id === 'wood' ? 'Imported Innerscene Shoulder Form · CC0. Original EXO thumbnail is rendered from this model.' : item.id === 'trouser-clip' ? 'Imported Innerscene Clip Rail · CC0. Original EXO thumbnail is rendered from this model.' : 'Original EXO procedural Three.js geometry.'}
                preview={<Library3DAssetPreview kind="hanger" variant={item.id} height={230}/> }>
                <button className={`asset-template garment-tile ${(project.render?.hangerPreset||'none')===item.id?'selected':''}`}
                  type="button" aria-pressed={(project.render?.hangerPreset||'none')===item.id}
                  onClick={()=>{updateRenderSetting('hangerPreset',item.id);setActiveSection('Render');setCommandResult(`${item.name} selected for 3D garment presentation.`)}}>
                  <span className="asset-template-icon exo-hanger-library-tile"><Library3DAssetPreview kind="hanger" variant={item.id} interactive={false} height={70}/></span>
                  <span className="asset-template-label">{item.name}</span>
                </button>
              </LibraryAssetHover>
            )) : assetCategory === 'Hardware and Trims' ? (
              <>
                {[
                  {id:'button-row',name:'Five-button row',icon:'buttons',image:'/hardware-thumbnails/four-hole-shirt-button.png',description:'Five 3D buttons evenly spaced on the selected pattern.',action:()=>addButtonRow(selectedPiece.id,5)},
                  {id:'buttonholes',name:'Five buttonholes',icon:'buttonholes',image:'/hardware-thumbnails/horizontal-buttonhole.png',description:'Five satin-stitched openings on the selected pattern.',action:()=>addButtonholeRow(selectedPiece.id,5)},
                  {id:'edge-zipper',name:'Edge zipper',icon:'trim',image:'/hardware-thumbnails/coil-zipper-5.png',description:'Add a coil zipper to the selected edge.',action:()=>addZipper(selectedPiece.id,trimEdgeIndex)},
                  {id:'topstitch',name:'Topstitch seam',icon:'topstitch',description:'Add a decorative seam stitching path along the selected edge.',action:()=>addTopstitch(selectedPiece.id,trimEdgeIndex)},
                  {id:'binding',name:'Edge binding',icon:'seam-weld',description:'Add edge binding around the chosen garment segment.',action:()=>addBinding(selectedPiece.id,trimEdgeIndex)},
                ].filter(item=>libraryFolder==='all'||
                  (['fasteners','button'].includes(libraryFolder)&&item.id==='button-row')||
                  (['fasteners','buttonhole'].includes(libraryFolder)&&item.id==='buttonholes')||
                  (['zipper-parts','zipper'].includes(libraryFolder)&&item.id==='edge-zipper')||
                  (['findings','trim'].includes(libraryFolder)&&['binding','topstitch'].includes(item.id))
                ).map(item=><LibraryAssetHover category="Hardware and Trims" key={item.id} id={item.id} title={item.name}
                  description={item.description} details={[["Selected pattern",selectedPiece?.name||'Select a pattern'],["Action","Click to construct"]]}
                  source={item.image?'Render made from EXO procedural 3D hardware geometry.':'Sewing operation reference; preview is a tool symbol.'}
                  preview={item.image?<img src={item.image} alt={`${item.name} rendered hardware`} loading="lazy"/>:<CadToolIcon id={item.icon} size={100}/>}>
                  <button type="button" className="asset-template garment-tile" aria-disabled={!selectedPiece}
                    onClick={()=>{if(!selectedPiece)return;item.action();setActiveSection('Sewing')}}>
                    <span className="asset-template-icon clo-hardware-preview"><CadToolIcon id={item.icon} size={48}/></span>
                    <span className="asset-template-label">{item.name}</span>
                  </button>
                </LibraryAssetHover>)}
                <HardwareLibrary search={librarySearch} folderFilter={libraryFolder} selectedPresetId={selectedObjectForProperties?.source==='library'?selectedObjectForProperties.id:null}
                  onSelectImportedAsset={asset=>{
                    setSelectedObjectForProperties({source:'imported-library',type:'imported-hardware',id:asset.original?.id||asset.id,name:asset.name,asset})
                    setObjectTab('Trim');setActiveSection('Sewing');setShowObjectBrowser(true);setInspectorVisible(true)
                    setCommandResult(`${asset.name} selected from the hardware library. Use Place to attach its original 3D mesh.`)
                  }} onPlaceImportedAsset={placeImportedCloAsset} onSelectPreset={preset=>{
                  if(['button','buttonhole','zipper'].includes(preset.kind))setHardwareChoice(current=>({...current,[preset.kind]:preset.id}))
                  setObjectTab(preset.kind==='button'?'Button':preset.kind==='buttonhole'?'Buttonhole':preset.kind==='zipper'?'Zipper':'Trim')
                  setSelectedObjectForProperties({source:'library',type:'hardware',id:preset.id,name:preset.name})
                  setShowObjectBrowser(true)
                  setInspectorVisible(true)
                  setActiveSection('Sewing')
                  if(window.innerWidth<600)requestAnimationFrame(()=>document.querySelector('.clo-inspector')?.scrollIntoView({behavior:'auto',block:'nearest',inline:'end'}))
                  setCommandResult(`${preset.name} selected. Review its dimensions and material in the right Property Editor.`)
                }}/>
              </>
            ) : assetCategory === 'Stage' ? (
              <StageCatalog folderFilter={libraryFolder} selectedStageId={normalizeStageId(project.render?.stageId)} search={librarySearch} onSelectStage={id => { updateRenderSetting('stageId', id); setActiveSection('Render') }} />
            ) : <div className="asset-placeholder"><FolderOpen size={26}/><strong>{assetCategory}</strong><span>The collection is reserved for future assets.</span></div>}
          </LibraryChrome>
          </>}
          <div className="clo-panel-resizer clo-left-resizer" role="separator" aria-orientation="vertical" aria-label="Resize Library width" title="Drag to resize Library" onPointerDown={(event) => beginPanelResize('library', event)} onPointerMove={movePanelResize} onPointerUp={endPanelResize} onLostPointerCapture={endPanelResize} onDoubleClick={() => setLibraryWidth(232)}/>
        </aside>
        <aside className={`tool-rail ${compactTools ? 'compact' : ''}`} aria-label={viewportLayout==='2d'?'2D pattern design and grading toolbar':'3D and sewing toolbar'}>
          <div id="exo-techpack-left-tools-host" className="exo-techpack-rail-host" hidden={!techPackWorkspaceOpen}/>
          <div className="clo-rail-section exo-universal-tools-heading"><strong>{viewportLayout==='2d'?'2D / GRADE':'3D TOOLS'}</strong></div>
          {viewportLayout!=='2d' && <Clo3DReferenceToolbar nativeClothcraft={clothcraftHybrid} enabledLegacy={enabledClo3D}
            onCollapse3D={collapse3DForPatterns}
            toolbarEditMode={studioCustomization.workspace.toolbarEditMode}
            onActivate={activateCloTool} canDraft={slot=>Boolean(selectedPiece&&draftHardwareForCloSlot(`3d:${slot.id}`))}
            running={visibleRunning} viewportTool={viewportTool} tool={tool} sewingGuides={showSewingGuides}
            toolbarDock={studioCustomization.workspace.leftToolbarDock}
            toolbarPosition={studioCustomization.workspace.leftToolbarPosition}
            toolbarOrder={studioCustomization.workspace.leftToolbarIds}
            onToolbarPositionChange={position=>setStudioCustomization(previous=>normalizeStudioCustomization({...previous,workspace:{...previous.workspace,leftToolbarPosition:position}}))}
            onToolbarOrderChange={ids=>setStudioCustomization(previous=>normalizeStudioCustomization({...previous,workspace:{...previous.workspace,leftToolbarIds:ids}}))}
            onToolbarDockChange={dock=>setStudioCustomization(previous=>normalizeStudioCustomization({...previous,workspace:{...previous.workspace,leftToolbarDock:dock}}))}/>}
          {viewportLayout==='2d' && <div className="exo-grade-workbench-actions" aria-label="Industrial grading actions">
            {clothcraftHybrid&&<button type="button" title="Open all 24 native pattern grading tools and grading table"
              aria-label="Open all 24 native grading tools and grading table"
              onClick={()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-pattern-studio-command',
                {detail:{command:'grade-manual'}}))}>
              <Grid3X3 size={19}/><span style={{fontSize:9}}>24</span>
            </button>}
            {clothcraftHybrid&&<button type="button" title="Open compact movable Grading Table"
              aria-label="Open compact movable Grading Table"
              onClick={()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-pattern-studio-command',
                {detail:{command:'grade-table'}}))}><Table2 size={19}/></button>}
            {clothcraftHybrid&&<button type="button" title="Open compact movable Compare Length"
              aria-label="Open compact movable Compare Length"
              onClick={()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-pattern-studio-command',
                {detail:{command:'grade-compare'}}))}><Ruler size={19}/></button>}
            {[
              ['rules','Point grade rules','grading',()=>{setTool('grading-edit');setObjectTab('Grading')}],
              ['sizes','Size run manager','grading-auto',()=>setObjectTab('Grading')],
              ['measure','Points of measure','measure',()=>setObjectTab('POM')],
              ['quality','Manufacturing grading QA','points',()=>setObjectTab('Grading')],
              ['markers','Marker layout and yield','polygon-tool',()=>setObjectTab('Grading')],
            ].map(([id,label,icon,action])=><button type="button" key={id} aria-label={label} title={label} className={gradeWorkbenchSection===id?'active':''} aria-pressed={id==='nest'?showGradeNest:gradeWorkbenchSection===id} onClick={event=>{event.stopPropagation();setGradeWorkbenchSection(id);setActiveSection('Production');if(!clothcraftHybrid){setShowObjectBrowser(true);setInspectorVisible(true)}action()}}><CadToolIcon id={icon} size={19}/></button>)}
            <button type="button" title="Export selected piece grade rules CSV" aria-label="Export selected piece grade rules CSV" disabled={!selectedPiece} onClick={exportPieceGradeRules}><Download size={19}/></button>
            <button type="button" title="Import selected piece grade rules CSV" aria-label="Import selected piece grade rules CSV" disabled={!selectedPiece} onClick={()=>gradeRuleCsvInputRef.current?.click()}><Upload size={19}/></button>
            <button type="button" title="Export selected size DXF" aria-label="Export selected size DXF" onClick={exportDxf}><FileDown size={19}/></button>
            <button type="button" title="Export full size run JSON" aria-label="Export full size run JSON" onClick={exportSizeRun}><Layers3 size={19}/></button>
          </div>}
          {!clothcraftHybrid && (rustThemeTokens ? rustThemeNestVisible({isTwoD:viewportLayout==='2d',fullWorkspace:patternFocusActive,nativeTwoD:false}) : viewportLayout==='2d'&&patternFocusActive) && <div className="exo-grade-nest-toggle" aria-label="Full 2D grading nest">
            <button type="button" aria-label="Nest XS to XXL" aria-pressed={showGradeNest} onClick={()=>setShowGradeNest(value=>!value)}>NEST XS–XXL <span>{showGradeNest?'ON':'OFF'}</span></button>
          </div>}
          {(rustThemeTokens ? rustThemeNestVisible({isTwoD:viewportLayout==='2d',fullWorkspace:patternFocusActive,nativeTwoD:clothcraftHybrid}) : viewportLayout==='2d'&&(patternFocusActive||clothcraftHybrid)) && <div className="exo-2d-workspace-shortcuts" aria-label="2D grading and printing workspace">
            {(project.grading?.sizes||[]).map(size=><button type="button" key={size} title={`Preview size ${size}`} aria-label={`Preview size ${size}`} className={gradePreviewSize===size?'active':''} aria-pressed={gradePreviewSize===size} onClick={()=>{setActiveSection('Production');setGradePreviewSize(size)}}><span className="exo-grade-size-label">{size}</span></button>)}
          </div>}
          {viewportLayout==='2d' && gradeWorkbenchSection==='quality' && <div className="exo-grade-left-qa" aria-label="Grading quality status" role="status">{industrialPatternAudit?`${industrialPatternAudit.blockers} pattern blockers · ${industrialCutlineAudit?.blockers??0} cutline blockers`:'Open Production QA'}</div>}
          {viewportLayout==='2d' && <AccuMark2DLibrary
            nativeMode={clothcraftHybrid}
            disabled={Boolean(clothcraftLive?.busy||clothcraftLive?.running)}
            selectedPiece={selectedPiece} project={project} grading={project.grading} previewSize={gradePreviewSize} showGradeNest={showGradeNest}
            focusedGradePoint={focusedGradePoint}
            onSelectSize={size=>{setGradePreviewSize(size);setActiveSection('Production')}}
            onToggleNest={()=>setShowGradeNest(current=>!current)}
            onSetRule={(pointIndex,rule)=>{if(!selectedPiece)return;mutateProject(next=>{const point=next.pieces.find(p=>p.id===selectedPiece.id)?.points?.[pointIndex];if(point)point.industrialGradeRule=structuredClone(rule)})}}
            onClearRule={pointIndex=>{if(!selectedPiece)return;mutateProject(next=>{const point=next.pieces.find(p=>p.id===selectedPiece.id)?.points?.[pointIndex];if(point)delete point.industrialGradeRule})}}
            onApplyGrade={(operation,spec)=>{
              try{
                const work={offset:offsetGradePoint,distribute:distributeGradePoint,smooth:smoothGradePoint,'redistribute-size-line':redistributeSizeLine}[operation]
                if(!work)throw Error('Unknown industrial grading operation')
                const updated=work(project,spec)
                const sizes=updated.grading?.sizes||[]
                for(const size of sizes)gradeProject(updated,size)
                mutateProject(next=>{Object.assign(next,updated)})
                setCommandResult(`Applied ${operation} to the selected piece; ${sizes.length} graded sizes evaluated. Production QA remains required.`)
              }catch(error){setCommandResult(`Grading operation blocked: ${error.message}`);throw error}
            }}
            onApplyDraft={spec=>{
              try{
                const result=applyAccuMarkPatternOperation(project,spec)
                mutateProject(next=>{Object.assign(next,result.project)})
                setCommandResult(`Applied ${spec.kind} to ${spec.pieceId}; ${result.validation.gradedSizes.length} sizes evaluated. Physical QA remains required.`)
              }catch(error){setCommandResult(`Pattern operation blocked: ${error.message}`);throw error}
            }}
            onApplyPointLine={spec=>{
              try{
                const result=applyAccuMarkPointLineOperation(project,spec)
                if(result.project){
                  mutateProject(next=>{Object.assign(next,result.project)})
                  setCommandResult(`Applied ${spec.kind} to ${spec.pieceId}. Review grading and sewing QA.`)
                }else setCommandResult(`Measured ${spec.pieceId} edge ${spec.edgeIndex+1}: ${result.measurement?.lengthCm?.toFixed(3)} cm`)
                return result
              }catch(error){setCommandResult(`Precise pattern tool blocked: ${error.message}`);throw error}
            }}
            onApplyGradeAxis={spec=>{
              try{
                const result=applyAccuMarkGradeAxisOperation(project,spec)
                mutateProject(next=>{Object.assign(next,result.project)})
                setCommandResult(`Applied ${spec.kind} ${spec.axis.toUpperCase()} to ${spec.target.pieceId} P${spec.target.pointIndex+1}; ${result.validation.sizes.length} graded sizes evaluated. Sewline QA is still required.`)
                return result
              }catch(error){setCommandResult(`Single-axis grade blocked: ${error.message}`);throw error}
            }}
            onEditGradeDelta={spec=>{
              try{
                const result=editAccuMarkGradeDelta(project,spec)
                if(!result?.project||!result?.validation?.sizes?.length)throw Error('Grading engine returned no validated size run')
                mutateProject(next=>{Object.assign(next,result.project)})
                setGradePreviewSize(spec.size)
                setShowGradeNest(true)
                setCommandResult(`Grade delta edited at ${spec.pieceId} P${spec.pointIndex+1} for ${spec.size}; verified ${result.validation.sizes.length} sizes. Sewing QA remains required.`)
                return result
              }catch(error){setCommandResult(`Precise grade blocked: ${error.message}`);throw error}
            }}
            onApplyGradeBatch={spec=>{
              try{
                const result=applyAccuMarkGradeBatch(project,spec)
                if(!result?.project||!result?.validation?.sizes?.length)throw Error('Batch grading engine returned no validated size run')
                mutateProject(next=>{Object.assign(next,result.project)})
                setShowGradeNest(true)
                setCommandResult(`Copied ${spec.axis||'both'} grading to ${spec.targets.length} points; ${result.validation.sizes.length} sizes verified. Production QA remains required.`)
                return result
              }catch(error){setCommandResult(`Batch grading blocked: ${error.message}`);throw error}
            }}
            onApplyJoinedGrade={spec=>{
              try{
                const result=applyAccuMarkJoinedEndGradeRule(project,spec)
                if(!result?.project||!result?.validation?.sizes?.length)throw Error('Joined-end grading did not verify all sizes')
                mutateProject(next=>{Object.assign(next,result.project)})
                setShowGradeNest(true)
                setCommandResult(`Applied ${spec.policy} grading on ${spec.pieceId} P${spec.pointIndex+1}; ${result.validation.sizes.length} sizes checked. Check sewn corner continuity and final QA.`)
                return result
              }catch(error){setCommandResult(`Joined-end grading blocked: ${error.message}`);throw error}
            }}
            onApplyGradedNotch={spec=>{
              try{
                const result=applyAccuMarkGradedNotchDistance(project,spec)
                if(!result?.project||!result?.validation?.sizes?.length)throw Error('Physical notch grade did not verify all sizes')
                mutateProject(next=>{Object.assign(next,result.project)})
                setShowGradeNest(true)
                setCommandResult(`Graded notch ${spec.notchId} fixed to ${spec.distanceCm} cm from ${spec.from}; ${result.validation.sizes.length} physical size stations checked. Sewline QA remains required.`)
                return result
              }catch(error){setCommandResult(`Graded notch blocked: ${error.message}`);throw error}
            }}
            onApplyConstraint={spec=>{
              try{
                const updated=applyAccuMarkGradeConstraint(project,spec)
                mutateProject(next=>{Object.assign(next,updated)})
                setCommandResult(`Applied ${spec.kind} to ${spec.pieceId} point ${spec.pointIndex}; all graded sizes passed point constraint residuals.`)
              }catch(error){setCommandResult(`Grading constraint blocked: ${error.message}`);throw error}
            }}
            onImportDigitized={result=>{
              if(!result?.validation?.ok||!result.project||!result.piece)throw Error('Invalid digitized piece result')
              mutateProject(next=>{Object.assign(next,result.project)})
              setSelectedPieceId(result.piece.id)
              setCommandResult(`Imported calibrated piece ${result.piece.name}. ${result.warnings?.length||0} annotations need separate mapping. Review seam and grading QA.`)
            }}
            onApplyProject={(nextProject,message)=>{
              // Reapply is an exceptional, already-calculated persistent graph
              // transaction. Verify it against the authoritative source here;
              // ordinary source edits use the automatic guarded propagation.
              let verifiedAllowanceReapply=null
              if(project.industrialAllowanceGraph && nextProject?.industrialAllowanceGraph){
                try {
                  const checked=reapplyIndustrialAllowanceGraph(project,{expectedRevision:project.revision}).project
                  if(JSON.stringify(checked)===JSON.stringify(nextProject))
                    verifiedAllowanceReapply=checked
                }catch { /* ordinary edit retains the strict reactive guard */ }
              }
              mutateProject(next=>{Object.assign(next,nextProject)},{verifiedAllowanceReapply})
              setCommandResult(message||'Updated 2D pattern project; review grading and manufacturing QA.')
            }}
            onError={setCommandResult}
            onExecute={command=>{
              const route=command.route
              if(!route||route.kind==='reference')return
              if(route.kind==='slot'){activateCloTool({id:route.target,label:command.label},'2d');return}
              if(route.kind==='tool'){
                setTool(route.target);setActiveFinishingTool(null)
                rustCommand(`mode:${['vector-pen','vector-pencil'].includes(route.target)?'pen':'edit'}`)
                window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:route.target}}))
                return
              }
              if(route.kind==='inspector'){
                if(route.target==='workspace'){setStudioSettingsTab('workspace');setStudioSettingsOpen(true);return}
                if(route.target==='models'){setFileLibraryOpen(true);return}
                if(route.target==='commands'){setCommandPaletteOpen(true);return}
                setActiveSection(route.target==='sewing'?'Sewing':route.target==='pattern'?'Pattern':'Production')
                if(route.target==='grading'||route.target==='quality'||route.target==='markers'){
                  setGradeWorkbenchSection(route.target==='quality'?'quality':route.target==='markers'?'markers':'rules')
                  setObjectTab('Grading')
                }else if(route.target==='pom')setObjectTab('POM')
                if(!clothcraftHybrid||(viewportLayout!=='2d'&&!patternFocusActive)){
                  setShowObjectBrowser(true);setInspectorVisible(true)
                }
                return
              }
              if(route.kind==='toggle-nest'){setShowGradeNest(current=>!current);return}
              if(route.kind==='export-dxf'){exportDxf();return}
              if(route.kind==='export-size-run'){exportSizeRun();return}
              if(route.kind==='import-dxf'){factoryDxfReferenceInputRef.current?.click();return}
              if(route.kind==='export-rules'){if(selectedPiece)exportPieceGradeRules();return}
              if(route.kind==='import-rules'){if(selectedPiece)gradeRuleCsvInputRef.current?.click();return}
              if(route.kind==='export-factory-package'){exportFactoryPackage();return}
              setCommandResult(`This operation is indexed for engineering; no executable 2D command is mapped: ${command.label}`)
            }}/>}
          {clothcraftHybrid && viewportLayout==='2d' && <PatternDesignToolPanel activeTool={tool}
            disabled={Boolean(clothcraftLive?.busy||clothcraftLive?.running)} onSlot={activateCloTool}
            onTool={id=>{setTool(id);setActiveFinishingTool(null);rustCommand(`mode:${['vector-pen','vector-pencil'].includes(id)?'pen':'edit'}`);
              window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:id}}));
            }}/>}
          {!clothcraftHybrid && <>
          <span className="rail-divider" /><div className="clo-rail-section"><strong>2D PATTERN</strong></div>
          <div className="clo-left-3d-double-bars clo-left-secondary-bars" aria-label="Pattern shortcuts in two columns">
            <div className="clo-left-3d-column">
              <button className={tool === 'select' ? 'active' : ''} onClick={() => setTool('select')} title="Select / move"><CadToolIcon id="select-2d" size={20}/></button>
              <button className={tool === 'point' ? 'active' : ''} onClick={() => setTool('point')} title="Edit points"><CadToolIcon id="points" size={20}/></button>
              <button className={tool === 'split' ? 'active' : ''} onClick={() => setTool('split')} title="Split edge / add point"><CadToolIcon id="split" size={20}/></button>
              <button className={tool === 'curve' ? 'active' : ''} onClick={() => setTool('curve')} title="Curve edges"><CadToolIcon id="curve" size={20}/></button>
              <button className={tool === 'internal' ? 'active' : ''} onClick={() => setTool('internal')} title="Internal line / dart"><CadToolIcon id="internal" size={20}/></button>
            </div>
            <div className="clo-left-3d-column">
              <button onClick={addPolygonPiece} title="Add pattern" aria-label="Add clipped-corner polygon pattern"><CadToolIcon id="polygon-tool" size={20}/></button>
              <button className={tool === 'notch' ? 'active' : ''} onClick={() => setTool('notch')} title="Add notch"><CadToolIcon id="notch" size={20}/></button>
              <button className={tool === 'fastener' ? 'active' : ''} onClick={() => setTool('fastener')} title="Button / snap / hook fastener"><CadToolIcon id="fastener" size={20}/></button>
              <button className={tool === 'measure' ? 'active' : ''} onClick={() => setTool('measure')} title="Tape measure"><CadToolIcon id="measure" size={20}/></button>
            </div>
          </div>
          <span className="rail-divider" />
          <button onClick={deleteSelectedPiece} disabled={!selectedPiece} title="Delete selected"><CadToolIcon id="delete-piece" size={20}/></button>
          <button onClick={() => setCompactTools(value => !value)} title="Compact / expanded toolbar"><CadToolIcon id="settings" size={20}/></button>
          <span className="rail-divider"/><div className="clo-rail-section"><strong>VIEW & EDIT</strong></div>
          <button onClick={() => setShow2DGrid(value => !value)} className={show2DGrid ? 'active' : ''} title="Show or hide 2D drafting grid"><CadToolIcon id="grid-2d" size={20}/></button>
          <button onClick={() => setShow2DSeams(value => !value)} className={show2DSeams ? 'active' : ''} title="Show or hide 2D sewing links"><CadToolIcon id="seam-links" size={20}/></button>
          <button onClick={() => setActiveSection('Fabric')} title="Open fabric properties"><CadToolIcon id="fabric" size={20}/></button>
          <button onClick={() => setActiveSection('Avatar')} title="Open avatar properties"><CadToolIcon id="avatar" size={20}/></button>
          <button onClick={() => setActiveSection('Sewing')} title="Open sewing inspector"><CadToolIcon id="sewing-inspector" size={20}/></button>
          <button onClick={() => setActiveSection('Pattern')} title="Open selected pattern properties"><CadToolIcon id="pattern-properties" size={20}/></button>
          <button onClick={() => setActiveSection('Fit')} title="Open fitting and simulation controls"><CadToolIcon id="fit" size={20}/></button>
          <button onClick={() => setActiveSection('Production')} title="Open production and grading"><CadToolIcon id="grading" size={20}/></button>
          <button onClick={() => setActiveSection('Render')} title="Open renderer settings"><CadToolIcon id="render" size={20}/></button>
          <button onClick={() => setFitCameraSignal(value => value + 1)} title="Frame avatar in 3D"><CadToolIcon id="camera" size={20}/></button>
          <button onClick={() => duplicateSelectedPiece(false)} disabled={!selectedPiece} title="Duplicate selected pattern"><CadToolIcon id="duplicate-piece" size={20}/></button>
          <button onClick={() => duplicateSelectedPiece(true)} disabled={!selectedPiece} title="Create mirrored pattern copy"><CadToolIcon id="mirror" size={20}/></button>
          <button onClick={() => setShowObjectBrowser(value => !value)} title="Show or hide object browser"><CadToolIcon id="panel" size={20}/></button>
          <button onClick={() => { setAssetCategory('Fabric');setLibraryFolder('all'); setLibrarySearch(''); setLibraryVisible(true); setSidebarView('library') }} title="Browse fabric assets"><CadToolIcon id="fabric-roll" size={20}/></button>
          <button onClick={() => { setObjectTab('Topstitch'); setActiveSection('Sewing') }} title="Open topstitch object browser"><CadToolIcon id="topstitch" size={20}/></button>
          <button onClick={() => { setObjectTab('Button'); setActiveSection('Sewing') }} title="Open button object browser"><CadToolIcon id="buttons" size={20}/></button>
          <button onClick={() => { setObjectTab('Trim'); setActiveSection('Sewing') }} title="Open trims and zipper browser"><CadToolIcon id="trim" size={20}/></button>
          <button onClick={() => { setObjectTab('Grading'); setActiveSection('Production') }} title="Open size grading browser"><CadToolIcon id="grading" size={20}/></button>
          <button onClick={() => { setObjectTab('POM'); setActiveSection('Production') }} title="Open points-of-measure browser"><CadToolIcon id="pom" size={20}/></button>
          <button onClick={() => { setAnalysisMode('pressure'); setActiveSection('Fit') }} title="Inspect garment pressure distribution"><CadToolIcon id="pressure" size={20}/></button>
          </>}
        </aside>

        <section className={`workspaces workspace-layout-${viewportLayout} ${clothcraftHybrid ? 'cc-rust-embedded' : ''}`} aria-label="3D and 2D windows" data-viewport-layout={viewportLayout} style={{ '--viewport-left-percent': `${viewportSplit}%`,position:'relative' }}>
          <StudioWorkspaceWidgets value={studioCustomization} onAction={runCustomToolbarAction} onChange={updateStudioCustomization} onCustomize={()=>{setStudioSettingsTab('customWorkspace');setStudioSettingsOpen(true)}}/>
          <StudioCustomToolbarCollection value={studioCustomization} gradeNestEnabled={clothcraftHybrid?nativeNestVisible:showGradeNest} onAction={runCustomToolbarAction} onChange={updateStudioCustomization} onCustomize={()=>{setStudioSettingsTab('customToolbar');setStudioSettingsOpen(true)}}/>
          <StudioCustomToolbar value={studioCustomization} onAction={runCustomToolbarAction}
            onChange={updateStudioCustomization} onCustomize={()=>setStudioSettingsOpen(true)}/>
          {!clothcraftHybrid&&printLayoutActive&&<div className="exo-legacy-print-viewport" role="region" aria-label="Print Layout replacing 2D pattern window">
            <PrintLayoutStudio source={project} revision={project.revision} onClose={exitFocusedWorkspace} embedded/>
          </div>}
          <CloFinishingToolWidgets openSewing={activeFinishingTool==='sewing'} openSteam={activeFinishingTool==='steam'}
            active={activeFinishingTool} onActivate={setActiveFinishingTool} onClose={()=>{setActiveFinishingTool(null);setTool(current=>['steam-preview','seam-measure'].includes(current)?'select':current)}}
            selection={clothcraftLive?.selection} seamRefs={clothcraftLive?.seamRefs||[]}
            seamMeasurements={clothcraftLive?.seamMeasurements||[]}
            onSelectSeam={seamId=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-seam',{detail:{seamId}}))}/>
          {clothcraftHybrid ? <ClothCraftWorkspace embedded exoSection={activeSection} exoObjectTab={objectTab} exoLayout={viewportLayout} exoSplit={viewportSplit}
            environmentPreset={project.render?.environmentPreset || 'studio'} stageId={normalizeStageId(project.render?.stageId)}
            stageSettings={project.render?.stageSettings||{}}
            onRemoveStage={()=>updateRenderSetting('stageId','none')}
            onCollapse3D={collapse3DForPatterns} onTogglePatternStudio={viewportLayout==='2d'?restoreCollapsed3D:collapse3DForPatterns} patternStudioActive={viewportLayout==='2d'}
            onToggle3DStudio={toggle3DStudio} studio3DActive={viewportLayout==='3d'}
            animationWorkspaceActive={animationWorkspaceActive} printLayoutActive={printLayoutActive} onExitPrintLayout={exitFocusedWorkspace}
            patternReferences={nativePatternReferences} onUpdatePatternReferences={updateNativePatternReferences}
            cameraSettings={project.render?.camera||null} sceneLight={project.render?.light||null}
            sceneLight2={project.render?.light2||null} exposure={project.render?.exposure??1.1} studioAppearance={studioCustomization.appearance} studioPreferences={rustUiPreferences} workspaceGrid={show2DGrid} workspaceSeams={showSewingGuides}/> : <>
          {zozoReference ? <div className="viewport-shell zozo-reference-shell" data-testid="zozo-reference-workspace">
            <div className="workspace-head viewport-head">
              <div><strong>ZOZO GITHUB DRESS · RUST/METAL REFERENCE</strong><span>14 original panels · 851 sewing constraints · read-only cached simulation</span></div>
              <div className="sim-indicator"><i/>EXPERIMENTAL · NOT VERIFIED FIT</div>
            </div>
            <ZozoReferenceDressViewer reference={zozoReference} frame={zozoReferenceFrame} showBody={zozoReferenceBodyVisible}/>
          </div> : <GarmentViewport
            project={displayProject}
            stageSettings={project.render?.stageSettings||{}}
            onRemoveStage={()=>updateRenderSetting('stageId','none')}
            studioAppearance={studioCustomization.appearance}
            studioPreferences={studioCustomization.preferences}
            ppfPreview={ppfPreview}
            running={running}
            hasSimulated={hasSimulated}
            resetSignal={resetSignal}
            wireframe={wireframe}
            analysisMode={analysisMode}
            backendId={displayProject.simulation?.backendId || 'browser-pbd'}
            nativeSolveSignal={nativeSolveSignal}
            nativeQuality={displayProject.simulation?.nativeQuality || 'draft'}
            exportSignal={meshExportSignal}
            glbExportSignal={glbExportSignal}
            renderSignal={renderSignal}
            hdriUrl={hdriUrl}
            customAvatar={customAvatar}
            viewportTool={viewportTool}
            onMeshSelection={setMeshSelection}
            fitCameraSignal={fitCameraSignal}
            selectedPieceId={selectedPieceId}
            onSelectPiece={selectIn3D}
            onChangeViewportTool={setViewportTool}
            onCollapse3D={collapse3DForPatterns}
            onToggleWireframe={() => setWireframe(value => !value)}
            onToggleSewingGuides={() => setShowSewingGuides(value => !value)}
            onChangeAnalysisMode={setAnalysisMode}
            showSewingGuides={showSewingGuides}
            highlightSeamId={activeSection === 'Sewing' ? seamWalkId : null}
            arrangementSpread={arrangementSpread}
            onMoveStagedPanel={moveStagedPanel}
            onExportMesh={downloadObj}
            onExportGlb={downloadGlb}
            onRenderStill={downloadRenderStill}
            onStats={setStats}
            onNativeSolve={handleNativeSolve}
          />}
          <PatternEditor
            project={displayProject}
            expanded2D={viewportLayout==='2d'||patternFocusActive}
            full2D={patternFocusActive}
            studioPreferences={rustUiPreferences}
            gradeSourceProject={activeSection==='Production'||viewportLayout==='2d'?project:null}
            gradePreviewSize={gradePreviewSize}
            onGradePointSelected={setFocusedGradePoint}
            gradeBusy={Boolean(clothcraftLive?.busy||clothcraftLive?.running)}
            onGradePointDrag={spec=>{
              try{
                const result=buildAccuMarkGradePointDragProposal(project,spec)
                if(!result?.project||!result?.validation?.sizes?.length)
                  throw Error('No validated graded size run returned')
                mutateProject(next=>{Object.assign(next,result.project)})
                setFocusedGradePoint({pieceId:spec.pieceId,pointIndex:spec.pointIndex})
                setGradePreviewSize(spec.size)
                setShowGradeNest(true)
                setCommandResult(`Moved ${spec.pieceId} point ${spec.pointIndex+1}, size ${spec.size}: X ${spec.dxCm.toFixed(3)} cm, Y ${spec.dyCm.toFixed(3)} cm; validated ${result.validation.sizes.length} sizes. Undo is available. Physical seam QA required.`)
                return result
              }catch(error){
                setCommandResult(`Grade point edit blocked: ${error.message}`)
                throw error
              }
            }}
            showGradeNest={showGradeNest}
            onToggleGradeNest={setShowGradeNest}
            onSelectGradeSize={size=>{setGradePreviewSize(size);setActiveSection('Production')}}
            showGrid={show2DGrid}
            showSeamLinks={show2DSeams}
            layout2DSignal={layout2DSignal}
            onToggleGrid={() => setShow2DGrid(value => !value)}
            onToggleSeams={() => setShow2DSeams(value => !value)}
            onAutoArrange={tidy2DPatterns}
            gradeNestProjects={gradeNestProjects}
            highlightSeamId={activeSection === 'Sewing' ? seamWalkId : null}
            selectedPieceId={selectedPieceId}
            tool={activeSection === 'Production' && gradePreviewSize !== project.grading?.baseSize ? 'inspect' : tool}
            onSelectPiece={selectIn3D}
            onSelectedEdgeChange={onDraftEdgeSelection}
            onMovePiece={movePiece}
            onMoveFoamPadding={(pieceId,padId,fields)=>updateFoamPadding(pieceId,padId,fields,{record:false})}
            onChangeTool={setTool}
            onMovePoint={movePoint}
            onSetPoint={setPointPrecision}
            onMoveCurve={moveCurve}
            onSetCurve={setCurvePrecision}
            onSetEdgeAllowance={updatePatternEdgeAllowance}
            onSplitEdge={splitPatternEdge}
            onSplitEdgePrecise={splitPatternEdgePrecise}
            onUnfoldEdge={unfoldPatternEdge}
            onDeletePoint={deletePatternPoint}
            onDeletePiece={deletePieceById}
            onCreatePin={createPin}
            onRemovePin={removePin}
            onCreateInternalLine={createInternalLine}
            onCreateNotch={createNotch}
            onCreateSeam={createSeam}
            onCreateFastener={createFastener}
            onCreateMeasurement={createCustomMeasurement}
            onBeginGesture={beginGesture}
            onEndGesture={endGesture}
          />
          {['split','stack'].includes(viewportLayout) && <div className="clo-viewport-resizer" role="separator" tabIndex={0} aria-orientation={viewportLayout === 'stack' ? 'horizontal' : 'vertical'} aria-label="Resize 3D and 2D windows" aria-valuemin={20} aria-valuemax={80} aria-valuenow={viewportSplit} aria-valuetext={`${viewportSplit}% 3D window, ${100-viewportSplit}% 2D window`} title="Drag to resize 3D / 2D · double-click for equal windows" onPointerDown={beginViewportResize} onPointerMove={moveViewportResize} onPointerUp={endViewportResize} onLostPointerCapture={endViewportResize} onDoubleClick={() => setViewportSplit(50)} onKeyDown={event => {
            const increment = viewportLayout === 'stack' ? 'ArrowDown' : 'ArrowRight'
            const decrement = viewportLayout === 'stack' ? 'ArrowUp' : 'ArrowLeft'
            if (event.key === increment || event.key === decrement) { event.preventDefault(); setViewportSplit(value => clamp(value + (event.key === increment ? 5 : -5), 20, 80)) }
            if (event.key === 'Home') { event.preventDefault(); setViewportSplit(20) }
            if (event.key === 'End') { event.preventDefault(); setViewportSplit(80) }
          }}><span/></div>}
          </>}
          {techPackWorkspaceOpen&&(!clothcraftHybrid||!nativeTechPackLoading)&&<TechPackWorkspace
            project={project} nativeMode={clothcraftHybrid} nativeSnapshot={nativeTechPackSnapshot}
            nativeGraphics={clothcraftLive?.graphicRefs||[]} value={clothcraftHybrid?nativeTechPackDraft:project.nativeTechPackWorkspace}
            storageError={nativeTechPackSaveError}
            onChange={nextState=>{
              if(clothcraftHybrid){
                setNativeTechPackDraft(nextState)
                const key=String(clothcraftLive?.referenceKey||clothcraftLive?.name||'default')
                void saveNativeTechPackWorkspace(key,nextState).then(()=>setNativeTechPackSaveError(''))
                  .catch(error=>setNativeTechPackSaveError(`Tech pack could not be saved: ${error.message}`))
              }else{setProject(current=>({...current,nativeTechPackWorkspace:nextState}));setSaveState('modified')}
            }}
            onClose={()=>setTechPackWorkspaceOpen(false)}/>}
        </section>

        {!inspectorVisible&&<button type="button" className="exo-reopen-inspector-arrow" aria-label="Expand Object Browser and Property Editor panel" aria-expanded={false} onPointerDown={event=>event.stopPropagation()} onClick={event=>{event.preventDefault();event.stopPropagation();setInspectorVisible(true)}} title="Expand Object Browser and Property Editor"><ChevronLeft size={14}/></button>}
        {/* The right 2D tools and the browser/editor use separate visibility
            state despite sharing a parent. Only hide this parent if BOTH are
            closed. Previously the inverted predicate hid it when the toolbar
            was open and the browser closed. */}
        <aside className="inspector clo-inspector" hidden={!inspectorVisible&&rightToolsCollapsed}>

          <div className="clo-panel-resizer clo-right-resizer" role="separator" aria-orientation="vertical" aria-label="Resize Inspector width" title="Drag to resize Object Browser and Property Editor" onPointerDown={(event) => beginPanelResize('inspector', event)} onPointerMove={movePanelResize} onPointerUp={endPanelResize} onLostPointerCapture={endPanelResize} onDoubleClick={() => setInspectorWidth(392)}/>
          <div id="exo-techpack-right-tools-host" className="exo-techpack-right-tools-host" hidden={!techPackWorkspaceOpen}/>
          {!rightToolsCollapsed && <RightToolPalette activeSection={activeSection} viewportTool={viewportTool} tool={tool} setViewportTool={value=>{setViewportTool(value);if(clothcraftHybrid){const modes={orbit:'edit',transform:'move3d',move:'move3d',rotate:'rotate3d',hand:'stretch3d'};if(modes[value])rustCommand(`mode:${modes[value]}`)}}} setTool={setTool} setActiveSection={clothcraftHybrid?()=>{}:setActiveSection} setObjectTab={clothcraftHybrid?()=>{}:setObjectTab} onRevealBrowser={clothcraftHybrid?()=>{}:()=>setShowObjectBrowser(true)} showSewingGuides={showSewingGuides} setShowSewingGuides={setShowSewingGuides} wireframe={wireframe} setWireframe={setWireframe} analysisMode={analysisMode} setAnalysisMode={setAnalysisMode} toggleSimulation={simForVisibleEngine} resetSimulation={resetForVisibleEngine} onReset2d={() => clothcraftHybrid ? rustCommand('reset-2d') : resetSimulation()} exportProject={exportForVisibleEngine} onFitCamera={() => clothcraftHybrid ? window.dispatchEvent(new Event('exo-clothcraft-fit-camera')) : setFitCameraSignal(value => value + 1)} onMirrorSelected={() => clothcraftHybrid ? rustCommand('mirror-selected') : duplicateSelectedPiece(true)} onCreatePolygon={addPolygonPiece} onCloTool={activateCloTool} activeFinishingTool={activeFinishingTool} onOtherToolSelect={()=>{setActiveFinishingTool(null);if(clothcraftHybrid)window.dispatchEvent(new CustomEvent('exo-clothcraft-toolbar-activated',{detail:{nativeAction:null}}))}} nativeClothcraft={clothcraftHybrid} full2D={viewportLayout==='2d'} running={visibleRunning} extraToolIds={studioCustomization.workspace.extraRightToolIds}
            toolbarEditMode={studioCustomization.workspace.toolbarEditMode && !patternFocusActive}
            toolbarDock={studioCustomization.workspace.rightToolbarDock}
            toolbarPosition={studioCustomization.workspace.rightToolbarPosition}
            toolbarOrder={patternFocusActive ? patternFocusToolbarIds(studioCustomization.workspace.rightToolbarIds) : studioCustomization.workspace.rightToolbarIds}
            onToolbarPositionChange={position=>setStudioCustomization(previous=>normalizeStudioCustomization({...previous,workspace:{...previous.workspace,rightToolbarPosition:position}}))}
            onToolbarOrderChange={ids=>{if(!patternFocusActive)setStudioCustomization(previous=>normalizeStudioCustomization({...previous,workspace:{...previous.workspace,rightToolbarIds:ids}}))}}
            onToolbarDockChange={dock=>setStudioCustomization(previous=>normalizeStudioCustomization({...previous,workspace:{...previous.workspace,rightToolbarDock:dock}}))}/>}
          <div className="clo-inspector-content" hidden={!inspectorVisible}>
          <button type="button" className="exo-object-inspector-header-arrow" aria-label={inspectorVisible?'Collapse Object Browser and Property Editor panel':'Expand Object Browser and Property Editor panel'} aria-expanded={inspectorVisible} onClick={()=>setInspectorVisible(false)} title="Collapse Object Browser and Property Editor"><ChevronRight size={14}/></button>
          <div id="exo-techpack-object-host" className="exo-techpack-object-host" hidden={!techPackWorkspaceOpen}/>

          {printLayoutActive&&<div id="exo-print-layout-property-host" className="exo-print-layout-property-host" aria-label="Print Layout Property Editor"/>}
          {!printLayoutActive&&showObjectBrowser && <ObjectBrowser tab={objectTab} setTab={setObjectTab} project={project} setSelectedPieceId={selectIn3D} setSelectedFabricId={setSelectedFabricId}
            onEnvironmentSelect={selection=>{
              setEnvironmentSelection(selection)
              if(selection){setSelectedObjectForProperties(null);setSelectedDraftEdge(null)}
            }}
            nativeImportedHardware={clothcraftLive?.importedHardware||[]}
            selectedObject={selectedObjectForProperties} selectedHardwarePreset={selectedObjectForProperties?.source==='library'?getHardwarePreset(selectedObjectForProperties.id):null}
            nativeMode={clothcraftHybrid} nativePanelRefs={clothcraftLive?.panelRefs||[]} nativeFabricRefs={clothcraftLive?.fabricRefs||[]} nativeGraphicRefs={clothcraftLive?.graphicRefs||[]} nativeGraphicsDisabled={Boolean(clothcraftLive?.busy||clothcraftLive?.running)}
            referenceProjectKey={referenceLoadedKey===referenceProjectKey?referenceProjectKey:null}
            referenceItems={nativePatternReferences} onReferenceChange={updateNativePatternReferences}
            selectedReferenceId={selectedNativeReferenceId} onReferenceSelect={setSelectedNativeReferenceId}
            showGraphicMeasurements={graphicMeasurementsVisible}
            onToggleGraphicMeasurements={visible=>{
              setGraphicMeasurementsVisible(visible)
              window.dispatchEvent(new CustomEvent('exo-clothcraft-set-graphic-measurements',{detail:{visible}}))
            }}
            nativeSelectedObject={clothcraftHybrid&&objectTab==='Graphic'?{id:clothcraftLive?.selectedGraphicId}:selectedObjectForProperties||((clothcraftHybrid&&clothcraftLive?.selection?.kind==='pattern')?{id:clothcraftLive.selection.panelId}:null)}
            onNativePanelSelect={id=>rustCommand('select:'+id)}
            onNativeFabricSelect={id=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-fabric',{detail:{id}}))}
            onNativeGraphicSelect={id=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-graphic',{detail:{id}}))}
            onNativeGraphicVisibilityChange={(id,visible)=>window.dispatchEvent(new CustomEvent('exo-clothcraft-graphic-visibility',{detail:{id,visible}}))}
            onNativeGraphicAdd={()=>window.dispatchEvent(new Event('exo-clothcraft-add-graphic'))}
            onCopyObject={copyObjectBrowserRow}
            onAssignObject={assignObjectBrowserRow}
            onFabricTextureRepeat={id=>{
              if(!clothcraftHybrid)setSelectedFabricId(id)
              setActiveSection('Fabric')
              setObjectTab('Fabric')
              window.requestAnimationFrame(()=>document.querySelector('[data-fabric-texture-repeat]')?.scrollIntoView({block:'nearest',behavior:'smooth'}))
            }}
            onFabricAddPrint={()=>{
              setObjectTab('Graphic')
              setActiveSection('Fabric')
              if(clothcraftHybrid)window.requestAnimationFrame(()=>window.dispatchEvent(new Event('exo-clothcraft-add-graphic')))
              else graphicInputRef.current?.click()
            }}
            onSelectedObjectChange={value=>{setEnvironmentSelection(null);setSelectedObjectForProperties(value);if(value)setSelectedDraftEdge(null)}}
            onCreateObject={createBrowserConstructionObject}
            onRemoveObject={removeBrowserConstructionObject}
            onObjectVisibilityChange={(selection,visible)=>{
              if(selection?.source==='imported'){
                if(clothcraftHybrid)nativeImportedHardwareCommand({action:'update',id:selection.itemId,field:'visible',value:visible}).then(result=>{if(!result.ok)setCommandResult(result.error)})
                else mutateProject(next=>{const item=next.pieces.find(p=>p.id===selection.pieceId)?.importedHardwarePlacements?.find(x=>x.id===selection.itemId);if(item)item.visible=visible})
              }else editCloObjectProperty(selection,'visible',visible)
            }}
            onApplyFabric={assignFabric} setActiveSection={setActiveSection} selectedPieceId={selectedPieceId} selectedFabricId={selectedFabricId} onAddFabric={addFabricSwatch} onAddPattern={addPiece} onTogglePieceProperty={(pieceId, field) => mutateProject(next => { const piece = next.pieces.find(item => item.id === pieceId); if (piece && (field === 'visible3d' || field === 'locked')) piece[field] = field === 'visible3d' ? piece.visible3d === false : !piece.locked })}/>}
          {!printLayoutActive&&showObjectBrowser && <div className="clo-browser-resizer" role="separator" aria-orientation="horizontal" aria-label="Resize Object Browser height" title="Drag to resize Object Browser and Property Editor" onPointerDown={(event) => beginPanelResize('objects', event)} onPointerMove={movePanelResize} onPointerUp={endPanelResize} onLostPointerCapture={endPanelResize} onDoubleClick={() => setObjectBrowserHeight(390)}><span/></div>}
          <div className="clo-property-panel" hidden={printLayoutActive}>
            <div id="exo-techpack-properties-host" className="exo-techpack-properties-host" hidden={!techPackWorkspaceOpen}/>
            {environmentSelection&&<SceneEnvironmentPropertyEditor selection={environmentSelection}
              settings={environmentSelection?.id==='light-2'
                ?{...(project.render||{}),camera:{...initialSceneCamera,...(project.render?.camera||{})},light:project.render?.light2}
                :{...(project.render||{}),camera:{...initialSceneCamera,...(project.render?.camera||{})}}}
              onChange={editSceneEnvironmentProperties}/>}
            <div hidden={Boolean(environmentSelection)}>
            {importedSelection&&<ImportedHardwareInspector
              asset={importedSelection.asset||importedPlacement}
              placement={importedPlacement}
              nativeMode={clothcraftHybrid}
              canUndoHardware={Boolean(clothcraftLive?.canUndoHardware)} canRedoHardware={Boolean(clothcraftLive?.canRedoHardware)}
              onUndoHardware={()=>nativeImportedHardwareCommand({action:'undo'}).then(result=>{if(!result.ok)setCommandResult(result.error||'Nothing to undo in imported hardware history')})}
              onRedoHardware={()=>nativeImportedHardwareCommand({action:'redo'}).then(result=>{if(!result.ok)setCommandResult(result.error||'Nothing to redo in imported hardware history')})}
              selectedPanelName={importedPanelName}
              onPlace={placeImportedCloAsset}
              onEdit={editImportedCloPlacement}
              onRemove={removeImportedCloPlacement}
              onDuplicate={duplicateImportedCloPlacement}/>}
            <div hidden={Boolean(importedSelection)}>
            {activeSection==='Render'&&normalizeStageId(project.render?.stageId)!=='none'&&
              <StagePropertyPanel stageId={project.render?.stageId} stageSettings={project.render?.stageSettings||{}}
                renderSettings={project.render||{}}
                onStageSettingChange={updateStageSetting}
                onRenderSettingChange={updateRenderSetting}
                onRemoveStage={()=>updateRenderSetting('stageId','none')}/>}
            {clothcraftHybrid&&foamPropertySelection&&<FoamMaterialPropertyEditor pad={foamPropertySelection}
              onChange={material=>window.dispatchEvent(new CustomEvent('exo-clothcraft-foam-material-edit',{detail:{id:foamPropertySelection.id,material}}))}
              onClose={()=>setFoamPropertySelection(null)}/>}
            <div hidden={Boolean(clothcraftHybrid&&foamPropertySelection)}>
            <CloPropertyEditorAccordion activeSection={activeSection} selectedPiece={selectedPiece}
              project={project} fabric={fabric} selectedArea={selectedArea}
              clothcraftHybrid={clothcraftHybrid} clothcraftLive={clothcraftLive}
              draftLineSelection={draftLineSelection}
              objectSelection={selectedObjectForProperties}
              onSwitchSection={setActiveSection}
              onShowFabric={()=>{
                setActiveSection('Fabric');setObjectTab('Fabric');setShowObjectBrowser(true)
                if(clothcraftHybrid){
                  const id=clothcraftLive?.selection?.fabricId
                  const found=clothcraftLive?.fabricRefs?.find(f=>f.id===id)
                  setSelectedObjectForProperties(found?{...found,source:'native',type:'fabric'}:null)
                  if(id)window.dispatchEvent(new CustomEvent('exo-clothcraft-select-fabric',{detail:{id}}))
                }
              }}
              onPropertyEdit={editCloObjectProperty}
              onFabricTextureRepeatChange={(field,value)=>updateFabricTexture(field,value)}
              onFabricMapChoose={kind=>{
                const input={color:fabricTextureInputRef,normal:fabricNormalInputRef,
                  displacement:fabricDisplacementInputRef,opacity:fabricOpacityInputRef,
                  roughness:fabricRoughnessInputRef,
                  metalness:fabricMetalnessInputRef}[kind]
                input?.current?.click()
              }}
              onFabricMapRemove={kind=>kind==='color'?removeFabricTexture():removeFabricPbrMap(kind)}
              onHardwareStyleEdit={editHardwareLibraryStyle}
              onPlaceHardwarePreset={placeHardwarePreset}
              onPairZipperToSeam={pairZipperToSeam}
              onNativePropertyEdit={editNativeProperty}
              onFabricPresetImport={importFabricPreset}
              onFabricSelect={id=>{
                if(clothcraftHybrid){
                  window.dispatchEvent(new CustomEvent('exo-clothcraft-select-fabric',{detail:{id}}))
                }else if(project.fabrics?.[id]){
                  setSelectedFabricId(id)
                  setSelectedObjectForProperties({source:'draft',type:'fabric',id,name:project.fabrics[id].name})
                  setObjectTab('Fabric');setActiveSection('Fabric')
                }
              }}
              onSelectNativeSeam={seamId=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-seam',{detail:{seamId}}))}
              objectTab={objectTab}
              referenceProjectKey={referenceLoadedKey===referenceProjectKey?referenceProjectKey:null}
              referenceItems={nativePatternReferences} onReferenceChange={updateNativePatternReferences}
              selectedReferenceId={selectedNativeReferenceId} onReferenceSelect={setSelectedNativeReferenceId}
              onSetLineTarget={(panel,edge,cm)=>window.dispatchEvent(new CustomEvent('exo-clothcraft-property-command',{detail:{type:'target-length',panel,edge,cm}}))}
              onSimulate={simForVisibleEngine} onReset={resetForVisibleEngine}>
          {selectedPiece && activeSection === 'Pattern' && <section className="clo-selected-summary" aria-label="Selected pattern properties">
            <div className="clo-selected-summary-title"><strong>{selectedPiece.name}</strong><span>{selectedPiece.id}</span></div>
            <div className="clo-selected-stats">
              <div><span>Area</span><strong>{selectedArea.toFixed(1)} cm²</strong></div>
              <div><span>Perimeter</span><strong>{selectedPiece.points.reduce((sum, _, i) => sum + edgeLength(selectedPiece, i), 0).toFixed(1)} cm</strong></div>
              <div><span>Vertices</span><strong>{selectedPiece.points.length}</strong></div>
              <div><span>Seam links</span><strong>{project.seams.filter(seam => seam.a?.pieceId === selectedPiece.id || seam.b?.pieceId === selectedPiece.id).length}</strong></div>
            </div>
            <div className="clo-selected-material-row"><span className="clo-fabric-thumb-small" style={{ background: project.fabrics?.[selectedPiece.fabricId || 'main']?.color || '#818a96' }}/><span>{project.fabrics?.[selectedPiece.fabricId || 'main']?.name || 'Unassigned fabric'}</span><button onClick={() => { setObjectTab('Fabric'); setActiveSection('Fabric'); setSelectedFabricId(selectedPiece.fabricId || 'main') }}>EDIT FABRIC</button></div>
          </section>}

          {activeSection === 'Pattern' && (
            <>
              {clothcraftHybrid && <div className="panel-section" aria-label="Native Foam Padding tool">
                <div className="panel-title"><span>Foam Padding / Trapunto</span><strong>SVG → 3D</strong></div>
                <p className="panel-copy">Import cut-out SVG padding shapes, place them on the native pattern, set raised foam thickness, and generate matching stitch-guide paths. Position drafts persist with this native template.</p>
                <button type="button" className="wide-action" onClick={()=>window.dispatchEvent(new Event('exo-clothcraft-open-foam-padding'))}><Layers3 size={14}/>OPEN FOAM PADDING TOOL</button>
                <p className="panel-copy">Raised previews follow the live garment; physical multilayer foam and automated Rust sewing constraints remain under development.</p>
              </div>}
              <div className="panel-section" aria-label="Seamly2D measurement interoperability">
                <div className="panel-title"><span>Seamly2D / SeamlyMe</span><strong>MEASUREMENT BRIDGE</strong></div>
                <p className="panel-copy">Import real SeamlyMe individual (.smis) or multisize (.smms) measurements with centimeter conversion and original size increments retained. No proprietary pattern data is modified.</p>
                <button className="wide-action" onClick={() => seamlyMeasureInputRef.current?.click()}><Upload size={15}/>IMPORT SEAMLY MEASUREMENTS</button>
                {project.measurementLibrary?.seamly && <>
                  <p className="panel-copy">{project.measurementLibrary.seamly.sourceName || 'SeamlyMe measurements'} · {project.measurementLibrary.seamly.measurementCount} values · base {project.measurementLibrary.seamly.kind === 'smms' ? 'multisize' : 'individual'}.</p>
                  <button className="wide-action compact-action" onClick={applySeamlyToAvatar}><Ruler size={15}/>APPLY MEASURED BODY VALUES TO AVATAR</button>
                  <p className="panel-copy">{project.measurementLibrary.seamly.assumptions}</p>
                </>}
                <div className="panel-title"><span>Parametric drafting reference</span><strong>.SM2D</strong></div>
                <p className="panel-copy">Inspect a real Seamly2D source construction graph, tool IDs, pattern blocks and original increment formulas. Imported references are read-only and will not overwrite the editable garment.</p>
                <button className="wide-action compact-action" onClick={() => seamlyPatternInputRef.current?.click()}><Upload size={14}/>LOAD .SM2D CONSTRUCTION REFERENCE</button>
                {project.seamlyConstructionReference && <div className="seamly-construction-reference" aria-label="Imported Seamly2D construction reference">
                  <p className="panel-copy"><strong>{project.seamlyConstructionReference.sourceName || 'Seamly reference'}</strong> · version {project.seamlyConstructionReference.version} · {project.seamlyConstructionReference.toolCount} construction operations · {project.seamlyConstructionReference.incrementCount} formulas</p>
                  {project.seamlyConstructionReference.blocks.map(block=><details key={block.id} className="seamly-reference-block">
                    <summary>{block.name} · {block.toolCount} tools</summary>
                    <ol>{block.nodes.slice(0,14).map(node=><li key={node.id}><strong>{node.name || node.id}</strong> · {node.family}/{node.type}{node.attributes.length ? ` · length ${node.attributes.length}` : ''}</li>)}</ol>
                    {block.toolCount>14 && <small>Showing first 14 operations of {block.toolCount}. Original references and formulas are preserved in the saved project.</small>}
                  </details>)}
                  <p className="panel-copy">{project.seamlyConstructionReference.note}</p>
                </div>}
                <p className="panel-copy">The .sm2d tool graph is a different parametric model from a cut-and-sewn garment. Seamly2D is still required to execute construction formulas and resolve details until an equivalent tested graph evaluator exists.</p>
              </div>
              <SeamlyNativeEngineStudio20261023 nativeMode={clothcraftHybrid} onReferenceImport={openSeamlyCalculatedDraft} onNativeImport={detail=>window.dispatchEvent(new CustomEvent('exo-seamly-native-cut-import-request',{detail}))}/>
              {project.templateId === 'tee' && <div className="panel-section" aria-label="Foundation Tee pattern correction">
                <div className="panel-title"><span>T-shirt pattern engineering</span><strong>SIZE M · SAMPLE</strong></div>
                <p className="panel-copy">The updated regular-fit T-shirt block uses recessed armscyes, independently cut short sleeves, true measured stitch-line dimensions and graded DXF seam allowances. The base pattern matches 14 seam relationships to within 0.11%. Saved garments are only updated by the button below, with Undo available.</p>
                <button className="wide-action" onClick={correctTeeArmholes}><CadToolIcon id="curve" size={17}/>APPLY CORRECTED T-SHIRT BLOCK</button>
                <div className="clo-tee-manufacturing-status"><strong>Production status</strong><span>{project.productionSpec?.approvalStatus === 'FIT_SAMPLE_AND_FACTORY_VALIDATION_REQUIRED' ? 'ENGINEERING SAMPLE · NOT FACTORY APPROVED' : 'LEGACY DRAFT · APPLY BLOCK ABOVE'}</span></div>
                <div className="clo-tee-measurement-grid" aria-label="T-shirt point of measure values">
                  {(measurementRun[project.grading?.baseSize || 'M'] || []).filter(item => ['body-length','chest-half','waist-half','hem-half','front-armhole','sleeve-length','bicep-half','cuff-half'].includes(item.id)).map(item => <div key={item.id}><span>{item.label}</span><strong>{item.cm.toFixed(1)} cm</strong><small>±{item.toleranceCm.toFixed(1)} cm</small></div>)}
                </div>
                <p className="panel-copy">Neck rib is specified by measured neckline length but still requires its own final cut pattern, physical sample and wash-shrink adjustment. Do not release directly for bulk production.</p>
                <button className="wide-action compact-action" onClick={exportMeasurements}><FileDown size={14}/>EXPORT MEASUREMENTS · XS–XXL</button>
              </div>}
              <div className="panel-section">
                <div className="panel-title"><span>Pattern pieces</span><button onClick={addPiece}><Plus size={14} /></button></div>
                <div className="piece-list">
                  {project.pieces.map((piece, index) => (
                    <button key={piece.id} className={piece.id === selectedPieceId ? 'active' : ''} onClick={() => setSelectedPieceId(piece.id)}>
                      <span>{String(index + 1).padStart(2, '0')}</span><strong>{piece.name}</strong><em>{pieceArea(piece).toFixed(0)} cm²</em>
                    </button>
                  ))}
                </div>
                {project.pieces.some((piece) => piece.arrangement3d?.wrap === 'front') && project.pieces.some((piece) => piece.arrangement3d?.wrap === 'back') && (
                  <div className="pattern-generator-grid">
                    <button className="wide-action compact-action" onClick={addRibNeckband}><Plus size={14} />RIB NECKBAND</button>
                    <button className="wide-action compact-action" onClick={addStandCollar}><Plus size={14} />STAND COLLAR</button>
                    <button className="wide-action compact-action" onClick={addTwoPanelHood}><Plus size={14} />2-PANEL HOOD</button>
                    <button className="wide-action compact-action" onClick={addRibFinishSet}><Plus size={14} />CUFFS + WAIST RIB</button>
                    <button className="wide-action compact-action" onClick={addKangarooPocket}><Plus size={14} />KANGAROO POCKET</button>
                  </div>
                )}
              </div>
              {selectedPiece && (
                <>
                  <div className="panel-section">
                    <div className="panel-title"><span>Selected pattern</span><button title={selectedPiece.locked ? 'Unlock 2D pattern editing' : 'Lock 2D pattern editing'} onClick={() => updateSelectedPiece('locked', !selectedPiece.locked)}>{selectedPiece.locked ? <Lock size={14} /> : <Unlock size={14} />}</button></div>
                    <label className="text-field"><span>Name</span><input value={selectedPiece.name} onChange={(event) => updateSelectedPiece('name', event.target.value)} /></label>
                    <div className="field-grid two">
                      <label><span>Points</span><strong>{selectedPiece.points.length}</strong></label>
                      <label><span>Area</span><strong>{selectedArea.toFixed(0)} cm²</strong></label>
                    </div>
                    {viewportTool === 'mesh-select' && <div className="panel-section" aria-label="3D cloth mesh inspector">
                      <div className="panel-title"><span>Mesh selection</span><strong>INSPECT</strong></div>
                      <p className="panel-copy">Click a garment triangle to inspect it. Shift-click or Command-click to add/remove triangles without changing the pattern.</p>
                      <p className="panel-copy">{meshSelection?.pieceId === selectedPiece.id ? `${meshSelection.triangleIndices.length} triangle(s) · ${meshSelection.vertices.length} unique vertices · faces ${meshSelection.triangleIndices.map(index => index + 1).join(', ')}` : 'No triangles selected'}</p>
                      <button className="wide-action compact-action" onClick={() => { setViewportTool('transform'); setMeshSelection(null) }}>RETURN TO 3D TRANSFORM</button>
                    </div>}
                    <div className="control-row split-control"><span>Seam allowance</span><NumberField value={selectedPiece.seamAllowance} min={0} max={8} step={0.1} suffix="cm" onChange={(value) => updateSelectedPiece('seamAllowance', clamp(value, 0, 8))} /></div>
                    <div className="control-row split-control"><span>Grain angle</span><NumberField value={selectedPiece.grainAngleDeg ?? 0} min={-90} max={90} step={1} suffix="°" onChange={(value) => updateSelectedPiece('grainAngleDeg', clamp(value, -90, 90))} /></div>
                    <div className="control-row split-control"><span>Cut quantity</span><NumberField value={selectedPiece.cutQuantity ?? 1} min={1} max={99} step={1} suffix="×" onChange={(value) => updateSelectedPiece('cutQuantity', Math.max(1, Math.round(value)))} /></div>
                    <div className="control-row split-control"><span>Collision layer</span><NumberField value={selectedPiece.layerIndex ?? 0} min={0} max={8} step={1} suffix="L" onChange={(value) => updateSelectedPiece('layerIndex', Math.max(0, Math.min(8, Math.round(value))))} /></div>
                    <div className="clo-placement-panel" aria-label="Exact 3D pattern placement">
                      <div className="clo-placement-header"><strong>3D PATTERN PLACEMENT</strong><span>POSITION · cm / ROTATE · °</span></div>
                      <fieldset className="clo-placement-fields" disabled={hasSimulated}>
                        <div className="clo-placement-inputs">
                          {['X', 'Y', 'Z'].map(axis => <div key={`position-${axis}`}><span>MOVE {axis}</span><NumberField ariaLabel={`3D move ${axis} (cm)`} value={Number(selectedPiece.arrangement3d?.[`stagingOffset${axis}`] || 0) * 100} min={-200} max={200} step={0.1} suffix="cm" onChange={value => setStagedPlacementField(selectedPiece.id, `stagingOffset${axis}`, value)}/></div>)}
                        </div>
                        <div className="clo-placement-inputs">
                          {['X', 'Y', 'Z'].map(axis => <div key={`rotation-${axis}`}><span>ROTATE {axis}</span><NumberField ariaLabel={`3D rotate ${axis} (degrees)`} value={Number(selectedPiece.arrangement3d?.[`stagingRotation${axis}`] || 0)} min={-360} max={360} step={0.1} suffix="°" onChange={value => setStagedPlacementField(selectedPiece.id, `stagingRotation${axis}`, value)}/></div>)}
                        </div>
                        <button type="button" className="clo-placement-reset" onClick={() => resetStagedPlacement(selectedPiece.id)}><RotateCcw size={12}/> RESET PANEL PLACEMENT</button>
                      </fieldset>
                      {hasSimulated && <p>Pause and use the 3D gizmo to adjust simulated cloth. Reset simulation to edit pre-sew arrangement numbers.</p>}
                    </div>
                    <button className={`toggle-row ${selectedPiece.locked ? 'active' : ''}`} onClick={() => updateSelectedPiece('locked', !selectedPiece.locked)}><span><Lock size={15} />Lock 2D editing</span><i /></button>
                    <button className={`toggle-row ${selectedPiece.frozen3d ? 'active' : ''}`} onClick={() => updateSelectedPiece('frozen3d', !selectedPiece.frozen3d)}><span><Pause size={15} />Freeze 3D cloth</span><i /></button>
                    <button className={`toggle-row ${selectedPiece.active3d !== false ? 'active' : ''}`} onClick={() => updateSelectedPiece('active3d', selectedPiece.active3d === false)}><span><Cpu size={15} />Active in 3D solver</span><i /></button>
                    <button className={`toggle-row ${selectedPiece.strengthened ? 'active' : ''}`} onClick={() => updateSelectedPiece('strengthened', !selectedPiece.strengthened)}><span><Activity size={15} />Strengthen pattern</span><i /></button>
                    <button className={`toggle-row ${selectedPiece.visible3d !== false ? 'active' : ''}`} onClick={() => updateSelectedPiece('visible3d', selectedPiece.visible3d === false)}><span><Eye size={15} />Show pattern in 3D</span><i /></button>
                    {['hood-left', 'hood-right'].includes(selectedPiece.generatedRole) && (
                      <div className="hood-state-switch">
                        <span>Hood state</span>
                        <button className={(selectedPiece.hoodState || 'up') === 'up' ? 'active' : ''} onClick={() => setGeneratedHoodState('up')}>UP</button>
                        <button className={selectedPiece.hoodState === 'down' ? 'active' : ''} onClick={() => setGeneratedHoodState('down')}>DOWN</button>
                      </div>
                    )}
                    <button className={`toggle-row ${selectedPiece.marker?.allowCrossGrain ? 'active' : ''}`} onClick={() => updateSelectedMarker('allowCrossGrain', !selectedPiece.marker?.allowCrossGrain)}><span><RotateCcw size={15} />Allow 90° cross-grain marker rotation</span><i /></button>
                    <label className="select-field"><span>Simulation detail</span><select value={selectedPiece.simulationResolution ?? project.simulation.resolution ?? 1} onChange={(event) => updateSelectedPiece('simulationResolution', Number(event.target.value))}><option value={0}>Draft · coarse</option><option value={1}>Normal</option><option value={2}>Fine</option><option value={3}>Ultra</option></select></label>
                    <div className="clo-simulation-property-group"><strong>Simulation mesh</strong><p>Mesh density is controlled by subdivision levels. Exact millimeter-based particle distance requires a remeshing kernel.</p><div className="control-row split-control"><span>Subdivision level</span><NumberField value={selectedPiece.simulationResolution ?? project.simulation.resolution ?? 1} min={0} max={3} step={1} suffix="level" onChange={(value) => updateSelectedPiece('simulationResolution', Math.round(clamp(value, 0, 3)))} /></div></div>
                    <div className="clo-simulation-property-group"><strong>Fabric shrinkage / thickness</strong><div className="control-row split-control"><span>Warp shrinkage</span><NumberField value={(project.fabrics?.[selectedPiece.fabricId || 'main']?.shrinkWarp ?? 0) * 100} min={-15} max={25} step={0.5} suffix="%" onChange={value => mutateProject(next => { const f = next.fabrics?.[selectedPiece.fabricId || 'main']; if (f) f.shrinkWarp = clamp(value / 100, -.15, .25) })}/></div><div className="control-row split-control"><span>Weft shrinkage</span><NumberField value={(project.fabrics?.[selectedPiece.fabricId || 'main']?.shrinkWeft ?? 0) * 100} min={-15} max={25} step={0.5} suffix="%" onChange={value => mutateProject(next => { const f = next.fabrics?.[selectedPiece.fabricId || 'main']; if (f) f.shrinkWeft = clamp(value / 100, -.15, .25) })}/></div><div className="control-row split-control"><span>Cloth thickness</span><NumberField value={(project.fabrics?.[selectedPiece.fabricId || 'main']?.thickness ?? .002) * 1000} min={0.2} max={12} step={0.1} suffix="mm" onChange={value => mutateProject(next => { const f = next.fabrics?.[selectedPiece.fabricId || 'main']; if (f) f.thickness = clamp(value, .2, 12) / 1000 })}/></div></div>
                    {selectedPiece.linkedMirrorSourceId && (
                      <div className="linked-pattern-notice">
                        <div><Link2 size={13} /><span>Linked mirror</span></div>
                        <small>Geometry and construction follow {project.pieces.find((piece) => piece.id === selectedPiece.linkedMirrorSourceId)?.name || 'source pattern'}.</small>
                        <button onClick={unlinkSelectedMirror}>UNLINK</button>
                      </div>
                    )}
                    <div className="pattern-copy-actions">
                      <button onClick={() => duplicateSelectedPiece(false)}>DUPLICATE</button>
                      <button onClick={() => duplicateSelectedPiece(true)}>MIRROR COPY</button>
                      {!selectedPiece.linkedMirrorSourceId && <button onClick={() => duplicateSelectedPiece(true, true)}>LINKED MIRROR</button>}
                      {!['lining', 'interfacing'].includes(selectedPiece.generatedRole) && <button onClick={createLiningCopy}>CREATE LINING</button>}
                      {!['lining', 'interfacing'].includes(selectedPiece.generatedRole) && <button onClick={createInterfacingCopy}>CREATE INTERFACING</button>}
                    </div>
                  </div>
                  <div className="panel-section">
                    <div className="panel-title"><span>Edge seam allowances</span><strong>{Object.keys(selectedPiece.edgeSeamAllowances || {}).length} CUSTOM</strong></div>
                    <p className="panel-copy">Each edge inherits the pattern default above until overridden. Use wider allowances for hems, zipper fronts, facings, or special construction without changing the rest of the pattern.</p>
                    <div className="edge-allowance-list">
                      {selectedPiece.points.map((_, edgeIndex) => {
                        const custom = selectedPiece.edgeSeamAllowances?.[edgeIndex] !== undefined
                        return (
                          <div className={`edge-allowance-row ${custom ? 'custom' : ''}`} key={`${selectedPiece.id}-allowance-${edgeIndex}`}>
                            <span>E{String(edgeIndex + 1).padStart(2, '0')}</span>
                            <em>{edgeLength(selectedPiece, edgeIndex).toFixed(1)} cm</em>
                            <NumberField value={getEdgeSeamAllowance(selectedPiece, edgeIndex)} min={0} max={8} step={0.1} suffix="cm" onChange={(value) => updateSelectedEdgeAllowance(edgeIndex, value)} />
                          </div>
                        )
                      })}
                    </div>
                    {Object.keys(selectedPiece.edgeSeamAllowances || {}).length > 0 && <button className="wide-action compact-action" onClick={resetSelectedEdgeAllowances}><RotateCcw size={14} />RESET EDGE OVERRIDES</button>}
                  </div>
                  <div className="panel-section">
                    <div className="panel-title"><span>Pattern transform</span><strong>PRECISE</strong></div>
                    <div className="transform-grid">
                      <div><span>Scale X</span><NumberField value={transformDraft.scaleX} min={10} max={300} step={1} suffix="%" onChange={(value) => setTransformDraft((current) => ({ ...current, scaleX: value }))} /></div>
                      <div><span>Scale Y</span><NumberField value={transformDraft.scaleY} min={10} max={300} step={1} suffix="%" onChange={(value) => setTransformDraft((current) => ({ ...current, scaleY: value }))} /></div>
                      <div><span>Rotate</span><NumberField value={transformDraft.rotateDeg} min={-180} max={180} step={1} suffix="°" onChange={(value) => setTransformDraft((current) => ({ ...current, rotateDeg: value }))} /></div>
                    </div>
                    <button className="wide-action" onClick={applyPatternTransform}><RotateCcw size={15} />APPLY SCALE / ROTATION</button>
                    <div className="control-row split-control"><span>Slash / spread hem</span><NumberField value={transformDraft.slashCm} min={-20} max={30} step={0.5} suffix="cm" onChange={(value) => setTransformDraft((current) => ({ ...current, slashCm: value }))} /></div>
                    <button className="wide-action compact-action" onClick={applySlashSpread}><Spline size={15} />APPLY SLASH / SPREAD</button>
                  </div>
                  <div className="panel-section">
                    <div className="panel-title"><span>Tape measurements</span><strong>{(project.customMeasurements || []).filter((measurement) => measurement.pieceId === selectedPiece.id).length}</strong></div>
                    <p className="panel-copy">Use the ruler tool and click two points on this pattern. Measurements stay attached to pattern coordinates and feed the graded POM/tech-pack export.</p>
                    <div className="custom-measure-list">
                      {(project.customMeasurements || []).filter((measurement) => measurement.pieceId === selectedPiece.id).map((measurement) => {
                        const cm = Math.hypot(measurement.b.x - measurement.a.x, measurement.b.y - measurement.a.y)
                        return (
                          <div className="custom-measure-row" key={measurement.id}>
                            <div className="custom-measure-head">
                              <input value={measurement.label || ''} onChange={(event) => updateCustomMeasurement(measurement.id, 'label', event.target.value)} />
                              <strong>{cm.toFixed(1)} cm</strong>
                              <button onClick={() => removeCustomMeasurement(measurement.id)}><Trash2 size={12} /></button>
                            </div>
                            <div className="control-row split-control"><span>Tolerance</span><NumberField value={measurement.toleranceCm ?? 0.5} min={0} max={5} step={0.1} suffix="cm" onChange={(value) => updateCustomMeasurement(measurement.id, 'toleranceCm', clamp(value, 0, 5))} /></div>
                          </div>
                        )
                      })}
                    </div>
                    <button className="wide-action" onClick={() => setTool('measure')}><Ruler size={14} />PLACE TAPE MEASUREMENT</button>
                  </div>
                  <div className="panel-section">
                    <div className="panel-title"><span>Artwork / graphics</span><strong>{selectedPiece.graphics?.length || 0}</strong></div>
                    <p className="panel-copy">Placed artwork is clipped to the 2D pattern and projected onto the live simulated cloth in 3D.</p>
                    <button className="wide-action" onClick={() => graphicInputRef.current?.click()}><Upload size={14} />PLACE IMAGE</button>
                    <div className="graphic-editor-list">
                      {(selectedPiece.graphics || []).map((graphic) => (
                        <div className="graphic-editor-item" key={graphic.id}>
                          <div className="graphic-editor-head">
                            <img src={graphic.src} alt="" />
                            <div><strong>{graphic.name || 'Artwork'}</strong><small>{graphic.widthCm?.toFixed?.(1) || graphic.widthCm} × {graphic.heightCm?.toFixed?.(1) || graphic.heightCm} cm</small></div>
                            <button onClick={() => removeGraphic(selectedPiece.id, graphic.id)}><Trash2 size={12} /></button>
                          </div>
                          <div className="graphic-field-grid">
                            <div><span>X</span><NumberField value={graphic.x ?? 0} min={-100} max={100} step={0.5} suffix="cm" onChange={(value) => updateGraphic(selectedPiece.id, graphic.id, 'x', value)} /></div>
                            <div><span>Y</span><NumberField value={graphic.y ?? 0} min={-100} max={150} step={0.5} suffix="cm" onChange={(value) => updateGraphic(selectedPiece.id, graphic.id, 'y', value)} /></div>
                            <div><span>W</span><NumberField value={graphic.widthCm ?? 20} min={1} max={120} step={0.5} suffix="cm" onChange={(value) => updateGraphic(selectedPiece.id, graphic.id, 'widthCm', clamp(value, 1, 120))} /></div>
                            <div><span>H</span><NumberField value={graphic.heightCm ?? 20} min={1} max={120} step={0.5} suffix="cm" onChange={(value) => updateGraphic(selectedPiece.id, graphic.id, 'heightCm', clamp(value, 1, 120))} /></div>
                            <div><span>ROT</span><NumberField value={graphic.rotationDeg ?? 0} min={-180} max={180} step={1} suffix="°" onChange={(value) => updateGraphic(selectedPiece.id, graphic.id, 'rotationDeg', value)} /></div>
                            <div><span>OP</span><NumberField value={(graphic.opacity ?? 1) * 100} min={0} max={100} step={1} suffix="%" onChange={(value) => updateGraphic(selectedPiece.id, graphic.id, 'opacity', clamp(value, 0, 100) / 100)} /></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {!clothcraftHybrid && <FoamPaddingEditor piece={selectedPiece}
                    disabled={clothcraftHybrid}
                    onAdd={shape=>addFoamPadding(selectedPiece.id,shape)}
                    onUpdate={(id,fields)=>updateFoamPadding(selectedPiece.id,id,fields)}
                    onRemove={id=>removeFoamPadding(selectedPiece.id,id)}/>}
                  <div className="panel-section">
                    <div className="panel-title"><span>Internal geometry</span><strong>{selectedPiece.internalLines?.length || 0}</strong></div>
                    <p className="panel-copy">Use the internal-line tool and drag inside the pattern. Construction, fold, and dart lines stay attached to the pattern and export to production DXF.</p>
                    <div className="internal-line-list">
                      {(selectedPiece.internalLines || []).map((line, index) => (
                        <div className="internal-line-row" key={line.id}>
                          <span>{String(index + 1).padStart(2, '0')}</span>
                          <select value={line.type || 'construction'} onChange={(event) => updateInternalLine(selectedPiece.id, line.id, 'type', event.target.value)}>
                            <option value="construction">Construction</option>
                            <option value="fold">Fold</option>
                            <option value="dart">Dart</option>
                            <option value="pleat">Pleat set</option>
                          </select>
                          {line.type === 'fold' && <NumberField value={line.foldAngleDeg ?? 135} min={0} max={180} step={5} suffix="°" onChange={(value) => updateInternalLine(selectedPiece.id, line.id, 'foldAngleDeg', clamp(value, 0, 180))} />}
                          {line.type === 'dart' && <NumberField value={line.widthCm ?? 2.5} min={0.5} max={8} step={0.1} suffix="cm" onChange={(value) => updateInternalLine(selectedPiece.id, line.id, 'widthCm', clamp(value, 0.5, 8))} />}
                          {line.type === 'pleat' && <div className="pleat-inline-controls"><NumberField value={line.count ?? 5} min={1} max={16} step={1} suffix="×" onChange={(value) => updateInternalLine(selectedPiece.id, line.id, 'count', Math.max(1, Math.round(value)))} /><NumberField value={line.spacingCm ?? 4} min={1} max={20} step={0.5} suffix="sp" onChange={(value) => updateInternalLine(selectedPiece.id, line.id, 'spacingCm', clamp(value, 1, 20))} /><NumberField value={line.depthCm ?? 3} min={0.5} max={12} step={0.5} suffix="dp" onChange={(value) => updateInternalLine(selectedPiece.id, line.id, 'depthCm', clamp(value, 0.5, 12))} /></div>}
                          <button onClick={() => removeInternalLine(selectedPiece.id, line.id)}><Trash2 size={13} /></button>
                        </div>
                      ))}
                    </div>
                    <button className="wide-action" onClick={() => setTool('internal')}><Scissors size={15} />DRAW INTERNAL LINE</button>
                  </div>
                  <div className="panel-section">
                    <div className="panel-title"><span>Manual cloth pins</span><strong>{selectedPiece.pins?.length || 0}</strong></div>
                    <p className="panel-copy">Manual pins hold the nearest cloth particle at the pattern's current 3D arrangement point while the rest of the garment drapes.</p>
                    <div className="pin-list">
                      {(selectedPiece.pins || []).map((pin, index) => (
                        <div className="pin-row" key={pin.id}>
                          <span>{String(index + 1).padStart(2, '0')}</span>
                          <em>{pin.x.toFixed(1)}, {pin.y.toFixed(1)} cm</em>
                          <button onClick={() => removePin(selectedPiece.id, pin.id)}><Trash2 size={13} /></button>
                        </div>
                      ))}
                    </div>
                    <button className="wide-action" onClick={() => setTool('pin')}><MapPin size={15} />ADD MANUAL PIN</button>
                  </div>
                  <div className="panel-section">
                    <div className="panel-title"><span>Production notches</span><strong>{selectedPiece.notches?.length || 0}</strong></div>
                    <p className="panel-copy">Notches stay attached by arc-length position, so they follow the edge when you reshape a curve. Single and double notches export into DXF.</p>
                    <div className="notch-list">
                      {(selectedPiece.notches || []).map((notch, index) => {
                        const seams = notchSeams(selectedPiece.id, notch.edgeIndex, notch.t)
                        const matchedSeam = notch.matchedSeamId ? project.seams.find((seam) => seam.id === notch.matchedSeamId) : null
                        const matchableSeam = matchedSeam || seams[0]
                        return (
                          <div className={`notch-row ${matchedSeam ? 'matched' : ''}`} key={notch.id}>
                            <span>{String(index + 1).padStart(2, '0')}</span>
                            <em>E{notch.edgeIndex + 1}</em>
                            <select value={notch.type || 'single'} onChange={(event) => updateNotch(selectedPiece.id, notch.id, 'type', event.target.value)}>
                              <option value="single">Single</option>
                              <option value="double">Double</option>
                            </select>
                            <NumberField value={(notch.t ?? 0.5) * 100} min={1} max={99} step={1} suffix="%" onChange={(value) => updateNotch(selectedPiece.id, notch.id, 't', clamp(value / 100, 0.01, 0.99))} />
                            <button
                              className={matchedSeam ? 'notch-match active' : 'notch-match'}
                              disabled={!matchableSeam || Boolean(matchedSeam)}
                              title={matchedSeam ? `Matched across ${matchedSeam.name}` : matchableSeam ? `Match across ${matchableSeam.name}` : 'This edge is not sewn'}
                              onClick={() => matchableSeam && matchNotchAcrossSeam(selectedPiece.id, notch.id, matchableSeam.id)}
                            ><Link2 size={12} /></button>
                            <button onClick={() => removeNotch(selectedPiece.id, notch.id)}><Trash2 size={13} /></button>
                          </div>
                        )
                      })}
                    </div>
                    <button className="wide-action" onClick={() => setTool('notch')}><span className="notch-action-symbol">N</span>ADD EDGE NOTCH</button>
                  </div>
                  <div className="panel-section">
                    <div className="panel-title"><span>3D arrangement</span><Box size={15} /></div>
                    <button className="wide-action compact-action" type="button" onClick={arrangeCurrentPatternsIn3D}><Box size={14}/>ARRANGE ALL PANELS AROUND AVATAR</button>
                    <label className="select-field"><span>Placement mode</span><select value={selectedPiece.arrangement3d?.wrap || 'flat'} onChange={(event) => updateSelectedArrangement('wrap', event.target.value === 'flat' ? undefined : event.target.value)}><option value="flat">Flat plane</option><option value="front">Wrap front torso</option><option value="back">Wrap back torso</option><option value="lower-front">Lower body front / skirt</option><option value="lower-back">Lower body back / skirt</option><option value="left-leg-front">Left leg front</option><option value="left-leg-back">Left leg back</option><option value="right-leg-front">Right leg front</option><option value="right-leg-back">Right leg back</option><option value="left-arm">Wrap left arm</option><option value="right-arm">Wrap right arm</option><option value="hood-left">Left hood panel</option><option value="hood-right">Right hood panel</option><option value="waist-band">Waistband</option><option value="neck">Neckband / collar</option><option value="left-wrist">Left wrist cuff</option><option value="right-wrist">Right wrist cuff</option></select></label>
                    <div className="arrangement-grid">
                      <div><span>X</span><NumberField value={(selectedPiece.arrangement3d?.x || 0) * 100} min={-200} max={200} step={0.5} suffix="cm" onChange={(value) => updateSelectedArrangement('x', value / 100)} /></div>
                      <div><span>Y</span><NumberField value={(selectedPiece.arrangement3d?.y || 0) * 100} min={0} max={250} step={0.5} suffix="cm" onChange={(value) => updateSelectedArrangement('y', value / 100)} /></div>
                      <div><span>Z</span><NumberField value={(selectedPiece.arrangement3d?.z || 0) * 100} min={-150} max={150} step={0.5} suffix="cm" onChange={(value) => updateSelectedArrangement('z', value / 100)} /></div>
                    </div>
                    <p className="panel-copy">Each editable cut piece bends into a body-relative 3D sewing position. Move and rotate the unsewn panel here, then simulate once its seam edges are connected. The original 2D cutline stays unchanged.</p>
                    <div className="arrangement-grid">
                      <div><span>Flat X</span><NumberField value={(selectedPiece.arrangement3d?.stagingOffsetX || 0) * 100} min={-200} max={200} step={0.5} suffix="cm" onChange={(value) => updateSelectedArrangement('stagingOffsetX', value / 100)} /></div>
                      <div><span>Flat Y</span><NumberField value={(selectedPiece.arrangement3d?.stagingOffsetY || 0) * 100} min={-200} max={200} step={0.5} suffix="cm" onChange={(value) => updateSelectedArrangement('stagingOffsetY', value / 100)} /></div>
                      <div><span>Flat Z</span><NumberField value={(selectedPiece.arrangement3d?.stagingOffsetZ || 0) * 100} min={-200} max={200} step={0.5} suffix="cm" onChange={(value) => updateSelectedArrangement('stagingOffsetZ', value / 100)} /></div>
                    </div>
                    <div className="panel-title"><span>Flat 3D rotation</span><Rotate3d size={14}/></div>
                    <div className="arrangement-grid">
                      <div><span>Rotate X</span><NumberField value={selectedPiece.arrangement3d?.stagingRotationX || 0} min={-180} max={180} step={1} suffix="°" onChange={(value) => updateSelectedArrangement('stagingRotationX', value)} /></div>
                      <div><span>Rotate Y</span><NumberField value={selectedPiece.arrangement3d?.stagingRotationY || 0} min={-180} max={180} step={1} suffix="°" onChange={(value) => updateSelectedArrangement('stagingRotationY', value)} /></div>
                      <div><span>Rotate Z</span><NumberField value={selectedPiece.arrangement3d?.stagingRotationZ || 0} min={-180} max={180} step={1} suffix="°" onChange={(value) => updateSelectedArrangement('stagingRotationZ', value)} /></div>
                    </div>
                    <button className={`toggle-row ${selectedPiece.arrangement3d?.flip ? 'active' : ''}`} onClick={() => updateSelectedArrangement('flip', !selectedPiece.arrangement3d?.flip)}><span><RotateCcw size={15} />Flip pattern orientation</span><i /></button>
                  </div>
                </>
              )}
            </>
          )}

          {activeSection === 'Sewing' && (
            <>
              <div className="panel-section stage-overview">
                <div className="panel-title"><span>Construction workflow</span><strong>{!hasSimulated ? 'PRE-SIMULATION' : running ? 'SIMULATING' : 'DRAPED / PAUSED'}</strong></div>
                <div className="workflow-stages"><span className="active">1 · ARRANGE</span><span className={project.seams.length ? 'active' : ''}>2 · SEW EDGES</span><span className={hasSimulated ? 'active' : ''}>3 · SIMULATE</span></div>
                <p className="panel-copy">Arrange the panels around the avatar, then connect their real edges using the Sew tool in the 2D window. Curved 3D preview sheets show construction placement; simulate to compute fabric drape and contact.</p>
                <button className="wide-action compact-action" type="button" onClick={arrangeCurrentPatternsIn3D}><Box size={14}/>ARRANGE PANELS FOR SEWING</button>
                <button className="wide-action" onClick={toggleSimulation}>{running ? 'PAUSE PHYSICAL SIMULATION' : 'SIMULATE SEWN GARMENT'}</button>
                <button className="wide-action compact-action" onClick={resetSimulation}>RESET TO FLAT ARRANGEMENT</button>
              </div>
              <div className="panel-section" aria-label="PPF physical sewing simulation">
                <div className="panel-title"><span>PPF contact + sewing</span><strong>METAL · FEM</strong></div>
                <div className="panel-section" aria-label="Original ZOZO GitHub dress reference">
                  <div className="panel-title"><span>First official test · ZOZO GitHub dress</span><strong>ORIGINAL SOURCE</strong></div>
                  <p className="panel-copy">Load the exact 14-panel Codim-IPC dress, all 851 native sewing constraints, its original dancing body, and the 241 saved Rust/Metal frames. Playback is read-only and never overwrites this project's patterns or physics.</p>
                  <button className="wide-action" disabled={zozoReferenceLoading} onClick={openZozoReference}>
                    <Shirt size={15}/>{zozoReferenceLoading ? 'LOADING ORIGINAL DRESS…' : zozoReference ? 'RETURN TO EDITABLE GARMENT' : 'OPEN ORIGINAL GITHUB DRESS TEST'}
                  </button>
                  {zozoReferenceError && <p className="panel-copy" role="alert" style={{color:'#f39a88'}}>{zozoReferenceError}</p>}
                  {zozoReference && <div className="zozo-reference-controls" data-testid="zozo-reference-controls">
                    <div className="panel-title"><span>Rust/Metal recorded frame</span><strong>{zozoReferenceFrame + 1}/{zozoReference.manifest.frames}</strong></div>
                    <div className="zozo-reference-actions">
                      <button type="button" onClick={() => setZozoReferenceFrame(0)}>START</button>
                      <button type="button" onClick={() => setZozoReferencePlaying(value => !value)}>{zozoReferencePlaying ? 'PAUSE' : 'PLAY'}</button>
                      <button type="button" onClick={() => setZozoReferenceFrame(240)}>FINAL FRAME</button>
                      <button type="button" onClick={() => setZozoReferenceBodyVisible(value => !value)}>{zozoReferenceBodyVisible ? 'HIDE BODY' : 'SHOW BODY'}</button>
                    </div>
                    <input aria-label="ZOZO GitHub dress simulation frame" type="range" min="0" max={zozoReference.manifest.frames - 1} step="1" value={zozoReferenceFrame} onChange={event => {setZozoReferencePlaying(false);setZozoReferenceFrame(Number(event.target.value))}} />
                    <p className="panel-copy" role="status" data-testid="zozo-reference-metrics">Frame {zozoReferenceFrame}: {zozoReference.manifest.audits[zozoReferenceFrame].bodyCrossings} cloth/body crossing pairs · mean seam gap {zozoReference.manifest.audits[zozoReferenceFrame].meanSeamGapCm.toFixed(3)} cm · worst gap {zozoReference.manifest.audits[zozoReferenceFrame].maxSeamGapCm.toFixed(3)} cm.</p>
                    <p className="panel-copy" style={{color:'#f39a88'}}>Original solver run completed but FAILED collision certification: 492 body triangle crossings at frame 90 and additional crossings at frames 87 and 174. This is an experimental reference, not an accepted fitted garment or editable CLO pattern.</p>
                  </div>}
                </div>
                <p className="panel-copy">ZOZO's contact solver treats 2D seam matches as physical stitch springs. It joins fabric while resolving contact with the body. Start with 10 frames on Apple Metal; longer runs can take minutes or stall around tightly closed armholes. Interactive XPBD remains available above.</p>
                <div className="control-row split-control"><span>Stitch spring strength</span><NumberField value={project.simulation?.ppfStitchStiffness ?? 1} min={0.1} max={10000} step={0.5} onChange={(value) => updateSimulation('ppfStitchStiffness', clamp(value, 0.1, 10000))} /></div>
                <div className="control-row split-control"><span>PPF maximum stretch</span><NumberField value={project.simulation?.ppfStrainLimitPercent ?? 5} min={1} max={40} step={0.5} suffix="%" onChange={(value) => updateSimulation('ppfStrainLimitPercent', clamp(value, 1, 40))} /></div>
                <div className="control-row split-control"><span>PPF contact gap</span><NumberField value={(project.simulation?.ppfContactGap ?? .001)*1000} min={0.1} max={10} step={0.1} suffix="mm" onChange={(value) => updateSimulation('ppfContactGap', clamp(value, 0.1, 10)/1000)} /></div>
                <div className="control-row split-control"><span>PPF contact offset</span><NumberField value={(project.simulation?.ppfContactOffset ?? 0)*1000} min={0} max={5} step={0.1} suffix="mm" onChange={(value) => updateSimulation('ppfContactOffset', clamp(value, 0, 5)/1000)} /></div>
                <div className="control-row split-control"><span>Avatar contact gap</span><NumberField value={(project.simulation?.ppfAvatarContactGap ?? .001)*1000} min={0.1} max={10} step={0.1} suffix="mm" onChange={(value) => updateSimulation('ppfAvatarContactGap', clamp(value, 0.1, 10)/1000)} /></div>
                <div className="control-row split-control"><span>Avatar contact offset</span><NumberField value={(project.simulation?.ppfAvatarContactOffset ?? 0)*1000} min={0} max={5} step={0.1} suffix="mm" onChange={(value) => updateSimulation('ppfAvatarContactOffset', clamp(value, 0, 5)/1000)} /></div>
                <p className="panel-copy">Both PPF contact groups now use explicit millimeter gaps (default 1 mm each) rather than scaling the avatar gap with body size. PPF strain limiting is explicitly enabled for new jobs; the default is 5% maximum stretch, not 2%. These settings do not alter browser PBD collision margins or certify a collision-free drape.</p>
                <button className={`toggle-row ${project.simulation?.ppfShoulderSupports === true ? 'active' : ''}`} onClick={() => updateSimulation('ppfShoulderSupports', project.simulation?.ppfShoulderSupports !== true)}><span><MapPin size={15} />Experimental soft shoulder supports</span><i /></button>
                <div className="control-row split-control"><span>PPF torso staging height</span><NumberField value={(project.simulation?.ppfTorsoYOffset ?? 0)*100} min={-15} max={15} step={1} suffix="cm" onChange={(value) => updateSimulation('ppfTorsoYOffset', clamp(value, -15, 15)/100)} /></div>
                <p className="panel-copy">Experimental shoulder supports pull four top-panel landmarks for the first 20% of the solve, then release. The latest Thomas test still intersected the body and left large seam gaps, so these supports and the staging-height adjustment are off by default. A failed PPF result is never accepted as a fitted garment.</p>
                <p className="panel-copy">PPF uses the installed calibrated Cotton/Silk/Wool/Denim material presets as starting values for membrane and bend stiffness. Gravity remains 9.81 m/s². Longer solves allow settling; they cannot correct excessive pattern ease or unsafe stitching. These are PPF-specific settings, not the interactive Browser PBD controls.</p>
                <div className="control-row split-control"><span>PPF sewing frames</span><NumberField value={ppfFrames} min={10} max={180} step={5} onChange={(value) => setPpfFrames(Math.round(clamp(value, 10, 180)))} /></div>
                <button className="wide-action" disabled={!project.seams.length || ['queued', 'running', 'connecting'].includes(ppfSewing.status)} onClick={() => startPpfSewing()}>
                  <Link2 size={15}/>{['queued', 'running', 'connecting'].includes(ppfSewing.status) ? 'PPF SEWING IN PROGRESS' : 'RUN PHYSICAL SEWING · PPF METAL'}
                </button>
                <p className="panel-copy" role="status">PPF: {ppfSewing.status === 'idle' ? 'Ready to submit to the local solver service' : `${ppfSewing.status.toUpperCase()} · ${ppfSewing.phase}`}</p>
                {ppfSewing.error && <p className="panel-copy" style={{ color: '#f39a88' }}>{ppfSewing.error}{ppfSewing.phase === 'connection' && <>. Start the local service with <code>npm run ppf:serve</code> if it is offline.</>}</p>}
                {ppfSewing.summary?.stitchEdges !== undefined && <p className="panel-copy">{ppfSewing.summary.stitchEdges} physical stitch pairs · {ppfSewing.summary.vertices} cloth vertices · zero-intersection staging: {ppfSewing.summary.intersections === 0 ? 'cloth preflight passed' : 'pending'} · actual body contact: {ppfSewing.summary.initialBodyContactVerified ? 'initial frame verified' : 'not yet verified'}</p>}
                {ppfSewing.summary?.assembly && <p className="panel-copy" style={ppfSewing.summary.assembly.fittingReady ? undefined : {color:'#f39a88'}}>NONRIGID ASSEMBLY: {ppfSewing.summary.assembly.startingSeamMeanCm.toFixed(2)} → {ppfSewing.summary.assembly.assembledSeamMeanCm.toFixed(2)} cm mean stitch gap · worst {ppfSewing.summary.assembly.largestGapCm.toFixed(2)} cm · maximum geometric edge change {(100*ppfSewing.summary.assembly.maximumEdgeChange).toFixed(2)}% · Thomas crossings {ppfSewing.summary.assembly.realBodyIntersectionPairs} · {ppfSewing.summary.assembly.fittingReady ? 'initial assembly eligible for PPF' : 'still requires full shoulder/side seam assembly; not a certified fit'}.</p>}
                {ppfSewing.artifacts?.assemblyPayload && <>
                  <button className="wide-action compact-action" disabled={ppfPreviewLoading} onClick={() => showPpfPreview(ppfSewing.jobId, 0, 'initial-assembly')}>
                    {ppfPreviewLoading ? 'LOADING INITIAL GARMENT…' : 'VIEW COLLISION-CHECKED INITIAL ASSEMBLY'}
                  </button>
                  <p className="panel-copy">This is the staged cloth geometry, not a solved or fully sewn garment. Stored locally at <code style={{overflowWrap:'anywhere'}}>{ppfSewing.artifacts.assemblyPayload}</code>.</p>
                  {ppfPreview?.stage === 'initial-assembly' && <p className="panel-copy" style={{color:'#f39a88'}}>{ppfPreview.warning}</p>}
                  {ppfPreview?.stage === 'initial-assembly' && <button className="wide-action compact-action" onClick={() => setPpfPreview(null)}>RETURN TO EDITABLE GARMENT</button>}
                  {ppfPreviewError && <p className="panel-copy" role="alert" style={{color:'#f39a88'}}>{ppfPreviewError}</p>}
                </>}
                {ppfSewing.summary?.stagingSeams?.warning && <p className="panel-copy" style={{color:'#f39a88'}}>PATTERN ASSEMBLY: {ppfSewing.summary.stagingSeams.warning} Worst: {ppfSewing.summary.stagingSeams.worstSeams?.[0]?.id || 'unknown'} ({ppfSewing.summary.stagingSeams.worstSeams?.[0]?.meanGapCm?.toFixed(1)} cm mean).</p>}
                {ppfSewing.summary?.sewing && <p className="panel-copy">Measured seam closure: {ppfSewing.summary.sewing.initialMeanGapCm.toFixed(1)} → {ppfSewing.summary.sewing.finalMeanGapCm.toFixed(1)} cm ({ppfSewing.summary.sewing.closurePercent}% closed). Largest remaining seam: {ppfSewing.summary.sewing.worstSeams?.[0]?.id || 'none'}.</p>}
                {ppfSewing.summary?.contact && <p className="panel-copy" style={ppfSewing.summary.collisionQuality === 'pass' ? undefined : { color: '#f39a88' }}>Collision quality: {ppfSewing.summary.collisionQuality === 'pass' ? 'PASS' : 'FAILED — experimental result, not a finished garment'}. Frame-by-frame: {ppfSewing.summary.contact.allFramesAvatarIntersectionFree ? 'no detected avatar crossings' : `up to ${ppfSewing.summary.contact.maxAvatarIntersectionPairs} avatar triangle crossings`}; {ppfSewing.summary.contact.allFramesSelfIntersectionFree ? 'no fabric crossings' : `up to ${ppfSewing.summary.contact.maxSelfIntersectionPairs} fabric crossings`}. Final-frame shell overlaps: {ppfSewing.summary.contact.finalFrame?.clothSelfIntersectionPairs ?? 'unknown'}.</p>}
                {ppfSewing.summary?.contact?.allFramesWithinStrainLimit !== undefined && <p className="panel-copy" style={ppfSewing.summary.contact.allFramesWithinStrainLimit ? undefined : { color: '#f39a88' }}>Exported-frame strain: {ppfSewing.summary.contact.allFramesWithinStrainLimit ? 'PASS' : 'FAILED'} · maximum principal stretch {Number(ppfSewing.summary.contact.maxPrincipalStretch || 0).toFixed(3)}×. Raw cloth positions are evaluated without post-simulation seam snapping.</p>}
                {ppfSewing.summary?.fitClearance?.final && <p className="panel-copy" style={ppfSewing.summary.fitClearance.shoulderFitPass ? undefined : {color:'#f39a88'}}>Thomas proximity: shoulder mean {ppfSewing.summary.fitClearance.final.shoulder.meanCm.toFixed(1)} cm, shoulder p90 {ppfSewing.summary.fitClearance.final.shoulder.p90Cm.toFixed(1)} cm, torso mean {ppfSewing.summary.fitClearance.final.torso.meanCm.toFixed(1)} cm. {ppfSewing.summary.fitClearance.shoulderFitPass ? 'Provisional shoulder-fit thresholds passed.' : 'FLOATING / BALLOONING RISK — not an accepted fit.'}</p>}
                {ppfSewing.summary?.contact?.firstAvatarCrossingFrame != null && <p className="panel-copy">First body penetration: frame {ppfSewing.summary.contact.firstAvatarCrossingFrame}. Main affected collider: {ppfSewing.summary.contact.avatarPartsRankedByTotalCrossings?.[0]?.name?.replace('PPF_Avatar_', '') || 'unknown'}. This result requires collision repair before production use.</p>}
                {ppfSewing.artifacts?.blend && <p className="panel-copy">Solver completed. Blender scene saved at <code style={{ overflowWrap: 'anywhere' }}>{ppfSewing.artifacts.blend}</code>. Preview frames can be inspected without modifying the live XPBD garment or the pattern.</p>}
                {ppfSewing.status === 'done' && <div className="panel-section" aria-label="ZOZO PPF read-only simulation preview">
                  <div className="panel-title"><span>ZOZO simulation playback</span><strong>{ppfSewing.summary?.fitAcceptance?.accepted ? 'VERIFIED FIT' : 'EXPERIMENTAL · UNSAFE'}</strong></div>
                  <button className="wide-action" disabled={ppfPreviewLoading} onClick={() => showPpfPreview()}>{ppfPreviewLoading ? 'READING PPF CACHE…' : 'SHOW LAST ZOZO FRAME ON AVATAR'}</button>
                  {ppfPreview?.frames > 1 && <label className="select-field"><span>Solver frame {ppfPreview.frame + 1}/{ppfPreview.frames}</span><input type="range" min="0" max={ppfPreview.frames - 1} step="1" value={ppfPreview.frame} disabled={ppfPreviewLoading} onChange={(event) => showPpfPreview(ppfPreview.jobId, Number(event.target.value))}/></label>}
                  {ppfPreview && <button className="wide-action compact-action" onClick={() => setPpfPreview(null)}>RETURN TO EDITABLE GARMENT</button>}
                  {ppfPreview && !ppfPreview.accepted && <p className="panel-copy" style={{color:'#f39a88'}}>This playback shows raw, experimental solver geometry. Contact, strain or seam checks failed; it is not a completed wearable fit.</p>}
                  {ppfPreviewError && <p className="panel-copy" role="alert" style={{color:'#f39a88'}}>{ppfPreviewError}</p>}
                </div>}
              </div>
              <div className="panel-section">
                <div className="panel-title"><span>Sewing visualization</span><Link2 size={15} /></div>
                <p className="panel-copy">The 2D editor and 3D flat arrangement show the same seam constraint pairs before simulation. Sew first; simulate afterward.</p>
                <button className={`toggle-row ${showSewingGuides ? 'active' : ''}`} onClick={() => setShowSewingGuides((value) => !value)}><span><Link2 size={14} />Show 3D sewing lines</span><i /></button>
                <label className="select-field"><span>Exploded arrangement: {Math.round(arrangementSpread * 100)}%</span><input type="range" min="0" max="1" step="0.05" value={arrangementSpread} onChange={(event) => { setArrangementSpread(Number(event.target.value)); setShowSewingGuides(true); setRunning(false) }} /></label>
                <button className="wide-action compact-action" onClick={() => setArrangementSpread(0)}>RETURN TO CURRENT ARRANGEMENT</button>
              </div>
              <SewingAssemblyInspector20261024 project={project}
                ppfJob={ppfSewing} nativeResult={nativeLastSolve}
                nativeAssembly={stats.backendInitialAssembly}
                onLoadMatchedTee={()=>void applyGarmentTemplate('tee')}
                onSelectSeam={(seamId)=>{setSeamWalkId(seamId);setSeamWalkProgress(0.5)}}
                onAddNotches={addSeamWalkNotches}/>
              <div className="panel-section grow-section">
                <div className="panel-title"><span>Seam graph</span><strong>{project.seams.length}</strong></div>
                <p className="panel-copy">Segment Sewing: click two edges. Free Sewing: Shift-click a start and end on each edge; this creates an exact, editable range that follows the source cutline rather than the nearest mesh vertex.</p>
                <p className="panel-copy" role="status">Construction audit: {sewingConstructionAudit.validSewingLinks}/{sewingConstructionAudit.sourceSeams} sewing links valid · {sewingConstructionAudit.categories.invalidEndpoints} invalid cutlines · {sewingConstructionAudit.categories.overlappingRanges} conflicting overlaps · {sewingConstructionAudit.categories.inactive3d} links to 2D-only patterns · {sewingConstructionAudit.categories.lengthMismatch} length mismatches above 6%.</p>
                {sewingConstructionAudit.issues.length > 0 && <details className="sewing-audit-detail"><summary>Inspect construction warnings</summary>{sewingConstructionAudit.issues.map((issue, index) => <p key={`${issue.seamId}-${index}`} className="panel-copy">{issue.seamId}: {issue.detail}</p>)}</details>}
                <div className="seam-health-strip">
                  <span><i className="good" />{project.seams.filter((seam) => seamLengthReport(project, seam).status === 'good').length} matched</span>
                  <span><i className="warning" />{project.seams.filter((seam) => seamLengthReport(project, seam).status === 'warning').length} warning</span>
                  <span><i className="error" />{project.seams.filter((seam) => seamLengthReport(project, seam).status === 'error').length} mismatch</span>
                </div>
                <div className="seam-list">
                  {project.seams.map((seam, index) => (
                    <div key={seam.id} className={`seam-item seam-${seamLengthReport(project, seam).status}`}>
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      <div>
                        <strong>{seam.name}</strong>
                        <em>{seam.a.pieceId}:{seam.a.edgeIndex} ↔ {seam.b.pieceId}:{seam.b.edgeIndex}</em>
                        <small>{seamLengthReport(project, seam).lengthA.toFixed(1)} / {seamLengthReport(project, seam).lengthB.toFixed(1)} cm · {seamLengthReport(project, seam).mismatchPercent.toFixed(1)}% mismatch</small>
                        <div className="seam-range-mode">
                          <button className={seam.a?.startT === undefined && seam.a?.endT === undefined && seam.b?.startT === undefined && seam.b?.endT === undefined ? 'active' : ''} onClick={() => setSeamPartial(seam.id, false)}>FULL</button>
                          <button className={seam.a?.startT !== undefined || seam.a?.endT !== undefined || seam.b?.startT !== undefined || seam.b?.endT !== undefined ? 'active' : ''} onClick={() => setSeamPartial(seam.id, true)}>PARTIAL</button>
                        </div>
                        {(seam.a?.startT !== undefined || seam.a?.endT !== undefined || seam.b?.startT !== undefined || seam.b?.endT !== undefined) && (
                          <div className="seam-range-controls">
                            <div><span>A start</span><NumberField value={(seam.a?.startT ?? 0) * 100} min={0} max={99.99} step={0.01} suffix="%" onChange={(value) => updateSeamRange(seam.id, 'a', 'startT', value / 100)} /></div>
                            <div><span>A end</span><NumberField value={(seam.a?.endT ?? 1) * 100} min={0.01} max={100} step={0.01} suffix="%" onChange={(value) => updateSeamRange(seam.id, 'a', 'endT', value / 100)} /></div>
                            <div><span>B start</span><NumberField value={(seam.b?.startT ?? 0) * 100} min={0} max={99.99} step={0.01} suffix="%" onChange={(value) => updateSeamRange(seam.id, 'b', 'startT', value / 100)} /></div>
                            <div><span>B end</span><NumberField value={(seam.b?.endT ?? 1) * 100} min={0.01} max={100} step={0.01} suffix="%" onChange={(value) => updateSeamRange(seam.id, 'b', 'endT', value / 100)} /></div>
                          </div>
                        )}
                        <div className="seam-treatment-controls">
                          <select value={seam.type || 'normal'} onChange={(event) => updateSeam(seam.id, 'type', event.target.value)}>
                            <option value="normal">Normal sew</option>
                            <option value="zipper">Zipper</option>
                            <option value="ease">Ease</option>
                            <option value="elastic">Elastic</option>
                            <option value="gather">Gather</option>
                            <option value="binding">Binding</option>
                          </select>
                          {seam.type === 'zipper' && <NumberField value={(seam.openFraction ?? 0) * 100} min={0} max={100} step={5} suffix="% open" onChange={(value) => updateSeam(seam.id, 'openFraction', clamp(value, 0, 100) / 100)} />}
                          {seam.type === 'zipper' && <select value={seam.openFrom || 'end'} onChange={(event) => updateSeam(seam.id, 'openFrom', event.target.value)}><option value="end">Open from end</option><option value="start">Open from start</option></select>}
                          {['elastic', 'gather', 'ease'].includes(seam.type) && <NumberField value={(seam.ratio ?? (seam.type === 'gather' ? 0.7 : seam.type === 'elastic' ? 0.85 : 0.96)) * 100} min={30} max={120} step={1} suffix="%" onChange={(value) => updateSeam(seam.id, 'ratio', clamp(value, 30, 120) / 100)} />}
                          {seam.type === 'gather' && <select value={seam.gatherSide || 'a'} onChange={(event) => updateSeam(seam.id, 'gatherSide', event.target.value)}><option value="a">Gather A</option><option value="b">Gather B</option></select>}
                          {seam.type === 'ease' && <select value={seam.easeSide || 'a'} onChange={(event) => updateSeam(seam.id, 'easeSide', event.target.value)}><option value="a">Ease A</option><option value="b">Ease B</option></select>}
                        </div>
                        <div className="seam-quick-actions">
                          <button className={seam.reverseB ? 'active' : ''} onClick={() => updateSeam(seam.id, 'reverseB', !seam.reverseB)}>REVERSE B</button>
                          <button className={seamWalkId === seam.id ? 'active' : ''} onClick={() => { setSeamWalkId((current) => current === seam.id ? null : seam.id); setSeamWalkProgress(0.5) }}>WALK</button>
                          {seamLengthReport(project, seam).mismatchPercent > 2 && <button onClick={() => autoEaseSeam(seam.id)}>AUTO MATCH</button>}
                        </div>
                      </div>
                      <button onClick={() => removeSeam(seam.id)}><Trash2 size={13} /></button>
                    </div>
                  ))}
                </div>
                {seamWalk && (
                  <div className="seam-walk-card">
                    <div className="seam-walk-head">
                      <div><span>SEAM WALK</span><strong>{seamWalk.name}</strong></div>
                      <button onClick={() => setSeamWalkId(null)}>CLOSE</button>
                    </div>
                    <SeamWalkPreview report={seamWalk} progress={seamWalkProgress} />
                    <div className="seam-walk-metrics">
                      <div><span>Edge A</span><strong>{seamWalk.lengthA.toFixed(2)} cm</strong></div>
                      <div><span>Edge B</span><strong>{seamWalk.lengthB.toFixed(2)} cm</strong></div>
                      <div><span>Length delta</span><strong>{seamWalk.difference.toFixed(2)} cm</strong></div>
                      <div><span>Shape deviation</span><strong>{seamWalk.maxShapeDeviationCm.toFixed(2)} cm max</strong></div>
                    </div>
                    <SliderRow label="Walk position" value={seamWalkProgress * 100} min={0} max={100} step={1} display={`${Math.round(seamWalkProgress * 100)}%`} onChange={(value) => setSeamWalkProgress(clamp(value / 100, 0, 1))} />
                    {(() => {
                      const index = Math.max(0, Math.min(seamWalk.samples.length - 1, Math.round(seamWalkProgress * (seamWalk.samples.length - 1))))
                      const sample = seamWalk.samples[index]
                      return sample ? (
                        <div className="seam-walk-position">
                          <span>A {sample.distanceA.toFixed(1)} cm</span>
                          <span>B {sample.distanceB.toFixed(1)} cm</span>
                          <strong>{sample.cumulativeDeltaCm >= 0 ? '+' : ''}{sample.cumulativeDeltaCm.toFixed(2)} cm cumulative</strong>
                        </div>
                      ) : null
                    })()}
                    <div className="seam-walk-actions">
                      <button onClick={() => addSeamWalkNotches(seamWalk.seamId)}>ADD ¼ · ½ · ¾ MATCH NOTCHES</button>
                      {seamWalk.mismatchPercent > 2 && <button onClick={() => autoEaseSeam(seamWalk.seamId)}>AUTO EASE TO MATCH</button>}
                    </div>
                  </div>
                )}
                <button className="wide-action" onClick={() => { setTool('sew'); setActiveSection('Sewing') }}><Link2 size={15} />SEW NEW EDGES</button>
              </div>
              <div className="panel-section">
                <div className="panel-title"><span>Point fasteners</span><strong>{project.fasteners?.length || 0}</strong></div>
                <p className="panel-copy">Place a mating pair directly on two patterns. Closed buttons, snaps, and hooks become physical point constraints in the cloth solver.</p>
                <div className="fastener-list">
                  {(project.fasteners || []).map((fastener, index) => (
                    <div className={`fastener-row ${fastener.closed === false ? 'open' : 'closed'}`} key={fastener.id}>
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      <div>
                        <strong>{fastener.name}</strong>
                        <small>{fastener.a?.pieceId} ↔ {fastener.b?.pieceId}</small>
                      </div>
                      <select value={fastener.type || 'button'} onChange={(event) => updateFastener(fastener.id, 'type', event.target.value)}>
                        <option value="button">Button</option>
                        <option value="snap">Snap</option>
                        <option value="hook">Hook</option>
                      </select>
                      <button className={`fastener-state ${fastener.closed === false ? '' : 'active'}`} onClick={() => updateFastener(fastener.id, 'closed', fastener.closed === false)}>{fastener.closed === false ? 'OPEN' : 'CLOSED'}</button>
                      <button className="fastener-delete" onClick={() => removeFastener(fastener.id)}><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
                <button className="wide-action" onClick={() => { setTool('fastener'); setActiveSection('Sewing') }}><Plus size={14} />PLACE FASTENER PAIR</button>
              </div>
              {selectedPiece && (
                <div className="panel-section trim-editor">
                  <div className="panel-title"><span>Edge construction · {selectedPiece.name}</span><strong>{stats.trims} LIVE</strong></div>
                  <label className="select-field"><span>Target edge</span><select value={trimEdgeIndex} onChange={(event) => setTrimEdgeIndex(Number(event.target.value))}>{selectedPiece.points.map((_, edgeIndex) => <option key={edgeIndex} value={edgeIndex}>Edge {edgeIndex + 1} · {edgeLength(selectedPiece, edgeIndex).toFixed(1)} cm</option>)}</select></label>
                  {['button','buttonhole','zipper'].map(kind => <label className="select-field" key={kind}>
                    <span>{kind.charAt(0).toUpperCase()+kind.slice(1)} hardware</span>
                    <select aria-label={`Select ${kind} hardware preset`} value={hardwareChoice[kind]} onChange={event=>setHardwareChoice(current=>({...current,[kind]:event.target.value}))}>
                      {listHardwarePresets(kind).map(preset=><option key={preset.id} value={preset.id}>{preset.name}</option>)}
                    </select>
                  </label>)}
                  <p className="panel-copy">Hardware presets supply illustrative sizes, finishes and component references. Visual placement is approximate; supplier part specifications and rigid fastener physics require validation.</p>
                  <div className="trim-add-grid">
                    <button onClick={() => editValidatedDraftHardware('button',selectedPiece.id,'create',null,{hardwarePresetId:hardwareChoice.button})}>+ BUTTON</button>
                    <button onClick={() => editValidatedDraftHardware('buttonhole',selectedPiece.id,'create',null,{hardwarePresetId:hardwareChoice.buttonhole})}>+ BUTTONHOLE</button>
                    <button onClick={() => addTopstitch(selectedPiece.id, trimEdgeIndex)}>+ TOPSTITCH</button>
                    <button onClick={() => addBinding(selectedPiece.id, trimEdgeIndex)}>+ BINDING</button>
                    <button onClick={() => addZipper(selectedPiece.id, trimEdgeIndex)}>+ ZIPPER</button>
                    <button onClick={() => addButtonRow(selectedPiece.id, 5)}>+ 5 BUTTONS</button>
                    <button onClick={() => addButtonholeRow(selectedPiece.id, 5)}>+ 5 BUTTONHOLES</button>
                  </div>

                  <div className="trim-editor-list">
                    {(selectedPiece.topstitches || []).map((stitch) => (
                      <div key={stitch.id} className="trim-editor-item">
                        <div><strong>Topstitch · E{stitch.edgeIndex + 1}</strong><small>{stitch.rows || 1} row · {stitch.stitchLengthMm || 3} mm stitch</small></div>
                        <NumberField value={stitch.offsetCm ?? 0.7} min={0} max={5} step={0.1} suffix="cm" onChange={(value) => editValidatedDraftHardware('topstitch',selectedPiece.id,'update',stitch.id,{offsetCm:clamp(value,0,5)})} />
                        <select value={stitch.rows || 1} onChange={(event) => editValidatedDraftHardware('topstitch',selectedPiece.id,'update',stitch.id,{rows:Number(event.target.value)})}><option value={1}>1 row</option><option value={2}>2 rows</option><option value={3}>3 rows</option></select>
                        <button onClick={() => editValidatedDraftHardware('topstitch',selectedPiece.id,'remove',stitch.id)}><Trash2 size={12} /></button>
                      </div>
                    ))}
                    {(selectedPiece.bindings || []).map((binding) => (
                      <div key={binding.id} className="trim-editor-item">
                        <div><strong>Binding · E{binding.edgeIndex + 1}</strong><small>{Math.round((binding.ratio ?? 0.96) * 100)}% edge ratio</small></div>
                        <NumberField value={(binding.ratio ?? 0.96) * 100} min={60} max={110} step={1} suffix="%" onChange={(value) => editValidatedDraftHardware('binding',selectedPiece.id,'update',binding.id,{ratio:clamp(value,60,110)/100})} />
                        <NumberField value={binding.widthCm ?? 1.8} min={0.5} max={8} step={0.1} suffix="cm" onChange={(value) => editValidatedDraftHardware('binding',selectedPiece.id,'update',binding.id,{widthCm:clamp(value,0.5,8)})} />
                        <button onClick={() => editValidatedDraftHardware('binding',selectedPiece.id,'remove',binding.id)}><Trash2 size={12} /></button>
                      </div>
                    ))}
                    {(selectedPiece.zippers || []).map((zipper) => (
                      <div key={zipper.id} className="trim-editor-item">
                        <div><strong>{getHardwarePreset(zipper.hardwarePresetId)?.name || 'Zipper'} · E{zipper.edgeIndex + 1}</strong><small>{zipper.type || 'coil'} tape</small></div>
                        <NumberField value={zipper.widthCm ?? 1.2} min={0.5} max={5} step={0.1} suffix="cm" onChange={(value) => editValidatedDraftHardware('zipper',selectedPiece.id,'update',zipper.id,{widthCm:clamp(value,0.5,5)})} />
                        <span />
                        <button onClick={() => editValidatedDraftHardware('zipper',selectedPiece.id,'remove',zipper.id)}><Trash2 size={12} /></button>
                      </div>
                    ))}
                    {(selectedPiece.buttonholes || []).map((buttonhole, index) => (
                      <div key={buttonhole.id} className="trim-editor-item buttonhole-editor-item">
                        <div><strong>{getHardwarePreset(buttonhole.hardwarePresetId)?.name || 'Buttonhole'} {index + 1}</strong><small>{buttonhole.lengthCm ?? 2.4} cm · {Math.round(buttonhole.orientationDeg || 0)}°</small></div>
                        <NumberField value={buttonhole.lengthCm ?? 2.4} min={0.8} max={6} step={0.1} suffix="cm" onChange={(value) => editValidatedDraftHardware('buttonhole',selectedPiece.id,'update',buttonhole.id,{lengthCm:clamp(value,0.8,6)})} />
                        <NumberField value={buttonhole.orientationDeg ?? 0} min={-180} max={180} step={5} suffix="°" onChange={(value) => editValidatedDraftHardware('buttonhole',selectedPiece.id,'update',buttonhole.id,{orientationDeg:clamp(value,-180,180)})} />
                        <button onClick={() => editValidatedDraftHardware('buttonhole',selectedPiece.id,'remove',buttonhole.id)}><Trash2 size={12} /></button>
                      </div>
                    ))}
                    {(selectedPiece.buttons || []).length > 0 && (
                      <div className="trim-editor-item trim-summary-item">
                        <div><strong>Buttons</strong><small>{selectedPiece.buttons.length} placed on pattern · {getHardwarePreset(selectedPiece.buttons[0]?.hardwarePresetId)?.name || 'Custom'}</small></div>
                        <button className="trim-clear" onClick={() => mutateProject((next) => {
                          const piece = next.pieces.find((item) => item.id === selectedPiece.id)
                          if (!piece) return
                          piece.buttons = []
                          piece.buttonholes = (piece.buttonholes || []).map((buttonhole) => ({ ...buttonhole, pairedButtonId: null }))
                        })}>CLEAR ALL</button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {activeSection === 'Fabric' && !clothcraftHybrid && (
            <>
              <div className="panel-section" aria-label="Five scan backed fabric reference presets">
                <div className="panel-title"><span>Fabric realism collection</span><strong>05 · CC0 PBR</strong></div>
                <p className="panel-copy">Choose a reference to load its licensed color, normal and roughness maps onto the selected fabric. Those same maps and real-centimeter repeats render on assigned garment pieces. Physical stretch and drape are estimated starting points.</p>
                <div className="exo-fabric-realism-collection">
                  {FABRIC_REALISM_SHOWCASE.map(entry=>{
                    const selected=fabric.catalogPresetId===entry.presetId||
                      (fabric.name===entry.name && fabric.texture?.scanAssetId===entry.texture.scanAssetId)
                    return <button type="button" key={entry.id} className={selected?'is-selected':''}
                      aria-pressed={selected}
                      title={entry.note}
                      onClick={()=>applyFabricPreset(entry.presetId)}>
                      <img src={entry.texture.mapUris.color} alt="" loading="lazy"/>
                      <span><strong>{entry.use}</strong><small>{entry.construction}</small>
                        <em>{entry.visualMatch==='proxy'?'Related textile scan':'Construction scan'} · estimated physics</em></span>
                    </button>
                  })}
                </div>
                <p className="panel-copy">All five reference scans are 1K. Rib, washed leather and nylon use related-family visual proxies until material-matched scans and measured textile specimens are available.</p>
              </div>
              <div className="panel-section">
                <div className="panel-title"><span>Fabric library</span><button onClick={addFabricSwatch}><Plus size={14} /></button></div>
                <div className="fabric-library">
                  {Object.entries(project.fabrics || {}).map(([fabricId, item]) => {
                    const usage = project.pieces.filter((piece) => (piece.fabricId || 'main') === fabricId).length
                    return (
                      <button key={fabricId} className={selectedFabricId === fabricId ? 'active' : ''} onClick={() => setSelectedFabricId(fabricId)}>
                        <i style={{ background: item.color || '#777777' }} />
                        <div><strong>{item.name || fabricId}</strong><small>{item.gsm || 0} gsm · {usage} pattern{usage === 1 ? '' : 's'}</small></div>
                        <span>{fabricId === 'main' ? 'MAIN' : 'SWATCH'}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="panel-section">
                <div className="panel-title"><span>Physical fabric</span><strong>{selectedFabricId.toUpperCase().slice(0, 10)}</strong></div>
                <label className="text-field"><span>Name</span><input value={fabric.name || ''} onChange={(event) => updateFabric('name', event.target.value)} /></label>
                <label className="select-field"><span>Preset</span><select value={Object.keys(FABRIC_PRESETS).find((key) => FABRIC_PRESETS[key].name === fabric.name) || ''} onChange={(event) => applyFabricPreset(event.target.value)}><option value="">Custom</option>{FABRIC_PRESET_GROUPS.map(([group,entries])=><optgroup key={group} label={group}>{entries.map(([key,preset])=><option key={key} value={key}>{preset.name}</option>)}</optgroup>)}</select></label>
                <label className="color-field"><span>Surface color</span><input type="color" value={fabric.color} onChange={(event) => updateFabric('color', event.target.value)} /><strong>{fabric.color.toUpperCase()}</strong></label>
                <div className="control-row split-control"><span>Physical evidence</span><strong>{fabric.calibration?.status==='imported-unverified' ? `IMPORTED · ${fabric.calibration.grade}` : 'ESTIMATED'}</strong></div>
                <button className="wide-action" onClick={()=>fabricEvidenceInputRef.current?.click()}><Upload size={14}/>IMPORT LAB SPECIMEN DATA (JSON)</button>
                <p className="panel-copy">Requires traceable GSM, compressed-thickness and optional warp/weft test curves for this exact specimen. Mass and thickness can be assigned directly. Curve-derived tensile, shear and bending coefficients remain advisory until calibrated against the cloth solver. Imported data is not independently certified.</p>
                <div className="clo-fabric-apply-actions">
                  <button disabled={!selectedPiece} onClick={() => assignFabric(selectedFabricId)}>APPLY TO SELECTED PATTERN</button>
                  <button onClick={() => assignFabric(selectedFabricId, true)}>APPLY TO ALL GARMENT PIECES</button>
                </div>
                {selectedPiece && <label className="select-field"><span>{selectedPiece.name} material</span><select value={selectedPiece.fabricId || 'main'} onChange={(event) => updateSelectedPiece('fabricId', event.target.value)}>{Object.entries(project.fabrics || {}).map(([fabricId, item]) => <option key={fabricId} value={fabricId}>{item.name || fabricId}</option>)}</select></label>}
                {selectedFabricId !== 'main' && <button className="wide-action danger-action" onClick={() => deleteFabricSwatch(selectedFabricId)}><Trash2 size={14} />DELETE SWATCH · REASSIGN TO MAIN</button>}
              </div>
              <div className="panel-section">
                <details aria-label="CLO7 style fabric detailed property comparison">
                  <summary className="panel-title" style={{cursor:'pointer'}}>
                    <span>CLO-style fabric property detail</span><strong>WARP · WEFT · BIAS</strong>
                  </summary>
                  <p className="panel-copy">Read-only, source-linked property comparison for this EXO fabric. Values shown are existing EXO inputs, not extracted CLO preset strengths. Blank directional/buckling values are real model gaps, not zeros. Select any of the 400 presets to inspect its full physical, surface and measurement breakdown.</p>
                  {clo7FabricReadout(fabric).sections.map(group=>(
                    <div key={group.id}>
                      <div className="panel-title"><span>{group.label}</span><strong>{group.rows.length} FIELDS</strong></div>
                      {group.rows.map(item=>(
                        <div key={item.id} className="control-row split-control" title={item.note}>
                          <span>{item.label}</span>
                          <strong style={{textAlign:'right',fontSize:11}}>
                            {item.value==null?'NOT AVAILABLE':String(item.value)+(item.unit?' '+item.unit:'')}
                            <small style={{display:'block',fontSize:9,opacity:.65}}>
                              {item.status==='solver-input'?'EXO SOLVER':item.status==='optical-only'?'VISUAL ONLY':item.status==='not-implemented'?'MISSING MODEL':'EVIDENCE'}
                            </small>
                          </strong>
                        </div>
                      ))}
                    </div>
                  ))}
                  <p className="panel-copy">CLO 7.x documentation reference: <a href={clo7FabricReadout(fabric).referenceUrls.physical} target="_blank" rel="noreferrer">Physical Property Details</a> · <a href={clo7FabricReadout(fabric).referenceUrls.measurement} target="_blank" rel="noreferrer">Fabric Kit measurements</a>. Live CLO7 selected-material field order has not been captured by the current automation permissions.</p>
                </details>
              </div>
              <div className="panel-section">
                <div className="panel-title"><span>Textile surface</span><strong>{fabric.texture?.src ? 'MAPPED' : 'COLOR'}</strong></div>
                <FabricMaterialPreview fabric={fabric} onOpticalChange={updateFabric} />
                {fabric.texture?.scanAssetId ? <p className="panel-copy">
                  Photographic PBR reference: <a href={fabric.texture.originalSourceUrl} target="_blank" rel="noreferrer">{fabric.texture.scanSource} · {fabric.texture.scanAssetId}</a> · CC0 · {fabric.texture.scanMatch==='family-proxy'?'similar fabric family, NOT an exact specimen':'construction reference'}. Physical parameters are still estimated and must be measured for production.
                </p> : <p className="panel-copy">Procedurally generated surface or user-uploaded image. Material mechanics have not been certified by a fabric laboratory.</p>}
                {fabric.photoReference?.visualReviewFlags?.length>0 && (
                  <p className="panel-copy" aria-label="Scan optical review notes">
                    Source image needs visual review: {fabric.photoReference.visualReviewFlags.map(flag=>{
                      const [channel,reason]=flag.split(':')
                      return `${channel} ${reason.replaceAll('_',' ')}`
                    }).join('; ')}. These image-statistics flags are not a finding that the scan is incorrect. Compare actual grazing-light PBR shading before approving a production visual.
                  </p>
                )}
                {fabric.texture?.physicalScaleStatus==='unknown-illustrative-20cm' && (
                  <p className="panel-copy" aria-label="Scan repeat scale not measured">
                    This stock photo has no published physical textile repeat size. The displayed 20 cm repeat is an illustrative starting point: adjust using a photographed ruler or physical fabric sample.
                  </p>
                )}
                <label className="select-field"><span>Fabric structure</span><select value={fabric.surfaceFamily || 'auto'} onChange={(event) => updateFabric('surfaceFamily', event.target.value)}>
                  <option value="auto">Auto-detect from fabric name</option>
                  <option value="plain-weave">Plain woven cotton / linen</option>
                  <option value="twill">Twill / denim diagonal weave</option>
                  <option value="jersey-knit">Jersey single knit</option>
                  <option value="rib-knit">Rib knit</option>
                  <option value="waffle-knit">Waffle thermal knit</option>
                  <option value="corduroy">Corduroy raised wales</option>
                  <option value="terry-knit">French terry / fleece</option>
                  <option value="fleece-pile">Sherpa / fleece pile</option>
                  <option value="basket-weave">Basket weave / Oxford</option>
                  <option value="crepe">Crêpe / pebbled yarn</option>
                  <option value="boucle">Bouclé / looped yarn</option>
                  <option value="mesh">Sports mesh / open knit approximation</option>
                  <option value="silk">Silk / satin weave</option>
                  <option value="synthetic">Technical nylon / polyester</option>
                  <option value="ripstop">Ripstop woven reinforcement</option>
                  <option value="suede">Suede / brushed nap</option>
                  <option value="leather">Grained leather</option>
                </select></label>
                <p className="panel-copy">Changes the 3D yarn structure, surface normals and micro-roughness without disturbing the garment's drape. Fabric appearance is separate from mechanical calibration.</p>
                {fabric.texture?.src ? (
                  <>
                    <div className="fabric-texture-card">
                      <img src={fabric.texture.src} alt="" />
                      <div><strong>{fabric.texture.name || 'Surface texture'}</strong><small>Pattern-centimeter UV · follows grainline</small></div>
                      <button onClick={removeFabricTexture}><Trash2 size={12} /></button>
                    </div>
                    <div className="field-grid two">
                      <div><span>Repeat W</span><NumberField value={fabric.texture.repeatWidthCm ?? 20} min={0.5} max={200} step={0.5} suffix="cm" onChange={(value) => updateFabricTexture('repeatWidthCm', clamp(value, 0.5, 200))} /></div>
                      <div><span>Repeat H</span><NumberField value={fabric.texture.repeatHeightCm ?? 20} min={0.5} max={200} step={0.5} suffix="cm" onChange={(value) => updateFabricTexture('repeatHeightCm', clamp(value, 0.5, 200))} /></div>
                    </div>
                    <div className="control-row split-control"><span>Texture rotation</span><NumberField value={fabric.texture.rotationDeg ?? 0} min={-180} max={180} step={1} suffix="°" onChange={(value) => updateFabricTexture('rotationDeg', value)} /></div>
                    <button className="wide-action" onClick={() => fabricTextureInputRef.current?.click()}><Upload size={14} />REPLACE TEXTURE</button>
                  </>
                ) : (
                  <>
                    <p className="panel-copy">Upload a weave, knit, print, wash, or photographed textile. Repeat dimensions are interpreted in real garment centimeters.</p>
                    <button className="wide-action" onClick={() => fabricTextureInputRef.current?.click()}><Upload size={14} />UPLOAD TEXTILE IMAGE</button>
                  </>
                )}
              </div>
              <div className="panel-section" aria-label="Non destructive digital fabric wash editor">
                <div className="panel-title"><span>Digital wash and dye</span><strong>{normalizeWashSpec(fabric.wash).type.toUpperCase()}</strong></div>
                <label className="select-field"><span>Finish / wash effect</span><select aria-label="Fabric wash effect" value={normalizeWashSpec(fabric.wash).type}
                  onChange={(event)=>updateFabricWash({type:event.target.value,strength:event.target.value==='raw'?0:.65})}>
                  {Object.entries(WASH_EFFECTS).map(([id,item])=><option key={id} value={id}>{item.label}</option>)}
                </select></label>
                <SliderRow label="Wash intensity" value={normalizeWashSpec(fabric.wash).strength} min={0} max={1} step={.02} display={`${Math.round(normalizeWashSpec(fabric.wash).strength*100)}%`} onChange={value=>updateFabricWash({strength:value})}/>
                <SliderRow label="Effect scale" value={normalizeWashSpec(fabric.wash).scale} min={.1} max={12} step={.1} display={`${normalizeWashSpec(fabric.wash).scale.toFixed(1)}×`} onChange={value=>updateFabricWash({scale:value})}/>
                <label className="select-field"><span>Color blend</span><select aria-label="Fabric wash blend" value={normalizeWashSpec(fabric.wash).blend} onChange={event=>updateFabricWash({blend:event.target.value})}>
                  <option value="overlay">Overlay-style</option><option value="soft-light">Soft light</option>
                  <option value="screen">Screen-style fade</option><option value="multiply">Multiply-style dye</option>
                </select></label>
                <SliderRow label="Absorbency look" value={normalizeWashSpec(fabric.wash).absorbency} min={0} max={1} step={.02} display={`${Math.round(normalizeWashSpec(fabric.wash).absorbency*100)}%`} onChange={value=>updateFabricWash({absorbency:value})}/>
                <SliderRow label="Cycle / wear amount" value={normalizeWashSpec(fabric.wash).cycleDuration} min={0} max={1} step={.02} display={`${Math.round(normalizeWashSpec(fabric.wash).cycleDuration*100)}%`} onChange={value=>updateFabricWash({cycleDuration:value})}/>
                <SliderRow label="UV edge fade" value={normalizeWashSpec(fabric.wash).seamAbrasion} min={0} max={1} step={.02} display={`${Math.round(normalizeWashSpec(fabric.wash).seamAbrasion*100)}%`} onChange={value=>updateFabricWash({seamAbrasion:value})}/>
                <div className="field-grid two">
                  <div><span>Position X</span><NumberField value={normalizeWashSpec(fabric.wash).placement.x*100} min={0} max={100} step={1} suffix="%" onChange={value=>updateFabricWash({placement:{...normalizeWashSpec(fabric.wash).placement,x:value/100}})}/></div>
                  <div><span>Position Y</span><NumberField value={normalizeWashSpec(fabric.wash).placement.y*100} min={0} max={100} step={1} suffix="%" onChange={value=>updateFabricWash({placement:{...normalizeWashSpec(fabric.wash).placement,y:value/100}})}/></div>
                </div>
                <div className="field-grid two">
                  <div><span>Direction</span><NumberField value={normalizeWashSpec(fabric.wash).rotation} min={-180} max={180} step={5} suffix="°" onChange={value=>updateFabricWash({rotation:value})}/></div>
                  <div><span>Random seed</span><NumberField value={normalizeWashSpec(fabric.wash).seed} min={0} max={9999} step={1} onChange={value=>updateFabricWash({seed:Math.round(value)})}/></div>
                </div>
                <button className="wide-action" onClick={()=>updateFabricWash({type:'raw',strength:0,scale:1,seed:0,placement:{x:.5,y:.5},rotation:0,absorbency:0,cycleDuration:0,seamAbrasion:0,blend:'overlay'})}>RESET VISUAL WASH</button>
                <p className="panel-copy" aria-label="Fabric-specific wash guidance">
                  {digitalWashSuitability(fabric,fabric.wash).caution || digitalWashSuitability(fabric,fabric.wash).recommendation}
                </p>
                <p className="panel-copy">Non-destructive visual simulation, not an industrial treatment recipe. Stone, acid, enzyme, ozone, garment dye, localized PP-inspired fading, abrasion and whiskers use editable digital maps. The UV-edge fade is not yet aware of true sewn seam geometry. Actual fabric chemistry, tensile weakening, shrinkage and garment-shaped wear require measured samples and solver integration.</p>
              </div>
              <div className="panel-section">
                <div className="panel-title"><span>Textile PBR maps</span><strong>{[fabric.texture?.normalSrc, fabric.texture?.roughnessSrc, fabric.texture?.metalnessSrc, fabric.texture?.opacitySrc, fabric.texture?.displacementSrc].filter(Boolean).length}/5</strong></div>
                <button className="wide-action" onClick={() => fabricPbrSetInputRef.current?.click()}><Upload size={14} />IMPORT MATCHING PBR MAP SET</button>
                <p className="panel-copy">Select multiple image files named e.g. fabric_diff, fabric_nor_gl, fabric_rough, fabric_metal, fabric_opacity and fabric_height. DirectX normal and packed ARM maps are not auto-converted.</p>
                <p className="panel-copy">Normal, roughness, metalness, opacity and displacement maps share the fabric's centimeter-based pattern UVs and grain rotation. Grayscale opacity maps control sheer and perforated regions.</p>
                {fabric.texture?.src && (
                  <>
                    <button className="wide-action" disabled={fabricGeneratingPbr || Boolean(fabric.texture.normalSrc && fabric.texture.roughnessSrc)} onClick={autoGenerateFabricPbr}>
                      <Sparkles size={14} />{fabricGeneratingPbr ? 'GENERATING MAPS...' : 'GENERATE NORMAL + ROUGHNESS FROM PHOTO'}
                    </button>
                    <p className="panel-copy">Image-derived PBR maps estimate surface detail from brightness; they are not scanned or physically calibrated. Existing manual maps are preserved.</p>
                  </>
                )}
                {fabric.texture?.normalSrc ? (
                  <div className="fabric-texture-card">
                    <img src={fabric.texture.normalSrc} alt="" />
                    <div><strong>{fabric.texture.normalName || 'Normal map'}</strong><small>Linear normal detail · shared textile UV</small></div>
                    <button onClick={() => removeFabricPbrMap('normal')}><Trash2 size={12} /></button>
                  </div>
                ) : <button className="wide-action compact-action" onClick={() => fabricNormalInputRef.current?.click()}><Upload size={14} />LOAD NORMAL MAP</button>}
                {fabric.texture?.roughnessSrc ? (
                  <div className="fabric-texture-card">
                    <img src={fabric.texture.roughnessSrc} alt="" />
                    <div><strong>{fabric.texture.roughnessName || 'Roughness map'}</strong><small>Linear roughness · green channel</small></div>
                    <button onClick={() => removeFabricPbrMap('roughness')}><Trash2 size={12} /></button>
                  </div>
                ) : <button className="wide-action compact-action" onClick={() => fabricRoughnessInputRef.current?.click()}><Upload size={14} />LOAD ROUGHNESS MAP</button>}
                {fabric.texture?.normalSrc && <button className="wide-action compact-action" onClick={() => fabricNormalInputRef.current?.click()}><Upload size={13} />REPLACE NORMAL</button>}
                {fabric.texture?.roughnessSrc && <button className="wide-action compact-action" onClick={() => fabricRoughnessInputRef.current?.click()}><Upload size={13} />REPLACE ROUGHNESS</button>}
                {fabric.texture?.metalnessSrc ? (
                  <div className="fabric-texture-card">
                    <img src={fabric.texture.metalnessSrc} alt="" />
                    <div><strong>{fabric.texture.metalnessName || 'Metalness map'}</strong><small>Linear grayscale · metallic finish mask</small></div>
                    <button onClick={() => removeFabricPbrMap('metalness')}><Trash2 size={12} /></button>
                  </div>
                ) : <button className="wide-action compact-action" onClick={() => fabricMetalnessInputRef.current?.click()}><Upload size={14} />LOAD METALNESS MAP</button>}
                {fabric.texture?.opacitySrc ? (
                  <div className="fabric-texture-card">
                    <img src={fabric.texture.opacitySrc} alt="" />
                    <div><strong>{fabric.texture.opacityName || 'Opacity map'}</strong><small>White = opaque · black = transparent</small></div>
                    <button onClick={() => removeFabricPbrMap('opacity')}><Trash2 size={12} /></button>
                  </div>
                ) : <button className="wide-action compact-action" onClick={() => fabricOpacityInputRef.current?.click()}><Upload size={14} />LOAD OPACITY MAP</button>}
                {fabric.texture?.displacementSrc ? (
                  <div className="fabric-texture-card">
                    <img src={fabric.texture.displacementSrc} alt="" />
                    <div><strong>{fabric.texture.displacementName || 'Height / displacement map'}</strong><small>Linear grayscale · visual surface height</small></div>
                    <button onClick={() => removeFabricPbrMap('displacement')}><Trash2 size={12} /></button>
                  </div>
                ) : <button className="wide-action compact-action" onClick={() => fabricDisplacementInputRef.current?.click()}><Upload size={14} />LOAD HEIGHT / DISPLACEMENT MAP</button>}
                <SliderRow label="Normal strength" value={fabric.normalStrength ?? 1} min={0} max={4} step={0.05} display={`${(fabric.normalStrength ?? 1).toFixed(2)}×`} onChange={(value) => updateFabric('normalStrength', value)} />
                <SliderRow label="Surface roughness" value={fabric.roughness ?? 0.82} min={0.04} max={1} step={0.01} display={(fabric.roughness ?? 0.82).toFixed(2)} onChange={(value) => updateFabric('roughness', value)} />
                <SliderRow label="Fabric opacity" value={fabric.opacity ?? 1} min={0.05} max={1} step={0.01} display={`${Math.round((fabric.opacity ?? 1) * 100)}%`} onChange={(value) => updateFabric('opacity', value)} />
                <SliderRow label="Visual displacement" value={fabric.displacementMm ?? 0} min={0} max={2} step={0.05} display={`${(fabric.displacementMm ?? 0).toFixed(2)} mm`} onChange={(value) => updateFabric('displacementMm', value)} />
                <SliderRow label="Sheen" value={fabric.sheen ?? 0.22} min={0} max={1} step={0.01} display={(fabric.sheen ?? 0.22).toFixed(2)} onChange={(value) => updateFabric('sheen', value)} />
                <SliderRow label="Sheen roughness" value={fabric.sheenRoughness ?? 0.84} min={0.04} max={1} step={0.01} display={(fabric.sheenRoughness ?? 0.84).toFixed(2)} onChange={(value) => updateFabric('sheenRoughness', value)} />
                <SliderRow label="Metalness" value={fabric.metalness ?? 0} min={0} max={1} step={0.01} display={(fabric.metalness ?? 0).toFixed(2)} onChange={(value) => updateFabric('metalness', value)} />
                <div className="panel-title"><span>Yarn-direction highlights</span><strong>ANISOTROPIC</strong></div>
                <SliderRow label="Fiber anisotropy" value={fabric.fiberAnisotropy ?? .16} min={0} max={1} step={0.01} display={(fabric.fiberAnisotropy ?? .16).toFixed(2)} onChange={(value) => updateFabric('fiberAnisotropy', value)} />
                <SliderRow label="Yarn highlight angle" value={fabric.fiberAngleDeg ?? 0} min={-180} max={180} step={1} display={`${Math.round(fabric.fiberAngleDeg ?? 0)}°`} onChange={(value) => updateFabric('fiberAngleDeg', value)} />
                <SliderRow label="Coating / finish" value={fabric.clearcoat ?? 0} min={0} max={1} step={0.01} display={(fabric.clearcoat ?? 0).toFixed(2)} onChange={(value) => updateFabric('clearcoat', value)} />
                <SliderRow label="Coating roughness" value={fabric.clearcoatRoughness ?? .45} min={.04} max={1} step={.01} display={(fabric.clearcoatRoughness ?? .45).toFixed(2)} onChange={(value) => updateFabric('clearcoatRoughness', value)} />
                <div className="panel-title"><span>Procedural yarn surface</span><strong>CM-SCALED</strong></div>
                <SliderRow label="Yarn tile scale" value={fabric.weaveScaleCm ?? 3} min={.3} max={10} step={.1} display={`${(fabric.weaveScaleCm ?? 3).toFixed(1)} cm`} onChange={(value) => updateFabric('weaveScaleCm', value)} />
                <SliderRow label="Subtle dye variation" value={fabric.colorVariation ?? .25} min={0} max={1} step={.05} display={`${Math.round((fabric.colorVariation ?? .25) * 100)}%`} onChange={(value) => updateFabric('colorVariation', value)} />
                <p className="panel-copy">Directional highlights, coating and yarn microdetail are optical material controls, not physical fabric calibration. Uploaded color, normal and roughness maps take priority over generated yarn maps.</p>
              </div>
              <div className="panel-section">
                <SliderRow label="Weight" value={fabric.gsm} min={40} max={900} step={5} display={`${fabric.gsm} gsm`} onChange={(value) => updateFabric('gsm', value)} />
                <SliderRow label="Warp stretch" value={fabric.stretchWarp} min={0} max={0.5} step={0.005} display={`${Math.round(fabric.stretchWarp * 100)}%`} onChange={(value) => updateFabric('stretchWarp', value)} />
                <SliderRow label="Weft stretch" value={fabric.stretchWeft} min={0} max={0.5} step={0.005} display={`${Math.round(fabric.stretchWeft * 100)}%`} onChange={(value) => updateFabric('stretchWeft', value)} />
                <SliderRow label="Warp shrink" value={fabric.shrinkWarp ?? 0} min={-0.15} max={0.25} step={0.005} display={`${Math.round((fabric.shrinkWarp ?? 0) * 100)}%`} onChange={(value) => updateFabric('shrinkWarp', value)} />
                <SliderRow label="Weft shrink" value={fabric.shrinkWeft ?? 0} min={-0.15} max={0.25} step={0.005} display={`${Math.round((fabric.shrinkWeft ?? 0) * 100)}%`} onChange={(value) => updateFabric('shrinkWeft', value)} />
                <SliderRow label="Thickness" value={(fabric.thickness ?? 0.002) * 1000} min={0.2} max={12} step={0.1} display={`${((fabric.thickness ?? 0.002) * 1000).toFixed(1)} mm`} onChange={(value) => updateFabric('thickness', value / 1000)} />
                <SliderRow label="Bending" value={fabric.bend} min={0.1} max={0.99} step={0.01} display={fabric.bend.toFixed(2)} onChange={(value) => updateFabric('bend', value)} />
                <SliderRow label="Friction" value={fabric.friction} min={0.05} max={0.9} step={0.01} display={fabric.friction.toFixed(2)} onChange={(value) => updateFabric('friction', value)} />
                <SliderRow label="Motion damping" value={fabric.damping ?? 0.985} min={0.90} max={0.999} step={0.001} display={(fabric.damping ?? 0.985).toFixed(3)} onChange={(value) => updateFabric('damping', value)} />
              </div>
            </>
          )}

          {activeSection === 'Avatar' && (
            <>
              <div className="panel-section">
                <div className="panel-title"><span>Avatar</span><strong>{project.avatar.name}</strong></div>
                <div className="avatar-card"><div className="avatar-silhouette"><i /><i /><i /></div><div><span>BODY PROFILE</span><strong>{project.avatar.heightCm} cm</strong><em>{project.avatar.model === 'theo' || project.avatar.model === 'nora' ? 'Rigged CC0 fitting body' : 'CC0 MakeHuman fitting body'}</em></div></div>
                <label className="select-field"><span>Fitting avatar</span><select value={clothcraftHybrid ? (clothcraftLive?.avatarModel || 'makehuman-base') : (project.avatar.model || 'makehuman-base')} onChange={(event) => setAvatarModel(event.target.value)}>{AVAILABLE_AVATARS.map(({ name, model }) => <option key={model} value={model} disabled={avatarAvailability[model] !== true || (clothcraftHybrid && !['makehuman-base','clo-thomas'].includes(model))}>{name}{model === 'makehuman-base' ? ' · Neutral base' : model === 'clo-thomas' ? ' · CLO3D Export' : ' · Rigged fitting'}{avatarAvailability[model] === false ? ' · Not installed' : ''}</option>)}{project.avatar.model === 'custom-export' && <option value="custom-export">Imported OBJ / GLB mesh</option>}</select></label><button className="wide-action" onClick={() => avatarMeshInputRef.current?.click()}><Upload size={14}/>IMPORT AVATAR OBJ / GLB</button><p className="panel-copy">Imported meshes are visual until mesh-to-body collision fitting is implemented. Use assets you have permission to import.</p>
                {(project.avatar.model === 'theo' || project.avatar.model === 'nora') && <p className="panel-copy">Rigged OpenSew/MPFB fitting body · CC0. Selecting it also moves the analytic collision arms to the matching 60° apparel fitting pose.</p>}
              </div>
              <div className="panel-section measure-list">
                {[
                  ['heightCm', 'Height', 150, 205],
                  ['chestCm', 'Chest', 70, 145],
                  ['waistCm', 'Waist', 55, 145],
                  ['hipCm', 'Hip', 70, 150],
                  ['shoulderWidthCm', 'Shoulder width', 34, 62],
                  ['neckCm', 'Neck', 28, 58],
                  ['bicepCm', 'Bicep', 20, 60],
                ].map(([field, label, min, max]) => (
                  <div className="control-row split-control" key={field}><span>{label}</span><NumberField value={project.avatar[field]} min={min} max={max} suffix="cm" onChange={(value) => updateAvatar(field, clamp(value, min, max))} /></div>
                ))}
                <div className="control-row split-control"><span>Arm length</span><NumberField value={project.avatar.armLengthCm ?? Number((72 * (project.avatar.heightCm ?? 180) / 180).toFixed(1))} min={42} max={86} step={0.5} suffix="cm" onChange={(value) => updateAvatar('armLengthCm', clamp(value, 42, 86))} /></div>
                <SliderRow label="Arm pose" value={project.avatar.armAngleDeg ?? 6} min={0} max={70} step={1} display={`${Math.round(project.avatar.armAngleDeg ?? 6)}°`} onChange={(value) => updateAvatar('armAngleDeg', value)} />
                <SliderRow label="Avatar visibility" value={project.avatar.visibility} min={0.05} max={1} step={0.05} display={`${Math.round(project.avatar.visibility * 100)}%`} onChange={(value) => updateAvatar('visibility', value)} />
              </div>
            </>
          )}

          {activeSection === 'Fit' && (
            <>
              <div className="panel-section" aria-label="ClothCraft OGC contact solver">
                <div className="panel-title"><span>ClothCraft Rust · VBD + OGC</span><strong>OPT-IN</strong></div>
                <p className="panel-copy">Run ClothCraft's actual CPU solver with the current EXO garment and {project.avatar.name}. The Thomas and MakeHuman body-only collision meshes are supported. The result opens as a 3D comparison with both cloth and avatar. Your editable pattern and existing live solver stay unchanged.</p>
                <label className="select-field"><span>Rust OGC steps</span><select value={clothCraftContactSteps} onChange={(event) => setClothCraftContactSteps(Number(event.target.value))}><option value={1}>1 · Contact diagnostic</option><option value={3}>3 · Short trial</option><option value={10}>10 · Relaxation trial</option><option value={30}>30 · Extended trial</option></select></label>
                <button className="wide-action" disabled={clothCraftBusy} onClick={runClothCraftOgc}><Cpu size={15} />{clothCraftBusy ? 'RUNNING CLOTHCRAFT VBD + OGC…' : 'RUN CLOTHCRAFT VBD + OGC CONTACT'}</button>
                {clothCraftContactResult?.ok && <div className="stat-grid" role="status"><MiniStat label="OGC seam peak" value={`${clothCraftContactResult.maxSeamGapMm.toFixed(1)} mm`} /><MiniStat label="OGC contacts" value={String(clothCraftContactResult.activeContacts)} /><MiniStat label="OGC stretch p95" value={`${clothCraftContactResult.p95ExtensionPercent.toFixed(1)}%`} /><MiniStat label="OGC fit accepted" value="NO" /></div>}
                {clothCraftContactResult?.ok && <p className="panel-copy" style={{color:'#f39a88'}} role="status">{clothCraftContactResult.reason} Experimental normal contact only: no swept CCD, friction or certified sewn-body fit. View the diagnostic mesh before comparing solvers.</p>}
                {clothCraftContactResult?.error && <p className="panel-copy" style={{color:'#f39a88'}} role="alert">OGC could not complete: {clothCraftContactResult.error}</p>}
              </div>
              <div className="panel-section" aria-label="ZOZO GitHub original dress simulation test">
                <div className="panel-title"><span>Original GitHub dress · first fabric test</span><strong>RUST/METAL</strong></div>
                <p className="panel-copy">The source dress is the original 14-panel upstream example, not a reconstructed pattern. Inspect its real 241-frame body and fabric simulation in the 3D viewport while preserving this editable garment project.</p>
                <button className="wide-action" disabled={zozoReferenceLoading} onClick={openZozoReference}><Shirt size={15}/>{zozoReferenceLoading ? 'LOADING ORIGINAL DRESS…' : zozoReference ? 'RETURN TO EDITABLE GARMENT' : 'OPEN GITHUB DRESS · ORIGINAL PPF TEST'}</button>
                {zozoReferenceError && <p className="panel-copy" role="alert" style={{color:'#f39a88'}}>{zozoReferenceError}</p>}
                {zozoReference && <div className="zozo-reference-controls" data-testid="zozo-reference-controls">
                  <div className="panel-title"><span>Original solver frame</span><strong>{zozoReferenceFrame + 1}/{zozoReference.manifest.frames}</strong></div>
                  <div className="zozo-reference-actions">
                    <button type="button" onClick={() => setZozoReferenceFrame(0)}>START</button>
                    <button type="button" onClick={() => setZozoReferencePlaying(value => !value)}>{zozoReferencePlaying ? 'PAUSE' : 'PLAY'}</button>
                    <button type="button" onClick={() => setZozoReferenceFrame(240)}>FINAL FRAME</button>
                    <button type="button" onClick={() => setZozoReferenceBodyVisible(value => !value)}>{zozoReferenceBodyVisible ? 'HIDE BODY' : 'SHOW BODY'}</button>
                  </div>
                  <input aria-label="ZOZO GitHub dress simulation frame" type="range" min="0" max="240" step="1" value={zozoReferenceFrame} onChange={event => {setZozoReferencePlaying(false);setZozoReferenceFrame(Number(event.target.value))}} />
                  <p className="panel-copy" role="status" data-testid="zozo-reference-metrics">Frame {zozoReferenceFrame}: {zozoReference.manifest.audits[zozoReferenceFrame].bodyCrossings} body intersections · mean seam gap {zozoReference.manifest.audits[zozoReferenceFrame].meanSeamGapCm.toFixed(3)} cm · worst gap {zozoReference.manifest.audits[zozoReferenceFrame].maxSeamGapCm.toFixed(3)} cm.</p>
                  <p className="panel-copy" style={{color:'#f39a88'}}>Real Rust/Metal simulation, but NOT a fully validated fit. Known collisions at frames 87, 90 and 174. The editable project and 2D pattern remain untouched.</p>
                </div>}
              </div>
              <div className="panel-section" aria-label="PPF body drape validation">
                <div className="panel-title"><span>PPF body-contact fitting</span><strong>OFFLINE · METAL</strong></div>
                <p className="panel-copy">Run the installed ST-Tech/ZOZO PPF Metal contact solver against the local Thomas skin mesh when CLO Thomas is selected, or the measurement proxy otherwise. It automatically tests multiple safe starting placements before sewing. A final fit is accepted only after physical seam closure and every-frame collision validation; unfinished attempts remain available for diagnosis without overwriting your patterns.</p>
                <button className={`toggle-row ${automaticPpfOnSimulate ? 'active' : ''}`} aria-label="Automatically run high-fidelity contact validation when Simulate starts" onClick={() => setAutomaticPpfOnSimulate(value => !value)}><span><Link2 size={15}/>Auto-run PPF contact validation after pressing Simulate</span><i/></button>
                <p className="panel-copy">Optional and off by default: starts a separate local Metal fit job on first simulation while keeping interactive cloth usable. Unvalidated output is never applied to the visible garment.</p>
                <button className="wide-action" disabled={!project.seams.length || ['queued','running','connecting'].includes(ppfSewing.status)} onClick={() => startPpfSewing()}>
                  <CadToolIcon id="fit" size={17}/>
                  {['queued','running','connecting'].includes(ppfSewing.status) ? 'PPF BODY DRAPE RUNNING…' : 'RUN PPF BODY + SEAM FIT'}
                </button>
                <p className="panel-copy" role="status">PPF Metal: {ppfSewing.status === 'idle' ? 'READY TO CHECK LOCAL SERVICE' : `${ppfSewing.status.toUpperCase()} · ${ppfSewing.phase}`}</p>
                {ppfSewing.error && <p className="panel-copy" style={{color:'#efad9a'}}>{ppfSewing.error}</p>}
                {ppfSewing.summary?.ipcCcd?.tested && <p className="panel-copy" style={ppfSewing.summary.ipcCcd.allTestedStepsCollisionFree ? undefined : {color:'#f39a88'}}>IPC SWEPT COLLISION: {ppfSewing.summary.ipcCcd.allTestedStepsCollisionFree ? 'PASSED' : 'FAILED'} across {ppfSewing.summary.ipcCcd.framesAudited} Thomas-body frames{ppfSewing.summary.ipcCcd.firstBlockedFrame !== null ? `; first unsafe movement enters frame ${ppfSewing.summary.ipcCcd.firstBlockedFrame}` : ''}. This checks between-frame crossings against Thomas's actual collision triangles; a failed trajectory cannot be accepted as a valid final fit.</p>}
                {ppfSewing.summary?.contact && <p className="panel-copy">Measured contact across {ppfSewing.summary.contact.framesChecked} frames: avatar {ppfSewing.summary.contact.allFramesAvatarIntersectionFree ? 'PASS' : 'INTERSECTIONS DETECTED'}; cloth self-contact {ppfSewing.summary.contact.allFramesSelfIntersectionFree ? 'PASS' : 'INTERSECTIONS DETECTED'}. These checks use exported solver frames.</p>}
                {ppfSewing.summary?.sewing && <p className="panel-copy">Seam gap: {ppfSewing.summary.sewing.initialMeanGapCm.toFixed(1)} → {ppfSewing.summary.sewing.finalMeanGapCm.toFixed(1)} cm. Not a certified closed garment until all gaps and contact checks pass.</p>}
                {ppfSewing.artifacts?.blend && <p className="panel-copy">Blender output: <code style={{overflowWrap:'anywhere'}}>{ppfSewing.artifacts.blend}</code></p>}
              </div>
              <div className="panel-section">
                <div className="panel-title"><span>Fit analysis</span><Activity size={15} /></div>
                <div className="analysis-switch">
                  <button className={analysisMode === 'surface' ? 'active' : ''} onClick={() => setAnalysisMode('surface')}>SURFACE</button>
                  <button className={analysisMode === 'strain' ? 'active' : ''} onClick={() => setAnalysisMode('strain')}>STRAIN MAP</button>
                  <button className={analysisMode === 'pressure' ? 'active' : ''} onClick={() => setAnalysisMode('pressure')}>PRESSURE</button>
                  <button className={analysisMode === 'ease' ? 'active' : ''} onClick={() => setAnalysisMode('ease')}>EASE</button>
                </div>
                <div className="stat-grid">
                  <MiniStat label="Solver backend" value={stats.backendId === 'native-xpbd' ? 'Native XPBD' : 'Browser PBD'} />
                  {stats.backendId === 'native-xpbd' && <MiniStat label="Native batch" value={stats.backendError ? 'OFFLINE' : `${stats.backendElapsedMs.toFixed(0)} ms`} />}
                  {stats.backendId === 'native-xpbd' && <MiniStat label="Native frames" value={stats.backendFrame.toLocaleString()} />}
                  {stats.backendId === 'native-xpbd' && stats.backendInitialAssembly?.status === 'STAGING_REQUIRES_REPAIR' && <p className="panel-copy" style={{color:'#f39a88'}}>Native preflight: assembly starts {stats.backendInitialAssembly.initialSeamGapMaximumMm.toFixed(1)} mm apart at its worst sewn pair ({stats.backendInitialAssembly.worstSewingGroups?.[0]?.seamId || 'unknown'}). This pose needs correction before physical fitting can pass.</p>}
                  {stats.backendId === 'native-xpbd' && stats.backendFitAssessment?.status === 'FAILED' && <p className="panel-copy" style={{color:'#f39a88'}}>Native solver status: FIT FAILED. Numerical output is retained for diagnosis but is not a validated drape.</p>}
                  <MiniStat label="Vertices" value={stats.vertices.toLocaleString()} />
                  {Number.isFinite(stats.hemRiseM) && <MiniStat label="Hem displacement" value={`${stats.hemRiseM >= 0 ? '+' : ''}${(stats.hemRiseM * 100).toFixed(1)} cm`} />}
                  {stats.hemFloatingWarning && <p className="panel-copy" style={{ color: '#f39a88' }}>FLOATING FIT WARNING: the lowest torso point rose more than 8 cm after simulation began. This is a detected physics problem, not a validated garment fit. Check the shoulder contact, sewing forces and body intersections before exporting.</p>}
                  <MiniStat label="Constraints" value={stats.constraints.toLocaleString()} />
                  <MiniStat label="Internal constraints" value={stats.internal.toLocaleString()} />
                  <MiniStat label="Seam treatments" value={stats.treatments.toLocaleString()} />
                  <MiniStat label="Average strain" value={`${(stats.averageStrain * 100).toFixed(1)}%`} />
                  <MiniStat label="Peak strain" value={`${(stats.maxStrain * 100).toFixed(1)}%`} />
                  {Number.isFinite(stats.p95StrainPercent) && <MiniStat label="95th %ile strain" value={`${stats.p95StrainPercent.toFixed(1)}%`} />}
                  {Number.isFinite(stats.meanSeamGapMm) && <MiniStat label="Seam gap · mean" value={`${stats.meanSeamGapMm.toFixed(1)} mm`} />}
                  {Number.isFinite(stats.p95SeamGapMm) && <MiniStat label="Seam gap · p95" value={`${stats.p95SeamGapMm.toFixed(1)} mm`} />}
                  {Number.isFinite(stats.maxSeamGapMm) && <MiniStat label="Seam gap · worst" value={`${stats.maxSeamGapMm.toFixed(1)} mm`} />}
                  <MiniStat label="Average ease" value={`${stats.averageEaseCm.toFixed(1)} cm`} />
                  <MiniStat label="Body contact" value={`${Math.round(stats.contactRatio * 100)}%`} />
                  <MiniStat label="Tight area" value={`${Math.round(stats.tightRatio * 100)}%`} />
                  <MiniStat label="Pressure peak" value={`${Math.round(stats.maxPressureIndex * 100)}%`} />
                  {Number.isFinite(stats.sampledPenetratingFaces) && <MiniStat label="Sampled penetrating faces" value={stats.sampledPenetratingFaces.toLocaleString()} />}
                  {Number.isFinite(stats.sampledIntrusionMm) && <MiniStat label="Sampled intrusion" value={`${stats.sampledIntrusionMm.toFixed(1)} mm`} />}
                  {Number.isFinite(stats.sampledCorrectedVertices) && <MiniStat label="Contact-adjusted vertices" value={stats.sampledCorrectedVertices.toLocaleString()} />}
                </div>
                <p className="panel-copy" style={{ color: '#f39a88' }}>Interactive fit is not collision-certified: body/cloth triangle CCD and all-frame penetration validation are not yet implemented in this solver. Low seam gaps alone do not mean the garment fits.</p>
              </div>
              <div className="panel-section">
                <div className="panel-title"><span>Native XPBD</span><strong>{nativeSolveStatus === 'solving' ? 'SOLVING' : nativeSolveStatus === 'unfit' ? 'FIT FAILED' : nativeSolveStatus === 'done' ? 'MEASURED' : nativeServiceStatus === 'ready' ? 'READY' : nativeServiceStatus.toUpperCase()}</strong></div>
                <label className="select-field"><span>Native quality</span><select value={project.simulation.nativeQuality || 'draft'} onChange={(event) => applyNativeQuality(event.target.value)}>{Object.values(NATIVE_QUALITY_PROFILES).map((profile) => <option key={profile.id} value={profile.id}>{profile.label}</option>)}</select></label>
                <button className={`toggle-row ${project.simulation.experimentalNativeSewFirst === true ? 'active' : ''}`} aria-label="Experimental sew-first preassembly" onClick={() => updateSimulation('experimentalNativeSewFirst', project.simulation.experimentalNativeSewFirst !== true)}><span><Link2 size={15} />Experimental sew-first preassembly</span><i /></button>
                <p className="panel-copy">Research mode, off by default. It joins corresponding sewing samples while preserving cloth rest lengths before native simulation. It does not establish collision-safe fit and can make the subsequent solve worse. The 2D pattern remains unchanged.</p>
                <button className="wide-action" disabled={nativeSolveStatus === 'solving'} onClick={requestNativeSolve}><Cpu size={15} />{nativeSolveStatus === 'solving' ? 'SOLVING NATIVE XPBD…' : 'SOLVE NATIVE XPBD · 60 FRAMES'}</button>
                {nativeLastSolve && <div className="stat-grid"><MiniStat label="Native solve" value={`${nativeLastSolve.elapsedMs.toFixed(1)} ms`} /><MiniStat label="Native seam avg" value={`${((nativeLastSolve.stats?.seamAverageDistance || 0) * 1000).toFixed(1)} mm`} /><MiniStat label="Native seam peak" value={`${((nativeLastSolve.stats?.seamMaxDistance || 0) * 1000).toFixed(1)} mm`} /><MiniStat label="Native particles" value={(nativeLastSolve.stats?.particles || 0).toLocaleString()} /></div>}
                {nativeLastSolve?.payload?.initialAssembly === 'STAGING_REQUIRES_REPAIR' && <p className="panel-copy" style={{color:'#f39a88'}} role="status">INITIAL ASSEMBLY REQUIRES REPAIR: sewing pieces begin as much as {Number(nativeLastSolve.payload.initialSeamGapMaximumMm || 0).toFixed(1)} mm apart; the initial mapped mesh has {Number(nativeLastSolve.payload.initialMeshPeakEdgeStrainPercent || 0).toFixed(1)}% peak edge strain. Worst sewing group: {nativeLastSolve.payload.worstInitialSeam || 'unknown'}. The solver is being asked to close incompatible starting geometry.</p>}
                {nativeLastSolve?.payload?.sewFirstResearch && <p className="panel-copy" style={{color:'#efad9a'}} role="status">EXPERIMENTAL SEW-FIRST: initial worst seam gap {nativeLastSolve.payload.sewFirstResearch.originalMaximumSeamGapMm.toFixed(1)} → {nativeLastSolve.payload.sewFirstResearch.assembledMaximumSeamGapMm.toFixed(1)} mm. Rest-edge strain {nativeLastSolve.payload.sewFirstResearch.originalPeakEdgeStrainPercent.toFixed(1)}% → {nativeLastSolve.payload.sewFirstResearch.assembledPeakEdgeStrainPercent.toFixed(1)}%. Sampled body intrusion up to {nativeLastSolve.payload.sewFirstResearch.sampledMaximumIntrusionMm.toFixed(1)} mm. Not a validated fit.</p>}
                {nativeLastSolve?.fitAssessment && <p className="panel-copy" style={nativeLastSolve.fitAssessment.status==='FAILED'?{color:'#f39a88'}:undefined} role="status">NATIVE PHYSICAL FIT: {nativeLastSolve.fitAssessment.status}. {nativeLastSolve.fitAssessment.failures?.join(', ') || nativeLastSolve.fitAssessment.unknown?.join(', ') || 'Measured checks completed'}. Full cloth/body triangle CCD is not validated, regardless of numerical finiteness.</p>}
                {nativeLastSolve?.fitTrajectory?.frames?.length>0 && <div className="stat-grid"><MiniStat label="Trajectory peak strain" value={`${Number(nativeLastSolve.fitTrajectory.peakFullMeshEdgeStrainPercent||0).toFixed(1)}%`}/><MiniStat label="Trajectory worst seam" value={`${Number(nativeLastSolve.fitTrajectory.peakSewnGapMm||0).toFixed(1)} mm`}/></div>}
                <p className="panel-copy">Draft uses distance constraints. Balanced keeps distance cloth but upgrades bending to XPBD isometric. Quality uses grain-aware strain triangles plus isometric bending; the unstable strain-only combination is intentionally blocked.</p>
              </div>
              <div className="panel-section">
                <label className="select-field"><span>Simulation backend</span><select value={project.simulation.backendId || 'browser-pbd'} onChange={(event) => updateSimulation('backendId', event.target.value)}>{SIMULATION_BACKENDS.map((backend) => <option key={backend.id} value={backend.id}>{backend.label}</option>)}</select></label>
                <label className="select-field"><span>Simulation quality</span><select value={(project.simulation.substeps ?? 2) === 1 ? 'draft' : (project.simulation.substeps ?? 2) === 4 ? 'final' : 'balanced'} onChange={(event) => applySimulationQuality(event.target.value)}><option value="draft">Draft · 1× substep</option><option value="balanced">Balanced · 2× substeps</option><option value="final">Final · 4× substeps</option></select></label>
                <button className={`toggle-row ${project.simulation.autoFitTacks !== false ? 'active' : ''}`} onClick={() => updateSimulation('autoFitTacks', project.simulation.autoFitTacks === false)}><span><Link2 size={15} />Auto-fit shoulder tacks</span><i /></button>
                <button className={`toggle-row ${project.simulation.autoFitPlacement !== false ? 'active' : ''}`} onClick={() => updateSimulation('autoFitPlacement', project.simulation.autoFitPlacement === false)}><span><Link2 size={15} />Auto-correct panel placement</span><i /></button>
                <p className="panel-copy">Recommended: the simulated garment starts from a fitted arrangement scaled to the avatar rather than the manually staged flat panels. The panels transition into place on screen; original pattern measurements and sewn edges remain unchanged. Turn this off to simulate directly from the manual staging pose.</p>
                <p className="panel-copy">Fit tacks behave like temporary garment placement pins: they keep the shoulder construction seated on the avatar while the sewn panels drape and settle.</p>
                <button className={`toggle-row ${project.simulation.collisions !== false ? 'active' : ''}`} onClick={() => updateSimulation('collisions', project.simulation.collisions === false)}><span><Box size={15} />Avatar collision</span><i /></button>
                <button className={`toggle-row ${project.simulation.bodyTriangleContactAssist === true ? 'active' : ''}`} onClick={() => updateSimulation('bodyTriangleContactAssist', project.simulation.bodyTriangleContactAssist !== true)}><span><Box size={15} />Triangle centroid contact assist</span><i /></button>
                <button className={`toggle-row ${project.simulation.adaptiveCutlineMeshing === true ? 'active' : ''}`} aria-label="Experimental adaptive simulation cutline mesh" onClick={() => updateSimulation('adaptiveCutlineMeshing', project.simulation.adaptiveCutlineMeshing !== true)}><span><Spline size={15} />Adaptive simulation-only cutline mesh</span><i /></button>
                {project.simulation.adaptiveCutlineMeshing === true && <div className="control-row split-control"><span>Physics contour tolerance</span><NumberField value={project.simulation.cutlineToleranceCm ?? 0.08} min={0.02} max={0.18} step={0.01} suffix="cm" ariaLabel="Simulation contour tolerance in centimeters" onChange={(value) => updateSimulation('cutlineToleranceCm', clamp(value, 0.02, 0.18))}/></div>}
                {project.simulation.adaptiveCutlineMeshing === true && <p className="panel-copy" style={{color:'#f3b970'}}>Experimental for dense imported CLO/DXF contours. Only the simulation mesh is simplified; editable cutlines and exact sewing remain unchanged. Not certified for every trim, dart, or physical material and does not replace collision validation.</p>}
                <button className={`toggle-row ${project.simulation.continuousSurfaceContact === true ? 'active' : ''}`} onClick={() => updateSimulation('continuousSurfaceContact', project.simulation.continuousSurfaceContact !== true)}><span><Box size={15} />Continuous sampled body contact</span><i /></button>
                <button className={`toggle-row ${project.simulation.meshAvatarContact === true ? 'active' : ''}`} onClick={() => updateSimulation('meshAvatarContact', project.simulation.meshAvatarContact !== true)}><span><Box size={15} />Actual avatar mesh contact (experimental)</span><i /></button>
                <p className="panel-copy">Uses a static triangle BVH of the loaded avatar, with bounded per-frame particle surface corrections. Analytic avatar collisions still run. This is not swept cloth/mesh collision detection; open, layered, and skinned avatar surfaces may produce unreliable inside/outside results.</p>
                <p className="panel-copy">Experimental: after each browser PBD frame, check sampled cloth triangles against the analytic avatar and accept bounded corrections only when sampled penetration improves. This costs extra CPU and does not provide swept collision detection or actual avatar-mesh contact.</p>
                <p className="panel-copy">Experimental triangle-interior projection can reduce extreme stretching when a face penetrates between its vertices. It is not swept triangle collision detection and does not certify the garment as intersection-free.</p>
                <button className={`toggle-row ${project.simulation.selfCollision !== false ? 'active' : ''}`} onClick={() => updateSimulation('selfCollision', project.simulation.selfCollision === false)}><span><Spline size={15} />Cloth self-collision</span><i /></button>
                <div className="control-row split-control"><span>Interactive avatar clearance</span><NumberField value={(project.simulation?.collisionMargin ?? .012) * 1000} min={1} max={20} step={0.5} suffix="mm" onChange={(value) => updateSimulation('collisionMargin', clamp(value, 1, 20) / 1000)} /></div>
                <p className="panel-copy">Browser PBD starts with a 12 mm avatar collision cushion, distinct from PPF's 1 mm contact gap. Smaller values may cause more body penetration; contact diagnostics must be checked after changing this.</p>
                <div className="control-row split-control"><span>Self-collision gap</span><NumberField value={(project.simulation.selfCollisionMargin ?? 0.002) * 1000} min={0} max={12} step={0.5} suffix="mm" onChange={(value) => updateSimulation('selfCollisionMargin', clamp(value, 0, 12) / 1000)} /></div>
                <SliderRow label="Solver stiffness" value={project.simulation.stiffness} min={0.5} max={0.995} step={0.005} display={project.simulation.stiffness.toFixed(3)} onChange={(value) => updateSimulation('stiffness', value)} />
                <SliderRow label="Seam stiffness" value={project.simulation.seamStiffness} min={0.5} max={0.999} step={0.005} display={project.simulation.seamStiffness.toFixed(3)} onChange={(value) => updateSimulation('seamStiffness', value)} />
                <SliderRow label="Solver substeps" value={project.simulation.substeps ?? 1} min={1} max={4} step={1} display={`${project.simulation.substeps ?? 1}×`} onChange={(value) => updateSimulation('substeps', Math.round(value))} />
                <SliderRow label="Iterations" value={project.simulation.iterations} min={2} max={14} step={1} display={project.simulation.iterations} onChange={(value) => updateSimulation('iterations', value)} />
                <SliderRow label="Gravity" value={project.simulation.gravity} min={0} max={18} step={0.1} display={`${project.simulation.gravity.toFixed(1)} m/s²`} onChange={(value) => updateSimulation('gravity', value)} />
              </div>
              <div className="panel-section">
                <div className="panel-title"><span>Wind / motion test</span><strong>{project.simulation.wind?.enabled ? 'LIVE' : 'OFF'}</strong></div>
                <button className={`toggle-row ${project.simulation.wind?.enabled ? 'active' : ''}`} onClick={() => updateWind('enabled', !project.simulation.wind?.enabled)}><span><Activity size={15} />Aerodynamic wind</span><i /></button>
                <SliderRow label="Wind speed" value={project.simulation.wind?.speed ?? 4} min={0} max={20} step={0.25} display={`${(project.simulation.wind?.speed ?? 4).toFixed(1)} m/s`} onChange={(value) => updateWind('speed', value)} />
                <SliderRow label="Direction" value={project.simulation.wind?.directionDeg ?? 0} min={-180} max={180} step={1} display={`${Math.round(project.simulation.wind?.directionDeg ?? 0)}°`} onChange={(value) => updateWind('directionDeg', value)} />
                <SliderRow label="Turbulence" value={project.simulation.wind?.turbulence ?? 0.18} min={0} max={1} step={0.01} display={`${Math.round((project.simulation.wind?.turbulence ?? 0.18) * 100)}%`} onChange={(value) => updateWind('turbulence', value)} />
                <SliderRow label="Cloth response" value={project.simulation.wind?.response ?? 0.025} min={0.005} max={0.08} step={0.005} display={(project.simulation.wind?.response ?? 0.025).toFixed(3)} onChange={(value) => updateWind('response', value)} />
                <p className="panel-copy">Wind response is calculated from the live triangle normals and fabric mass per square meter, so lightweight cloth reacts more strongly than heavy denim or fleece.</p>
              </div>
            </>
          )}

          {activeSection === 'Production' && (
            <>
              <div className="panel-section">
                <div className="panel-title"><span>Techpack Workspace</span><strong>EXO NATIVE</strong></div>
                <p className="panel-copy">Manufacturing sheets are linked to the current garment and use the same EXO Library, Object Browser and Property Editor as the design workspace.</p>
                <button className="wide-action" type="button" onClick={enterTechPackWorkspace}><FileDown size={15}/>OPEN EXO TECHPACK WORKSPACE</button>
              </div>
              <div className="panel-section">
                <div className="panel-title"><span>Size grading</span><strong>BASE {project.grading?.baseSize || 'M'}</strong></div>
                <div className="grade-size-row">
                  {(project.grading?.sizes || []).map((size) => (
                    <button key={size} className={gradePreviewSize === size ? 'active' : ''} onClick={() => setGradePreviewSize(size)}>{size}</button>
                  ))}
                </div>
                <p className="panel-copy">Grade preview is non-destructive. The base pattern stays unchanged while the 2D and 3D workspaces show the selected production size.</p>
                <div className="control-row split-control"><span>Width / size</span><NumberField value={project.grading?.widthPerSizeCm ?? 3} min={0} max={12} step={0.1} suffix="cm" onChange={(value) => updateGrading('widthPerSizeCm', clamp(value, 0, 12))} /></div>
                <div className="control-row split-control"><span>Length / size</span><NumberField value={project.grading?.lengthPerSizeCm ?? 1.2} min={0} max={8} step={0.1} suffix="cm" onChange={(value) => updateGrading('lengthPerSizeCm', clamp(value, 0, 8))} /></div>
                <button className={`toggle-row ${showGradeNest ? 'active' : ''}`} onClick={() => setShowGradeNest((value) => !value)}><span><Eye size={15} />Grade nest · XS–XXL</span><i /></button>
              </div>
              {selectedPiece && (
                <div className="panel-section">
                  <div className="panel-title"><span>Grade points · {selectedPiece.name}</span><strong>{selectedPiece.points.filter((point) => point.gradeRule?.enabled||point.industrialGradeRule).length} CUSTOM</strong></div>
                  <p className="panel-copy">AUTO points follow the garment-wide width/length rule. CUSTOM points move by their own X/Y centimeters for each size step away from the base size.</p>
                  <p className="panel-copy">Copy any point's effective X/Y increments and paste them onto another point. Pasting creates an editable CUSTOM rule without changing the base pattern.</p>
                  <div className="grade-bulk-actions"><button type="button" disabled={!gradeRuleClipboard} onClick={() => pastePointGradeRuleToAll(selectedPiece.id)}>Paste to all points</button><button type="button" disabled={!selectedPiece.points.some((point) => point.gradeRule?.enabled)} onClick={() => resetPieceGradeRules(selectedPiece.id)}>Reset piece to AUTO</button></div>
                  <div className="grade-bulk-actions"><button type="button" onClick={exportPieceGradeRules}>Export grade CSV</button><button type="button" onClick={() => gradeRuleCsvInputRef.current?.click()}>Import grade CSV</button></div>
                  <div className="grade-bulk-actions"><button type="button" onClick={exportPieceSizeBreaks}>Export size breaks CSV</button><button type="button" onClick={() => industrialGradeCsvInputRef.current?.click()}>Import size breaks CSV</button></div>
                  <p className="panel-copy">Spreadsheet interchange validates the exact piece ID and point count before applying any changes. All values are centimeters per size step; importing is undoable.</p>
                  <div className="grade-point-table">
                    <div className="grade-point-header"><span>Point</span><span>X / size</span><span>Y / size</span><span>Rule</span><span>Transfer</span></div>
                    {selectedPiece.points.map((point, pointIndex) => {
                      const automatic = automaticGradeDelta(selectedPiece, point)
                      const custom = point.gradeRule?.enabled&&!point.industrialGradeRule
                      return (
                        <div className={`grade-point-row ${custom ? 'custom' : ''}`} key={`${selectedPiece.id}-grade-${pointIndex}`}>
                          <span>P{String(pointIndex + 1).padStart(2, '0')}</span>
                          {custom
                            ? <NumberField ariaLabel={`Point ${pointIndex + 1} X grade increment in centimeters per size`} value={point.gradeRule.dxPerSize ?? 0} min={-12} max={12} step={0.1} suffix="cm" onChange={(value) => updatePointGradeRule(selectedPiece.id, pointIndex, 'dxPerSize', clamp(value, -12, 12))} />
                            : <em>{automatic.dxPerSize >= 0 ? '+' : ''}{automatic.dxPerSize.toFixed(2)}</em>}
                          {custom
                            ? <NumberField ariaLabel={`Point ${pointIndex + 1} Y grade increment in centimeters per size`} value={point.gradeRule.dyPerSize ?? 0} min={-12} max={12} step={0.1} suffix="cm" onChange={(value) => updatePointGradeRule(selectedPiece.id, pointIndex, 'dyPerSize', clamp(value, -12, 12))} />
                            : <em>{automatic.dyPerSize >= 0 ? '+' : ''}{automatic.dyPerSize.toFixed(2)}</em>}
                          <button className={custom||point.industrialGradeRule ? 'active' : ''} onClick={() => setPointGradeRuleEnabled(selectedPiece.id, pointIndex, !custom)}>{point.industrialGradeRule?'BREAKS':custom ? 'CUSTOM' : 'AUTO'}</button>
                          <span className="grade-rule-transfer"><button type="button" aria-label={`Copy grade rule for point ${pointIndex + 1}`} title="Copy X/Y grade increments" onClick={() => copyPointGradeRule(selectedPiece, pointIndex)}>Copy</button><button type="button" aria-label={`Paste grade rule onto point ${pointIndex + 1}`} title="Paste X/Y grade increments" disabled={!gradeRuleClipboard} onClick={() => pastePointGradeRule(selectedPiece.id, pointIndex)}>Paste</button></span>
                        </div>
                      )
                    })}
                  </div>
                  <IndustrialGradeWorkbench piece={selectedPiece} grading={project.grading} onError={setCommandResult} onSetRule={(pointIndex,rule)=>{
                    mutateProject(next=>{const point=next.pieces.find(item=>item.id===selectedPiece.id)?.points?.[pointIndex];if(point)point.industrialGradeRule=structuredClone(rule)})
                  }} onClearRule={pointIndex=>mutateProject(next=>{const point=next.pieces.find(item=>item.id===selectedPiece.id)?.points?.[pointIndex];if(point)delete point.industrialGradeRule})}/>
                </div>
              )}
              <div className="panel-section">
                <div className="panel-title"><span>Automatic marker · {gradePreviewSize}</span><strong>{marker.unusedPieces ? 'INCOMPLETE' : `${Math.round(marker.efficiency * 100)}% EFF.`}</strong></div>
                {markerFabricIds.length > 1 && (
                  <div className="marker-fabric-tabs">
                    {markerFabricIds.map((fabricId) => (
                      <button key={fabricId} className={`${marker.fabricId === fabricId ? 'active' : ''} ${fabricMarkers[fabricId].unusedPieces ? 'incomplete' : ''}`} onClick={() => setMarkerFabricId(fabricId)}>
                        <span>{project.fabrics?.[fabricId]?.name || fabricId}</span>
                        <em>{fabricMarkers[fabricId].unusedPieces ? `${fabricMarkers[fabricId].unusedPieces} MISS` : `${fabricMarkers[fabricId].length.toFixed(1)} cm`}</em>
                      </button>
                    ))}
                  </div>
                )}
                <div className="control-row split-control"><span>{markerFabricIds.length > 1 ? 'Selected fabric width' : 'Fabric width'}</span><NumberField value={marker.width ?? project.markerSettings?.fabricWidthCm ?? 150} min={30} max={300} step={0.5} suffix="cm" onChange={(value) => updateMarkerFabricWidth(marker.fabricId || markerFabricId || 'main', clamp(value, 30, 300))} /></div>
                <div className="control-row split-control"><span>Piece spacing</span><NumberField value={project.markerSettings?.gapCm ?? 1.5} min={0} max={10} step={0.1} suffix="cm" onChange={(value) => updateMarkerSetting('gapCm', clamp(value, 0, 10))} /></div>
                <label className="select-field"><span>Supplier price per fabric meter · {productionCosts.currency}</span><input type="number" min="0" step="0.01" placeholder="Price not set" aria-label="Supplier price per fabric meter" value={project.fabrics?.[marker.fabricId || markerFabricId]?.pricePerMeter ?? ''} onChange={(event) => updateMarkerFabricPrice(marker.fabricId || markerFabricId || 'main', event.target.value)} /></label>
                <MarkerPreview marker={marker} />
                <div className="production-number"><strong>{estimatedLength.toFixed(2)}</strong><span>m {marker.unusedPieces ? 'PLACED ONLY · ' : ''}{project.fabrics?.[marker.fabricId]?.name || marker.fabricId || 'FABRIC'} / {marker.width.toFixed(0)} cm width</span></div>
                <div className="field-grid two">
                  <label><span>Selected fabric area</span><strong>{(productionFabricArea / 10000).toFixed(3)} m²</strong></label>
                  <label><span>Marker efficiency</span><strong>{Math.round(marker.efficiency * 100)}%</strong></label>
                </div>
                {markerFabricIds.length > 1 && (
                  <div className="marker-material-summary">
                    {markerFabricIds.map((fabricId) => {
                      const item = fabricMarkers[fabricId]
                      return <div key={`${fabricId}-marker-summary`}><span>{project.fabrics?.[fabricId]?.name || fabricId}</span><strong>{(item.length / 100).toFixed(2)} m</strong><em>{item.unusedPieces ? `${item.unusedPieces} MISS` : `${Math.round(item.efficiency * 100)}%`}</em></div>
                    })}
                  </div>
                )}
                <div className="field-grid two">
                  <label><span>Estimated material cost · {gradePreviewSize}</span><strong>{productionCosts.totals.find((item) => item.size === gradePreviewSize)?.ready ? `${productionCosts.currency} ${productionCosts.totals.find((item) => item.size === gradePreviewSize).materialCost.toFixed(2)}` : 'INCOMPLETE'}</strong></label>
                  <label><span>Costing basis</span><strong>FABRIC ONLY</strong></label>
                </div>
                <p className="panel-copy">Costs reflect one garment's marker consumption; missing supplier prices or cut pieces prevent a total. Labor, trims, freight, shrinkage and taxes are excluded.</p>
              </div>
              <div className="panel-section">
                <div className="panel-title"><span>POM spec · {gradePreviewSize}</span><strong>{productionMeasurements.length} POM</strong></div>
                <div className="pom-table">
                  {productionMeasurements.map((measurement) => (
                    <div className="pom-row" key={measurement.id}>
                      <span>{measurement.label}</span>
                      <strong>{measurement.cm.toFixed(1)} cm</strong>
                      <em>±{measurement.toleranceCm.toFixed(1)}</em>
                    </div>
                  ))}
                </div>
              </div>
              <div className="panel-section">
                <div className="panel-title"><span>Production data</span><strong>LIVE</strong></div>
                <div className="production-list"><span><i />Pattern geometry</span><span><i />Seam graph</span><span><i />Fabric physicals</span><span><i />Avatar measurements</span><span><i />XS–XXL graded size run</span><span><i />Grain-safe configurable marker</span><span><i />POM measurement size run</span><span><i />DXF cut + allowance + notches</span><span><i />DXF grainlines + piece labels</span><span><i />GarmentCode / PyGarment JSON</span><span><i />3D OBJ garment mesh</span><span><i />Binary GLB / glTF garment</span><span><i />Structured tech-pack data</span></div>
                <button className={`toggle-row ${exportSelectedPatternOnly ? 'active' : ''}`} onClick={() => setExportSelectedPatternOnly((value) => !value)}><span><Scissors size={15} />DXF export selected pattern only{exportSelectedPatternOnly ? ` · ${selectedPiece?.name || 'Select pattern'}` : ''}</span><i /></button>
                <p className="panel-copy">The standalone DXF button preserves the legacy drafting profile: CUT is the stitchline and SA is the allowance contour. The Factory ZIP instead creates a manufacturing profile: CUT is the physical allowance outline, STITCH is the sewing line, and only deliberately authored notches are marked. Both are generic DXF, not verified AAMA/ASTM.</p>
                <button className="wide-action" type="button" onClick={()=>factoryDxfReferenceInputRef.current?.click()}><Upload size={15}/>IMPORT FACTORY DXF · LOCKED CUT REFERENCE</button>
                <p className="panel-copy">Factory DXFs cannot be safely imported as editable sewing patterns. The locked reference action imports one graded physical CUT outline per piece with zero new allowance, without attempting to recover grading or curves. For an editable project, import garment-source.json from the original ZIP.</p>
                <button className="wide-action" type="button" onClick={()=>importInputRef.current?.click()}><Upload size={15}/>RESTORE FACTORY ZIP · VERIFIED EDITABLE SOURCE</button>
                <p className="panel-copy">Choose the original factory ZIP to restore its editable source, including the exact authored curves and graded size run. Version 2 file digests, complete file inventory and regraded geometry must agree or nothing is replaced. Legacy version 1 packages require separate source JSON inspection.</p>
              </div>
              <div className="panel-section" data-testid="cad-import-export-availability-20261028" aria-label="CAD import and export format availability">
                <div className="panel-title"><span>Industrial CAD import / export availability</span><strong>VERIFIED CAPABILITIES ONLY</strong></div>
                <p className="panel-copy">EXO source remains editable, generic DXF provides outline editing only, and factory ZIP restores editable source only when verified. Proprietary Lectra files are not claimed compatible.</p>
                <div className="field-grid two">{CAD_FORMAT_AVAILABILITY_20261028.map(row=><div key={row.extension} className="panel-copy" title={row.note}><strong>{row.extension} · {row.label}</strong><span> Import: {row.import.replaceAll('_',' ')} · Export: {row.export.replaceAll('_',' ')}</span></div>)}</div>
                <button className="wide-action" type="button" onClick={()=>importInputRef.current?.click()}><Upload size={15}/>IMPORT CAD / EDITABLE EXO SOURCE</button>
                <button className="wide-action" type="button" onClick={exportProject}><FileDown size={15}/>EXPORT EDITABLE EXO PROJECT · JSON</button>
                <button className="wide-action" type="button" onClick={exportDxf}><FileDown size={15}/>EXPORT GENERIC DXF · CURRENT SIZE</button>
                <p className="panel-copy">Native MDL, VET, IBA and RUL import/export cannot be enabled until their real file schemas and independent licensed Modaris acceptance have been demonstrated. Selecting one reports the limitation without replacing your garment.</p>
              </div>
              <div className="panel-section" data-testid="industrial-marker-cad-workflow-20261028" aria-label="Industrial marker cutting and CAD receiver engineering audit">
                <div className="panel-title"><span>Industrial marker + CAD interchange · full grade run</span><strong>{deepProductionBusy?'CHECKING':deepProductionAudit?.error?'BLOCKED':deepProductionAudit?'AUDITED':'NOT RUN'}</strong></div>
                <p className="panel-copy">Runs an independent multi-size DXF receiver-wire preflight, physical CUT-to-marker parity, grain-safe polygon nesting, fabric-width constraints and machine-neutral cutter inspection. Notches, drills, fold cutting and other unsupported operations are explicitly blocked—not omitted.</p>
                <button type="button" className="wide-action" disabled={deepProductionBusy} onClick={()=>void runDeepProductionAudit()}>{deepProductionBusy?'CHECKING GRADED PRODUCTION GEOMETRY…':'AUDIT MARKER + CUTTER + DXF · ALL SIZES'}</button>
                {deepProductionAudit?.error&&<p className="panel-copy" role="alert">Audit error: {deepProductionAudit.error}</p>}
                {deepProductionAudit?.cad&&<div className="field-grid two"><label><span>Generic DXF size roundtrips</span><strong>{deepProductionAudit.cad.ok?'LOCAL PASS':'BLOCKED'} · {deepProductionAudit.cad.files.length} files</strong></label><label><span>Receiving CAD acceptance</span><strong>NOT VERIFIED</strong></label></div>}
                {deepProductionAudit?.marker&&<div className="field-grid two"><label><span>Physical marker + cutter studies</span><strong>{deepProductionAudit.marker.ok?'LOCAL PASS':'BLOCKED'} · {deepProductionAudit.marker.rows.length} layouts</strong></label><label><span>Machine-ready cutter program</span><strong>NOT AUTHORIZED</strong></label></div>}
                {(deepProductionAudit?.cad?.issues?.length||deepProductionAudit?.marker?.issues?.length)>0&&<div className="marker-overflow-warning" role="status">{[...(deepProductionAudit.cad?.issues||[]),...(deepProductionAudit.marker?.issues||[])].slice(0,8).map((item,index)=><span key={`${item.code}-${index}`}><strong>{item.code}</strong> · {item.size||'Project'}: {item.detail||item.reason||'Source requirement not verified'}</span>)}</div>}
                <p className="panel-copy">These are local digital engineering checks. Graded physical notch stations can be inspected after marker rotation, but drill protocols and actual cutter notch execution remain unverified. Generic R12 DXF is not certified AAMA/ASTM; licensed external receiving CAD tests, physical markers, cutter qualification and signed factory approval remain required.</p>
              </div>
              <div className="panel-section">
                <div className="panel-title"><span>Manufacturing preflight · all sizes</span><strong>{productionPreflight.status.replaceAll('_', ' ')}</strong></div>
                <p className="panel-copy">{productionPreflight.blockers} blocking issue(s) · {productionPreflight.warnings} construction warning(s). These are document checks, not factory certification or a physical sample approval.</p>
                {productionPreflight.issues.length > 0 && <div className="marker-overflow-warning">{productionPreflight.issues.slice(0, 8).map((issue, index) => <span key={`${issue.code}-${issue.scope}-${index}`}><strong>{issue.severity.toUpperCase()} · {issue.scope}</strong> — {issue.message}</span>)}{productionPreflight.issues.length > 8 && <span>+{productionPreflight.issues.length - 8} additional issues. Export the factory ZIP for the complete report.</span>}</div>}
                {!productionPreflight.issues.length && <p className="panel-copy">Structural and marker checks passed for the size run. Factory system import, print scaling, fit and sample approval remain to be verified.</p>}
              </div>
              {industrialPatternAudit&&<div className="panel-section" aria-label="Independent multi-size manufacturing geometry QA" data-industrial-pattern-qa="true">
                <div className="panel-title"><span>Independent pattern QA · full size run</span><strong>{industrialPatternAudit.status.toUpperCase()}</strong></div>
                <p className="panel-copy">{industrialPatternAudit.sizes.join(', ')} · {industrialPatternAudit.blockers} contour, seam or POM blocker(s) · {industrialPatternAudit.seamReports.length} stitched-edge size checks.</p>
                {industrialPatternAudit.issues.length>0&&<div className="marker-overflow-warning" role="status">{industrialPatternAudit.issues.slice(0,6).map((issue,index)=><span key={`${issue.code}-${issue.scope}-${index}`}><strong>{issue.code}</strong> · {issue.scope}: {issue.message}</span>)}{industrialPatternAudit.issues.length>6&&<span>+{industrialPatternAudit.issues.length-6} further issues. Export the factory ZIP to review industrial-pattern-qa.json.</span>}</div>}
                <p className="panel-copy">Failing seams may require explicit construction ease or corrected geometry. A passing score does not replace independent CAD import, physical prints, a fit sample and factory acceptance.</p>
              </div>}
              {industrialCutlineAudit&&<div className="panel-section" aria-label="Physical cutting contour and seam allowance validation" data-industrial-cutline-qa="true">
                <div className="panel-title"><span>Physical CUT vs STITCH · full size run</span><strong>{industrialCutlineAudit.status.toUpperCase()}</strong></div>
                <p className="panel-copy">{industrialCutlineAudit.checks.length} graded pattern cutting contours checked · {industrialCutlineAudit.blockers} blocker(s). Validates allowance outline closure, intersections and cut area beyond the sewline.</p>
                {industrialCutlineAudit.issues.length>0&&<div className="marker-overflow-warning" role="status">{industrialCutlineAudit.issues.slice(0,5).map((issue,index)=><span key={`${issue.code}-${issue.scope}-${index}`}>{issue.code} · {issue.scope}: {issue.message}</span>)}</div>}
                <p className="panel-copy">Factory ZIP includes industrial-cutline-qa.json and industrial-cutline-areas.csv. Independent receiver CAD, printed scale, fabric/shrink and cutter acceptance remain pending.</p>
              </div>}
              {gradedGeometryAudit&&<div className="panel-section" aria-label="Graded topology and stitchline winding audit" data-graded-topology-qa="true">
                <div className="panel-title"><span>Graded topology · all sizes</span><strong>{gradedGeometryAudit.pass?'PASS':'BLOCKED'}</strong></div>
                <p className="panel-copy">{gradedGeometryAudit.inspectedPieces} graded pieces across {gradedGeometryAudit.inspectedSizes} sizes · {gradedGeometryAudit.issues.length} winding, collapsed-edge or area-collapse finding(s).</p>
                {project.gradeProvenance?.status==='DEVELOPMENT_ONLY_FACTORY_APPROVAL_REQUIRED'&&<p className="panel-copy" role="status">Grading is development-only: {project.gradeProvenance.rationale||'This imported pattern contains provisional grade geometry.'} Source-locked trim contours are not a manufacturer-approved graded size specification.</p>}
                {gradedGeometryAudit.issues.length>0&&<div className="marker-overflow-warning" role="status">{gradedGeometryAudit.issues.slice(0,5).map((issue,index)=><span key={`${issue.code}-${issue.size}-${issue.pieceId}-${index}`}>{issue.code} · {issue.size} · {issue.pieceId}{issue.edgeIndex!=null?` · edge ${issue.edgeIndex}`:''}</span>)}</div>}
                <p className="panel-copy">Factory ZIP includes graded-geometry-qa.json and graded-geometry-issues.csv. Passing topology does not establish fabric behavior, pattern fit, seam construction approval or receiving-CAD compatibility.</p>
              </div>}
              {gradedJunctionAudit&&<div className="panel-section" aria-label="Graded matched sewing endpoint continuity" data-graded-seam-junction-qa="true">
                <div className="panel-title"><span>Shared sewing junctions · all sizes</span><strong>{gradedJunctionAudit.status.toUpperCase()}</strong></div>
                <p className="panel-copy">{gradedJunctionAudit.checks.length} explicit paired corner checks · {gradedJunctionAudit.blockers} endpoint drift blocker(s). A length-matched sewn edge can still have a misplaced corner.</p>
                {gradedJunctionAudit.issues.length>0&&<div className="marker-overflow-warning" role="status">{gradedJunctionAudit.issues.slice(0,5).map((issue,index)=><span key={`${issue.code}-${issue.scope}-${index}`}>{issue.code} · {issue.scope}: {issue.message}</span>)}{gradedJunctionAudit.issues.length>5&&<span>+{gradedJunctionAudit.issues.length-5} further grade junction issues in factory ZIP.</span>}</div>}
                <p className="panel-copy">See graded-seam-junction-qa.json in the factory ZIP. Shared yoke/seat corners require approved coordinated grading before production; this panel cannot certify a garment.</p>
              </div>}
              {project.id==='project-essential-shell'&&industrialPatternAudit?.issues.some(row=>row.code==='SEAM_LENGTH_MISMATCH')&&<div className="panel-section" aria-label="Legacy shell manufacturing correction">
                <div className="panel-title"><span>Legacy Essential Shell · sleeve mismatches</span><strong>NOT A FACTORY TEE</strong></div>
                <p className="panel-copy">The original Essential Shell is a separate unapproved construction. Its graded armholes do not match its sleeve caps. Our independently checked Foundation Tee development template uses a different sewing block and passes all 84 size-specific sewing checks and 24 paired-notch checks.</p>
                <button className="wide-action" onClick={()=>void applyGarmentTemplate('tee')}>OPEN CORRECTED FOUNDATION TEE · UNDOABLE</button>
                <p className="panel-copy">Opens a new four-piece sample draft without silently rewriting the current garment. This does not substitute for physical sampling, a completed neckband, or CAD recipient validation.</p>
              </div>}
              <div className="panel-section" aria-label="External factory sample approval requirements">
                <div className="panel-title"><span>Factory sample acceptance · external</span><strong>PENDING</strong></div>
                <p className="panel-copy">The factory ZIP includes one unapproved worksheet per size, with 100 mm print calibration, approved POM targets versus actual sewn measurements, recipient CAD/version, cut/grain/notch inspection, fit photographs and named operator approval. Nothing is automatically certified.</p>
                <p className="panel-copy">Complete the worksheets only after real cutting, sewing and fit reviews. An actual Gerber/Lectra/AAMA/ASTM destination acceptance record must be attached before claiming manufacturer interoperability.</p>
              </div>
              <button className="wide-action" onClick={exportDxf}><FileDown size={15} />EXPORT DXF · {gradePreviewSize}</button>
              <button className="wide-action" onClick={()=>void inspectVerifiedNativeProductionSource()}><FileDown size={15} />INSPECT VERIFIED NATIVE PRODUCTION SOURCE · NO CUT AUTHORIZATION</button>
              <button className="wide-action" onClick={()=>void createVerifiedNativeProductionStudy()}><FileDown size={15} />VERIFY NATIVE SIX-SIZE CUT STUDY · ONE PER PANEL · NO CUT AUTHORIZATION</button>
              <button className="wide-action" onClick={()=>void exportVerifiedNativeProductionStudy()}><FileDown size={15} />CREATE NATIVE VERIFIED DEVELOPMENT MARKER ARTIFACTS · NO CUT AUTHORIZATION</button>
              <button className="wide-action" onClick={() => exportMarker('pdf')}><FileDown size={15} />DEVELOPMENT PREVIEW MARKER PDF · {gradePreviewSize}</button>
              <button className="wide-action" onClick={() => exportMarker('svg')}><FileDown size={15} />DEVELOPMENT PREVIEW MARKER SVG · {gradePreviewSize}</button>
              <button className="wide-action" onClick={exportBomXml}><FileDown size={15} />EXPORT BOM · XML</button>
              <button className="wide-action" onClick={requestObjExport}><Box size={15} />EXPORT 3D OBJ · {gradePreviewSize}</button>
              <button className="wide-action" onClick={requestGlbExport}><Box size={15} />EXPORT GLB · {gradePreviewSize}</button>
              <button className="wide-action" onClick={exportMeasurements}><FileDown size={15} />EXPORT POM CSV</button>
              <button className="wide-action" onClick={exportGarmentCode}><FileDown size={15} />EXPORT GARMENTCODE JSON</button>
              <button className="wide-action" onClick={exportFactoryPackage}><FileDown size={15} />EXPORT FACTORY PACKAGE · ZIP</button>
              <button className="wide-action" onClick={exportTechPack}><FileDown size={15} />EXPORT TECH PACK</button>
              <button className="wide-action" onClick={exportSizeRun}><FileDown size={15} />EXPORT XS–XXL SIZE RUN</button>
              <button className="wide-action" onClick={exportProject}><FileDown size={15} />EXPORT GARMENT DOCUMENT</button>
              <div className="panel-section">
                <div className="panel-title"><span>ClothCraft · personal Rust integration</span><strong>EXPERIMENTAL</strong></div>
                <p className="panel-copy">Send this EXO project to your local ClothCraft Rust toolchain. Pattern, named seams, curves and basic fabrics are transferred. Factory data and physical fit are not certified. Start the separate localhost service with npm run clothcraft:serve.</p>
              </div>
              <button className="wide-action" disabled={clothCraftBusy} onClick={() => sendToClothCraft(false)}><FileDown size={15} />{clothCraftBusy ? 'CLOTHCRAFT RUNNING…' : 'VALIDATE IN CLOTHCRAFT RUST'}</button>
              <button className="wide-action" disabled={clothCraftBusy} onClick={() => sendToClothCraft(true)}><Box size={15} />BAKE CLOTHCRAFT OBJ + TEMPLATE</button>
              <button className="wide-action" disabled={clothCraftBusy} onClick={() => { setActiveSection('Fit'); void runClothCraftOgc() }}><Cpu size={15} />RUN CLOTHCRAFT VBD + OGC CONTACT · FIT</button>
            </>
          )}

          {activeSection === 'Animation' && (
            <div className="panel-section" aria-label="Animation workspace settings">
              <div className="panel-title"><span>Animation workspace</span><strong>WALK STUDIO</strong></div>
              <p className="panel-copy">The animation canvas, reusable walking presets, and editing timeline are docked within the 3D viewer. This is a visual preview; physics fitting stays unchanged.</p>
              <label className="select-field"><span>Runway stage</span><select aria-label="Animation runway stage" value={normalizeStageId(project.render?.stageId)} onChange={event=>updateRenderSetting('stageId',event.target.value)}><option value="none">Empty studio</option>{listStagePresets().map(preset=><option key={preset.id} value={preset.id}>{preset.name}</option>)}</select></label>
              <button className="wide-action" type="button" onClick={exitAnimationWorkspace}>RETURN TO GARMENT WORKSPACE</button>
            </div>
          )}
          {activeSection === 'Render' && (
            <>
              <div className="panel-section">
                <div className="panel-title"><span>Scene stage</span><strong>{normalizeStageId(project.render?.stageId)==='none' ? 'EMPTY' : normalizeStageId(project.render?.stageId)}</strong></div>
                <label className="select-field"><span>Stage preset</span><select value={normalizeStageId(project.render?.stageId)} onChange={event => updateRenderSetting('stageId', event.target.value)}><option value="none">Empty studio</option>{FEATURED_STAGE_IDS.map(id=>listStagePresets().find(item=>item.id===id)).filter(Boolean).map(preset=><option key={preset.id} value={preset.id}>{preset.id} · {preset.name}</option>)}</select></label>
                <label className="select-field"><span>3D hanger</span><select value={project.render?.hangerPreset || 'none'} onChange={event=>updateRenderSetting('hangerPreset',event.target.value)}><option value="none">No hanger</option>{HANGER_LIBRARY.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <StageCatalog compact selectedStageId={normalizeStageId(project.render?.stageId)} onSelectStage={id => updateRenderSetting('stageId', id)} />
              </div>
              <div className="panel-section">
                <div className="panel-title"><span>Viewport</span><Eye size={15} /></div>
                <button className={`toggle-row ${wireframe ? 'active' : ''}`} onClick={() => setWireframe((value) => !value)}><span><Box size={15} />Wireframe topology</span><i /></button>
                <p className="panel-copy">The viewport is rendered directly from the same particle positions used by the cloth solver. Editing the 2D pattern rebuilds the 3D mesh.</p>
              </div>
              <div className="panel-section">
                <div className="panel-title"><span>Environment lighting</span><strong>{hdriName ? 'HDRI' : 'PMREM'}</strong></div>
                <label className="select-field"><span>Lighting preset</span><select value={project.render?.environmentPreset || 'studio'} onChange={(event) => updateRenderSetting('environmentPreset', event.target.value)}><option value="studio">Studio</option><option value="softbox">Softbox</option><option value="dramatic">Dramatic</option><option value="neutral">Neutral</option></select></label>
                <SliderRow label="Exposure" value={project.render?.exposure ?? 1.1} min={0.2} max={3} step={0.05} display={`${(project.render?.exposure ?? 1.1).toFixed(2)}×`} onChange={(value) => updateRenderSetting('exposure', value)} />
                <button className={`toggle-row ${project.render?.showEnvironment ? 'active' : ''}`} onClick={() => updateRenderSetting('showEnvironment', !project.render?.showEnvironment)}><span><Eye size={15} />Show environment background</span><i /></button>
                {hdriName ? (
                  <div className="fabric-texture-card">
                    <div><strong>{hdriName}</strong><small>Radiance HDR · PMREM filtered</small></div>
                    <button onClick={clearHdri}><Trash2 size={12} /></button>
                  </div>
                ) : <p className="panel-copy">The built-in PMREM studio environment lights PBR fabrics without an external file. Load a Radiance .HDR to use your own environment.</p>}
                <button className="wide-action" onClick={() => hdriInputRef.current?.click()}><Upload size={14} />{hdriName ? 'REPLACE HDRI' : 'LOAD HDRI ENVIRONMENT'}</button>
              </div>
              <div className="panel-section">
                <div className="panel-title"><span>Final still</span><strong>PNG</strong></div>
                <label className="select-field"><span>Output preset</span><select value={`${project.render?.widthPx ?? 2048}x${project.render?.heightPx ?? 2560}`} onChange={(event) => {
                  const [width, height] = event.target.value.split('x').map(Number)
                  updateRenderResolution(width, height)
                }}><option value="1080x1350">1080 × 1350 · 4:5</option><option value="2048x2560">2048 × 2560 · 4:5</option><option value="4096x5120">4096 × 5120 · 4:5</option><option value="2048x2048">2048 × 2048 · Square</option></select></label>
                <div className="field-grid two">
                  <div><span>Width</span><NumberField value={project.render?.widthPx ?? 2048} min={512} max={6144} step={64} suffix="px" onChange={(value) => updateRenderSetting('widthPx', Math.round(clamp(value, 512, 6144)))} /></div>
                  <div><span>Height</span><NumberField value={project.render?.heightPx ?? 2560} min={512} max={6144} step={64} suffix="px" onChange={(value) => updateRenderSetting('heightPx', Math.round(clamp(value, 512, 6144)))} /></div>
                </div>
                <p className="panel-copy">Uses the current orbit camera, settled cloth state, PBR fabrics, trims, environment lighting, ACES tone mapping, and soft shadows. The live viewport size is restored immediately after capture.</p>
                <button className="wide-action" onClick={requestRenderStill}><Download size={14} />RENDER PNG STILL</button>
              </div>
              <div className="panel-section">
                <div className="panel-title"><span>Renderer capabilities</span><strong>LIVE</strong></div>
                <div className="production-list"><span><i />PBR fabric surface</span><span><i />PMREM environment lighting</span><span><i />Custom HDRI environments</span><span><i />Studio lighting presets</span><span><i />Soft shadows</span><span><i />High-resolution PNG stills</span><span className="future"><i />Path-traced final · next</span></div>
              </div>
            </>
          )}

          <div className="inspector-footer">
            <Cpu size={14} /><span>{commandResult}</span>
          </div>
          </CloPropertyEditorAccordion>
            </div>
            </div>
          </div>
          </div>
          </div>
        </aside>
      </main>

      <footer className="simulation-bar">
        <div className="sim-left">
          <div className="sim-footer-mode-switch">
            <button className={`sim-play ${techPackWorkspaceOpen?'active':animationWorkspaceActive ? animationPlaying ? 'active' : '' : visibleRunning ? 'active' : ''}`} disabled={printLayoutActive||techPackWorkspaceOpen} onClick={animationWorkspaceActive ? () => window.dispatchEvent(new Event('exo-clothcraft-animation-toggle')) : simForVisibleEngine}>{techPackWorkspaceOpen?<FileDown size={16}/>:animationWorkspaceActive && animationPlaying || !animationWorkspaceActive && visibleRunning ? <Pause size={16} /> : <Play size={16} />}{techPackWorkspaceOpen?'TECHPACK':printLayoutActive?'PRINT LAYOUT':animationWorkspaceActive ? animationPlaying ? 'PAUSE' : 'ANIMATE' : visibleRunning ? 'PAUSE' : 'SIMULATE'}</button>
            <button type="button" className="sim-mode-arrow" aria-label="Simulation, animation, print layout and Techpack modes" title="Switch between simulation, animation, print layout and Techpack workspaces" aria-haspopup="menu" aria-controls="exo-simulate-footer-dropdown" aria-expanded={leftSimulationMenuOpen} onClick={() => {setSimulationMenuOpen(false);setLeftSimulationMenuOpen(value => !value)}}><ChevronDown size={14}/></button>
            {leftSimulationMenuOpen && <div id="exo-simulate-footer-dropdown" className="sim-footer-mode-menu exo-simulate-clear-glass" role="menu" aria-label="Simulation animation and print layout workspace modes" data-simulate-glass="clear" onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();setLeftSimulationMenuOpen(false)}}}>
              <button type="button" role="menuitem" onClick={()=>{if(animationWorkspaceActive||printLayoutActive)exitFocusedWorkspace();setTechPackWorkspaceOpen(false);setLeftSimulationMenuOpen(false)}}><Check size={13} style={{opacity:animationWorkspaceActive||printLayoutActive||techPackWorkspaceOpen?0:1}}/> Simulation · Fit & sew</button>
              <button type="button" role="menuitem" onClick={enterAnimationWorkspace}><Check size={13} style={{opacity:animationWorkspaceActive?1:0}}/> Animation Workspace · Walk presets</button>
              <button type="button" role="menuitem" onClick={enterPrintLayoutWorkspace}><Check size={13} style={{opacity:printLayoutActive?1:0}}/> Print Layout · Fabric rolls</button>
              <button type="button" role="menuitem" onClick={enterTechPackWorkspace}><Check size={13} style={{opacity:techPackWorkspaceOpen?1:0}}/> Techpack Workspace · Specification pages</button>
              <button type="button" role="menuitem" onClick={()=>{setSimulationMenuOpen(false);setLeftSimulationMenuOpen(false);setFileLibraryStartSave(false);void openFileLibrary()}}><FolderOpen size={13}/> File Library · Saved garments</button>
              {(animationWorkspaceActive||printLayoutActive) && <button type="button" role="menuitem" onClick={exitFocusedWorkspace}>Return to previous workspace</button>}
            </div>}
          </div>
          {!techPackWorkspaceOpen&&<button className="sim-reset" onClick={printLayoutActive ? exitFocusedWorkspace : animationWorkspaceActive ? () => window.dispatchEvent(new Event('exo-clothcraft-animation-reset')) : resetForVisibleEngine}><RotateCcw size={15} />{printLayoutActive?'EXIT':'RESET'}</button>}
          <span className="sim-copy">{techPackWorkspaceOpen?'TECHPACK · USE WORKSPACE DROPDOWN TO SWITCH MODES':printLayoutActive ? 'PRINT LAYOUT · FABRIC MARKER PLANNING' : animationWorkspaceActive ? 'ANIMATION STUDIO · VISUAL WALK PREVIEW' : clothcraftHybrid ? 'CLOTHCRAFT RUST VBD + OGC · NOT CERTIFIED FIT' : !hasSimulated ? 'ARRANGE → SEW → SIMULATE' : running ? 'Draping on avatar…' : 'Paused · Press SIMULATE to resume'}</span>
        </div>
        <div className="sim-stats"><span><Activity size={13} />{clothcraftHybrid ? (clothcraftLive?.vertices ?? 0).toLocaleString() : stats.vertices.toLocaleString()} vertices</span><span>{clothcraftHybrid ? 'RUST SIMULATION' : `${stats.constraints.toLocaleString()} constraints`}</span><span>{clothcraftHybrid ? (clothcraftLive?.seams ?? 0).toLocaleString() : stats.seams.toLocaleString()} seam links</span><span>{clothcraftHybrid ? `${(clothcraftLive?.time ?? 0).toFixed(2)} s` : `${stats.anchors.toLocaleString()} fit tacks`}</span></div>
        <div className="engine-badge"><i className={visibleRunning ? 'active' : ''} /><span>{clothcraftHybrid ? 'RUST VBD + OGC' : 'XPBD CLOTH'}</span><strong>{clothcraftHybrid ? nativeSolverBadge20261028(clothcraftLive) : 'GPU UI / CPU SOLVER'}</strong></div>
      </footer>
      <WorkspaceCommandPalette open={commandPaletteOpen} commands={STUDIO_COMMANDS} onExecute={executeStudioAction} onClose={() => setCommandPaletteOpen(false)} />
      {clothCraftMeshPreview && (
        <ClothCraftPreview obj={clothCraftMeshPreview.obj} garmentName={clothCraftMeshPreview.garmentName}
          avatarObj={clothCraftMeshPreview.avatarObj} diagnostics={clothCraftMeshPreview.diagnostics}
          onClose={() => setClothCraftMeshPreview(null)} />
      )}
    </div>
  )
}
