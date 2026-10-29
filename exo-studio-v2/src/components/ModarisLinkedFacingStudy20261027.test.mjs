import test from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { createRequire } from 'node:module'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const require=createRequire(import.meta.url)
const bundled=await build({entryPoints:['src/components/ModarisLinkedFacingStudy20261027.jsx'],bundle:true,write:false,format:'cjs',platform:'node',packages:'external',loader:{'.jsx':'jsx'}})
const mod={exports:{}}
new Function('module','exports','require',bundled.outputFiles[0].text)(mod,mod.exports,require)
const {default:Study,modarisLinkedFacingPreflight:preflight}=mod.exports

const source=()=>({revision:12,pieces:[{id:'front',name:'Front panel',fabricId:'linen',points:[{x:0,y:0},{x:10,y:0},{x:10,y:7},{x:0,y:7}],curves:{0:{cx:5,cy:-2}}}]})
const selection={sourcePieceId:'front',facingId:'front-study',facingName:'Front study',depthCm:1.5}

test('JSX renders source-facing controls, visible geometry, and reference-only restrictions',()=>{
 const p=source(),before=structuredClone(p)
 const html=renderToStaticMarkup(React.createElement(Study,{project:p}))
 assert.deepEqual(p,before)
 assert.match(html,/Modaris linked facing engineering study/)
 assert.match(html,/data-linked-facing-reference-only="true"/)
 assert.match(html,/Source pattern piece/)
 assert.match(html,/Front panel/)
 assert.match(html,/Create detached linked facing study/)
 assert.match(html,/Regenerate from current legacy source/)
 assert.match(html,/disabled=""[^>]*>Regenerate from current legacy source/)
 assert.match(html,/not a normal-offset facing/)
 assert.match(html,/No production cut piece, seam allowance, sewing relationship, graded sizes, factory approval, or manufacturing export/)
 assert.match(html,/revisioned legacy project|Choose an existing source piece/)
})

test('preflight accepts source selection, rejects conflicts, native mode and missing revision',()=>{
 assert.equal(preflight(source(),selection),'')
 assert.match(preflight(source(),{...selection,nativeMode:true}),/native Rust/)
 assert.match(preflight(source(),{...selection,facingId:'front'}),/unique engineering facing ID/)
 assert.match(preflight(source(),{...selection,depthCm:0}),/Displacement|displacement/)
 assert.match(preflight({...source(),revision:undefined},selection),/revisioned legacy project/)
 assert.match(preflight(source(),{...selection,sourcePieceId:'missing'}),/existing source piece/)
 const html=renderToStaticMarkup(React.createElement(Study,{project:source(),nativeMode:true}))
 assert.match(html,/native Rust projects are unsupported/)
 assert.match(html,/disabled=""/)
})

test('JSX bundled component imports real linked-facing create and update operations',()=>{
 assert.match(bundled.outputFiles[0].text,/LINKED_FACING_/)
 assert.match(bundled.outputFiles[0].text,/REVISION_CONFLICT/)
 assert.match(bundled.outputFiles[0].text,/SILENT_SOURCE_EDIT/)
 assert.match(bundled.outputFiles[0].text,/sourceGeometryHash/)
 assert.match(bundled.outputFiles[0].text,/sourceMetadataHash/)
 assert.match(bundled.outputFiles[0].text,/sourceChanged/)
 assert.match(bundled.outputFiles[0].text,/expectedSourceRevision/)
 assert.match(bundled.outputFiles[0].text,/offsetPreview/)
 assert.match(bundled.outputFiles[0].text,/offsetRefusal/)
 assert.match(bundled.outputFiles[0].text,/data-facing-offset-preview/)
})
