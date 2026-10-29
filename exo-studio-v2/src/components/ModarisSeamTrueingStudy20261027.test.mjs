import test from 'node:test'
import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {createRequire} from 'node:module'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {previewModarisSeamTrueing20261027} from '../core/modarisSeamTrueing20261027.js'
const require=createRequire(import.meta.url)
const result=await build({entryPoints:['src/components/ModarisSeamTrueingStudy20261027.jsx'],bundle:true,write:false,format:'cjs',platform:'node',packages:'external',loader:{'.jsx':'jsx'}})
const module={exports:{}}
new Function('module','exports','require',result.outputFiles[0].text)(module,module.exports,require)
const {default:Study,prepareModarisSeamTrueingApply20261027:prepare,modarisSeamTrueingPreflight20261027:preflight}=module.exports
const piece=(id,width)=>({id,name:id,points:[{x:0,y:0},{x:width,y:0},{x:width,y:5},{x:0,y:5}],edgeNames:['waist','side','hem','fold']})
const project=()=>({revision:8,units:'cm',pieces:[piece('front',12),piece('back',10)]})
const selected={sourcePieceId:'front',targetPieceId:'back',sourceEdge:0,targetEdge:0,easeCm:0,onApplyProject:()=>{}}
const preview=p=>previewModarisSeamTrueing20261027(p,{source:{pieceId:'front',edgeIndex:0},target:{pieceId:'back',edgeIndex:0},expectedRevision:8})
test('JSX exposes guarded selectors, length labels and explicit apply confirmation',()=>{
 const p=project(),copy=structuredClone(p),html=renderToStaticMarkup(React.createElement(Study,{project:p,onApplyProject:()=>{}}))
 assert.deepEqual(p,copy)
 for(const term of ['Modaris seam trueing study','Trueing source piece','Trueing target piece','Trueing source edge','Trueing target edge','Trueing ease cm','Inspect and preview seam correction','Confirm and apply reviewed seam correction','front','back'])assert(html.includes(term),term)
 assert.match(html,/data-production-approved="false"/)
 assert.match(html,/disabled=""[^>]*>Confirm and apply reviewed seam correction/)
})
test('native mode and missing callback fail closed',()=>{
 assert.match(preflight(project(),{...selected,nativeMode:true}),/Native mode/)
 assert.match(preflight(project(),{...selected,onApplyProject:undefined}),/callback/)
 assert.equal(preflight(project(),selected),'')
 const html=renderToStaticMarkup(React.createElement(Study,{project:project(),nativeMode:true}))
 assert.match(html,/Native mode is unsupported/)
})
test('validated core revision +1 preview becomes single increment through normal App mutation',()=>{
 const p=project(),prior=JSON.stringify(p),result=preview(p)
 assert.equal(result.candidate.revision,9)
 const outgoing=prepare(p,result,JSON.stringify(p))
 assert.equal(outgoing.revision,8)
 assert.equal(outgoing.pieces[1].points[1].x,12)
 const ordinaryApp=structuredClone(outgoing);ordinaryApp.revision+=1
 assert.equal(ordinaryApp.revision,9)
 assert.equal(JSON.stringify(p),prior)
 assert.throws(()=>prepare({...p,revision:9},result,JSON.stringify(p)),/Stale/)
 const forged=structuredClone(result);forged.candidate.pieces[1].points[1].x=13
 assert.throws(()=>prepare(p,forged,JSON.stringify(p)),/Preview geometry/)
})
test('unsupported attachments and stale revision fail preflight',()=>{
 const p=project();p.seams=[]
 assert.match(preflight(p,selected),/unsupported/)
 assert.match(preflight(project(),{...selected,easeCm:22}),/Ease/)
})
