import test from 'node:test'
import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {createRequire} from 'node:module'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'

const built=await build({entryPoints:['src/components/ModarisF7SizeEvolution20261028.jsx'],
 bundle:true,write:false,platform:'node',format:'cjs',packages:'external',loader:{'.jsx':'jsx'}})
const mod={exports:{}}
new Function('module','exports','require',built.outputFiles[0].text)(mod,mod.exports,createRequire(import.meta.url))
const Studio=mod.exports.default
const ruleSet={sizes:['2','4','6','8','10'],baseSize:'6'}

test('F7 exposes a separate explicit Rust canonical commit only for saved grade sources',()=>{
 const html=renderToStaticMarkup(React.createElement(Studio,{
  snapshot:{revision:9,gradeRunPersisted:true},ruleSet,onNativeCommit:()=>{},
 }))
 assert.match(html,/data-native-f7-canonical-commit="true"/)
 assert.match(html,/Commit canonical F7 sizes to Rust \(verified\)/)
 assert.match(html,/Draft changes are not native commits/)
 assert.match(html,/no industrial cut approval or vendor certification/)
})

test('F7 canonical commit is absent for unsaved or fewer-than-four-size runs',()=>{
 for(const [snapshot,rules] of [
  [{revision:3,gradeRunPersisted:false},ruleSet],
  [{revision:3,gradeRunPersisted:true},{sizes:['2','4','6'],baseSize:'4'}],
 ]){
  const html=renderToStaticMarkup(React.createElement(Studio,{snapshot,ruleSet:rules}))
  assert.doesNotMatch(html,/data-native-f7-canonical-commit/)
 }
})

test('F7 canonical commit is disabled while native size is active or callback missing',()=>{
 for(const props of [
  {snapshot:{revision:9,gradeRunPersisted:true,activeGradedSize:'10'},onNativeCommit:()=>{}},
  {snapshot:{revision:9,gradeRunPersisted:true}},
 ]){
  const html=renderToStaticMarkup(React.createElement(Studio,{ruleSet,...props}))
  assert.match(html,/data-native-f7-canonical-commit="true" disabled=""/)
 }
})
