import test from 'node:test'
import assert from 'node:assert/strict'
import {normalizeStudioCustomization} from './studioCustomization.js'

test('restores a saved Nest toolbar as button-only even for previously stored legacy toolbar',()=>{
 const normalized=normalizeStudioCustomization({workspace:{customToolbars:[{id:'old-nest',savedSourceId:'saved-liquid-glass-grade-nest',name:'Liquid Glass · Nest XS–XXL',dock:'floating',visible:true,buttonOnly:false,tools:['exo:grade-nest-xs-xxl']}],savedToolbarLibrary:[{id:'saved-liquid-glass-grade-nest',buttonOnly:false,name:'Liquid Glass · Nest XS–XXL',tools:['exo:grade-nest-xs-xxl']} ]}})
 assert.equal(normalized.workspace.customToolbars[0].buttonOnly,true)
 assert.equal(normalized.workspace.savedToolbarLibrary[0].buttonOnly,true)
 assert.equal(normalized.workspace.customToolbars[0].visible,true)
})
