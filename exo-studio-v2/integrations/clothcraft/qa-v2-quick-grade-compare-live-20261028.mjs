/** Real React + real Optitex rule engine, isolated from user garment storage. */
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
const origin=process.env.EXO_UI_URL||'http://127.0.0.1:5958'
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu','--no-first-run']})
try {
 const page=await browser.newPage({viewport:{width:1750,height:1050}})
 page.setDefaultTimeout(9500)
 const errors=[]
 page.on('pageerror',error=>errors.push(error.message))
 await page.route('**/src/main.jsx',route=>route.fulfill({status:200,contentType:'application/javascript',body:''}))
 await page.goto(origin,{waitUntil:'domcontentloaded'})
 const setup=await page.evaluate(async()=>{
  const [react,dom,grade,split,finishing,quick,rule,engine]=await Promise.all([
   import('/node_modules/.vite/deps/react.js'),import('/node_modules/.vite/deps/react-dom_client.js'),
   import('/src/components/OptitexGradeBottomDock20261027.jsx'),
   import('/src/components/ExoBottomDockSplitControls20261027.jsx'),
   import('/src/components/CloFinishingToolWidgets.jsx'),
   import('/src/components/ExoGradingQuickToolbar20261028.jsx'),
   import('/src/core/accumarkNativePointRuleSet20261023.js'),
   import('/src/core/optitexGradeTools20261027.js'),
  ])
  const snapshot={template:{panels:[{id:'front',name:'Front',polygon:{points:[[0,0],[.2,0],[.2,.2],[0,.2]],edges:['a','b','c','d']}},
   {id:'back',name:'Back',polygon:{points:[[0,0],[.2,0],[.2,.2],[0,.2]],edges:['e','f','g','h']}}]}}
  const initial=rule.createAccuMarkNativeRuleSet(snapshot)
  if(!initial.ok)throw Error(initial.reason)
  for(const id of ['values','compare'])localStorage.setItem(`exo.grade.bottom-widget.v3.${id}.v1`,JSON.stringify({docked:true,dockEdge:'bottom',x:90,y:200,minimized:false}))
  localStorage.setItem('exo.widget.bottom-docked.grading-quick-toolbar.v2','true')
  localStorage.setItem('exo.widget.dock-side.grading-quick-toolbar.v1','top')
  localStorage.removeItem('exo.2d.top-dock-height.v7')
  localStorage.removeItem('exo.2d.bottom-dock-height.v6')
  const scope=document.createElement('section')
  scope.className='cc-embedded-root cc-embedded-2d cc-rust-embedded'
  scope.style.cssText='position:fixed;top:52px;left:45px;width:1570px;height:875px;display:flex;flex-direction:column;background:#263442;z-index:100100'
  scope.innerHTML='<section data-exo-grade-dock-host="true" data-exo-dock-edge="top" class="exo-grade-workspace-dock-host"><div class="exo-bottom-dock-rail">TOP</div></section><div style="flex:1 1 auto"></div><section data-exo-grade-dock-host="true" data-exo-dock-edge="bottom" class="exo-grade-workspace-dock-host"><div class="exo-bottom-dock-rail">BOTTOM</div></section><div id="exo-grade-engine-qa" style="display:contents"></div>'
  document.body.append(scope)
  const top=scope.querySelector('[data-exo-dock-edge=top]'),bottom=scope.querySelector('[data-exo-dock-edge=bottom]')
  const observer=new MutationObserver(()=>{for(const host of [top,bottom])host.dataset.exoGradeDockOccupied=String(!!host.querySelector('.exo-grade-bottom-widget--docked,.clo-floating-tool--docked'))})
  observer.observe(scope,{childList:true,subtree:true})
  const root=dom.default.createRoot(scope.querySelector('#exo-grade-engine-qa'))
  const R=react.default
  const App=()=>{
   const [rules,setRules]=R.useState(initial.ruleSet)
   const [size,setSize]=R.useState('M')
   const [point,setPoint]=R.useState(1)
   const rulesRef=R.useRef(rules)
   rulesRef.current=rules
   window.__exoFunctionalGrade={rules,size,point}
   const onApply=(toolId,options={})=>{
    const response=engine.applyOptitexGradeTool20261027({snapshot,ruleSet:rulesRef.current,toolId,
     panelId:options.panelId||'front',pointIndex:options.pointIndex??point,
     selectedSize:size,size:options.selectedSize||size,axis:options.axis||'x',amountMm:options.amountMm,
     targetPointIndex:options.targetPointIndex,sourcePointIndex:options.sourcePointIndex,
     referencePointIndex:options.referencePointIndex,clipboard:options.clipboard})
    if(response?.ok&&response.ruleSet){rulesRef.current=response.ruleSet;setRules(response.ruleSet)}
    return response
   }
   return R.createElement(R.Fragment,null,
    R.createElement(grade.default,{openValues:true,openCompare:true,onCloseValues:()=>{},onCloseCompare:()=>{},dockHost:bottom,topDockHost:top,
     tableProps:{snapshot,ruleSet:rules,panelId:'front',selectedPointIndex:point,selectedSize:size,
      onSelectSize:setSize,onSelectPoint:setPoint,visibleSizes:rules.sizes,onVisibleSizesChange:()=>{},
      onApplyRuleSet:next=>{setRules(next);return true},onGradeTool:onApply}}),
    R.createElement(finishing.CloFloatingPanel,{kind:'grading-quick-toolbar',title:'Grading Toolbar',open:true,active:true,onClose:()=>{},onActivate:()=>{}},
     R.createElement(quick.default,{snapshot,panelId:'front',selectedPointIndex:point,selectedSize:size,
      sizeNames:rules.sizes,onSelectSize:setSize,onSelectPoint:setPoint,onApply})),
    R.createElement(split.default,{host:top,edge:'top'}),
    R.createElement(split.default,{host:bottom,edge:'bottom'}))
  }
  root.render(R.createElement(App))
  window.__exoGradeTestCleanup=()=>{observer.disconnect();root.unmount();scope.remove()}
  return true
 })
 assert(setup)
 const quick=page.locator('[data-clo-floating-widget=grading-quick-toolbar]')
 const grading=page.locator('[data-exo-grade-bottom-widget=values]')
 const comparing=page.locator('[data-exo-grade-bottom-widget=compare]')
 await quick.waitFor({state:'visible'})
 await grading.waitFor({state:'visible'})
 await comparing.waitFor({state:'visible'})
 // Reference-style default: the narrow Grading Table shows six size rows with
 // visibility and color. Numeric point edits stay one explicit click away.
 assert.equal(await grading.locator('[data-grade-view="sizes"]').count(),1)
 assert.equal(await grading.locator('thead th').count(),3)
 assert.equal(await grading.locator('tbody tr:first-child > *').count(),3,'Size-only mode must not leave invisible measurement columns')
 assert.equal(await grading.locator('tbody tr').count(),6)
 assert.equal(await comparing.locator('thead th').count(),6)
 assert.equal(await comparing.locator('tbody tr').count(),6)
 const inspect=await page.evaluate(()=>{
  const read=(kind)=>{
   const widget=document.querySelector(`[data-exo-grade-bottom-widget="${kind}"]`)
   const grid=widget.querySelector('.optitex-grading-table'),scroll=widget.querySelector('.optitex-table-scroll')
   const tr=widget.querySelector('tbody tr'),cell=tr.querySelector('td'),last=widget.querySelector('tbody tr:last-child')
   const info=node=>{const c=getComputedStyle(node),r=node.getBoundingClientRect();return {height:Math.round(r.height),bottom:Math.round(r.bottom),background:c.backgroundColor,color:c.color,overflow:c.overflowY}}
   const table=widget.querySelector('.optitex-table-scroll table')
   return {widget:info(widget),grid:info(grid),scroll:info(scroll),row:info(tr),cell:info(cell),last:info(last),
    tableWidth:Math.round(table.getBoundingClientRect().width),
    button:info(tr.querySelector('th button')),swatch:info(tr.querySelector('input[type=color]')||tr.querySelector('th')),
    vars:{paper:getComputedStyle(widget).getPropertyValue('--exo-measure-paper'),ink:getComputedStyle(widget).getPropertyValue('--exo-measure-ink')}}
  }
  return {values:read('values'),compare:read('compare')}
 })
 console.log('VISUAL_METRICS',JSON.stringify(inspect))
 for(const mode of ['values','compare']){
  const widget=inspect[mode]
  assert.equal(widget.widget.background,'rgb(255, 255, 255)','Chart paper must not be transparent over the dark workspace')
  assert.equal(widget.grid.background,'rgb(255, 255, 255)','Grid must share the same clean chart paper')
  assert(widget.last.bottom<=widget.scroll.bottom+1,`${mode} must show all six size rows without clipping or internal scrolling`)
  assert.equal(widget.scroll.overflow,'hidden')
 }
 assert(inspect.values.tableWidth<=155,'Grading size list should be a small 150px grid')
 assert(inspect.compare.tableWidth<=530,'Compare Length should remain a small left-aligned grid, not stretch across the dock')
 await page.screenshot({path:'integrations/clothcraft/output/exo-reference-grade-compare-20261028.png'})
 const diffFor=async size=>comparing.locator('tbody tr').filter({has:page.getByRole('button',{name:`Select grading size ${size}`})}).locator('td').nth(2).innerText()
 const initialDiff=Number(await diffFor('L'))
 const before=await page.evaluate(()=>window.__exoFunctionalGrade.rules.panels.front.pointOffsetsMm.L[1][0])
 assert.equal(before,0)
 assert.equal(initialDiff,0)
 await quick.getByRole('combobox',{name:'Quick grading selected size'}).selectOption('L')
 await quick.getByRole('combobox',{name:'Quick grading axis'}).selectOption('x')
 await quick.getByRole('spinbutton',{name:'Quick grade movement millimetres'}).fill('2')
 await quick.getByRole('button',{name:'Set grading'}).click()
 await page.waitForTimeout(170)
 const result=await page.evaluate(()=>({point:window.__exoFunctionalGrade.rules.panels.front.pointOffsetsMm.L[1],size:window.__exoFunctionalGrade.size}))
 const gradedDiff=Number(await diffFor('L'))
 assert.deepEqual(result.point,[2,0],'Native grading engine should commit 2 mm X movement into L source-matched rule')
 assert.equal(result.size,'L')
 assert(gradedDiff>1.8&&gradedDiff<2.2,'Compare Length must recalculate physically derived graded edge lengths: '+gradedDiff)
 await grading.getByRole('button',{name:'Offsets'}).click()
 assert.equal(await grading.locator('thead th').count(),7)
 assert.equal(await grading.getByRole('spinbutton',{name:'L grade point 2 X movement millimetres',exact:true}).inputValue(),'2')
 const xMovement=grading.getByRole('spinbutton',{name:'L grade point 2 X movement millimetres',exact:true})
 await xMovement.fill('')
 await xMovement.blur()
 assert.equal(await xMovement.inputValue(),'2','Empty X movement must restore the exact prior cell value on blur')
 assert.equal(await page.evaluate(()=>window.__exoFunctionalGrade.rules.panels.front.pointOffsetsMm.L[1][0]),2,
  'Empty X movement must leave native grading rules untouched')
 assert.equal(Number(await diffFor('L')),gradedDiff,'Empty X movement must leave physical contour comparison unchanged')
 await grading.getByRole('button',{name:'Copy grading'}).click()
 await grading.getByRole('combobox',{name:'Grading table point'}).selectOption('P3')
 await grading.getByRole('button',{name:'Paste grading'}).click()
 await page.waitForTimeout(100)
 assert.equal(await page.evaluate(()=>window.__exoFunctionalGrade.rules.panels.front.pointOffsetsMm.L[2][0]),2,
  'Table Paste must transfer copied L grading to destination point')
 await grading.getByRole('button',{name:'Clear grading'}).click()
 await page.waitForTimeout(100)
 assert.equal(await page.evaluate(()=>window.__exoFunctionalGrade.rules.panels.front.pointOffsetsMm.L[2][0]),0,
  'Table Clear must reset destination point grading')
 await grading.getByRole('combobox',{name:'Grading table point'}).selectOption('P2')
 assert.equal(Number(await diffFor('L')),gradedDiff,'Copy, paste and clear on another point must restore original comparison')
 await grading.getByRole('button',{name:'Toggle advanced grading controls'}).click()
 assert.equal(await grading.getByRole('button',{name:'Toggle advanced grading controls'}).getAttribute('aria-expanded'),'true')
 const movementVisible=await grading.locator('.optitex-inline-grade-motion').evaluate(element=>getComputedStyle(element).display!=='none'&&element.getBoundingClientRect().height>=17)
 assert.equal(movementVisible,true,'More must reveal real editable grade-axis and motion controls')
 await quick.getByRole('spinbutton',{name:'Quick grade movement millimetres'}).fill('')
 await quick.getByRole('button',{name:'Set grading'}).click()
 assert.equal(await quick.getByRole('button',{name:'Set grading'}).getAttribute('data-grade-action-result'),'rejected')
 assert.equal((await page.evaluate(()=>window.__exoFunctionalGrade.rules.panels.front.pointOffsetsMm.L[1][0])),2)
 assert.equal(Number(await diffFor('L')),gradedDiff)
 assert.deepEqual(errors,[])
 console.log(JSON.stringify({passed:true,realRuleEngine:true,sourcePanel:'front',size:'L',pointIndex:1,
  xOffsetMm:2,compareDifferenceMmBefore:initialDiff,compareDifferenceMmAfter:gradedDiff,
  invalidAmountRejected:true,emptyOffsetRestored:true,tableClipboardRoundTrip:true,tableUpdated:true,errors},null,2))
 // Closing the isolated browser releases the fixture and its portals without
 // invoking synchronous React unmount during a pending grading-table render.
}finally{await browser.close()}
