// Screenshots and browser-computed verification for complete palettes, icon
// tint and translucent glass. Uses an isolated browser and disposable Vite.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright-core'

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const images=mkdtempSync(path.join(tmpdir(),'exo-theme-complete-'))
const port=5993
const server=spawn(path.join(repo,'node_modules/.bin/vite'),['--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:repo,stdio:'ignore',detached:true})
let browser
const report={pass:false,images,checks:[]}
const snapshot=()=>({}).toString()
try {
  let ready=false
  for(let n=0;n<95;n++){try{ready=(await fetch(`http://127.0.0.1:${port}/`,{signal:AbortSignal.timeout(1200)})).ok}catch{}if(ready)break;await new Promise(r=>setTimeout(r,150))}
  assert(ready,'Theme QA Vite server never started')
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
  const context=await browser.newContext({viewport:{width:1700,height:990}})
  const page=await context.newPage()
  const errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.goto(`http://127.0.0.1:${port}/?desktop=1&engine=legacy&qa=complete-themes`,{waitUntil:'domcontentloaded'})
  await page.getByRole('button',{name:'Open Studio Settings'}).waitFor({timeout:20000})
  const measure=()=>page.evaluate(()=>{
    const cs=s=>{const element=document.querySelector(s);if(!element)return null;const x=getComputedStyle(element);return {backgroundColor:x.backgroundColor,backgroundImage:x.backgroundImage,backdropFilter:x.backdropFilter,color:x.color,border:x.borderColor}}
    const root=document.querySelector('.app-shell')
    const original=document.querySelector('.clo-left-3d-column .cad-tool-icon-artwork')
    const masked=document.querySelector('.clo-left-3d-column .cad-tool-icon-mask')
    return {
      theme:root?.dataset.studioTheme,liquidGlass:root?.dataset.studioLiquidGlass,
      shell:cs('.app-shell'),menu:cs('.clo-mac-menu'),library:cs('.asset-browser'),inspector:cs('.clo-inspector'),objectBrowser:cs('.clo-object-browser'),property:cs('.clo-pe-content'),toolRail:cs('.tool-rail'),rightToolbar:cs('.clo-right-tool-palette'),
      studioEnvironment:document.querySelector('.three-mount canvas')?.dataset.studioBackgroundMode,
      icon:{
        original:original?getComputedStyle(original).display:null,
        masked:masked?getComputedStyle(masked).display:null,
        maskedColor:masked?getComputedStyle(masked).backgroundColor:null,
        maskImage:masked?getComputedStyle(masked).webkitMaskImage:null,
      },
    }
  })
  const base=await measure()
  assert(base.library&&base.inspector&&base.menu&&base.rightToolbar,'Editor panels not loaded')
  await page.getByRole('button',{name:'Open Studio Settings'}).click()
  await page.getByTestId('settings-tab-theme').click()
  await page.getByRole('button',{name:'Sapphire Studio theme'}).click()
  await page.waitForTimeout(350)
  const sapphire=await measure()
  assert.equal(sapphire.theme,'sapphire')
  for(const name of ['menu','library','inspector','objectBrowser','property','rightToolbar','toolRail']){
    assert(sapphire[name],name+' missing')
    assert.notEqual(sapphire[name].backgroundColor,base[name].backgroundColor,name+' failed to recolor from factory palette')
  }
  assert.equal(sapphire.icon.original,'none','Original external SVG remains visible in themed UI')
  assert.notEqual(sapphire.icon.masked,'none','Tintable tool SVG mask is hidden')
  assert(sapphire.icon.maskImage?.includes('url('),'Icon tint mask is absent')
  assert.equal(sapphire.studioEnvironment,base.studioEnvironment,'Changing UI theme incorrectly changed the 3D Environment')
  report.checks.push({name:'Sapphire complete UI palette and icon mask',details:sapphire})
  await page.getByTestId('studio-settings-apply').click()
  await page.screenshot({path:path.join(images,'sapphire-full-application.png')})
  await page.getByRole('button',{name:'Open Studio Settings'}).click()
  await page.getByTestId('settings-tab-theme').click()
  await page.getByRole('checkbox',{name:'Enable Liquid Glass'}).check()
  await page.getByTestId('studio-settings-apply').click()
  await page.waitForTimeout(240)
  const glass=await measure()
  assert.equal(glass.liquidGlass,'true')
  assert(/blur\(/.test(glass.inspector.backdropFilter||''),'Glass inspector has no backdrop blur')
  assert(/gradient\(/.test(glass.library.backgroundImage||''),'Glass panel has no translucent specular highlights')
  report.checks.push({name:'Liquid Glass translucent panel and blur',details:{library:glass.library,inspector:glass.inspector}})
  await page.screenshot({path:path.join(images,'sapphire-liquid-glass.png')})
  await page.reload({waitUntil:'domcontentloaded'})
  await page.getByRole('button',{name:'Open Studio Settings'}).waitFor()
  const reloaded=await measure()
  assert.equal(reloaded.theme,'sapphire')
  assert.equal(reloaded.liquidGlass,'true')
  await page.getByRole('button',{name:'Open Studio Settings'}).click()
  await page.getByRole('button',{name:'Reset defaults'}).click()
  await page.getByRole('button',{name:'Reset everything'}).click()
  await page.waitForTimeout(220)
  const reset=await measure()
  assert.equal(reset.theme,'graphite')
  assert.equal(reset.liquidGlass,'false')
  assert.equal(reset.studioEnvironment,'default')
  report.checks.push({name:'Persisted settings and full reset',details:{resetTheme:reset.theme,glass:reset.liquidGlass,environment:reset.studioEnvironment}})
  assert.deepEqual(errors,[],JSON.stringify(errors))
  report.pass=true
  console.log(JSON.stringify(report,null,2))
} catch(e) {
  report.error=e.stack||String(e)
  console.error(JSON.stringify(report,null,2))
  process.exitCode=1
} finally {
  await browser?.close().catch(()=>{})
  try{process.kill(-server.pid,'SIGTERM')}catch{}
}
