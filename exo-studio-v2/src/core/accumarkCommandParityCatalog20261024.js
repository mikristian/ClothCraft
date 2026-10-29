import vendor from '../../research/accumark-v10-playlist/ACCUMARK_TOOL_INDEX.json' with {type:'json'}
import {ACCUMARK_2D_COMMANDS} from './accumark2dCommandRegistry.js'

/**
 * Audited, source-linked *known documented subset*, not an exhaustive command
 * dump of the licensed V2026.1 applications.
 *
 * Status describes verified EXO behavior relative to the named *vendor* command:
 *   working     only if exact documented behavior was independently tested
 *   partial     a narrower executable EXO function has a real focused test
 *   missing     explicitly unsupported or blocked in source
 *   unverified  no defensible functional equivalence from available source/tests
 *
 * An interface route, module filename or family foundation is never enough to
 * count as working. No Gerber application parity runs were available.
 */
const evidence = {
  // Grade: deltas, point rules, sourced size-line and local grade diagnostics.
  S004:['src/core/accumarkGradeRuleOperations20261023.js','src/core/accumarkGradeRuleOperations20261023.test.mjs','Size method is bounded to EXO graded geometry.'],
  S005:['src/core/accumarkNumericGradeDelta20261023.js','src/core/accumarkNumericGradeDelta20261023.test.mjs','Native and original Gerber industrial delta-table interchange not verified.'],
  S006:['src/core/accumarkNumericGradeDelta20261023.js','src/core/accumarkNumericGradeDelta20261023.test.mjs','Edits EXO deltas only, without complete vendor rule-table propagation.'],
  S007:['src/core/accumarkGradeRuleOperations20261023.js','src/core/accumarkGradeRuleOperations20261023.test.mjs','Supported EXO normal offsets do not cover all AccuMark grade scenarios.'],
  S008:['src/core/accumarkGradeRuleOperations20261023.js','src/core/accumarkGradeRuleOperations20261023.test.mjs','Partial grade offset editing; original vendor table format not proven.'],
  S009:['src/core/accumarkNamedGradeRuleLibrary20261023.js','src/core/accumarkNamedGradeRuleLibrary20261023.test.mjs','Session/library editing; not AccuMark rule storage-area behavior.'],
  S011:['src/core/accumarkGradeBatch20261023.js','src/core/accumarkGradeBatch20261023.test.mjs','EXO selected-point grade copies, not generalized all-entity copy.'],
  S012:['src/core/accumarkGradeAxisOperations20261023.js','src/core/accumarkGradeAxisOperations20261023.test.mjs','EXO size editing does not verify all vendor line/version semantics.'],
  S013:['src/core/accumarkGradedNotchDistance20261023.js','src/core/accumarkGradedNotchDistance20261023.test.mjs','Graded-point related controls, but exact Add Grade Point behavior not proven.'],
  S014:['src/core/accumarkFullPatternGradeNest20261023.js','src/core/accumarkFullPatternGradeNest20261023.test.mjs','Read-only EXO size overlays and stack preview.'],
  S015:['src/core/industrialGradeRules.js','src/core/industrialGradeRules.test.mjs','EXO rule numbers and calculation only; licensed rule tables not roundtripped.'],
  S016:['src/core/industrialGradeRules.js','src/core/industrialGradeRules.test.mjs','EXO local rule identifiers, not original Gerber rule-number workflow.'],
  S017:['src/core/accumarkPointLineTools20261023.js','src/core/accumarkPointLineTools20261023.test.mjs','Straight segment measurement only; more contexts unverified.'],
  S018:['src/core/draftingSplit.js','src/core/draftingSplitRust.test.mjs','Trace-related drafting tools exist; vendor image/outline auto-trace workflow differs.'],
  S019:['src/core/draftingSplit.js','src/core/draftingSplitRust.test.mjs','EXO split works on a bounded contour subset; preserve all attached grades/seams is not proven.'],
  S020:['src/core/accumarkPointLineTools20261023.js','src/core/accumarkPointLineTools20261023.test.mjs','EXO point/line authoring subset; automatic bitmap line digitization not proven.'],
  S021:['src/core/accumarkPointLineTools20261023.js','src/core/accumarkPointLineTools20261023.test.mjs','Measured edge operations are tested; exact vendor 2-point line operation is not proven.'],
  S024:['src/core/nativeSeamTrueing20261023.js','src/core/nativeSeamTrueing20261023.test.mjs','Native sewn edges can be inspected, but vendor seam-property editor not duplicated.'],
  S025:['src/core/nativeSeamTrueing20261023.js','src/core/nativeSeamTrueing20261023.test.mjs','Sewn-edge walking/diagnostics; automatic trueing and industrial ease remain missing.'],
  S028:['src/core/accumarkPolygonNesting20261024.js','src/core/accumarkPolygonNesting20261024.test.mjs','Polygon marker foundation; not complete vendor marker wizard.'],
  S030:['src/core/accumarkExplorerProductionFoundation20261024.js','src/core/accumarkExplorerProductionFoundation20261024.test.mjs','Basic style/model/BOM record only; native Gerber model editing not proven.'],
  S031:['src/components/ClothCraftWorkspace.jsx','src/core/nativeSeamTrueing20261023.test.mjs','Native 3D controls exist; vendor avatar manipulation/ease parity unverified.'],
  S032:['src/components/ClothCraftWorkspace.jsx','src/core/nativeSeamTrueing20261023.test.mjs','Native 2D/3D interaction exists; vendor interoperability scope not complete.'],
  S041:['src/core/accumarkCutterPathStudy20261024.js','src/core/accumarkCutterPathStudy20261024.test.mjs','Physical CUT study explicitly produces no cutter commands.'],
  S043:['src/core/projectFileLibrary.js',null,'EXO project library; AccuMark storage-area permissions/format are not equivalent.'],
  S044:['src/core/accumarkExplorerProductionFoundation20261024.js','src/core/accumarkExplorerProductionFoundation20261024.test.mjs','EXO metadata/BOM subset, not vendor data-item types.'],
  S051:['src/core/accumarkGradeConstraints20261023.js','src/core/accumarkGradeConstraints20261023.test.mjs','Local graded match line constraints, not all sewn vendor cases.'],
  S052:['src/core/accumarkGradeConstraints20261023.js','src/core/accumarkGradeConstraints20261023.test.mjs','Constrained angle editor is limited to source points.'],
  S053:['src/core/accumarkGradeConstraints20261023.js','src/core/accumarkGradeConstraints20261023.test.mjs','Partial geometric parallel grade relationships.'],
  S054:['src/core/accumarkPointLineTools20261023.js','src/core/accumarkPointLineTools20261023.test.mjs','Bounded measured line/distance functions.'],
  S055:['src/core/accumarkGradeConstraints20261023.js','src/core/accumarkGradeConstraints20261023.test.mjs','Partial intersection constraint system for local graded geometry.'],
  S056:['src/core/accumarkGradeRuleOperations20261023.js','src/core/accumarkGradeRuleOperations20261023.test.mjs','Proportional EXO point-grade distribution only.'],
  S057:['src/core/accumarkGradeRuleOperations20261023.js','src/core/accumarkGradeRuleOperations20261023.test.mjs','Bounded smoothing on eligible EXO grade rule sets.'],
  S067:['src/core/accumarkCutterPathStudy20261024.js','src/core/accumarkCutterPathStudy20261024.test.mjs','Plotter/cutter device protocols and driver support are absent.'],
  S071:['src/core/accumarkExplorerProductionFoundation20261024.js','src/core/accumarkExplorerProductionFoundation20261024.test.mjs','EXO model/order metadata, not vendor storage/utility operations.'],
  S072:['src/core/projectFileLibrary.js',null,'Local project finding; no complete AccuMark Explorer search comparator.'],
  S073:['src/core/project.js',null,'Editable project creation exists; vendor template choices not audited.'],
  S074:['src/components/ClothCraftWorkspace.jsx',null,'Native 3D studio exists; vendor workspace operation not compared.'],
  S075:['src/core/projectFileLibrary.js',null,'Project opening exists; Gerber-specific files not all supported.'],
  S076:['src/core/projectFileLibrary.js',null,'Work-session close/save relationship not independently proven.'],
  S077:['src/core/projectFileLibrary.js',null,'EXO saves projects but not AccuMark storage-area files.'],
  S078:['src/core/projectFileLibrary.js',null,'EXO project copy/save behavior, not native Gerber Save As.'],
  S079:['src/core/patternTiledPrint.js','src/core/patternTiledPrint.test.mjs','SVG/PDF print/export reference; vendor save-image options differ.'],
  S082:['src/core/project.js',null,'EXO project cloning; vendor model-linked copy not proven.'],
  S083:['src/core/accumarkExplorerProductionFoundation20261024.js','src/core/accumarkExplorerProductionFoundation20261024.test.mjs','Style and pattern metadata exist but not complete model notes workflow.'],
  S084:['src/core/accumarkExplorerProductionFoundation20261024.js','src/core/accumarkExplorerProductionFoundation20261024.test.mjs','Model and BOM creation, not native AccuMark model editor.'],
  S085:['src/core/accumarkMarkerProduction20261023.js','src/core/accumarkMarkerProduction20261023.test.mjs','Marker costing is an estimated research calculation only.'],
  S086:['src/core/accumarkPhotoDigitize20261024.js','src/core/accumarkPhotoDigitize20261024.test.mjs','Silhouette-only trace does not recover AccuScan marks/bitmap registration.'],
  S088:['src/core/seamlyAamaManufacturingSemantics20261023.mjs','src/core/seamlyAamaManufacturingSemantics20261023.test.mjs','AAMA DXF original CUT import; vendor native formats not fully supported.'],
  S089:['src/core/seamlyCadExchangeBundle20261023.js','src/core/seamlyCadExchangeBundle20261023.test.mjs','Guarded AAMA package export; no independent licensed receiver verification.'],
  S092:['src/core/patternTiledPrint.js','src/core/patternTiledPrint.test.mjs','Tiled print proof, no plotter-specific controller.'],
  S093:['src/core/patternTiledPrint.js','src/core/patternTiledPrint.test.mjs','Altered/graded plot proof partially accessible, not equivalent print settings.'],
  S097:['src/core/seamlyAamaManufacturingSemantics20261023.mjs','src/core/seamlyAamaManufacturingSemantics20261023.test.mjs','AAMA import safety only; native AccuMark ZIP semantics not proven.'],
  S098:['src/core/seamlyCadExchangeBundle20261023.js','src/core/seamlyCadExchangeBundle20261023.test.mjs','Source-preserving AAMA ZIP, not native Gerber export.'],
  S100:['src/core/accumarkDigitizing20261023.js','src/core/accumarkDigitizing20261023.test.mjs','Calibrated points and AAMA import but not plot stream digitized records.'],
  S101:['src/core/patternTiledPrint.js','src/core/patternTiledPrint.test.mjs','Physical tiled print source.'],
  S102:['src/core/patternTiledPrint.js','src/core/patternTiledPrint.test.mjs','Print preview foundation, vendor preview workflow not compared.'],
  S107:['src/core/accumarkPhotoDigitize20261024.js','src/core/accumarkPhotoDigitize20261024.test.mjs','Threshold/silhouette limited to one isolated shape.'],
  S108:['src/core/accumarkDigitizing20261023.js','src/core/accumarkDigitizing20261023.test.mjs','Imported points editable as reference, not full AccuMark digitizer editor.'],
  S111:['src/core/accumarkExplorerProductionFoundation20261024.js','src/core/accumarkExplorerProductionFoundation20261024.test.mjs','CSV validation exists; direct ERP connector/import does not.'],
  S112:['src/core/accumarkNamedGradeRuleLibrary20261023.js','src/core/accumarkNamedGradeRuleLibrary20261023.test.mjs','EXO marking and grade rules only.'],
  S113:['src/core/accumarkCutRoomPlan20261024.js','src/core/accumarkCutRoomPlan20261024.test.mjs','Cutroom lay tickets, not real background AccuMark batch jobs.'],
  S114:['src/core/accumarkExplorerProductionFoundation20261024.js','src/core/accumarkExplorerProductionFoundation20261024.test.mjs','Validated source-generated CSV audit; no arbitrary ERP import mapping.'],
  S115:['src/core/accumarkExplorerProductionFoundation20261024.js','src/core/accumarkExplorerProductionFoundation20261024.test.mjs','Queryable structured EXO data, but SQL/CSV query parity absent.'],
  S116:['src/core/accumarkExplorerProductionFoundation20261024.js','src/core/accumarkExplorerProductionFoundation20261024.test.mjs','Local report export only, not vendor CSV report templates.'],
}

// These capabilities are explicitly absent or intentionally blocked by safety
// guards. Absence of a mapping otherwise remains *unverified*, not "missing".
const absent = {
  S042:'No connected AccuMark ERP Import Wizard or external authorized ERP.',
  S080:'No Gerber work-session format reader with file/link restoration.',
  S081:'No Gerber work-session file writer/roundtrip.',
  S087:'No physical AccuScan bitmap/source-layer overlay linked to pattern editor.',
  S090:'No tested garment digital-print color profile conversion.',
  S091:'No connected licensed Yunique PLM launch/approval integration.',
  S095:'ERP wizard prerequisite configuration and source mapping missing.',
  S099:'No Gerber V9 to V8 native entity-version converter.',
  S109:'No Gerber proprietary Data Conversion Utility support.',
  S110:'No Windows Winplot device driver integration.',
}

const generalTopicIds = new Set([
  'S001','S002','S003','S026','S029','S033','S034','S035','S036',
  'S037','S038','S039','S040','S045','S046','S047','S048','S049','S050',
  'S058','S059','S060','S061','S062','S063','S064','S065','S066',
  'S068','S069','S070','S094','S105','S106',
])
const workflowIds = new Set(['S009','S010','S022','S023','S027','S028','S030','S031','S032','S043','S044','S071','S072','S083','S084','S104','S109','S112','S116'])
// Related files are not proof of an equivalent named command. These commands
// require closer operator-level inspection even where a nearby tested tool
// exists. Do not inflate partial counts from neighboring capabilities.
const indirectOnly = new Set([
  'S013','S018','S020','S021','S031','S032','S041','S067',
  'S097','S115',
])

const classifyTopic = sourceId => generalTopicIds.has(sourceId)?'reference':
  workflowIds.has(sourceId)?'workflow':'command'
const supportingContracts = sourceId=>ACCUMARK_2D_COMMANDS.filter(x=>x.sourceIds.includes(sourceId)).map(x=>({
  id:x.id,route:x.route.kind,interfaceRouted:x.implemented
}))
const getStatus = (sourceId,kind) => kind==='reference'?'reference':
  Object.hasOwn(absent,sourceId)?'missing':
  indirectOnly.has(sourceId)?'unverified':
  evidence[sourceId]?.[1]?'partial':'unverified'

const official = vendor.items.map(x=>{
  const kind=classifyTopic(x.source_id),ev=evidence[x.source_id],status=getStatus(x.source_id,kind)
  return {
    id:x.source_id,
    label:x.label,
    group:x.category,
    kind,
    status,
    sourceKind:'vendor_help_index',
    helpUrl:x.official_url,
    vendorVersion:'help page version unspecified',
    exoCode:ev?.[0]??null,
    tests:ev?.[1]?[ev[1]]:[],
    limitation:absent[x.source_id]||ev?.[2]||'No verified command-level EXO equivalence from available source and tests.',
    contracts:supportingContracts(x.source_id),
    vendorParityTested:false,
  }
})

const toolboxSource='https://gerber-help.lectra.com/AccuMark/Easy_Marking/Component_Toolbox.htm'
// Each of these *named* functions/modifiers was explicitly checked against
// vendor Easy Marking Toolbox help. Options within one function are not
// misleadingly counted as independent operations here.
const toolboxRows=[
  ['Auto Slide','partial','src/core/accumarkPolygonNesting20261024.js','src/core/accumarkPolygonNesting20261024.test.mjs','EXO automatic shape packing exists; exact AutoSlide sorting/marquee workflow differs.'],
  ['Group Slide','unverified',null,null,'No tested preservation of group marriages during a whole-group slide.'],
  ['Butt','unverified',null,null,'No verified directional vector contact placement with final clearance.'],
  ['Overlap','missing',null,null,'Research marker intentionally forbids overlapping physical cut pieces.'],
  ['Step Piece','partial','src/core/accumarkManualMarker20261024.js','src/core/accumarkManualMarker20261024.test.mjs','Precise user-set X/Y translation; not the same keypad stepping interface.'],
  ['Align','unverified',null,null,'No tested vendor endpoint alignment/tolerance command.'],
  ['Flip','missing',null,null,'Rotation cannot substitute for X/Y material reflection and lay limits.'],
  ['Rotate','partial','src/core/accumarkManualMarker20261024.js','src/core/accumarkManualMarker20261024.test.mjs','Guarded exact rotation subset, not all tilt/override types.'],
  ['Place / Unplace','partial','src/core/accumarkManualMarker20261024.js','src/core/accumarkManualMarker20261024.test.mjs','Existing placements can move; unplaced-piece queue editing not covered.'],
  ['Block / Buffer','partial','src/core/accumarkMaterialRepeatQA20261024.js','src/core/accumarkMaterialRepeatQA20261024.test.mjs','Global clearance/zone QA only, not dynamic per-piece buffer controls.'],
  ['Split in Marker','missing',null,null,'Research marker blocks physically splitting and rejoining pieces.'],
  ['Fold Piece','missing',null,null,'On-fold marker placements are explicitly refused pending folded contour semantics.'],
  ['Center Piece','unverified',null,null,'No verified explicit center-open-space command.'],
  ['Fit Piece','unverified',null,null,'Shape-aware nesting is not an interactive fit-one-piece command.'],
  ['Float Piece','unverified',null,null,'No single-use float allowance and command history.'],
  ['Matching Rules/Lines','partial','src/core/accumarkMaterialRepeatQA20261024.js','src/core/accumarkMaterialRepeatQA20261024.test.mjs','Original plaid/stripe anchors checked, not automatic matching edits.'],
  ['Free Rotate','partial','src/core/accumarkManualMarker20261024.js','src/core/accumarkManualMarker20261024.test.mjs','Exact bounded rotations, no vendor free-angle relaxation limit.'],
  ['Global Override','missing',null,null,'No unsafe lay-limit override; overrides intentionally forbidden by QA.'],
  ['Toolbox Override','missing',null,null,'No command-scoped bypass of fabric/industrial rules.'],
  ['Power Rotate Clockwise','unverified',null,null,'No pivot until-contact sweep.'],
  ['Power Rotate Counterclockwise','unverified',null,null,'No pivot until-contact sweep.'],
  ['Reset Tilt','partial','src/core/accumarkManualMarker20261024.js','src/core/accumarkManualMarker20261024.test.mjs','Rotate-to-zero possible but full operator tilt history not reconstructed.'],
  ['Area/Length/Height AutoSlide Sort','unverified',null,null,'Vendor automatic sort modes not an EXO live option.'],
  ['Alternating X/Y Flip Sort','missing',null,null,'X/Y physical flipped lays cannot be verified by current packing engine.'],
]

const toolbox = toolboxRows.map(([label,status,exoCode,test,limitation],i)=>({
  id:'TB-'+String(i+1).padStart(2,'0'),
  label,group:'marker',kind:'command',sourceKind:'vendor_help_toolbox',
  helpUrl:toolboxSource,vendorVersion:'help page version unspecified',
  status,exoCode,tests:test?[test]:[],limitation,contracts:[],vendorParityTested:false,
}))

const guideSource='https://gerber-help.lectra.com/AccuMark_3D/Pattern_Design_2D/Getting_Started_with_2D.htm'
const guideRows=[
  ['Seam Define','partial','src/core/project.js','src/core/accumarkMarkerConstraintsAcceptance20261023.test.mjs','Per-edge allowances exist; full physically true CUT/STITCH corner handling and swapped native grading missing.'],
  ['Seam Swap','unverified',null,null,'EXO sew/cut candidate lines do not establish a tested industrial swapping command.'],
  ['Place Positioned','partial','src/core/accumarkManualMarker20261024.js','src/core/accumarkManualMarker20261024.test.mjs','Placed marker piece positioning only; PDS work-area positioning differs.'],
  ['Show Smoothing','unverified',null,null,'Curvature overlay feature not individually verified.'],
  ['Show Seams','unverified','src/core/project.js',null,'EXO sew/cut contours shown in UI, but toggle-specific test not verified.'],
  ['Show Notch Shapes','unverified',null,null,'EXO has notch marks but vendor display/shape toggle not verified.'],
  ['Show Grid','unverified','src/core/draftingSnapping.js',null,'Grid visibility exists, exact preference and snap behavior unverified.'],
  ['Click n Go Selection','unverified',null,null,'EXO selection flows differ; no exact multi-selection completion equivalence.'],
]
const guide = guideRows.map(([label,status,exoCode,test,limitation],i)=>({
  id:'PDS-'+String(i+1).padStart(2,'0'),label,group:'pattern/administration',
  kind:'command',sourceKind:'vendor_help_guide',helpUrl:guideSource,
  vendorVersion:'help page version unspecified',status,exoCode,tests:test?[test]:[],
  limitation,contracts:[],vendorParityTested:false,
}))

const accusan='https://gerber-help.lectra.com/AccuScan/Transferring_Images_to_AccuMark.htm'
const scanningRows=[
  ['Scan Image to Pattern Pieces','partial','src/core/accumarkPhotoDigitize20261024.js','src/core/accumarkPhotoDigitize20261024.test.mjs','One isolated flat high-contrast silhouette; no full AccuScan scanner workflow.'],
  ['Set Image Threshold','partial','src/core/accumarkPhotoDigitize20261024.js','src/core/accumarkPhotoDigitize20261024.test.mjs','Brightness threshold in uploaded image, not scanner device calibration.'],
  ['Grade Scanned Notches','missing',null,null,'EXO photo tracing does not recover physical scanned notch rules.'],
  ['Grade Scanned Drill Holes','missing',null,null,'EXO photo tracing does not recover or grade drill holes.'],
  ['Grade Scanned Points','unverified',null,null,'No automatic scanned-corner grade rule 1 assignment equivalence.'],
  ['Crop Preview Image','unverified',null,null,'No scanner-style cropping workflow proven in digitizer.'],
  ['Scan Directly to AccuMark','missing',null,null,'No TWAIN/native Gerber storage-area direct scanner integration.'],
]
const scan = scanningRows.map(([label,status,exoCode,test,limitation],i)=>({
  id:'SCAN-'+String(i+1).padStart(2,'0'),label,group:'digitizing',kind:'command',
  sourceKind:'vendor_help_accuscan',helpUrl:accusan,vendorVersion:'help page version unspecified',
  status,exoCode,tests:test?[test]:[],limitation,contracts:[],vendorParityTested:false,
}))

// Additional individually documented PDS and 3D commands from official help.
// These were not separately indexed in the original local 116-page catalog.
const supplementalRows=[
  ['Slash n Spread · Tapered','drafting','partial','src/core/accumarkPatternOperations20261023.js','src/core/accumarkPatternOperations20261023.test.mjs','Only detached, straight EXO piece fullness supported; multiple sewn/graded source-piece slash lines are blocked.','https://gerber-help.lectra.com/AccuMark/PDS/Function_SlashnSpread.htm'],
  ['Slash n Spread · Parallel','drafting','partial','src/core/accumarkPatternOperations20261023.js','src/core/accumarkPatternOperations20261023.test.mjs','Single detached selection rotation/translation does not reproduce industrial parallel multiple-piece opening.','https://gerber-help.lectra.com/AccuMark/PDS/Function_SlashnSpread.htm'],
  ['Tapered Fullness','drafting','partial','src/core/accumarkPatternOperations20261023.js','src/core/accumarkPatternOperations20261023.test.mjs','Bounded fullness spread of simple detached points; vendor slashes/internal marks and multi-seam behavior missing.','https://gerber-help.lectra.com/AccuMark/PDS/Function_Tapered_Fullness1.htm'],
  ['Open / Close Fullness Objects','drafting','unverified',null,null,'No independently verified reversible vendor-defined fullness-object graph.','https://gerber-help.lectra.com/AccuMark/PDS/Fullness_Open_Close.htm'],
  ['1-Point Fullness','drafting','unverified',null,null,'No source-matched one-point fullness operation proven.','https://gerber-help.lectra.com/AccuMark/PDS/Fullness_Open_Close.htm'],
  ['Variable Fullness','drafting','unverified',null,null,'No supported full variable fullness construction/grade propagation.','https://gerber-help.lectra.com/AccuMark/PDS/Fullness_Open_Close.htm'],
  ['Pleat Fold Verification','sewing','missing',null,null,'No reconstructed industrial pleat fold/underlay geometry and smooth sewline verification.','https://gerber-help.lectra.com/AccuMark/PDS/Function_Pleat_Fold.htm'],
  ['Create 3D Fold Line','simulation/material','unverified',null,null,'Native cloth project has fold concepts, but exact fold diameter and prefold angle data/behavior not proven.','https://gerber-help.lectra.com/AccuMark_3D/Pattern_Design_2D/3D_Menu_for_2D_Workarea.htm'],
  ['Create Folded Collar','simulation/material','unverified',null,null,'No validated inside/outside fold angle and percentage collar control.','https://gerber-help.lectra.com/AccuMark_3D/Pattern_Design_2D/3D_Menu_for_2D_Workarea.htm'],
  ['Create Accordion Pleats','simulation/material','missing',null,null,'No corresponding pleat distribution across paired perimeter lines in native cloth.','https://gerber-help.lectra.com/AccuMark_3D/Pattern_Design_2D/3D_Menu_for_2D_Workarea.htm'],
  ['Delete 3D Fold Line','simulation/material','unverified',null,null,'No validated matching source fold-attribute deletion with sewing dependency checks.','https://gerber-help.lectra.com/AccuMark_3D/Pattern_Design_2D/3D_Menu_for_2D_Workarea.htm'],
  ['View 3D Fold Parameters','simulation/material','unverified',null,null,'Fold line diameter and angle annotation not separately tested.','https://gerber-help.lectra.com/AccuMark_3D/Pattern_Design_2D/3D_Menu_for_2D_Workarea.htm'],
  ['Seam Swap · Digitized Corner Options','sewing','missing',null,null,'Special digitized-corner and rule-preserving sew/cut perimeter swapping is not implemented.','https://gerber-help.lectra.com/AccuMark/PDS/Function_Swap.htm'],
]
const extra = supplementalRows.map(([label,group,status,exoCode,test,limitation,helpUrl],i)=>({
  id:'EXT-'+String(i+1).padStart(2,'0'),label,group,status,exoCode,
  tests:test?[test]:[],kind:'command',sourceKind:'vendor_help_extra',helpUrl,
  vendorVersion:'help page version unspecified',limitation,contracts:[],vendorParityTested:false,
}))

export const ACCUMARK_COMMAND_PARITY_CATALOG_20261024=Object.freeze([...official,...toolbox,...guide,...scan,...extra])
export const ACCUMARK_COMMAND_PARITY_SUMMARY_20261024=(()=>{
  const records=ACCUMARK_COMMAND_PARITY_CATALOG_20261024
  const actions=records.filter(x=>x.kind!=='reference')
  const counts=Object.fromEntries(['working','partial','missing','unverified'].map(s=>[s,actions.filter(x=>x.status===s).length]))
  const contracts=ACCUMARK_2D_COMMANDS
  return Object.freeze({
    scope:'Known help-source actions and workflows, NOT the exhaustive licensed AccuMark V2026.1 command count',
    totalRecords:records.length,
    actionableRecords:actions.length,
    informationalReferences:records.length-actions.length,
    counts,
    uniqueVendorHelpPages:vendor.items.length,
    originalEXOEngineeringContracts:contracts.length,
    routedEXOEngineeringContracts:contracts.filter(c=>c.implemented).length,
    referenceOnlyEXOEngineeringContracts:contracts.filter(c=>!c.implemented).length,
    licensedVendorApplicationParityRuns:0,
    completeProductParityClaim:false,
  })
})()
