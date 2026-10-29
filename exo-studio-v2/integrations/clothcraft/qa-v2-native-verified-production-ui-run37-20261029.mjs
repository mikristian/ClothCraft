// Lightweight rendered React controls under existing local Vite: no new
// native session, build, installed app change, or real factory order created.
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const server='http://127.0.0.1:5993'
const browser=await chromium.launch({headless:true,
 executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
 args:['--disable-gpu','--no-first-run']})
try{
 const page=await browser.newPage({viewport:{width:1400,height:960}})
 const errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/src/main.jsx',route=>route.fulfill({
  status:200,contentType:'application/javascript',body:''}))
 await page.goto(server,{waitUntil:'domcontentloaded',timeout:18000})
 await page.evaluate(async()=>{
  const [react,dom,component]=await Promise.all([
   import('/node_modules/.vite/deps/react.js'),
   import('/node_modules/.vite/deps/react-dom_client.js'),
   import('/src/components/NativeVerifiedProductionOrder20261029.jsx'),
  ])
  const originalFetch=window.fetch
  window.__orderCalls=[]
  window.fetch=async(url,options)=>{
   if(!String(url).includes('/production/native-verified/v1/'))
    return originalFetch(url,options)
   window.__orderCalls.push({url,body:JSON.parse(options.body)})
   const source={revision:7,sizes:['XS','S'],panels:[
    {id:'front',name:'Front',sourceFabricId:'woven-reference',sourceGrainDegrees:90},
    {id:'back',name:'Back',sourceFabricId:'woven-reference',sourceGrainDegrees:90},
   ],factoryApproved:false,cuttingAuthorized:false}
   const result={sourceRevision:7,results:[
    {size:'XS',markers:[{marker:{placements:[{pieceId:'front'},{pieceId:'back'}]}}]},
    {size:'S',markers:[{marker:{placements:[{pieceId:'front'},{pieceId:'back'}]}}]},
   ],cuttingAuthorized:false,factoryApproved:false,sourceMaterialsChecked:true}
   const payload=String(url).endsWith('/source')?{ok:true,source}:{ok:true,result}
   return new Response(JSON.stringify(payload),{status:200,
    headers:{'content-type':'application/json'}})
  }
  const container=document.createElement('div')
  container.id='native-verified-production-qa'
  document.body.append(container)
  window.__orderRoot=dom.default.createRoot(container)
  window.__orderRender=revision=>window.__orderRoot.render(
   react.default.createElement(component.default,{nativeBase:'http://127.0.0.1:5385',
    nativeRevision:revision,disabled:false}))
  window.__orderRender(7)
 })
 const root=page.locator('#native-verified-production-qa')
 await root.getByRole('button',{name:'Load saved native size and material source'}).click()
 await root.getByRole('table',{name:'Native graded cutpiece quantity matrix'}).waitFor()
 assert.equal(await root.getByRole('spinbutton',{name:'XS cut quantity front'}).inputValue(),'1')
 await root.getByRole('spinbutton',{name:'XS cut quantity front'}).fill('3')
 await root.getByRole('textbox',{name:'Cutting fabric front'}).fill('shell-new')
 await root.getByRole('textbox',{name:'Marker group front'}).fill('shell-group')
 await root.getByRole('button',{name:'Verify live Rust CUT and calculate every size marker'}).click()
 await root.getByText('Verified native CUT-to-marker study · not approved').waitFor()
 const actual=await page.evaluate(()=>window.__orderCalls)
 assert.equal(actual.length,2)
 assert.deepEqual(actual[0].body,{})
 assert.equal(actual[1].body.expectedRevision,7)
 assert.equal(actual[1].body.quantitiesBySize.XS.front,3)
 assert.equal(actual[1].body.materialsByPanel.front.fabricId,'shell-new')
 assert.equal(actual[1].body.materialsByPanel.front.groupId,'shell-group')
 assert(!Object.hasOwn(actual[1].body,'cuts'))
 assert(!Object.hasOwn(actual[1].body,'nativeCutlineFingerprint'))
 assert.equal(await root.getByRole('button',{name:/Download source-bound QA JSON/}).count(),1)
 await page.evaluate(()=>window.__orderRender(8))
 await root.getByText('Native garment changed. Reload the exact saved grading catalog before inspecting.').waitFor()
 assert.equal(await root.getByRole('button',{name:/Download source-bound QA JSON/}).count(),0)
 assert.deepEqual(errors,[])
 console.log(JSON.stringify({passed:true,renderedReact:true,
  operatorEditPerSize:true,operatorMaterialBinding:true,noCUTDataFromBrowser:true,
  revisionInvalidation:true,downloadNotApproved:true,pageErrors:errors.length}))
}finally{await browser.close()}
