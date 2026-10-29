/** Chart skin parity: floating and docked, theme switch, compact nested grading tools. */
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu','--no-first-run']})
try{
 const page=await browser.newPage({viewport:{width:1550,height:1030}})
 page.setDefaultTimeout(8500)
 const errors=[]
 page.on('pageerror',error=>errors.push(error.message))
 await page.route('**/src/main.jsx',route=>route.fulfill({status:200,contentType:'application/javascript',body:''}))
 await page.goto(process.env.EXO_UI_URL||'http://127.0.0.1:5958',{waitUntil:'domcontentloaded'})
 await page.evaluate(async()=>{
  const [react,dom,widgets,toolbar,quick,colors]=await Promise.all([
   import('/node_modules/.vite/deps/react.js'),import('/node_modules/.vite/deps/react-dom_client.js'),
   import('/src/components/OptitexGradeBottomDock20261027.jsx'),
   import('/src/components/CloFinishingToolWidgets.jsx'),
   import('/src/components/ExoGradingQuickToolbar20261028.jsx'),
   import('/src/core/exoSettingsColorPresets20261028.js'),
  ])
  const R=react.default
  for(const id of ['values','compare'])localStorage.setItem(`exo.grade.bottom-widget.v3.${id}.v1`,JSON.stringify({docked:id==='values',dockEdge:'bottom',x:id==='values'?100:450,y:420,minimized:false}))
  localStorage.setItem('exo.widget.bottom-docked.grading-quick-toolbar.v2','false')
  const scope=document.createElement('section')
  scope.className='cc-embedded-root cc-embedded-2d cc-rust-embedded'
  scope.style.cssText='position:fixed;left:44px;top:50px;width:1400px;height:910px;display:flex;flex-direction:column;z-index:100000;background:#293440'
  scope.innerHTML='<section data-exo-grade-dock-host="true" data-exo-dock-edge="bottom" class="exo-grade-workspace-dock-host" style="height:276px;min-height:276px;position:relative"><div class="exo-bottom-dock-rail">BOTTOM</div></section><div id="exo-theme-fixture"></div>'
  document.body.append(scope)
  const bottom=scope.querySelector('[data-exo-dock-edge=bottom]')
  bottom.addEventListener('exo-dock-request-height',event=>{if(Number.isFinite(event.detail?.height)){bottom.style.height=event.detail.height+'px';bottom.style.minHeight=event.detail.height+'px'}})
  const observer=new MutationObserver(()=>{bottom.dataset.exoGradeDockOccupied=String(!!bottom.querySelector('.exo-grade-bottom-widget--docked'))})
  observer.observe(scope,{childList:true,subtree:true})
  const root=dom.default.createRoot(scope.querySelector('#exo-theme-fixture'))
  const App=()=>{
   const [theme,setTheme]=R.useState('graphite')
   const [chartMode,setChartMode]=R.useState('auto')
   const [nested,setNested]=R.useState(null)
   const [visible,setVisible]=R.useState(true)
   const mainColors={panelColor:theme==='graphite'?'#33383e':'#553544',accent:theme==='graphite'?'#82b3de':'#e3a8c7'}
   const prefs={gradeChartThemeMode:chartMode,gradeTableColorTheme:'paper',compareLengthColorTheme:'night'}
   const chartThemes=colors.resolveExoGradeChartThemes20261028(prefs,mainColors)
   window.__exoQaTheme=chartThemes
   const tableProps={visibleSizes:visible?['XS','S','M','L','XL','XXL']:[],
     onVisibleSizesChange:()=>setVisible(v=>!v),chartThemes}
   return R.createElement(R.Fragment,null,
    R.createElement('button',{id:'exo-change-theme',onClick:()=>setTheme(v=>v==='graphite'?'rose':'graphite')},'Change theme'),
    R.createElement('button',{id:'exo-toggle-chart-mode',onClick:()=>setChartMode(v=>v==='auto'?'custom':'auto')},'Toggle chart override'),
    R.createElement(widgets.default,{openValues:true,openCompare:true,onCloseValues:()=>{},onCloseCompare:()=>{},
     onEmbedToolbar:name=>setNested(name),dockHost:bottom,tableProps}),
    R.createElement(toolbar.CloFloatingPanel,{kind:'grading-quick-toolbar',title:'Grading Toolbar',open:true,active:true,
     onClose:()=>{},onActivate:()=>{},embedTarget:nested,embedRequest:0},
     R.createElement(quick.default,{snapshot:{template:{panels:[]}}})))
  }
  root.render(R.createElement(App))
  window.__exoThemeCleanup=()=>{observer.disconnect();root.unmount();scope.remove()}
 })
 const values=page.locator('[data-exo-grade-bottom-widget="values"]')
 const compare=page.locator('[data-exo-grade-bottom-widget="compare"]')
 const quick=page.locator('[data-clo-floating-widget="grading-quick-toolbar"]')
 await values.waitFor({state:'visible'});await compare.waitFor({state:'visible'})
 async function inspect(){return page.evaluate(()=>{
  const result={}
  const c=node=>node?getComputedStyle(node):null
  for(const id of ['values','compare']){
   const w=document.querySelector(`[data-exo-grade-bottom-widget="${id}"]`)
   const grid=w?.querySelector('.optitex-grading-table'),table=grid?.querySelector('table'),rows=[...grid?.querySelectorAll('tbody tr')||[]]
   const scroll=grid?.querySelector('.optitex-table-scroll')
   const last=rows[5]
   const first=rows[0]
   const swatch=first?.querySelector('input[type=color]')
   const checkbox=first?.querySelector('input[type=checkbox]')
   const firstCell=first?.querySelector('td')
   const sizeButton=first?.querySelector('th button')
   result[id]={docked:w?.dataset.docked,paper:c(grid)?.backgroundColor,ink:c(table)?.color,
    tableWidth:Math.round(table?.getBoundingClientRect().width||0),rows:rows.length,
    headerHeight:Math.round(grid?.querySelector('thead')?.getBoundingClientRect().height||0),
    rowHeight:Math.round(rows[0]?.getBoundingClientRect().height||0),
    visible:!!last&&last.getBoundingClientRect().bottom<=scroll.getBoundingClientRect().bottom+2,
    overflow:c(scroll)?.overflowY,
    lastBottom:Math.round(last?.getBoundingClientRect().bottom||0),
    scrollBottom:Math.round(scroll?.getBoundingClientRect().bottom||0),
    swatchHeight:Math.round(swatch?.getBoundingClientRect().height||0),
    buttonHeight:Math.round(sizeButton?.getBoundingClientRect().height||0),
    cellHeight:Math.round(first?.querySelector('td')?.getBoundingClientRect().height||0),
    checkboxStyle:checkbox?{height:c(checkbox).height,margin:c(checkbox).margin,display:c(checkbox).display}:null,
    cellStyle:firstCell?{height:c(firstCell).height,minHeight:c(firstCell).minHeight,padding:c(firstCell).padding,lineHeight:c(firstCell).lineHeight}:null,
    computedVars:{paper:c(w)?.getPropertyValue('--exo-measure-paper'),header:c(w)?.getPropertyValue('--exo-measure-header'),ink:c(w)?.getPropertyValue('--exo-measure-ink')}}
  }
  const t=document.querySelector('[data-clo-floating-widget="grading-quick-toolbar"]')
  const iconButtons=[...t?.querySelectorAll('.exo-quick-grade__grid button')||[]]
  result.toolbar={in:t?.dataset.embeddedIn,background:c(t)?.backgroundColor,ink:c(t)?.color,
   height:Math.round(t?.getBoundingClientRect().height||0),count:iconButtons.length,
   iconBackground:c(iconButtons[0])?.backgroundColor,iconInk:c(iconButtons[0])?.color,
   computedVars:{paper:c(t)?.getPropertyValue('--exo-measure-paper'),header:c(t)?.getPropertyValue('--exo-measure-header'),ink:c(t)?.getPropertyValue('--exo-measure-ink')},
   iconRows:[...new Set(iconButtons.map(b=>Math.round(b.getBoundingClientRect().top)))].length,
   allIconsVisible:iconButtons.every(b=>b.getBoundingClientRect().width>=11&&b.getBoundingClientRect().height>=15&&b.getBoundingClientRect().right<=t.getBoundingClientRect().right+1)}
  return result
 })}
 const first=await inspect();console.log('FLOAT_VS_DOCK',JSON.stringify(first))
 assert.equal(first.values.rows,6);assert.equal(first.compare.rows,6)
 assert(first.values.visible,'Undocked grading toolkit must show all six rows at default dock height')
 assert.equal(first.values.ink,first.compare.ink,'Floating and embedded grids must use same ink')
 assert.equal(first.values.paper,first.compare.paper,'Floating and embedded grids must use same paper')
 assert(first.values.rowHeight>=15&&first.values.rowHeight<=24)
 assert(first.compare.rowHeight>=15&&first.compare.rowHeight<=24)
 await page.locator('#exo-change-theme').click()
 const changed=await inspect();console.log('THEME_SWITCH',JSON.stringify(changed))
 assert.notEqual(changed.values.paper,first.values.paper,'Auto theme must react to studio palette')
 assert.equal(changed.values.paper,changed.compare.paper)
 await values.getByRole('combobox',{name:'Grading Table placement'}).selectOption('floating')
 await compare.getByRole('combobox',{name:'Compare Length placement'}).selectOption('bottom')
 await page.waitForTimeout(120)
 const reversed=await inspect()
 console.log('REVERSED_FLOAT_DOCK',JSON.stringify({values:reversed.values,compare:reversed.compare}))
 assert.equal(reversed.values.docked,'false')
 assert.equal(reversed.compare.docked,'true')
 assert.equal(reversed.values.tableWidth,changed.values.tableWidth,'Floating grading grid must remain the same 150px table')
 assert.equal(reversed.compare.tableWidth,changed.compare.tableWidth,'Docked length grid must remain the same 525px table')
 assert.equal(reversed.values.paper,reversed.compare.paper)
 await values.getByRole('combobox',{name:'Grading Table placement'}).selectOption('bottom')
 await compare.getByRole('combobox',{name:'Compare Length placement'}).selectOption('floating')
 await page.waitForTimeout(120)
 await values.getByRole('button',{name:'Embed Grading Toolbar in Grading Table'}).click()
 await page.waitForTimeout(180)
 let nested=await inspect();console.log('NESTED_VALUES',JSON.stringify(nested))
 assert.equal(nested.toolbar.in,'values')
 assert(nested.values.visible,'Nested toolbar must not clip the sixth grading size')
 assert.equal(nested.toolbar.count,12)
 assert(nested.toolbar.height<=58,'Nested toolbar must stay under 58px')
 assert.equal(nested.toolbar.iconRows,1,'Nested toolbar must have just one icon row at available width')
 assert.equal(nested.toolbar.background,'rgb(99, 70, 84)','Nested toolbar must match the rose chart header')
 assert.equal(nested.toolbar.iconInk,nested.values.ink,'Nested grading icons must inherit chart text color')
 assert.equal(nested.toolbar.iconBackground,'rgb(255, 255, 255)'===nested.values.paper?'rgb(255, 255, 255)':nested.toolbar.iconBackground)
 assert(nested.toolbar.allIconsVisible,'All 12 grading icons must be visible inside nested toolbar')
 await quick.getByRole('combobox',{name:'Grading toolbar placement'}).selectOption('compare')
 await page.waitForTimeout(100)
 nested=await inspect();console.log('NESTED_COMPARE',JSON.stringify(nested))
 assert.equal(nested.toolbar.in,'compare')
 assert.equal(nested.toolbar.count,12)
 assert(nested.toolbar.height<=58)
 assert.equal(nested.toolbar.background,'rgb(99, 70, 84)')
 assert.equal(nested.toolbar.iconInk,nested.compare.ink)
 assert(nested.toolbar.allIconsVisible)
 await page.locator('#exo-toggle-chart-mode').click()
 const custom=await inspect()
 console.log('EXPLICIT_CUSTOM_MODE',JSON.stringify({values:custom.values.paper,compare:custom.compare.paper}))
 assert.notEqual(custom.values.paper,custom.compare.paper,'Explicit custom setting should allow independent table colors')
 await page.locator('#exo-toggle-chart-mode').click()
 const restored=await inspect()
 assert.equal(restored.values.paper,restored.compare.paper,'Returning to automatic must restore both tables')
 assert.equal(restored.toolbar.iconInk,restored.compare.ink,'Embedded toolbar must restore automatic palette too')
 assert.deepEqual(errors,[])
 console.log('PASS auto theme, floating/docked chart parity, nested widget toolbar in both grids')
}finally{await browser.close()}
