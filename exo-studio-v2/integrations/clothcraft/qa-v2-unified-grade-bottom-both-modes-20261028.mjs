import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu','--no-first-run']})
const page=await browser.newPage({viewport:{width:1600,height:980}})
const errors=[];page.on('pageerror',err=>errors.push(err.message))
try{
 await page.goto('http://127.0.0.1:5973/?desktop=1&engine=clothcraft&testSession=grade-bottom-both-20261028',{waitUntil:'domcontentloaded',timeout:30000})
 await page.locator('.main-layout').waitFor({timeout:20000})
 const results=[]
 for(const mode of ['split','2d']){
  await page.getByRole('combobox',{name:'3D and 2D window arrangement'}).selectOption(mode)
  const root=page.locator('.cc-embedded-root').first();await root.waitFor({state:'visible'})
  const bottom=root.locator('[data-exo-grade-dock-host="true"][data-exo-dock-edge="bottom"]');await bottom.waitFor({state:'visible'})
  for(const [name,kind] of [['Grading Table','values'],['Compare Length','compare']]){
   await bottom.getByRole('button',{name,exact:true}).click()
   const widget=page.locator(`.exo-grade-bottom-widget[data-exo-grade-bottom-widget="${kind}"]`)
   await widget.locator('.exo-grade-widget-placement').selectOption('bottom')
   await page.waitForTimeout(100)
  }
  await page.waitForTimeout(250)
  const data=await root.evaluate(node=>{const host=node.querySelector('[data-exo-dock-edge="bottom"]'),editor=node.querySelector('.cc-embedded-main'),widgets=[...host.querySelectorAll('.exo-grade-bottom-widget--docked')];const b=x=>x.getBoundingClientRect().toJSON();return{mode:node.className,host:b(host),editor:b(editor),widgets:widgets.map(w=>({kind:w.dataset.exoGradeBottomWidget,rect:b(w),content:b(w.querySelector('.exo-grade-bottom-widget__content'))})),occupied:host.dataset.exoGradeDockOccupied}})
  assert.equal(data.widgets.length,2,`${mode} should dock two widgets: ${JSON.stringify(data)}`)
  assert(data.host.top>=data.editor.bottom-3,`${mode} dock must be entirely below canvas`)
  assert(data.host.height>=190,`${mode} dock must show readable table height`)
  assert(data.widgets.every(w=>w.content.height>70&&w.rect.width>160),`${mode} readable docked table content`)
  results.push({mode,hostHeight:data.host.height,hostWidth:data.host.width,editorHeight:data.editor.height,widgets:data.widgets.map(w=>({kind:w.kind,width:Math.round(w.rect.width),contentHeight:Math.round(w.content.height)}))})
  for(const kind of ['values','compare'])await bottom.locator(`.exo-grade-bottom-widget[data-exo-grade-bottom-widget="${kind}"]`).getByRole('button',{name:`Close ${kind==='values'?'Grading Table':'Compare Length'}`}).click()
 }
 assert.equal(errors.length,0,errors.join('; '))
 console.log(JSON.stringify({ok:true,results},null,2))
}finally{await browser.close()}
