// One inventory for the Settings Tool Index and the optional EXO rails.
// Tools remain installed even when their shortcut is removed from a rail.
export const EXO_LEFT_EXTRA_TOOLS = Object.freeze([
  {id:'simulation-modes',label:'Simulation quality modes',icon:'simulation-modes',column:'left',legacyOnly:true},
  {id:'hand',label:'3D fabric hand tool',icon:'hand',column:'left'},
  {id:'move-3d',label:'Move 3D garment',icon:'move-3d',column:'left'},
  {id:'rotate-3d',label:'Rotate 3D fabric',icon:'rotate-3d',column:'right'},
  {id:'wireframe',label:'Toggle garment wireframe',icon:'wireframe',column:'right'},
  {id:'surface',label:'Surface / strain map',icon:'surface',column:'right'},
])

// Keep these identifiers and dispatch actions aligned with RightToolPalette.
export const RIGHT_PALETTE_TOOLS = Object.freeze([
  ['select-3d','Select and transform 3D fabric','transform'],
  ['move-3d','Move 3D fabric','move'],
  ['rotate-3d','Rotate 3D fabric','rotate'],
  ['hand','Fabric hand','hand'],
  ['surface','Surface / strain view','analysis'],
  ['wireframe','Toggle mesh wireframe','wireframe'],
  ['seam-links','3D sewing correspondence','seams'],
  ['select-2d','2D pattern select','select'],
  ['points','Edit pattern points','point'],
  ['split','Split pattern edge','split'],
  ['curve','Adjust pattern curve','curve'],
  ['internal','Internal line / dart','internal'],
  ['notch','Pattern notch','notch'],
  ['seam-allowance','Seam allowance cutting guide','allowance'],
  ['measure','Tape measure / ruler','measure'],
  ['pin','Cloth pin','pin'],
  ['sew','Free sewing','sew'],
  ['fastener','Button or snap fastener','fastener'],
  ['fabric','Fabric browser','Fabric'],
  ['graphics','Graphic browser','Graphic'],
  ['foam-padding','Foam Padding / Trapunto · SVG raised fabric','foam-padding'],
  ['buttons','Button browser','Button'],
  ['buttonholes','Buttonhole browser','Buttonhole'],
  ['topstitch','Topstitch browser','Topstitch'],
  ['trim','Trims / zipper','Trim'],
  ['grading','Grading browser','Grading'],
  ['pom','Points of measure','POM'],
  ['scene','Scene hierarchy','Scene'],
  ['material','Fabric physical properties','fabric-edit'],
  ['fit','Fit analysis','fit'],
  ['simulate','Simulate / pause','simulate'],
  ['reset','Reset flat arrangement','reset'],
  ['camera','Fit 3D view','camera'],
  ['mirror','Create mirrored pattern copy','mirror-pattern'],
  ['export','Export garment file','export'],
  ['seam-weld','Physical seam-closure tool',null],
  ['polygon-tool','Create polygon pattern','create-polygon'],
  ['annotation-add','Add persistent pattern annotation','annotation-add'],
  ['annotation-edit','Edit persistent pattern annotation','annotation-edit'],
  // ArtCraft VectorCraft-inspired Pen/anchor workflows use metric EXO geometry,
  // not proprietary Adobe code or the complete standalone VectorCraft editor.
  ['vector-pen','VectorCraft Pen · Bézier pattern drawing','vector-pen'],
  ['vectorcraft-edit-pattern','VectorCraft Edit Pattern · Curve Points','curve'],
  ['vector-pencil','VectorCraft Pencil · freehand pattern drawing','vector-pencil'],
  ['sewing-match-notches','Place front/back sewing balance notches','sewing-match-notches'],
])

export const EXO_RIGHT_REFERENCE_ACTION_IDS = new Set(['select-2d','points','polygon-tool','internal','notch','seam-allowance','sew'])
export const EXO_RIGHT_EXTRA_TOOLS = Object.freeze(RIGHT_PALETTE_TOOLS
  .filter(([id]) => !EXO_RIGHT_REFERENCE_ACTION_IDS.has(id))
  .map(([id,label,action]) => Object.freeze({id,label,
    icon:id==='vector-pen'?'curve':id==='vectorcraft-edit-pattern'?'points':id==='vector-pencil'?'internal':id==='sewing-match-notches'?'notch':id,
    action,legacyOnly:false})))
export const EXO_LEFT_EXTRA_IDS = new Set(EXO_LEFT_EXTRA_TOOLS.map(item=>item.id))
export const EXO_RIGHT_EXTRA_IDS = new Set(EXO_RIGHT_EXTRA_TOOLS.map(item=>item.id))
