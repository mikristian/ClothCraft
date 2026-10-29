import assert from 'node:assert/strict'
import { chromium } from '../../music-empire-game/node_modules/playwright-core/index.mjs'

// Isolated in the browser's ephemeral profile and EXO's testSession=tee.
const URL = 'http://127.0.0.1:5188/?desktop=1&testSession=tee'
const KEY = 'garment-studio-tee-first-fit-project-v2'
const browser = await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
try {
  const page = await browser.newPage({viewport:{width:1650,height:1000}})
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(URL,{waitUntil:'domcontentloaded'})
  await page.locator('.pattern-piece[data-piece-id="front"]').waitFor({state:'visible',timeout:20000})
  await page.waitForFunction(key=>Boolean(localStorage.getItem(key)),KEY)
  const read=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY)
  const front=page.locator('.pattern-piece[data-piece-id="front"]')

  // Existing T-shirt fixture: every selected edge must expose its real length.
  await page.getByRole('button',{name:'Edit Pattern Points',exact:true}).first().click()
  await front.locator('.pattern-node').first().click({force:true})
  let existing=(await read()).pieces.find(p=>p.id==='front')
  assert.equal(await front.locator('.edge-measure').count(),existing.points.length,
    'Every cutline edge needs an independent measurement readout')

  // Numeric point editing should preserve opaque per-vertex grading/source data.
  await page.evaluate(key=>{
    const project=JSON.parse(localStorage.getItem(key))
    project.pieces.find(p=>p.id==='front').points[0].qaPointTag='persist-after-xy-edit'
    localStorage.setItem(key,JSON.stringify(project))
  },KEY)
  await page.reload({waitUntil:'domcontentloaded'})
  await front.waitFor({state:'visible',timeout:20000})
  await page.getByRole('button',{name:'Edit Pattern Points',exact:true}).first().click()
  await front.locator('.pattern-node').first().click({force:true})
  const editor=page.getByRole('region',{name:'Precision point editor'})
  assert.ok(await editor.isVisible())
  existing=(await read()).pieces.find(p=>p.id==='front')
  await editor.getByRole('spinbutton',{name:'Point X coordinate in centimeters'}).fill((existing.points[0].x+.125).toFixed(4))
  await editor.getByRole('button',{name:'Apply precision edit'}).click()
  await page.waitForTimeout(500)
  assert.equal((await read()).pieces.find(p=>p.id==='front').points[0].qaPointTag,'persist-after-xy-edit')

  // Fabrication attachment edge IDs survive removal of a non-adjacent vertex.
  await page.evaluate(key=>{
    const project=JSON.parse(localStorage.getItem(key))
    const p=project.pieces.find(p=>p.id==='front')
    p.points=[{x:-10,y:0,id:'a'},{x:0,y:0,id:'b'},{x:10,y:0,id:'c'},{x:10,y:20,id:'d'},{x:-10,y:20,id:'e'}]
    p.curves={};p.notches=[];p.locked=false
    p.zippers=[{id:'qa-z',edgeIndex:3}]
    p.bindings=[{id:'qa-b',edgeIndex:3}]
    p.topstitches=[{id:'qa-t',edgeIndex:3}]
    project.seams=[]
    localStorage.setItem(key,JSON.stringify(project))
  },KEY)
  await page.reload({waitUntil:'domcontentloaded'})
  await front.waitFor({state:'visible',timeout:20000})
  const beforeDelete=(await read()).pieces.find(p=>p.id==='front')
  assert.equal(beforeDelete.points.length,5,'Seeded cutline must survive the reload')
  assert.equal(beforeDelete.zippers?.[0]?.edgeIndex,3,'Hardware must survive the reload')
  await page.getByRole('button',{name:'Edit Pattern Points',exact:true}).first().click()
  await front.locator('.pattern-node').nth(1).click({force:true,modifiers:['Alt']})
  await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).pieces.find(p=>p.id==='front').points.length===4,KEY,{timeout:5000})
  const changed=(await read()).pieces.find(p=>p.id==='front')
  assert.equal(changed.points.length,4)
  for (const collection of ['zippers','bindings','topstitches']) {
    assert.equal(changed[collection][0].edgeIndex,2,`${collection} must follow its original edge`)
  }
  assert.deepEqual(errors,[])
  console.log(JSON.stringify({pass:true,allEdgeMeasurements:true,pointMetadataPreserved:true,attachmentEdgeRemap:true,browserErrors:errors},null,2))
} finally {await browser.close()}
