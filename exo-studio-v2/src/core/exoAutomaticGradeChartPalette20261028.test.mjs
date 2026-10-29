import test from 'node:test'
import assert from 'node:assert/strict'
import {exoAutomaticGradeChartPalette20261028,resolveExoGradeChartPalette20261028,resolveExoGradeChartThemes20261028,exoGradeChartPalette20261028} from './exoSettingsColorPresets20261028.js'
import {normalizeStudioCustomization} from './studioCustomization.js'
import {studioResolvedPalette} from './studioThemePresets.js'

test('automatic chart is the default for both grading and compare worksheets',()=>{
 const prefs=normalizeStudioCustomization({}).preferences
 assert.equal(prefs.gradeChartThemeMode,'auto')
 assert.equal(prefs.gradeTableColorTheme,'auto')
 assert.equal(prefs.compareLengthColorTheme,'auto')
})
test('legacy separately saved white and pink charts now both follow the active EXO theme',()=>{
 const legacy=normalizeStudioCustomization({appearance:{theme:'raspberry'},preferences:{
  gradeTableColorTheme:'paper',compareLengthColorTheme:'lavender',
 }}).preferences
 assert.equal(legacy.gradeChartThemeMode,'auto')
 assert.equal(legacy.gradeTableColorTheme,'paper')
 assert.equal(legacy.compareLengthColorTheme,'lavender')
 const pink=studioResolvedPalette('raspberry')
 const colors=resolveExoGradeChartThemes20261028(legacy,pink)
 assert.deepEqual(colors.values,colors.compare)
 assert.equal(colors.values.paper,pink.panelColor)
 const slate=studioResolvedPalette('graphite')
 const updated=resolveExoGradeChartThemes20261028(legacy,slate)
 assert.deepEqual(updated.values,updated.compare)
 assert.notEqual(updated.values.paper,colors.values.paper)
})
test('only explicit custom mode permits independent chart palette colors',()=>{
 const appearance=studioResolvedPalette('rose')
 const prefs=normalizeStudioCustomization({preferences:{
  gradeChartThemeMode:'custom',gradeTableColorTheme:'paper',compareLengthColorTheme:'night',
 }}).preferences
 assert.equal(prefs.gradeChartThemeMode,'custom')
 const chart=resolveExoGradeChartThemes20261028(prefs,appearance)
 assert.equal(chart.values.paper,'#ffffff')
 assert.equal(chart.compare.paper,'#222c35')
 assert.notEqual(chart.values.paper,chart.compare.paper)
 const backToAuto=resolveExoGradeChartThemes20261028({...prefs,gradeChartThemeMode:'auto'},appearance)
 assert.equal(backToAuto.values.paper,appearance.panelColor)
 assert.deepEqual(backToAuto.values,backToAuto.compare)
})
test('both charts follow theme palette and contrast for dark and light presets',()=>{
 for(const theme of ['graphite','midnight','rose','pearl']){
  const palette=studioResolvedPalette(theme)
  const auto=resolveExoGradeChartPalette20261028('auto',palette)
  assert.equal(auto.paper,palette.panelColor)
  assert.equal(auto.id,'auto')
  for(const key of ['paper','header','stripe','line','ink','selected','muted','field']){
   assert.match(auto[key],/^#[0-9a-f]{6}$/i)
  }
  assert.equal(exoAutomaticGradeChartPalette20261028(palette).paper,auto.paper)
 }
})
test('explicit Factory Paper and other presets override automatic theme matching',()=>{
 const main=studioResolvedPalette('plum')
 assert.deepEqual(resolveExoGradeChartPalette20261028('paper',main),exoGradeChartPalette20261028('paper'))
 assert.deepEqual(resolveExoGradeChartPalette20261028('night',main),exoGradeChartPalette20261028('night'))
 const prefs=normalizeStudioCustomization({preferences:{gradeTableColorTheme:'paper',compareLengthColorTheme:'night'}}).preferences
 assert.equal(prefs.gradeTableColorTheme,'paper')
 assert.equal(prefs.compareLengthColorTheme,'night')
})
