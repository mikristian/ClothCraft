import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu','--no-first-run']})
const page=await browser.newPage({viewport:{width:1660,height:1000}})
const geometry=()=>page.evaluate(()=>{const root=document.querySelector('.main-layout'),viewer=root.querySelector('.workspaces'),library=root.querySelector('.asset-browser'),inspector=root.querySelector('.clo-inspector'),bar=root.querySelector('.clo-right-tool-palette');const rect=e=>e.getBoundingClientRect();const r=rect(root),v=rect(viewer),l=rect(library),i=rect(inspector),b=rect(bar);return {root:{width:r.width},viewer:{x:v.x,right:v.right,width:v.width},library:{x:l.x,right:l.right,width:l.width},inspector:{x:i.x,right:i.right,width:i.width},bar:{x:b.x,right:b.right,width:b.width,y:b.y,bottom:b.bottom},libraryCollapsed:root.dataset.exoLibraryCollapsed,inspectorCollapsed:root.dataset.exoInspectorCollapsed,placement:root.dataset.exoRightToolsPlacement}})
const rightClick=async selector=>{await page.getByRole('button',{name:selector}).first().click({button:'right'})}
try{
 await page.goto('http://127.0.0.1:5972/?desktop=1&engine=clothcraft&testSession=universal-combinations-20261028',{waitUntil:'domcontentloaded'})
 await page.locator('.main-layout').waitFor()
 const base=await geometry();assert(base.viewer.width>700)
 await rightClick('Drag Library panel');await page.getByRole('menuitem',{name:'Dock on right'}).click()
 const same=await geometry();assert(same.library.x>=same.viewer.right-2)
 await rightClick('Drag Library panel');await page.getByRole('menuitem',{name:'Collapse panel'}).click()
 const collapsed=await geometry();assert.equal(collapsed.libraryCollapsed,'true');console.log('COLLAPSED',JSON.stringify(collapsed));assert(collapsed.library.width<5)
 assert(collapsed.viewer.width>base.viewer.width, 'Canvas must gain width when panel collapses')
 await page.getByRole('button',{name:'Expand Library panel'}).click()
 const restored=await geometry();assert.equal(restored.libraryCollapsed,'false')
 await rightClick('Drag Library panel');await page.getByRole('menuitem',{name:'Dock on left'}).click()
 const returned=await geometry();assert(returned.viewer.width>600)
 await page.getByRole('button',{name:'Dock 2D tools horizontally above viewer'}).click()
 const docked=await geometry();assert.equal(docked.placement,'top');assert(docked.bar.width>1600);assert(docked.bar.bottom<=page.viewportSize().height)
 console.log(JSON.stringify({ok:true,baseViewer:base.viewer.width,sameSideViewer:same.viewer.width,collapsedLibraryWidth:collapsed.library.width,restoredLibraryWidth:restored.library.width,returnedViewer:returned.viewer.width,topBarWidth:docked.bar.width},null,2))
}finally{await browser.close()}
