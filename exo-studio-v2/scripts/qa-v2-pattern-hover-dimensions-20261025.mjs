import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const url=process.env.EXO_QA_UI||'http://127.0.0.1:5386'
const browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
const errors=[]
try{
  const page=await browser.newPage({viewport:{width:1728,height:1040}})
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto(url+'/?desktop=1&engine=clothcraft&testSession=pattern-hover-measurement',
    {waitUntil:'domcontentloaded',timeout:30000})
  await page.locator('[data-2d-guide-panel="front"] [data-2d-guide-track="chest"]')
    .first().waitFor({state:'attached',timeout:45000})
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'select'}})))
  await page.locator('svg[data-native-tool="select"]').first().waitFor()
  const measurements=[]
  for(const panel of ['front','back'])for(const kind of ['chest','belly',`center-${panel}`]){
    const groups=await page.locator(`[data-2d-guide-panel="${panel}"] [data-guide-kind="${kind}"]`).all()
    assert(groups.length>0,`${panel}: ${kind} missing`)
    for(const target of kind.startsWith('center-')?[groups[0]]:groups){
    const id=await target.getAttribute('data-guide-id')
    const midpoint=await target.evaluate(element=>{
      const line=element.querySelector('line:not([stroke="transparent"])')
      if(!line)throw Error('missing physical guide stroke')
      const p=new DOMPoint((Number(line.getAttribute('x1'))+Number(line.getAttribute('x2')))/2,
        (Number(line.getAttribute('y1'))+Number(line.getAttribute('y2')))/2)
        .matrixTransform(line.getScreenCTM())
      return {x:p.x,y:p.y}
    })
    await page.mouse.move(midpoint.x,midpoint.y)
    await page.waitForTimeout(90)
    const readout=page.locator('[data-2d-guide-length]')
    assert.equal(await readout.count(),1,`${panel} ${kind} no hover measurement`)
    assert.equal(await readout.getAttribute('data-2d-guide-length'),id,
      `${panel} ${kind} hover shows wrong measurement`)
    assert(Number(await readout.getAttribute('data-guide-length-metres'))>.005,
      `${panel} ${kind} measured zero`)
    measurements.push({panel,kind,id,text:await readout.textContent()})
    if(kind.startsWith('center-')){
      await page.mouse.click(midpoint.x,midpoint.y)
      await page.waitForTimeout(90)
      assert.equal(await page.locator('[data-2d-guide-length]').getAttribute('data-2d-guide-length'),id,
        `centerline ${panel} split after selection`)
    }
    }
  }
  assert.deepEqual(errors,[])
  console.log(JSON.stringify({pass:true,measurements,errors},null,2))
}finally{await browser.close()}
