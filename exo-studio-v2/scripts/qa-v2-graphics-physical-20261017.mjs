/** Disposable native service + Vite preview Graphics physical-size browser QA. */
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync,writeFileSync,openSync,closeSync,readFileSync,existsSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const output=mkdtempSync(path.join(root,'integrations/clothcraft/output/qa-v2-graphics-physical-'))
mkdirSync(path.join(output,'workspace'),{recursive:true})
const backend=process.env.EXO_GRAPHICS_QA_BACKEND||'http://127.0.0.1:5483'
const ui=process.env.EXO_GRAPHICS_QA_UI||'http://127.0.0.1:5484'
const spawned=[]
const results={output,backend,ui,checks:[],defects:[],screenshots:{},errors:[],nativeBinaryPresent:existsSync(path.join(root,'research/oss/clothcraft/target/debug/exo-session'))}
function start(command,args,env={}) {
 const fd=openSync(path.join(output,`service-${spawned.length}.log`),'w')
 const child=spawn(command,args,{cwd:root,detached:true,stdio:['ignore',fd,fd],env:{...process.env,...env}})
 closeSync(fd);spawned.push(child)
}
async function ready(url) {
 for(let i=0;i<140;i++){
  try{if((await fetch(url,{signal:AbortSignal.timeout(1000)})).ok)return}catch{}
  if(spawned.some(p=>p.exitCode!==null))throw Error(`Service exited while waiting for ${url}`)
  await new Promise(resolve=>setTimeout(resolve,250))
 }
 throw Error('Timeout waiting for '+url)
}
async function check(name,fn) {
 try{await fn();results.checks.push({name,pass:true})}
 catch(error){results.checks.push({name,pass:false,error:String(error.message||error)});results.defects.push(name+': '+String(error.message||error))}
}
let browser
try {
 assert.ok(results.nativeBinaryPresent,'Missing compiled Rust exo-session binary')
 assert.ok(existsSync(path.join(root,'dist/index.html')),'Run npm run build first')
 start(process.execPath,['integrations/clothcraft/server.mjs'],{
  EXO_CLOTHCRAFT_PORT:'5483',EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0',
  EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
  EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session'),
 })
 start(path.join(root,'node_modules/.bin/vite'),['preview','--host','127.0.0.1','--port','5484','--strictPort','--outDir','dist'])
 await Promise.all([ready(backend+'/health'),ready(ui)])
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
 const context=await browser.newContext({viewport:{width:1700,height:1050},acceptDownloads:true})
 const page=await context.newPage()
 page.on('pageerror',error=>results.errors.push(error.message))
 await page.route('**/workspace',async route=>{
  const headers={...route.request().headers()};delete headers.origin
  const response=await route.fetch({url:backend+'/workspace',headers,timeout:30000})
  await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
 })
 await page.goto(ui+'/?desktop=1&engine=clothcraft',{waitUntil:'domcontentloaded',timeout:90000})
 await page.getByRole('tab',{name:'Graphic',exact:true}).click({timeout:60000})
 const editor=page.locator('#cc-native-graphic-editor .cc-graphic-editor')
 await editor.waitFor({state:'visible',timeout:30000})
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="512" height="256" viewBox="0 0 512 256"><rect width="512" height="256" fill="#e31e38"/></svg>'
 await editor.locator('input[accept*="image/svg+xml"]').setInputFiles({name:'QA-print.svg',mimeType:'image/svg+xml',buffer:Buffer.from(svg)})
 await editor.locator('.cc-graphic-item').first().waitFor({timeout:30000})
 await check('Rust graphic appears as selectable Object Browser layer',async()=>{
  const row=page.locator('.clo-object-browser .clo-object-row').filter({hasText:'QA-print.svg'}).first()
  await row.waitFor({state:'visible',timeout:20000})
  assert.match(await row.innerText(),/100\.0 × 50\.0 mm|QA-print.svg/)
  await row.locator('button.clo-object-select').click()
  assert.equal(await row.locator('button.clo-object-select').getAttribute('aria-current'),'true')
  assert.equal(await editor.locator('.cc-graphic-item[aria-pressed="true"]').count(),1)
 })
 await check('Graphic layer thumbnail and selection',async()=>{
  assert.equal(await editor.locator('.cc-graphic-item').count(),1)
  assert.equal(await editor.locator('.cc-graphic-item[aria-pressed="true"]').count(),1)
  assert.equal(await editor.locator('.cc-graphic-item img').count(),1)
 })
 const width=editor.getByRole('spinbutton',{name:'Width (mm)',exact:true})
 const height=editor.getByRole('spinbutton',{name:'Height (mm)',exact:true})
 await check('100mm width + physical aspect ratio lock',async()=>{
  assert.equal(await editor.getByLabel('Lock aspect ratio').isChecked(),true)
  await width.fill('100')
  await width.blur()
  await page.waitForTimeout(200)
  assert.ok(Math.abs(Number(await width.inputValue())-100)<.01)
  assert.ok(Math.abs(Number(await height.inputValue())-50)<.1,`Actual height ${await height.inputValue()}`)
 })
 await check('1:1 print SVG contains full PNG at exact mm',async()=>{
  const promise=page.waitForEvent('download')
  await editor.getByRole('button',{name:'Export 1:1 print SVG'}).click()
  const download=await promise
  const file=path.join(output,download.suggestedFilename())
  await download.saveAs(file)
  const text=readFileSync(file,'utf8')
  assert.match(text,/width="100mm"/)
  assert.match(text,/height="50mm"/)
  assert.match(text,/viewBox="0 0 100 50"/)
  assert.match(text,/data:image\/png;base64,/)
  assert.ok(!text.includes('rotate('),'Individual artwork print should have no panel rotation')
  results.printSvg=file
 })
 await check('Below-300 DPI warning',async()=>{
  await width.fill('300')
  await width.blur()
  await editor.locator('.cc-graphic-print-warning').waitFor({state:'visible'})
  assert.match(await editor.locator('.cc-graphic-print-warning').innerText(),/300 DPI/)
 })
 await check('Normal map image import',async()=>{
  const data=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLytQAAAABJRU5ErkJggg==','base64')
  await editor.locator('input[accept="image/png,image/jpeg,.png,.jpg,.jpeg"]').setInputFiles({name:'normal.png',mimeType:'image/png',buffer:data})
  await editor.locator('img[alt="Normal texture"]').waitFor({state:'visible'})
 })
 await check('Opacity setting',async()=>{
  const slider=editor.locator('label').filter({hasText:/^Opacity/}).locator('input[type=range]')
  await slider.fill('0.45')
  assert.equal(await slider.inputValue(),'0.45')
 })
 await check('Rust persists physical graphic and material',async()=>{
  const file=path.join(output,'workspace','fitting-project.json')
  let record
  for(let tries=0;tries<60;tries++){
   try{
    const project=JSON.parse(readFileSync(file,'utf8'))
    record=project.printGraphics?.[0]
    if(record?.widthMm===300&&record?.opacity===.45)break
   }catch{}
   await page.waitForTimeout(150)
  }
  assert(record,'Rust project did not persist the imported graphic')
  assert.equal(record.widthMm,300)
  assert.equal(record.heightMm,150)
  assert.equal(record.opacity,.45)
  assert.equal(record.lockAspectRatio,true)
  // Sanitized vector imports rasterize to a larger preview/print source
  // (up to 2048px), preserving its aspect ratio and actual stored pixel count.
  assert(record.width>=512&&record.height>=256,'Imported source is unexpectedly low resolution')
  assert(Math.abs(record.width/record.height-2)<.01,'SVG source aspect ratio changed')
  assert.equal(await page.locator('.cc-error').count(),0,'Native workspace reported an error after graphic update')
  results.rustSavedPrint={widthMm:record.widthMm,heightMm:record.heightMm,
    imagePixels:[record.width,record.height],opacity:record.opacity}
 })
 await check('2D artwork uses material-space position',async()=>{
  const graphic=page.locator('.cc-board [data-2d-graphic]')
  await graphic.first().waitFor({state:'visible',timeout:12000})
  const width=Number(await graphic.first().getAttribute('width'))
  assert(Math.abs(width-.3)<1e-8,`2D graphic width should be 0.3 m, got ${width}`)
 })
 await page.screenshot({path:path.join(output,'graphics-2d-and-3d.png'),fullPage:true})
 results.screenshots.combined=path.join(output,'graphics-2d-and-3d.png')
 await check('Capture 2D viewport',async()=>{
  await page.locator('.cc-viewport-2d').first().screenshot({path:path.join(output,'graphics-2d.png')})
  results.screenshots.twoD=path.join(output,'graphics-2d.png')
 })
 await check('Capture 3D viewport',async()=>{
  await page.locator('.cc-viewport-3d').first().screenshot({path:path.join(output,'graphics-3d.png')})
  results.screenshots.threeD=path.join(output,'graphics-3d.png')
 })
 await check('No page exceptions',async()=>assert.deepEqual(results.errors,[]))
 results.pass=results.defects.length===0
} catch(e){results.pass=false;results.fatal=e.stack||String(e)}
finally {
 writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2))
 console.log(JSON.stringify(results,null,2))
 await browser?.close().catch(()=>{})
 for(const child of spawned)try{process.kill(-child.pid,'SIGTERM')}catch{}
 if(!results.pass)process.exitCode=1
}
