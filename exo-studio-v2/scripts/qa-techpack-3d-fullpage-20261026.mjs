import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

// Runs against an existing Vite session; does not build, restart or change app files.
const base=process.env.EXO_QA_ORIGIN||'http://127.0.0.1:5174'
const chrome=process.env.EXO_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const tests=[]
const run=async(name,fn)=>{
  try{const detail=await fn();const status=detail?.state==='BLOCKED_NO_NATIVE_HOTSPOTS'?'BLOCKED':'PASS';tests.push({name,status,detail});console.log(status,name,JSON.stringify(detail??''))}
  catch(error){tests.push({name,status:'FAIL',detail:error.message});console.log('FAIL',name,error.message)}
}
let browser
try{
  browser=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox','--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader'],timeout:25000})
  const page=await browser.newPage({viewport:{width:1720,height:1150},deviceScaleFactor:1})
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto(`${base}/?engine=clothcraft&techpackWorkspace=1`,{waitUntil:'domcontentloaded',timeout:30000})
  await run('Native TechPack artboards load on requested route',async()=>{
    await page.locator('[data-techpack-sheet="interactive3d"]').first().waitFor({state:'attached',timeout:20000})
    return {artboards:await page.locator('[data-techpack-sheet]').count()}
  })
  await run('Interactive 3D sheet has full-width viewport and source index below',async()=>{
    const paper=page.locator('[data-techpack-sheet="interactive3d"]').first()
    await paper.scrollIntoViewIfNeeded()
    // Native page is mounted lazily when selected. Navigate through its object browser.
    const nav=page.locator('[data-page="interactive3d"]').first()
    assert(await nav.count(),'Interactive 3D object browser nav is missing')
    await nav.evaluate(node=>node.click())
    await paper.locator('.tpws-interactive-fullpage').waitFor({timeout:16000})
    const layout=await paper.evaluate(node=>{
      const root=node.querySelector('.tpws-interactive-fullpage')
      const viewport=root.querySelector('.tpws-interactive-square')
      const register=root.querySelector('.tpws-interactive-register')
      const frame=node.querySelector('.tpws-seville-ruled-frame')
      const size=e=>{const r=e.getBoundingClientRect();return {width:r.width,height:r.height,top:r.top,bottom:r.bottom}}
      return {root:size(root),viewport:size(viewport),register:size(register),frame:frame?size(frame):null,
        layout:getComputedStyle(root).display,columns:getComputedStyle(root).gridTemplateColumns,
        rows:getComputedStyle(root).gridTemplateRows,registerOverflow:getComputedStyle(register).overflowY,
        canvas:!!viewport.querySelector('canvas'),pins:viewport.querySelectorAll('.tpws-interactive-pin').length}
    })
    assert.equal(layout.layout,'grid')
    assert(layout.viewport.width>=layout.root.width*.84,`Viewport too narrow: ${JSON.stringify(layout)}`)
    assert(layout.viewport.height>=140,`Viewport too short: ${JSON.stringify(layout)}`)
    assert(layout.register.top>=layout.viewport.bottom-3,`Source register is beside/over viewport: ${JSON.stringify(layout)}`)
    assert(layout.canvas,'WebGL canvas unavailable')
    return layout
  })
  await run('Hotspot click focuses a real native source and displays its data',async()=>{
    const paper=page.locator('[data-techpack-sheet="interactive3d"]').first()
    const pins=paper.locator('.tpws-interactive-pin:visible')
    const count=await pins.count()
    if(!count)return {state:'BLOCKED_NO_NATIVE_HOTSPOTS',visibleHotspots:0}
    await pins.first().evaluate(node=>node.click())
    const detail=paper.locator('.tpws-interactive-selected')
    await detail.waitFor({timeout:7000})
    assert(await detail.getByText('Source:',{exact:false}).count())
    const source=await detail.locator('span').innerText()
    assert(/panel|material|seam|pom/i.test(source),`No source reference: ${source}`)
    assert(await detail.locator('[aria-label="Linked native source data"]').count())
    return {visibleHotspots:count,source,detail:(await detail.innerText()).slice(0,250)}
  })
  await run('Controlled native fixture: marker click displays source data under viewport',async()=>{
    await page.evaluate(async()=>{
      const [ReactModule,ReactDomModule,{default:Viewer}]=await Promise.all([
        import('/node_modules/.vite/deps/react.js'),import('/node_modules/.vite/deps/react-dom_client.js'),
        import('/src/components/TechPackInteractive3D.jsx')])
      const React=ReactModule.default||ReactModule
      const createRoot=ReactDomModule.createRoot||ReactDomModule.default?.createRoot
      if(typeof createRoot!=='function')throw Error('React createRoot unavailable')
      const shell=document.createElement('div')
      shell.id='qa-techpack-3d-fixture'
      shell.className='tpws-native-editor'
      shell.style.cssText='position:fixed;left:15px;top:15px;width:1100px;height:850px;z-index:2147483000;background:white;'
      shell.innerHTML='<article data-techpack-sheet="interactive3d" style="width:100%;height:100%;display:flex"><div id="qa-techpack-3d-slot" style="display:flex;flex:1;min-height:0;height:100%"></div></article>'
      document.body.appendChild(shell)
      const snapshot={revision:91,positions:[[-.5,0,0],[.5,0,0],[0,1.2,0]],triangles:[[0,1,2]],panels:[{id:'front',triangles:[0,1],boundaries:{top:[0,1]}}],template:{panels:[{id:'front',name:'Real front',fabric:'cotton'}],fabrics:[{id:'cotton',name:'Documented cotton',properties:{thickness:0.002}}],seams:[{id:'edge-a',a:{panel:'front',edge:'top'},b:{panel:'back',edge:'top'}}]}}
      window.__qa3D={snapshot,latest:[],changed:false}
      const mount=createRoot(shell.querySelector('#qa-techpack-3d-slot'))
      const redraw=(markers,currentSnapshot=window.__qa3D.snapshot)=>mount.render(React.createElement(Viewer,{snapshot:currentSnapshot,markers,onChange:next=>{window.__qa3D.changed=true;window.__qa3D.latest=next;redraw(next)}}))
      window.__qa3D.redraw=redraw
      redraw([])
    })
    const fixture=page.locator('#qa-techpack-3d-fixture')
    await fixture.locator('.tpws-interactive-pin').first().waitFor({timeout:12000})
    const pins=fixture.locator('.tpws-interactive-pin')
    const count=await pins.count()
    assert(count>=3,`Expected panel/material/seam, found ${count}`)
    const panel=fixture.getByRole('button',{name:/Zoom to marker P1/}).first()
    await panel.click()
    const selected=fixture.locator('.tpws-interactive-selected')
    await selected.waitFor({timeout:5000})
    assert.match(await selected.innerText(),/Real front/)
    assert.match(await selected.locator('pre').innerText(),/"front"/)
    const style=await fixture.evaluate(node=>{
      const root=node.querySelector('.tpws-interactive-fullpage'),viewport=node.querySelector('.tpws-interactive-square'),index=node.querySelector('.tpws-interactive-register')
      const box=e=>{const r=e.getBoundingClientRect();return {width:r.width,height:r.height,top:r.top,bottom:r.bottom}}
      return {root:box(root),viewport:box(viewport),index:box(index),grid:getComputedStyle(root).gridTemplateRows}
    })
    assert(style.viewport.width>=style.root.width*.85,JSON.stringify(style))
    assert(style.index.top>=style.viewport.bottom-3,JSON.stringify(style))
    const offsets=await pins.evaluateAll(nodes=>nodes.map(node=>{const box=node.getBoundingClientRect();return {x:box.left+box.width/2,y:box.top+box.height/2}}))
    for(let i=0;i<offsets.length;i++)for(let j=i+1;j<offsets.length;j++){
      assert(Math.hypot(offsets[i].x-offsets[j].x,offsets[i].y-offsets[j].y)>=25,
        `Native pin labels collide: ${JSON.stringify(offsets)}`)
    }
    return {count,detail:(await selected.innerText()).slice(0,150),layout:style,pinCenters:offsets}
  })
  await run('Controlled marker edit persists authored detail and source association',async()=>{
    const fixture=page.locator('#qa-techpack-3d-fixture')
    const note=fixture.getByRole('textbox',{name:/P1 factory detail/})
    await note.fill('Use updated specimen inspection instruction')
    await page.waitForFunction(()=>window.__qa3D.changed&&window.__qa3D.latest.some(m=>m.id==='native-panel:front'&&m.detail==='Use updated specimen inspection instruction'))
    const state=await page.evaluate(()=>window.__qa3D.latest.find(m=>m.id==='native-panel:front'))
    assert.equal(state.sourceRef.kind,'panel')
    assert.equal(state.sourceRef.id,'front')
    assert.equal(state.verified,false)
    return {detail:state.detail,sourceRef:state.sourceRef}
  })
  await run('Controlled native source revision invalidates prior marker approval',async()=>{
    const fixture=page.locator('#qa-techpack-3d-fixture')
    const review=fixture.getByRole('checkbox',{name:/Marker position and factory instruction reviewed against sample/}).first()
    await review.check()
    await page.waitForFunction(()=>window.__qa3D.latest.some(m=>m.id==='native-panel:front'&&m.verified===true))
    const original=await page.evaluate(()=>window.__qa3D.latest.find(m=>m.id==='native-panel:front'))
    assert.equal(original.sourceRef.revision,91)
    await page.evaluate(()=>{
      // Persist the prior source revision while the fixture receives a new native mesh.
      const root=document.querySelector('#qa-techpack-3d-fixture #qa-techpack-3d-slot')
      root.dataset.qaNewRevision='92'
      window.__qa3D.snapshot={...window.__qa3D.snapshot,revision:92,positions:[[-.6,0,0],[.6,0,0],[0,1.25,0]]}
      window.__qa3D.redraw(window.__qa3D.latest,window.__qa3D.snapshot)
    })
    await page.waitForFunction(()=>{
      const panel=document.querySelector('#qa-techpack-3d-fixture .tpws-interactive-selected span')
      return panel?.textContent?.includes('Source revision changed')
    })
    const checked=await review.isChecked()
    assert.equal(checked,false,'Previously approved native source remains reviewed after revision change')
    return {sourceRefRevision:original.sourceRef.revision,currentRevision:92,reviewed:checked}
  })
  console.log('Browser JS errors:',JSON.stringify(errors.slice(0,6)))
  if(errors.length){tests.push({name:'No unhandled app exceptions',status:'FAIL',detail:errors.join(' | ')})}
  await page.close()
}catch(error){tests.push({name:'Browser bootstrap',status:'FAIL',detail:error.stack||error.message});console.error('FAIL browser bootstrap',error.stack||error.message)}
finally{await browser?.close()}
console.log(`QA SUMMARY ${tests.filter(t=>t.status==='PASS').length}/${tests.filter(t=>t.status!=='BLOCKED').length} PASS; ${tests.filter(t=>t.status==='BLOCKED').length} BLOCKED`)
if(tests.some(t=>t.status==='FAIL'))process.exitCode=1
