import {CUSTOM_WIDGET_MODES} from './customWorkspacePresets.js'
import {CLO7_3D_A,CLO7_3D_B,CLO7_2D_A,CLO7_2D_B} from '../data/clo7ToolbarOrder.js'
import {STUDIO_THEME_IDS,getStudioTheme,STUDIO_PANEL_FINISHES,studioResolvedPalette} from './studioThemePresets.js'
import {EXO_LEFT_EXTRA_IDS,EXO_RIGHT_EXTRA_IDS} from './exoExtraToolCatalog.js'
import {DEFAULT_CLO_SETTINGS,normalizeCloSettings} from './cloSettingsDefaults.js'
import {MODARIS_TOOLBAR_CATALOG_20261028} from './modarisToolbarCatalog20261028.js'
import {EXO_GRADE_CHART_PRESETS_20261028,EXO_PATTERN_UI_PRESETS_20261028} from './exoSettingsColorPresets20261028.js'
import {getModarisExoRoute20261028} from './modarisCustomToolbarRoute20261028.js'

export const STUDIO_CUSTOMIZATION_KEY = 'exo.studioCustomization.v1'
export const STUDIO_SIDE_TOOL_CATALOG = Object.freeze([
  ...[...CLO7_3D_A,...CLO7_3D_B].map(slot=>({id:`3d:${slot.id}`,label:slot.label,group:'left'})),
  ...[...CLO7_2D_A,...CLO7_2D_B].map(slot=>({id:`2d:${slot.id}`,label:slot.label,group:'right'})),
])
export const DEFAULT_LEFT_TOOL_IDS = Object.freeze(STUDIO_SIDE_TOOL_CATALOG.filter(t=>t.group==='left').map(t=>t.id))
export const DEFAULT_RIGHT_TOOL_IDS = Object.freeze(STUDIO_SIDE_TOOL_CATALOG.filter(t=>t.group==='right').map(t=>t.id))

export const STUDIO_TOOL_CATALOG = Object.freeze([
  {id:'select',label:'Select',group:'2d',icon:'mouse-pointer-2'},
  {id:'exo:add-anchor-point',label:'Add Anchor Point Tool (+)',group:'2d',icon:'pen-tool'},
  {id:'point',label:'Edit Point',group:'2d',icon:'pen-tool'},
  {id:'sew',label:'Segment Sewing',group:'2d',icon:'scissors'},
  {id:'move3d',label:'Move 3D',group:'3d',icon:'move-3d'},
  {id:'rotate3d',label:'Rotate 3D',group:'3d',icon:'rotate-3d'},
  {id:'simulate',label:'Simulate',group:'3d',icon:'play'},
  {id:'reset',label:'Reset Arrangement',group:'3d',icon:'rotate-ccw'},
  {id:'grid',label:'Toggle Grid',group:'view',icon:'grid-3x3'},
  {id:'seams',label:'Toggle Seams',group:'view',icon:'waypoints'},
  {id:'library',label:'Library',group:'panels',icon:'library'},
  {id:'properties',label:'Properties',group:'panels',icon:'sliders-horizontal'},
  {id:'save',label:'Save',group:'file',icon:'save'},
  {id:'fit',label:'Fit View',group:'view',icon:'maximize'},
  {id:'zipper',label:'Zipper Browser',group:'extra tools',icon:'move-horizontal'},
  {id:'trim',label:'Trim Browser',group:'extra tools',icon:'scissors'},
  {id:'foam-padding',label:'Foam Padding / Trapunto',group:'extra tools',icon:'layers-3'},
  {id:'exo:grade-nest-xs-xxl',label:'Nest XS–XXL',group:'Pattern grading · 24 tools',icon:'layers-3'},
  {id:'grade24:prev-point',label:'Prev point',group:'Pattern grading · 24 tools',icon:'grade24:prev-point'},
  {id:'grade24:copy-grading',label:'Copy Grading',group:'Pattern grading · 24 tools',icon:'grade24:copy-grading'},
  {id:'grade24:paste-grading',label:'Paste Grading',group:'Pattern grading · 24 tools',icon:'grade24:paste-grading'},
  {id:'grade24:set-grading-tool',label:'Set Grading tool',group:'Pattern grading · 24 tools',icon:'grade24:set-grading-tool'},
  {id:'grade24:paste-x-grading',label:'Paste X Grading',group:'Pattern grading · 24 tools',icon:'grade24:paste-x-grading'},
  {id:'grade24:paste-y-grading',label:'Paste Y Grading',group:'Pattern grading · 24 tools',icon:'grade24:paste-y-grading'},
  {id:'grade24:paste-relatively',label:'Paste Relatively',group:'Pattern grading · 24 tools',icon:'grade24:paste-relatively'},
  {id:'grade24:paste-dd-grading',label:'Paste DD Grading',group:'Pattern grading · 24 tools',icon:'grade24:paste-dd-grading'},
  {id:'grade24:next-point',label:'Next point',group:'Pattern grading · 24 tools',icon:'grade24:next-point'},
  {id:'grade24:angle',label:'Angle',group:'Pattern grading · 24 tools',icon:'grade24:angle'},
  {id:'grade24:show-from-base-size',label:'Show from Base Size',group:'Pattern grading · 24 tools',icon:'grade24:show-from-base-size'},
  {id:'grade24:grade-proportionally',label:'Grade proportionally',group:'Pattern grading · 24 tools',icon:'grade24:grade-proportionally'},
  {id:'grade24:clear-grading',label:'Clear Grading',group:'Pattern grading · 24 tools',icon:'grade24:clear-grading'},
  {id:'grade24:stack-point',label:'Stack Point',group:'Pattern grading · 24 tools',icon:'grade24:stack-point'},
  {id:'grade24:move-point-size',label:'Move Point Size',group:'Pattern grading · 24 tools',icon:'grade24:move-point-size'},
  {id:'grade24:move-size-along',label:'Move Size Along',group:'Pattern grading · 24 tools',icon:'grade24:move-size-along'},
  {id:'grade24:move-size-proportional',label:'Move Size Proportional',group:'Pattern grading · 24 tools',icon:'grade24:move-size-proportional'},
  {id:'grade24:move-size-parallel',label:'Move Size Parallel',group:'Pattern grading · 24 tools',icon:'grade24:move-size-parallel'},
  {id:'grade24:move-size-by-rectangle',label:'Move Size by Rectangle',group:'Pattern grading · 24 tools',icon:'grade24:move-size-by-rectangle'},
  {id:'grade24:align-points-size',label:'Align Points Size',group:'Pattern grading · 24 tools',icon:'grade24:align-points-size'},
  {id:'grade24:align-vertical-size',label:'Align Vertical Size',group:'Pattern grading · 24 tools',icon:'grade24:align-vertical-size'},
  {id:'grade24:align-horizontal-size',label:'Align Horizontal Size',group:'Pattern grading · 24 tools',icon:'grade24:align-horizontal-size'},
  {id:'grade24:align-size-by-line',label:'Align Size by Line',group:'Pattern grading · 24 tools',icon:'grade24:align-size-by-line'},
  {id:'grade24:grade-notch',label:'Grade Notch',group:'Pattern grading · 24 tools',icon:'grade24:grade-notch'},
  ...MODARIS_TOOLBAR_CATALOG_20261028.map(tool=>({...tool,status:getModarisExoRoute20261028(tool.id)?'mapped':'reference'}))
])

export const DEFAULT_STUDIO_CUSTOMIZATION = Object.freeze({
  version:1,
  appearance:{theme:'graphite',panelFinish:'balanced',liquidGlass:false,patternClearGlass:true,glassBackdrop:'#253d57',glassDensity:'balanced',glassBlur:'smooth',glassIconColor:'adaptive',globalToolbarIconColor:'auto',globalToolbarGlow:false,twoDToolbarIconColor:'auto',twoDToolbarGlassColor:'auto',twoDToolbarGlow:false,glassLibrary:true,glassInspector:true,glassToolbars:true,glassMenu:true,glassWidgets:false,accent:getStudioTheme('graphite').accent,sidebarColor:getStudioTheme('graphite').sidebarColor,panelColor:getStudioTheme('graphite').panelColor,studioColor:'#373941',floorColor:'#ebebed',floorMode:'default',backgroundMode:'default',environmentPreset:'studio',lightColor:'#ffffff',lightIntensity:1,lightPositionX:2.5,lightPositionY:4.5,lightPositionZ:3.1,
    twoDViewerHorizontalColor:'auto',twoDViewerVerticalColor:'auto',threeDViewerHorizontalColor:'auto',threeDViewerVerticalColor:'auto',twoDViewerGlassColor:'auto',threeDViewerGlassColor:'auto',toolbarGlowStrength:.42,toolbarGlowSelectedOnly:false,
    panelLibraryColor:'auto',panelObjectBrowserColor:'auto',leftRailColor:'auto',rightRailColor:'auto',libraryIconColor:'auto',objectBrowserIconColor:'auto',panelGlowStrength:0,panelGlowSelectedOnly:false,interfaceInkColor:'auto',interfaceBrightness:1,autoContrast:true,panelTextInheritsGlobal:true,liquidGlassGlow:false,liquidGlassGlowStrength:.35},
  profile:{displayName:'',brandName:'',bio:'',avatarDataUrl:'',logoDataUrl:''},
  workspace:{toolbarVisible:false,toolbarDock:'left',toolbarPosition:{x:24,y:95},toolbarIds:['select','point','sew','move3d','rotate3d','simulate','grid','save'],toolbarCompact:false,toolbarEditMode:false,customToolbars:[],savedToolbarLibrary:[{id:'saved-liquid-glass-grade-nest',name:'Liquid Glass · Nest XS–XXL',dock:'floating',columns:1,orientation:'horizontal',visible:false,tools:['exo:grade-nest-xs-xxl']}],customWorkspaceWidgets:[],savedWorkspaceLibrary:[],leftToolbarDock:'left',rightToolbarDock:'right',leftToolbarPosition:{x:0,y:0},rightToolbarPosition:{x:0,y:0},leftToolbarIds:[...DEFAULT_LEFT_TOOL_IDS],rightToolbarIds:[...DEFAULT_RIGHT_TOOL_IDS],extraLeftToolIds:[],extraRightToolIds:[],panelOrder:'standard',libraryWidth:240,inspectorWidth:350,objectBrowserHeight:350,viewportLayout:'split',viewportSplit:50,topTabsVisible:true,objectBrowserVisible:true},
  preferences:{language:'en',units:'mm',graphicsQuality:'high',antialias:true,viewControls:'clo',shortcutsPreset:'clo',showGrid:true,showGuides:true,twoDAutoContrast:true,twoDCanvasTheme:'classic',twoDGridStyle:'grid',twoDShowRulers:true,twoDCanvasColor:'auto',twoDGridColor:'auto',twoDDotSize:1,twoDGridOpacity:.8,twoDRulerMarkColor:'auto',twoDRulerGlow:false,twoDRulerGlowStrength:.42,twoDRulerGlassColor:'auto',twoDRulerGlassOpacity:.1,twoDPatternUiTheme:'classic',twoDPatternSurfaceStyle:'solid',gradeChartThemeMode:'auto',gradeTableColorTheme:'auto',compareLengthColorTheme:'auto',twoDPointColor:'auto',twoDEdgeColor:'auto',twoDSelectionColor:'auto',twoDNotchColor:'auto',twoDPatternColor:'auto',autoSave:true,defaultFolder:'',apiBaseUrl:''},
  plugins:{enableLocalTools:true,enableAssetBridge:false},
  cloSettings:DEFAULT_CLO_SETTINGS
})

const palettes=[...STUDIO_THEME_IDS]
const choices=(value,allowed,fallback)=>allowed.includes(value)?value:fallback
const short=(value,max=120)=>typeof value==='string'?value.slice(0,max):''
const hex=(value,fallback)=>typeof value==='string'&&/^#[a-f\d]{6}$/i.test(value)?value:fallback
const hexOrAuto=(value)=>value==='auto'?'auto':hex(value,'auto')
const bool=(value,fallback)=>typeof value==='boolean'?value:fallback
const num=(value,fallback,min,max)=>Number.isFinite(value)?Math.min(max,Math.max(min,value)):fallback
const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{}
const iconColors=value=>Object.fromEntries(Object.entries(object(value)).filter(([id,color])=>id.length<=100&&/^#[\da-f]{6}$/i.test(color||'')).slice(0,256))

export function normalizeStudioCustomization(value){
  const raw=object(value)
  const a=object(raw.appearance),p=object(raw.profile),w=object(raw.workspace),q=object(raw.preferences),g=object(raw.plugins)
  const d=DEFAULT_STUDIO_CUSTOMIZATION
  const theme=choices(a.theme,palettes,d.appearance.theme)
  const panelFinish=choices(a.panelFinish,STUDIO_PANEL_FINISHES.map(p=>p.id),d.appearance.panelFinish)
  const themePalette=studioResolvedPalette(theme,panelFinish)
  const allowedIds=new Set(STUDIO_TOOL_CATALOG.map(t=>t.id))
  const toolbarIds=Array.isArray(w.toolbarIds)?Array.from(new Set(w.toolbarIds.filter(id=>typeof id==='string'&&allowedIds.has(id)))):d.workspace.toolbarIds.slice()
  const safeBars=Array.isArray(w.customToolbars)?w.customToolbars.slice(0,16).filter(bar=>bar&&typeof bar==='object').map((bar,i)=>({id:short(bar.id,64)||`bar-${i}`,name:short(bar.name,48)||`Custom toolbar ${i+1}`,dock:choices(bar.dock,['floating','left','right','top','bottom'],'floating'),dockScope:choices(bar.dockScope,['board','workspace'],'workspace'),columns:num(bar.columns,2,1,4),orientation:choices(bar.orientation,['vertical','horizontal'],'vertical'),visible:bool(bar.visible,true),savedSourceId:short(bar.savedSourceId,64),buttonOnly:bar.savedSourceId==='saved-liquid-glass-grade-nest'||(Array.isArray(bar.tools)&&bar.tools.length===1&&bar.tools[0]==='exo:grade-nest-xs-xxl')||bool(bar.buttonOnly,false),finish:choices(bar.finish,['glass','solid'],'solid'),color:hex(bar.color,'#253d57'),iconColors:iconColors(bar.iconColors),x:num(bar.x,115+i*65,0,3000),y:num(bar.y,125+i*45,0,3000),tools:Array.from(new Set((Array.isArray(bar.tools)?bar.tools:[]).filter(id=>allowedIds.has(id)))).slice(0,64)})):[]
  const savedToolbarLibrary=Array.isArray(w.savedToolbarLibrary)?w.savedToolbarLibrary.slice(0,32).filter(item=>item&&typeof item==='object').map((item,i)=>({id:short(item.id,64)||`saved-${i}`,name:short(item.name,48)||`Saved toolbar ${i+1}`,dock:choices(item.dock,['floating','left','right','top','bottom'],'floating'),columns:num(item.columns,2,1,4),orientation:choices(item.orientation,['vertical','horizontal'],'vertical'),visible:false,buttonOnly:item.id==='saved-liquid-glass-grade-nest'||bool(item.buttonOnly,false),finish:choices(item.finish,['glass','solid'],'solid'),color:hex(item.color,'#253d57'),iconColors:iconColors(item.iconColors),tools:Array.from(new Set((Array.isArray(item.tools)?item.tools:[]).filter(id=>allowedIds.has(id)))).slice(0,64)})):[]
  const safeWorkspaceWidgets=Array.isArray(w.customWorkspaceWidgets)?w.customWorkspaceWidgets.slice(0,16).filter(item=>item&&typeof item==='object').map((item,i)=>({id:short(item.id,64)||`widget-${i}`,name:short(item.name,64)||`Widget ${i+1}`,kind:choices(item.kind,['toolbar','button'],'toolbar'),dock:choices(item.dock,CUSTOM_WIDGET_MODES,'floating'),visible:bool(item.visible,true),liquidGlass:bool(item.liquidGlass,false),columns:num(item.columns,2,1,4),x:num(item.x,110+i*35,0,3000),y:num(item.y,135+i*35,0,3000),tools:Array.from(new Set((Array.isArray(item.tools)?item.tools:[]).filter(id=>allowedIds.has(id)))).slice(0,item.kind==='button'?1:64)})) : []
  const normalizeWorkspaceSnapshot=input=>{
    const snap=object(input)
    return {viewportLayout:choices(snap.viewportLayout,['split','stack','2d','3d'],'split'),panelOrder:choices(snap.panelOrder,['standard','swapped'],'standard'),libraryWidth:num(snap.libraryWidth,240,160,350),inspectorWidth:num(snap.inspectorWidth,350,295,540),objectBrowserHeight:num(snap.objectBrowserHeight,350,230,650),viewportSplit:num(snap.viewportSplit,50,20,80),topTabsVisible:bool(snap.topTabsVisible,true),objectBrowserVisible:bool(snap.objectBrowserVisible,true),leftToolbarDock:choices(snap.leftToolbarDock,CUSTOM_WIDGET_MODES,'left'),rightToolbarDock:choices(snap.rightToolbarDock,CUSTOM_WIDGET_MODES,'right'),customWorkspaceWidgets:Array.isArray(snap.customWorkspaceWidgets)?snap.customWorkspaceWidgets.slice(0,16).filter(widget=>widget&&typeof widget==='object').map((widget,i)=>({id:short(widget.id,64)||`widget-${i}`,name:short(widget.name,64)||'Tools',kind:choices(widget.kind,['toolbar','button'],'toolbar'),dock:choices(widget.dock,CUSTOM_WIDGET_MODES,'floating'),visible:bool(widget.visible,true),liquidGlass:bool(widget.liquidGlass,false),columns:num(widget.columns,2,1,4),x:num(widget.x,150,0,3000),y:num(widget.y,140,0,3000),tools:Array.from(new Set((Array.isArray(widget.tools)?widget.tools:[]).filter(id=>allowedIds.has(id)))).slice(0,widget.kind==='button'?1:64)})):[]}
  }
  const savedWorkspaceLibrary=Array.isArray(w.savedWorkspaceLibrary)?w.savedWorkspaceLibrary.slice(0,24).filter(item=>item&&typeof item==='object').map((item,i)=>({id:short(item.id,64)||`workspace-${i}`,name:short(item.name,64)||`Workspace ${i+1}`,workspace:normalizeWorkspaceSnapshot(item.workspace),appearance:{theme:choices(object(item.appearance).theme,palettes,theme),panelFinish:choices(object(item.appearance).panelFinish,STUDIO_PANEL_FINISHES.map(p=>p.id),panelFinish),liquidGlass:bool(object(item.appearance).liquidGlass,false),glassWidgets:bool(object(item.appearance).glassWidgets,false)}})):[]
  const safeImage=value=>{const data=short(value,300000);return /^data:image\/(png|jpeg|webp);base64,[a-z\d+/=]+$/i.test(data)&&data.length<=300000?data:''}
  return {
    version:1,
    appearance:{theme,panelFinish,liquidGlass:bool(a.liquidGlass,false),patternClearGlass:bool(a.patternClearGlass,true),glassBackdrop:hex(a.glassBackdrop,d.appearance.glassBackdrop),glassDensity:choices(a.glassDensity,['clear','balanced','rich'],d.appearance.glassDensity),glassBlur:choices(a.glassBlur,['crisp','soft','smooth'],d.appearance.glassBlur),glassIconColor:choices(a.glassIconColor,['adaptive','white','ink','accent'],d.appearance.glassIconColor),globalToolbarIconColor:hexOrAuto(a.globalToolbarIconColor),globalToolbarGlow:bool(a.globalToolbarGlow,false),twoDToolbarIconColor:hexOrAuto(a.twoDToolbarIconColor),twoDToolbarGlassColor:hexOrAuto(a.twoDToolbarGlassColor),twoDToolbarGlow:bool(a.twoDToolbarGlow,false),
      twoDViewerHorizontalColor:hexOrAuto(a.twoDViewerHorizontalColor),twoDViewerVerticalColor:hexOrAuto(a.twoDViewerVerticalColor),threeDViewerHorizontalColor:hexOrAuto(a.threeDViewerHorizontalColor),threeDViewerVerticalColor:hexOrAuto(a.threeDViewerVerticalColor),twoDViewerGlassColor:hexOrAuto(a.twoDViewerGlassColor),threeDViewerGlassColor:hexOrAuto(a.threeDViewerGlassColor),toolbarGlowStrength:num(a.toolbarGlowStrength,.42,0,1),toolbarGlowSelectedOnly:bool(a.toolbarGlowSelectedOnly,false),
      panelLibraryColor:hexOrAuto(a.panelLibraryColor),panelObjectBrowserColor:hexOrAuto(a.panelObjectBrowserColor),leftRailColor:hexOrAuto(a.leftRailColor),rightRailColor:hexOrAuto(a.rightRailColor),libraryIconColor:hexOrAuto(a.libraryIconColor),objectBrowserIconColor:hexOrAuto(a.objectBrowserIconColor),panelGlowStrength:num(a.panelGlowStrength,0,0,1),panelGlowSelectedOnly:bool(a.panelGlowSelectedOnly,false),interfaceInkColor:hexOrAuto(a.interfaceInkColor),interfaceBrightness:num(a.interfaceBrightness,1,.5,1.5),autoContrast:bool(a.autoContrast,true),panelTextInheritsGlobal:bool(a.panelTextInheritsGlobal,true),liquidGlassGlow:bool(a.liquidGlassGlow,false),liquidGlassGlowStrength:num(a.liquidGlassGlowStrength,.35,0,1),glassLibrary:bool(a.glassLibrary,d.appearance.glassLibrary),glassInspector:bool(a.glassInspector,d.appearance.glassInspector),glassToolbars:bool(a.glassToolbars,d.appearance.glassToolbars),glassMenu:bool(a.glassMenu,d.appearance.glassMenu),glassWidgets:bool(a.glassWidgets,d.appearance.glassWidgets),accent:themePalette.accent,sidebarColor:themePalette.sidebarColor,panelColor:themePalette.panelColor,studioColor:hex(a.studioColor,d.appearance.studioColor),floorColor:hex(a.floorColor,d.appearance.floorColor),floorMode:choices(a.floorMode,['default','color'],d.appearance.floorMode),backgroundMode:choices(a.backgroundMode,['default','color'],d.appearance.backgroundMode),environmentPreset:choices(a.environmentPreset,['studio','softbox','dramatic','neutral'],d.appearance.environmentPreset),lightColor:hex(a.lightColor,d.appearance.lightColor),lightIntensity:num(a.lightIntensity,d.appearance.lightIntensity,0.1,3),lightPositionX:num(a.lightPositionX,d.appearance.lightPositionX,-20,20),lightPositionY:num(a.lightPositionY,d.appearance.lightPositionY,-20,20),lightPositionZ:num(a.lightPositionZ,d.appearance.lightPositionZ,-20,20)},
    profile:{displayName:short(p.displayName,80),brandName:short(p.brandName,100),bio:short(p.bio,500),avatarDataUrl:safeImage(p.avatarDataUrl),logoDataUrl:safeImage(p.logoDataUrl)},
    workspace:{nativeToolIconColors:iconColors(w.nativeToolIconColors),toolbarVisible:bool(w.toolbarVisible,d.workspace.toolbarVisible),toolbarDock:choices(w.toolbarDock,['top','right','bottom','left','floating'],d.workspace.toolbarDock),toolbarPosition:{x:num(object(w.toolbarPosition).x,24,0,3000),y:num(object(w.toolbarPosition).y,95,0,3000)},toolbarIds,toolbarCompact:bool(w.toolbarCompact,d.workspace.toolbarCompact),toolbarEditMode:bool(w.toolbarEditMode,false),leftToolbarDock:choices(w.leftToolbarDock,['left','right','top','bottom','floating'],d.workspace.leftToolbarDock),rightToolbarDock:choices(w.rightToolbarDock,['left','right','top','bottom','floating'],d.workspace.rightToolbarDock),leftToolbarPosition:{x:num(object(w.leftToolbarPosition).x,0,-1400,1400),y:num(object(w.leftToolbarPosition).y,0,-1200,1200)},rightToolbarPosition:{x:num(object(w.rightToolbarPosition).x,0,-1400,1400),y:num(object(w.rightToolbarPosition).y,0,-1200,1200)},leftToolbarIds:Array.isArray(w.leftToolbarIds)?Array.from(new Set(w.leftToolbarIds.filter(x=>DEFAULT_LEFT_TOOL_IDS.includes(x)))):d.workspace.leftToolbarIds.slice(),rightToolbarIds:Array.isArray(w.rightToolbarIds)?Array.from(new Set(w.rightToolbarIds.filter(x=>DEFAULT_RIGHT_TOOL_IDS.includes(x)))):d.workspace.rightToolbarIds.slice(),extraLeftToolIds:Array.isArray(w.extraLeftToolIds)?Array.from(new Set(w.extraLeftToolIds.filter(x=>EXO_LEFT_EXTRA_IDS.has(x)))):d.workspace.extraLeftToolIds.slice(),extraRightToolIds:Array.isArray(w.extraRightToolIds)?Array.from(new Set(w.extraRightToolIds.filter(x=>EXO_RIGHT_EXTRA_IDS.has(x)))):d.workspace.extraRightToolIds.slice(),customToolbars:safeBars,savedToolbarLibrary,customWorkspaceWidgets:safeWorkspaceWidgets,savedWorkspaceLibrary,panelOrder:choices(w.panelOrder,['standard','swapped'],d.workspace.panelOrder),libraryWidth:num(w.libraryWidth,d.workspace.libraryWidth,160,350),inspectorWidth:num(w.inspectorWidth,d.workspace.inspectorWidth,295,540),objectBrowserHeight:num(w.objectBrowserHeight,d.workspace.objectBrowserHeight,230,650),viewportLayout:choices(w.viewportLayout,['split','stack','3d','2d'],d.workspace.viewportLayout),viewportSplit:num(w.viewportSplit,d.workspace.viewportSplit,20,80),topTabsVisible:bool(w.topTabsVisible,d.workspace.topTabsVisible),objectBrowserVisible:bool(w.objectBrowserVisible,d.workspace.objectBrowserVisible)},
    preferences:{language:choices(q.language,['en','es','fr','de','it','pt','ja','ko','zh'],d.preferences.language),units:choices(q.units,['mm','cm','in'],d.preferences.units),graphicsQuality:choices(q.graphicsQuality,['low','medium','high','ultra'],d.preferences.graphicsQuality),antialias:bool(q.antialias,d.preferences.antialias),viewControls:choices(q.viewControls,['clo','maya','blender','trackpad'],d.preferences.viewControls),shortcutsPreset:choices(q.shortcutsPreset,['clo','illustrator','blender'],d.preferences.shortcutsPreset),showGrid:bool(q.showGrid,d.preferences.showGrid),showGuides:bool(q.showGuides,d.preferences.showGuides),twoDAutoContrast:bool(q.twoDAutoContrast,true),twoDCanvasTheme:choices(q.twoDCanvasTheme,['classic','accumark-green'],d.preferences.twoDCanvasTheme),twoDGridStyle:choices(q.twoDGridStyle,['grid','dots','none'],d.preferences.twoDGridStyle),twoDShowRulers:bool(q.twoDShowRulers,d.preferences.twoDShowRulers),twoDCanvasColor:hexOrAuto(q.twoDCanvasColor),twoDGridColor:hexOrAuto(q.twoDGridColor),twoDDotSize:num(q.twoDDotSize,1,.65,2),twoDGridOpacity:num(q.twoDGridOpacity,.8,.15,1),twoDRulerMarkColor:hexOrAuto(q.twoDRulerMarkColor),twoDRulerGlow:bool(q.twoDRulerGlow,false),twoDRulerGlowStrength:num(q.twoDRulerGlowStrength,.42,0,1),twoDRulerGlassColor:hexOrAuto(q.twoDRulerGlassColor),twoDRulerGlassOpacity:num(q.twoDRulerGlassOpacity,.1,0,.3),twoDPatternUiTheme:choices(q.twoDPatternUiTheme,EXO_PATTERN_UI_PRESETS_20261028.map(p=>p.id).concat('custom'),'classic'),twoDPatternSurfaceStyle:choices(q.twoDPatternSurfaceStyle,['solid','glass','outline'],'solid'),gradeChartThemeMode:choices(q.gradeChartThemeMode,['auto','custom'],'auto'),gradeTableColorTheme:choices(q.gradeTableColorTheme,['auto',...EXO_GRADE_CHART_PRESETS_20261028.map(p=>p.id)],'auto'),compareLengthColorTheme:choices(q.compareLengthColorTheme,['auto',...EXO_GRADE_CHART_PRESETS_20261028.map(p=>p.id)],'auto'),twoDPointColor:hexOrAuto(q.twoDPointColor),twoDEdgeColor:hexOrAuto(q.twoDEdgeColor),twoDSelectionColor:hexOrAuto(q.twoDSelectionColor),twoDNotchColor:hexOrAuto(q.twoDNotchColor),twoDPatternColor:hexOrAuto(q.twoDPatternColor),autoSave:bool(q.autoSave,d.preferences.autoSave),defaultFolder:short(q.defaultFolder,512),apiBaseUrl:short(q.apiBaseUrl,1024)},
    plugins:{enableLocalTools:bool(g.enableLocalTools,d.plugins.enableLocalTools),enableAssetBridge:bool(g.enableAssetBridge,d.plugins.enableAssetBridge)},
    cloSettings:{...normalizeCloSettings(raw.cloSettings),unitSystem:({mm:'Millimeter',cm:'Centimeter',in:'Inch'})[choices(q.units,['mm','cm','in'],d.preferences.units)]}
  }
}

export function loadStudioCustomization(){
  try{
    if(typeof localStorage==='undefined')return normalizeStudioCustomization()
    const json=localStorage.getItem(STUDIO_CUSTOMIZATION_KEY)
    if(!json)return normalizeStudioCustomization()
    const parsed=JSON.parse(json)
    return parsed?.version===1?normalizeStudioCustomization(parsed):normalizeStudioCustomization()
  }catch{return normalizeStudioCustomization()}
}

export function saveStudioCustomization(value){
  const normalized=normalizeStudioCustomization(value)
  try{if(typeof localStorage!=='undefined')localStorage.setItem(STUDIO_CUSTOMIZATION_KEY,JSON.stringify(normalized))}catch{/* Storage may be unavailable or full. */}
  return normalized
}
