import test from 'node:test'
import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {createRequire} from 'node:module'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'

const built=await build({entryPoints:['src/components/NativeGradeSizeCorrespondenceStudio20261028.jsx'],
 bundle:true,write:false,platform:'node',format:'cjs',packages:'external',loader:{'.jsx':'jsx'}})
const mod={exports:{}}
new Function('module','exports','require',built.outputFiles[0].text)(mod,mod.exports,createRequire(import.meta.url))
const Studio=mod.exports.default

test('native F7 UI starts fail-closed, exposes real inspect and does not claim a draft is saved',()=>{
 const html=renderToStaticMarkup(React.createElement(Studio,{
  snapshot:{revision:7,gradeRunPersisted:true},onInspect:()=>{},onCommit:()=>{},
 }))
 assert.match(html,/data-native-f7-correspondence="true"/)
 assert.match(html,/Inspect saved native size catalog/)
 assert.match(html,/factory release and independent receiving-CAD approval remain blocked/)
 assert.doesNotMatch(html,/Confirm native Rust correspondence commit/)
 assert.doesNotMatch(html,/localStorage/)
})

test('native F7 UI disables inspection without a saved Rust catalog',()=>{
 const html=renderToStaticMarkup(React.createElement(Studio,{snapshot:{revision:2,gradeRunPersisted:false}}))
 assert.match(html,/disabled=""/)
})
