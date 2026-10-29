import test from 'node:test'
import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {createRequire} from 'node:module'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'

const compiled=await build({entryPoints:['src/components/ModarisGradedCurvedNotchStudy20261027.jsx'],bundle:true,write:false,platform:'node',format:'cjs',packages:'external',loader:{'.jsx':'jsx'}})
const module={exports:{}}
new Function('module','exports','require',compiled.outputFiles[0].text)(module,module.exports,createRequire(import.meta.url))
const {default:Study,modarisGradedCurvedNotchPreflight20261027:preflight,prepareModarisGradedCurvedNotchStudy20261027:prepare,prepareModarisGradedCurvedNotchCommit20261027:commit}=module.exports
const piece=(id,x,t,cy)=>({id,points:[{x,y:0},{x:x+10,y:0},{x:x+10,y:8},{x,y:8}],edgeNames:['top','side','hem','fold'],curves:{0:{cx:x+3,cy}},notches:[{id:'n',edgeIndex:0,t}]})
const project=()=>({revision:12,units:'cm',grading:{sizes:['S','M','L'],baseSize:'M',widthPerSizeCm:0,lengthPerSizeCm:0},pieces:[piece('front',0,.37,3),piece('back',30,.8,5)]})
const refs={source:{pieceId:'front',notchId:'n'},target:{pieceId:'back',notchId:'n'}}

test('SSR renders controlled quadratic notch selectors and explicit nonmanufacturing scope',()=>{
 const p=project(),original=structuredClone(p)
 const html=renderToStaticMarkup(React.createElement(Study,{project:p,onApplyProject:()=>{}}))
 assert.match(html,/Curved notch source/)
 assert.match(html,/Curved notch target/)
 assert.match(html,/Stage physical graded notch diagnostics/)
 assert.match(html,/Confirm and apply graded curved notch/)
 assert.match(html,/no manufacturing approval/i)
 assert.match(html,/data-manufacturing-approved="false"/)
 assert.deepEqual(p,original)
})

test('staged physical size proof and App adapter conserve one revision and reject forged preview',()=>{
 const p=project(),fingerprint=JSON.stringify(p)
 const preview=prepare(p,refs)
 assert.equal(preview.project.revision,13)
 assert.equal(preview.proof.length,3)
 assert.ok(preview.proof.every(d=>d.residualCm<1e-7&&Math.abs(d.requiredTargetT-preview.project.pieces[1].notches[0].t)<1e-8))
 const submitted=commit(p,preview,fingerprint,refs)
 assert.equal(submitted.revision,12)
 assert.deepEqual(submitted.pieces[0],p.pieces[0])
 assert.deepEqual(p,JSON.parse(fingerprint))
 assert.throws(()=>commit({...p,revision:13},preview,fingerprint,refs),/STALE/)
 const tampered=structuredClone(preview);tampered.project.pieces[1].notches[0].t=.2
 assert.throws(()=>commit(p,tampered,fingerprint,refs),/CHANGED/)
})

test('varying graded geometry refuses a single legacy target t with explicit per-size explanation',()=>{
 const p=project();p.grading.widthPerSizeCm=2;p.grading.lengthPerSizeCm=1
 assert.throws(()=>prepare(p,refs),/REQUIRES_PER_SIZE_NOTCH_MAP/)
})

test('fail closed on sewing, invalid quadratic and absent apply callback',()=>{
 const sewn=project();sewn.seams=[{id:'sewn'}]
 assert.match(preflight(sewn,{onApplyProject:()=>{}}),/Sewn/)
 const bad=project();bad.pieces[1].curves[0].cy=Infinity
 assert.throws(()=>prepare(bad,refs),/UNSAFE_INPUT/)
 assert.match(preflight(project(),{nativeMode:true,onApplyProject:()=>{}}),/Native Rust/)
 assert.match(preflight(project(),{}),/callback/)
 const html=renderToStaticMarkup(React.createElement(Study,{project:sewn,onApplyProject:()=>{}}))
 assert.match(html,/disabled=""/)
})
