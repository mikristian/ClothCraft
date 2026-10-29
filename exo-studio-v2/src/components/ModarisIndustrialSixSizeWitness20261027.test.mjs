import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {createRequire} from 'node:module'
import {build} from 'esbuild'
import {createTeeTemplate} from '../data/templates.js'

const bundle=await build({entryPoints:['src/components/ModarisIndustrialSixSizeWitness20261027.jsx'],
  bundle:true,platform:'node',format:'cjs',write:false,packages:'external',loader:{'.jsx':'jsx'}})
const module={exports:{}}
new Function('module','exports','require',bundle.outputFiles[0].text)(module,module.exports,createRequire(import.meta.url))
const Component=module.exports.default

test('operator-facing real industrial proof tool is mounted with named physical geometry and QA scope',()=>{
  const project=createTeeTemplate(),before=structuredClone(project)
  const html=renderToStaticMarkup(React.createElement(Component,{project}))
  assert.match(html,/Six-size physical CUT/)
  assert.match(html,/centimetres and the receiving DXF in millimetres/)
  assert.match(html,/Audit all six physical sizes and DXF geometry/)
  assert.match(html,/Modaris MDL receiving/)
  assert.match(html,/actual sample fit are/)
  assert.match(html,/<strong>not<\/strong> verified/)
  assert.deepEqual(project,before)
})
test('native, incomplete grading and busy source never display a release control',()=>{
  const p=createTeeTemplate()
  assert.match(renderToStaticMarkup(React.createElement(Component,{project:p,nativeMode:true})),/native Rust grading requires/)
  assert.match(renderToStaticMarkup(React.createElement(Component,{project:p,disabled:true})),/workspace is busy/)
  const broken=structuredClone(p);broken.grading.sizes.pop()
  assert.match(renderToStaticMarkup(React.createElement(Component,{project:broken})),/Six graded sizes are required/)
  assert(!renderToStaticMarkup(React.createElement(Component,{project:p})).includes('Approve manufacturing'))
})
