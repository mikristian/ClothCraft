import {test} from 'node:test'
import assert from 'node:assert/strict'
import {STUDIO_THEME_PRESETS,studioResolvedPalette} from './studioThemePresets.js'
import {resolveThemePaletteCover20261028} from './studioThemePaletteCover20261028.js'

test('every theme cover uses its real five interface colors in a stable order',()=>{
 for(const theme of STUDIO_THEME_PRESETS){
  const swatches=resolveThemePaletteCover20261028(theme.id)
  const actual=studioResolvedPalette(theme.id)
  assert.deepEqual(swatches.map(item=>item.role),['Sidebar','Panel','Accent','Muted','Text'])
  assert.deepEqual(swatches.map(item=>item.color),[
   actual.sidebarColor,actual.panelColor,actual.accent,actual.mutedColor,actual.textColor,
  ].map(color=>color.toUpperCase()))
  assert(swatches.every(s=>/^#[\da-f]{6}$/i.test(s.color)))
 }
})

test('saved palette covers respect valid custom panel colors and reject invalid values',()=>{
 const swatches=resolveThemePaletteCover20261028('cream-light',{
  panelFinish:'unified',panelLibraryColor:'#f8f2e1',panelObjectBrowserColor:'#ffffff',
 })
 assert.equal(swatches[0].color,'#F8F2E1')
 assert.equal(swatches[1].color,'#FFFFFF')
 const fallback=resolveThemePaletteCover20261028('cream-light',{
  panelLibraryColor:'linear-gradient(red,black)',panelObjectBrowserColor:'#fff',
 })
 const original=studioResolvedPalette('cream-light')
 assert.equal(fallback[0].color,original.sidebarColor.toUpperCase())
 assert.equal(fallback[1].color,original.panelColor.toUpperCase())
})
