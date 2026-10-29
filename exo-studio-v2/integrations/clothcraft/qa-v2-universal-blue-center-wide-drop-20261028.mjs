/** Live Chrome acceptance: two distinct blue scope targets for vertical 2D
 * toolbar dragging to the top and bottom of a real EXO workspace. */
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

// Use the current Vite source, never a previously built static preview.
const url=process.env.EXO_TEST_URL
assert(url,'Set EXO_TEST_URL to this workspace\'s current Vite development URL')
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu','--no-first-run']})
const page=await browser.newPage({viewport:{width:1660,height:1010}})
let stage='load'
const errors=[]
page.on('pageerror',error=>errors.push(error.message))
try{
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000})
 await page.locator('.main-layout.clo-adjustable-panels').waitFor({timeout:20000})
 const arrangement=page.getByRole('combobox',{name:'3D and 2D window arrangement'})
 if(await arrangement.count())await arrangement.selectOption('2d')
 const cases=[['top','workspace'],['top','board'],['bottom','workspace'],['bottom','board']]
 const results=[]
 for(const [edge,scope] of cases){
  stage=`drag 2D vertical toolbar to ${edge} ${scope}`
  const grip=page.getByRole('button',{name:'Drag Right tools panel'}).first()
  await grip.waitFor({state:'visible',timeout:15000})
  const start=await grip.boundingBox()
  assert(start?.width>5&&start?.height>5,'Real 2D toolbar grip not visible')
  assert(start.x>=0&&start.x+start.width<=1660,
   '2D toolbar drag grip cannot be placed offscreen when Object Browser is collapsed')
  const zone=await page.evaluate(({edge,scope})=>{
   const board=document.querySelector('.main-layout').getBoundingClientRect()
   const viewer=document.querySelector('.workspaces').getBoundingClientRect()
   const views=[...document.querySelectorAll('.workspaces .cc-viewport-2d,.workspaces .cc-viewport-3d')]
    .filter(node=>getComputedStyle(node).display!=='none').map(node=>node.getBoundingClientRect()).filter(r=>r.width>0)
   const centerLeft=views.length?Math.min(...views.map(r=>r.left)):viewer.left
   const centerRight=views.length?Math.max(...views.map(r=>r.right)):viewer.right
   const height=Math.max(26,Math.min(44,Math.floor(board.height*.08)))
   const x=scope==='workspace'?(centerLeft+centerRight)/2:(board.left+board.right)/2
   const y=edge==='top'?(scope==='board'?board.top+height/2:board.top+height*1.5):
    (scope==='board'?board.bottom-height/2:board.bottom-height*1.5)
   return {x,y,board:{left:board.left,right:board.right},center:{left:centerLeft,right:centerRight}}
  },{edge,scope})
  await page.mouse.move(start.x+start.width/2,start.y+start.height/2)
  await page.mouse.down()
  await page.mouse.move(start.x+start.width/2-16,start.y+start.height/2+8,{steps:3})
  await page.mouse.move(zone.x,zone.y,{steps:10})
  const previews=page.locator(`[data-exo-dock-preview-edge="${edge}"]`)
  await previews.first().waitFor({state:'visible',timeout:6000})
  assert.equal(await previews.count(),2,'Expected simultaneous Center Dock and Wide Dock blue zones')
  const selected=page.locator(`[data-exo-dock-preview-edge="${edge}"][data-exo-dock-preview-scope="${scope}"]`)
  assert((await selected.getAttribute('class')).includes('exo-universal-dock-preview--selected'),
   'The hovered blue zone must highlight the actual selected scope')
  const previewsGeometry=await previews.evaluateAll(nodes=>nodes.map(node=>({
   scope:node.dataset.exoDockPreviewScope,label:node.getAttribute('aria-label'),
   x:node.getBoundingClientRect().x,width:node.getBoundingClientRect().width,
  })))
  assert(previewsGeometry.find(p=>p.scope==='workspace').width<previewsGeometry.find(p=>p.scope==='board').width,
   'Center target must be narrower than Wide target: '+JSON.stringify(previewsGeometry))
  await page.mouse.up()
  await page.waitForFunction(({edge,scope})=>{
   const root=document.querySelector('.main-layout')
   return root?.dataset.exoRightToolsPlacement===edge&&root.dataset.exoRibbonScope===scope
  },{edge,scope},{timeout:7500})
  const outcome=await page.evaluate(()=>{
   const root=document.querySelector('.main-layout')
   const bar=root.querySelector('.clo-right-tool-palette').getBoundingClientRect()
   const viewer=root.querySelector('.workspaces').getBoundingClientRect()
   return {edge:root.dataset.exoRightToolsPlacement,scope:root.dataset.exoRibbonScope,
    bar:{left:bar.left,width:bar.width,top:bar.top,height:bar.height},
    viewer:{left:viewer.left,width:viewer.width,top:viewer.top,height:viewer.height}}
  })
  assert(outcome.viewer.height>250&&outcome.bar.height>=26,'2D canvas and docked icons must stay visible '+JSON.stringify(outcome))
  if(scope==='workspace'){
   assert(Math.abs(outcome.bar.left-outcome.viewer.left)<=5,'Center dock must start at CURRENT viewport left '+JSON.stringify(outcome))
   assert(Math.abs(outcome.bar.width-outcome.viewer.width)<=5,'Center dock width must match CURRENT viewport '+JSON.stringify(outcome))
  }else{
   assert(outcome.bar.width>outcome.viewer.width+80,'Wide dock must span beyond the viewer '+JSON.stringify(outcome))
  }
  results.push({edge,scope,barWidth:Math.round(outcome.bar.width),viewerWidth:Math.round(outcome.viewer.width),
   previewLabels:previewsGeometry.map(p=>p.label)})
  const restore=page.getByRole('button',{name:'Restore vertical 2D tools'}).first()
  await restore.click()
  await page.waitForFunction(()=>document.querySelector('.main-layout')?.dataset.exoRightToolsPlacement==='right')
 }
 // In split mode Center means the combined 2D+3D viewer footprint, not
 // either sidebar and not whichever single sub-viewport currently has focus.
 stage='combined 2D and 3D center dock'
 if(await arrangement.count()){
  await arrangement.selectOption('split')
  const grip=page.getByRole('button',{name:'Drag Right tools panel'}).first()
  const start=await grip.boundingBox()
  const destination=await page.evaluate(()=>{
   const board=document.querySelector('.main-layout').getBoundingClientRect()
   const viewer=document.querySelector('.workspaces').getBoundingClientRect()
   const panes=[...document.querySelectorAll('.workspaces .cc-viewport-2d,.workspaces .cc-viewport-3d')]
    .filter(n=>getComputedStyle(n).display!=='none').map(n=>n.getBoundingClientRect()).filter(r=>r.width>0)
   const band=Math.max(26,Math.min(44,Math.floor(board.height*.08)))
   return {x:(Math.min(...panes.map(r=>r.left))+Math.max(...panes.map(r=>r.right)))/2,
    y:board.top+band*1.5,paneCount:panes.length,viewerWidth:viewer.width}
  })
  assert(destination.paneCount>=2,'Split layout must have both 2D and 3D visible panes')
  await page.mouse.move(start.x+start.width/2,start.y+start.height/2)
  await page.mouse.down()
  await page.mouse.move(start.x+start.width/2-16,start.y+start.height/2+8,{steps:3})
  await page.mouse.move(destination.x,destination.y,{steps:10})
  assert.equal(await page.locator('[data-exo-dock-preview-edge="top"]').count(),2,
   'Split mode also needs two blue top drop sections')
  await page.mouse.up()
  await page.waitForFunction(()=>document.querySelector('.main-layout')?.dataset.exoRibbonScope==='workspace'
   &&document.querySelector('.main-layout')?.dataset.exoRightToolsPlacement==='top')
  const widths=await page.evaluate(()=>{
   const bar=document.querySelector('.clo-right-tool-palette').getBoundingClientRect()
   const viewer=document.querySelector('.workspaces').getBoundingClientRect()
   return {bar:bar.width,viewer:viewer.width}
  })
  assert(Math.abs(widths.bar-widths.viewer)<5,'Split mode Center must follow combined viewport width')
  results.push({edge:'top',scope:'workspace',layout:'split',visiblePanes:destination.paneCount,
   barWidth:Math.round(widths.bar),viewerWidth:Math.round(widths.viewer)})
 }
 assert.deepEqual(errors,[],'Unexpected browser JS errors')
 console.log(JSON.stringify({passed:true,realChrome:true,oneBrowser:true,results,noBrowserErrors:true}))
}catch(error){
 console.error(JSON.stringify({passed:false,stage,error:error.message,stack:error.stack,errors}))
 process.exitCode=1
}finally{
 await browser.close()
}
