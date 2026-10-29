import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { STUDIO_TOOL_CATALOG } from '../core/studioCustomization.js';
import * as studioCatalog from '../core/studioCustomization.js';
import {STUDIO_THEME_PRESETS,STUDIO_PANEL_FINISHES,studioResolvedPalette} from '../core/studioThemePresets.js';
import {resolveThemePaletteCover20261028} from '../core/studioThemePaletteCover20261028.js';
import {EXO_PATTERN_UI_PRESETS_20261028,EXO_PATTERN_OUTLINE_COLORS_20261028,EXO_GRADE_CHART_PRESETS_20261028,exoAutomaticGradeChartPalette20261028} from '../core/exoSettingsColorPresets20261028.js';
import {ICON_COLOR_SWATCHES_20261028} from '../core/studioIconPalette20261028.js';
import {loadSavedThemePresets,saveNamedThemePreset,deleteSavedThemePreset,exportSavedThemePresets,importSavedThemePresets,applySavedThemePreset,loadThemeSchedule,saveThemeSchedule} from '../core/themePresetManager.js';
import {EXO_LEFT_EXTRA_TOOLS,EXO_RIGHT_EXTRA_TOOLS} from '../core/exoExtraToolCatalog.js';
import {OPEN_SOURCE_PATTERN_SOURCES, PATTERN_TOOL_CATEGORIES, filterOpenSourcePatternTools} from '../core/openSourcePatternToolCatalog.js';
import {CLO7_3D_A,CLO7_3D_B,CLO7_2D_A,CLO7_2D_B} from '../data/clo7ToolbarOrder.js';
import {planCompleteModarisToolbars20261028} from '../core/modarisToolbarLayout20261028.js';
import CadToolIcon from './CadToolIcon.jsx';
import StudioToolbarBuilder from './StudioToolbarBuilder.jsx';
import StudioCustomWorkspaceBuilder from './StudioCustomWorkspaceBuilder.jsx';
import {CLO_SETTINGS_NAV,CloSettingsPages} from './CloSettingsPages.jsx';
import './StudioSettingsDialog.css';
import './StudioToolIndexGrid.css';

const SECTIONS = [ ['workspace','2D Workspace'], ['units','Units'], ['toolIndex','Tool Index'], ['customToolbar','Custom Toolbar'], ['customWorkspace','Custom Workspace'], ['theme','Theme'], ['environment','Environment'], ['profile','Profile'], ['preferences','Preferences'], ['filesApi','Files & API'], ['plugins','Plugins'] ];
const toolCatalog = Array.isArray(STUDIO_TOOL_CATALOG) ? STUDIO_TOOL_CATALOG : Object.entries(STUDIO_TOOL_CATALOG || {}).map(([id, tool]) => ({ id, ...(typeof tool === 'object' ? tool : { label: tool }) }));
const sideToolCatalog = Array.isArray(studioCatalog.STUDIO_SIDE_TOOL_CATALOG) ? studioCatalog.STUDIO_SIDE_TOOL_CATALOG : [];
const sideToolById = new Map(sideToolCatalog.map(tool => [tool.id, tool]));
const sideToolIds = new Set(sideToolById.keys());
const nativeIndexSections = [
  {side:'left',title:'3D CLO tools',kind:'native',tools:[...CLO7_3D_A.map(t=>({...t,id:`3d:${t.id}`,column:'A'})),...CLO7_3D_B.map(t=>({...t,id:`3d:${t.id}`,column:'B'}))]},
  {side:'right',title:'2D CLO tools',kind:'native',tools:[...CLO7_2D_A.map(t=>({...t,id:`2d:${t.id}`,column:'A'})),...CLO7_2D_B.map(t=>({...t,id:`2d:${t.id}`,column:'B'}))]},
];
const indexSections = [...nativeIndexSections,{side:'left',title:'3D EXO extra tools',kind:'extra',tools:EXO_LEFT_EXTRA_TOOLS},{side:'right',title:'2D EXO extra tools',kind:'extra',tools:EXO_RIGHT_EXTRA_TOOLS}];
const getToolId = (tool) => typeof tool === 'string' ? tool : tool.id;
const getToolLabel = (tool) => typeof tool === 'string' ? tool : tool.label || tool.name || tool.id;
const lookup = (value, section, key, fallback) => value?.[section]?.[key] ?? fallback;
const asArray = (value) => Array.isArray(value) ? value : [];
// Reopen safely when a saved window comes from a different monitor or a
// smaller macOS window. Do not leave its titlebar outside the usable screen.
const safeWindowGeometry = (input) => {
  const screenWidth = Math.max(320, window.innerWidth);
  const screenHeight = Math.max(340, window.innerHeight);
  const maxWidth = screenWidth < 520 ? screenWidth : screenWidth - 12;
  const maxHeight = screenHeight < 370 ? screenHeight : screenHeight - 12;
  const requestedWidth = Number(input.width) || 760;
  const requestedHeight = Number(input.height) || 590;
  // If a window was sized on a larger display, reopen as a useful floating
  // panel rather than stretching almost full-screen on the smaller display.
  const width = Math.min(Math.max(requestedWidth > maxWidth ? Math.min(1040,maxWidth) : requestedWidth, Math.min(480, screenWidth)), maxWidth);
  const height = Math.min(Math.max(requestedHeight > maxHeight ? Math.min(780,maxHeight) : requestedHeight, Math.min(340, screenHeight)), maxHeight);
  const availableX = Math.max(0,screenWidth-width);
  const availableY = Math.max(0,screenHeight-height);
  const originalX = Number(input.x) || 0;
  const originalY = Number(input.y) || 0;
  return {
    width, height,
    x: originalX > availableX+32 ? Math.round(availableX/2) : Math.max(0,Math.min(originalX,availableX)),
    y: originalY > availableY+32 ? Math.round(availableY/2) : Math.max(0,Math.min(originalY,availableY)),
  };
};

function Setting({ label, description, children }) {
  return <div className="studio-setting"><div className="studio-setting-copy"><strong>{label}</strong>{description && <small>{description}</small>}</div><div className="studio-setting-control">{children}</div></div>;
}
function Select({ value, options, onChange, label }) {
  return <select aria-label={label} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>{options.map((option) => { const [id, title] = Array.isArray(option) ? option : [option, option]; return <option key={id} value={id}>{title}</option>; })}</select>;
}
function Color({ label, value, onChange }) {
  const safe = /^#[0-9a-f]{6}$/i.test(value || '') ? value : '#404650';
  return <div className="studio-color" data-color-control="palette">
    <span className="studio-color-well" style={{'--color-well':safe}}>
      <input type="color" aria-label={`${label} color picker`} title={`Pick ${label.toLowerCase()}`} value={safe} onChange={(e) => onChange(e.target.value)} />
    </span>
    <input className="studio-color-hex" aria-label={`${label} hexadecimal color`} value={value ?? ''} onChange={(e) => onChange(e.target.value)} spellCheck={false} maxLength={7} placeholder="#RRGGBB" />
  </div>;
}

function ThemePaletteCover({theme,appearance,compact=false}) {
  const swatches=resolveThemePaletteCover20261028(theme,appearance)
  return <span className={`studio-theme-palette-cover${compact?' studio-theme-palette-cover--compact':''}`} aria-hidden="true" data-theme-palette-cover="true">
    <span className="studio-theme-palette-bars">{swatches.map(({role,color})=><i key={role} data-palette-role={role.toLowerCase()} style={{backgroundColor:color}} />)}</span>
    {!compact&&<span className="studio-theme-palette-codes">{swatches.map(({role,color})=><small key={role} title={`${role} ${color}`}>{color}</small>)}</span>}
  </span>
}

/** Consistent hover/focus preview followed by explicit click-to-commit. */
function HoverPresetChooser({label,presets,selected,onPreview,onChoose}) {
 const [patternFilter,setPatternFilter]=useState('all')
 const [chartFilter,setChartFilter]=useState('all')
 const isPattern=label==='Pattern UI'
 const visiblePresets=isPattern&&patternFilter!=='all'
   ?presets.filter(preset=>(preset.surface||'solid')===patternFilter)
   :!isPattern&&chartFilter!=='all'
    ?presets.filter(preset=>(preset.family||'original')===chartFilter)
    :presets
 return <div className="studio-area-preset-chooser" role="group" aria-label={label+' theme presets'}>
   <div className="studio-area-preset-instruction"><strong>{label} themes{isPattern?` · ${presets.length} presets`:''}</strong><small>Hover or focus to preview. Click to apply; leaving restores your saved colors.</small></div>
   {isPattern&&<div className="studio-pattern-theme-filters" role="group" aria-label="Filter Pattern UI themes">
    {[['all','All'],['solid','Color Themes'],['glass','Liquid Glass'],['outline','Outlines Only']].map(([id,title])=>
     <button key={id} type="button" data-pattern-theme-filter={id}
       aria-pressed={patternFilter===id} className={patternFilter===id?'selected':''}
       onClick={()=>{setPatternFilter(id);onPreview?.(null)}}>{title}</button>)}
   </div>}
   {!isPattern&&<div className="studio-pattern-theme-filters studio-chart-theme-filters" role="group" aria-label={`Filter ${label} themes`}>
    {[['all','All 80'],['original','Original'],['light','Paper'],['soft','Soft'],['bold','Vivid'],['night','Night']].map(([id,title])=>
      <button key={id} type="button" data-chart-theme-filter={label+'-'+id}
        aria-pressed={chartFilter===id} className={chartFilter===id?'selected':''}
        onClick={()=>{setChartFilter(id);onPreview?.(null)}}>{title}</button>)}
   </div>}
   <div className="studio-area-preset-grid">
    {visiblePresets.map(preset=><button type="button" key={preset.id}
      data-area-theme={label} data-area-theme-id={preset.id}
      data-area-theme-surface={isPattern?(preset.surface||'solid'):undefined}
      aria-label={label+' '+preset.name+' theme'} aria-pressed={selected===preset.id}
      className={selected===preset.id?'selected':''}
      onMouseEnter={()=>onPreview?.(preset)} onMouseLeave={()=>onPreview?.(null)}
      onFocus={()=>onPreview?.(preset)} onBlur={()=>onPreview?.(null)}
      onClick={()=>{onChoose(preset);onPreview?.(null)}}>
      {label==='Pattern UI'
        ? <span className="studio-pattern-theme-cover" data-pattern-cover-surface={preset.surface||'solid'} aria-hidden="true">
          <svg viewBox="0 0 120 50" focusable="false">
            <defs>
              <linearGradient id={`studio-pattern-preview-glass-${preset.id}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#ffffff" stopOpacity=".65"/>
                <stop offset=".55" stopColor={preset.paper} stopOpacity=".24"/>
                <stop offset="1" stopColor={preset.paper} stopOpacity=".42"/>
              </linearGradient>
            </defs>
            <rect width="120" height="50" fill={(preset.surface||'solid')==='outline'?'#394953':'#a3b8c7'}/>
            <path d="M18 40 L18 12 Q29 9 41 14 L52 21 L66 8 L97 16 L105 38 Q60 44 18 40Z"
              fill={preset.surface==='outline'?'none':preset.surface==='glass'?`url(#studio-pattern-preview-glass-${preset.id})`:preset.paper}/>
            <path d="M18 40 L18 12 Q29 9 41 14 L52 21 L66 8 L97 16 L105 38 Q60 44 18 40Z" fill="none" stroke={preset.edge} strokeWidth="2.2"/>
            <path d="M26 30 L96 32" stroke={preset.selection} strokeWidth="2.2" strokeDasharray="6 3"/>
            <path d="M66 8 L70 15 L63 14Z" fill={preset.notch}/>
            <circle cx="18" cy="12" r="3.1" fill={preset.point} stroke={preset.edge} strokeWidth=".7"/>
            <circle cx="97" cy="16" r="3.1" fill={preset.point} stroke={preset.edge} strokeWidth=".7"/>
            <circle cx="105" cy="38" r="3.1" fill={preset.point} stroke={preset.edge} strokeWidth=".7"/>
          </svg>
          <span className="studio-pattern-theme-cover__palette">
            {[preset.paper,preset.edge,preset.point,preset.selection,preset.notch].map((color,i)=><i key={i} style={{backgroundColor:color}}/>)}
          </span>
        </span>
        : <span className="studio-area-preset-sample" aria-hidden="true" style={{'--area-paper':preset.paper,'--area-header':preset.header||preset.edge,'--area-line':preset.line||preset.edge,'--area-ink':preset.ink||preset.point,'--area-select':preset.selected||preset.selection}}>
          <i/><i/><i/><i/>
        </span>}
      <span>{preset.name}</span>
      {isPattern&&preset.surface&&<small className="studio-pattern-surface-tag">{preset.surface==='glass'?'Translucent glass':'Transparent outlines'}</small>}
    </button>)}
   </div>
 </div>
}

function PatternOutlinePalette({value,onPreview,onChoose}){
 return <div className="studio-pattern-outline-palettes" role="group" aria-label="Pattern UI outline colors">
  <div className="studio-pattern-outline-heading">
   <strong>Pattern UI outline colors</strong>
   <small>Hover a line-color palette to preview outlines on the 2D pattern. Click to apply.</small>
  </div>
  <div className="studio-pattern-outline-grid">
   {EXO_PATTERN_OUTLINE_COLORS_20261028.map(({id,name,color})=>{
    const previewColor=color==='auto'?'#3e91b5':color
    return <button key={id} type="button"
      data-pattern-outline-color={id}
      aria-label={`Pattern UI outline ${name}`}
      aria-pressed={(value??'auto')===color}
      className={(value??'auto')===color?'selected':''}
      onMouseEnter={()=>onPreview?.({edge:color})}
      onMouseLeave={()=>onPreview?.(null)}
      onFocus={()=>onPreview?.({edge:color})}
      onBlur={()=>onPreview?.(null)}
      onClick={()=>{onChoose(color);onPreview?.(null)}}>
      <span className="studio-pattern-outline-sample" aria-hidden="true">
       <svg viewBox="0 0 80 24" focusable="false">
        <path d="M6 17 Q19 3 33 12 T74 9" fill="none" stroke={previewColor} strokeWidth="2.8" strokeLinecap="round"/>
        <circle cx="33" cy="12" r="2.5" fill={previewColor}/>
       </svg>
       <i style={{backgroundColor:previewColor}}/>
      </span>
      <span>{name}</span>
    </button>
   })}
  </div>
 </div>
}

const TWO_D_CANVAS_PALETTES = [
  ['classic','Classic','auto','auto','grid'],['accumark-green','AccuMark green','auto','auto','dots'],
  ['forest','Forest green','#153e32','#85bfa9','dots'],['teal','Teal','#125455','#a1ded8','dots'],
  ['navy','Navy','#182a4a','#8da8e5','grid'],['blue','Blue','#255b96','#c3ddff','grid'],
  ['purple','Purple','#402a65','#c5a6ef','dots'],['rose','Rose','#704355','#ffccda','dots'],
  ['charcoal','Graphite','#292d34','#9daab7','grid'],['white','White','#ffffff','#8897a6','grid'],
  ['cream','Cream','#f7efd9','#9a8b72','grid'],
  ['ivory','Ivory','#fffff0','#a1a49a','grid'],['paper','Light Paper','#fafaf8','#a1aab4','grid'],
  ['chalk','Chalk','#f2f1eb','#9a9a93','dots'],['pearl','Pearl','#edeef0','#8797a9','grid'],
  ['oat','Oat','#e7dcc9','#978776','dots'],['sand','Sand','#dbc5a3','#79694e','grid'],
  ['stone','Stone','#b8b2a7','#575c55','dots'],['clay','Clay','#ad8570','#eee0ca','grid'],
  ['taupe','Taupe','#938679','#e9dcc8','dots'],['mushroom','Mushroom','#786d65','#e4d7c4','grid'],
  ['khaki','Khaki','#85816b','#e5dec2','dots'],['sage','Stone Sage','#acb8a2','#536a58','grid'],
  ['olive','Olive','#555e3b','#d7dcb8','dots'],['moss','Moss','#435746','#c4dfc3','grid'],
  ['espresso','Espresso','#382e2a','#e1caba','dots'],['cocoa','Cocoa','#665047','#e4c6b1','grid'],
  ['slate','Slate','#485969','#d2dde4','grid'],['fog','Fog','#d9e0df','#819697','dots'],
  ['ice','Ice blue','#e6f2f5','#7d9cae','grid'],['lavender','Lavender mist','#e9e1ee','#947ca2','dots'],
  ['blush','Blush','#f3e3df','#ab8884','grid'],['terracotta','Terracotta','#a65f48','#f0c9ac','dots'],
  ['ochre','Ochre','#b48c43','#f4dfaa','grid'],['midnight','Midnight','#171c2b','#a8b9d4','dots'],
];

function TwoDAutoColor({ label, value, onChange, fallback }) {
  const active = value && value !== 'auto' ? value : 'auto';
  return <div className="studio-2d-color-control">
    <label className="studio-switch"><input type="checkbox" checked={active==='auto'} onChange={e=>onChange(e.target.checked?'auto':fallback)}/>Automatic</label>
    <Color label={label} value={active==='auto'?fallback:active} onChange={onChange}/>
  </div>;
}

const APPEARANCE_FIELDS = [
  {title:'3D viewer · icon colors',hint:'Customize horizontal and vertical tools independently inside the 3D viewport.',fields:[
    ['threeDViewerHorizontalColor','Horizontal toolbar icons','#d1e1f3'],
    ['threeDViewerVerticalColor','Vertical toolbar icons','#d1e1f3'],
    ['threeDViewerGlassColor','3D toolbar glass tint','#b4d7ef'],
  ]},
  {title:'2D viewer · icon colors',hint:'Each 2D tool strip can have its own icon and glass color.',fields:[
    ['twoDViewerHorizontalColor','Horizontal toolbar icons','#283847'],
    ['twoDViewerVerticalColor','Vertical toolbar icons','#283847'],
    ['twoDViewerGlassColor','2D toolbar glass tint','#e8f4ff'],
  ]},
  {title:'Side rails',hint:'The left and right tool rails can use different backgrounds.',fields:[
    ['leftRailColor','Left rail background','#293744'],
    ['rightRailColor','Right rail background','#293744'],
  ]},
  {title:'Library & object browser',hint:'Change the panel surfaces and their icon colors separately.',fields:[
    ['panelLibraryColor','Library background','#2a333d'],
    ['libraryIconColor','Library icons','#d5e2f0'],
    ['panelObjectBrowserColor','Object Browser background','#2a333d'],
    ['objectBrowserIconColor','Object Browser icons','#d5e2f0'],
  ]},
];

function TargetedAppearanceSettings({value,onChange,onPickTarget,onHoverTarget}) {
  const appearance=value.appearance||{};
  const update=(key,next)=>onChange({...value,appearance:{...appearance,[key]:next}});
  const picker=(key,label)=><button type="button" className="studio-pick-target" aria-label={`Locate and customize ${label}`} title={`Locate ${label} in workspace`} onClick={()=>onPickTarget?.(key)}>Locate ↗</button>;
  return <div id="studio-theme-workspace-parts" className="studio-targeted-appearance" aria-label="Viewer toolbar and panel appearance">
    <div className="studio-targeted-heading"><h4>Customize workspace elements</h4><p>Fine tune each viewport, rail and panel. Use Locate to pick the matching area directly in your workspace.</p></div>
    {APPEARANCE_FIELDS.map(group=><section key={group.title} className="studio-appearance-target-group" aria-label={group.title}>
      <h5>{group.title}</h5><p>{group.hint}</p>
      {group.fields.map(([key,label,fallback])=><div key={key} className="studio-appearance-target" data-theme-field={key} onMouseEnter={()=>onHoverTarget?.(key)} onMouseLeave={()=>onHoverTarget?.(null)}>
        <div className="studio-appearance-target-label"><strong>{label}</strong>{picker(key,label)}</div>
        <TwoDAutoColor label={label} value={appearance[key]??'auto'} fallback={fallback} onChange={next=>update(key,next)}/>
      </div>)}
    </section>)}
    <section className="studio-appearance-target-group" aria-label="Toolbar and panel glow">
      <h5>Glow and selection</h5><p>Choose the intensity and whether highlights appear only on selected items.</p>
      {[[ 'toolbarGlowStrength','Toolbar glow strength','toolbarGlowSelectedOnly','Glow selected toolbar icons only'],['panelGlowStrength','Panel glow strength','panelGlowSelectedOnly','Glow selected panel items only']].map(([key,label,toggleKey,toggleLabel])=><div key={key} className="studio-appearance-target-pair">
        <div className="studio-appearance-target" data-theme-field={key} onMouseEnter={()=>onHoverTarget?.(key)} onMouseLeave={()=>onHoverTarget?.(null)}><div className="studio-appearance-target-label"><strong>{label}</strong>{picker(key,label)}</div><div className="studio-range"><input type="range" aria-label={label} min="0" max="1" step=".01" value={appearance[key]??0} onChange={e=>update(key,Number(e.target.value))}/><output>{Math.round((appearance[key]??0)*100)}%</output></div></div>
        <label className="studio-appearance-target studio-appearance-switch" data-theme-field={toggleKey} onMouseEnter={()=>onHoverTarget?.(toggleKey)} onMouseLeave={()=>onHoverTarget?.(null)}><input type="checkbox" aria-label={toggleLabel} checked={!!appearance[toggleKey]} onChange={e=>update(toggleKey,e.target.checked)}/><span>{toggleLabel}</span></label>
      </div>)}
    </section>
  </div>;
}

function TwoDWorkspaceAppearance({ value, onChange, onPreviewTwoDPalette, onPreviewTwoDPattern, onPreviewGradeChart }) {
  const preferences = value.preferences || {};
  const setPreference = (key, next) => onChange({...value,preferences:{...preferences,[key]:next}});
  const chooseTheme = (id) => {
    const preset=TWO_D_CANVAS_PALETTES.find(item=>item[0]===id);
    if(!preset)return;
    onChange({...value,preferences:{...preferences,twoDCanvasTheme:id==='accumark-green'?'accumark-green':'classic',twoDCanvasColor:preset[2],twoDGridColor:preset[3],twoDGridStyle:preset[4]}});
  };
  const choosePatternPreset=preset=>onChange({...value,preferences:{...preferences,
    twoDPatternUiTheme:preset.id,twoDPatternSurfaceStyle:preset.surface||'solid',
    twoDPointColor:preset.point,twoDEdgeColor:preset.edge,
    twoDSelectionColor:preset.selection,twoDNotchColor:preset.notch,twoDPatternColor:preset.paper}});
  const chooseGradePreset=(kind,preset)=>onChange({...value,preferences:{
    ...preferences,
    gradeChartThemeMode:preset.id==='auto'?'auto':'custom',
    ...(preset.id==='auto'?{gradeTableColorTheme:'auto',compareLengthColorTheme:'auto'}:
      {[kind==='values'?'gradeTableColorTheme':'compareLengthColorTheme']:preset.id}),
  }});
  return <section className="studio-settings-group studio-2d-appearance" aria-label="2D Workspace Appearance" data-testid="settings-2d-appearance">
    <h4>2D Workspace Appearance</h4>
    <p>Customize the 2D pattern canvas independently of the main studio theme.</p>
    <Setting label="Automatic 2D color visibility" description="Keep outlines, grading sizes, ruler marks, points and measurement labels readable when you choose dark or light colors. Your original custom swatches are preserved.">
      <label className="studio-switch"><input type="checkbox" aria-label="Automatically adjust 2D markings for contrast" checked={preferences.twoDAutoContrast!==false} onChange={event=>setPreference('twoDAutoContrast',event.target.checked)}/>Auto brighten or darken 2D markings</label>
    </Setting>
    <div className="studio-2d-theme-options" role="group" aria-label="2D canvas theme">
      {TWO_D_CANVAS_PALETTES.map(([id,label,background,marker,style])=><button key={id} type="button" aria-pressed={(id==='classic'||id==='accumark-green')?(preferences.twoDCanvasTheme??'classic')===id&&(!preferences.twoDCanvasColor||preferences.twoDCanvasColor==='auto'):preferences.twoDCanvasColor===background&&preferences.twoDGridColor===marker} className={((id==='classic'||id==='accumark-green')?(preferences.twoDCanvasTheme??'classic')===id&&(!preferences.twoDCanvasColor||preferences.twoDCanvasColor==='auto'):preferences.twoDCanvasColor===background&&preferences.twoDGridColor===marker)?'selected':''}
        data-2d-palette-id={id}
        onMouseEnter={()=>onPreviewTwoDPalette?.({theme:id==='accumark-green'?'accumark-green':'classic',canvas:background,grid:marker,style:style||'grid'})}
        onMouseLeave={()=>onPreviewTwoDPalette?.(null)}
        onFocus={()=>onPreviewTwoDPalette?.({theme:id==='accumark-green'?'accumark-green':'classic',canvas:background,grid:marker,style:style||'grid'})}
        onBlur={()=>onPreviewTwoDPalette?.(null)}
        onClick={()=>{chooseTheme(id);onPreviewTwoDPalette?.(null)}}>
        <span className="studio-2d-palette-cover" data-2d-palette-cover="true" aria-hidden="true">
          <i style={{background:background==='auto'?(id==='accumark-green'?'#174e39':'#c6c7c9'):background}}/>
          <i style={{background:marker==='auto'?(id==='accumark-green'?'#b9e2cc':'#34434d'):marker}}/>
          <i style={{background:background==='auto'?'#e4e6e5':background}}/>
        </span>
        <strong>{label}</strong>
      </button>)}
    </div>
    <Setting label="Canvas tint" description="Select any background color, independently of the preset."><TwoDAutoColor label="2D canvas tint" value={preferences.twoDCanvasColor??'auto'} fallback="#29343d" onChange={v=>setPreference('twoDCanvasColor',v)}/></Setting>
    <Setting label="Grid and dot color" description="Set the canvas marker color for either grid or dots."><TwoDAutoColor label="2D grid markers" value={preferences.twoDGridColor??'auto'} fallback="#9db5c0" onChange={v=>setPreference('twoDGridColor',v)}/></Setting>

    <Setting label="Dot size" description="Scale visible dots for high density or detailed pattern work."><div className="studio-range"><input type="range" aria-label="2D dot size" min=".65" max="2" step=".05" value={preferences.twoDDotSize??1} onChange={e=>setPreference('twoDDotSize',Number(e.target.value))}/><output>{Number(preferences.twoDDotSize??1).toFixed(2)}×</output></div></Setting>
    <Setting label="Grid and dot visibility"><div className="studio-range"><input type="range" aria-label="2D grid opacity" min=".15" max="1" step=".05" value={preferences.twoDGridOpacity??.8} onChange={e=>setPreference('twoDGridOpacity',Number(e.target.value))}/><output>{Math.round((preferences.twoDGridOpacity??.8)*100)}%</output></div></Setting>
    <Setting label="2D edge rulers" description="Display measurement rulers along the top and left sides of the pattern canvas."><label className="studio-switch"><input type="checkbox" aria-label="Show 2D measurement rulers" checked={preferences.twoDShowRulers??true} onChange={e=>setPreference('twoDShowRulers',e.target.checked)}/>Show rulers</label></Setting>
    <Setting label="Ruler markings" description="Choose a clear, contrasting color for ruler ticks and numbers."><TwoDAutoColor label="2D ruler markings" value={preferences.twoDRulerMarkColor??'auto'} fallback="#dde4e8" onChange={v=>setPreference('twoDRulerMarkColor',v)}/></Setting>
    <Setting label="Ruler markings glow" description="Add a subtle illuminated edge to ruler ticks and numbers."><label className="studio-switch"><input type="checkbox" aria-label="Glow on 2D rulers" checked={preferences.twoDRulerGlow??false} onChange={e=>setPreference('twoDRulerGlow',e.target.checked)}/>Glow</label></Setting>
    <Setting label="Ruler glow intensity"><div className="studio-range"><input type="range" aria-label="Ruler glow intensity" min="0" max="1" step=".01" value={preferences.twoDRulerGlowStrength??.35} onChange={e=>setPreference('twoDRulerGlowStrength',Number(e.target.value))}/><output>{Math.round((preferences.twoDRulerGlowStrength??.35)*100)}%</output></div></Setting>
    <Setting label="Ruler glass tint" description="Keep the transparent ruler overlay clear with no blur."><TwoDAutoColor label="2D ruler glass" value={preferences.twoDRulerGlassColor??'auto'} fallback="#ffffff" onChange={v=>setPreference('twoDRulerGlassColor',v)}/></Setting>
    <Setting label="Ruler glass opacity"><div className="studio-range"><input type="range" aria-label="2D ruler glass opacity" min="0" max=".3" step=".01" value={preferences.twoDRulerGlassOpacity??.1} onChange={e=>setPreference('twoDRulerGlassOpacity',Number(e.target.value))}/><output>{Math.round((preferences.twoDRulerGlassOpacity??.1)*100)}%</output></div></Setting>
    <div className="studio-2d-marker-options" role="group" aria-label="2D canvas markers">
      <strong>Canvas markers</strong><small>Hover to preview on the 2D workspace. Click to apply.</small>
      <div className="studio-2d-marker-choices">
        {[["dots","Dots"],["grid","Grid lines"],["none","None"]].map(([id,label])=><button key={id} type="button" className={preferences.twoDGridStyle===id?'selected':''} aria-pressed={(preferences.twoDGridStyle??'grid')===id}
          onMouseEnter={()=>onPreviewTwoDPalette?.({theme:preferences.twoDCanvasTheme??'classic',canvas:preferences.twoDCanvasColor??'auto',grid:preferences.twoDGridColor??'auto',style:id})}
          onMouseLeave={()=>onPreviewTwoDPalette?.(null)}
          onFocus={()=>onPreviewTwoDPalette?.({theme:preferences.twoDCanvasTheme??'classic',canvas:preferences.twoDCanvasColor??'auto',grid:preferences.twoDGridColor??'auto',style:id})}
          onBlur={()=>onPreviewTwoDPalette?.(null)}
          onClick={()=>{setPreference('twoDGridStyle',id);onPreviewTwoDPalette?.(null)}}>
          <span className={`studio-2d-marker-sample studio-2d-marker-sample--${id}`} aria-hidden="true"/><span>{label}</span>
        </button>)}
      </div>
    </div>
    <div className="studio-pattern-display-colors" aria-label="2D pattern interface colors">
      <h4>Pattern UI appearance</h4><p>Customize pattern drawings without changing garment materials or pattern geometry.</p>
      <label className="studio-appearance-target studio-appearance-switch">
        <input type="checkbox" aria-label="Clear liquid glass for 2D pattern workspace"
          checked={value.appearance?.patternClearGlass!==false}
          onChange={event=>onChange({...value,appearance:{...value.appearance,patternClearGlass:event.target.checked}})}/>
        <span>Crystal clear Liquid Glass · 2D pattern workspace and drawing paper</span>
      </label>
      <HoverPresetChooser label="Pattern UI" presets={EXO_PATTERN_UI_PRESETS_20261028}
        selected={preferences.twoDPatternUiTheme??'classic'}
        onPreview={onPreviewTwoDPattern} onChoose={choosePatternPreset}/>
      <PatternOutlinePalette value={preferences.twoDEdgeColor??'auto'}
        onPreview={onPreviewTwoDPattern}
        onChoose={color=>onChange({...value,preferences:{...preferences,twoDEdgeColor:color,twoDPatternUiTheme:'custom'}})}/>
      <div className="studio-pattern-advanced-colors">
      <h5>Individual drawing colors</h5>
      <p>Fine-tune the preset using custom colors, or select Automatic to follow the canvas contrast.</p>
      {[
        ['twoDPointColor','Pattern points','#fdfdfd'],
        ['twoDEdgeColor','Pattern outlines','#3e91b5'],
        ['twoDSelectionColor','Highlighted selection','#fff127'],
        ['twoDNotchColor','Notch marks','#e1292f'],
        ['twoDPatternColor','Pattern paper','#f4f4f3'],
      ].map(([key,label,fallback])=><Setting key={key} label={label}><TwoDAutoColor label={label} value={preferences[key]??'auto'} fallback={fallback} onChange={v=>onChange({...value,preferences:{...preferences,[key]:v,twoDPatternUiTheme:'custom'}})}/></Setting>)}
      </div>
    </div>
    <div className="studio-grade-chart-theme-settings" aria-label="Grading chart appearance presets">
      <label className="studio-appearance-target studio-appearance-switch">
        <input type="checkbox" aria-label="Match both grading tables to the main EXO theme"
          checked={preferences.gradeChartThemeMode!=='custom'}
          onChange={event=>onChange({...value,preferences:{...preferences,
            gradeChartThemeMode:event.target.checked?'auto':'custom'}})}/>
        <span>Match Grading Table and Compare Length to the main EXO theme</span>
      </label>
      {[['values','Grading Table','gradeTableColorTheme'],['compare','Compare Length','compareLengthColorTheme']].map(([kind,label,key])=>
        <section key={kind} className="studio-grade-chart-theme-section">
          <HoverPresetChooser label={label} presets={[exoAutomaticGradeChartPalette20261028(studioResolvedPalette(value.appearance?.theme||'graphite',value.appearance?.panelFinish)),...EXO_GRADE_CHART_PRESETS_20261028]}
            selected={preferences.gradeChartThemeMode!=='custom'?'auto':preferences[key]??'auto'}
            onPreview={preset=>onPreviewGradeChart?.(kind,preset)}
            onChoose={preset=>chooseGradePreset(kind,preset)}/>
        </section>)}
    </div>
  </section>;
}

export default function StudioSettingsDialog({ value = {}, onChange = () => {}, onClose = () => {}, onApplyWorkspace, onSaveWorkspace, onRestoreWorkspace, onReset, onResetEnvironment, onPreviewTheme, onPreviewIconColor, onPreviewTwoDPalette, onPreviewTwoDPattern, onPreviewGradeChart, onPickTarget, onHoverTarget, contrastAudit = [], onFixContrast, focusKey, initialTab = 'workspace' }) {
  const [tab, setTab] = useState(initialTab==='appearance'?'theme':initialTab);
  const [search, setSearch] = useState('');
  const [themeSearch, setThemeSearch] = useState('');
  const [customPaletteName,setCustomPaletteName]=useState('');
  const [customPaletteColors,setCustomPaletteColors]=useState(['#f8e8ed','#fff9fb','#ad6b89','#776773','#2d2630']);
  const [customColorPalettes,setCustomColorPalettes]=useState(()=>{try{
    const saved=JSON.parse(localStorage.getItem('exo.customColorPalettes.v1')||'[]');
    return Array.isArray(saved)?saved.filter(p=>typeof p?.name==='string'&&Array.isArray(p.colors)&&p.colors.length===5&&p.colors.every(c=>/^#[0-9a-f]{6}$/i.test(c))).slice(0,32):[];
  }catch{return []}});
  const [themeGroup, setThemeGroup] = useState('All');
  const [savedThemes,setSavedThemes]=useState(loadSavedThemePresets);
  const [themeName,setThemeName]=useState('');
  const [themeFeedback,setThemeFeedback]=useState('');
  const [themeSchedule,setThemeSchedule]=useState(loadThemeSchedule);
  const themeImportRef=useRef(null);
  const [toolIndexSearch,setToolIndexSearch] = useState('');
  const [modarisToolbarFeedback,setModarisToolbarFeedback] = useState('');
  const [modarisStatusFilter,setModarisStatusFilter] = useState('all');
  const [expandedModarisGroups,setExpandedModarisGroups] = useState(()=>new Set(['F1 · Points and lines','F6 · Grading']));
  const [toolIndexSide,setToolIndexSide] = useState('all');
  const [toolIndexWorkspace,setToolIndexWorkspace] = useState(() => { try { return localStorage.getItem('exo.toolIndexWorkspace.v1') === 'pattern' ? 'pattern' : 'all'; } catch { return 'all'; } });
  const [toolIndexCategory,setToolIndexCategory] = useState('all');
  const [dragging, setDragging] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [confirmGlobalReset, setConfirmGlobalReset] = useState(false);
  const [geometry, setGeometry] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem('exo.studioSettingsWindow.v1') || 'null'); if (saved && [saved.x,saved.y,saved.width,saved.height].every(Number.isFinite)) return safeWindowGeometry(saved); } catch {}
    return safeWindowGeometry({ x: Math.max(12, (window.innerWidth - 760) / 2), y: Math.max(12, (window.innerHeight - 590) / 2), width: 760, height: 590 });
  });
  const pointerSession = useRef(null);
  const dialogRef = useRef(null);
  const bodyRef = useRef(null);
  const previousFocus = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const titleId = useId();
  const bounded = safeWindowGeometry;
  const startDrag = (event) => { if (event.button !== 0 || event.target.closest('button,input,select,textarea')) return; pointerSession.current = { x:event.clientX, y:event.clientY, geometry }; event.currentTarget.setPointerCapture(event.pointerId); };
  const dragWindow = (event) => { if (!pointerSession.current) return; const { x, y, geometry: start } = pointerSession.current; setGeometry(bounded({ ...start, x:start.x + event.clientX - x, y:start.y + event.clientY - y })); };
  const endDrag = () => { pointerSession.current = null; };
  useEffect(() => { try { localStorage.setItem('exo.studioSettingsWindow.v1', JSON.stringify(geometry)); } catch {} }, [geometry]);
  useEffect(() => { try { localStorage.setItem('exo.toolIndexWorkspace.v1', toolIndexWorkspace); } catch {} }, [toolIndexWorkspace]);
  useEffect(() => { const recalc = () => setGeometry((g) => bounded(g)); window.addEventListener('resize',recalc); return () => window.removeEventListener('resize',recalc); }, []);
  useEffect(() => { const node = dialogRef.current; if (!node || typeof ResizeObserver === 'undefined') return; const observer = new ResizeObserver(([entry]) => { const width = Math.round(entry.borderBoxSize?.[0]?.inlineSize || entry.contentRect.width); const height = Math.round(entry.borderBoxSize?.[0]?.blockSize || entry.contentRect.height); setGeometry((g) => Math.abs(g.width-width)>1 || Math.abs(g.height-height)>1 ? bounded({...g,width,height}) : g); }); observer.observe(node); return () => observer.disconnect(); }, []);
  useEffect(()=>()=>{onPreviewTheme?.(null);onPreviewIconColor?.(null);onPreviewTwoDPalette?.(null);onPreviewTwoDPattern?.(null);onPreviewGradeChart?.('values',null);onPreviewGradeChart?.('compare',null);onHoverTarget?.(null)},[onPreviewTheme,onPreviewIconColor,onPreviewTwoDPalette,onPreviewTwoDPattern,onPreviewGradeChart,onHoverTarget]);
  const applyPalette=colors=>onChange({...value,appearance:{...value.appearance,
    panelLibraryColor:colors[0],panelObjectBrowserColor:colors[1],objectBrowserIconColor:colors[3],
    leftRailColor:colors[0],rightRailColor:colors[0],interfaceInkColor:colors[4],
    globalToolbarIconColor:colors[2]}});
  const changeActivePaletteColor=(role,color)=>{
    if(!/^#[\da-f]{6}$/i.test(color))return;
    const fields={
      Sidebar:{panelLibraryColor:color,leftRailColor:color,rightRailColor:color},
      Panel:{panelObjectBrowserColor:color},
      Accent:{globalToolbarIconColor:color},
      Muted:{objectBrowserIconColor:color},
      Text:{interfaceInkColor:color},
    };
    onChange({...value,appearance:{...value.appearance,...fields[role]}});
  };
  const saveCustomPalette=()=>{
    if(!customPaletteName.trim()||!customPaletteColors.every(c=>/^#[0-9a-f]{6}$/i.test(c)))return;
    const next=[...customColorPalettes,{name:customPaletteName.trim().slice(0,48),colors:[...customPaletteColors]}].slice(-32);
    try{localStorage.setItem('exo.customColorPalettes.v1',JSON.stringify(next))}catch{}
    setCustomColorPalettes(next);setCustomPaletteName('');
  };
  useEffect(()=>{
    if(!focusKey)return;
    setTab('theme');
    const frame=requestAnimationFrame(()=>{
      const element=Array.from(dialogRef.current?.querySelectorAll('[data-theme-field]')||[]).find(node=>node.getAttribute('data-theme-field')===focusKey);
      element?.scrollIntoView({block:'center',behavior:'smooth'});
      element?.classList.add('studio-theme-focus-flash');
    });
    return ()=>cancelAnimationFrame(frame);
  },[focusKey,tab]);
  const set = (section, key, next) => onChange({ ...value, [section]: { ...(value[section] || {}), [key]: next } });
  const chooseMeasurementUnits=unit=>{
    if(!['mm','cm','in'].includes(unit))return;
    onChange({...value,preferences:{...value.preferences,units:unit},cloSettings:{...value.cloSettings,unitSystem:({mm:'Millimeter',cm:'Centimeter',in:'Inch'})[unit]}});
  };
  const saveCustomTheme=()=>{try{const preset=saveNamedThemePreset(themeName,value);setSavedThemes(loadSavedThemePresets());setThemeName('');setThemeFeedback(`Saved ${preset.name}`)}catch(error){setThemeFeedback(error.message)}};
  const importCustomThemes=async(file)=>{if(!file)return;try{if(file.size>128000)throw Error('Theme file exceeds the 128 KB limit');const updated=importSavedThemePresets(await file.text());setSavedThemes(updated);setThemeFeedback(`Imported ${updated.length} total saved themes`)}catch(error){setThemeFeedback(error.message)}};
  const downloadCustomThemes=()=>{try{const blob=new Blob([exportSavedThemePresets()],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='exo-custom-themes.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setThemeFeedback('Theme JSON exported')}catch(error){setThemeFeedback(error.message)}};
  const changeSchedule=(key,next)=>{try{const setting=saveThemeSchedule({...themeSchedule,[key]:next});setThemeSchedule(setting);window.dispatchEvent(new Event('exo-theme-schedule-changed'));setThemeFeedback('Day/Night settings saved')}catch(error){setThemeFeedback(error.message)}};
  const jumpToThemeSection = (id) => {
    const body=bodyRef.current;
    const target=body?.querySelector(`#${id}`);
    if(!target)return;
    const reduceMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const targetTop=target.getBoundingClientRect().top-body.getBoundingClientRect().top+body.scrollTop;
    body.scrollTo({top:Math.max(0,targetTop-10),behavior:reduceMotion?'auto':'smooth'});
  };
  const restoreTheme = () => {
    const customizationDefaults=studioCatalog.DEFAULT_STUDIO_CUSTOMIZATION;
    const defaults=customizationDefaults.appearance;
    const keys=[...new Set(['theme','panelFinish','liquidGlass','glassBackdrop','glassDensity','glassBlur','glassIconColor','globalToolbarIconColor','globalToolbarGlow','twoDToolbarIconColor','twoDToolbarGlassColor','twoDToolbarGlow','glassLibrary','glassInspector','glassToolbars','glassMenu','glassWidgets','accent','sidebarColor','panelColor',...APPEARANCE_FIELDS.flatMap(group=>group.fields.map(([key])=>key)),'toolbarGlowStrength','toolbarGlowSelectedOnly','panelGlowStrength','panelGlowSelectedOnly'])];
    onChange({...value,appearance:{...value.appearance,...Object.fromEntries([...keys,'interfaceInkColor','interfaceBrightness','autoContrast','liquidGlassGlow','liquidGlassGlowStrength','panelTextInheritsGlobal'].map(key=>[key,defaults[key]]))},preferences:{...value.preferences,twoDRulerGlowStrength:customizationDefaults.preferences.twoDRulerGlowStrength}});
  };
  const section = (name) => value[name] || {};
  const changeStudioBackground = (color) => onChange({...value,appearance:{...value.appearance,studioColor:color,backgroundMode:'color'}});
  const toolbar = asArray(lookup(value, 'workspace', 'toolbarIds', []));
  const toolbarIds = toolbar.map(getToolId);
  const sideToolbar = (side) => asArray(lookup(value,'workspace',`${side}ToolbarIds`,[])).filter(id=>sideToolIds.has(id) && id.startsWith(side === 'left' ? '3d:' : '2d:'));
  const editSideToolbar = (side,ids) => set('workspace',`${side}ToolbarIds`,[...new Set(ids.filter(id=>matchesSide(side,id)))]);
  const extraIds = side => asArray(lookup(value,'workspace',side==='left'?'extraLeftToolIds':'extraRightToolIds',[]));
  const editExtraIds = (side,ids) => {
    const allowed = new Set((side==='left'?EXO_LEFT_EXTRA_TOOLS:EXO_RIGHT_EXTRA_TOOLS).map(tool=>tool.id));
    set('workspace',side==='left'?'extraLeftToolIds':'extraRightToolIds',[...new Set(ids.filter(id=>allowed.has(id)))]);
  };
  const matchesSide = (side,id) => sideToolIds.has(id) && id.startsWith(side === 'left' ? '3d:' : '2d:');
  const catalog = toolCatalog.filter((tool) => tool?.id);
  const editToolbar = (ids) => set('workspace', 'toolbarIds', ids);
  const modarisGroups=[...new Set(catalog.filter(tool=>tool.id.startsWith('modaris:')).map(tool=>tool.group))];
  const addModarisToolToToolbar=toolId=>{
    const bars=asArray(value.workspace?.customToolbars);
    if(bars.some(bar=>bar.tools.includes(toolId))){setModarisToolbarFeedback('This command is already on a custom toolbar.');setTab('customToolbar');return;}
    const target=bars.findIndex(bar=>!bar.tools.includes(toolId)&&bar.tools.length<64);
    if(target>=0){set('workspace','customToolbars',bars.map((bar,i)=>i===target?{...bar,tools:[...bar.tools,toolId]}:bar));setModarisToolbarFeedback('Added command to an existing toolbar.');setTab('customToolbar');return;}
    if(bars.length>=16){setModarisToolbarFeedback('Sixteen toolbar limit reached. Delete or save a toolbar to free a slot.');return;}
    set('workspace','customToolbars',[...bars,{id:`modaris-${Date.now().toString(36)}`,name:'Modaris tools',dock:'floating',columns:2,orientation:'vertical',visible:false,tools:[toolId]}]);
    setModarisToolbarFeedback('Created a toolbar with this command.');
    setTab('customToolbar');
  };
  const addModarisPaletteToolbar=(group,tools)=>{
    const bars=asArray(value.workspace?.customToolbars);
    const chunks=Array.from({length:Math.ceil(tools.length/64)},(_,index)=>tools.slice(index*64,(index+1)*64).map(tool=>tool.id));
    if(bars.length+chunks.length>16){setModarisToolbarFeedback(`Need ${chunks.length} free toolbar slots for all ${tools.length} ${group} commands. Save or delete existing bars first.`);return;}
    const stamp=Date.now().toString(36);
    set('workspace','customToolbars',[...bars,...chunks.map((ids,index)=>({id:`modaris-${stamp}-${bars.length+index}`,name:chunks.length>1?`${group} (${index+1}/${chunks.length})`:group,dock:'floating',columns:3,orientation:'vertical',visible:false,tools:ids}))]);
    setModarisToolbarFeedback(`Added all ${tools.length} ${group} commands in ${chunks.length} editable toolbar${chunks.length>1?'s':''}.`);
    setTab('customToolbar');
  };
  const addAllModarisPalettes=()=>{
    const bars=asArray(value.workspace?.customToolbars);
    const plan=planCompleteModarisToolbars20261028(catalog,bars,Date.now().toString(36));
    if(!plan.missingCount){
      setModarisToolbarFeedback('All indexed Modaris commands are already included in your custom toolbars.');
      setTab('customToolbar');
      return;
    }
    if(!plan.ok){
      setModarisToolbarFeedback(`Need ${plan.requiredBars} free toolbar slots but only ${plan.availableBars} remain. Save or remove unused active layouts first.`);
      return;
    }
    set('workspace','customToolbars',[...bars,...plan.additions]);
    setModarisToolbarFeedback(`Added ${plan.missingCount} missing Modaris commands in ${plan.requiredBars} editable toolbar${plan.requiredBars===1?'':'s'}. Enable each one when needed.`);
    setTab('customToolbar');
  };
  const upload = (field, file) => {
    if (!file) return;
    if (!['image/png','image/jpeg','image/webp'].includes(file.type)) { setUploadError('Please choose an image file.'); return; }
    if (file.size > 220000) { setUploadError('Choose an image smaller than 220 KB.'); return; }
    setUploadError('');
    const reader = new FileReader();
    reader.onerror = () => setUploadError('Unable to read this image.');
    reader.onload = () => { if (typeof reader.result === 'string') set('profile', field, reader.result); };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    previousFocus.current = document.activeElement;
    dialogRef.current?.focus();
    const keydown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); previousFocus.current?.focus?.(); };
  }, []);

  const moveTool = (id, offset) => { const ids = [...toolbarIds]; const index = ids.indexOf(id); const target = index + offset; if (index < 0 || target < 0 || target >= ids.length) return; [ids[index], ids[target]] = [ids[target], ids[index]]; editToolbar(ids); };
  const available = catalog.filter((tool) => !toolbarIds.includes(tool.id) && `${getToolLabel(tool)} ${tool.group || ''}`.toLowerCase().includes(search.toLowerCase()));
  const livePalette=studioResolvedPalette(lookup(value,'appearance','theme','graphite'),lookup(value,'appearance','panelFinish','balanced'));

  return createPortal(<div className="studio-settings-overlay" data-testid="studio-settings-overlay" data-studio-settings-glass={lookup(value,'appearance','liquidGlass',false)?'true':'false'} style={{'--studio-accent':livePalette.accent,'--studio-glass-backdrop':lookup(value,'appearance','glassBackdrop','#253d57'),'--studio-panel':livePalette.panelColor,'--studio-sidebar':livePalette.sidebarColor,'--studio-text':livePalette.textColor,'--studio-muted':livePalette.mutedColor,'--studio-border':livePalette.borderColor}}>
    <div className="studio-settings-dialog" style={{left:geometry.x,top:geometry.y,width:geometry.width,height:geometry.height}} role="dialog" aria-modal="false" aria-labelledby={titleId} tabIndex={-1} ref={dialogRef} data-testid="studio-settings-dialog">
      <header className="studio-settings-header" onPointerDown={startDrag} onPointerMove={dragWindow} onPointerUp={endDrag} onPointerCancel={endDrag} data-testid="studio-settings-titlebar"><h2 id={titleId}>User Settings</h2><button type="button" className="studio-settings-close" onClick={onClose} aria-label="Close settings">×</button></header>
      <div className="studio-settings-layout"><nav className="studio-settings-nav" aria-label="Settings sections">{SECTIONS.map(([id, title]) => <button key={id} type="button" className={tab === id ? 'active' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)} data-testid={`settings-tab-${id}`}>{title}</button>)}<div className="studio-settings-nav-heading">CLO Settings</div>{CLO_SETTINGS_NAV.map(([id,title])=><button key={id} type="button" className={tab===id?'active':''} aria-current={tab===id?'page':undefined} data-testid={`settings-tab-${id}`} onClick={()=>setTab(id)}>{title}</button>)}</nav>
      <main className="studio-settings-body" key={tab} ref={bodyRef} onPointerOver={event=>{const group=event.target.closest('.studio-settings-group,.studio-appearance-target-group');if(group&&bodyRef.current?.contains(group)){bodyRef.current?.querySelectorAll('.studio-section-hover').forEach(item=>{if(item!==group)item.classList.remove('studio-section-hover')});group.classList.add('studio-section-hover')}}} onPointerLeave={()=>bodyRef.current?.querySelectorAll('.studio-section-hover').forEach(item=>item.classList.remove('studio-section-hover'))}>
        {CLO_SETTINGS_NAV.some(([id])=>id===tab)&&<CloSettingsPages tab={tab} value={value.cloSettings||{}} onChange={v=>{
          const preferences={...value.preferences};
          if(v.unitSystem!==value.cloSettings?.unitSystem)preferences.units=({Millimeter:'mm',Centimeter:'cm',Inch:'in'})[v.unitSystem]||'cm';
          if(v.antiAliasing!==value.cloSettings?.antiAliasing)preferences.antialias=v.antiAliasing!=='Off';
          onChange({...value,cloSettings:v,preferences});
        }} workspace={value.workspace||{}} onWorkspaceChange={(key,next,cloKey,cloValue)=>onChange({...value,workspace:{...value.workspace,[key]:next},cloSettings:{...value.cloSettings,[cloKey]:cloValue}})}/>} 
        {tab === 'workspace' && <><h3>2D Workspace</h3><p className="studio-settings-intro">Arrange the tools and panels you use every day.</p><div className="studio-settings-group"><h4>Layout</h4><Setting label="Workspace preset" description="Choose your starting arrangement."><Select label="Workspace preset" value={lookup(value,'workspace','viewportLayout','split')} onChange={(next) => set('workspace','viewportLayout',next)} options={[["split","Side by side"],["stack","Stacked"],["3d","3D only"],["2d","2D only"]]} /></Setting><Setting label="Custom toolbar dock" description="Choose where your optional custom toolbar appears."><Select label="Custom toolbar dock" value={lookup(value,'workspace','toolbarDock','left')} options={['left','right','top','bottom','floating']} onChange={(next) => set('workspace','toolbarDock',next)} /></Setting><div className="studio-settings-panel-grid">{[['toolbarVisible','Custom toolbar'],['toolbarCompact','Compact toolbar'],['topTabsVisible','Top tabs'],['objectBrowserVisible','Object Browser']].map(([key,label]) => <label key={key}><input type="checkbox" checked={!!lookup(value,'workspace',key,false)} onChange={(e) => set('workspace',key,e.target.checked)} />{label}</label>)}</div><Setting label="Panel ordering"><Select label="Panel ordering" value={lookup(value,'workspace','panelOrder','standard')} options={['standard','swapped']} onChange={(next) => set('workspace','panelOrder',next)} /></Setting>{[['libraryWidth','Library width',160,350],['inspectorWidth','Inspector width',295,540],['objectBrowserHeight','Object Browser height',230,650],['viewportSplit','Viewport split (%)',20,80]].map(([key,label,min,max]) => <Setting key={key} label={label}><div className="studio-range"><input type="range" aria-label={label} min={min} max={max} value={lookup(value,'workspace',key,min)} onChange={(e) => set('workspace',key,Number(e.target.value))} /><output>{lookup(value,'workspace',key,min)}</output></div></Setting>)}<div className="studio-settings-actions-inline"><button type="button" onClick={() => onApplyWorkspace?.(value)}>Apply layout</button><button type="button" onClick={() => onSaveWorkspace?.(value)}>Save workspace</button><button type="button" onClick={() => onRestoreWorkspace?.()}>Restore saved</button></div></div><div className="studio-settings-group"><h4>Custom toolbar</h4><p>Drag tools into your preferred order, or use the arrow buttons.</p><div className="studio-tool-list" aria-label="Current toolbar"
  onDragOver={event=>{if(event.dataTransfer.types.includes('text/plain'))event.preventDefault()}}
  onDrop={event=>{const raw=event.dataTransfer.getData('text/plain');if(!raw.startsWith('extra:'))return;event.preventDefault();const id=raw.slice(6);if(!catalog.some(tool=>tool.id===id)||toolbarIds.includes(id))return;onChange({...value,workspace:{...value.workspace,toolbarIds:[...toolbarIds,id],toolbarVisible:true}})}}>{toolbarIds.map((id, index) => <div key={`${id}-${index}`} className="studio-tool-item" draggable onDragStart={() => setDragging(id)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (!dragging || dragging === id) return; const ids = toolbarIds.filter((v) => v !== dragging); ids.splice(ids.indexOf(id), 0, dragging); editToolbar(ids); setDragging(null); }} onDragEnd={() => setDragging(null)}><span className="studio-tool-grip" aria-hidden="true">⠿</span><span>{getToolLabel(catalog.find((tool) => tool.id === id) || id)}</span><div className="studio-tool-buttons"><button type="button" disabled={index === 0} onClick={() => moveTool(id,-1)} aria-label={`Move ${id} up`}>↑</button><button type="button" disabled={index === toolbarIds.length - 1} onClick={() => moveTool(id,1)} aria-label={`Move ${id} down`}>↓</button><button type="button" onClick={() => editToolbar(toolbarIds.filter((v) => v !== id))} aria-label={`Remove ${id}`}>×</button></div></div>)}{!toolbarIds.length && <p>No tools selected. Add tools below.</p>}</div><label className="studio-settings-search-label" htmlFor="studio-settings-tool-search">Add tools</label><input id="studio-settings-tool-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tools…" /><div className="studio-tool-add-list">{available.map((tool) => <button type="button" key={tool.id} onClick={() => editToolbar([...toolbarIds,tool.id])}>+ {getToolLabel(tool)}</button>)}{!available.length && <small>No more matching tools</small>}</div></div></>}
        {tab === 'workspace' && <TwoDWorkspaceAppearance value={value} onChange={onChange} onPreviewTwoDPalette={onPreviewTwoDPalette} onPreviewTwoDPattern={onPreviewTwoDPattern} onPreviewGradeChart={onPreviewGradeChart}/>}
        {tab === 'workspace' && <div className="studio-toolbar-edit-control">
          <button type="button" data-testid="toggle-toolbar-edit-mode" aria-pressed={!!lookup(value,'workspace','toolbarEditMode',false)}
            onClick={()=>set('workspace','toolbarEditMode',!lookup(value,'workspace','toolbarEditMode',false))}>
            {lookup(value,'workspace','toolbarEditMode',false)?'Finish Editing Toolbars':'Enter Toolbar Edit Mode'}
          </button>
          <p>{lookup(value,'workspace','toolbarEditMode',false)
            ?'Edit mode enabled: drag the left or right toolbar by its grip, or reorder tools. Finish editing to lock the workspace.'
            :'Both toolbars are locked during normal design work. Enter Edit Mode here to move and reorder them.'}</p>
        </div>}
        {tab === 'workspace' && <div className="studio-settings-group" data-testid="settings-dual-toolbar"><h4>Left and right toolbars</h4>
          <Setting label="Arrange toolbars" description="Turn on to drag the entire 2D or 3D toolbar and rearrange icons. Turn off to use drawing tools normally.">
            <label className="studio-switch"><input type="checkbox" aria-label="Arrange toolbars" checked={!!lookup(value,'workspace','toolbarEditMode',false)} onChange={e=>set('workspace','toolbarEditMode',e.target.checked)}/>{lookup(value,'workspace','toolbarEditMode',false)?'Editing toolbars':'Toolbars locked'}</label>
          </Setting>
          {['left','right'].map(side=><section key={side} className="studio-side-toolbar"><h4>{side === 'left' ? 'Left toolbar' : 'Right toolbar'}</h4><Setting label="Dock position"><Select label={`${side} toolbar dock`} value={lookup(value,'workspace',`${side}ToolbarDock`,side)} options={['left','right','top','bottom','floating']} onChange={v=>set('workspace',`${side}ToolbarDock`,v)}/></Setting><div className="studio-tool-list">{sideToolbar(side).map((id,index,ids)=><div key={id} className="studio-tool-item" draggable={lookup(value,'workspace','toolbarEditMode',false)} onDragStart={e=>{if(lookup(value,'workspace','toolbarEditMode',false))e.dataTransfer.setData('text/plain',`${side}:${id}`)}} onDragOver={e=>{if(lookup(value,'workspace','toolbarEditMode',false))e.preventDefault()}} onDrop={e=>{if(!lookup(value,'workspace','toolbarEditMode',false))return;e.preventDefault();const [source,moving]=e.dataTransfer.getData('text/plain').split(':');if(source!==side||!matchesSide(side,moving)||!sideToolbar(side).includes(moving)||!sideToolbar(side).includes(id)||moving===id)return;const destination=sideToolbar(side).filter(v=>v!==moving);destination.splice(destination.indexOf(id),0,moving);editSideToolbar(side,destination);}}><span className="studio-tool-grip">⠿</span><span>{getToolLabel(sideToolById.get(id)||id)}</span><div className="studio-tool-buttons"><button type="button" disabled={index===0} aria-label={`Move ${id} up in ${side} toolbar`} onClick={()=>{const next=[...ids];[next[index-1],next[index]]=[next[index],next[index-1]];editSideToolbar(side,next)}}>↑</button><button type="button" disabled={index===ids.length-1} aria-label={`Move ${id} down in ${side} toolbar`} onClick={()=>{const next=[...ids];[next[index+1],next[index]]=[next[index],next[index+1]];editSideToolbar(side,next)}}>↓</button><button type="button" disabled={ids.length <= 1} aria-label={`Remove ${id} from ${side} toolbar`} onClick={()=>editSideToolbar(side,ids.filter(slot=>slot!==id))}>×</button></div></div>)}</div><Setting label="Add tool"><Select label={`Add tool to ${side} toolbar`} value="" options={[["","Choose tool…"],...sideToolCatalog.filter(t=>matchesSide(side,t.id)&&!sideToolbar(side).includes(t.id)).map(t=>[t.id,t.label||t.id])]} onChange={id=>{if(matchesSide(side,id))editSideToolbar(side,[...sideToolbar(side),id])}}/></Setting></section>)}</div>}
        {tab==='customWorkspace'&&<><h3>Custom Workspace</h3><p className="studio-settings-intro">Design your whole workspace: CAD-inspired layouts, side panels, personal themes, and floating or docked liquid-glass widgets.</p><StudioCustomWorkspaceBuilder value={value} onChange={onChange}/></>}
        {tab==='customToolbar'&&<><h3>Custom Toolbar</h3><p className="studio-settings-intro">Edit the real 2D, 3D, and Pattern Design icon colors, customize saved bars, or create floating toolbars. Changes apply live without changing each tool's action.</p><StudioToolbarBuilder bars={asArray(value.workspace?.customToolbars)} onChange={bars=>set('workspace','customToolbars',bars)} library={asArray(value.workspace?.savedToolbarLibrary)} onLibraryChange={library=>set('workspace','savedToolbarLibrary',library)} onSavedAndActiveChange={(library,bars)=>onChange({...value,workspace:{...value.workspace,savedToolbarLibrary:library,customToolbars:bars}})} nativeIconColors={value.workspace?.nativeToolIconColors||{}} onNativeIconColorsChange={colors=>set('workspace','nativeToolIconColors',colors)}/></>}
        {tab==='toolIndex'&&<>
          <h3>Tool Index</h3>
          <p className="studio-settings-intro">Browse CLO and EXO tools. VectorCraft Pen draws new Bézier patterns; VectorCraft Edit Pattern adjusts points and handles on existing patterns, preserving physical measurements.</p>
          <section className="studio-settings-group studio-tool-index-section" data-testid="tool-index-optitex-grading-24"><div className="studio-index-heading"><div><h4>Pattern grading · 24 live tools</h4><small>Available in Settings → Custom Toolbar; drag into any editable bar or save a grading toolbar to your library.</small></div></div><div className="studio-index-list">{toolCatalog.filter(tool=>tool.id.startsWith('grade24:')&&`${tool.label} ${tool.id}`.toLowerCase().includes(toolIndexSearch.trim().toLowerCase())).map(tool=><div key={tool.id} className="studio-index-tool" data-tool-index-id={tool.id}><span className="studio-index-icon"><CadToolIcon id={tool.icon} size={19}/></span><span className="studio-index-description"><strong>{tool.label}</strong><small>Native pattern grading · validated command</small></span><button type="button" onClick={()=>{const bars=asArray(value.workspace?.customToolbars);if(!bars.length){onChange({...value,workspace:{...value.workspace,customToolbars:[{id:`bar-${Date.now().toString(36)}`,name:'Pattern grading',dock:'floating',columns:2,orientation:'vertical',visible:false,tools:[tool.id]}]}})}else{const target=bars[0];onChange({...value,workspace:{...value.workspace,customToolbars:bars.map((bar,i)=>i===0&&!bar.tools.includes(tool.id)&&bar.tools.length<64?{...bar,tools:[...bar.tools,tool.id]}:bar)}})}setTab('customToolbar')}}>+ Toolbar</button></div>)}</div></section>
          <section className="studio-settings-group studio-tool-index-section" data-testid="tool-index-modaris">
            <div className="studio-index-heading"><div><h4>Lectra Modaris · F1–F8 and upper menus</h4><small>Browse Modaris-inspired tool names, add individual commands, or build entire palette toolbars. EXO command support is shown for every tool.</small></div><button type="button" onClick={addAllModarisPalettes}>+ Build complete Modaris toolbar set</button></div>
            <p>Modaris Expert is a separate licensed application. Adding its command names to EXO does not establish the same industrial behavior; commands requiring native engineering are identified before use.</p>
            <input aria-label="Search Modaris tools" placeholder="Search Modaris commands, palettes and descriptions…" value={toolIndexSearch} onChange={event=>setToolIndexSearch(event.target.value)}/>
            <select aria-label="Filter Modaris implementation status" value={modarisStatusFilter} onChange={event=>setModarisStatusFilter(event.target.value)}><option value="all">All Modaris commands</option><option value="mapped">Connected EXO actions</option><option value="reference">Needs native implementation</option></select>
            <div className="studio-index-bulk"><button type="button" onClick={()=>setExpandedModarisGroups(new Set(modarisGroups))}>Expand all palettes</button><button type="button" onClick={()=>setExpandedModarisGroups(new Set())}>Collapse all palettes</button></div>
            {modarisToolbarFeedback&&<p role="status">{modarisToolbarFeedback}</p>}
            {modarisGroups.map(group=>{
              const tools=catalog.filter(tool=>tool.group===group);
              const visible=tools.filter(tool=>(modarisStatusFilter==='all'||tool.status===modarisStatusFilter)&&`${tool.label} ${tool.id} ${tool.description||''} ${group}`.toLowerCase().includes(toolIndexSearch.trim().toLowerCase()));
              if(!visible.length)return null;
              const expanded=Boolean(toolIndexSearch.trim())||expandedModarisGroups.has(group);
              return <div key={group} className="studio-settings-group" data-modaris-palette={group}>
                <div className="studio-index-heading"><div><h4>{group}</h4><small>{tools.length} tools · {tools.filter(tool=>tool.status!=='reference').length} EXO action mappings</small></div><div className="studio-index-bulk"><button type="button" aria-expanded={expanded} aria-label={`${expanded?'Collapse':'Expand'} ${group}`} onClick={()=>setExpandedModarisGroups(previous=>{const next=new Set(previous);if(next.has(group))next.delete(group);else next.add(group);return next})}>{expanded?'Collapse':'Browse tools'}</button><button type="button" onClick={()=>addModarisPaletteToolbar(group,tools)}>+ Palette toolbar</button></div></div>
                {expanded&&<div className="studio-index-list">{visible.map(tool=><div key={tool.id} className="studio-index-tool" data-tool-index-id={tool.id}>
                  <span className="studio-index-icon"><CadToolIcon id={tool.icon} size={19}/></span>
                  <span className="studio-index-description"><strong>{tool.label}</strong><small>{tool.status==='reference'?'Reference · native implementation pending':'EXO action available'} · {tool.description||group}</small></span>
                  <button type="button" disabled={asArray(value.workspace?.customToolbars).length>=16&&!asArray(value.workspace?.customToolbars).some(bar=>bar.tools.includes(tool.id)||bar.tools.length<64)} onClick={()=>addModarisToolToToolbar(tool.id)}>+ Toolbar</button>
                </div>)}</div>}
              </div>;
            })}
          </section>
          <div className="studio-pattern-workspace-switch"><label htmlFor="studio-tool-workspace">Tool workspace</label><select id="studio-tool-workspace" aria-label="Tool workspace" value={toolIndexWorkspace} onChange={event=>setToolIndexWorkspace(event.target.value)}><option value="all">All tools</option><option value="pattern">Pattern focus · 2D and grading</option></select><small>This filters the tool directory. Your garment and active workspace stay intact.</small></div>
          <div className="studio-index-controls">
            <input aria-label="Search all tools" placeholder="Search the full tool library…" value={toolIndexSearch} onChange={event=>setToolIndexSearch(event.target.value)}/>
            <div role="group" aria-label="Filter tool library by toolbar" className="studio-index-filters">
              {(toolIndexWorkspace==='pattern'?[['all','All 2D'],['right','Right · 2D']]:[['all','All'],['left','Left · 3D'],['right','Right · 2D']]).map(([id,label])=><button key={id} type="button" className={toolIndexSide===id?'selected':''} aria-pressed={toolIndexSide===id} onClick={()=>setToolIndexSide(id)}>{label}</button>)}
            </div>
          </div>
          <div className="studio-index-total">{indexSections.filter(section=>toolIndexWorkspace!=='pattern'||section.side==='right').reduce((sum,s)=>sum+s.tools.length,0)} tools in active directory · Native CLO and EXO</div>
          {indexSections.filter(({side})=>(toolIndexWorkspace!=='pattern'||side==='right')&&(toolIndexSide==='all'||toolIndexSide===side)).map(({side,title,kind,tools})=>{
            const displayed=tools.filter(tool=>`${tool.label} ${tool.id} ${tool.action||''} ${tool.column||''} ${side} ${kind} ${title}`.toLowerCase().includes(toolIndexSearch.trim().toLowerCase()));
            const ids=kind==='native'?sideToolbar(side):extraIds(side);
            const selected=new Set(ids);
            const update=kind==='native'?(next)=>editSideToolbar(side,next):(next)=>editExtraIds(side,next);
            return <section key={`${side}-${kind}`} className="studio-settings-group studio-tool-index-section" data-testid={kind==='extra'?`tool-index-${side}`:`tool-index-${side}-native`}>
              <div className="studio-index-heading"><div><h4>{title}</h4><small>{kind==='native'?`${selected.size} of ${tools.length} on ${side} toolbar`:`${tools.length} tools available in library`}</small></div>
                {kind==='native'&&<div className="studio-index-bulk"><button type="button" disabled={selected.size===tools.length} onClick={()=>update(tools.map(tool=>tool.id))} aria-label={`Add all ${title}`}>Add all</button><button type="button" disabled={ids.length<=1} onClick={()=>update(ids.slice(0,1))} aria-label={`Keep one ${title} tool`}>Keep one</button></div>}
              </div>
              <div className="studio-index-list">{displayed.map(tool=><div className="studio-index-tool" key={tool.id} data-tool-index-id={`${kind}:${tool.id}`}>
                <span className="studio-index-icon" aria-hidden="true"><CadToolIcon id={tool.icon} size={19}/></span>
                <span className="studio-index-description"><strong>{tool.label}</strong><small>{kind==='native'?`CLO · ${side==='left'?'3D':'2D'} · Column ${tool.column}`:tool.legacyOnly?'EXO · Legacy workspace':tool.action===null?'EXO · Planned':`EXO · ${side==='left'?'3D':'2D'} extras`}</small></span>
                {kind==='native'?<button type="button" className={selected.has(tool.id)?'is-added':''} disabled={selected.has(tool.id)&&ids.length<=1} aria-pressed={selected.has(tool.id)} aria-label={`${selected.has(tool.id)?'Remove':'Add'} ${tool.label} ${selected.has(tool.id)?'from':'to'} ${side} toolbar`} onClick={()=>update(selected.has(tool.id)?ids.filter(id=>id!==tool.id):[...ids,tool.id])}>{selected.has(tool.id)?'Remove':'+ Add'}</button>
                  :['vector-pen','vector-pencil','sewing-match-notches'].includes(tool.action)||tool.id==='vectorcraft-edit-pattern'
                    ?<button type="button" aria-label={`Use ${tool.label}`} title={tool.id==='vectorcraft-edit-pattern'?'Select an existing edge, then drag its Bézier handles or pattern points':'Activate on the 2D pattern canvas'} onClick={()=>{
                      window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:tool.action}}))
                      onClose()
                    }}>{tool.id==='vectorcraft-edit-pattern'?'Edit pattern':'Use tool'}</button>
                    :<span className="studio-index-library-status">In library</span>}
              </div>)}{!displayed.length&&<p className="studio-index-no-results">No matching tools in this group.</p>}</div>
            </section>;
          })}
          <section className="studio-settings-group studio-pattern-reference-index" aria-label="Open-source inspired pattern and grading tools" data-testid="open-source-pattern-tool-index">
            <div className="studio-index-heading"><div><h4>Advanced pattern and grading research</h4><small>Reference capabilities from six saved open-source projects · not yet connected to the editor</small></div></div>
            <p>These entries guide future engineering work. They cannot be activated until each implementation is integrated and verified.</p>
            <select aria-label="Pattern tool category" value={toolIndexCategory} onChange={event=>setToolIndexCategory(event.target.value)}><option value="all">All pattern categories</option>{PATTERN_TOOL_CATEGORIES.map(category=><option key={category} value={category}>{category}</option>)}</select>
            <div className="studio-pattern-reference-list">{filterOpenSourcePatternTools(toolIndexSearch,toolIndexCategory).map(tool=><article className="studio-pattern-reference-item" key={tool.id}><div><strong>{tool.label}</strong><small>{tool.category} · {tool.sources.map(source=>OPEN_SOURCE_PATTERN_SOURCES.find(item=>item.id===source)?.name||source).join(', ')}</small><p>{tool.description}</p></div><span className="studio-index-library-status">Research reference</span></article>)}{!filterOpenSourcePatternTools(toolIndexSearch,toolIndexCategory).length&&<p>No matching research tools.</p>}</div>
          </section>
          <div className="studio-settings-group" data-testid="extra-tool-directory">
            <h4>Custom toolbar directory</h4>
            <p>Optional browser shortcuts can also be added to the floating custom toolbar.</p>
            <div className="studio-tool-add-list">
              {catalog.filter(tool=>tool.group==='extra tools').map(tool=><button key={tool.id} type="button"
                disabled={toolbarIds.includes(tool.id)} draggable={!toolbarIds.includes(tool.id)}
                onDragStart={event=>event.dataTransfer.setData('text/plain',`extra:${tool.id}`)}
                onClick={()=>onChange({...value,workspace:{...value.workspace,toolbarIds:[...toolbarIds,tool.id],toolbarVisible:true}})}>
                {toolbarIds.includes(tool.id)?'Added: ':'+ '}{tool.label}
              </button>)}
            </div>
            <small>Zipper and Trim remain available even when their shortcuts are hidden from the workspace.</small>
          </div>
        </>}
        {tab === 'theme' && <>
          <h3>Theme &amp; Color Palettes</h3><p className="studio-settings-intro">Browse real UI color palettes. The cover colors represent the sidebar, Property Editor, accent, labels and text—not decorative photos. Garment colors stay unchanged.</p>
          <div className="studio-active-palette" aria-label="Current theme color palette">
            <div className="studio-active-palette-copy"><small>ACTIVE COLOR PALETTE · CLICK A COLOR TO EDIT</small><strong>{STUDIO_THEME_PRESETS.find(item=>item.id===lookup(value,'appearance','theme','graphite'))?.name||'Graphite Studio'}</strong><span>Choose any swatch to change that part of the interface. Changes are saved only when you select a color.</span></div>
            <div className="studio-active-palette-mini" data-active-palette-mini="true" aria-label="Active palette indicator">
              <span className="studio-active-palette-mini-status"><i aria-hidden="true"/>Active</span>
              <span className="studio-active-palette-mini-strips">{resolveThemePaletteCover20261028(lookup(value,'appearance','theme','graphite'),value.appearance||{}).map(({role,color})=><i key={role} title={role} style={{backgroundColor:color}}/>)}</span>
            </div>
            <div className="studio-active-palette-colors">{resolveThemePaletteCover20261028(lookup(value,'appearance','theme','graphite'),value.appearance||{}).map(({role,color})=><label key={role} className="studio-active-palette-color" title={`Edit active ${role.toLowerCase()} color`}>
              <span className="studio-active-palette-edit-well" style={{backgroundColor:color}}>
                <input type="color" aria-label={`Edit active ${role.toLowerCase()} color`} value={color} onChange={event=>changeActivePaletteColor(role,event.target.value)}/>
              </span><small>{role}<b>{color}</b></small>
            </label>)}</div>
          </div>
          <div id="studio-theme-custom-palettes" className="studio-settings-group studio-custom-color-palettes">
            <h4>Build your own color palette</h4>
            <p>Choose five colors, give your palette a name, and save it. Applying one updates the sidebar, Object Browser, icon accent, and interface text without changing your 3D garment materials.</p>
            <div className="studio-custom-palette-editor">
              {['Sidebar','Property panel','Icon accent','Muted reference','Text'].map((label,index)=><label key={label}><span>{label}</span>
                <Color label={label} value={customPaletteColors[index]} onChange={color=>setCustomPaletteColors(previous=>previous.map((c,i)=>i===index?color:c))}/></label>)}
            </div>
            <div className="studio-custom-palette-actions">
              <input aria-label="Custom color palette name" placeholder="Name your palette…" maxLength={48} value={customPaletteName} onChange={e=>setCustomPaletteName(e.target.value)}/>
              <button type="button" onClick={()=>applyPalette(customPaletteColors)} disabled={!customPaletteColors.every(c=>/^#[0-9a-f]{6}$/i.test(c))}>Apply palette</button>
              <button type="button" onClick={saveCustomPalette} disabled={!customPaletteName.trim()||!customPaletteColors.every(c=>/^#[0-9a-f]{6}$/i.test(c))}>Save palette</button>
            </div>
            <div className="studio-custom-palette-library">{customColorPalettes.map((preset,index)=><div key={index} className="studio-custom-palette-card">
              <div className="studio-custom-palette-strips">{preset.colors.map((color,i)=><span key={i} style={{background:color}}/>)}</div>
              <strong>{preset.name}</strong><button type="button" onClick={()=>applyPalette(preset.colors)}>Apply</button>
              <button type="button" aria-label={`Delete custom palette ${preset.name}`} onClick={()=>{const next=customColorPalettes.filter((_,i)=>i!==index);setCustomColorPalettes(next);try{localStorage.setItem('exo.customColorPalettes.v1',JSON.stringify(next))}catch{}}}>×</button>
            </div>)}</div>
          </div>
          <nav className="studio-theme-jumps" aria-label="Jump to theme settings">
            {[['studio-theme-presets','Presets'],['studio-theme-icon-colors','Icon colors'],['studio-theme-2d-pattern','2D workspace'],['studio-theme-custom-palettes','Custom palettes'],['studio-theme-saved','Saved'],['studio-theme-day-night','Day/Night'],['studio-theme-audit','Contrast audit'],['studio-theme-interface','Interface'],['studio-theme-toolbar-colors','Toolbar colors'],['studio-theme-workspace-parts','Workspace parts']].map(([id,label])=><button key={id} type="button" onClick={()=>jumpToThemeSection(id)} aria-label={`Jump to ${label}`}>{label}</button>)}
          </nav>
          <div id="studio-theme-presets" className="studio-settings-group studio-theme-library">
            <h4>Color palette library <span>{STUDIO_THEME_PRESETS.length} palettes</span></h4>
            <input className="studio-theme-search" aria-label="Search theme presets" placeholder="Search colors and themes…" value={themeSearch} onChange={event=>setThemeSearch(event.target.value)}/>
            <div className="studio-theme-filters" role="group" aria-label="Theme categories">
              {['All',...new Set(STUDIO_THEME_PRESETS.map(theme=>theme.category))].map(group=>
                <button key={group} type="button" className={themeGroup===group?'selected':''} aria-pressed={themeGroup===group} onClick={()=>setThemeGroup(group)}>{group}</button>)}
            </div>
            <div className="studio-theme-gallery" aria-label="Theme presets">
              {STUDIO_THEME_PRESETS.filter(theme=>(themeGroup==='All'||theme.category===themeGroup)
                &&(theme.name+' '+theme.category).toLowerCase().includes(themeSearch.toLowerCase())).map(theme=>{
                const selected=lookup(value,'appearance','theme','graphite')===theme.id;
                return <button key={theme.id} type="button" className={selected?'selected':''} aria-pressed={selected}
                  aria-label={theme.name+' theme'} data-theme-id={theme.id}
                  onMouseEnter={()=>onPreviewTheme?.(theme.id)} onMouseLeave={()=>onPreviewTheme?.(null)} onFocus={()=>onPreviewTheme?.(theme.id)} onBlur={()=>onPreviewTheme?.(null)}
                  onClick={()=>{set('appearance','theme',theme.id);onPreviewTheme?.(null)}}>
                  <ThemePaletteCover theme={theme.id}/>
                  <span className="studio-theme-card-meta"><span className="studio-theme-name">{theme.name}</span><small>{theme.category}</small></span>
                  {selected&&<span className="studio-theme-selected-mark" aria-hidden="true">✓</span>}
                </button>})}
            </div>
          </div>
          <div id="studio-theme-icon-colors" className="studio-settings-group studio-icon-colors-panel">
            <h4>Global icon colors</h4>
            <p>Hover a swatch to preview that color across the 2D tools, 3D tools, floating toolbars, Object Browser, and other icons. Click to apply. Individual icon overrides can be set in Custom Toolbar.</p>
            <div className="studio-global-icon-palette" role="group" aria-label="Global icon color palettes">
              {ICON_COLOR_SWATCHES_20261028.map(([name,color])=><button key={name} type="button"
                aria-label={`Preview and apply ${name} icon color`}
                aria-pressed={lookup(value,'appearance','globalToolbarIconColor','auto')===color}
                title={name+(color==='auto'?' · Follow theme':` · ${color}`)}
                onMouseEnter={()=>onPreviewIconColor?.(color==='auto'?studioResolvedPalette(lookup(value,'appearance','theme','graphite')).textColor:color)}
                onMouseLeave={()=>onPreviewIconColor?.(null)}
                onFocus={()=>onPreviewIconColor?.(color==='auto'?studioResolvedPalette(lookup(value,'appearance','theme','graphite')).textColor:color)}
                onBlur={()=>onPreviewIconColor?.(null)}
                onClick={()=>{set('appearance','globalToolbarIconColor',color);onPreviewIconColor?.(null)}}
                ><i style={{background:color==='auto'?'conic-gradient(#e5e7eb 0 25%,#33383f 25% 50%,#f2a4ca 50% 75%,#7fcab0 75%)':color}}/><span>{name}</span></button>)}
            </div>
            <Setting label="Custom overall icon color" description="Overrides every toolbar's default icon tint, except individual icons with a specific saved color.">
              <TwoDAutoColor label="Global icon color" value={lookup(value,'appearance','globalToolbarIconColor','auto')}
                fallback="#e1a6cf" onChange={color=>set('appearance','globalToolbarIconColor',color)}/>
            </Setting>
          </div>
          <div id="studio-theme-2d-pattern"><TwoDWorkspaceAppearance value={value} onChange={onChange} onPreviewTwoDPalette={onPreviewTwoDPalette} onPreviewTwoDPattern={onPreviewTwoDPattern} onPreviewGradeChart={onPreviewGradeChart}/></div>
          <div id="studio-theme-saved" className="studio-settings-group studio-saved-themes">
            <h4>My saved themes <span>{savedThemes.length}/40</span></h4>
            <p>Save the interface and 2D canvas colors together. Your workspace and 3D environment stay independent.</p>
            <div className="studio-saved-theme-actions"><input aria-label="Custom theme name" maxLength={64} placeholder="Name this theme" value={themeName} onChange={e=>setThemeName(e.target.value)}/><button type="button" disabled={!themeName.trim()} onClick={saveCustomTheme}>Save theme preset</button></div>
            <div className="studio-saved-theme-actions"><button type="button" onClick={downloadCustomThemes} disabled={!savedThemes.length}>Export JSON</button><button type="button" onClick={()=>themeImportRef.current?.click()}>Import JSON</button><input ref={themeImportRef} type="file" accept="application/json,.json" aria-label="Import saved theme JSON" className="studio-hidden-file" onChange={event=>{importCustomThemes(event.target.files?.[0]);event.target.value=''}}/></div>
            <div className="studio-saved-theme-list">{savedThemes.map(preset=><div key={preset.id} className="studio-saved-theme-item"><ThemePaletteCover theme={preset.overrides?.appearance?.theme||'graphite'} appearance={preset.overrides?.appearance||{}} compact/><strong>{preset.name}</strong><button type="button" onClick={()=>{onChange(applySavedThemePreset(value,preset));setThemeFeedback(`Applied ${preset.name}`)}}>Apply</button><button type="button" aria-label={`Delete ${preset.name}`} onClick={()=>{try{setSavedThemes(deleteSavedThemePreset(preset.id));setThemeFeedback(`Deleted ${preset.name}`)}catch(error){setThemeFeedback(error.message)}}}>Delete</button></div>)}{!savedThemes.length&&<p>No custom themes saved yet.</p>}</div>
            {themeFeedback&&<small role="status">{themeFeedback}</small>}
          </div>
          <div id="studio-theme-day-night" className="studio-settings-group studio-theme-schedule">
            <h4>Automatic Day / Night theme</h4><p>Follow your device appearance, switch at local times, or keep the theme you manually select.</p>
            <Setting label="Switching mode"><Select label="Day and night switching mode" value={themeSchedule.mode} options={[["off","Manual only (default)"],["system","Follow device"],["time","Scheduled times"]]} onChange={v=>changeSchedule('mode',v)}/></Setting>
            {themeSchedule.mode==='time'&&<div className="studio-schedule-times"><Setting label="Day starts"><input type="time" aria-label="Day theme start time" value={themeSchedule.dayStart} onChange={e=>changeSchedule('dayStart',e.target.value)}/></Setting><Setting label="Night starts"><input type="time" aria-label="Night theme start time" value={themeSchedule.nightStart} onChange={e=>changeSchedule('nightStart',e.target.value)}/></Setting></div>}
            {themeSchedule.mode!=='off'&&<><Setting label="Day theme"><Select label="Automatic day theme" value={themeSchedule.dayThemeId} options={[...STUDIO_THEME_PRESETS,...savedThemes].map(p=>[p.id,p.name])} onChange={v=>changeSchedule('dayThemeId',v)}/></Setting><Setting label="Night theme"><Select label="Automatic night theme" value={themeSchedule.nightThemeId} options={[...STUDIO_THEME_PRESETS,...savedThemes].map(p=>[p.id,p.name])} onChange={v=>changeSchedule('nightThemeId',v)}/></Setting></>}
          </div>
          <div id="studio-theme-audit" className="studio-settings-group studio-contrast-audit">
            <h4>Contrast audit</h4><p>Checks interface colors and 2D pattern/grade lines for legibility.</p>
            {contrastAudit.length?contrastAudit.map((entry,i)=><div key={`${entry.label}-${i}`} className={`studio-audit-item ${entry.pass?'passed':'warning'}`}><span className="studio-audit-colors"><i style={{background:entry.background||'#ffffff',color:entry.foreground||'#000000'}}>Aa</i></span><strong>{entry.label}</strong><span>{Number.isFinite(entry.ratio)?`${entry.ratio.toFixed(2)}:1`:'Contrast unknown'} · {entry.pass?'Pass':'Needs contrast'}</span></div>):<p>Live contrast measurements appear here when available.</p>}
            {contrastAudit.some(entry=>!entry.pass)&&<button type="button" disabled={!onFixContrast} onClick={()=>onFixContrast?.()}>Fix contrast automatically</button>}
          </div>
          <div id="studio-theme-interface" className="studio-settings-group">
            <h4>Side panels</h4>
            <p>Change the relationship between the Library, Object Browser and Property Editor without changing the 3D scene.</p>
            <div className="studio-panel-finish-grid" role="group" aria-label="Side panel color presets">
              {STUDIO_PANEL_FINISHES.map(finish=><button key={finish.id} type="button" className={lookup(value,'appearance','panelFinish','balanced')===finish.id?'selected':''}
                aria-pressed={lookup(value,'appearance','panelFinish','balanced')===finish.id} onClick={()=>set('appearance','panelFinish',finish.id)}>
                <strong>{finish.label}</strong><small>{finish.description}</small></button>)}
            </div>
          </div>
          <div className="studio-settings-group">
            <h4>Interface material</h4>
            <p>Choose a solid finish or clear Liquid Glass panels. Tool icons remain crisp, colorful, and transparent in either mode.</p>
            <div className="studio-glass-modes" role="group" aria-label="Interface material mode">
              <button type="button" aria-pressed={!lookup(value,'appearance','liquidGlass',false)} className={!lookup(value,'appearance','liquidGlass',false)?'selected':''} onClick={()=>set('appearance','liquidGlass',false)}><span className="studio-material-preview studio-material-solid" aria-hidden="true"><i/><b/><i/></span><strong>Solid</strong><small>Classic opaque panels</small></button>
              <button type="button" aria-pressed={!!lookup(value,'appearance','liquidGlass',false)} className={lookup(value,'appearance','liquidGlass',false)?'selected':''} onClick={()=>set('appearance','liquidGlass',true)}><span className="studio-material-preview studio-material-glass" aria-hidden="true"><i/><b/><i/></span><strong>Liquid Glass</strong><small>Clear layered panels</small></button>
            </div>
            <div className="studio-glass-controls">
              <Setting label="Backdrop tint" description="Adds atmospheric color behind translucent panels; your garment colors stay unchanged."><Color label="Glass backdrop tint" value={lookup(value,'appearance','glassBackdrop','#253d57')} onChange={next=>set('appearance','glassBackdrop',next)}/></Setting>
              <div className="studio-glass-swatches" role="group" aria-label="Liquid Glass backdrop presets">
                {[['#253d57','Deep blue'],['#45315d','Iridescent violet'],['#22564c','Sea glass'],['#5a354c','Soft rose'],['#292e38','Neutral graphite']].map(([color,label])=><button key={color} type="button" aria-label={label+' glass backdrop'} aria-pressed={lookup(value,'appearance','glassBackdrop','#253d57')===color} title={label} style={{'--glass-preset-color':color}} onClick={()=>set('appearance','glassBackdrop',color)}/>) }
              </div>
              <Setting label="Panel clarity" description="Choose how transparent the glass surfaces appear."><Select label="Liquid Glass panel clarity" value={lookup(value,'appearance','glassDensity','balanced')} options={[["clear","Clear · light"],["balanced","Balanced"],["rich","Rich · deeper"]]} onChange={next=>set('appearance','glassDensity',next)}/></Setting>
              <Setting label="Background diffusion" description="Adjust softness behind glass panels without blurring icons or labels."><Select label="Liquid Glass background diffusion" value={lookup(value,'appearance','glassBlur','smooth')} options={[["crisp","Crisp · no blur"],["soft","Soft"],["smooth","Smooth"]]} onChange={next=>set('appearance','glassBlur',next)}/></Setting>
              <div className="studio-glass-subsection"><strong>Icon visibility</strong><small>Adaptive automatically uses dark icons on the light 2D board and light icons on dark viewports and tool rails.</small>
                <div className="studio-glass-icon-modes" role="group" aria-label="Liquid Glass icon colors">
                  {[["adaptive","Adaptive"],["white","Bright white"],["ink","Dark ink"],["accent","Theme accent"]].map(([id,label])=><button key={id} type="button" className={lookup(value,'appearance','glassIconColor','adaptive')===id?'selected':''} aria-pressed={lookup(value,'appearance','glassIconColor','adaptive')===id} data-icon-color={id} onClick={()=>set('appearance','glassIconColor',id)}><span aria-hidden="true">✦</span>{label}</button>)}
                </div>
              </div>
              <div className="studio-glass-subsection"><strong>Where to use Liquid Glass</strong><small>Turn individual interface areas on or off. Editing the garment itself remains unaffected.</small>
                <div className="studio-glass-targets" role="group" aria-label="Liquid Glass surfaces">
                  {[["glassLibrary","Library and asset browser"],["glassInspector","Object Browser and Property Editor"],["glassToolbars","Side toolbars"],["glassMenu","Top menu"],["glassWidgets","Floating viewport controls"]].map(([key,label])=><label key={key}><input type="checkbox" checked={!!lookup(value,'appearance',key,key!=='glassWidgets')} onChange={e=>set('appearance',key,e.target.checked)}/>{label}</label>)}
                </div>
              </div>
            </div>
            <div id="studio-theme-toolbar-colors" className="studio-theme-icon-customization" aria-label="Toolbar color and glow settings">
              <h4>Toolbar icons and glow</h4>
              <div className="studio-interface-ink-settings" data-theme-field="interfaceInkColor">
                <h5>Overall interface icons &amp; text</h5>
                <p>Shared colors across menus, Library, Object Browser, side rails and toolbars. Individual overrides remain available.</p>
                <Setting label="Overall interface icons & text" description="Automatic follows the selected theme; turn it off to choose a custom hex color."><TwoDAutoColor label="Overall interface icons and text" value={lookup(value,'appearance','interfaceInkColor','auto')} fallback="#f1f5fa" onChange={v=>set('appearance','interfaceInkColor',v)}/></Setting>
                <div className="studio-interface-ink-swatches" role="group" aria-label="Interface ink suggestions">{['#ffffff','#f5f0e7','#d7c8b5','#a6b2a1','#7a746b','#22201f','#101820'].map(color=><button key={color} type="button" title={color} aria-label={`Use interface color ${color}`} aria-pressed={lookup(value,'appearance','interfaceInkColor','auto')===color} style={{'--ink-swatch':color}} onClick={()=>set('appearance','interfaceInkColor',color)}/>)}</div>
                <Setting label="Interface brightness"><div className="studio-range"><input type="range" min=".5" max="1.5" step=".05" aria-label="Interface brightness" value={lookup(value,'appearance','interfaceBrightness',1)} onChange={e=>set('appearance','interfaceBrightness',Number(e.target.value))}/><output>{Math.round(lookup(value,'appearance','interfaceBrightness',1)*100)}%</output></div></Setting>
                <Setting label="Auto contrast"><label className="studio-switch"><input type="checkbox" checked={lookup(value,'appearance','autoContrast',true)} onChange={e=>set('appearance','autoContrast',e.target.checked)}/>Adapt to panel brightness</label></Setting>
                <Setting label="Panel text inherits global color"><label className="studio-switch"><input type="checkbox" checked={lookup(value,'appearance','panelTextInheritsGlobal',true)} onChange={e=>set('appearance','panelTextInheritsGlobal',e.target.checked)}/>Library and Object Browser</label></Setting>
                <Setting label="Liquid Glass glow"><label className="studio-switch"><input type="checkbox" checked={lookup(value,'appearance','liquidGlassGlow',false)} onChange={e=>set('appearance','liquidGlassGlow',e.target.checked)}/>Enable</label></Setting>
                <Setting label="Liquid Glass glow intensity"><div className="studio-range"><input type="range" min="0" max="1" step=".05" aria-label="Liquid Glass glow intensity" disabled={!lookup(value,'appearance','liquidGlassGlow',false)} value={lookup(value,'appearance','liquidGlassGlowStrength',.35)} onChange={e=>set('appearance','liquidGlassGlowStrength',Number(e.target.value))}/><output>{Math.round(lookup(value,'appearance','liquidGlassGlowStrength',.35)*100)}%</output></div></Setting>
              </div>
              <div data-theme-field="globalToolbarIconColor" onMouseEnter={()=>onHoverTarget?.('globalToolbarIconColor')} onMouseLeave={()=>onHoverTarget?.(null)}><Setting label="Overall toolbar icons" description="Set the color of the standard toolbar icons across the studio."><TwoDAutoColor label="Overall toolbar icons" value={lookup(value,'appearance','globalToolbarIconColor','auto')} fallback="#c7dcf5" onChange={v=>set('appearance','globalToolbarIconColor',v)}/></Setting></div>
              <Setting label="Overall toolbar glow"><label className="studio-switch"><input type="checkbox" aria-label="Glow on overall toolbar icons" checked={lookup(value,'appearance','globalToolbarGlow',false)} onChange={e=>set('appearance','globalToolbarGlow',e.target.checked)}/>Glow</label></Setting>
              <Setting label="2D vertical and horizontal icons" description="Customize icon colors inside 2D Liquid Glass toolbars and the 2D side rails."><TwoDAutoColor label="2D toolbar icons" value={lookup(value,'appearance','twoDToolbarIconColor','auto')} fallback="#bceaff" onChange={v=>set('appearance','twoDToolbarIconColor',v)}/></Setting>
              <Setting label="2D Liquid Glass tint" description="A light transparent tint on the 2D toolbar surfaces."><TwoDAutoColor label="2D toolbar glass tint" value={lookup(value,'appearance','twoDToolbarGlassColor','auto')} fallback="#c0edff" onChange={v=>set('appearance','twoDToolbarGlassColor',v)}/></Setting>
              <Setting label="2D toolbar icon glow"><label className="studio-switch"><input type="checkbox" aria-label="Glow on 2D toolbar icons" checked={lookup(value,'appearance','twoDToolbarGlow',false)} onChange={e=>set('appearance','twoDToolbarGlow',e.target.checked)}/>Glow</label></Setting>
            </div>
            <TargetedAppearanceSettings value={value} onChange={onChange} onPickTarget={onPickTarget} onHoverTarget={onHoverTarget}/>
            <div className="studio-theme-current">
              <span>Active: {STUDIO_THEME_PRESETS.find(item=>item.id===lookup(value,'appearance','theme','graphite'))?.name||'Graphite Studio'}</span>
              <button type="button" onClick={restoreTheme}>Restore default theme</button>
            </div>
          </div>
          <section className="studio-settings-group studio-theme-ideas" aria-label="Future customization ideas">
            <h4>Ideas for future customization</h4>
            <p>Potential additions to the appearance system:</p>
            <div>{['Per-workspace theme profiles','Sunrise and sunset theme schedules','Color-blind accessible palettes','Saved custom palette collections','Custom focus and selection animations','Import and export theme presets'].map(idea=><span key={idea}>{idea}</span>)}</div>
          </section>
        </>}
        {tab === 'environment' && <><h3>Environment</h3><p className="studio-settings-intro">Set the 3D studio background, floor and lighting.</p><div className="studio-settings-group"><h4>Scene</h4><Setting label="Studio background mode"><Select label="Studio background mode" value={lookup(value,'appearance','backgroundMode','default')} options={[["default","Original 3D studio"],["color","Custom background"]]} onChange={v=>set('appearance','backgroundMode',v)}/></Setting><Setting label="Studio floor mode"><Select label="Studio floor mode" value={lookup(value,'appearance','floorMode','default')} options={[["default","Original floor"],["color","Custom floor color"]]} onChange={v=>set('appearance','floorMode',v)}/></Setting><Setting label="Environment preset"><Select label="Environment preset" value={lookup(value,'appearance','environmentPreset','studio')} options={[["studio","Studio default"],["softbox","Softbox"],["dramatic","Dramatic"],["neutral","Neutral"]]} onChange={v=>set('appearance','environmentPreset',v)} /></Setting>{[['studioColor','Studio background','#373941'],['floorColor','Studio floor','#ebebed'],['lightColor','Light color','#ffffff']].map(([key,label,fallback])=><Setting key={key} label={label}><Color label={label} value={lookup(value,'appearance',key,fallback)} onChange={v=>key==='studioColor'?changeStudioBackground(v):key==='floorColor'?onChange({...value,appearance:{...value.appearance,floorColor:v,floorMode:'color'}}):set('appearance',key,v)}/></Setting>)}<Setting label="Light intensity"><div className="studio-range"><input type="range" aria-label="Light intensity" min="0" max="5" step="0.05" value={lookup(value,'appearance','lightIntensity',1)} onChange={e=>set('appearance','lightIntensity',Number(e.target.value))}/><output>{Number(lookup(value,'appearance','lightIntensity',1)).toFixed(2)}×</output></div></Setting></div><div className="studio-settings-group"><h4>Light position</h4>{[['lightPositionX','Horizontal (X)'],['lightPositionY','Height (Y)'],['lightPositionZ','Depth (Z)']].map(([key,label])=><Setting key={key} label={label}><input type="number" step="0.1" min="-100" max="100" aria-label={label} value={lookup(value,'appearance',key,key==='lightPositionX'?2.5:key==='lightPositionY'?4.5:3.1)} onChange={e=>{const v=Number(e.target.value);if(Number.isFinite(v))set('appearance',key,Math.max(-100,Math.min(100,v)));}}/></Setting>)}</div><div className="studio-environment-reset-row"><button type="button" className="studio-environment-reset" data-testid="studio-reset-environment" onClick={() => onResetEnvironment?.()}>Reset Environment</button><small>Restore original background, floor color, lighting preset, intensity and light position.</small></div></>}
        {tab === 'profile' && <><h3>Profile & brand</h3><p className="studio-settings-intro">Personalize your identity in the design studio.</p><div className="studio-settings-group">{[['displayName','Display name'],['brandName','Designer brand']].map(([key,label]) => <Setting label={label} key={key}><input aria-label={label} maxLength={80} value={lookup(value,'profile',key,'')} onChange={(e) => set('profile',key,e.target.value)} /></Setting>)}<label className="studio-full-label" htmlFor="studio-profile-bio">Bio</label><textarea id="studio-profile-bio" rows={4} maxLength={500} value={lookup(value,'profile','bio','')} onChange={(e) => set('profile','bio',e.target.value)} /></div><div className="studio-settings-group"><h4>Images</h4>{[['avatarDataUrl','Profile picture'],['logoDataUrl','Brand logo']].map(([key,label]) => <div className="studio-upload-row" key={key}><div className="studio-image-preview">{section('profile')[key] ? <img src={section('profile')[key]} alt={`${label} preview`} /> : <span aria-hidden="true">◇</span>}</div><div><strong>{label}</strong><p>PNG, JPEG or WebP up to 220 KB.</p><input type="file" accept="image/png,image/jpeg,image/webp" aria-label={`Upload ${label}`} onChange={(e) => { upload(key,e.target.files?.[0]); e.target.value = ''; }} /><button type="button" disabled={!section('profile')[key]} onClick={() => set('profile',key,'')}>Remove</button></div></div>)}{uploadError && <p className="studio-settings-error" role="alert">{uploadError}</p>}</div></>}
        {tab === 'units' && <><h3>Measurement units</h3><p className="studio-settings-intro">Set the units used for the 2D rulers, pattern measurements, drawing lengths, and dimension labels.</p><section className="studio-settings-group" aria-label="Preferred measurement units"><h4>Display measurements in</h4><div className="studio-unit-choices" role="group" aria-label="2D measurement units">{[['mm','Millimeters'],['cm','Centimeters'],['in','Inches']].map(([unit,label])=><button type="button" key={unit} aria-pressed={lookup(value,'preferences','units','mm')===unit} onClick={()=>chooseMeasurementUnits(unit)}><strong>{unit}</strong><span>{label}</span></button>)}</div><div className="studio-unit-example">Example: 250 mm = 25 cm = 9.843 in</div><p>This changes displayed dimensions and numeric drawing input units, while keeping the garment’s physical size and exported pattern geometry unchanged. Factory specifications with fixed physical tolerances retain their original units.</p></section></>}
        {tab === 'preferences' && <><h3>Preferences</h3><p className="studio-settings-intro">Set your default editing and display behavior.</p><div className="studio-settings-group">{[['language','Language preference (saved)',[['en','English'],['fr','Français'],['es','Español'],['de','Deutsch'],['it','Italiano'],['pt','Português'],['ja','日本語'],['ko','한국어'],['zh','中文']]],['units','Measurement units',[['mm','Millimeters'],['cm','Centimeters'],['in','Inches']]],['graphicsQuality','Graphics quality',['low','medium','high','ultra']],['viewControls','View controls',['clo','maya','blender','trackpad']],['shortcutsPreset','Keyboard shortcut preset (saved)',['clo','illustrator','blender']]].map(([key,label,options]) => <Setting key={key} label={label}><Select label={label} value={lookup(value,'preferences',key,key==='language'?'en':key==='units'?'mm':key==='graphicsQuality'?'high':'clo')} options={options} onChange={(next) => key==='units'?chooseMeasurementUnits(next):set('preferences',key,next)} /></Setting>)}{[['antialias','Anti-aliasing'],['showGrid','Show grid'],['showGuides','Show construction guides']].map(([key,label]) => <Setting key={key} label={label}><label className="studio-switch"><input type="checkbox" checked={!!lookup(value,'preferences',key,true)} onChange={(e) => set('preferences',key,e.target.checked)} />Enable</label></Setting>)}</div></>}
        {tab === 'filesApi' && <><h3>Files & API</h3><p className="studio-settings-intro">Choose local file defaults and configure an API endpoint for supported integrations.</p><div className="studio-settings-group"><h4>Files</h4><Setting label="Auto-save"><label className="studio-switch"><input type="checkbox" checked={!!lookup(value,'preferences','autoSave',false)} onChange={(e) => set('preferences','autoSave',e.target.checked)} />Enable</label></Setting><Setting label="Default folder (saved preference)"><input aria-label="Default folder (saved preference)" value={lookup(value,'preferences','defaultFolder','')} placeholder="Local folder path" onChange={(e) => set('preferences','defaultFolder',e.target.value)} /></Setting></div><div className="studio-settings-group"><h4>API</h4><Setting label="API base URL" description="Saved as a local preference; this does not establish a connection."><input type="url" aria-label="API base URL" value={lookup(value,'preferences','apiBaseUrl','')} placeholder="https://…" onChange={(e) => set('preferences','apiBaseUrl',e.target.value)} /></Setting><span className="studio-status">Not connected</span></div></>}
        {tab === 'plugins' && <><h3>Plugins</h3><p className="studio-settings-intro">Switch locally supported features. External services require a separate connection.</p><div className="studio-settings-group"><h4>Local integration preferences</h4>{[['enableLocalTools','Local design tools'],['enableAssetBridge','Asset bridge']].map(([id,label]) => <Setting key={id} label={label} description={id === 'enableAssetBridge' ? 'Preference only; availability depends on installed integration.' : 'Built-in studio tools'}><label className="studio-switch"><input type="checkbox" checked={!!section('plugins')[id]} onChange={(e) => set('plugins',id,e.target.checked)} />Enabled</label></Setting>)}</div><div className="studio-settings-group"><h4>External connections</h4><p>No external plugin connection is confirmed.</p><span className="studio-status">Not connected</span></div></>}
      </main></div>
      <footer className="studio-settings-footer" data-testid="studio-settings-footer">{confirmGlobalReset ? <div className="studio-settings-confirm" role="group" aria-label="Confirm reset all settings"><strong>Reset all settings?</strong><button type="button" onClick={() => { setConfirmGlobalReset(false); onReset?.(); }} data-testid="studio-confirm-global-reset">Reset everything</button><button type="button" onClick={() => setConfirmGlobalReset(false)}>Cancel</button></div> : <button type="button" className="studio-settings-reset" data-testid="studio-reset-all" onClick={() => setConfirmGlobalReset(true)}>Reset defaults</button>}<span>Settings are stored locally on this device</span><button type="button" className="studio-settings-done" onClick={() => { onApplyWorkspace?.(value); onClose(); }} data-testid="studio-settings-apply">Apply</button></footer>
    </div>
  </div>, document.body);
}
