import {initializeRustPomKernel,rustUiThemeExports} from './rustPomKernel.js'

export const rustThemeKernelReady = () => rustUiThemeExports() !== null
export async function initializeRustThemeKernel(options) {
  return await initializeRustPomKernel(options) && rustThemeKernelReady()
}

/** The native Rust kernel handles '#RRGGBB' parsing and automatic fallback.
 * A null result means WASM has not loaded; never apply an unvalidated value. */
export function rustThemeResolveColor(value,fallback) {
  const engine=rustUiThemeExports()
  if (!engine) return null
  const input=value==='auto' || value==null ? [0,0,0,0,0,0,0]
    : typeof value==='string' && value.length===7 ? Array.from(value,ch=>ch.charCodeAt(0))
      : [0,0,0,0,0,0,0]
  if (typeof fallback!=='string'||!/^#[0-9a-f]{6}$/i.test(fallback)) return null
  const fallbackRgb=Number.parseInt(fallback.slice(1),16)
  const rgb=engine.exo_theme_resolve_rgb(...input,fallbackRgb)
  if (!Number.isInteger(rgb)||rgb<0||rgb>0xffffff) return null
  return `#${rgb.toString(16).padStart(6,'0')}`
}

export function rustThemeGlowEnabled(enabled) {
  const engine=rustUiThemeExports()
  return engine ? engine.exo_theme_glow_enabled(enabled===true?1:0)===1 : false
}

export function rustThemeNestVisible({isTwoD=false,fullWorkspace=false,nativeTwoD=false}={}) {
  const engine=rustUiThemeExports()
  return engine ? engine.exo_theme_full_2d_nest_visible(isTwoD?1:0,fullWorkspace?1:0,nativeTwoD?1:0)===1 : false
}

/** The complete set of new customizable appearance tokens is resolved in Rust.
 * No drawing, physical fabric, or authored pattern measurements are modified. */
export function rustThemeColorTokens(appearance={},preferences={},themeTextColor='#dcefff') {
  if (!rustThemeKernelReady()) return null
  const studio=rustThemeResolveColor(appearance.globalToolbarIconColor,themeTextColor)
  const twoD=rustThemeResolveColor(appearance.twoDToolbarIconColor,studio)
  const colors={
    '--exo-ui-icon-ink':studio,
    '--exo-2d-toolbar-ink':twoD,
    '--exo-2d-toolbar-glass':rustThemeResolveColor(appearance.twoDToolbarGlassColor,'#bceaff'),
    '--exo-2d-point-color':rustThemeResolveColor(preferences.twoDPointColor,'#fdfdfd'),
    '--exo-2d-edge-color':rustThemeResolveColor(preferences.twoDEdgeColor,'#3e91b5'),
    '--exo-2d-selection-color':rustThemeResolveColor(preferences.twoDSelectionColor,'#fff127'),
    '--exo-2d-notch-color':rustThemeResolveColor(preferences.twoDNotchColor,'#e1292f'),
    '--exo-2d-pattern-color':rustThemeResolveColor(preferences.twoDPatternColor,'#f4f4f3'),
    '--exo-2d-ruler-mark-color':rustThemeResolveColor(preferences.twoDRulerMarkColor,'#34434d'),
    '--exo-2d-ruler-glass-color':rustThemeResolveColor(preferences.twoDRulerGlassColor,'#ebf4ff'),
    '--exo-2d-canvas-color':rustThemeResolveColor(preferences.twoDCanvasColor,'#c6c7c9'),
    '--exo-2d-grid-color':rustThemeResolveColor(preferences.twoDGridColor,'#89949c'),
    '--exo-2d-horizontal-ink':rustThemeResolveColor(appearance.twoDViewerHorizontalColor,twoD),
    '--exo-2d-vertical-ink':rustThemeResolveColor(appearance.twoDViewerVerticalColor,twoD),
    '--exo-3d-horizontal-ink':rustThemeResolveColor(appearance.threeDViewerHorizontalColor,studio),
    '--exo-3d-vertical-ink':rustThemeResolveColor(appearance.threeDViewerVerticalColor,studio),
    '--exo-2d-viewer-glass':rustThemeResolveColor(appearance.twoDViewerGlassColor,'#bceaff'),
    '--exo-3d-viewer-glass':rustThemeResolveColor(appearance.threeDViewerGlassColor,'#bceaff'),
    '--exo-library-panel-color':rustThemeResolveColor(appearance.panelLibraryColor,'#262729'),
    '--exo-object-panel-color':rustThemeResolveColor(appearance.panelObjectBrowserColor,'#262729'),
    '--exo-left-rail-color':rustThemeResolveColor(appearance.leftRailColor,'#262729'),
    '--exo-right-rail-color':rustThemeResolveColor(appearance.rightRailColor,'#262729'),
    '--exo-library-icon-color':rustThemeResolveColor(appearance.libraryIconColor,studio),
    '--exo-object-icon-color':rustThemeResolveColor(appearance.objectBrowserIconColor,studio),
    '--exo-interface-ink':rustThemeResolveColor(appearance.interfaceInkColor,themeTextColor),
  }
  return Object.values(colors).every(value=>typeof value==='string') ? colors : null
}
