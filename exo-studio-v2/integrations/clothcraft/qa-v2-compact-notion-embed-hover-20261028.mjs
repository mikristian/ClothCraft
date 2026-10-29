/**
 * Real browser DOM acceptance of the standalone EXO grade bottom widgets.
 * Reuses an existing Vite dev server and never changes garment projects.
 */
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const origin=process.env.EXO_UI_URL||'http://127.0.0.1:5173'
const browser=await chromium.launch({
 headless:true,
 executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
 args:['--disable-gpu','--no-first-run'],
})
const fail=[]
try{
 const page=await browser.newPage({viewport:{width:1500,height:960}})
 page.setDefaultTimeout(8000)
 page.on('pageerror',error=>fail.push(error.message))
 page.on('console',message=>{
  if(message.type()==='error'&&!/Failed to load resource: net::ERR_CONNECTION_REFUSED/.test(message.text()))
   fail.push(message.text())
 })
 await page.route('**/src/main.jsx',route=>route.fulfill({status:200,contentType:'application/javascript',body:''}))
 await page.goto(origin,{waitUntil:'domcontentloaded'})
 const setup=await page.evaluate(async()=>{
  const [React,ReactDom,grade,split]=await Promise.all([
   import('/node_modules/.vite/deps/react.js'),
   import('/node_modules/.vite/deps/react-dom_client.js'),
   import('/src/components/OptitexGradeBottomDock20261027.jsx'),
   import('/src/components/ExoBottomDockSplitControls20261027.jsx'),
  ])
  localStorage.removeItem('exo.grade.bottom-widget.v3.values.v1')
  localStorage.removeItem('exo.grade.bottom-widget.v3.compare.v1')
  localStorage.removeItem('exo.2d.bottom-dock-order.v1')
  localStorage.removeItem('exo.2d.bottom-dock-height.v5')
  const scope=document.createElement('section')
  scope.className='cc-embedded-root cc-embedded-2d'
  scope.style.cssText='position:fixed;inset:65px 50px 50px 50px;display:flex;flex-direction:column;background:#343c45;z-index:100000'
  scope.innerHTML='<div style="flex:1 1 auto"></div><section class="exo-grade-workspace-dock-host" data-exo-grade-dock-host="true" data-exo-grade-dock-occupied="false" aria-label="Test dock"><div class="exo-bottom-dock-rail">Test bottom dock</div></section><div id="exo-qa-react" style="display:contents"></div>'
  document.body.append(scope)
  const host=scope.querySelector('[data-exo-grade-dock-host]')
  const root=ReactDom.default.createRoot(scope.querySelector('#exo-qa-react'))
  const R=React.default
  const App=()=>R.createElement(R.Fragment,null,
   R.createElement(grade.default,{openValues:true,openCompare:true,
    onCloseValues:()=>{},onCloseCompare:()=>{},dockHost:host,tableProps:{}}),
   R.createElement(split.default,{host}))
  root.render(R.createElement(App))
  window.__exoQaUnmount=()=>{root.unmount();scope.remove()}
  return true
 })
 assert.equal(setup,true)
 await page.waitForTimeout(250)
 const present=await page.locator('[data-exo-grade-bottom-widget]').count()
 assert.equal(present,2,'Grading widget mount failed: '+JSON.stringify(fail))
 const dock=page.locator('[data-exo-grade-dock-host="true"]')
 const values=page.locator('[data-exo-grade-bottom-widget="values"]')
 const compare=page.locator('[data-exo-grade-bottom-widget="compare"]')
 await values.waitFor({state:'visible'})
 await compare.waitFor({state:'visible'})
 await values.getByRole('button',{name:'Dock Grading Table'}).click()
 await page.waitForTimeout(130)
 const one=await page.evaluate(()=>{
  const host=document.querySelector('[data-exo-grade-dock-host]')
  return {height:host.getBoundingClientRect().height,occupied:host.dataset.exoGradeDockOccupied}
 })
 const compareBar=compare.locator('.exo-grade-bottom-widget__titlebar')
 const rect=await compareBar.boundingBox()
 const existing=await values.boundingBox()
 assert(rect&&existing)
 const dockRect=await dock.boundingBox()
 const source={x:rect.x+Math.min(75,rect.width/3),y:rect.y+rect.height/2}
 const target={x:existing.x+Math.min(35,existing.width/4),y:dockRect.y+dockRect.height*.65}
 await page.mouse.move(source.x,source.y)
 await page.mouse.down()
 await page.mouse.move(target.x,target.y,{steps:9})
 await page.waitForTimeout(130)
 const hovering=await page.evaluate(()=>{
  const host=document.querySelector('[data-exo-grade-dock-host]')
  const ghost=host.querySelector('.exo-bottom-dock-live-insert')
  const values=host.querySelector('[data-exo-grade-bottom-widget=values]')
  return {active:host.dataset.exoGradeDockDragHover,index:host.dataset.exoDockPreviewPosition,
   ghost:!!ghost,ghostOrder:ghost?.style.order,valuesOrder:values?.style.order}
 })
 await page.mouse.up()
 await page.waitForTimeout(180)
 const after=await page.evaluate(()=>{
  const host=document.querySelector('[data-exo-grade-dock-host]')
  const a=host.querySelector('[data-exo-grade-bottom-widget=compare]')
  const b=host.querySelector('[data-exo-grade-bottom-widget=values]')
  const table=b?.querySelector('.optitex-table-scroll')
  const grid=b?.querySelector('.optitex-grading-table')
  return {height:host.getBoundingClientRect().height,
   compareDocked:!!a,valuesDocked:!!b,
   compareLeft:a?.getBoundingClientRect().left,valuesLeft:b?.getBoundingClientRect().left,
   sizes:table?.querySelectorAll('tbody tr').length,
   tableClientHeight:table?.clientHeight,tableScrollHeight:table?.scrollHeight,
   tableOverflowY:table?getComputedStyle(table).overflowY:null,
   gridHeight:grid?.getBoundingClientRect().height,
   columns:getComputedStyle(host).gridTemplateColumns,
  }
 })
 console.log(JSON.stringify({stage:'dock-inspection',one,hovering,after,pageErrors:fail},null,2))
 assert.equal(one.occupied,'true')
 assert.equal(hovering.active,'true','Hovering neighboring worksheet must activate insertion target')
 assert.equal(hovering.ghost,true,'Hovering neighboring worksheet must show real layout ghost')
 assert.equal(after.compareDocked,true)
 assert.equal(after.valuesDocked,true)
 assert(after.compareLeft<after.valuesLeft,'Compare length dropped to left of Grading table')
 assert.equal(after.sizes,6)
 assert(after.height<=185&&after.height>=148,'Dock needs compact height: '+JSON.stringify(after))
 assert.equal(after.tableOverflowY,'auto','Compact table must permit accessing clipped size rows')
 const scrollToLast=await values.locator('.optitex-table-scroll').evaluate(table=>{
  table.scrollTop=table.scrollHeight
  const last=table.querySelector('tbody tr:last-child')
  return {scrollTop:table.scrollTop,scrollHeight:table.scrollHeight,clientHeight:table.clientHeight,
   visible:!!last&&last.getBoundingClientRect().bottom<=table.getBoundingClientRect().bottom+2}
 })
 assert(scrollToLast.visible,'Last grading size must remain reachable after shortening')
 const dockedGrip=values.locator('[data-exo-widget-grip="true"]')
 const gripRect=await dockedGrip.boundingBox()
 const compareRect=await compare.boundingBox()
 const currentHostRect=await dock.boundingBox()
 assert(gripRect&&compareRect&&currentHostRect)
 await page.mouse.move(gripRect.x+gripRect.width/2,gripRect.y+gripRect.height/2)
 await page.mouse.down()
 await page.mouse.move(compareRect.x+30,currentHostRect.y+currentHostRect.height*.65,{steps:11})
 await page.waitForTimeout(120)
 const reorderHover=await dock.getAttribute('data-exo-dock-preview-position')
 await page.mouse.up()
 await page.waitForTimeout(180)
 const reordered=await page.evaluate(()=>{
  const host=document.querySelector('[data-exo-grade-dock-host]')
  const values=host.querySelector('[data-exo-grade-bottom-widget=values]')
  const compare=host.querySelector('[data-exo-grade-bottom-widget=compare]')
  return {values:!!values,compare:!!compare,
   valuesLeft:values?.getBoundingClientRect().left,
   compareLeft:compare?.getBoundingClientRect().left,
   storedOrder:localStorage.getItem('exo.2d.bottom-dock-order.v1')}
 })
 console.log(JSON.stringify({stage:'reorder-and-scroll',scrollToLast,reorderHover,reordered},null,2))
 assert(reordered.values&&reordered.compare,'Both real widgets must stay docked after moving a grip')
 assert.equal(reorderHover,'1/2','Dotted-grip reorder should preview the left insertion slot')
 assert(reordered.valuesLeft<reordered.compareLeft,'Grading table must snap to the left of Compare Length')
 assert.match(reordered.storedOrder||'',/values/)
 assert.equal(fail.length,0,fail.join('\n'))
 console.log('PASS: real widgets dock, hover and insert side by side')
 await page.evaluate(()=>window.__exoQaUnmount?.())
}finally{
 await browser.close()
}
