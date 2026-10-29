import test from 'node:test'
import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {createRequire} from 'node:module'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {createNativePatternConstraintSidecar20261023 as create} from '../core/nativePatternConstraintBindings20261023.js'

const compiled=await build({entryPoints:['src/components/ModarisNativeReferenceRecompute20261027.jsx'],bundle:true,
  write:false,platform:'node',format:'cjs',packages:'external',loader:{'.jsx':'jsx'}})
const mod={exports:{}}
new Function('module','exports','require',compiled.outputFiles[0].text)(mod,mod.exports,createRequire(import.meta.url))
const {default:Editor,modarisNativeReferenceRecomputePreflight20261027:preflight}=mod.exports

function fixture(){
  const snapshot={revision:9,template:{panels:[{id:'front',name:'Front',fabric:'main',grain_degrees:90,
    layout_2d:[0,0],placement:{translation:[0,1.5,0.4],rotation_degrees:[0,0,0]},pins:[],
    pattern:{width:.4,height:.3,nx:1,ny:1},
    polygon:{points:[[0,0],[.4,0],[.4,.3],[0,.3]],edges:['a','b','c','d'],
      subdivisions:2,meshing:{target_edge_m:.025},curves:{},free_curve_points:{},vertex_ids:{},
      vertex_mirror_groups:{},holes:[],lines:[],target_lengths:{},notches:[],seam_allowances:{},
      annotations:[],measurements:{}}}]}}
  const created=create(snapshot,{measurements:{reach:{valueMm:250}},bindings:[
    {id:'dependent',panelId:'front',pointIndex:2,mode:'polar',a:1,b:0,angleDeg:90,distanceFormula:'reach'}]})
  assert.equal(created.ok,true,created.reason)
  return {snapshot,sidecar:created.sidecar}
}

test('SSR UI renders selection, mm fields, two-stage preview and confirmation without mutating native geometry',()=>{
  const {snapshot,sidecar}=fixture(),source=structuredClone({snapshot,sidecar})
  const html=renderToStaticMarkup(React.createElement(Editor,{snapshot,sidecar,onApplyBatch:async()=>false}))
  assert.match(html,/Native reference point recompute/)
  assert.match(html,/Source panel/)
  assert.match(html,/Unbound source anchor/)
  assert.match(html,/Desired X mm/)
  assert.match(html,/Desired Y mm/)
  assert.match(html,/Preview source and all dependent corrections/)
  assert.match(html,/one source anchor/i)
  assert.doesNotMatch(html,/Apply confirmed native AnchorGroup/)
  assert.deepEqual({snapshot,sidecar},source)
})

test('preflight guards absent snapshot, stale revisions/fingerprints and busy state',()=>{
  const {snapshot,sidecar}=fixture()
  assert.equal(preflight(snapshot,sidecar),'')
  assert.match(preflight(snapshot,sidecar,true),/busy/)
  assert.match(preflight(null,sidecar),/snapshot/)
  assert.match(preflight(snapshot,null),/sidecar/)
  assert.match(preflight({...snapshot,revision:10},sidecar),/stale/)
  const changed=structuredClone(snapshot);changed.template.panels[0].polygon.points[0][0]=.01
  assert.match(preflight(changed,sidecar),/stale/)
  const busyHtml=renderToStaticMarkup(React.createElement(Editor,{snapshot,sidecar,disabled:true}))
  assert.match(busyHtml,/unavailable/)
  assert.match(busyHtml,/disabled=""/)
})

test('React component remains SSR-safe with no native source or binding handler',()=>{
  const html=renderToStaticMarkup(React.createElement(Editor,{}))
  assert.match(html,/revisioned native Rust snapshot/)
  assert.match(html,/Preview source and all dependent corrections/)
})
