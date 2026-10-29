import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {transformWithEsbuild} from 'vite'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'

const source=fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)),'NativeSixSizeIndustrialAudit20261027.jsx'),'utf8')
async function load(){
  const transformed=await transformWithEsbuild(source,'NativeSixSizeIndustrialAudit20261027.jsx',{loader:'jsx',format:'esm',jsx:'automatic'})
  const code=transformed.code.replaceAll('from "react/jsx-runtime"',`from "${import.meta.resolve('react/jsx-runtime')}"`).replaceAll('from "react"',`from "${import.meta.resolve('react')}"`)
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
}
const sizes=['XS','S','M','L','XL','XXL']
const report={format:'exo-native-linked-industrial-six-size-proof.v1',sourceRevision:22,sourcePanelId:'front',
  manufacturerApproved:false,factoryApproved:false,pairedSewingVerified:false,
  sizes:sizes.map(size=>({size,panelId:'front',edges:['neck','side','hem','fold'].map(edgeId=>({
    edgeId,physicalSeamArclengthM:.4,allowanceM:.01,minAllowanceNormalAlignment:1,
    notches:edgeId==='neck'?[{fraction:.25,seamArclengthM:.1,depthM:.004,stitchPositionM:[.1,0],outwardNormal:[0,-1],markerEndM:[.1,-.004]}]:[],
  }))}))}
const snapshot={revision:22,gradeRunPersisted:true,template:{panels:[{id:'front',name:'Front bodice',polygon:{points:[[0,0],[.4,0],[.4,.4],[0,.4]],edges:['neck','side','hem','fold'],notches:{neck:[{t:.25,depth_m:.004}]},seam_allowances:{neck:.01}}}]}}

test('presents current native industrial panel chooser while keeping cutting explicitly uncertified',async()=>{
  const {default:Panel}=await load()
  const html=renderToStaticMarkup(React.createElement(Panel,{snapshot,onAudit:async()=>report}))
  assert.match(html,/Six-size native industrial geometry/)
  assert.match(html,/Front bodice/)
  assert.match(html,/Measure all six industrial patterns/)
  assert.match(html,/disabled=""/)
  assert.match(html,/Factory approval: none/)
  assert.match(html,/Paired sewing verification: none/)
})

test('accepts only complete six-size native evidence with exact identity and physical station vectors',async()=>{
  const {verifyNativeSixSizeIndustrialAuditPacket20261027:verify}=await load()
  assert.equal(verify(report,22,'front'),true)
  assert.equal(verify({...report,sourceRevision:21},22,'front'),false)
  assert.equal(verify({...report,manufacturerApproved:true},22,'front'),false)
  assert.equal(verify({...report,factoryApproved:true},22,'front'),false)
  assert.equal(verify({...report,sizes:report.sizes.slice(1)},22,'front'),false)
  assert.equal(verify({...report,sizes:report.sizes.map((row,i)=>i===5?{...row,size:'M'}:row)},22,'front'),false)
  assert.equal(verify({...report,sizes:report.sizes.map((row,i)=>i===3?{...row,edges:row.edges.slice(1)}:row)},22,'front'),false)
  assert.equal(verify({...report,sizes:report.sizes.map((row,i)=>i===0?{...row,edges:row.edges.map(e=>({...e,physicalSeamArclengthM:NaN}))}:row)},22,'front'),false)
  assert.equal(verify({...report,sizes:report.sizes.map((row,i)=>i===0?{...row,edges:row.edges.map(e=>({...e,minAllowanceNormalAlignment:.4}))}:row)},22,'front'),false)
  assert.equal(verify({...report,sizes:report.sizes.map((row,i)=>i===0?{...row,edges:row.edges.map(e=>({...e,notches:[{fraction:.5,seamArclengthM:.2,depthM:.004,stitchPositionM:[NaN,0],outwardNormal:[0,-1],markerEndM:[.2,-.004]}]}))}:row)},22,'front'),false)
})

test('blocks unavailable current native catalog, active grade and disabled operations',async()=>{
  const {default:Panel}=await load()
  const render=value=>renderToStaticMarkup(React.createElement(Panel,{snapshot:value,onAudit:async()=>report}))
  assert.match(render({...snapshot,gradeRunPersisted:false}),/Save all six native graded sizes first/)
  assert.match(render({...snapshot,activeGradedSize:'XL'}),/Restore the base size/)
  assert.match(render({...snapshot,template:{panels:[]}}),/No authored native notches or seam allowances/)
  assert.match(render({...snapshot,revision:null}),/A native source revision is required/)
  assert.match(renderToStaticMarkup(React.createElement(Panel,{snapshot,disabled:true})),/Native workspace is busy/)
  assert.doesNotMatch(source,/manufacturerApproved:\s*true|fetch\s*\(|cuttingAuthorized:\s*true/)
})
