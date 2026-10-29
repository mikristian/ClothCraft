// RUST-026 isolated real Chrome source acceptance. Never writes authored files.
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const url=process.env.EXO_SOURCE_URL||'http://127.0.0.1:5297/'
const browser=await chromium.launch({headless:true,
  executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try {
  const page=await browser.newPage()
  await page.goto(url,{waitUntil:'domcontentloaded'})
  const report=await page.evaluate(async()=>{
    const gate=await import('/src/core/physics/qualityGate.js')
    const kernel=await import('/src/core/rustFitTelemetryKernel.js')
    const loaded=await kernel.initializeRustFitTelemetryKernel()
    const cases=[
      [{},{}],
      [{structural:{maxStrainPercent:0},sewing:{maxGapMm:0},collision:{triangleCcdVerified:true,allFrameIntersectionFree:true,maximumIntrusionMm:0}},{}],
      [{structural:{maxStrainPercent:16},sewing:{maxGapMm:6},collision:{maximumIntrusionMm:2}},{}],
      [{structural:{maxStrainPercent:15},sewing:{maxGapMm:5},collision:{triangleCcdVerified:true,allFrameIntersectionFree:true,maximumIntrusionMm:.5}},{}],
      [{structural:{maxStrainPercent:NaN},sewing:{maxGapMm:Infinity},collision:{triangleCcdVerified:1,allFrameIntersectionFree:true,maximumIntrusionMm:null}},{}],
      [{structural:{maxStrainPercent:null},sewing:{maxGapMm:'6'},collision:{triangleCcdVerified:true,allFrameIntersectionFree:true,maximumIntrusionMm:'bad'}},{}],
      [{structural:{maxStrainPercent:18},sewing:{maxGapMm:6},collision:{maximumIntrusionMm:2}},
        {maximumStructuralStrainPercent:25,maximumSeamGapMm:7,maximumPenetrationMm:3}],
      [{structural:{maxStrainPercent:Infinity},sewing:{maxGapMm:-Infinity},collision:{maximumIntrusionMm:NaN}},
        {maximumStructuralStrainPercent:NaN,maximumSeamGapMm:Infinity,maximumPenetrationMm:-Infinity}],
    ]
    let seed=0x26025
    const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296)
    for(let i=0;i<180;i++)cases.push([{
      structural:{maxStrainPercent:(random()-.2)*30},
      sewing:{maxGapMm:(random()-.2)*10},
      collision:{triangleCcdVerified:random()>.4,allFrameIntersectionFree:random()>.4,maximumIntrusionMm:(random()-.3)*3}
    },{maximumStructuralStrainPercent:5+random()*20,maximumSeamGapMm:1+random()*8,maximumPenetrationMm:random()}])
    const before=cases.map(c=>JSON.stringify(c))
    const results=cases.map(([quality,options])=>gate.assessSimulationFit(quality,options))
    return {loaded,status:kernel.rustFitTelemetryStatus(),results,
      unchanged:cases.every((c,i)=>JSON.stringify(c)===before[i])}
  })
  assert.equal(report.loaded,true,JSON.stringify(report.status))
  assert.equal(report.status.backend,'rust-wasm')
  assert.equal(report.results.length,188)
  assert.equal(report.unchanged,true)
  assert.deepEqual(report.results[0],{
    status:'UNVERIFIED',factoryApproved:false,failures:[],
    unknown:['structural-strain-not-measured','seam-gap-not-measured',
      'triangle-ccd-and-entire-trajectory-not-certified','avatar-intrusion-not-measured'],
    limits:{maximumStructuralStrainPercent:15,maximumSeamGapMm:5,maximumPenetrationMm:.5}})
  assert.equal(report.results[1].status,'MEASURED_PASS')
  assert.equal(report.results[2].status,'FAILED')
  assert.deepEqual(report.results[2].failures,[
    'excessive-structural-strain','open-sewing-seams','avatar-surface-penetration'])
  assert.deepEqual(report.results[2].unknown,['triangle-ccd-and-entire-trajectory-not-certified'])
  assert.equal(report.results[3].status,'MEASURED_PASS')
  for(const row of report.results)assert.equal(row.factoryApproved,false)
  console.log(JSON.stringify({pass:true,url,backend:report.status.backend,
    fixtures:report.results.length,exactIssueOrder:true,factoryApprovedAlwaysFalse:true,authoredMutation:false}))
} finally {await browser.close()}
