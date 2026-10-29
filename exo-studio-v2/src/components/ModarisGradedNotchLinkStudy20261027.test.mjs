import test from 'node:test'
import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {createRequire} from 'node:module'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {createModarisGradedNotchLink20261027 as create} from '../core/modarisGradedNotchLink20261027.js'
const compiled=await build({entryPoints:['src/components/ModarisGradedNotchLinkStudy20261027.jsx'],bundle:true,
  write:false,platform:'node',format:'cjs',packages:'external',loader:{'.jsx':'jsx'}})
const module={exports:{}}
new Function('module','exports','require',compiled.outputFiles[0].text)(module,module.exports,createRequire(import.meta.url))
const {default:Study,modarisGradedNotchLinkPreflight20261027:preflight,
  prepareModarisGradedNotchLinkStudy20261027:prepare,
  prepareModarisGradedNotchCommit20261027:commit}=module.exports
const panel=(id,x,t)=>({id,name:id,points:[{x,y:0},{x:x+10,y:0},{x:x+10,y:8},{x,y:8}],
  edgeNames:['top','side','hem','fold'],notches:[{id:'n',edgeIndex:0,t}]})
const project=()=>({revision:4,units:'cm',grading:{sizes:['S','M','L'],baseSize:'M',widthPerSizeCm:1,lengthPerSizeCm:.5},
  pieces:[panel('front',0,.32),panel('back',25,.77)]})
const refs={source:{pieceId:'front',notchId:'n'},target:{pieceId:'back',notchId:'n'}}

test('graded notch tool has guarded controls and preflight rejects native mode',()=>{
  const p=project(),saved=structuredClone(p)
  const html=renderToStaticMarkup(React.createElement(Study,{project:p,onApplyProject:()=>{}}))
  assert.match(html,/Source-linked graded notches/)
  assert.match(html,/Linked notch source/)
  assert.match(html,/Linked notch target/)
  assert.match(html,/Preview verified linked notch sizes/)
  assert.match(html,/Apply verified graded notch link/)
  assert.equal(preflight(p,{onApplyProject:()=>{}}),'')
  assert.match(preflight(p,{onApplyProject:()=>{},nativeMode:true}),/Native Rust/)
  assert.match(preflight(p,{}),/callback/)
  assert.deepEqual(p,saved)
})

test('verified graph creation is one exact Undo revision through normal App and stable all-size fractions',()=>{
  const p=project(),src=JSON.stringify(p)
  const outcome=prepare(p,refs)
  assert.equal(outcome.project.revision,p.revision+1)
  assert.equal(outcome.project.pieces[1].notches[0].t,.32)
  assert(outcome.proof.every(x=>x.fractionResidual===0&&x.precisionCm===0))
  const forApp=commit(p,outcome,src,refs)
  assert.equal(forApp.revision,p.revision)
  assert.equal(forApp.modarisGradedNotchLink.appliedRevision,p.revision+1)
  assert.equal(forApp.pieces[1].notches[0].t,.32)
  assert.equal(JSON.stringify(p),src)
  assert.throws(()=>commit({...p,revision:5},outcome,src,refs),/Stale/)
  const forged=structuredClone(outcome);forged.project.pieces[1].notches[0].t=.8
  assert.throws(()=>commit(p,forged,src,refs),/changed/)
})

test('reapply source fractional change propagates validated all-size notch stations',()=>{
  const first=create(project(),{...refs,expectedRevision:4}).project
  const sourceBefore=JSON.stringify(first)
  const outcome=prepare(first,{newSourceFraction:.63})
  assert.equal(outcome.project.revision,first.revision+1)
  assert.equal(outcome.project.pieces[1].notches[0].t,.63)
  const forApp=commit(first,outcome,sourceBefore,{newSourceFraction:.63})
  assert.equal(forApp.revision,first.revision)
  assert.equal(forApp.modarisGradedNotchLink.lastSourceFraction,.63)
  assert.equal(outcome.proof.length,3)
  assert.deepEqual(first,JSON.parse(sourceBefore))
  assert.throws(()=>prepare(first,{newSourceFraction:0}),/strictly between/)
})
