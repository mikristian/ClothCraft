// Read-only QA for CLO-like native armpit -> center -> armpit construction
// geometry. Unlike earlier hover-only tests, this also fails on duplicate
// drawn circles and shortened/floating guide endpoints.
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const ui=process.env.EXO_GUIDE_QA_UI||'http://127.0.0.1:5284'
const bridge='http://127.0.0.1:5385'
const native=async()=>{
  const response=await fetch(bridge+'/workspace',{method:'POST',headers:{'Content-Type':'application/json',Origin:ui},
    body:JSON.stringify({op:'snapshot'}),signal:AbortSignal.timeout(20000)})
  const body=await response.json()
  assert(body.ok,'Native garment snapshot unavailable')
  return body.data
}
const before=await native()
const browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
const report={panels:[],hover:[],occluded:[],errors:[],revisionBefore:before.revision}
try{
  const page=await browser.newPage({viewport:{width:1728,height:1040}})
  page.on('pageerror',e=>report.errors.push(e.message))
  await page.goto(ui+'/?desktop=1&engine=clothcraft&testSession=true-three-nodes-readonly',
    {waitUntil:'domcontentloaded',timeout:30000})
  const only2d=page.getByRole('button',{name:'2D only',exact:true})
  if(await only2d.count())await only2d.first().click()
  const selector=page.locator('svg[data-native-tool]').first()
  await page.locator('[data-2d-guide-panel="front"] [data-2d-guide-track="chest"]').first()
    .waitFor({state:'attached',timeout:25000})
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'select'}})))
  await page.locator('svg[data-native-tool="select"]').first().waitFor({timeout:10000})
  const sample=async panel=>page.evaluate(panel=>{
    const root=document.querySelector('[data-2d-guide-panel="'+panel+'"]')
    const piece=root?.closest('[data-2d-pattern-piece]')
    const track=root?.querySelector('[data-2d-guide-track="chest"]')
    const circles=[...piece.querySelectorAll('circle')]
    const screen=(element,x,y)=>{
      const q=new DOMPoint(+x,+y).matrixTransform(element.getScreenCTM())
      return [q.x,q.y]
    }
    const nodes=[...track.querySelectorAll('circle[data-2d-shared-node]')].map(e=>({
      id:e.dataset['2dSharedNode'],xy:screen(e,e.getAttribute('cx'),e.getAttribute('cy'))
    }))
    const halves=['left','right'].map(which=>{
      const group=track.querySelector('[data-guide-id$=":'+which+'"]')
      const line=group?.querySelector('line:not([stroke="transparent"])')
      return {id:group?.dataset.guideId,which,
        a:line?screen(line,line.getAttribute('x1'),line.getAttribute('y1')):null,
        b:line?screen(line,line.getAttribute('x2'),line.getAttribute('y2')):null}
    })
    const endpoints=[halves[0]?.a,halves[0]?.b,halves[1]?.b]
    const physical=endpoints.map(pos=>circles.filter(e=>{
      if(!pos)return false
      const pt=screen(e,e.getAttribute('cx'),e.getAttribute('cy'))
      return Math.hypot(pt[0]-pos[0],pt[1]-pos[1])<.65
    }).map(e=>({nativeCorner:e.hasAttribute('data-2d-visible-corner')||
      e.hasAttribute('data-control-point'),
      guideNode:e.hasAttribute('data-2d-shared-node'),
      id:e.dataset['2dSharedNode']||e.dataset['2dVisibleCorner']||null})))
    return {panel,threeStations:endpoints,halves,nodes,physical,
      centerCount:root.querySelectorAll('[data-center-vertical-dotted="true"] line:not([stroke="transparent"])').length}
  },panel)
  const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])
  for(const panel of ['front','back']){
    const p=await sample(panel)
    assert.equal(p.halves.length,2)
    assert(p.halves.every(h=>h.id&&h.a&&h.b),panel+' missing independently drawn halves')
    assert(distance(p.halves[0].b,p.halves[1].a)<.15,panel+' halves fail to join at exact center point')
    assert(p.threeStations[0][0]<p.threeStations[1][0]&&
      p.threeStations[1][0]<p.threeStations[2][0],panel+' does not have exactly ordered left-center-right stations')
    assert.equal(p.centerCount>0,true,panel+' vertical dotted centerline missing')
    for(const i of [0,2]){
      assert.equal(p.physical[i].filter(x=>x.nativeCorner).length,1,panel+' chest armpit must have one actual native corner marker')
      assert.equal(p.physical[i].filter(x=>x.guideNode).length,0,panel+' duplicated guide dot over native armpit')
      assert.equal(p.physical[i].length,1,panel+' armpit appears as multiple overlaid circles')
    }
    assert.equal(p.physical[1].length,1,panel+' must have one midpoint dot')
    assert.equal(p.physical[1][0].guideNode,true,panel+' center point is not the shared guide node')
    report.panels.push({panel,nodes:p.physical.map(x=>x.length),centerSegments:p.centerCount,
      leftRightTouch:true})
    for(const half of p.halves){
      for(const t of [.10,.5,.90]){
        const x=half.a[0]+t*(half.b[0]-half.a[0])
        const y=half.a[1]+t*(half.b[1]-half.a[1])
        await page.mouse.move(x,y,{steps:4})
        await page.waitForTimeout(90)
        const active=await page.evaluate(panel=>[...document.querySelectorAll(
          '[data-2d-guide-panel="'+panel+'"] [data-2d-guide-track="chest"] [data-guide-id]')]
          .filter(e=>e.dataset.hovered==='true').map(e=>e.dataset.guideId),panel)
        assert.deepEqual(active,[half.id],panel+' '+half.which+' hover at '+t+' lit unexpected guide half: '+active)
        report.hover.push({panel,half:half.which,fraction:t,id:half.id})
      }
    }
  }
  // Previous suites switched to Select and therefore missed the user-facing
  // bug in Edit Point / Edit Curve: hover coloring was entirely disabled.
  // Verify the same half-only response in all three editing tools and on the
  // belly guide as well as the chest guide.
  for(const tool of ['select','point','curve']){
    await page.evaluate(tool=>window.dispatchEvent(new CustomEvent(
      'exo-clothcraft-select-2d-tool',{detail:{tool}})),tool)
    await page.locator('svg[data-native-tool="'+tool+'"]').first().waitFor({timeout:8500})
    // Switching Point/Curve reveals an editing inspector and can resize the
    // SVG. Wait for its layout before taking screen-coordinate measurements.
    await page.waitForTimeout(380)
    for(const panel of ['front','back']){
      for(const kind of ['chest','belly']){
        const info=await page.evaluate(({panel,kind})=>{
          const root=document.querySelector('[data-2d-guide-panel="'+panel+'"]')
          const track=root?.querySelector('[data-2d-guide-track="'+kind+'"]')
          const nodes=[...track.querySelectorAll('circle[data-2d-shared-node]')]
          const lines=[...track.querySelectorAll('[data-guide-id]')].map(g=>{
            const l=g.querySelector('polyline[data-guide-curve],line:not([stroke="transparent"])')
            const coords=l.tagName.toLowerCase()==='polyline'?
              l.getAttribute('points').trim().split(/\s+/).map(pair=>pair.split(',').map(Number)):
              [[+l.getAttribute('x1'),+l.getAttribute('y1')],[+l.getAttribute('x2'),+l.getAttribute('y2')]]
            const project=(x,y)=>{const p=new DOMPoint(+x,+y).matrixTransform(l.getScreenCTM());return [p.x,p.y]}
            const midpoint=coords.length===2
              ?[(coords[0][0]+coords[1][0])/2,(coords[0][1]+coords[1][1])/2]
              :coords[Math.floor(coords.length/2)]
            return {id:g.dataset.guideId,a:project(...coords[0]),b:project(...coords.at(-1)),
              mid:project(...midpoint)}
          })
          return {nodeCount:nodes.length,lines}
        },{panel,kind})
        assert.equal(info.lines.length,2,tool+'/'+panel+'/'+kind+' must have exactly two independent lines')
        // In Edit Curve the two outer belly-guide dots are now physical
        // editable side stations, NOT duplicate decorative guide rings.
        // Select/Point still display all three ordinary guide stations.
        if(kind==='belly')assert.equal(info.nodeCount,tool==='curve'?1:3,
          panel+' belly has unexpected duplicate endpoints in '+tool)
        if(kind==='belly'&&tool==='curve')
          assert.equal(await page.locator(
            '[data-2d-pattern-piece="'+panel+'"] [data-side-edit-station$=":belly"]'
          ).count(),2,panel+' needs two real spline-attached belly endpoints')
        if(kind==='chest'&&tool==='select')assert.equal(info.nodeCount,1,panel+' chest reuses native endpoints')
        assert.equal(distance(info.lines[0].b,info.lines[1].a)<.15,true,
          tool+'/'+panel+'/'+kind+' halves disconnect from their common center')
        for(const line of info.lines){
          const t=.5,x=line.mid[0],y=line.mid[1]
          let cursor={x,y}
          await page.mouse.move(x,y,{steps:4})
          await page.waitForTimeout(65)
          let state=await page.evaluate(({panel,kind})=>[...document.querySelectorAll(
            '[data-2d-guide-panel="'+panel+'"] [data-2d-guide-track="'+kind+'"] [data-guide-id]')]
            .map(e=>({id:e.dataset.guideId,hot:e.dataset.hovered==='true',
              stroke:e.querySelector('polyline[data-guide-curve],line:not([stroke="transparent"])')?.getAttribute('stroke')})),
            {panel,kind})
          if(!state.some(s=>s.hot)){
            // React may resize the board again after an inspector selection.
            // Re-aim at the current physical line, not a stale earlier pixel.
            const now=await page.evaluate(id=>{
              const line=document.querySelector('[data-guide-id="'+id+'"] polyline[data-guide-curve], [data-guide-id="'+id+'"] line:not([stroke="transparent"])')
              const m=line.getScreenCTM()
              const c=line.tagName.toLowerCase()==='polyline'
                ?line.getAttribute('points').trim().split(/\s+/).map(v=>v.split(',').map(Number))
                :[[+line.getAttribute('x1'),+line.getAttribute('y1')],[+line.getAttribute('x2'),+line.getAttribute('y2')]]
              const q=c.length===2?[(c[0][0]+c[1][0])/2,(c[0][1]+c[1][1])/2]
                :c[Math.floor(c.length/2)]
              const p=new DOMPoint(...q).matrixTransform(m)
              return {x:p.x,y:p.y}
            },line.id)
            cursor=now
            await page.mouse.move(now.x,now.y,{steps:4})
            await page.waitForTimeout(120)
            state=await page.evaluate(({panel,kind})=>[...document.querySelectorAll(
              '[data-2d-guide-panel="'+panel+'"] [data-2d-guide-track="'+kind+'"] [data-guide-id]')]
              .map(e=>({id:e.dataset.guideId,hot:e.dataset.hovered==='true',
                stroke:e.querySelector('polyline[data-guide-curve],line:not([stroke="transparent"])')?.getAttribute('stroke')})),
              {panel,kind})
          }
          if(!state.some(s=>s.hot)){
            const covered=await page.evaluate(({x,y})=>{
              const at=document.elementFromPoint(x,y)
              return !at?.closest('svg[data-native-tool]')
            },cursor)
            if(covered&&tool!=='select'){
              // A property-editor overlay genuinely covers the target in this
              // viewport. Never claim a pass there; record the obstruction.
              report.occluded.push({tool,panel,kind,half:line.id.split(':').at(-1)})
              continue
            }
            const trace=await page.evaluate(({x,y})=>{
              const at=document.elementFromPoint(x,y)
              return {point:[x,y],target:at?.outerHTML?.slice(0,230),
                rootTool:document.querySelector('svg[data-native-tool]')?.dataset.nativeTool,
                active:[...document.querySelectorAll('[data-guide-id][data-hovered="true"]')].map(e=>e.dataset.guideId)}
            },cursor)
            console.error('UNCOVERED_GUIDE_HOVER_DIAGNOSTIC',JSON.stringify({tool,panel,kind,id:line.id,trace}))
          }
          assert.deepEqual(state.filter(s=>s.hot).map(s=>s.id),[line.id],
            tool+'/'+panel+'/'+kind+' hovered the wrong half: '+JSON.stringify(state))
          assert.deepEqual(state.filter(s=>s.stroke?.toLowerCase()==='#009dff').map(s=>s.id),[line.id],
            tool+'/'+panel+'/'+kind+' blue should apply to exactly one half')
          report.hover.push({tool,panel,kind,half:line.id.split(':').at(-1),fraction:t})
        }
      }
    }
  }
  assert(report.hover.some(x=>x.tool==='point'&&x.panel==='front'),
    'Point mode never exercised a visible front reference')
  assert(report.hover.some(x=>x.tool==='curve'&&x.panel==='front'),
    'Curve mode never exercised a visible front reference')
  assert.deepEqual(report.errors,[],'Browser errors')
  const after=await native()
  assert.equal(after.revision,before.revision,'Read-only hover changed garment revision')
  assert.deepEqual(after,before,'Read-only hover changed native garment')
  console.log(JSON.stringify({pass:true,...report,revisionAfter:after.revision},null,2))
}finally{await browser.close()}
