import test from 'node:test'
import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {createRequire} from 'node:module'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {createNativePatternConstraintSidecar20261023 as create} from '../core/nativePatternConstraintBindings20261023.js'

function fixture(){
  const snapshot={revision:4,template:{panels:[{id:'front',polygon:{
    points:[[0,0],[.4,0],[.4,.4],[0,.4]],edges:['a','b','c','d'],subdivisions:0,
  }}]}}
  const native={version:1,active:true,automaticRegeneration:false,manufacturingApproved:false,
    measurements:{hemWidth:{valueMm:400}},bindings:[{
      id:'hem',panelId:'front',pointIndex:3,mode:'polar',a:2,b:1,
      angleDeg:180,distanceFormula:'hemWidth',
    }]}
  snapshot.nativePointBindings=native
  return {snapshot,sidecar:create(snapshot,{measurements:native.measurements,bindings:native.bindings}).sidecar}
}

const built=await build({entryPoints:['src/components/ModarisNativeMeasurementRecompute20261027.jsx'],
  bundle:true,write:false,platform:'node',format:'cjs',packages:'external',loader:{'.jsx':'jsx'}})
const mod={exports:{}}
new Function('module','exports','require',built.outputFiles[0].text)(mod,mod.exports,createRequire(import.meta.url))
const {default:Editor,modarisNativeMeasurementRecomputePreflight20261027:preflight}=mod.exports

test('native direct-measurement editor mounts real measurement input and explicit confirmation path',()=>{
  const {snapshot,sidecar}=fixture()
  const original=structuredClone({snapshot,sidecar})
  const html=renderToStaticMarkup(React.createElement(Editor,{snapshot,sidecar,onApplyMeasurement:()=>{}}))
  assert.match(html,/Rust-authoritative measurement/)
  assert.match(html,/Saved direct measurement/)
  assert.match(html,/hemWidth: 400 mm/)
  assert.match(html,/New native measurement millimetres/)
  assert.match(html,/Preview Rust-owned dependency recompute/)
  assert.match(html,/six-size grading are not enforced/)
  assert.deepEqual({snapshot,sidecar},original)
})

test('native editor refuses stale and inactive Rust source, and remains SSR safe',()=>{
  const {snapshot,sidecar}=fixture()
  assert.equal(preflight(snapshot,sidecar),'')
  assert.match(preflight(snapshot,sidecar,true),/busy/)
  assert.match(preflight({...snapshot,revision:5},sidecar),/stale/)
  const inactive=structuredClone(snapshot);inactive.nativePointBindings.active=false
  assert.match(preflight(inactive,sidecar),/active native Rust/)
  assert.match(renderToStaticMarkup(React.createElement(Editor,{})),/active native Rust/)
})
