// Checks the native 2D CLO A/B toolbar spacing against freshly observed AX
// positions without modifying or focusing the actual CLO application.
import assert from 'node:assert/strict'
import {readFileSync,mkdirSync} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright-core'
import {CLO7_2D_A,CLO7_2D_B} from '../../src/data/clo7ToolbarOrder.js'
import {getClo7NativeCapability} from '../../src/core/clo7NativeToolCapabilities.js'

const ax=JSON.parse(readFileSync(path.join(os.homedir(),'Library/Application Support/EXO-CLO-Inspector/latest-status.json'),'utf8'))
assert(ax.accessibility&&ax.screenRecording&&ax.cloWindowCount>0,'Fresh CLO access is required')
const origin=ax.cloWindows[0]?.frame
assert(origin,'Missing CLO source window')
const nodes=[]
function walk(n){nodes.push(n);for(const child of n.children||[])walk(child)}
ax.cloWindows.forEach(walk)
const columns=[['A',1096,CLO7_2D_A],['B',1132,CLO7_2D_B]]
for(const [name,x,slots] of columns){
  const actual=nodes.filter(n=>n.frame?.x-origin.x===x&&n.frame?.y-origin.y>=65&&
    ['AXButton','AXCheckBox','AXPopUpButton'].includes(n.role)&&n.name)
    .sort((a,b)=>a.frame.y-b.frame.y)
  assert.equal(actual.length,slots.length,`Live CLO 2D column ${name} count`)
  for(let i=0;i<slots.length;i++){
    assert.equal(actual[i].name,slots[i].label,`CLO 2D ${name} title at row ${i+1}`)
    assert.equal(actual[i].frame.y-actual[0].frame.y,slots[i].observedY-slots[0].observedY)
  }
}
assert.equal(getClo7NativeCapability('2d','B02')?.nativeAction,'sewing.segmentSew')
assert.equal(getClo7NativeCapability('2d','B03')?.nativeAction,'sewing.freeSew')

const address=process.env.EXO_TOOLBAR_QA_URL||'http://127.0.0.1:5199/?desktop=1'
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try{
  const page=await browser.newPage({viewport:{width:1680,height:1000}})
  const pageErrors=[]
  page.on('pageerror',e=>pageErrors.push(e.message))
  await page.goto(address,{waitUntil:'domcontentloaded'})
  const out={}
  for(const [name,,slots] of columns){
    const column=page.locator(`.clo-right-tool-palette [aria-label="CLO 2D column ${name}"]`)
    await column.waitFor({timeout:25000})
    const buttons=await column.locator('[data-clo-slot]').evaluateAll(elements=>elements.map(el=>{
      const r=el.getBoundingClientRect()
      return {id:el.dataset.cloSlot,label:el.getAttribute('aria-label'),top:r.top,left:r.left,width:r.width,height:r.height,
        divider:el.dataset.cloDividerAfter==='true'}
    }))
    assert.equal(buttons.length,slots.length,`EXO 2D column ${name} count`)
    for(let i=0;i<slots.length;i++){
      assert.equal(buttons[i].id,`2d:${slots[i].id}`,`EXO slot ${name}${i+1}`)
      assert.equal(buttons[i].label,slots[i].label,`EXO label ${name}${i+1}`)
      assert(Math.abs(buttons[i].top-buttons[0].top-(slots[i].observedY-slots[0].observedY))<=1,
        `EXO ${name}${i+1} vertical drift`)
      assert(Math.abs(buttons[i].height-30)<=1,`EXO ${name}${i+1} height differs from live CLO`)
      assert.equal(buttons[i].divider,Boolean(slots[i+1]&&slots[i+1].observedY-slots[i].observedY>=40),
        `EXO ${name}${i+1} divider does not match live vertical gap`)
    }
    out[name]=buttons
  }
  assert(Math.abs(out.A[0].top-out.B[0].top)<=1,'Top row Transform Pattern / Edit Sewing must align')
  assert(Math.abs(out.A[1].top-out.B[1].top)<=1,'Second row Edit Pattern / Segment Sewing must align')
  assert(Math.abs(out.B[0].left-out.A[0].left-36)<=3,'CLO columns should be 36px apart')
  assert.deepEqual(pageErrors,[],'Browser errors')
  const screenshotDir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'output')
  mkdirSync(screenshotDir,{recursive:true})
  const screenshot=path.join(screenshotDir,'clo-right-two-bars-after-20261017.png')
  await page.locator('.clo-observed-bars').screenshot({path:screenshot})
  console.log(JSON.stringify({ok:true,source:'Signed live CLO Accessibility report',slots:{A:out.A.length,B:out.B.length},
    topPair:[out.A[0].label,out.B[0].label],segmentSewingSeparated:true,
    maxVerticalErrorPx:1,browserErrors:pageErrors,screenshot},null,2))
}finally{await browser.close()}
