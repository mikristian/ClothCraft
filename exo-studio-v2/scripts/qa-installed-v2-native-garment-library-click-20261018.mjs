// Verifies the actual installed app's Library -> Rust conversion flow without
// changing the user's active saved garment or issuing a native Open command.
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const origin=process.env.EXO_QA_URL||'http://127.0.0.1:5386'
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
try{
  const page=await browser.newPage({viewport:{width:1500,height:950}})
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.addInitScript(()=>{
    const original=window.dispatchEvent.bind(window)
    window.__qaLibraryRequests=[]
    window.dispatchEvent=function(event){
      if(event?.type==='exo-project-file-library-native-request'){
        const {requestId,action,project}=event.detail||{}
        window.__qaLibraryRequests.push({action,project})
        const result=action==='capture'
          ? {requestId,ok:true,project:{version:1,template:{name:'QA preexisting user garment',panels:[],seams:[],fabrics:[]},state:null,mesh_signature:null},name:'QA preexisting user garment'}
          : {requestId,ok:true,name:project?.template?.name||'Converted garment'}
        queueMicrotask(()=>original(new CustomEvent('exo-project-file-library-native-result',{detail:result})))
        return true
      }
      return original(event)
    }
  })
  await page.goto(origin+'/?desktop=1&engine=clothcraft&qa=garment-library-safe-click-20261018',{waitUntil:'domcontentloaded',timeout:60000})
  await page.locator('[data-native-clothcraft="true"]').waitFor({timeout:40000})
  await page.getByRole('navigation',{name:'Library categories'}).getByRole('button',{name:'Garment',exact:true}).click()
  const expectations=[
    {id:'pants',panels:4,seams:10},
    {id:'hoodie',panels:10,seams:32},
    {id:'jeans-501',panels:24,seams:28},
    {id:'clo-male-tshirt',panels:7,seams:0},
  ]
  for(const row of expectations){
    const tile=page.locator(`[data-library-hover-id="Garment:${row.id}"]`)
    await tile.scrollIntoViewIfNeeded()
    const previous=await page.evaluate(()=>window.__qaLibraryRequests.filter(event=>event.action==='open').length)
    // Native prototype click path, intercepted before the real Rust editor.
    await tile.evaluate(node=>node.click())
    await page.waitForFunction(count=>window.__qaLibraryRequests.filter(event=>event.action==='open').length>count,previous,{timeout:30000})
    const events=await page.evaluate(()=>window.__qaLibraryRequests)
    const opened=events.filter(event=>event.action==='open').at(-1).project
    assert.equal(opened.template.panels.length,row.panels,`${row.id}: panel count`)
    assert.equal(opened.template.seams.length,row.seams,`${row.id}: seam count`)
    assert.equal(opened.state,null)
    assert.ok(events.filter(event=>event.action==='capture').length>previous)
    console.log(`PASS installed ${row.id} click exported ${row.panels} native panels, ${row.seams} sewing relations; real Rust session was not opened`)
  }
  assert.deepEqual(errors,[])
  console.log('PASS live installed UI Library -> native conversion event flow, active garment untouched')
}finally{await browser.close()}
