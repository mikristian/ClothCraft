/** Browser acceptance for live Custom Toolbar placement. No garment backend needed. */
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
const url=process.env.EXO_UI_URL||'http://127.0.0.1:5953'
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu','--no-first-run']})
try{
 const page=await browser.newPage({viewport:{width:1500,height:920}})
 page.setDefaultTimeout(8500)
 const errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/src/main.jsx',route=>route.fulfill({status:200,contentType:'application/javascript',body:''}))
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:15000})
 await page.evaluate(async()=>{
  const [react,dom,module]=await Promise.all([
   import('/node_modules/.vite/deps/react.js'),import('/node_modules/.vite/deps/react-dom_client.js'),
   import('/src/components/StudioCustomToolbarCollection.jsx'),
  ])
  const R=react.default
  const stage=document.createElement('main')
  stage.className='main-layout'
  stage.dataset.exoFourDocksFixture='true'
  stage.style.cssText='position:fixed;top:50px;left:35px;width:1430px;height:820px;display:flex;background:#26313d;z-index:100000'
  stage.innerHTML='<aside class="tool-rail" style="width:100px;flex:none;position:relative;background:#242d38"></aside><section class="workspaces" style="position:relative;flex:1;background:#1a222a"></section><aside class="clo-inspector" style="width:220px;flex:none;display:flex;position:relative;background:#273640"><div class="clo-inspector-content" style="display:flex;flex:1;flex-direction:column;min-width:0"><section class="clo-object-browser" style="min-height:150px;flex:1">Object Browser</section><section class="clo-property-panel" style="flex:1">Property Editor</section></div></aside>'
  document.body.append(stage)
  const root=dom.default.createRoot(stage.querySelector('.workspaces'))
  const initial={workspace:{customToolbars:[{id:'one',name:'My Grading Tools',dock:'floating',x:220,y:260,visible:true,tools:['select','point'],columns:2,orientation:'vertical'}]}}
  const App=()=>{
   const [value,setValue]=R.useState(initial)
   window.__exoFourDocksValue=value
   return R.createElement(module.default,{value,onChange:setValue,onAction:()=>{},onCustomize:()=>{}})
  }
  root.render(R.createElement(App))
  window.__exoFourDocksCleanup=()=>{root.unmount();stage.remove()}
 })
 const bar=page.locator('[data-custom-bar="one"]')
 await bar.waitFor()
 const work=page.locator('[data-exo-four-docks-fixture="true"] .workspaces')
 const inspector=page.locator('[data-exo-four-docks-fixture="true"] .clo-inspector')
 const left=page.locator('[data-exo-four-docks-fixture="true"] .tool-rail')
 async function dragTo(x,y){
  const handle=bar.locator('[data-custom-toolbar-drag-handle]')
  const pos=await handle.boundingBox()
  assert(pos)
  await page.mouse.move(pos.x+Math.min(42,pos.width/4),pos.y+pos.height/2)
  await page.mouse.down()
  await page.mouse.move(x,y,{steps:14})
  await page.waitForTimeout(100)
  const hover=await page.locator('[data-exo-custom-toolbar-hover]').getAttribute('data-exo-custom-toolbar-hover').catch(()=>null)
  if(hover==='left'||hover==='right'){
   const side=hover==='left'?left:inspector
   assert.equal(await side.getAttribute('data-exo-custom-toolbar-dock-hover'),'true',
    'Side panel must show the active blue highlight')
   const outline=await side.evaluate(node=>getComputedStyle(node).outlineStyle)
   assert.equal(outline,'solid','Side panel highlight must be visible')
  }
  await page.mouse.up()
  await page.waitForTimeout(160)
  assert.equal(await left.getAttribute('data-exo-custom-toolbar-dock-hover'),'false')
  assert.equal(await inspector.getAttribute('data-exo-custom-toolbar-dock-hover'),'false')
  return hover
 }
 const w=await work.boundingBox()
 assert(w)
 assert.equal(await dragTo(w.x+w.width*.55,w.y+18),'top')
 assert.equal(await bar.getAttribute('data-dock'),'top')
 const leftRect=await left.boundingBox()
 assert.equal(await dragTo(leftRect.x+leftRect.width*.5,leftRect.y+220),'left')
 assert.equal(await bar.getAttribute('data-dock'),'left')
 assert.equal(await bar.locator('xpath=ancestor::*[contains(@class,"tool-rail")]').count(),1,'Left toolbar should embed inside the real side panel')
 const inspectorRect=await inspector.boundingBox()
 assert.equal(await dragTo(inspectorRect.x+inspectorRect.width*.5,inspectorRect.y+220),'right')
 assert.equal(await bar.getAttribute('data-dock'),'right')
 assert.equal(await bar.locator('xpath=ancestor::*[contains(concat(" ",normalize-space(@class)," ")," clo-inspector ")]').count(),1,'Right toolbar should embed inside the Property Editor side panel')
 assert.equal(await bar.locator('xpath=ancestor::*[contains(concat(" ",normalize-space(@class)," ")," clo-inspector-content ")]').count(),1,
  'Right dock belongs inside the vertical inspector content, never beside it')
 const rightWidths=await inspector.evaluate(node=>({
  browser:node.querySelector('.clo-object-browser')?.getBoundingClientRect().width,
  property:node.querySelector('.clo-property-panel')?.getBoundingClientRect().width,
 }))
 assert(rightWidths.browser>=150&&rightWidths.property>=150,
  'Custom right-side toolbar must not consume Object Browser or Property Editor width')
 assert.equal(await dragTo(w.x+w.width*.5,w.y+w.height-13),'bottom')
 assert.equal(await bar.getAttribute('data-dock'),'bottom')
 const center=await dragTo(w.x+w.width*.52,w.y+w.height*.55)
 assert.equal(center,null)
 assert.equal(await bar.getAttribute('data-dock'),'floating')
 await bar.getByRole('combobox',{name:'Dock My Grading Tools toolbar'}).selectOption('left')
 assert.equal(await bar.getAttribute('data-dock'),'left')
 const saved=await page.evaluate(()=>window.__exoFourDocksValue.workspace.customToolbars[0])
 assert.equal(saved.dock,'left')
 assert.equal(errors.length,0,errors.join('\n'))
 console.log(JSON.stringify({passed:true,zones:['top','left','right','bottom','floating'],selectSaved:true,actions:saved.tools,errors},null,2))
 await page.evaluate(()=>window.__exoFourDocksCleanup())
}finally{await browser.close()}
