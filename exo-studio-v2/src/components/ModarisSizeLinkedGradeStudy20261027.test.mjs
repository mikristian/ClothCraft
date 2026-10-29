import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { buildSync } from 'esbuild'

const require=createRequire(import.meta.url)
const {Module}=require('node:module')
const output=buildSync({entryPoints:['src/components/ModarisSizeLinkedGradeStudy20261027.jsx'],bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',external:['react','react/jsx-runtime']}).outputFiles[0].text
const compiled=new Module('modaris-linked-grade-study.cjs')
compiled.filename=import.meta.filename
compiled.paths=Module._nodeModulePaths(process.cwd())
compiled._compile(output,compiled.filename)
const {default:Panel,modarisSizeLinkedGradeStudyPreflight,prepareModarisSizeLinkedGradeStudy}=compiled.exports
const React=require('react')
const {renderToStaticMarkup}=require('react-dom/server')
const rule=()=>({mode:'small-large-incremental',sizes:['S','M','L'],baseSize:'M',steps:[{dx:1,dy:2},{dx:1,dy:2}]})
const project=()=>({units:'cm',grading:{sizes:['S','M','L'],baseSize:'M'},pieces:['front','back'].map(id=>({id,points:[[0,0],[10,0],[10,10],[0,10]].map(([x,y],index)=>({id:`p${index}`,x,y,industrialGradeRule:rule()})),curves:{0:{cx:5,cy:-2}},edgeNames:['neck','side','hem','fold']}))})

test('JSX renders explicit source and target controls, dry-run and initially guarded commit',()=>{
  const html=renderToStaticMarkup(React.createElement(Panel,{project:project(),onApplyProject:()=>{}}))
  assert.match(html,/Source grading point/)
  assert.match(html,/Target grading point/)
  assert.match(html,/Dry-run all grading sizes/)
  assert.match(html,/Apply validated grading project/)
  assert.match(html,/factory approval/)
  assert.match(html,/disabled=""/)
})

test('preflight rejects native mode, missing commit callback, invalid sizes and non-centimeter geometry',()=>{
  assert.match(modarisSizeLinkedGradeStudyPreflight(project(),{nativeMode:true,onApplyProject:()=>{}}),/Native/)
  assert.match(modarisSizeLinkedGradeStudyPreflight(project()),/callback/)
  const stale=project();stale.grading.sizes=['M','M'];assert.match(modarisSizeLinkedGradeStudyPreflight(stale,{onApplyProject:()=>{}}),/size/)
  const inches=project();inches.units='in';assert.match(modarisSizeLinkedGradeStudyPreflight(inches,{onApplyProject:()=>{}}),/centimetre/)
})

test('dry-run helper generates complete size diagnostics and leaves project untouched; invalid graphs refuse',()=>{
  const base=project(),before=structuredClone(base)
  const links=[{source:{pieceId:'front',pointIndex:0},target:{pieceId:'back',pointIndex:0},curves:true}]
  const result=prepareModarisSizeLinkedGradeStudy(base,links)
  assert.deepEqual(base,before)
  assert.deepEqual(result.diagnostics.map(d=>d.size),['S','M','L'])
  assert.deepEqual(result.diagnostics[2].pieces.map(p=>p.pointCount),[4,4])
  assert.equal(result.validation.manufacturingApproved,false)
  assert.equal(prepareModarisSizeLinkedGradeStudy(result.project,[]).validation.links,1)
  assert.throws(()=>prepareModarisSizeLinkedGradeStudy(base,[...links,{source:links[0].target,target:links[0].source}]),/cycle/)
})
