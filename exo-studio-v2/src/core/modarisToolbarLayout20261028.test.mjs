import test from 'node:test'
import assert from 'node:assert/strict'
import {MODARIS_TOOLBAR_CATALOG_20261028} from './modarisToolbarCatalog20261028.js'
import {planCompleteModarisToolbars20261028} from './modarisToolbarLayout20261028.js'

test('a complete Modaris toolbar plan contains every indexed command exactly once',()=>{
  const plan=planCompleteModarisToolbars20261028(MODARIS_TOOLBAR_CATALOG_20261028,[],'test')
  assert.equal(plan.ok,true)
  assert.equal(plan.missingCount,MODARIS_TOOLBAR_CATALOG_20261028.length)
  assert.ok(plan.additions.length<=16)
  assert.ok(plan.additions.every(bar=>!bar.visible&&bar.tools.length>0&&bar.tools.length<=64))
  assert.deepEqual(plan.additions.flatMap(bar=>bar.tools),MODARIS_TOOLBAR_CATALOG_20261028.map(tool=>tool.id))
})

test('adding a full Modaris palette twice preserves existing customization',()=>{
  const original=planCompleteModarisToolbars20261028(MODARIS_TOOLBAR_CATALOG_20261028,[],'once')
  const again=planCompleteModarisToolbars20261028(MODARIS_TOOLBAR_CATALOG_20261028,original.additions,'twice')
  assert.equal(again.ok,true)
  assert.equal(again.missingCount,0)
  assert.equal(again.requiredBars,0)
  const missing=original.additions.map(bar=>({...bar,tools:bar.tools.filter((_,index)=>index!==0)}))
  const restored=planCompleteModarisToolbars20261028(MODARIS_TOOLBAR_CATALOG_20261028,missing,'restore')
  assert.equal(restored.missingCount,original.additions.length)
  assert.equal(new Set(restored.additions.flatMap(bar=>bar.tools)).size,restored.missingCount)
})

test('full tool library respects available bar slots without erasing existing toolbars',()=>{
  const bars=Array.from({length:15},(_,index)=>({id:`existing-${index}`,tools:['select']}))
  const plan=planCompleteModarisToolbars20261028(MODARIS_TOOLBAR_CATALOG_20261028,bars,'limited')
  assert.equal(plan.ok,false)
  assert.equal(plan.availableBars,1)
  assert.ok(plan.requiredBars>1)
  assert.equal(bars.length,15)
})
