import test from 'node:test'
import assert from 'node:assert/strict'
import {MODARIS_TOOLBAR_CATALOG_20261028} from './modarisToolbarCatalog20261028.js'
import {getModarisExoRoute20261028,MODARIS_EXO_ROUTES_20261028} from './modarisCustomToolbarRoute20261028.js'
import {MODARIS_F7_EXO_ACTIONS_20261028} from './modarisF7SizeEvolution20261028.js'

test('Modaris toolbar routing uses only allowlisted EXO equivalents',()=>{
  const routed=MODARIS_TOOLBAR_CATALOG_20261028.filter(tool=>getModarisExoRoute20261028(tool.id))
  assert.ok(routed.length>=15,`expected at least 15 routed entries, got ${routed.length}`)
  assert.ok(Object.isFrozen(MODARIS_EXO_ROUTES_20261028))
  for(const tool of routed){
    const route=getModarisExoRoute20261028(tool.id)
    assert.ok(['native','canvas','studio','layout','app','grade24','tool','panel','settings','f7-size'].includes(route.kind))
    if(route.kind==='f7-size'||['modaris:f6:grade-angle','modaris:f6:grade-proportional','modaris:f6:grade-nest'].includes(tool.id))continue
    if(!['panel','settings'].includes(route.kind)&&tool.id!=='modaris:menu:display-grid')
      assert.ok(MODARIS_EXO_ROUTES_20261028[tool.nativeCandidate],tool.id)
  }
})

test('F7 exposes 11 actual bounded source-linked size workflows, not placeholder routes',()=>{
 const entries=MODARIS_TOOLBAR_CATALOG_20261028.filter(tool=>tool.id.startsWith('modaris:f7:'))
 assert.equal(entries.length,14)
 for(const entry of entries){
  const route=getModarisExoRoute20261028(entry.id)
  const operation=entry.id.slice('modaris:f7:'.length)
  if(MODARIS_F7_EXO_ACTIONS_20261028.includes(operation)){
   assert.equal(route?.kind,'f7-size',entry.id)
   assert.equal(route?.action,operation,entry.id)
  }else assert.equal(route,null,entry.id)
 }
 assert.equal(entries.filter(entry=>getModarisExoRoute20261028(entry.id)).length,11)
 const f6={
  'modaris:f6:grade-angle':'angle',
  'modaris:f6:grade-proportional':'grade-proportionally',
  'modaris:f6:grade-nest':'toggle-native-nest',
 }
 for(const [id,action] of Object.entries(f6))assert.equal(getModarisExoRoute20261028(id)?.action,action)
 assert.equal(MODARIS_TOOLBAR_CATALOG_20261028.filter(entry=>getModarisExoRoute20261028(entry.id)).length,62)
})

test('Modaris menu routes open only the explicitly named existing EXO controls',()=>{
  const cases={
    'modaris:menu:view-object-browser':['panel','object-browser'],
    'modaris:menu:view-properties':['panel','property-editor'],
    'modaris:menu:configure-toolbar':['settings','customToolbar'],
    'modaris:menu:configure-workspace':['settings','workspace'],
    'modaris:menu:parameters-units':['settings','units'],
    'modaris:menu:preferences':['settings','preferences'],
    'modaris:menu:tool-index':['settings','toolIndex'],
    'modaris:menu:display-grid':['app','grid'],
  }
  for(const [id,[kind,action]] of Object.entries(cases)){
    const route=getModarisExoRoute20261028(id)
    assert.equal(route?.kind,kind,id)
    assert.equal(route?.action,action,id)
  }
  assert.equal(getModarisExoRoute20261028('modaris:menu:selection-invert'),null)
  assert.equal(getModarisExoRoute20261028('modaris:menu:macro-record'),null)
})

test('F2 Notch activates the real EXO edge-notch canvas tool',()=>{
  const route=getModarisExoRoute20261028('modaris:f2:notch')
  assert.equal(route?.kind,'canvas')
  assert.equal(route?.action,'notch')
  assert.equal(getModarisExoRoute20261028('modaris:f2:notch-orientation'),null)
  assert.equal(getModarisExoRoute20261028('modaris:f2:perpendicular-notch'),null)
})

test('native cut marks, physical boundary split, measuring and pleat workflows have direct tool routes',()=>{
  const mapped={
    'modaris:f3:split':['canvas','split'],
    'modaris:f4:seam-allowance':['canvas','allowance'],
    'modaris:f8:measure-length':['canvas','measure'],
    'modaris:f5:pleat':['tool','physical-pleat'],
  }
  for(const [id,[kind,action]] of Object.entries(mapped)){
    const route=getModarisExoRoute20261028(id)
    assert.equal(route?.kind,kind,id)
    assert.equal(route?.action,action,id)
  }
  // A generic seam allowance is NOT the same as Modaris's dedicated Line
  // Seam and Piece Seam operations, which remain separate reference entries.
  for(const id of ['modaris:f4:line-seam','modaris:f4:piece-seam',
    'modaris:f4:variable-seam-allowance','modaris:f5:pivoting-dart',
    'modaris:f8:measure-perimeter'])assert.equal(getModarisExoRoute20261028(id),null,id)
})

test('internal line activates the 2D drawing cursor without confusing independent line operations',()=>{
  const route=getModarisExoRoute20261028('modaris:f1:internal-line')
  assert.equal(route?.kind,'canvas')
  assert.equal(route?.action,'line')
  // The EXO line mode edits internal lines in existing panels; Modaris
  // straight and construction lines need separate physical semantics.
  assert.equal(getModarisExoRoute20261028('modaris:f1:straight-line'),null)
  assert.equal(getModarisExoRoute20261028('modaris:f1:construction-line'),null)
})

test('Similar but different Modaris commands never run unrelated EXO actions',()=>{
  assert.equal(getModarisExoRoute20261028('modaris:f1:invented'),null)
  assert.equal(getModarisExoRoute20261028('modaris:menu:select-all'),null)
  assert.equal(getModarisExoRoute20261028('modaris:f5:mirror-piece'),null)
  const unsupported=MODARIS_TOOLBAR_CATALOG_20261028.filter(tool=>!tool.nativeCandidate)
  assert.ok(unsupported.length>50)
  for(const tool of unsupported){
    const route=getModarisExoRoute20261028(tool.id)
    if(route)assert.ok(['settings','panel'].includes(route.kind)||tool.id==='modaris:menu:display-grid'||
      route.kind==='f7-size'||['modaris:f6:grade-angle','modaris:f6:grade-proportional','modaris:f6:grade-nest'].includes(tool.id),tool.id)
  }
})
