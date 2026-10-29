import test from 'node:test'
import assert from 'node:assert/strict'
import {STUDIO_TOOL_CATALOG,normalizeStudioCustomization} from './studioCustomization.js'

test('complete Modaris F1 and F6 palettes survive custom toolbar and saved library normalization',()=>{
  const palettes=['F1 ·','F6 ·'].map(prefix=>STUDIO_TOOL_CATALOG.filter(tool=>tool.id.startsWith('modaris:')&&tool.group.startsWith(prefix)))
  assert.ok(palettes.every(palette=>palette.length>32))
  const bars=palettes.map((tools,i)=>({
    id:`modaris-palette-${i}`,name:`Modaris ${i}`,dock:'floating',orientation:'vertical',
    columns:3,visible:true,tools:tools.map(tool=>tool.id)
  }))
  const value=normalizeStudioCustomization({workspace:{
    customToolbars:bars,savedToolbarLibrary:bars.map(bar=>({...bar,id:`saved-${bar.id}`}))
  }})
  assert.equal(value.workspace.customToolbars.length,2)
  for(let i=0;i<bars.length;i++){
    assert.deepEqual(value.workspace.customToolbars[i].tools,bars[i].tools)
    assert.deepEqual(value.workspace.savedToolbarLibrary[i].tools,bars[i].tools)
  }
})
