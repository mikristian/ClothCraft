import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
const url=process.env.EXO_UI_URL||'http://127.0.0.1:5993'
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu','--no-first-run']})
try{
 const context=await browser.newContext({viewport:{width:1640,height:1000}})
 await context.addInitScript(()=>localStorage.setItem('exo.studioCustomization.v1',JSON.stringify({version:1,workspace:{viewportLayout:'2d'},preferences:{twoDGridStyle:'grid',twoDCanvasTheme:'classic',twoDCanvasColor:'#445566',twoDGridColor:'#aabbcc'}})))
 const page=await context.newPage()
 await page.goto(url+'/?desktop=1&engine=clothcraft&testSession=marker-hover',{waitUntil:'domcontentloaded'})
 await page.getByRole('button',{name:'Open Studio Settings'}).click({timeout:25000})
 await page.getByTestId('settings-tab-theme').click()
 const group=page.getByRole('group',{name:'2D canvas markers'})
 await group.waitFor()
 assert.equal(await group.getByRole('button').count(),3)
 assert.equal(await page.getByRole('combobox',{name:'2D canvas marker style'}).count(),0)
 let committed='grid'
 for(const [label,style] of [['Dots','dots'],['Grid lines','grid'],['None','none']]){
  await group.getByRole('button',{name:label,exact:true}).hover()
  await page.waitForFunction(expected=>document.querySelector('.app-shell')?.dataset['2dPalettePreview']==='true',style)
  const value=await page.evaluate(()=>JSON.parse(localStorage.getItem('exo.studioCustomization.v1'))?.preferences?.twoDGridStyle)
  assert.equal(value,committed,'hover must not persist '+style)
  await group.getByRole('button',{name:label,exact:true}).click()
  await page.waitForFunction(expected=>JSON.parse(localStorage.getItem('exo.studioCustomization.v1'))?.preferences?.twoDGridStyle===expected,style)
  committed=style
  console.log('PREVIEW_COMMIT',style)
 }
 console.log('MARKERS_HOVER_PASS')
}finally{await browser.close()}
