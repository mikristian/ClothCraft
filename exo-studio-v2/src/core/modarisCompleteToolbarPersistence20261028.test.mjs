import test from 'node:test'
import assert from 'node:assert/strict'
import {MODARIS_TOOLBAR_CATALOG_20261028} from './modarisToolbarCatalog20261028.js'
import {getModarisExoRoute20261028} from './modarisCustomToolbarRoute20261028.js'
import {STUDIO_TOOL_CATALOG,normalizeStudioCustomization} from './studioCustomization.js'

test('all indexed Modaris commands carry accurate EXO mapping status',()=>{
  const indexed=new Map(STUDIO_TOOL_CATALOG.map(tool=>[tool.id,tool]))
  assert.ok(MODARIS_TOOLBAR_CATALOG_20261028.length>=200)
  for(const tool of MODARIS_TOOLBAR_CATALOG_20261028){
    assert.ok(indexed.has(tool.id),`missing ${tool.id}`)
    assert.equal(indexed.get(tool.id).status,getModarisExoRoute20261028(tool.id)?'mapped':'reference')
  }
})

test('complete F1–F8 plus upper-menu collection persists without toolbar truncation',()=>{
  const palettes=[...new Set(MODARIS_TOOLBAR_CATALOG_20261028.map(tool=>tool.palette))]
  const bars=palettes.flatMap(palette=>{
    const tools=MODARIS_TOOLBAR_CATALOG_20261028.filter(tool=>tool.palette===palette)
    return Array.from({length:Math.ceil(tools.length/64)},(_,index)=>({
      id:`all-${palette}-${index}`,name:`Modaris ${palette}`,columns:4,
      visible:false,tools:tools.slice(index*64,(index+1)*64).map(tool=>tool.id),
    }))
  })
  assert.ok(bars.length>8&&bars.length<=16)
  const normalized=normalizeStudioCustomization({workspace:{customToolbars:bars,savedToolbarLibrary:bars}})
  assert.equal(normalized.workspace.customToolbars.length,bars.length)
  assert.deepEqual(normalized.workspace.customToolbars.flatMap(bar=>bar.tools),MODARIS_TOOLBAR_CATALOG_20261028.map(tool=>tool.id))
  assert.deepEqual(normalized.workspace.savedToolbarLibrary.flatMap(bar=>bar.tools),MODARIS_TOOLBAR_CATALOG_20261028.map(tool=>tool.id))
})
