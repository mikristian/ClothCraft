import test from 'node:test'
import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {createRequire} from 'node:module'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {createAccuMarkNativeRuleSet} from '../core/accumarkNativePointRuleSet20261023.js'

const built=await build({
  entryPoints:['src/components/NativeGradingPOMEditor20261025.jsx'],
  bundle:true,write:false,platform:'node',format:'cjs',packages:'external',
  loader:{'.jsx':'jsx'},
})
const module={exports:{}}
new Function('module','exports','require',built.outputFiles[0].text)(
  module,module.exports,createRequire(import.meta.url))
const Editor=module.exports.default

function fixture(sizes=['2','4','6','8','10']){
  const snapshot={revision:17,gradeRunPersisted:true,activeGradedSize:null,
    template:{seams:[],fabrics:[],panels:[{id:'front',polygon:{
      points:[[0,0],[.2,0],[.2,.3],[0,.3]],
      edges:['hem','side','neck','left'],
    }}]}}
  const created=createAccuMarkNativeRuleSet(snapshot,{sizes,baseSize:sizes[2]})
  assert.equal(created.ok,true,created.reason)
  const ruleSet=created.ruleSet
  const definitions=[{id:'front:path',label:'Front clockwise sewn boundary',
    panelId:'front',kind:'sewline-path',fromPoint:3,toPoint:1,
    toleranceMm:2,targetsMm:Object.fromEntries(sizes.map(size=>[size,500]))}]
  return {snapshot,ruleSet,definitions,onCommitNative:async()=>({ok:false})}
}

test('F7 POM editor exposes confirmed Rust path persistence without falsely claiming factory signoff',()=>{
  const f=fixture(),original=structuredClone({snapshot:f.snapshot,ruleSet:f.ruleSet,definitions:f.definitions})
  const html=renderToStaticMarkup(React.createElement(Editor,f))
  assert.match(html,/Consecutive sewn boundary path/)
  assert.match(html,/Rust schema-v2 supports source-verified named-size sewn boundary path/)
  assert.match(html,/data-native-named-pom-rust-commit="true"/)
  assert.match(html,/Review native POM target commit/)
  assert.match(html,/Factory release remains blocked|does not approve fit, cutting or factory release/)
  assert.doesNotMatch(html,/cannot save to Rust yet|Rust grade-run saving is unavailable/)
  assert.equal(JSON.stringify({snapshot:f.snapshot,ruleSet:f.ruleSet,definitions:f.definitions}),
    JSON.stringify(original))
})

test('external disabled state locks all editable POM controls, not only Rust confirmation',()=>{
  const html=renderToStaticMarkup(React.createElement(Editor,{...fixture(),disabled:true}))
  for(const label of ['POM selected graded size','Selected POM specification',
    'Edit POM start anchor','Edit POM end anchor','POM target 2 millimetres',
    'POM target 10 millimetres','POM tolerance millimetres']){
    const element=html.match(new RegExp(`<[^>]+aria-label="${label}"[^>]*>`))?.[0]
    assert.ok(element,`Missing editable control: ${label}`)
    assert.match(element,/disabled=""/,`Unlocked control: ${label}`)
  }
  assert.match(html,/Review native POM target commit<\/button>/)
})

test('non-persisted named-size source never enables the native commit',()=>{
  const f=fixture();f.snapshot.gradeRunPersisted=false
  const html=renderToStaticMarkup(React.createElement(Editor,f))
  const button=html.match(/<button[^>]*>Review native POM target commit<\/button>/)?.[0]
  assert.ok(button)
  assert.match(button,/disabled=""/)
})

test('legacy six-size drafting stays separate from named-size Rust transaction',()=>{
  const f=fixture(['XS','S','M','L','XL','XXL'])
  const html=renderToStaticMarkup(React.createElement(Editor,f))
  assert.doesNotMatch(html,/data-native-named-pom-rust-commit/)
  assert.match(html,/Use current measured run as draft targets/)
  assert.match(html,/not body measurements/i)
})
