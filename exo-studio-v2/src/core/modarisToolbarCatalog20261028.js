/**
 * Modaris-inspired palette and upper-menu inventory for the custom toolbar.
 *
 * Names and palette assignments are discoverability metadata; keyboard palette
 * assignments and exact operation semantics vary across Modaris releases.
 * A nativeCandidate is an existing EXO action ID, NOT proof of feature parity.
 * Consumers must resolve that ID against a live, verified action/capability
 * before enabling anything. Entries without one deliberately remain unavailable.
 */
const GROUPS = [
  ['F1','Points and lines','pen-tool',[
    'select|Select|select','point|Point|point','slider-point|Slider point',
    'developed-point|Developed point','developed-series|Developed series',
    'linked-point|Linked point','intersection|Intersection point',
    'add-point|Add point|point','relative-point|Relative point',
    'align-2-points|Align 2 points','align-3-points|Align 3 points',
    'division-point|Division point','projection-point|Projected point',
    'free-point|Free point|point','midpoint|Midpoint',
    'straight-line|Straight line|line','parallel-line|Parallel line',
    'slanted-line|Slanted line','perpendicular-line|Perpendicular line',
    'bezier-curve|Bézier curve','semicircular-curve|Semicircular curve',
    'segment|Segment|line','angle-line|Angled line','tangent-line|Tangent line',
    'spline|Spline','arc|Arc','curve-through-points|Curve through points',
    'polygon|Polygon|polygon','closed-contour|Closed contour|polygon',
    'internal-line|Internal line|line','construction-line|Construction line|line',
    'trace|Trace|trace','symmetry-axis|Symmetry axis',
    'symmetrize|Symmetrize','duplicate|Duplicate|duplicate','sequence-division|Sequence division',
    'digitize|Digitize','recover-digit|Recover digit',
  ]],
  ['F2','Notches, orientation and shapes','scissors',[
    'notch|Notch|notch','notch-type|Notch type','notch-orientation|Notch orientation',
    'bisecting-line|Bisecting line','perpendicular-notch|Perpendicular notch',
    'outside-notch|Outside notch','marking|Marking','drill-mark|Drill mark',
    'rectangle|Rectangle|rectangle','circle|Circle','oval|Oval|ellipse',
    'arc-arrow|Arc arrow','arc-radius|Arc radius',
    'piece-orientation|Piece orientation','notch-point|Notch point',
    'multiple-notches|Multiple notches','button-mark|Button mark',
    'buttonhole|Buttonhole','drill-hole|Drill hole',
  ]],
  ['F3','Modification','move',[
    'delete|Delete|delete','move|Move','rotate|Rotate','scale|Scale',
    'stretch|Stretch','lengthen|Lengthen','adjust-2-lines|Adjust 2 lines',
    'lengthen-straight-line|Lengthen straight line','simplify-curve|Simplify curve',
    'shrinkage|Shrinkage','reshape|Reshape','section|Section',
    'merge|Merge','attach|Attach','detach|Detach',
    'insert-point|Insert point','pin|Pin','pin-graded-points|Pin graded points',
    'pin-characteristic-points|Pin characteristic points','pin-ends|Pin ends',
    'remove-pin|Remove pin','link-to-measure|Link to a measure',
    'constraint-by-measure|Constraint by measure','delete-constraint|Delete constraint',
    'mirror|Mirror|mirror','split|Split|split','join|Join contours',
    'extend|Extend','shorten|Shorten','trim|Trim',
    'offset|Offset contour','smooth-curve|Smooth curve','group|Group','ungroup|Ungroup',
  ]],
  ['F4','Industrialization and pieces','shapes',[
    'line-seam|Line seam','delete-line-seam|Delete line seam value',
    'piece-seam|Piece seam','delete-piece-seam|Delete piece seam value',
    'seam-allowance|Seam allowance|allowance','variable-seam-allowance|Variable seam allowance',
    'grainline-axis|Grainline axis','cross-axis|Cross axis',
    'commentary-axis|Commentary axis','grading-axis|Grading axis',
    'special-axis|Special axis','reference-axis|Reference axis',
    'other-axis|Other axis','add-corner|Add corner',
    'change-corner|Change corner','corner-treatment|Corner treatment',
    'exchange-data|Exchange data','swap-piece-name|Swap piece name',
    'piece-extraction|Piece extraction','cut-extraction|Cut extraction',
    'export-piece|Export piece','import-piece|Import piece',
    'internal-cut|Internal cut','seam-creation|Seam creation',
    'cut-creation|Cut creation','exchange-seam-cut|Exchange seam / cut',
    'extract-piece|Extract piece','trace-piece|Trace piece',
    'industrial-audit|Industrial audit|industrial-audit',
    'piece-label|Piece label','material-assignment|Assign material',
  ]],
  ['F5','Derived pieces, folds and darts','scissors',[
    'cut-straight|Cut straight','cut-2-points|Cut 2 points','cut-plot|Cut plot',
    'join|Join','symmetry-2-points|Symmetry 2 points',
    'mirror-piece|Mirror piece|mirror','center-axis|Center axis',
    'effective-fold-creation|Effective fold creation','fold-creation|Fold creation',
    'pivoting-dart|Pivoting dart','dart-cap|Dart cap',
    'change-fold-notches|Change fold notches','create-piece|Create piece|polygon',
    'dart|Create dart','dart-transfer|Transfer dart','dart-close|Close dart',
    'pleat|Pleat|pleat','tuck|Tuck','slash-spread|Slash and spread',
    'pivot-piece|Pivot piece','add-facing|Facing','add-lining|Lining',
    'add-interfacing|Interfacing','add-pocket|Pocket',
    'fold-line|Fold line','piece-merge|Merge pieces','piece-cut|Cut piece',
  ]],
  ['F6','Grading','ruler',[
    'grading-table|Grading table|grade-chart','grading-rule|Grading rule|grade-edit',
    'grade-run|Generate sizes|grade-run','grade-audit|Check grading|grade-audit',
    'grade-point|Grade point|grade-edit','grade-x|Grade X','grade-y|Grade Y',
    'grade-xy|Grade XY','grade-angle|Grade angle','grade-proportional|Grade proportionally',
    'grade-parallel|Grade parallel','grade-nest|Nest graded sizes',
    'grade-copy|Copy grading|grade-copy','grade-paste|Paste grading|grade-paste','grade-paste-x|Paste X grading|grade-paste-x',
    'grade-paste-y|Paste Y grading|grade-paste-y','grade-notch|Grade notch|grade-notch',
    'grade-stack|Stack grade points|grade-stack','grade-clear|Clear grading|grade-clear',
    'control-grading|Control grading','nest|Nest','packing|Packing',
    'effective-packing|Effective packing','orient-2-points|Orient 2 points',
    'free-grading|Free grading','linearise|Linearise',
    'report-x|Report X','report-y|Report Y','equate|Equate',
    'cancel-grading|Cancel grading','grapro|GraPro','pro2pts|Pro2Pts',
    'grarot|GraRot','oriented-grading|Oriented grading',
    'xsym|XSym','ysym|YSym','repsq|RepSQ',
  ]],
  ['F7','Evolution system and size management','ruler',[
    'add-size-correspondence|Add size correspondence',
    'delete-size-correspondence|Delete size correspondence',
    'add-size-to-product|Add size to product',
    'delete-size-from-product|Delete size from product',
    'add-intermediate-size|Add intermediate size','break-size|Break size',
    'load-size-table|Load size table','copy-size-table|Copy size table',
    'size-grouping|Size grouping','basic-size-slide|Basic size slide',
    'basic-size-modification|Basic size modification',
    'size-correspondence-management|Size correspondence management',
    'nest-modification|Nest modification','evolution-table|Evolution table',
  ]],
  ['F8','Measurements, assembly and variants','ruler',[
    'length|Length','dx-measurement|DX measurement',
    'dy-measurement|DY measurement','dl-measurement|DL measurement',
    'seam-length|Seam length','cut-length|Cut length',
    'area|Area','perimeter|Perimeter','angle|Angle',
    'measurement-spreadsheet|Measurement spreadsheet',
    'measurement-deletion|Measurement deletion',
    'measurement-export|Measurement export',
    'cumulative-measurements|Cumulative measurements',
    'dynamic-measurements|Dynamic measurements',
    'chart-manager|Chart manager','assembly|Assembly',
    'variants|Variants','measurement-chart|Measurement chart',
    'seam-walk|Walk seam|seam-walk','sewing-balance|Sewing balance',
    'measure-length|Length measurement|measure','measure-perimeter|Perimeter measurement',
    'measure-angle|Angle measurement','measure-area|Area measurement',
    'measure-distance|Distance measurement',
    'measurement-formula|Measurement formula','constraints|Constraints',
    'reference-recompute|Recompute references','compare-sizes|Compare sizes',
    'compare-pieces|Compare pieces','seam-length-check|Seam length check',
  ]],
  ['Menu','File','folder-open',[
    'new|New project','open|Open project','recent|Recent projects',
    'save|Save|save','save-as|Save as','import|Import CAD|interchange',
    'export|Export|export','export-dxf|Export DXF|interchange',
    'export-pdf|Export PDF|export','print|Print','plot|Plot',
    'project-properties|Project properties','close|Close project',
  ]],
  ['Menu','Edit','undo-2',[
    'undo|Undo|undo','redo|Redo|redo','cut|Cut','copy|Copy',
    'paste|Paste','paste-special|Paste special','select-all|Select all|select',
    'invert-selection|Invert selection','preferences|Preferences',
  ]],
  ['Menu','View','eye',[
    'view-toolbar|Toolbars','view-object-browser|Object browser',
    'view-properties|Property editor','view-status|Status bar',
    'view-measurements|Measurements','view-layer|Layers',
    'view-grading-table|Grading table|grade-chart','view-fullscreen|Full screen',
    'view-2d|2D workspace|view-2d','view-split|2D/3D split view|view-split',
  ]],
  ['Menu','Sheet and model','layers',[
    'sheet-new|New sheet','sheet-duplicate|Duplicate sheet',
    'sheet-delete|Delete sheet','model-new|New model',
    'model-rename|Rename model','model-copy|Copy model',
    'variant|Variant|variant','model-components|Model components',
  ]],
  ['Menu','Tools','wrench',[
    'check-contour|Check contour','check-seams|Check seams|true-seam',
    'check-measurements|Check measurements|measure',
    'automatic-notches|Automatic notches','automatic-grading|Automatic grading|grade-run',
    'piece-order|Piece order','digitize|Digitize','calibrate|Calibrate',
  ]],
  ['Menu','Measurements','ruler',[
    'measure-length|Length measurement|measure','measure-perimeter|Perimeter measurement|measure',
    'measure-angle|Angle measurement|measure','measure-area|Area measurement|measure',
    'measure-distance|Distance measurement|measure',
    'measurement-chart|Measurement chart|measurement-chart',
    'measurement-formula|Measurement formula|constraints',
    'constraints|Constraints|constraints','reference-recompute|Recompute references|reference-recompute',
    'compare-sizes|Compare sizes','compare-pieces|Compare pieces',
    'seam-length-check|Seam length check|seam-walk',
  ]],
  ['Menu','Help','circle-help',[
    'help|Help','keyboard-shortcuts|Keyboard shortcuts',
    'tool-index|Tool index','about|About',
  ]],
  // Additional classic upper-menu families. These are reference commands
  // until their actual EXO behavior is explicitly implemented and verified.
  ['Menu','Corner tools','shapes',[
    'corner-add|Add corner','corner-change|Change corner',
    'corner-delete|Delete corner','corner-reset|Reset corner',
    'corner-radius|Corner radius','corner-angle|Corner angle',
  ]],
  ['Menu','Display','eye',[
    'display-axes|Display axes','display-cut|Display cutline',
    'display-seam|Display seam','display-grid|Display grid',
    'display-grades|Display graded pieces','display-notches|Display notches',
    'display-point-numbers|Display point numbers','display-title-block|Display title block',
  ]],
  ['Menu','Sizes','ruler',[
    'sizes-table|Size table','sizes-correspondence|Size correspondence',
    'sizes-base|Set base size','sizes-show|Show sizes','sizes-hide|Hide sizes',
    'sizes-next|Next size','sizes-previous|Previous size',
  ]],
  ['Menu','Selection','mouse-pointer-2',[
    'selection-all|Select all objects','selection-clear|Clear selection',
    'selection-invert|Invert current selection','selection-sheet|Select sheet',
    'selection-pattern|Select pattern','selection-line|Select lines',
    'selection-point|Select points',
  ]],
  ['Menu','Macro','play',[
    'macro-record|Record macro','macro-stop|Stop macro',
    'macro-play|Run macro','macro-save|Save macro','macro-load|Load macro',
  ]],
  ['Menu','Layers','layers',[
    'layers-new|New layer','layers-rename|Rename layer',
    'layers-show|Show layer','layers-hide|Hide layer',
    'layers-reorder|Reorder layers','layers-delete|Delete layer',
  ]],
  ['Menu','Parameters','sliders-horizontal',[
    'parameters-units|Measurement units','parameters-precision|Construction precision',
    'parameters-plot-scale|Plotting scale','parameters-interoperability|Interoperability parameters',
  ]],
  ['Menu','Configure','settings',[
    'configure-workspace|Configure workspace','configure-toolbar|Configure toolbar',
    'configure-shortcuts|Configure shortcuts','configure-system|System configuration',
  ]],
  ['Menu','Tool','wrench',[
    'tool-activate|Activate tool','tool-reset|Reset tool','tool-properties|Tool properties',
  ]],
]

const SUPPORTED_EXISTING = new Set([
  'select','point','line','curve','polygon','rectangle','ellipse','move','split','mirror','true-seam','trace','duplicate','delete',
  'dart','pleat','measure','measurement-chart','constraints','reference-recompute',
  'grade-chart','grade-edit','grade-run','grade-audit','grade-copy','grade-paste','grade-paste-x','grade-paste-y','grade-notch','grade-clear','grade-stack','sew','seam-walk',
  'sewing-balance','notch','allowance','facing','cutline','industrial-audit',
  'view-2d','view-split','simulate','variant','undo','redo','save','export','interchange',
])

// Use EXO's original CAD glyph vocabulary so neighboring custom-toolbar
// buttons are recognizable at 20px. These icons describe functionality and
// are independent artwork, not copies of Lectra's proprietary icon set.
export function modarisToolbarIcon20261028(slug,palette,fallback='select'){
  const s=String(slug).toLowerCase()
  if(/notch/.test(s))return 'notch'
  if(/grade|grading|grapro|grarot|repsq|pro2pts|packing|nest|size|evolution|control/.test(s))return 'grading'
  if(/seam-allowance|line-seam|piece-seam|allowance/.test(s))return 'seam-allowance'
  if(/sew|assembly|walk-seam|seam-length/.test(s))return 'sew-pair'
  if(/dart|pivot/.test(s))return 'fold-arrangement'
  if(/pleat|fold|tuck/.test(s))return 'fold-garment'
  if(/mirror|symmetr/.test(s))return 'mirror'
  if(/duplicate|copy|paste/.test(s))return 'duplicate-piece'
  if(/delete|remove|clear/.test(s))return 'delete-piece'
  if(/curve|bezier|spline|arc|semicircular/.test(s))return 'curve'
  if(/point|slider|developed|intersection|division|align/.test(s))return 'points'
  if(/cut|trim|section|split|extract/.test(s))return 'split'
  if(/line|axis|perpendicular|parallel|slanted|grain/.test(s))return 'internal'
  if(/rotate|orientation/.test(s))return 'rotate'
  if(/move|shift|translate|position/.test(s))return 'move'
  if(/pin/.test(s))return 'pin'
  if(/mark|button|drill/.test(s))return 'buttons'
  if(/rectangle|circle|oval|polygon|piece|contour/.test(s))return 'polygon'
  if(/measure|length|width|perimeter|area|distance|dx|dy|dl|angle|chart/.test(s))return 'measure'
  if(/trace|digitiz/.test(s))return 'trace'
  if(/export|print|plot|save/.test(s))return 'export'
  if(/grid|display|view|ruler/.test(s))return 'grid-2d'
  if(/select/.test(s))return 'select'
  if(/fabric|material/.test(s))return 'fabric'
  if(/simulate|3d/.test(s))return 'simulate'
  if(/setting|configure|parameter|preference/.test(s))return 'settings'
  if(palette==='F6'||palette==='F7')return 'grading'
  if(palette==='F8')return 'measure'
  return ['pen-tool','scissors','shapes','ruler','folder-open','undo-2','eye','layers','play','wrench','circle-help'].includes(fallback)?'select':fallback
}

export const MODARIS_TOOLBAR_CATALOG_20261028 = Object.freeze(GROUPS.flatMap(([palette,category,icon,rows]) =>
  rows.map(row=>{
    const [slug,label,nativeCandidate] = row.split('|')
    const mapped = nativeCandidate && SUPPORTED_EXISTING.has(nativeCandidate)
    return Object.freeze({
      id:`modaris:${palette.toLowerCase()}:${slug}`,
      label,category,group:`${palette} · ${category}`,palette,icon:modarisToolbarIcon20261028(slug,palette,icon),
      description:`${label} in the ${category.toLowerCase()} palette.`,
      nativeCandidate:mapped?nativeCandidate:null,
      availability:'requires-verification',
      unsupportedReason:mapped
        ?'Enable only after validating the corresponding EXO action and its prerequisites; Modaris behavior is not independently verified.'
        :'No verified EXO action mapping exists for this command.',
    })
  })
))

const BY_ID = new Map(MODARIS_TOOLBAR_CATALOG_20261028.map(tool=>[tool.id,tool]))
if(BY_ID.size!==MODARIS_TOOLBAR_CATALOG_20261028.length)
  throw new Error('Duplicate Modaris toolbar catalog ID')

export function getModarisToolbarTool20261028(id) {
  return BY_ID.get(id) ?? null
}

/** Never enables a command based on catalog metadata alone. */
export function resolveModarisToolbarTool20261028(id, verifiedActions={}) {
  const tool=getModarisToolbarTool20261028(id)
  if(!tool)return {available:false,reason:'Unknown Modaris toolbar command'}
  const candidate=tool.nativeCandidate
  const action=candidate && verifiedActions[candidate]
  if(typeof action!=='function')
    return {available:false,reason:tool.unsupportedReason,tool}
  return {available:true,action,tool}
}
