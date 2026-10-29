// Source Chrome production imports, isolated in-memory fixtures only.
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const source=process.env.EXO_SOURCE_URL||'http://127.0.0.1:5297/'
const browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try{
  const page=await browser.newPage()
  await page.goto(source,{waitUntil:'domcontentloaded'})
  const result=await page.evaluate(async()=>{
    const kernel=await import('/src/core/rustInterchangeMathKernel.js')
    const gcode=await import('/src/core/garmentCode.js')
    const seamly=await import('/src/core/seamlyMeasurements.js')
    const templates=await import('/src/data/templates.js')
    const loaded=await kernel.initializeRustInterchangeMathKernel()
    const sourceProject=templates.createTemplateProject('tee')
    const original=JSON.stringify(sourceProject)
    const encoded=gcode.projectToGarmentCode(sourceProject)
    const restored=gcode.garmentCodeToProject(encoded,sourceProject)
    const smms='<smms><unit>in</unit><body-measurements><m name="height" base="70" size_increase="-0.5" height_increase="0.25"/></body-measurements></smms>'
    const measured=seamly.parseSeamlyMeasurements(smms)
    let securityError=''
    try{seamly.parseSeamlyMeasurements('<!DOCTYPE external><smis><unit>cm</unit></smis>')}
    catch(error){securityError=error.message}
    return {loaded,status:kernel.rustInterchangeMathStatus(),
      panels:Object.keys(encoded.pattern.panels).length,seams:encoded.pattern.stitches.length,
      restoredPieces:restored.pieces.length,restoredSeams:restored.seams.length,
      sourceUnchanged:JSON.stringify(sourceProject)===original,
      seamsPreserved:restored.seams.length===sourceProject.seams.length,
      measurement:measured.measurements.height,securityError}
  })
  assert.equal(result.loaded,true)
  assert.equal(result.status.backend,'rust-wasm')
  assert.equal(result.status.abiVersion,1)
  assert.ok(result.panels>0&&result.seams>0)
  assert.equal(result.panels,result.restoredPieces)
  assert.equal(result.seams,result.restoredSeams)
  assert.equal(result.sourceUnchanged,true)
  assert.equal(result.seamsPreserved,true)
  assert.equal(result.measurement.baseCm,177.8)
  assert.equal(result.measurement.sizeIncrementCm,-1.27)
  assert.equal(result.measurement.heightIncrementCm,.635)
  assert.equal(result.securityError,'XML document types and entities are not allowed')
  console.log(JSON.stringify({pass:true,source,backend:result.status.backend,
    abi:result.status.abiVersion,productionPaths:['garmentCode','seamlyMeasurements'],
    panels:result.panels,seams:result.seams,securityErrorPreserved:true,garmentWrites:0}))
}finally{await browser.close()}
