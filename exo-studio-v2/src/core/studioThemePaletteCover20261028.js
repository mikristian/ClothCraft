import {studioResolvedPalette} from './studioThemePresets.js'

// One source of truth for theme preview covers. Swatches show REAL interface
// colors, never decorative photo gradients unrelated to a saved palette.
const safeHex=value=>typeof value==='string'&&/^#[\da-f]{6}$/i.test(value)?value.toUpperCase():null

export function resolveThemePaletteCover20261028(theme,appearance={}) {
 const palette=studioResolvedPalette(theme||appearance.theme||'graphite',appearance.panelFinish||'balanced')
 const sidebar=safeHex(appearance.panelLibraryColor)||safeHex(palette.sidebarColor)
 const panel=safeHex(appearance.panelObjectBrowserColor)||safeHex(palette.panelColor)
 return [
  {role:'Sidebar',color:sidebar},
  {role:'Panel',color:panel},
  {role:'Accent',color:safeHex(appearance.globalToolbarIconColor)||safeHex(palette.accent)},
  {role:'Muted',color:safeHex(appearance.objectBrowserIconColor)||safeHex(palette.mutedColor)},
  {role:'Text',color:safeHex(appearance.interfaceInkColor)||safeHex(palette.textColor)},
 ]
}
