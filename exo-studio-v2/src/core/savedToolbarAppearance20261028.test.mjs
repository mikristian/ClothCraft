import test from 'node:test'
import assert from 'node:assert/strict'
import {normalizeStudioCustomization} from './studioCustomization.js'
test('saved per-toolbar glass and color survive settings normalization',()=>{
 const result=normalizeStudioCustomization({workspace:{customToolbars:[{id:'nest-live',savedSourceId:'saved-liquid-glass-grade-nest',name:'Nest XS–XXL',tools:['exo:grade-nest-xs-xxl'],finish:'glass',color:'#73c8f2',visible:true}],savedToolbarLibrary:[{id:'saved-liquid-glass-grade-nest',name:'Nest XS–XXL',tools:['exo:grade-nest-xs-xxl'],finish:'glass',color:'#73c8f2'}]}})
 assert.equal(result.workspace.savedToolbarLibrary[0].finish,'glass')
 assert.equal(result.workspace.savedToolbarLibrary[0].color,'#73c8f2')
 assert.equal(result.workspace.customToolbars[0].color,'#73c8f2')
 assert.equal(result.workspace.customToolbars[0].finish,'glass')
})
