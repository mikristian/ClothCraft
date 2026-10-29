// Read-only verification against the actual signed V2 web endpoint.
// Inspects existing frontend SVG guides and native revision without edits.
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const base=process.env.EXO_GUIDE_QA_UI || 'http://127.0.0.1:5386'
const bridge=process.env.EXO_GUIDE_QA_BRIDGE || 'http://127.0.0.1:5385'
const snapshot=async()=>{
  const response=await fetch(bridge+'/workspace',{method:'POST',
    headers:{'Origin':base,'Content-Type':'application/json'},
    body:JSON.stringify({op:'snapshot'}),signal:AbortSignal.timeout(15000)})
  const json=await response.json()
  assert.equal(json.ok,true,JSON.stringify(json.error))
  return json.data
}
const before=await snapshot()
const browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
const errors=[]
try{
  const page=await browser.newPage({viewport:{width:1512,height:900}})
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto(base+'/?desktop=1&engine=clothcraft&testSession=guide-crossing-check',
    {waitUntil:'domcontentloaded',timeout:30000})
  await page.locator('[data-2d-guide-panel="front"] [data-2d-guide-track="chest"]')
    .first().waitFor({state:'attached',timeout:45000})
  const result=await page.evaluate(()=>{
    const svg=document.querySelector('.cc-board svg[data-native-tool]')
    const board=document.querySelector('.cc-board')
    const transform=(node,x,y)=>new DOMPoint(x,y).matrixTransform(node.getScreenCTM())
    const output={}
    for(const panel of ['front','back']){
      const container=svg.querySelector('[data-2d-guide-panel="'+panel+'"]')
      if(!container)continue
      const center=container.querySelector('[data-2d-guide-track="center-'+panel+'"]')
      const chest=container.querySelector('[data-2d-guide-track="chest"]')
      const waist=container.querySelector('[data-2d-guide-track="belly"]')
      if(!center||!chest||!waist)throw Error('Missing vertical/chest/waist guides: '+panel)
      const segments=[...center.querySelectorAll('[data-guide-id] > line:not([stroke="transparent"])')]
      if(!segments.length)throw Error('No visible vertical segments: '+panel)
      const screenEnds=line=>[
        transform(line,+line.getAttribute('x1'),+line.getAttribute('y1')),
        transform(line,+line.getAttribute('x2'),+line.getAttribute('y2')),
      ]
      const points=segments.flatMap(screenEnds)
      const a=points[0],b=points.at(-1)
      const dx=b.x-a.x,dy=b.y-a.y,span=Math.hypot(dx,dy)
      if(span<3)throw Error('Vertical guide too short: '+panel)
      const maxDeviation=Math.max(...points.map(p=>Math.abs((p.x-a.x)*dy-(p.y-a.y)*dx)/span))
      const visibleIntervals=[...center.querySelectorAll('[data-center-guide-interval]')].map(element=>{
        const lines=[...element.querySelectorAll('[data-guide-id] > line:not([stroke="transparent"])')]
        if(!lines.length)return null
        const start=screenEnds(lines[0])[0],end=screenEnds(lines.at(-1))[1]
        return {start,end,lengthPx:Math.hypot(end.x-start.x,end.y-start.y)}
      }).filter(Boolean)
      if(!visibleIntervals.length)throw Error('No visible center intervals: '+panel)
      const transverse={}
      for(const [name,track] of [['chest',chest],['waist',waist]]){
        const circles=[...track.querySelectorAll('[data-2d-shared-nodes] > circle')]
        // CLO-like anatomy reuses the true native underarm/corner markers
        // instead of rendering duplicate guide rings over them. The chest
        // therefore has ONE independently drawn guide node: its midpoint.
        const expected=name==='chest'&&track.getAttribute('data-chest-anatomical-endpoints')
          ?1:3
        if(circles.length!==expected)throw Error('Expected real corner endpoints and one shared center dot: '+panel+'/'+name)
        const node=circles[Math.floor(circles.length/2)],p=transform(node,+node.getAttribute('cx'),+node.getAttribute('cy'))
        const deviation=Math.abs((p.x-a.x)*dy-(p.y-a.y)*dx)/span
        const supported=visibleIntervals.some(({start,end})=>{
          const vx=end.x-start.x,vy=end.y-start.y,len2=vx*vx+vy*vy
          if(len2<1)return false
          const t=((p.x-start.x)*vx+(p.y-start.y)*vy)/len2
          const cross=Math.abs((p.x-start.x)*vy-(p.y-start.y)*vx)/Math.sqrt(len2)
          return t>=-.015&&t<=1.015&&cross<.8
        })
        transverse[name]={crossDeviationPx:deviation,nodeCount:circles.length,
          physicalStations:3,onVisibleInterval:supported}
      }
      output[panel]={verticalStraightnessPx:maxDeviation,lengthPx:span,
        intervals:visibleIntervals.map(({lengthPx})=>Number(lengthPx.toFixed(3))),...transverse}
    }
    return {referenceVisible:board.getAttribute('data-reference-guides-visible'),
      panels:document.querySelectorAll('.cc-board [data-panel]').length,
      guidePanels:output}
  })
  assert.equal(result.referenceVisible,'true')
  assert(result.guidePanels.front,'Front guide missing')
  console.log('GUIDE_CROSSING_DIAGNOSTIC',JSON.stringify(result.guidePanels))
  for(const [id,guide] of Object.entries(result.guidePanels)){
    assert(guide.verticalStraightnessPx<.5,id+' center guide bends: '+guide.verticalStraightnessPx)
    assert(guide.chest.crossDeviationPx<.8,id+' chest ring off center: '+guide.chest.crossDeviationPx)
    assert(guide.waist.crossDeviationPx<.8,id+' waist ring off center: '+guide.waist.crossDeviationPx)
    assert(guide.chest.onVisibleInterval,id+' chest ring not on any visible centerline interval')
    assert(guide.waist.onVisibleInterval,id+' waist ring not on any visible centerline interval')
  }
  // The paper must be behind references and authored cutlines must paint over
  // those references. React portals, hit-targets and native curves keep their
  // own later interaction layers.
  const layerOrder=await page.evaluate(()=>{
    const piece=document.querySelector('[data-2d-pattern-piece="front"]')
    const paper=piece?.querySelector('[data-pattern-surface="drafting-paper"]')
    const guides=piece?.querySelector('[data-2d-reference-layer="front"]')
    const cut=piece?.querySelector('[data-2d-edge-hit^="front:"]')
    if(!piece||!paper||!guides||!cut)return {pass:false,reason:'missing paper, reference, or authored cutline'}
    const before=(a,b)=>Boolean(a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING)
    return {pass:before(paper,guides)&&before(guides,cut),paperBeforeGuide:before(paper,guides),
      guideBeforeCutline:before(guides,cut)}
  })
  assert(layerOrder.pass,'Visual drafting layer order regressed: '+JSON.stringify(layerOrder))

  // Only Select is allowed to capture a guide. Hover a chest line, switch to
  // Notch without moving the pointer, then click the same line. Previously a
  // cached hoveredGuideId stole that click and prevented the active tool.
  await page.evaluate(()=>{
    window.__guideSelectionQACount=0
    window.addEventListener('exo-clothcraft-2d-guide-selection',()=>window.__guideSelectionQACount++)
    window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'select'}}))
  })
  await page.locator('svg[data-native-tool="select"]').waitFor({timeout:8000})
  const chestPoint=await page.evaluate(()=>{
    const line=document.querySelector('[data-2d-guide-panel="front"] [data-2d-construction="chest"] line:not([stroke="transparent"])')
    if(!line)throw Error('Missing chest reference for pointer QA')
    const a=new DOMPoint(+line.getAttribute('x1'),+line.getAttribute('y1')).matrixTransform(line.getScreenCTM())
    const b=new DOMPoint(+line.getAttribute('x2'),+line.getAttribute('y2')).matrixTransform(line.getScreenCTM())
    return {x:(a.x+b.x)/2,y:(a.y+b.y)/2}
  })
  await page.mouse.move(chestPoint.x,chestPoint.y)
  await page.mouse.click(chestPoint.x,chestPoint.y)
  await page.waitForFunction(()=>window.__guideSelectionQACount>0,{},{timeout:6000})
  const selectCount=await page.evaluate(()=>window.__guideSelectionQACount)
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'notch'}})))
  await page.locator('svg[data-native-tool="notch"]').waitFor({timeout:8000})
  await page.mouse.click(chestPoint.x,chestPoint.y)
  const wrongToolSelections=await page.evaluate(()=>window.__guideSelectionQACount)
  assert.equal(wrongToolSelections,selectCount,'Inactive reference guide stole the Notch tool click')
  const pointerQA={selectCount,wrongToolSelections,layerOrder}
  assert.deepEqual(errors,[])
  const after=await snapshot()
  assert.equal(after.revision,before.revision,'Read-only inspector mutated native garment')
  console.log(JSON.stringify({pass:true,revisionBefore:before.revision,revisionAfter:after.revision,
    nativePanels:after.panels?.length,triangles:after.triangles?.length,errors,pointerQA,...result},null,2))
}finally{await browser.close()}
