// Read-only SVG paint and independent guide-half hover regression QA.
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const ui=process.env.EXO_GUIDE_QA_UI||'http://127.0.0.1:5284'
const bridge=process.env.EXO_GUIDE_QA_BRIDGE||'http://127.0.0.1:5385'
const snapshot=async()=>{
  const response=await fetch(bridge+'/workspace',{method:'POST',headers:{Origin:ui,'Content-Type':'application/json'},
    body:JSON.stringify({op:'snapshot'}),signal:AbortSignal.timeout(12000)})
  assert(response.ok,`Snapshot HTTP ${response.status}`)
  const body=await response.json()
  assert(body.ok,JSON.stringify(body.error))
  return body.data
}
const before=await snapshot()
const errors=[]
const results={url:ui,revisionBefore:before.revision,centers:[],hover:[],errors}
const browser=await chromium.launch({headless:true,
  executablePath:process.env.EXO_GUIDE_QA_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
let page
try{
  page=await browser.newPage({viewport:{width:1728,height:1040}})
  page.on('pageerror',e=>errors.push(e.message))
  await page.goto(ui+'/?desktop=1&engine=clothcraft&testSession=center-segment-contrast-readonly',
    {waitUntil:'domcontentloaded',timeout:30000})
  const twoD=page.getByRole('button',{name:'2D only',exact:true})
  if(await twoD.count())await twoD.first().click()
  await page.locator('[data-2d-guide-panel="front"] [data-2d-guide-track="chest"]')
    .first().waitFor({state:'attached',timeout:45000})
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'select'}})))
  await page.locator('svg[data-native-tool="select"]').first().waitFor({timeout:10000})
  assert.equal(await page.locator('.cc-board').first().getAttribute('data-reference-guides-visible'),'true')

  const measure=async(panel,kind)=>page.evaluate(({panel,kind})=>{
    const root=document.querySelector(`[data-2d-guide-panel="${panel}"]`)
    return [...(root?.querySelectorAll(`[data-guide-kind="${kind}"][data-guide-id]`)||[])].map(group=>{
      const line=group.querySelector('line:not([stroke="transparent"])')
      if(!line)return null
      const css=getComputedStyle(line),m=line.getScreenCTM()
      if(!m)return null
      const a=new DOMPoint(+line.getAttribute('x1'),+line.getAttribute('y1')).matrixTransform(m)
      const b=new DOMPoint(+line.getAttribute('x2'),+line.getAttribute('y2')).matrixTransform(m)
      const ref=root.closest('[data-2d-reference-layer]')
      const paper=root.closest('[data-2d-pattern-piece]')?.querySelector('[data-pattern-surface="drafting-paper"]')
      const piece=root.closest('[data-2d-pattern-piece]')
      const order=paper&&ref&&piece?Boolean(paper.compareDocumentPosition(ref)&Node.DOCUMENT_POSITION_FOLLOWING):false
      const opacity=[line,group,root,ref].filter(Boolean).reduce((v,n)=>v*Number(getComputedStyle(n).opacity),1)
      return {id:group.dataset.guideId,hovered:group.dataset.hovered,x:(a.x+b.x)/2,y:(a.y+b.y)/2,
        endpoints:[[a.x,a.y],[b.x,b.y]],
        lengthPx:Math.hypot(a.x-b.x,a.y-b.y),stroke:css.stroke,strokeAttribute:line.getAttribute('stroke'),
        strokeWidthPx:parseFloat(css.strokeWidth),dasharray:css.strokeDasharray,vectorEffect:css.vectorEffect,
        opacity,paintAbovePaper:order,clipPath:getComputedStyle(root).clipPath,
        display:css.display,visibility:css.visibility}
    }).filter(Boolean)
  },{panel,kind})

  for(const panel of ['front','back']){
    const centers=await measure(panel,`center-${panel}`)
    assert(centers.length>0,`${panel}: center guide has no rendered SVG lines`)
    const resting=centers.filter(s=>s.lengthPx>8)
    assert(resting.length>0,`${panel}: center has no drawable segment longer than 8 screen pixels`)
    for(const c of resting){
      assert(c.stroke!=='none'&&c.stroke!=='rgba(0, 0, 0, 0)'&&c.stroke!=='transparent',`${panel}: center stroke invisible ${JSON.stringify(c)}`)
      assert(c.strokeWidthPx>=2,`${panel}: resting center stroke less than 2 CSS px ${JSON.stringify(c)}`)
      assert(c.dasharray!=='none'&&c.dasharray!=='',`${panel}: center must be dashed ${JSON.stringify(c)}`)
      assert(c.opacity>0,`${panel}: center fully transparent ${JSON.stringify(c)}`)
      assert(c.paintAbovePaper,`${panel}: center reference painted behind paper`)
      assert(c.display!=='none'&&c.visibility==='visible',`${panel}: center display hidden`)
      assert(c.vectorEffect==='non-scaling-stroke',`${panel}: center stroke must stay screen-sized`)
    }
    results.centers.push({panel,segments:centers})
    for(const kind of ['chest','belly']){
      const halves=await measure(panel,kind)
      const left=halves.find(s=>s.id.endsWith(':left')&&s.lengthPx>8)
      const right=halves.find(s=>s.id.endsWith(':right')&&s.lengthPx>8)
      assert(left&&right,`${panel}/${kind}: both drawable halves required: ${JSON.stringify(halves)}`)
      for(const target of [left,right]){
        let acquired=false
        for(const t of [.25,.5,.75]){
          const [[ax,ay],[bx,by]]=target.endpoints
          await page.mouse.move(ax+(bx-ax)*t,ay+(by-ay)*t,{steps:5})
          await page.waitForTimeout(110)
          const current=await measure(panel,kind)
          if(current.some(s=>s.id===target.id&&s.hovered==='true')){acquired=true;break}
        }
        assert(acquired,`${panel}/${kind}: hover target never acquired at 25/50/75% of ${target.id}`)
        const states=await measure(panel,kind)
        const active=states.filter(s=>s.hovered==='true')
        const color='#009dff'
        const exact=states.filter(s=>s.strokeAttribute?.toLowerCase()===color)
        const opposite=states.find(s=>s.id===(target.id===left.id?right.id:left.id))
        assert.deepEqual(active.map(s=>s.id),[target.id],`${panel}/${kind}: hover not isolated`)
        assert.deepEqual(exact.map(s=>s.id),[target.id],`${panel}/${kind}: exactly one ${color} stroke expected; ${JSON.stringify(states)}`)
        assert(opposite?.strokeAttribute?.toLowerCase()!==color,`${panel}/${kind}: opposite half became blue`)
        results.hover.push({panel,kind,target:target.id,active:active.map(s=>s.id),colored:exact.map(s=>s.id),oppositeStroke:opposite.strokeAttribute})
      }
    }
  }
  await page.mouse.move(2,2)
  assert.deepEqual(errors,[],'Browser runtime errors')
  const after=await snapshot()
  results.revisionAfter=after.revision
  assert.equal(after.revision,before.revision,'Native garment revision changed during read-only QA')
  assert.deepEqual(after,before,'Native snapshot changed during read-only QA')
  console.log(JSON.stringify({pass:true,...results},null,2))
}catch(e){
  console.error(JSON.stringify({pass:false,error:String(e.stack||e),...results},null,2))
  process.exitCode=1
}finally{
  await page?.close().catch(()=>{})
  await browser.close()
}
