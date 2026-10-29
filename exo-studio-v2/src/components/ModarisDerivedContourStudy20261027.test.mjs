import test from 'node:test'
import assert from 'node:assert/strict'
import {build} from 'esbuild'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {createRequire} from 'node:module'

const compiled=await build({entryPoints:['src/components/ModarisDerivedContourStudy20261027.jsx'],bundle:true,write:false,format:'cjs',platform:'node',packages:'external',loader:{'.jsx':'jsx'}})
const module={exports:{}}
new Function('module','exports','require',compiled.outputFiles[0].text)(module,module.exports,createRequire(import.meta.url))
const {default:Panel,modarisDerivedContourPreflight20261027:preflight}=module.exports
const project={revision:7,pieces:[{id:'front',points:[{x:0,y:0},{x:12,y:0},{x:12,y:10},{x:0,y:10}]}]}
const selection={sourcePieceId:'front',derivedId:'face',derivedName:'Front facing',depthCm:1}

test('reference-only inward contour UI exposes explicit real geometry construction',()=>{
 const html=renderToStaticMarkup(React.createElement(Panel,{project}))
 assert.match(html,/Create geometric inward contour study/)
 assert.match(html,/Verify and regenerate from source revision/)
 assert.match(html,/detached engineering reference/)
 assert.match(html,/factory output/)
})
test('study gate rejects unsupported native source, duplicate IDs and extreme depth',()=>{
 assert.equal(preflight(project,selection),'')
 assert.match(preflight(project,{...selection,nativeMode:true}),/Native Rust/)
 assert.match(preflight(project,{...selection,derivedId:'front'}),/unique/)
 assert.match(preflight(project,{...selection,depthCm:6}),/at most 5/)
 assert.match(preflight({...project,revision:-1},selection),/revisioned/)
})
