import test from 'node:test'
import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {createRequire} from 'node:module'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {previewModarisCurvedSeamTrueing20261027 as solve} from '../core/modarisCurvedSeamTrueing20261027.js'

const require=createRequire(import.meta.url)
const bundle=await build({entryPoints:['src/components/ModarisCurvedSeamTrueingStudy20261027.jsx'],bundle:true,write:false,format:'cjs',platform:'node',packages:'external',loader:{'.jsx':'jsx'}})
const mod={exports:{}}
new Function('module','exports','require',bundle.outputFiles[0].text)(mod,mod.exports,require)
const {default:Study,modarisCurvedSeamPreflight20261027:preflight,prepareModarisCurvedSeamTrueingApply20261027:prepare}=mod.exports
const piece=(id,x,cy)=>({id,points:[{x,y:0},{x:x+10,y:0},{x:x+10,y:10},{x,y:10}],curves:{0:{cx:x+5,cy}},edgeNames:['waist','side','hem','back']})
const project=()=>({revision:21,units:'cm',pieces:[piece('front',0,-3),piece('back',20,-2.7)]})
const selection={sourcePieceId:'front',targetPieceId:'back',sourceEdge:0,targetEdge:0,easeCm:0,onApplyProject:()=>{}}
const preview=p=>solve(p,{source:{pieceId:'front',edgeIndex:0},target:{pieceId:'back',edgeIndex:0},expectedRevision:21})

test('renders curve selectors, signed ease and guarded explicit confirm',()=>{
 const p=project(),before=structuredClone(p),html=renderToStaticMarkup(React.createElement(Study,{project:p,onApplyProject:()=>{}}))
 assert.deepEqual(p,before)
 for(const text of ['Curved source piece','Curved target piece','Curved source edge','Curved target edge','Curved signed ease cm','Stage curved seam preview','Confirm and apply curved seam correction','data-production-approved="false"'])assert.ok(html.includes(text),text)
 assert.match(html,/disabled=""[^>]*>Confirm and apply curved seam correction/)
})
test('preflight detects unapproved native, sewn, graded, notched and cutline cases',()=>{
 assert.equal(preflight(project(),selection),'')
 assert.match(preflight(project(),{...selection,nativeMode:true}),/Native/)
 assert.match(preflight(project(),{...selection,onApplyProject:undefined}),/callback/)
 for(const field of ['seams','grading','cutlines','notches']){const p=project();p[field]=[];assert.match(preflight(p,selection),/unsupported/i)}
 const p=project();p.pieces[1].notches=[{edgeIndex:0,t:0.4}]
 assert.match(preflight(p,selection),/UNSUPPORTED_PIECE_ATTACHMENT/)
})
test('reverified +1 solver preview enters normal App path with exactly one revision increment',()=>{
 const p=project(),before=JSON.stringify(p),candidate=preview(p)
 assert.equal(candidate.candidateRevision,22)
 const outgoing=prepare(p,candidate,before)
 assert.equal(outgoing.revision,21)
 assert.deepEqual(outgoing.pieces[0],p.pieces[0])
 assert.notDeepEqual(outgoing.pieces[1].curves,p.pieces[1].curves)
 const appResult=structuredClone(outgoing);appResult.revision++
 assert.equal(appResult.revision,22)
 assert.equal(JSON.stringify(p),before)
 const stale=structuredClone(p);stale.pieces[1].curves[0].cy-=0.1
 assert.throws(()=>prepare(stale,candidate,before),/STALE_CURVED_PREVIEW/)
 const forged=structuredClone(candidate);forged.candidate.pieces[1].curves[0].cy-=0.1
 assert.throws(()=>prepare(p,forged,before),/CURVED_PREVIEW_MISMATCH/)
})
