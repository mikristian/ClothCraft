import test from 'node:test'
import assert from 'node:assert/strict'
import {build} from 'esbuild'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {createRequire} from 'node:module'

const bundle=await build({entryPoints:['src/components/ModarisConnectedIndustrialDerivativeStudy20261027.jsx'],bundle:true,write:false,format:'cjs',platform:'node',packages:'external',loader:{'.jsx':'jsx'}})
const module={exports:{}}
new Function('module','exports','require',bundle.outputFiles[0].text)(module,module.exports,createRequire(import.meta.url))
const {default:Panel,preflightModarisConnectedIndustrialDerivative20261027:preflight,previewModarisConnectedIndustrialDerivative20261027:preview}=module.exports
const sizes=['XS','S','M','L','XL','XXL']
const point=(id,x,y,dx,dy)=>({id,x,y,gradeRule:{enabled:true,dxPerSize:dx,dyPerSize:dy}})
const fixture=()=>({revision:4,grading:{sizes:[...sizes],baseSize:'M',widthPerSizeCm:2,lengthPerSizeCm:1},pieces:[{id:'front',points:[point('a',0,0,-1,-.5),point('b',24,0,1,-.5),point('c',24,40,1,.5),point('d',0,40,-1,.5)]}]})
const selection={sourcePieceId:'front',childPieceId:'facing',childName:'Facing draft',depthCm:1.5}

test('SSR renders preview-only controls, no commit, and revisioned source selection',()=>{
  const html=renderToStaticMarkup(React.createElement(Panel,{project:fixture()}))
  assert.match(html,/read-only geometry preview/)
  assert.match(html,/Calculate six-size preview/)
  assert.match(html,/Revalidate saved detached proof/)
  assert.match(html,/Regenerate detached preview/)
  assert.match(html,/geometry commit, sewline creation, cut output and project mutation are unavailable/)
  assert.doesNotMatch(html,/<button[^>]*>Commit/)
  assert.match(html,/Connected derivative source piece/)
})
test('all six sizes carry measured rectangular dimensions, parent-child mappings and source hash; no project mutation',()=>{
  const p=fixture(),prior=structuredClone(p)
  const result=preview(p,selection)
  assert.equal(result.ok,true)
  assert.deepEqual(p,prior)
  assert.equal(result.preview.sizeViews.length,6)
  assert.equal(result.preview.manufacturingApproved,false)
  assert.match(result.preview.provenance.sourceHash,/^[0-9a-f]{16}$/)
  assert.equal(new Set(result.preview.sizeViews.map(v=>v.widthCm)).size,6)
  for(const v of result.preview.sizeViews){
    assert.ok(Math.abs(v.innerAreaCm2-(v.widthCm-3)*(v.heightCm-3))<1e-8)
    assert.deepEqual(v.childVertices.map(v=>v.sourceVertexId),['a','b','c','d'])
    assert.deepEqual(v.childVertices.map(v=>v.id),['facing_a','facing_b','facing_c','facing_d'])
  }
  assert.equal(preview(p,selection,{action:'verify',savedProof:JSON.parse(JSON.stringify(result.preview))}).ok,true)
})
test('saved proof must revalidate and must match operator selection',()=>{
  const p=fixture(),stored=preview(p,selection).preview
  assert.equal(preview(p,{...selection,depthCm:2},{savedProof:stored,action:'verify'}).ok,false)
  const forged=structuredClone(stored);forged.sizeViews[0].childVertices[0].x+=1
  assert.match(preview(p,selection,{savedProof:forged,action:'verify'}).reason,/refused/i)
  p.pieces[0].points[1].x+=2;p.pieces[0].points[2].x+=2;p.revision++
  assert.equal(preview(p,selection,{savedProof:stored,action:'verify'}).ok,false)
  const updated=preview(p,selection,{savedProof:stored,action:'regenerate'})
  assert.equal(updated.ok,true)
  assert.equal(updated.preview.sourceChanged,true)
  assert.equal(preview(p,selection,{savedProof:updated.preview,action:'verify'}).ok,true)
})
test('fail closed for multi-piece, sewing, curves, notches, trapezoid, size drift and missing selection',()=>{
  assert.match(preflight(fixture(),{...selection,sourcePieceId:''}),/Select/)
  for(const edit of [
    p=>p.pieces.push({id:'back',points:[]}),
    p=>p.seams=[],
    p=>p.pieces[0].curves={0:{cx:1,cy:1}},
    p=>p.pieces[0].notches=[],
    p=>p.grading.sizes.pop(),
    p=>p.pieces[0].points[2].x+=.25
  ]){
    const p=fixture();edit(p)
    const response=preview(p,selection)
    assert.equal(response.ok,false)
    assert.equal(response.preview,null)
  }
  assert.match(preflight(fixture(),{...selection,depthCm:6}),/between/)
})
