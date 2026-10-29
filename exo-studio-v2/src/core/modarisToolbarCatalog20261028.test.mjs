import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MODARIS_TOOLBAR_CATALOG_20261028 as tools,
  getModarisToolbarTool20261028,
  resolveModarisToolbarTool20261028,
} from './modarisToolbarCatalog20261028.js'

test('includes all eight palettes, upper menus and unique permanent IDs',()=>{
  assert.ok(tools.length>=150)
  assert.equal(new Set(tools.map(t=>t.id)).size,tools.length)
  for(let i=1;i<=8;i++)assert.ok(tools.some(t=>t.palette===`F${i}`))
  assert.ok(tools.some(t=>t.palette==='Menu'))
  for(const t of tools){
    assert.match(t.id,/^modaris:(?:f[1-8]|menu):[a-z0-9-]+$/)
    assert.ok(t.label&&t.group&&t.category&&t.icon&&t.description)
    assert.equal(t.availability,'requires-verification')
    assert.equal(getModarisToolbarTool20261028(t.id),t)
  }
})

test('unsupported entries fail clearly and known candidates require a real handler',()=>{
  const tool=getModarisToolbarTool20261028('modaris:f6:grading-table')
  assert.equal(tool.nativeCandidate,'grade-chart')
  assert.equal(resolveModarisToolbarTool20261028(tool.id).available,false)
  const action=()=>{}
  const resolved=resolveModarisToolbarTool20261028(tool.id,{'grade-chart':action})
  assert.equal(resolved.available,true)
  assert.equal(resolved.action,action)
  const unsupported=resolveModarisToolbarTool20261028('modaris:f3:stretch',{stretch:action})
  assert.equal(unsupported.available,false)
  assert.match(unsupported.reason,/No verified EXO action/)
  assert.equal(resolveModarisToolbarTool20261028('modaris:unknown').available,false)
})

test('Modaris command glyphs distinguish drafting, notches, grading and measurements',()=>{
  const find=id=>getModarisToolbarTool20261028(id)
  assert.equal(find('modaris:f1:developed-point').icon,'points')
  assert.equal(find('modaris:f1:bezier-curve').icon,'curve')
  assert.equal(find('modaris:f2:notch').icon,'notch')
  assert.equal(find('modaris:f3:mirror').icon,'mirror')
  assert.equal(find('modaris:f4:seam-allowance').icon,'seam-allowance')
  assert.equal(find('modaris:f6:grading-table').icon,'grading')
  assert.equal(find('modaris:f8:dx-measurement').icon,'measure')
  const distinct=new Set(tools.map(tool=>tool.icon))
  assert.ok(distinct.size>=15,`expected identifiable glyph families, got ${distinct.size}`)
})
