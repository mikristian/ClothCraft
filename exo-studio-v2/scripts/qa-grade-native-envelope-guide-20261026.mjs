import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

// Isolated UI regression on an already-running Vite server; no Rust edit,
// grading rule save, full app build, or production source mutation.
const origin=process.env.EXO_QA_ORIGIN||'http://127.0.0.1:5174'
const executablePath=process.env.EXO_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const browser=await chromium.launch({headless:true,executablePath})
try{
 const page=await browser.newPage()
 const errors=[]
 page.on('pageerror',error=>errors.push(error.message))
 await page.goto(origin,{waitUntil:'domcontentloaded',timeout:15000})
 await page.evaluate(async()=>{
   const React=await import('/node_modules/.vite/deps/react.js')
   const ReactDOM=await import('/node_modules/.vite/deps/react-dom_client.js')
   const {default:Dashboard}=await import('/src/components/NativeGradingQualityDashboard20261025.jsx')
   const {createAccuMarkNativeRuleSet,editAccuMarkNativePointRule}=await import('/src/core/accumarkNativePointRuleSet20261023.js')
   const snapshot={revision:6,template:{panels:[{id:'front',polygon:{points:[[0,0],[.2,0],[.2,.3],[0,.3]],edges:['bottom','right','top','left']},pattern:{width:.2,height:.3,nx:1,ny:1}}],seams:[],fabrics:[]}}
   const base=createAccuMarkNativeRuleSet(snapshot)
   if(!base.ok)throw Error(base.reason)
   const edited=editAccuMarkNativePointRule(snapshot,base.ruleSet,{panelId:'front',pointIndex:1,size:'XXL',dxMm:24,dyMm:0})
   if(!edited.ok)throw Error(edited.reason)
   const holder=document.createElement('div')
   holder.id='grading-envelope-browser-qa'
   holder.style.cssText='position:fixed;inset:0;z-index:2147483000;overflow:auto;background:#20262b'
   document.body.appendChild(holder)
   const root=(ReactDOM.createRoot||ReactDOM.default.createRoot)(holder)
   root.render((React.createElement||React.default.createElement)(Dashboard,{snapshot,ruleSet:edited.ruleSet,selectedSize:'XXL',pomDefinitions:[],nativeCatalog:null,editingDisabled:true}))
 })
 const guide=page.locator('[data-grade-envelope-fixes="true"]')
 await guide.waitFor({timeout:10000})
 assert.match(await guide.innerText(),/front/)
 assert.match(await guide.innerText(),/Authored 200\.0 × 300\.0 mm/)
 assert.match(await guide.innerText(),/Required positive extent 224\.0 × 300\.0 mm/)
 assert.match(await guide.innerText(),/temporary positive pattern bounds/)
 assert.match(await page.locator('[data-grade-native-activation-bounds]').innerText(),/PASS.*temporary positive compile bounds/)
 assert.equal(errors.length,0,errors.join(' | '))
 console.log('PASS browser grading source envelope displays exact physical required extent without modifying the source')
}finally{await browser.close()}
