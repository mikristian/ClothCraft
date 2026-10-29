import test from 'node:test'
import assert from 'node:assert/strict'
import {STUDIO_TOOL_CATALOG,normalizeStudioCustomization} from './studioCustomization.js'
import {getModarisExoRoute20261028} from './modarisCustomToolbarRoute20261028.js'

const modaris=STUDIO_TOOL_CATALOG.filter(tool=>tool.id.startsWith('modaris:'))

test('Modaris command catalog reaches both the tool index and toolbar persistence layer',()=>{
  assert.ok(modaris.length>=250)
  assert.equal(new Set(modaris.map(tool=>tool.id)).size,modaris.length)
  for(let f=1;f<=8;f++)assert.ok(modaris.some(tool=>tool.palette===`F${f}`))
  for(const tool of modaris){
    assert.equal(tool.status,getModarisExoRoute20261028(tool.id)?'mapped':'reference')
  }
  const chosen=modaris.filter(tool=>tool.palette!=='Menu').slice(0,64).map(tool=>tool.id)
  const normalized=normalizeStudioCustomization({workspace:{
    customToolbars:[{id:'modaris-work',name:'Modaris draft tools',dock:'floating',visible:true,tools:[...chosen,'modaris:missing']}],
    savedToolbarLibrary:[{id:'saved-modaris',name:'Saved Modaris palette',tools:chosen}],
  }})
  assert.deepEqual(normalized.workspace.customToolbars[0].tools,chosen)
  assert.deepEqual(normalized.workspace.savedToolbarLibrary[0].tools,chosen)
})

test('Unsupported Modaris commands remain reference-only after normalization',()=>{
  const unsupported=modaris.find(tool=>tool.id==='modaris:f7:basic-size-slide')
  assert.ok(unsupported)
  assert.equal(unsupported.status,'reference')
  assert.equal(getModarisExoRoute20261028(unsupported.id),null)
  assert.ok(normalizeStudioCustomization({workspace:{toolbarIds:[unsupported.id]}}).workspace.toolbarIds.includes(unsupported.id))
})
