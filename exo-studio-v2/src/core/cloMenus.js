// One authoritative working-action menu index shared between the React
// menubar, native AppKit dispatch, and the command finder/Node regression.
// An unsupported operation has a null action and is never searchable.
// Each section is a genuine flyout within the top menu. Flattened commands
// remain the single action inventory for native menus and command search.
const FILE_SECTIONS = [
  ['New', [['New project', 'file.new'], ['New garment', 'file.new'], ['New from garment library…', 'file.add.garment'], ['New 2D pattern', '2d.add'], ['Add avatar…', 'file.add.avatar']]],
  ['Open & Save', [['Open project…', 'file.open'], ['Open File Library…', 'file.library'], ['Open Tech Pack Studio…', 'file.techpack'], ['Project reference board…', 'file.techpack.references'], ['Save project', 'file.save'], ['Save As project…', 'file.save-as'], ['Save a project version…', 'file.library']]],
  ['Add to Project', [['Garment from library…', 'file.add.garment'], ['Pattern from library…', 'file.add.pattern'], ['Avatar from library…', 'file.add.avatar'], ['Fabric from library…', 'file.add.fabric'], ['Stage from library…', 'file.add.stage']]],
  ['Import', [['Project / garment (.json)', 'file.open'], ['DXF pattern (.dxf)…', 'file.import.dxf'], ['SVG / Adobe Illustrator outlines (.svg)…', 'file.import.svg'], ['Avatar OBJ / GLB…', 'avatar.import'], ['FBX / Alembic / AI direct import · planned', null], ['Hair / pose files · planned', null]]],
  ['Export', [['Project / garment document…', 'file.export'], ['Traditional Tech Pack PDF / Print…', 'file.techpack.print'], ['Digital Tech Pack HTML…', 'file.techpack.html'], ['Private Marketplace Tech Pack listing draft…', 'file.techpack.marketplace'], ['3D garment OBJ…', 'file.export.obj'], ['3D garment GLB…', 'file.export.glb'], ['Pattern DXF…', 'file.export.dxf'], ['PDF / plotter marker…', 'file.export.pdf'], ['SVG marker…', 'file.export.svg'], ['Factory package ZIP…', 'file.export.factory'], ['BOM XML…', 'file.export.bom'], ['Advanced print / plotter configuration · planned', null]]],
  ['Capture', [['Capture still image…', 'render.capture'], ['Record video · planned', null], ['Turntable animation · planned', null]]],
  ['Recent & Information', [['Recent projects / File Library…', 'file.library'], ['Garment information', 'file.info'], ['Garment history', 'workspace.panel.history'], ['File history / saved versions…', 'file.library']]],
]
const EDIT_SECTIONS = [
  ['History', [['Undo', 'edit.undo'], ['Redo', 'edit.redo'], ['View garment history', 'workspace.panel.history']]],
  ['Selection', [['Selection / transform tool', '2d.select'], ['Select all patterns · planned', null], ['Clear selection', 'edit.deselect'], ['Duplicate selected pattern', 'edit.duplicate'], ['Mirror selected pattern', '2d.mirror'], ['Delete selected pattern', 'edit.delete']]],
  ['Pattern Editing', [['Edit points', '2d.points'], ['Split pattern line', '2d.split'], ['Edit curve', '2d.curve'], ['Draw internal line / dart', '2d.internal'], ['Add notch', '2d.notch'], ['Measure / ruler', '2d.measure'], ['Add pattern', '2d.add']]],
  ['Context & Properties', [['Open Object Browser', 'object.scene'], ['Show Property Editor', 'edit.properties'], ['Pattern context menu · right-click canvas', null]]],
  ['Writing & Drawing Tools', [['2D background / tracing image…', 'display.background2d'], ['Graphic / texture…', 'materials.graphic'], ['Text annotation tool · planned', null], ['Pen and freehand drawing · planned', null]]],
]
const withSections=(title,sections,quickActions=[])=>({title,sections,quickActions,commands:[...quickActions,...sections.flatMap(([,items])=>items)]})
export const CLO_MENUS = [
  withSections('File',FILE_SECTIONS),
  withSections('Edit',EDIT_SECTIONS),
  withSections('3D Garment',[
    ['Simulation', [['Simulate / Pause','3d.simulate'],['Reset simulation','3d.reset'],['Simulation quality','settings.simulation']]],
    ['Transform', [['Select / Orbit','3d.orbit'],['Combined transform gizmo','3d.transform'],['Move garment','3d.move'],['Rotate selected pattern','3d.rotate'],['Fabric hand','3d.hand']]],
    ['Camera & Display', [['Fit 3D camera','3d.camera'],['Fit map','3d.fit'],['Show sewing lines','3d.seams'],['Wireframe','display.wireframe'],['Surface','display.surface']]],
  ]),
  withSections('2D Pattern',[
    ['Selection & Pattern', [['Transform pattern','2d.select'],['Edit pattern points','2d.points'],['Add pattern','2d.add'],['Create mirrored pattern copy','2d.mirror']]],
    ['Construction', [['Split line','2d.split'],['Edit curve','2d.curve'],['Internal line / dart','2d.internal'],['Add notch','2d.notch'],['Manual cloth pin','2d.pin']]],
    ['Measure & Reference', [['Tape measure / ruler','2d.measure'],['Add/Edit background image…','display.background2d'],['Pattern SVG import…','file.import.svg']]],
  ]),
  withSections('Sewing',[
    ['Stitch Tools', [['Segment Sew','sewing.segment'],['Free Sew','sewing.free'],['Edit Sewing','sewing.edit'],['Segment / free sewing','sewing.sew'],['Inspect sewing','sewing.inspect'],['Show sewing lines','3d.seams']]],
    ['Finishing', [['Create fastener','sewing.fastener'],['Button browser','object.buttons'],['Buttonhole browser','object.buttonholes'],['Topstitch browser','object.topstitch'],['Zipper / trim browser','object.trim']]],
  ]),
  withSections('Materials',[
    ['Fabric', [['Fabric browser','materials.fabric'],['Edit fabric','materials.edit'],['Add fabric','materials.add'],['Fabric library…','file.add.fabric']]],
    ['Appearance', [['Graphic / texture','materials.graphic'],['Material studio settings…','settings.appearance']]],
  ]),
  withSections('Editor',[
    ['Workspaces', [['Pattern editor','2d.select'],['Fabric editor','materials.fabric'],['Production','workspace.production'],['Tech Pack Studio','file.techpack'],['Rendering studio','render.workspace']]],
    ['Object Browsers', [['Scene hierarchy','object.scene'],['Button browser','object.buttons'],['Buttonhole browser','object.buttonholes'],['Topstitch browser','object.topstitch'],['Trims and zipper browser','object.trim'],['Grading browser','object.grading'],['Points of Measure browser','object.pom']]],
    ['Panels', [['File Library','file.library'],['Project history','workspace.panel.history'],['Show Property Editor','edit.properties']]],
  ]),
  withSections('Avatar',[
    ['Character', [['Avatar library','avatar.library'],['Avatar properties','avatar.properties'],['Add avatar to project','file.add.avatar'],['Import avatar OBJ / GLB…','avatar.import']]],
    ['Character Assets', [['Hair preset files · planned',null],['Poses & motion import · planned',null],['Measurements / fit panel','3d.fit']]],
  ]),
  withSections('Animation',[
    ['Timeline', [['Animation / keyframe timeline · planned',null],['Record garment simulation · planned',null]]],
    ['Playback & Turntable', [['Turntable video · planned',null],['Pose animation · planned',null],['Simulate / Pause','3d.simulate']]],
  ]),
  withSections('Render',[
    ['Scene & Camera', [['Render workspace','render.workspace'],['Stage library','file.add.stage'],['Fit 3D camera','3d.camera'],['Lighting / environment','settings.appearance']]],
    ['Capture & Output', [['Capture still','render.capture'],['Project export','file.export'],['Turntable capture · planned',null]]],
  ]),
  withSections('Display',[
    ['Viewport Appearance', [['3D surface view','display.surface'],['Wireframe','display.wireframe'],['Stress / strain','display.strain'],['Sewing display','3d.seams']]],
    ['2D Pattern', [['2D grid','display.grid'],['Add/Edit 2D Background Image…','display.background2d']]],
    ['Window Views', [['Show both 3D and 2D windows','workspace.view.split'],['Show 3D above 2D windows','workspace.view.stack'],['Maximize 3D garment window','workspace.view.3d'],['Maximize 2D pattern window','workspace.view.2d'],['Reset 3D and 2D divider','workspace.view.reset']]],
  ]),
  withSections('Preferences',[
    ['Workspace', [['Customize workspace…','settings.workspace'],['User preferences…','settings.preferences'],['Show / hide workspace tabs','settings.top-tabs']]],
    ['Window Arrangement', [['Show both 3D and 2D windows','workspace.view.split'],['Show 3D above 2D windows','workspace.view.stack'],['Maximize 3D garment window','workspace.view.3d'],['Maximize 2D pattern window','workspace.view.2d'],['Reset 3D and 2D divider','workspace.view.reset']]],
    ['Layout Presets', [['Pattern Focus · 2D','workspace.profile.patternFocus'],['Drafting layout','workspace.profile.drafting'],['Sewing layout','workspace.profile.sewing'],['Materials layout','workspace.profile.materials'],['Rendering layout','workspace.profile.render'],['Save custom layout','workspace.profile.save'],['Restore custom layout','workspace.profile.restore']]],
    ['Shortcuts', [['Keyboard guide','help.shortcuts'],['Edit shortcuts · planned',null]]],
  ]),
  withSections('Settings',[
    ['Personalization', [['Customize workspace & toolbars…','settings.workspace'],['Themes & studio lighting…','settings.appearance'],['Designer profile & brand…','settings.profile']]],
    ['Editor & Files', [['User preferences…','settings.preferences'],['Files & API…','settings.files'],['Plugins…','settings.plugins'],['File Library…','file.library']]],
    ['Physical Simulation', [['Simulation quality','settings.simulation'],['Fabric defaults','materials.fabric']]],
  ],[['Theme','settings.appearance']]),
  withSections('Help',[
    ['Documentation', [['CLO-style control reference','help.reference'],['Keyboard guide','help.shortcuts'],['Garment information','file.info']]],
    ['Project Support', [['Recent projects / file history','file.library'],['Garment edit history','workspace.panel.history']]],
  ]),
]
