// Real rendered production controls; operator-provided defect intervals must
// reach the physical stock allocator. UI simulation is NOT cutter approval.
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const browser=await chromium.launch({headless:true,
 executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
 args:['--disable-gpu','--no-first-run']})
try{
 const page=await browser.newPage({viewport:{width:1400,height:1150}})
 const errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/src/main.jsx',route=>route.fulfill({status:200,
  contentType:'application/javascript',body:''}))
 await page.goto(process.env.EXO_UI_URL||'http://127.0.0.1:5993',
  {waitUntil:'domcontentloaded',timeout:22000})
 await page.evaluate(async()=>{
  const [react,dom,module]=await Promise.all([
   import('/node_modules/.vite/deps/react.js'),
   import('/node_modules/.vite/deps/react-dom_client.js'),
   import('/src/components/AccuMarkProductionControls.jsx'),
  ])
  const project={id:'roll-defect-qa',grading:{sizes:['S'],baseSize:'S',
    widthPerSizeCm:0,lengthPerSizeCm:0},pieces:[{id:'front',name:'Front',
    cutQuantity:1,grainAngleDeg:0,points:[{x:0,y:0},{x:10,y:0},
      {x:10,y:8},{x:0,y:8}]}]}
  const node=document.createElement('div')
  node.id='exo-cutroom-live-ui-test'
  node.style.cssText='position:fixed;z-index:99999;inset:0;background:#152a36;color:#eef5f9;overflow:auto;padding:30px'
  document.body.append(node)
  const root=dom.default.createRoot(node)
  root.render(react.default.createElement(module.default,{project}))
  window.__exoCutroomQACleanup=()=>{root.unmount();node.remove()}
 })
 const root=page.locator('#exo-cutroom-live-ui-test')
 await root.getByText('Marker layout, quantities and physical plot QA').click()
 await root.getByText('Cut room order · rolls, plies and cut tickets').click()
 await root.getByRole('spinbutton',{name:'Marker quantity S'}).fill('3')
 await root.getByRole('spinbutton',{name:'Marker fabric width'}).fill('30')
 await root.getByRole('checkbox',{name:/Directional fabric/}).check()
 await root.getByRole('textbox',{name:'Cut room fabric rolls'})
  .fill('A,B,blue,65,10,lot-A,2,13-22')
 await root.getByRole('button',{name:'Build validated cut room estimate'}).click()
 await root.getByText('Cut-room allocation computed · not approved').waitFor()
 assert.match(await root.innerText(),/unusable/)
 await root.getByRole('button',{name:/Download cut tickets/}).waitFor()
 await root.getByRole('textbox',{name:'Cut room fabric rolls'})
  .fill('A,B,blue,25,10,lot-A,2,6-9|14-17|22-25')
 await root.getByRole('button',{name:'Build validated cut room estimate'}).click()
 await root.getByText('Cut-room plan blocked').waitFor()
 assert.match(await root.innerText(),/INSUFFICIENT_FABRIC/)
 assert.equal(await root.getByRole('button',{name:/Download cut tickets/}).count(),0,
  'Blocked roll plans cannot export cut tickets')
 assert.deepEqual(errors,[])
 console.log(JSON.stringify({passed:true,renderedReactUI:true,
  operatorDefectIntervals:true,blockedInsufficientCleanFabric:true,
  noMachineCuttingApproval:true,errors}))
 await page.evaluate(()=>window.__exoCutroomQACleanup())
}finally{await browser.close()}
