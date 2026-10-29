import test from 'node:test'
import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {createRequire} from 'node:module'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'

const built=await build({entryPoints:['src/components/ModarisNativePerSizeChartStudio20261027.jsx'],bundle:true,write:false,platform:'node',format:'cjs',packages:'external',loader:{'.jsx':'jsx'}})
const mod={exports:{}}
new Function('module','exports','require',built.outputFiles[0].text)(mod,mod.exports,createRequire(import.meta.url))
const {default:Studio,nativePerSizeChartPreflight20261027:preflight}=mod.exports
const snapshot={revision:19,template:{id:'real-source',panels:[]}}
const project={template:{fabrics:[{id:'cotton_42',name:'Cotton 42'}]},native_point_bindings:{measurements:{halfWidth:{valueMm:200},width:{formula:'halfWidth * 2'}}},grade_run:{baseSize:'M',gradedTemplates:Array.from({length:6},()=>({})),pomSpecs:[{id:'width_pom',label:'Measured width'}]}}

test('preflight requires real native saved project, revision and all six grade templates',()=>{
  assert.equal(preflight(snapshot,project),'')
  assert.match(preflight(snapshot,null),/save.project/)
  assert.match(preflight(null,project),/revisioned/)
  assert.match(preflight(snapshot,{...project,grade_run:{gradedTemplates:[{}]}}),/six-size/)
  assert.match(preflight(snapshot,project,true),/busy/)
})

test('rendered native controls expose six direct cells, 24 measurement bounds, saved fabric and optional physical limits',()=>{
  const before=structuredClone(project)
  const markup=renderToStaticMarkup(React.createElement(Studio,{snapshot,project,onStoreEnvelope:()=>{},onInspectEnvelope:()=>{},onRegenerate:()=>{}}))
  for(const size of ['XS','S','M','L','XL','XXL']){
    assert.match(markup,new RegExp(`halfWidth ${size} direct millimetres`))
    assert.match(markup,new RegExp(`width ${size} min millimetres`))
    assert.match(markup,new RegExp(`width ${size} max millimetres`))
  }
  assert.equal((markup.match(/halfWidth [A-Z]+ direct millimetres/g)||[]).length,6)
  assert.match(markup,/cotton_42/)
  assert.match(markup,/Required bounds for saved native physical POM/)
  assert.match(markup,/Formula: halfWidth \* 2/)
  assert.match(markup,/Validate six-size native chart packet/)
  assert.match(markup,/Regenerate all six sizes through Rust/)
  assert.doesNotMatch(markup,/localStorage/)
  assert.deepEqual(project,before)
})
