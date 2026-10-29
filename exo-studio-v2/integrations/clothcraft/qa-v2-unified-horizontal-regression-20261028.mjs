import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
const url='http://127.0.0.1:5969/?desktop=1&engine=clothcraft&testSession=top-ribbon-20261028'
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu','--no-first-run']})
const page=await browser.newPage({viewport:{width:1660,height:1000}})
const errors=[];page.on('pageerror',e=>errors.push(e.message))
try{
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000})
 await page.locator('.main-layout.clo-adjustable-panels').waitFor({timeout:20000})
 const results=[]
 for(const mode of ['3d','2d']){
  if(mode==='2d'){
   const arrangement=page.getByRole('combobox',{name:'3D and 2D window arrangement'})
   if(await arrangement.count())await arrangement.selectOption('2d')
  }
  const handle=page.getByRole('button',{name:'Dock 2D tools horizontally above viewer'})
  await handle.first().waitFor({state:'visible',timeout:15000})
  await handle.first().click()
  await page.waitForTimeout(300)
  const data=await page.evaluate(()=>{
   const root=document.querySelector('.main-layout.clo-adjustable-panels'),viewer=root?.querySelector('.workspaces'),palette=root?.querySelector('.clo-right-tool-palette'),columns=palette?.querySelectorAll('.clo-observed-column')||[]
   const box=node=>node?.getBoundingClientRect().toJSON()
   return{placement:root?.dataset.exoRightToolsPlacement,viewer:box(viewer),palette:box(palette),root:box(root),gridRows:getComputedStyle(root).gridTemplateRows,columns:[...columns].map(c=>({rect:box(c),display:getComputedStyle(c).display,buttons:[...c.querySelectorAll('button')].slice(0,3).map(box)})),visibleButtons:[...palette.querySelectorAll('button')].filter(x=>{const r=x.getBoundingClientRect();return r.width>10&&r.height>10&&getComputedStyle(x).visibility!=='hidden'}).length}
  })
  assert.equal(data.placement,'top',`top docking state in ${mode}`)
  assert(data.palette?.width>150&&data.palette.height>=45&&data.palette.height<=60,`compact visible toolbar ${mode}: ${JSON.stringify(data)}`)
  assert(data.viewer?.width>140&&data.viewer.height>250,`viewer remains visible in ${mode}`)
  assert(data.palette.bottom<=data.viewer.top+4,`no ribbon overlay on viewer in ${mode}`)
  assert(data.visibleButtons>=5,`toolbar buttons not collapsed/black in ${mode}`)
  for(const c of data.columns)assert(c.rect?.height<=53,`no 990px vertical column in ${mode}: ${JSON.stringify(c)}`)
  assert(data.palette.width >= data.viewer.width-3,`full board ribbon ${mode}: ${data.palette.width} vs ${data.viewer.width}`)
  const grip=page.getByRole('button',{name:'Drag Right tools panel'}).first()
  await grip.click({button:'right'})
  const single=page.getByRole('menuitemradio',{name:/Single horizontal row/});await single.click();await page.waitForTimeout(150)
  const one=await page.evaluate(()=>({height:document.querySelector('.clo-right-tool-palette').getBoundingClientRect().height,rows:document.querySelector('.clo-right-tool-palette').dataset.exoHorizontalRows,viewer:document.querySelector('.workspaces').getBoundingClientRect().height}))
  assert.equal(one.rows,'1');assert(one.height>=29&&one.height<=32,`single row height ${mode}: ${JSON.stringify(one)}`)
  await grip.click({button:'right'})
  await page.getByRole('menuitemradio',{name:/Double-stacked rows/}).click();await page.waitForTimeout(150)
  const two=await page.evaluate(()=>({height:document.querySelector('.clo-right-tool-palette').getBoundingClientRect().height,rows:document.querySelector('.clo-right-tool-palette').dataset.exoHorizontalRows}))
  assert.equal(two.rows,'2');assert(two.height>=55&&two.height<=57)
  results.push({mode,placement:data.placement,toolbarHeight:data.palette.height,viewerHeight:data.viewer.height,buttons:data.visibleButtons,columns:data.columns.length,gridRows:data.gridRows,singleHeight:one.height,doubleHeight:two.height,fullWidth:data.palette.width})
  const alignment=await page.evaluate(()=>{const h=document.querySelector('.clo-object-browser>.clo-panel-header'),label=h?.querySelector('strong');if(!h||!label)return null;const p=h.getBoundingClientRect(),t=label.getBoundingClientRect();return {delta:Math.abs((p.left+p.width/2)-(t.left+t.width/2)),panelWidth:p.width}})
  if(alignment&&alignment.panelWidth>100)assert(alignment.delta<8,`Object Browser heading should remain centered in ${mode}: ${JSON.stringify(alignment)}`)
  const restore=page.getByRole('button',{name:'Restore vertical 2D tools'});await restore.first().click();await page.waitForTimeout(150)
  const restored=await page.evaluate(()=>({placement:document.querySelector('.main-layout')?.dataset.exoRightToolsPlacement,viewerWidth:document.querySelector('.workspaces')?.getBoundingClientRect().width,toolbarWidth:document.querySelector('.clo-right-tool-palette')?.getBoundingClientRect().width}))
  assert.equal(restored.placement,'right',`vertical toolbar restores in ${mode}`)
  assert(restored.viewerWidth>140&&restored.toolbarWidth>20&&restored.toolbarWidth<160,`no canvas collapse on undock ${mode}: ${JSON.stringify(restored)}`)
 }
 assert.equal(errors.length,0,`page errors ${errors.join('; ')}`)
 console.log(JSON.stringify({ok:true,results},null,2))
}finally{await browser.close()}
