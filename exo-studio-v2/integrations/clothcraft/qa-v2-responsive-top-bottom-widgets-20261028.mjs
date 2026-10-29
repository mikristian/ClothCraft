/** Isolated live React/Chrome acceptance: two independent docks, compact summary, no scrollbars, grading row. */
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
const url=process.env.EXO_UI_URL||'http://127.0.0.1:5958'
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu','--no-first-run']})
try{
 const page=await browser.newPage({viewport:{width:1520,height:960}})
 const errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 page.setDefaultTimeout(8500)
 await page.route('**/src/main.jsx',route=>route.fulfill({status:200,contentType:'application/javascript',body:''}))
 await page.goto(url,{waitUntil:'domcontentloaded'})
 const setup=await page.evaluate(async()=>{
  const [react,dom,grade,split,finishing,quick]=await Promise.all([
   import('/node_modules/.vite/deps/react.js'),import('/node_modules/.vite/deps/react-dom_client.js'),
   import('/src/components/OptitexGradeBottomDock20261027.jsx'),
   import('/src/components/ExoBottomDockSplitControls20261027.jsx'),
   import('/src/components/CloFinishingToolWidgets.jsx'),
   import('/src/components/ExoGradingQuickToolbar20261028.jsx'),
  ])
  for(const key of ['exo.grade.bottom-widget.v3.values.v1','exo.2d.top-dock-height.v7','exo.2d.bottom-dock-height.v6','exo.widget.bottom-docked.grading-quick-toolbar.v2','exo.widget.dock-side.grading-quick-toolbar.v1'])localStorage.removeItem(key)
  const scope=document.createElement('div')
  scope.className='cc-embedded-root cc-embedded-2d'
  scope.style.cssText='position:fixed;left:75px;top:62px;width:1280px;height:790px;display:flex;flex-direction:column;z-index:100000;background:#222e3a'
  scope.innerHTML='<section data-exo-grade-dock-host="true" data-exo-dock-edge="top" data-exo-grade-dock-occupied="false" class="exo-grade-workspace-dock-host"><div class="exo-bottom-dock-rail">TOP</div></section><div style="flex:1 1 auto"></div><section data-exo-grade-dock-host="true" data-exo-dock-edge="bottom" data-exo-grade-dock-occupied="false" class="exo-grade-workspace-dock-host"><div class="exo-bottom-dock-rail">BOTTOM</div></section><div id="exo-responsive-react" style="display:contents"></div>'
  document.body.append(scope)
  const top=scope.querySelector('[data-exo-dock-edge=top]'),bottom=scope.querySelector('[data-exo-dock-edge=bottom]')
  const observe=new MutationObserver(()=>{for(const host of [top,bottom])host.dataset.exoGradeDockOccupied=String(!!host.querySelector('.exo-grade-bottom-widget--docked,.clo-floating-tool--docked'))})
  observe.observe(scope,{subtree:true,childList:true})
  const root=dom.default.createRoot(scope.querySelector('#exo-responsive-react'))
  const R=react.default
  const App=()=>{
   const [selectedSize,setSelectedSize]=R.useState('M')
   window.__exoQaGradeSize=selectedSize
   return R.createElement(R.Fragment,null,
    R.createElement(grade.default,{openValues:true,openCompare:false,onCloseValues:()=>{},onCloseCompare:()=>{},dockHost:bottom,topDockHost:top,
     tableProps:{selectedSize,onSelectSize:setSelectedSize}}),
    R.createElement(finishing.CloFloatingPanel,{kind:'grading-quick-toolbar',title:'Grading Toolbar',open:true,active:true,onClose:()=>{},onActivate:()=>{}},
     R.createElement(quick.default,{snapshot:null,selectedSize,onSelectSize:setSelectedSize})),
    R.createElement(split.default,{host:top,edge:'top'}),
    R.createElement(split.default,{host:bottom,edge:'bottom'}))
  }
  root.render(R.createElement(App))
  window.__exoCleanup=()=>{observe.disconnect();root.unmount();scope.remove()}
  return true
 })
 assert(setup)
 const top=page.locator('[data-exo-grade-dock-host=true][data-exo-dock-edge=top]')
 const bottom=page.locator('[data-exo-grade-dock-host=true][data-exo-dock-edge=bottom]')
 const table=page.locator('[data-exo-grade-bottom-widget=values]')
 const toolbar=page.locator('[data-clo-floating-widget=grading-quick-toolbar]')
 await table.waitFor({state:'visible'})
 await toolbar.waitFor({state:'visible'})
 await toolbar.getByRole('combobox',{name:'Grading toolbar placement'}).selectOption('top')
 await table.getByRole('combobox',{name:'Grading Table placement'}).selectOption('bottom')
 await page.waitForTimeout(200)
 let initial=await page.evaluate(()=>{
  const top=document.querySelector('[data-exo-dock-edge=top]'),bottom=document.querySelector('[data-exo-dock-edge=bottom]')
  const t=top.querySelector('.clo-floating-tool--docked[data-clo-floating-widget=grading-quick-toolbar]')
  const b=bottom.querySelector('[data-exo-grade-bottom-widget=values]')
  const table=b?.querySelector('.optitex-table-scroll')
  const icons=t?.querySelector('.exo-quick-grade__grid')
  const last=table?.querySelector('tbody tr:last-child'),tableRect=table?.getBoundingClientRect()
  const lastRect=last?.getBoundingClientRect()
  const gridRect=icons?.getBoundingClientRect()
  const iconRects=Array.from(icons?.querySelectorAll('button')||[]).map(button=>button.getBoundingClientRect())
  const dockToolbarRect=t?.getBoundingClientRect()
  const quick=t?.querySelector('.exo-quick-grade')
  const chrome=t?.querySelector('.clo-floating-tool-header')
  const icon=icons?.querySelector('button')
  const placement=t?.querySelector('.exo-quick-grade-placement')
  const colors=[icon,placement,t].map(element=>element?{
   background:getComputedStyle(element).backgroundColor,
   foreground:getComputedStyle(element).color,
   scheme:getComputedStyle(element).colorScheme}:null)
  return {topHeight:top.getBoundingClientRect().height,bottomHeight:bottom.getBoundingClientRect().height,
   topToolbar:!!t,bottomTable:!!b,icons:icons?.querySelectorAll('button').length,
   gridRows:icons?getComputedStyle(icons).gridTemplateRows:null,
   toolbarHeight:dockToolbarRect?.height,quickHeight:quick?.getBoundingClientRect().height,
   chromeHeight:chrome?.getBoundingClientRect().height,
   chromeNextToQuick:!!chrome&&!!quick&&Math.abs(chrome.getBoundingClientRect().top-quick.getBoundingClientRect().top)<4,
   colors,
   tableRows:table?.querySelectorAll('tbody tr').length,
   tableOverflow:table?getComputedStyle(table).overflowY:null,
   lastRowVisible:!!lastRect&&lastRect.bottom<=tableRect.bottom+2,
   lastBottom:lastRect?.bottom,tableBottom:tableRect?.bottom,tableHeight:tableRect?.height,
   firstTop:table?.querySelector('thead')?.getBoundingClientRect().top,
   iconsSingleRow:iconRects.every(rect=>Math.abs(rect.top-iconRects[0].top)<2&&rect.bottom<=gridRect.bottom+2),
   topControls:top.querySelectorAll('[role=group][aria-label="Embedded widget layout"] button').length}
 })
 console.log(JSON.stringify({stage:'initial',...initial}))
 assert(initial.topToolbar&&initial.bottomTable)
 assert.equal(initial.icons,12)
 assert.equal(initial.tableRows,6)
 assert.equal(initial.tableOverflow,'hidden')
 assert.equal(initial.lastRowVisible,true,'The sixth size must fit at standard height without scrolling')
 assert.equal(initial.iconsSingleRow,true,'All grading actions must fit into one unscrolled toolbar row')
 assert(initial.topHeight<=62,'top ribbon should take no more than 62px')
 assert.equal(initial.chromeNextToQuick,true,'Top toolbar header and command buttons must share the same row')
 assert(initial.toolbarHeight<35,'Top toolbar itself should be at most 34px high')
 assert(initial.colors.every(c=>c?.scheme==='dark'),'Top toolbar needs dark native input color scheme')
 await toolbar.getByRole('combobox',{name:'Quick grading selected size'}).selectOption('L')
 await page.waitForTimeout(70)
 assert.equal(await page.evaluate(()=>window.__exoQaGradeSize),'L','Top toolbar Size selector must update shared grading selection')
 assert.equal(await table.locator('tbody tr.is-active').count(),1,'Grading table should mark the size selected by the top toolbar')
 assert.equal(await table.locator('tbody tr.is-active button[aria-label="Select grading size L"]').count(),1)
 await page.screenshot({path:'integrations/clothcraft/output/exo-top-grade-ribbon-qa-20261028.png'})
 await bottom.getByRole('button',{name:'Compact row'}).click()
 await page.waitForTimeout(130)
 const small=await page.evaluate(()=>{
  const b=document.querySelector('[data-exo-dock-edge=bottom]'),w=b.querySelector('[data-exo-grade-bottom-widget=values]')
  return {height:b.getBoundingClientRect().height,micro:!!w.querySelector('.optitex-grading-table--micro'),overflow:getComputedStyle(w).overflowY}
 })
 console.log(JSON.stringify({stage:'compact',...small}))
 assert.equal(small.micro,true)
 assert(small.height<100)
 await bottom.getByRole('button',{name:'Expand worksheet'}).click()
 await page.waitForTimeout(130)
 const expanded=await page.evaluate(()=>{
  const b=document.querySelector('[data-exo-dock-edge=bottom]'),w=b.querySelector('[data-exo-grade-bottom-widget=values]'),table=w.querySelector('.optitex-table-scroll')
  return {height:b.getBoundingClientRect().height,rows:table.querySelectorAll('tbody tr').length,overflow:getComputedStyle(table).overflowY}
 })
 console.log(JSON.stringify({stage:'expanded',...expanded,errors}))
 assert(expanded.height>=270)
 assert.equal(expanded.rows,6)
 assert.equal(expanded.overflow,'hidden')
 assert.deepEqual(errors,[])
 console.log('PASS responsive top/bottom embed, twelve-icon row, no scrollbars, micro / expand')
 await page.evaluate(()=>window.__exoCleanup())
}finally{await browser.close()}
