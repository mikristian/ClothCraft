import test from 'node:test'
import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {createRequire} from 'node:module'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {createNativePatternConstraintSidecar20261023 as create} from '../core/nativePatternConstraintBindings20261023.js'

const compiled=await build({entryPoints:['src/components/ModarisFabricBoundChartStudio20261027.jsx'],bundle:true,
  write:false,platform:'node',format:'cjs',packages:'external',loader:{'.jsx':'jsx'}})
const module={exports:{}}
new Function('module','exports','require',compiled.outputFiles[0].text)(module,module.exports,createRequire(import.meta.url))
const {default:Studio,modarisFabricBoundChartStudioPreflight20261027:preflight}=module.exports

const snapshot=()=>({revision:5,template:{id:'source-fixture',panels:[{id:'front',polygon:{points:[[0,0],[.42,0],[.42,.3],[0,.3]],edges:['a','b','c','d']}}]}})
const binding=s=>create(s,{measurements:{width:{valueMm:420},half:{formula:'width / 2'}},bindings:[{
  id:'width-front',panelId:'front',pointIndex:1,mode:'polar',a:0,b:3,angleDeg:0,
  distanceFormula:'width',dependsOn:[],
}]}).sidecar

test('native 2D chart editor displays real six-size inputs, provenances and guarded Rust commit',()=>{
  const snap=snapshot(),sidecar=binding(snap)
  assert(sidecar)
  const initial=structuredClone({snap,sidecar})
  const html=renderToStaticMarkup(React.createElement(Studio,{snapshot:snap,sidecar,onApplyBatch:()=>{}}))
  assert.match(html,/Six-size measurement chart/)
  assert.match(html,/Fabric physical limit provenance/)
  assert.match(html,/width XS value millimetres/)
  assert.match(html,/width M value millimetres/)
  assert.match(html,/half XXL min millimetres/)
  assert.match(html,/Validate entire chart and preview selected native size/)
  assert.match(html,/Reopen previously verified browser chart/)
  assert.match(html,/Rust AnchorGroup/)
  assert.equal((html.match(/width [A-Z]+ value millimetres/g)||[]).length,6)
  assert.deepEqual({snap,sidecar},initial)
})

test('preflight protects stale, absent and busy native binding sources',()=>{
  const snap=snapshot(),sidecar=binding(snap)
  assert.equal(preflight(snap,sidecar),'')
  assert.match(preflight(snap,sidecar,true),/busy/)
  assert.match(preflight(snap,null),/Save a native/)
  assert.match(preflight({...snap,revision:6},sidecar),/stale/)
  assert.match(preflight(null,sidecar),/Rust garment/)
  const html=renderToStaticMarkup(React.createElement(Studio,{snapshot:snap,sidecar,disabled:true}))
  assert.match(html,/Chart review is unavailable/)
  assert.match(html,/disabled=""/)
})
