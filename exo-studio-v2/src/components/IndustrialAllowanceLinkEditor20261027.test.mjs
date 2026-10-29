import test from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { renderToStaticMarkup } from 'react-dom/server'
import React from 'react'

const require = createRequire(import.meta.url)
const bundled = await build({ entryPoints: ['src/components/IndustrialAllowanceLinkEditor20261027.jsx'], bundle: true, write: false,
  format: 'cjs', platform: 'node', packages: 'external', loader: { '.jsx': 'jsx' } })
const module = { exports: {} }
new Function('module', 'exports', 'require', bundled.outputFiles[0].text)(module, module.exports, require)
const { default: Editor, allowanceLinkEditorPreflight: preflight } = module.exports
const project = { revision: 12, grading: { sizes: ['S','M','L'], baseSize:'M' }, pieces: [
  {id:'front',name:'Front',seamAllowance:1.3,points:[{},{},{}]},
  {id:'back',name:'Back',seamAllowance:0.5,points:[{},{},{}]},
] }
const selection = {sourcePieceId:'front',sourceEdge:1,targetPieceId:'back',targetEdge:0,sizes:['S','M','L']}

test('component offers labeled edge and size controls with a real apply callback boundary', () => {
  const markup = renderToStaticMarkup(React.createElement(Editor,{project,onApplyProject:()=>{}}))
  assert.match(markup,/Source pattern piece/)
  assert.match(markup,/Target edge/)
  assert.match(markup,/Save persistent allowance link in project/)
  assert.match(markup,/disabled=""/)
})

test('guard rejects native mode, subset size runs, missing callback scenarios and stale topology', () => {
  assert.equal(preflight(project,selection),'')
  assert.match(preflight(project,{...selection,nativeMode:true}),/Native Rust/)
  assert.match(preflight(project,{...selection,sizes:['M']}),/Size-specific allowance exports/)
  assert.match(preflight(project,{...selection,sourceEdge:3}),/existing pattern edges/)
  assert.match(preflight(project,{...selection,targetPieceId:'front',targetEdge:1}),/cannot link to itself/)
  assert.match(preflight({...project,revision:undefined},selection),/revisioned legacy project/)
  assert.match(preflight({...project,industrialAllowanceGraph:{schema:'exo.legacy.allowance-links.v1'}},selection),/persistent seam-value graph already exists/)
})
