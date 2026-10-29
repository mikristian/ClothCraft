/** Real UI promo fabric acceptance test, isolated to the private Rust instance. */
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
import {mkdtempSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {spawnSync} from 'node:child_process'

const UI=process.env.EXO_QA_UI||'http://127.0.0.1:5386'
const PRIVATE='http://127.0.0.1:5688'
const HOVER_ONLY=process.env.EXO_HOVER_ONLY==='1'
const out=mkdtempSync(path.join(tmpdir(),'exo-promo-fabric-'))
const snapshot=async()=>{
  const response=await fetch(PRIVATE+'/workspace',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({op:'snapshot'}),signal:AbortSignal.timeout(6000)})
  assert(response.ok,`Private snapshot HTTP ${response.status}`)
  const data=await response.json()
  assert(data.ok,data.error||'Private snapshot failed')
  return data.data
}
const digest=buffer=>createHash('sha256').update(buffer).digest('hex')
const capture=async(page,name)=>{
  const canvas=page.locator('.cc-scene canvas[data-native-fabric-appearances]').first()
  assert(await canvas.isVisible(),`3D garment canvas missing for ${name}`)
  const buffer=await canvas.screenshot({animations:'disabled'})
  writeFileSync(path.join(out,name+'.png'),buffer)
  return {file:name+'.png',sha256:digest(buffer),size:buffer.length,bounds:await canvas.boundingBox(),materialData:await canvas.getAttribute('data-native-fabric-appearances')}
}
const comparePixels=(a,b)=>{
  const python=spawnSync('python3',['-c',`from PIL import Image,ImageChops\nimport sys,json\na=Image.open(sys.argv[1]).convert('RGB');b=Image.open(sys.argv[2]).convert('RGB')\noriginalB=b.size\nif a.size!=b.size:b=b.resize(a.size,Image.Resampling.BILINEAR)\nx=ImageChops.difference(a,b);p=list(x.getdata());n=sum(any(c>18 for c in t) for t in p)\nprint(json.dumps({'width':a.width,'height':a.height,'afterSize':originalB,'resizedForComparison':originalB!=a.size,'changedPixels':n,'changeFraction':n/len(p),'meanChannelDelta':sum(sum(t) for t in p)/(len(p)*3)}))`,path.join(out,a+'.png'),path.join(out,b+'.png')],{encoding:'utf8'})
  if(python.status!==0)return {available:false,reason:python.stderr.trim()}
  return JSON.parse(python.stdout)
}
let browser
try{
  assert((await fetch(UI,{signal:AbortSignal.timeout(5000)})).ok,`UI unavailable ${UI}`)
  assert((await fetch(PRIVATE+'/health',{signal:AbortSignal.timeout(5000)})).ok,'Private 5688 is offline; refusing all fabric changes')
  const initial=await snapshot()
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
  const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1})
  const blocked=[],privateWrites=[],errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url())
    if(url.port==='5385'&&!['/workspace','/health'].includes(url.pathname)||url.port==='5688'&&!['/workspace','/health'].includes(url.pathname)){
      blocked.push(req.url());return route.abort('blockedbyclient')
    }
    if(url.pathname==='/workspace'||url.pathname==='/health'&&['5385','5688'].includes(url.port)){
      const headers={...req.headers()};delete headers.origin
      const response=await route.fetch({url:PRIVATE+url.pathname,headers,timeout:20000})
      if(req.method()!=='GET')privateWrites.push({method:req.method(),op:(req.postDataJSON?.()||{}).op})
      return route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':'*'}})
    }
    return route.continue()
  })
  await page.goto(UI+'/?desktop=1&engine=clothcraft&promoFabricQA=20261020',{waitUntil:'domcontentloaded'})
  try{await page.locator('.cc-scene canvas[data-native-fabric-appearances]').first().waitFor({timeout:15000})}
  catch(error){
    const diagnostic=await page.evaluate(()=>({title:document.title,scenes:document.querySelectorAll('.cc-scene').length,canvases:[...document.querySelectorAll('canvas')].map(c=>({parent:c.parentElement?.className,attributes:[...c.attributes].map(a=>a.name)})),errors:[...document.querySelectorAll('.cc-error,[role="alert"]')].map(e=>e.textContent?.slice(0,200))}))
    writeFileSync(path.join(out,'diagnostic.json'),JSON.stringify(diagnostic,null,2))
    await page.screenshot({path:path.join(out,'diagnostic.png')})
    throw new Error(`Native 3D renderer unavailable; evidence ${out}/diagnostic.json: ${JSON.stringify(diagnostic)}`,{cause:error})
  }
  await page.waitForFunction(()=>[...document.querySelectorAll('.cc-scene canvas[data-native-fabric-appearances]')].some(c=>JSON.parse(c.dataset.nativeFabricAppearances||'[]').length>0),null,{timeout:20000})
  await page.getByRole('button',{name:'Browse fabrics'}).click()
  const presets=page.locator('.exo-fabric-entry-main')
  await presets.first().waitFor({timeout:15000})
  const names=await presets.allTextContents()
  const hovered=[]
  for(const index of [0,1,2]){
    const element=presets.nth(index)
    await element.scrollIntoViewIfNeeded()
    await element.hover()
    const id=await element.getAttribute('data-fabric-preset')
    const preview=page.locator(`[data-library-preview="Fabric:${id}"]`)
    await preview.waitFor({state:'visible',timeout:4500})
    await preview.locator('.exo-fabric-hover-dual').waitFor({state:'visible',timeout:4500})
    await page.screenshot({path:path.join(out,`fabric-hover-${index+1}.png`),animations:'disabled'})
    hovered.push({id,name:(await element.innerText()).trim().replace(/\s+/g,' '),previewVisible:true,previewLabel:await preview.getAttribute('aria-label'),screenshot:`fabric-hover-${index+1}.png`})
  }
  assert.equal(hovered.filter(h=>h.previewVisible).length,3,'All three hovered materials need actual enlarged previews')
  if(HOVER_ONLY){
    const evidence={pass:true,mode:'hover-only',output:out,hovered,blocked,privateWrites,pageErrors:errors}
    writeFileSync(path.join(out,'evidence.json'),JSON.stringify(evidence,null,2))
    assert.deepEqual(errors,[])
    console.log(JSON.stringify(evidence,null,2))
    process.exitCode=0
  }else{
  // Choose a distinct material based on catalog metadata and apply through the actual button.
  const choice=presets.nth(/cotton jersey/i.test(initial.template?.fabrics?.[0]?.name||'')?2:0)
  await choice.scrollIntoViewIfNeeded()
  const chosen=await choice.getAttribute('data-fabric-preset')
  await choice.click()
  await page.waitForTimeout(250)
  const before=await capture(page,'fabric-before')
  const apply=page.getByRole('button',{name:'Apply to selected Rust panel'})
  await apply.click()
  await page.waitForTimeout(1200)
  const after=await capture(page,'fabric-after')
  const changed=await snapshot()
  const materialBefore=JSON.parse(before.materialData||'[]'),materialAfter=JSON.parse(after.materialData||'[]')
  const comparison=comparePixels('fabric-before','fabric-after')
  assert.notDeepEqual(materialAfter,materialBefore,'Actual 3D mesh material data did not change')
  assert.notEqual(before.sha256,after.sha256,'3D scene pixels did not change')
  if(comparison.available)assert(comparison.changedPixels>250,`Only ${comparison.changedPixels} canvas pixels changed`)
  const canvas=page.locator('.cc-scene canvas[data-native-fabric-appearances]').first()
  await canvas.hover()
  await page.mouse.wheel(0,-600)
  await page.waitForTimeout(450)
  const closeup=await capture(page,'fabric-closeup')
  await page.mouse.wheel(0,600)
  await page.waitForTimeout(450)
  const zoomout=await capture(page,'fabric-zoomout')
  assert.notEqual(closeup.sha256,after.sha256,'Zoom-in did not change actual scene')
  assert.notEqual(zoomout.sha256,closeup.sha256,'Zoom-out did not change actual scene')
  assert.deepEqual(errors,[],'Unexpected browser errors')
  const evidence={pass:true,ui:UI,backend:PRIVATE,output:out,hovered,presetCount:names.length,chosen,initialRevision:initial.revision,finalRevision:changed.revision,privateWrites,blocked,materialBefore,materialAfter,comparison,before,after,closeup,zoomout,pageErrors:errors}
  writeFileSync(path.join(out,'evidence.json'),JSON.stringify(evidence,null,2))
  console.log(JSON.stringify(evidence,null,2))
  }
}finally{await browser?.close()}
