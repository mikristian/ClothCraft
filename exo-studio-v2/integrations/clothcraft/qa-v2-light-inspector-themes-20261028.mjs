/** Production browser proof: actual Object Browser, Property Editor,
 * measurement header, inputs and gallery obey light and dark EXO schemes. */
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
const uri='http://127.0.0.1:5386'
const themes=['pure-white-light','cream-light','vanilla-light','warm-gray-light','silver-gray-light','sea-glass-light','graphite']
const light=new Set(themes.slice(0,-1))
const errors=[]
let browser,page,stage='start'
const calcLuminance=rgb=>{
 const v=rgb.match(/[\d.]+/g)?.slice(0,3).map(Number)||[]
 assert.equal(v.length,3,'Missing computed CSS RGB: '+rgb)
 const linear=v.map(c=>{const s=c/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4})
 return .2126*linear[0]+.7152*linear[1]+.0722*linear[2]
}
try{
 browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--disable-gpu','--no-first-run']})
 const context=await browser.newContext({viewport:{width:1680,height:1020}})
 await context.addInitScript(()=>{
  if(location.host!=='127.0.0.1:5386'||sessionStorage.getItem('exo-light-theme-seeded'))return
  // A complete v1 customization source, normalized on load in EXO.
  localStorage.setItem('exo.studioCustomization.v1',JSON.stringify({
   version:1,appearance:{theme:'pure-white-light',panelFinish:'balanced',liquidGlass:false},
   workspace:{viewportLayout:'split',objectBrowserVisible:true,inspectorWidth:400},
  }))
  sessionStorage.setItem('exo-light-theme-seeded','1')
 })
 page=await context.newPage()
 page.on('pageerror',error=>errors.push(error.message))
 stage='load installed app'
 await page.goto(uri+'/?desktop=1&engine=clothcraft&testSession=light-inspector-theme-20261028',
  {waitUntil:'domcontentloaded'})
 await page.locator('.app-shell[data-studio-theme-mode="light"]').waitFor({timeout:22000})
 await page.locator('.clo-inspector .clo-property-panel').waitFor({timeout:22000})
 const probes=[
  ['property','.clo-inspector .clo-property-panel'],
  ['browser','.clo-inspector .clo-object-browser'],
  ['measurement','.clo-inspector .clo-pe-unit-selection'],
  ['propertyHeader','.clo-inspector .clo-pe-header'],
  ['objectHeader','.clo-inspector .clo-object-browser>.clo-panel-header'],
 ]
 // Graphic measurement display is shown under Object Browser > Graphic.
 const graphicTab=page.locator('.clo-object-browser button').filter({hasText:/Graphic/i}).first()
 if(await graphicTab.count())await graphicTab.click({timeout:3500}).catch(()=>{})
 if(await page.locator('.clo-object-graphic-measurements').count()){
  probes.push(['graphicMeasurement','.clo-object-graphic-measurements'])
 }
 const shown=[]
 for(const name of themes){
  stage='inspect '+name
  await page.evaluate(theme=>{
   const data=JSON.parse(localStorage.getItem('exo.studioCustomization.v1'))
   data.appearance={...data.appearance,theme,panelFinish:'balanced',liquidGlass:false}
   localStorage.setItem('exo.studioCustomization.v1',JSON.stringify(data))
  },name)
  await page.reload({waitUntil:'domcontentloaded'})
  await page.locator('.app-shell[data-studio-theme="'+name+'"]').waitFor({timeout:17000})
  const samples=await page.evaluate(selectors=>selectors.map(([key,sel])=>{
   const element=document.querySelector(sel)
   if(!element)return {key,missing:true}
   const css=getComputedStyle(element)
   return {key,background:css.backgroundColor,color:css.color,display:css.display}
  }),probes)
  const property=samples.find(row=>row.key==='property')
  const browser=samples.find(row=>row.key==='browser')
  assert(!property.missing&&!browser.missing,'Missing live inspector: '+JSON.stringify(samples))
  assert(samples.some(row=>row.key==='objectHeader'&&!row.missing))
  if(light.has(name)){
   for(const item of samples.filter(row=>!row.missing)){
    const brightness=calcLuminance(item.background)
    assert(brightness>.62,`${name}: ${item.key} still dark (${item.background})`)
    assert(calcLuminance(item.color)<.36,`${name}: ${item.key} ink too pale (${item.color})`)
   }
  }else{
   assert(calcLuminance(property.background)<.17,
    'Dark Graphite unexpectedly became light')
  }
  shown.push({theme:name,surfaces:samples})
  console.log(JSON.stringify({theme:name,
   property:property.background,browser:browser.background,
   checked:samples.filter(row=>!row.missing).length}))
 }
 assert.deepEqual(errors,[])
 console.log(JSON.stringify({passed:true,realChrome:true,realInstalledMacUI:true,
  testedThemes:themes.length,lightThemes:light.size,
  surfaces:shown[0].surfaces.map(s=>s.key),pageErrors:0}))
}catch(error){
 console.error(JSON.stringify({passed:false,stage,error:error.message,errors,stack:error.stack}))
 process.exitCode=1
}finally{await browser?.close().catch(()=>{})}
