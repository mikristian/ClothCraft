import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'
import {transformWithEsbuild} from 'vite'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'

const dirname=path.dirname(fileURLToPath(import.meta.url))
const source=fs.readFileSync(path.join(dirname,'Grice3DProductionVariant20261027.jsx'),'utf8')
async function load(){
  const code=(await transformWithEsbuild(source,'Grice3DProductionVariant20261027.jsx',
    {loader:'jsx',format:'esm',jsx:'automatic'})).code
    .replaceAll('from "react/jsx-runtime"',`from "${import.meta.resolve('react/jsx-runtime')}"`)
    .replaceAll('from "react"',`from "${import.meta.resolve('react')}"`)
    .replaceAll('from "../core/grice3DProductionVariant20261027.js"',
      `from "${pathToFileURL(path.join(dirname,'../core/grice3DProductionVariant20261027.js')).href}"`)
  return (await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)).default
}
const snapshot=()=>({revision:6,
  template:{panels:[{id:'front',name:'Front',fabric:'cotton'},{id:'back',name:'Back',fabric:'cotton'}],
    seams:[{id:'side',a:{panel:'front'},b:{panel:'back'}}]},
  panels:[{id:'front'},{id:'back'}],seams:[{id:'side'}]})

test('shows real native pieces, independent production/3D selectors and a qualified review',async()=>{
  const Component=await load()
  const html=renderToStaticMarkup(createElement(Component,{snapshot:snapshot()}))
  assert.match(html,/Production \/ 3D piece variant/)
  assert.match(html,/Front/)
  assert.match(html,/Back/)
  assert.match(html,/cotton/)
  assert.match(html,/Source-authentic production and 3D variant pieces/)
  assert.match(html,/front production/)
  assert.match(html,/front send to 3D/)
  assert.match(html,/front 3D substitute/)
  assert.match(html,/3D substitute/)
  assert.match(html,/Qualified draft passes/)
  assert.match(html,/native EXO fitting project/)
  assert.match(html,/Unsaved production\/3D source selection/)
  assert.match(html,/Export source-verified 2D \/ 3D variant draft JSON/)
})
test('missing compiled piece blocks export and exposes actual sewing blocker',async()=>{
  const Component=await load()
  const s=snapshot();s.panels=[{id:'front'}]
  const html=renderToStaticMarkup(createElement(Component,{snapshot:s}))
  assert.match(html,/Blocking variant issues/)
  assert.match(html,/back.*absent from compiled scene/)
  assert.match(html,/disabled=""/)
  assert.match(html,/Assembly review required/)
})
test('disabled operator cannot alter source or export and copyright reference is concise',async()=>{
  const Component=await load()
  const s=snapshot(),before=structuredClone(s)
  const html=renderToStaticMarkup(createElement(Component,{snapshot:s,disabled:true}))
  assert.match(html,/Native source revision: 6/)
  assert.match(html,/disabled=""/)
  assert.match(html,/printed pp\. 57/)
  assert.deepEqual(s,before)
  assert.match(source,/URL\.revokeObjectURL\(url\)/)
  assert.match(source,/nativePersisted:false,productionAuthorized:false/)
})
test('saved Rust variant restores actual article choices instead of resetting to draft defaults',async()=>{
  const Component=await load()
  const s=snapshot()
  s.pieceVariant={persisted:true,
    definition:{version:1,pieces:[
      {panelId:'front',fabricId:'cotton',quantity:2,production:true,sendTo3D:true},
      {panelId:'back',fabricId:'cotton',quantity:1,production:false,sendTo3D:true},
    ]},
    review:{readyFor3D:false,pairedQuantityPanelIds:['front']}}
  const html=renderToStaticMarkup(createElement(Component,{snapshot:s,onStore:async()=>{},onClear:async()=>{}}))
  assert.match(html,/data-native-piece-variant-status="saved"/)
  assert.match(html,/Rust-persisted production\/3D source selection/)
  assert.match(html,/Save variant to native EXO project/)
  assert.match(html,/Clear saved variant/)
  assert.match(html,/Saved variant requires instance or sewing review/)
  assert.match(html,/value="2" selected=""/)
  assert.match(html,/type="checkbox"/)
})
test('persisted variant provides a physical native preview control without claiming mirror or factory readiness',async()=>{
  const Component=await load()
  const s=snapshot()
  s.pieceVariant={persisted:true,definition:{pieces:[]},review:{readyFor3D:false}}
  const html=renderToStaticMarkup(createElement(Component,{
    snapshot:s,onInstancePreview:async()=>{},onInstanceActivate:async()=>{},onInstanceRestore:async()=>{},
  }))
  assert.match(html,/Native physical 3D article preview/)
  assert.match(html,/Inspect physical 3D instances/)
  assert.match(html,/unsewn pieces only/)
  assert.match(html,/not geometrically mirrored/)
  assert.match(html,/data-native-physical-variant-preview="true"/)
  assert.doesNotMatch(html,/Activate temporary 3D article scene/)
})
test('active compiled physical assembly displays restore and does not offer any source-editing controls',async()=>{
  const Component=await load()
  const s=snapshot()
  s.variantAssemblyActive=true
  s.panels.push({id:'unsewn__3d_instance_2'})
  s.triangles=Array.from({length:12},()=>[0,1,2])
  const html=renderToStaticMarkup(createElement(Component,{
    snapshot:s,onInstanceRestore:async()=>{},
  }))
  assert.match(html,/data-native-variant-assembly="active"/)
  assert.match(html,/Physical panels: 3; triangles: 12/)
  assert.match(html,/Restore original authored garment/)
  assert.match(html,/not demonstrate mirrored construction/)
  assert.doesNotMatch(html,/Save variant to native EXO project/)
  assert.doesNotMatch(html,/Clear saved variant/)
})
