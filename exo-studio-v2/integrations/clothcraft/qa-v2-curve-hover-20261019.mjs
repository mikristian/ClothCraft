// Read-only real-pointer QA of CLO-like segmented guide hover and curve indicators.
// Usage: EXO_CURVE_QA_UI=http://127.0.0.1:5386 EXO_CURVE_QA_BRIDGE=http://127.0.0.1:5385 node integrations/clothcraft/qa-v2-curve-hover-20261019.mjs
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const ui=process.env.EXO_CURVE_QA_UI||'http://127.0.0.1:5386'
const bridge=process.env.EXO_CURVE_QA_BRIDGE||'http://127.0.0.1:5385'
const errors=[]
const results={guideHovers:[],curveHandles:[],livePreview:null,mirrorGroups:[],warnings:[]}
const failures=[]
const snapshot=async()=>{
  const response=await fetch(bridge+'/workspace',{method:'POST',
    headers:{Origin:ui,'Content-Type':'application/json'},
    body:JSON.stringify({op:'snapshot'}),signal:AbortSignal.timeout(15000)})
  assert(response.ok,'Workspace endpoint '+response.status)
  const body=await response.json()
  assert(body.ok,'Snapshot failed: '+JSON.stringify(body.error))
  return body.data
}
function chroma(hex){
  const raw=String(hex||'').replace('#','').trim()
  if(!/^[0-9a-f]{6}$/i.test(raw))return null
  return [0,2,4].map(i=>parseInt(raw.slice(i,i+2),16))
}
function isBlue(color){
  const c=chroma(color)
  return Boolean(c&&c[2]>c[0]*1.12&&c[2]>c[1]*1.04&&c[2]-c[0]>22)
}
function isYellow(color){
  const c=chroma(color)
  return Boolean(c&&c[0]>130&&c[1]>95&&c[0]>c[2]*1.35&&c[1]>c[2]*1.3)
}
const browser=await chromium.launch({headless:true,
  executablePath:process.env.EXO_CURVE_QA_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
let page,before
try{
  before=await snapshot()
  page=await browser.newPage({viewport:{width:1728,height:1040}})
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto(ui+'/?desktop=1&engine=clothcraft&testSession=curve-hover-readonly',
    {waitUntil:'domcontentloaded',timeout:30000})
  const twoD=page.getByRole('button',{name:'2D only',exact:true})
  if(await twoD.count())await twoD.first().click()
  await page.locator('[data-2d-guide-panel="front"] [data-2d-guide-track="chest"]')
    .first().waitFor({state:'attached',timeout:45000})
  // Tool dispatch changes only the transient browser editor mode; no native edits.
  await page.evaluate(()=>window.dispatchEvent(
    new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'select'}})))
  await page.locator('svg[data-native-tool="select"]').first().waitFor({timeout:10000})
  assert.equal(await page.locator('.cc-board').first().getAttribute('data-reference-guides-visible'),'true')

  async function guideSegments(panel,kind){
    return page.evaluate(({panel,kind})=>{
      const root=document.querySelector('[data-2d-guide-panel="'+panel+'"]')
      const groups=[...(root?.querySelectorAll('[data-guide-id][data-guide-kind="'+kind+'"]')||[])]
      return groups.map(group=>{
        const line=group.querySelector('line:not([stroke="transparent"])')
        if(!line)return null
        const m=line.getScreenCTM()
        if(!m)return null
        const a=new DOMPoint(+line.getAttribute('x1'),+line.getAttribute('y1')).matrixTransform(m)
        const b=new DOMPoint(+line.getAttribute('x2'),+line.getAttribute('y2')).matrixTransform(m)
        return {id:group.dataset.guideId,panel,kind,
          x:(a.x+b.x)/2,y:(a.y+b.y)/2,length:Math.hypot(a.x-b.x,a.y-b.y)}
      }).filter(item=>item&&item.length>8)
    },{panel,kind})
  }
  async function state(panel,kind){
    return page.evaluate(({panel,kind})=>[...document.querySelectorAll(
      '[data-2d-guide-panel="'+panel+'"] [data-guide-kind="'+kind+'"][data-guide-id]')].map(n=>({
        id:n.dataset.guideId,hovered:n.dataset.hovered,
        stroke:n.querySelector('line:not([stroke="transparent"])')?.getAttribute('stroke')
      })),{panel,kind})
  }
  for(const panel of ['front','back']){
    for(const kind of ['chest','belly']){
      const segments=await guideSegments(panel,kind)
      const left=segments.find(s=>s.id.endsWith(':left'))
      const right=segments.find(s=>s.id.endsWith(':right'))
      assert(left&&right,'Missing visible left/right guide halves: '+panel+'/'+kind+
        ' '+JSON.stringify(segments))
      for(const target of [left,right]){
        await page.mouse.move(target.x,target.y,{steps:5})
        await page.waitForTimeout(100)
        const states=await state(panel,kind)
        const hit=states.find(s=>s.id===target.id)
        const isolated=hit?.hovered==='true'&&states.every(s=>s.id===target.id||s.hovered!=='true')
        const blue=isBlue(hit?.stroke)
        if(!isolated)failures.push('Hover must isolate '+target.id+': '+JSON.stringify(states))
        if(!blue)failures.push('Hovered '+target.id+' should be blue, got '+hit?.stroke)
        results.guideHovers.push({id:target.id,stroke:hit?.stroke,isolation:isolated,blue})
      }
    }
    const kind='center-'+panel
    const segments=await guideSegments(panel,kind)
    assert(segments.length,'Center vertical guide missing: '+panel)
    const target=segments.find(s=>s.length>16)||segments[0]
    await page.mouse.move(target.x,target.y,{steps:5})
    await page.waitForTimeout(100)
    const states=await state(panel,kind)
    const hit=states.find(s=>s.id===target.id)
    const isolated=hit?.hovered==='true'&&states.every(s=>s.id===target.id||s.hovered!=='true')
    const blue=isBlue(hit?.stroke)
    if(!isolated)failures.push('Center vertical hover failed: '+target.id+': '+JSON.stringify(states))
    if(!blue)failures.push('Center vertical hovered segment should be blue, got '+hit?.stroke)
    results.guideHovers.push({id:target.id,stroke:hit?.stroke,isolation:isolated,blue})
  }

  // Existing authored curves can be verified without dragging or writing.
  // Clicking an edge selects it; creating a new curve/handle is intentionally forbidden.
  const edit=page.getByRole('button',{name:'Edit Pattern',exact:true})
  assert(await edit.count()>0,'Edit Pattern toolbar control missing')
  await edit.first().click()
  await page.locator('svg[data-native-tool="point"]').first().waitFor({timeout:10000})
  for(const edgeHit of await page.locator('[data-2d-edge-hit^="front:"]').evaluateAll(nodes=>
    [...new Set(nodes.map(n=>n.getAttribute('data-2d-edge-hit')))])){
    const candidate=page.locator('[data-2d-edge-hit="'+edgeHit+'"]').first()
    const point=await candidate.evaluate(el=>{
      const points=el.points
      const middle=Math.floor((points.numberOfItems-1)/2)
      const a=points.getItem(middle),b=points.getItem(Math.min(middle+1,points.numberOfItems-1))
      const p=new DOMPoint((a.x+b.x)/2,(a.y+b.y)/2).matrixTransform(el.getScreenCTM())
      return {x:p.x,y:p.y}
    })
    if(point.x<5||point.y<5||point.x>1723||point.y>1035)continue
    await page.mouse.click(point.x,point.y)
    const arms=await page.locator('[data-bezier-arm^="front:"]').count()
    if(arms)break
  }
  const bezierArms=page.locator('[data-bezier-arm^="front:"]')
  const armCount=await bezierArms.count()
  if(!armCount)results.warnings.push('No authored front Bézier handles were visible in the current fixture; curve color check unavailable without an edit')
  for(let i=0;i<armCount;i++){
    const arm=bezierArms.nth(i)
    const info=await arm.evaluate(node=>({
      id:node.dataset.bezierArm,
      handle:node.querySelector('[data-curve-handle]')?.getAttribute('data-curve-handle'),
      stroke:node.querySelector('[data-bezier-tangent-line]')?.getAttribute('stroke'),
      fill:node.querySelector('[data-curve-handle]')?.getAttribute('fill'),
      outline:node.querySelector('[data-curve-handle]')?.getAttribute('stroke')
    }))
    results.curveHandles.push(info)
    assert(info.handle,'Visible curve arm lacks draggable handle: '+info.id)
    if(!(isYellow(info.stroke)||isYellow(info.outline)||isYellow(info.fill)))
      failures.push('Active Bézier arm/handle should show yellow: '+JSON.stringify(info))
  }
  // Preview non-neckline editing in a real pointer-capture gesture. Dispatch
  // pointercancel before any pointerup, so the Shape edit commit cannot run.
  const previewCandidate=await page.locator('[data-curve-handle^="front:"]').evaluateAll(nodes=>{
    return nodes.filter(node=>!/neck/i.test(node.dataset.curveHandle||'')).map(node=>{
      const rect=node.getBoundingClientRect()
      return {id:node.dataset.curveHandle,
        x:rect.x+rect.width/2,y:rect.y+rect.height/2,
        width:rect.width,height:rect.height}
    }).find(item=>item.width>0&&item.height>0&&item.x>6&&item.x<1722&&item.y>6&&item.y<1034)||null
  })
  if(!previewCandidate){
    results.warnings.push('No non-neckline front Bézier handle available; live pointer preview skipped')
  }else{
    const p=previewCandidate
    const target=page.locator('[data-curve-handle="'+p.id+'"]').first()
    const visibleTarget=await page.evaluate(({x,y,id})=>{
      const node=document.elementFromPoint(x,y)
      return {id,hit:node?.getAttribute('data-curve-handle'),tag:node?.tagName}
    },p)
    if(visibleTarget.hit!==p.id){
      results.warnings.push('Non-neckline handle obscured at pointer center: '+JSON.stringify(visibleTarget))
    }else{
      await page.mouse.move(p.x,p.y)
      // Native Playwright mouse down + mouse move exercise actual React event
      // handlers; a synthetic pointercancel is sent to the captured SVG
      // before mouseup, and any native edits are treated as a QA failure.
      await page.mouse.down()
      await page.mouse.move(p.x+12,p.y-11,{steps:8})
      const during=await page.evaluate(id=>{
        const contour=document.querySelector('[data-active-bezier-contour="'+id.split(':').slice(0,-1).join(':')+'"]')
        const handle=document.querySelector('[data-curve-handle="'+id+'"]')
        return {contour:contour?.getAttribute('stroke')||null,
          handleActive:handle?.getAttribute('data-active-curve-handle')||null,
          handleStroke:handle?.getAttribute('stroke')||null,
          handleFill:handle?.getAttribute('fill')||null}
      },p.id)
      // Must cancel on the owning SVG, including the same pointer ID used by
      // Playwright's left mouse. Dispatching pointercancel on SVG directly
      // triggers React cleanup without invoking the commit-only pointerup.
      await page.evaluate(()=>{
        const svg=document.querySelector('.cc-board svg[data-native-tool]')
        svg.dispatchEvent(new PointerEvent('pointercancel',{
          bubbles:true,cancelable:false,pointerId:1,pointerType:'mouse',isPrimary:true
        }))
        try{svg.releasePointerCapture(1)}catch{}
      })
      const cleaned=await page.evaluate(()=>({
        contours:document.querySelectorAll('[data-active-bezier-contour]').length,
        activeHandles:document.querySelectorAll('[data-active-curve-handle="true"]').length
      }))
      // Playwright's mouseup after pointercancel may still fire; release over
      // outside board and rely on canceled gesture cleanup.
      await page.mouse.move(4,4)
      await page.mouse.up()
      results.livePreview={handle:p.id,obscured:false,during,afterCancel:cleaned}
      if(during.contour!=='#facc15')
        failures.push('Non-neckline live contour expected #facc15: '+JSON.stringify(results.livePreview))
      if(during.handleActive!=='true'||!isYellow(during.handleStroke))
        failures.push('Non-neckline live active handle should be yellow: '+JSON.stringify(results.livePreview))
      if(cleaned.contours!==0||cleaned.activeHandles!==0)
        failures.push('Pointer cancellation retained active preview: '+JSON.stringify(cleaned))
    }
  }
  // Mirrored free curve points only occur when the open native garment contains
  // authored mirror groups. Verify both sides share group membership if present.
  const mirror=await page.evaluate(()=>[...document.querySelectorAll('[data-free-curve-mirror-group]')]
    .map(n=>({id:n.dataset.freeCurvePoint,group:n.dataset.freeCurveMirrorGroup}))
    .filter(p=>p.group))
  const byGroup=Map.groupBy?Map.groupBy(mirror,p=>p.group):
    mirror.reduce((m,p)=>(m.set(p.group,[...(m.get(p.group)||[]),p]),m),new Map())
  for(const [group,points] of byGroup){
    assert(points.length>=2,'Mirrored curve group has no partner: '+group)
    results.mirrorGroups.push({group,points:points.map(p=>p.id)})
  }
  if(!mirror.length)results.warnings.push('No authored mirrored free curve points present; mirror behavior needs a separate isolated editable fixture')

  assert.deepEqual(errors,[],'Browser errors: '+JSON.stringify(errors))
  const after=await snapshot()
  assert.equal(after.revision,before.revision,'Read-only hover QA changed the native garment revision')
  console.log(JSON.stringify({pass:failures.length===0,revisionBefore:before.revision,
    revisionAfter:after.revision,errors,failures,...results},null,2))
  if(failures.length)process.exitCode=1
}catch(error){
  console.error(JSON.stringify({pass:false,error:String(error.stack||error),errors,failures,...results},null,2))
  process.exitCode=1
}finally{
  await page?.close().catch(()=>{})
  await browser.close()
}
