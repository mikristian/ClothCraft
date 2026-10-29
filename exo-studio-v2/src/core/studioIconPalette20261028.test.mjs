import {test} from 'node:test'
import assert from 'node:assert/strict'
import {ICON_COLOR_SWATCHES_20261028,nativeToolCatalog20261028,normalizeIconColors20261028} from './studioIconPalette20261028.js'
import {normalizeStudioCustomization} from './studioCustomization.js'

test('native 3D and 2D icon inventory is stable and complete',()=>{
 assert(nativeToolCatalog20261028.length>=65)
 assert.equal(new Set(nativeToolCatalog20261028.map(tool=>tool.key)).size,nativeToolCatalog20261028.length)
 assert(nativeToolCatalog20261028.some(t=>t.key==='3d:A01'))
 assert(nativeToolCatalog20261028.some(t=>t.key==='2d:B15'))
 assert(ICON_COLOR_SWATCHES_20261028.some(x=>x[0]==='Pink'))
})
test('per-icon override saves and round-trips in both live and saved toolbars',()=>{
 const sample={appearance:{theme:'ballet-pink-light',globalToolbarIconColor:'#f58bbd'},workspace:{
  nativeToolIconColors:{'3d:A01':'#f58bbd','2d:A01':'#0077ee','pattern:select':'#fedcba',bad:'red'},
  customToolbars:[{id:'bar-test',name:'Test',tools:['exo:grade-nest-xs-xxl'],visible:true,
   iconColors:{'exo:grade-nest-xs-xxl':'#eab5ce',broken:'color:red'}}],
  savedToolbarLibrary:[{id:'saved-test',name:'Test',tools:['exo:grade-nest-xs-xxl'],iconColors:{'exo:grade-nest-xs-xxl':'#eab5ce'}}],
 }}
 const normalized=normalizeStudioCustomization(sample)
 assert.equal(normalized.appearance.theme,'ballet-pink-light')
 assert.equal(normalized.workspace.nativeToolIconColors['3d:A01'],'#f58bbd')
 assert.equal(normalized.workspace.nativeToolIconColors.bad,undefined)
 assert.equal(normalized.workspace.customToolbars[0].iconColors['exo:grade-nest-xs-xxl'],'#eab5ce')
 assert.equal(normalized.workspace.customToolbars[0].iconColors.broken,undefined)
 const reloaded=normalizeStudioCustomization(JSON.parse(JSON.stringify(normalized)))
 assert.deepEqual(reloaded.workspace.nativeToolIconColors,normalized.workspace.nativeToolIconColors)
 assert.deepEqual(reloaded.workspace.savedToolbarLibrary[0].iconColors,normalized.workspace.savedToolbarLibrary[0].iconColors)
})
test('invalid icon ink is discarded and no oversized/unsafe dictionary is accepted',()=>{
 const result=normalizeIconColors20261028({'3d:A01':'#123abc',invalid:'red',['x'.repeat(200)]:'#ffffff'})
 assert.deepEqual(result,{'3d:A01':'#123abc'})
})
