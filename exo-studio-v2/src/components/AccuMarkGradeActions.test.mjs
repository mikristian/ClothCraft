import test from 'node:test'
import assert from 'node:assert/strict'
import {buildSync} from 'esbuild'
import {createRequire} from 'node:module'

const require=createRequire(import.meta.url)
const code=buildSync({entryPoints:['src/components/AccuMarkGradeActions.jsx'],bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',external:['react','react/jsx-runtime'],loader:{'.css':'empty'}}).outputFiles[0].text
const {Module}=require('node:module')
const moduleInstance=new Module('grade-actions-compiled.cjs')
moduleInstance.filename=import.meta.filename
moduleInstance.paths=Module._nodeModulePaths(process.cwd())
moduleInstance._compile(code,moduleInstance.filename)
const {copyIndustrialPointRule,pasteIndustrialPointRule,canPasteIndustrialPointRule}=moduleInstance.exports
const grading={sizes:['S','M','L'],baseSize:'M'}
const source={industrialGradeRule:{mode:'base-up-down-incremental',sizes:['S','M','L'],baseSize:'M',down:[{dx:-.4,dy:-.3}],up:[{dx:.8,dy:.2}]}}

test('clipboard deep copies independent asymmetric point size breaks',()=>{
 const before=structuredClone(source)
 const clipboard=copyIndustrialPointRule(source,grading)
 clipboard.down[0].dx=-.9
 assert.deepEqual(source,before)
 const pasted=pasteIndustrialPointRule(clipboard,grading)
 pasted.up[0].dy=9
 assert.equal(source.industrialGradeRule.up[0].dy,.2)
 assert.equal(clipboard.up[0].dy,.2)
 assert.equal(pasted.down[0].dx,-.9)
})

test('clipboard fails closed for stale size line, wrong base, and malformed break',()=>{
 const clipboard=copyIndustrialPointRule(source,grading)
 assert.throws(()=>pasteIndustrialPointRule(clipboard,{sizes:['S','M','L'],baseSize:'L'}),/different ordered size line or base/i)
 assert.throws(()=>pasteIndustrialPointRule(clipboard,{sizes:['XS','S','M','L'],baseSize:'M'}),/different ordered size line or base/i)
 assert.throws(()=>pasteIndustrialPointRule({...clipboard,up:[{dx:NaN,dy:1}]},grading),/finite numeric/i)
 assert.throws(()=>pasteIndustrialPointRule({...clipboard,down:[]},grading),/down length/i)
})

test('paste eligibility is scoped to the same piece and current valid size run',()=>{
 const clipboard=copyIndustrialPointRule(source,grading)
 assert.equal(canPasteIndustrialPointRule(clipboard,grading,'front','front'),true)
 assert.equal(canPasteIndustrialPointRule(clipboard,grading,'front','back'),false)
 assert.equal(canPasteIndustrialPointRule(clipboard,{sizes:['XS','S','M','L'],baseSize:'M'},'front','front'),false)
 assert.equal(canPasteIndustrialPointRule({...clipboard,up:[]},grading,'front','front'),false)
 assert.equal(canPasteIndustrialPointRule(clipboard,grading,null,'front'),false)
})

test('clipboard rejects finite individual increments whose cumulative total overflows',()=>{
 const huge={industrialGradeRule:{mode:'small-large-incremental',sizes:['S','M','L','XL'],baseSize:'S',steps:[{dx:1e308,dy:0},{dx:1e308,dy:0},{dx:1e308,dy:0}]}}
 const run={sizes:['S','M','L','XL'],baseSize:'S'}
 assert.throws(()=>copyIndustrialPointRule(huge,run),/finite numeric range/)
 assert.equal(canPasteIndustrialPointRule(huge.industrialGradeRule,run,'front','front'),false)
 assert.throws(()=>pasteIndustrialPointRule(huge.industrialGradeRule,run),/finite numeric range/)
})

test('clipboard rejects padded size names and overlong garment size runs',()=>{
 const clipboard=copyIndustrialPointRule(source,grading)
 assert.throws(()=>pasteIndustrialPointRule(clipboard,{sizes:[' S','M','L'],baseSize:'M'}),/valid garment size run/)
 const names=Array.from({length:65},(_,index)=>`SIZE${index}`)
 const huge={mode:'small-large-incremental',sizes:names,baseSize:names[0],steps:Array.from({length:64},()=>({dx:0,dy:0}))}
 assert.throws(()=>pasteIndustrialPointRule(huge,{sizes:names,baseSize:names[0]}),/valid garment size run/)
})
