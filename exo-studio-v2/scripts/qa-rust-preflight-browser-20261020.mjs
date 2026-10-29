// Source Vite browser acceptance. Fixtures only; no project or garment writes.
import assert from 'node:assert/strict'
import {chromium} from '../../music-empire-game/node_modules/playwright-core/index.mjs'

const source=process.env.EXO_SOURCE_URL||'http://127.0.0.1:5297/'
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try{
  const page=await browser.newPage()
  await page.goto(source,{waitUntil:'domcontentloaded'})
  const result=await page.evaluate(async()=>{
    const numeric=await import('/src/core/rustPreflightKernel.js')
    const crossing=await import('/src/core/rustPreflightCrossingKernel.js')
    const production=await import('/src/core/productionPreflight.js')
    const loadedNumeric=await numeric.initializeRustPreflightKernel()
    const loadedCrossing=await crossing.initializeRustPreflightCrossingKernel()
    const template={
      pieces:[{id:'cross',name:'Cross',fabricId:'missing',points:[{x:0,y:0},{x:10,y:10},{x:0,y:10},{x:10,y:0}],notches:[{edgeIndex:8,t:1.1}]}],
      fabrics:{main:{}},seams:[],grading:{baseSize:'M',sizes:['M']},
    }
    const report=production.inspectProduction(template,{allSizes:false})
    const issueCodes=report.issues.map(issue=>issue.code)
    const crossingDirect=production.hasCrossingSampled(template.pieces[0].points)
    const numericCheck=numeric.preflightCheck(1,100)
    return {loadedNumeric,loadedCrossing,numericReady:numeric.rustPreflightKernelReady(),crossingReady:crossing.rustPreflightCrossingReady(),numericCheck,crossingDirect,report,issueCodes}
  })
  assert.equal(result.loadedNumeric,true)
  assert.equal(result.loadedCrossing,true)
  assert.equal(result.numericReady,true)
  assert.equal(result.crossingReady,true)
  assert.equal(result.numericCheck,false)
  assert.equal(result.crossingDirect,true)
  assert.deepEqual(result.issueCodes,['MISSING_FABRIC','ZERO_AREA','SELF_INTERSECTION','NOTCH_INVALID'])
  assert.equal(result.report.status,'BLOCKED')
  assert.equal(result.report.blockers,3)
  assert.equal(result.report.warnings,1)
  assert.equal(result.report.factoryCertified,false)
  assert.deepEqual(result.report.sizes,['M'])
  assert.deepEqual(result.report.markerSummary,[])
  console.log(JSON.stringify({pass:true,source,loadedNumeric:result.loadedNumeric,loadedCrossing:result.loadedCrossing,issueCodes:result.issueCodes,status:result.report.status,blockers:result.report.blockers,warnings:result.report.warnings}))
}finally{await browser.close()}
