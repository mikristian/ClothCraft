// Evidence: signed, live CLO7 AX 3D toolbar hierarchy compared against the
// isolated EXO browser. This test never clicks or modifies CLO itself.
import assert from 'node:assert/strict'
import {readFileSync,mkdirSync} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright-core'
import {CLO7_3D_A,CLO7_3D_B} from '../../src/data/clo7ToolbarOrder.js'
import {getClo7NativeCapability} from '../../src/core/clo7NativeToolCapabilities.js'

const status=JSON.parse(readFileSync(path.join(os.homedir(),'Library/Application Support/EXO-CLO-Inspector/latest-status.json'),'utf8'))
assert(status.accessibility&&status.screenRecording&&status.cloWindowCount===1,'Signed CLO Inspector must have real access to one CLO window')
const firstWindow=status.cloWindows[0],origin=firstWindow.frame
assert(origin&&Number.isFinite(origin.x)&&Number.isFinite(origin.y),'Real CLO window origin required')
const nodes=[]
function walk(n){nodes.push(n);for(const c of n.children||[])walk(c)}
status.cloWindows.forEach(walk)
const columns=[['A',232,CLO7_3D_A],['B',268,CLO7_3D_B]]
for(const [name,x,slots] of columns){
  const actual=nodes.filter(n=>n.frame?.x-origin.x===x&&n.frame?.y-origin.y>=65&&
    ['AXButton','AXCheckBox','AXPopUpButton'].includes(n.role)&&n.name).sort((a,b)=>a.frame.y-b.frame.y)
  assert.equal(actual.length,slots.length,`Real CLO 3D ${name} count`)
  for(let i=0;i<slots.length;i++){
    assert.equal(actual[i].name,slots[i].label,`Real CLO 3D ${name} row ${i+1} label`)
    assert.equal(actual[i].frame.y-actual[0].frame.y,slots[i].observedY-slots[0].observedY,
      `Real CLO 3D ${name} row ${i+1} relative position`)
    assert.equal(actual[i].frame.width,34,`Real CLO 3D ${name} button width`)
    assert.equal(actual[i].frame.height,30,`Real CLO 3D ${name} button height`)
  }
}
assert.equal(getClo7NativeCapability('3d','A06')?.nativeAction,'sewing.segmentSew')
assert.equal(getClo7NativeCapability('3d','A07')?.nativeAction,'sewing.freeSew')

const base=process.env.EXO_TOOLBAR_QA_URL||'http://127.0.0.1:5199/?desktop=1'
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try{
  const page=await browser.newPage({viewport:{width:1680,height:1050}})
  const errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.goto(base,{waitUntil:'domcontentloaded'})
  const nativeMode=await page.locator('[data-native-clothcraft="true"]').count()>0
  const report={}
  for(const [name,,slots] of columns){
    const column=page.getByRole('toolbar',{name:name==='A'?'3D editing column A':'3D garment column B'})
    await column.waitFor({timeout:25000})
    const observed=await column.locator('[data-clo-slot]').evaluateAll(elements=>elements.map(el=>{
      const box=el.getBoundingClientRect(),img=el.querySelector('.cad-tool-icon')
      return {id:el.dataset.cloSlot,label:el.getAttribute('aria-label'),title:el.title,top:box.top,left:box.left,width:box.width,height:box.height,
        mode:el.dataset.cloImplementation,divider:el.dataset.cloGroupEnd==='true',imageTag:img?.tagName.toLowerCase(),
        glyphContent:img?.tagName.toLowerCase()==='svg'?img.querySelectorAll('path,rect,circle,ellipse,polygon,line').length:img?.naturalWidth}
    }))
    assert.equal(observed.length,slots.length,`EXO 3D ${name} count`)
    for(let i=0;i<slots.length;i++){
      const p=observed[i],ref=slots[i],cap=getClo7NativeCapability('3d',ref.id)
      assert.equal(p.id,`3d:${ref.id}`)
      assert(p.label===ref.label||p.label===`Inspect ${ref.label}`,`Wrong 3D ${name}${i+1} name: ${p.label}`)
      assert(p.title.includes(ref.label))
      // V1 intentionally disables CLO-specific Rust commands; only the
      // embedded native V2 editor advertises this capability registry.
      if(nativeMode)assert.equal(p.mode,cap?.mode||'unavailable')
      assert(Math.abs(p.top-observed[0].top-(ref.observedY-slots[0].observedY))<=1,`3D ${name}${i+1} has incorrect Y offset`)
      assert(Math.abs(p.height-30)<=1,`3D ${name}${i+1} button height`)
      assert.equal(p.divider,Boolean(slots[i+1]&&slots[i+1].observedY-ref.observedY>=40),`3D ${name}${i+1} divider`)
      assert(p.glyphContent>0,`3D ${name}${i+1} has empty icon`)
    }
    report[name]=observed
  }
  assert(Math.abs(report.A[0].top-report.B[0].top)<=1,'Simulate/Play Motion first row misaligned')
  assert(Math.abs(report.A[1].top-report.B[1].top)<=1,'Select/Move/Edit Line second row misaligned')
  assert(Math.abs(report.B[0].left-report.A[0].left-36)<=3,'CLO 3D reference column distance should be 36px')
  assert.deepEqual(errors,[],`Browser runtime errors: ${errors.join(', ')}`)
  const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'output')
  mkdirSync(dir,{recursive:true})
  const screenshot=path.join(dir,'clo-left-two-bars-after-20261017.png')
  await page.locator('.clo-observed-3d-bars').screenshot({path:screenshot})
  console.log(JSON.stringify({pass:true,source:'Live signed CLO7 AX',columns:{A:report.A.length,B:report.B.length},
    topPair:['Simulate','Play Motion'],secondPair:['Select/Move','Edit Line (3D Pattern)'],
    geometryTolerancePx:1,geometryPageEngine:nativeMode?'Rust V2':'EXO shell',segmentAndFreeSewDistinct:true,browserErrors:errors,screenshot},null,2))
}finally{await browser.close()}
