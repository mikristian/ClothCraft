import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { transformWithEsbuild } from 'vite'

const source=fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)),'NativeSixSizeSewingAudit20261027.jsx'),'utf8')
async function component(){
  const transformed=await transformWithEsbuild(source,'NativeSixSizeSewingAudit20261027.jsx',{loader:'jsx',format:'esm',jsx:'automatic'})
  const code=transformed.code.replaceAll('from "react/jsx-runtime"',`from "${import.meta.resolve('react/jsx-runtime')}"`).replaceAll('from "react"',`from "${import.meta.resolve('react')}"`)
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
}
const sizes=['XS','S','M','L','XL','XXL']
const side=(panelId,edgeId,reversed=false)=>({panelId,edgeId,interval:[0,1],reversed,fullSewlineM:.4,sewnIntervalM:.4,cubicControlsM:null,freeCurvePointIds:[],notchPositionsM:[]})
const report={format:'exo-native-six-size-sewn-balance-audit.v1',sourceRevision:41,factoryApproved:false,joinedCurveMutation:false,easeReviewRequired:false,sizes:sizes.map(size=>({size,seams:[{seamId:'joined_front_back',a:side('front','e1'),b:side('back','e3',true),allowEase:false,mismatchM:0,notchIntervalLengthsM:[[.4,.4]],requiresEaseReview:false}]}))}
const snapshot={revision:41,gradeRunPersisted:true,template:{seams:[{id:'joined_front_back'}]}}

test('renders real native sewing acceptance trigger and explicit manufacturing limits',async()=>{
  const {default:Panel}=await component()
  const html=renderToStaticMarkup(React.createElement(Panel,{snapshot,onAudit:async()=>report}))
  assert.match(html,/Saved six-size sewn geometry/)
  assert.match(html,/Audit six-size sewn balance/)
  assert.match(html,/Factory approval: none/)
  assert.match(html,/Joined curved seam regeneration: unsupported/)
  assert.doesNotMatch(html,/No length or notch mismatch detected/)
})

test('requires exact XS–XXL sewing identity, numerical evidence and no manufacturing claims',async()=>{
  const {validateNativeSixSizeSewingAudit20261027:check}=await component()
  assert.equal(check(report,41),true)
  assert.equal(check({...report,sourceRevision:40},41),false)
  assert.equal(check({...report,factoryApproved:true},41),false)
  assert.equal(check({...report,joinedCurveMutation:true},41),false)
  assert.equal(check({...report,sizes:report.sizes.slice(1)},41),false)
  assert.equal(check({...report,sizes:report.sizes.map((v,i)=>i===5?{...v,size:'M'}:v)},41),false)
  assert.equal(check({...report,sizes:report.sizes.map((v,i)=>i===2?{...v,seams:[]} :v)},41),false)
  assert.equal(check({...report,sizes:report.sizes.map((v,i)=>i===4?{...v,seams:[{...v.seams[0],mismatchM:NaN}]} :v)},41),false)
  assert.equal(check({...report,sizes:report.sizes.map((v,i)=>i===4?{...v,seams:[{...v.seams[0],mismatchM:.004}]} :v)},41),false)
  const eased={...report,easeReviewRequired:true,sizes:report.sizes.map(v=>({...v,seams:v.seams.map(s=>({...s,allowEase:true,requiresEaseReview:true,mismatchM:.004,
    b:{...s.b,fullSewlineM:.396,sewnIntervalM:.396},notchIntervalLengthsM:[[.4,.396]]}))}))}
  assert.equal(check(eased,41),true)
  assert.equal(check({...eased,easeReviewRequired:false},41),false)
})

test('missing catalog, missing sewing, active size and busy operator controls block request',async()=>{
  const {default:Panel}=await component()
  const render=(v,disabled=false)=>renderToStaticMarkup(React.createElement(Panel,{snapshot:v,disabled,onAudit:async()=>report}))
  assert.match(render({...snapshot,gradeRunPersisted:false}),/Save an actual native six-size grade catalog/)
  assert.match(render({...snapshot,activeGradedSize:'S'}),/Restore the base garment/)
  assert.match(render({...snapshot,template:{seams:[]}}),/Author actual native sewing relationships/)
  assert.match(render(snapshot,true),/Native workspace is busy/)
  assert.match(render(undefined),/Current source revision required/)
  assert.doesNotMatch(source,/fetch\s*\(|factoryApproved:\s*true/)
})
