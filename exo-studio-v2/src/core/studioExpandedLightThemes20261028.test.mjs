import {test} from 'node:test'
import assert from 'node:assert/strict'
import {STUDIO_THEME_PRESETS,STUDIO_THEME_IDS,studioResolvedPalette,colorContrast} from './studioThemePresets.js'
import {normalizeStudioCustomization} from './studioCustomization.js'

test('168 distinct presets including 60 real light schemes with readable inspector ink',()=>{
 const ids=STUDIO_THEME_PRESETS.map(p=>p.id)
 assert.equal(ids.length,new Set(ids).size,'Duplicate theme IDs would invalidate saved themes')
 assert(STUDIO_THEME_PRESETS.length>=168)
 const light=STUDIO_THEME_PRESETS.filter(p=>p.mode==='light')
 assert(light.length>=60)
 for(const theme of light){
  assert(STUDIO_THEME_IDS.has(theme.id))
  for(const finish of ['balanced','deep','unified','tinted']){
   const p=studioResolvedPalette(theme.id,finish)
   for(const surface of [p.panelColor,p.sidebarColor]){
    assert(colorContrast(p.textColor,surface)>=4.5,`${theme.id}/${finish}: low text contrast`)
    assert(colorContrast(p.mutedColor,surface)>=4.5,`${theme.id}/${finish}: low muted contrast`)
   }
  }
 }
})

test('new theme selection persists without changing custom toolbar/color or garments',()=>{
 for(const id of ['pure-white-light','vanilla-light','silver-gray-light','sea-glass-light','blush-cream-light']){
  const base={appearance:{theme:id,panelFinish:'tinted'},workspace:{customToolbars:[{
   id:'saved-nest',name:'Nest',tools:['exo:grade-nest-xs-xxl'],
   color:'#a57bff',finish:'glass',x:193,y:208,visible:true,
  }]}}
  const normalized=normalizeStudioCustomization(base)
  assert.equal(normalized.appearance.theme,id)
  assert.equal(normalized.workspace.customToolbars[0].color,'#a57bff')
  assert.equal(normalized.workspace.customToolbars[0].x,193)
  const loaded=normalizeStudioCustomization(JSON.parse(JSON.stringify(normalized)))
  assert.equal(loaded.appearance.theme,id)
  assert.deepEqual(loaded.workspace.customToolbars,normalized.workspace.customToolbars)
 }
 assert.equal(normalizeStudioCustomization({appearance:{theme:'graphite'}}).appearance.theme,'graphite')
})
