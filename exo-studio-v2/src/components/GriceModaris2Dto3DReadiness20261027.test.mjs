import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { transformWithEsbuild } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const folder = dirname(fileURLToPath(import.meta.url))
const componentPath = join(folder, 'GriceModaris2Dto3DReadiness20261027.jsx')
const coreUrl = pathToFileURL(join(folder, '../core/griceModaris2Dto3DReadiness20261027.js')).href
const source = readFileSync(componentPath, 'utf8')

async function loadComponent() {
  const transformed = await transformWithEsbuild(source, componentPath, { loader: 'jsx', format: 'esm', jsx: 'automatic' })
  const code = transformed.code
    .replaceAll('from "react/jsx-runtime"', `from "${import.meta.resolve('react/jsx-runtime')}"`)
    .replaceAll('from "react"', `from "${import.meta.resolve('react')}"`)
    .replaceAll('from "../core/griceModaris2Dto3DReadiness20261027.js"', `from "${coreUrl}"`)
  return (await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)).default
}

const render = (Component, snapshot, disabled = false) => renderToStaticMarkup(React.createElement(Component, {snapshot, disabled}))

test('renders real audit blockers and every Grice preparation stage for absent native evidence', async () => {
  const Panel = await loadComponent()
  const html = render(Panel, {revision: 7})
  assert.match(html, /Native net pattern and identities: BLOCKED/)
  assert.match(html, /Industrial allowances, grain and notches: PASS/)
  assert.match(html, /Sewing relationships and edge lengths: BLOCKED/)
  assert.match(html, /Compiled mesh and fabric mechanics: BLOCKED/)
  assert.match(html, /Missing or oversized authored native panel inventory/)
  assert.match(html, /Missing native fabric identities/)
  assert.match(html, /Audit source revision 7/)
  assert.match(html, /reviewed user-provided 321-page PDF/)
  assert.match(html, /Modaris-style 3D preparation is not independently complete/)
  assert.match(html, /No factory approval/)
  assert.match(html, /data-factory-approved="false"/)
})

test('withholds results for an unknown source revision and respects disabled native operations', async () => {
  const Panel = await loadComponent()
  const invalid = render(Panel, {template: {panels: []}})
  assert.match(invalid, /Audit source revision is missing or stale/)
  assert.doesNotMatch(invalid, /Native net pattern and identities: /)
  const disabled = render(Panel, {revision: 12}, true)
  assert.match(disabled, /Native operation in progress/)
  assert.match(disabled, /BLOCKED/)
  assert.match(disabled, /No factory approval/)
})

test('uses authoritative core seam length evidence and never substitutes mesh preview for readiness', async () => {
  const Panel = await loadComponent()
  const polygon = {
    points: [[0,0],[0.4,0],[0.4,0.2],[0,0.2]],
    edges: ['e0','e1','e2','e3'],
    seam_allowances: {e0: 0.01}, notches: {}
  }
  const panel = id => ({id, fabric: 'cotton', grain_degrees: 0, polygon: structuredClone(polygon)})
  const snapshot = {
    revision: 3,
    template: {panels: [panel('left'),panel('right')], fabrics:[{id:'cotton',properties:{}}], seams:[{
      id:'shoulder', a:{panel:'left',edge:'e0',range:[0,1]}, b:{panel:'right',edge:'e0',range:[0,0.8]},allow_ease:true
    }]},
    panels:[{id:'left'},{id:'right'}], seams:[{id:'shoulder'}],
    positions:[[0,0,0],[1,0,0],[0,1,0]], uv:[[0,0],[1,0],[0,1]], triangles:[[0,1,2]]
  }
  const html = render(Panel, snapshot)
  assert.match(html, /shoulder/)
  assert.match(html, /Explicit ease allowed/)
  assert.match(html, /mm/)
  assert.match(html, /Human review required/)
  assert.match(html, /missing, zero or nonfinite warp material property/)
  assert.match(html, /No factory approval/)
})
