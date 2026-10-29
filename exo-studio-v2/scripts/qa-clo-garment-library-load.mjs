import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
const page=await browser.newPage({viewport:{width:1440,height:900}})
const errors=[]
page.on('pageerror',error=>errors.push(error.message))
try{
  await page.goto(`${process.env.EXO_QA_URL||'http://127.0.0.1:5194'}/?desktop=1&testSession=clo-male-source-qa`,{waitUntil:'domcontentloaded',timeout:60000})
  await page.getByRole('button',{name:'Browse garments'}).waitFor({timeout:30000})
  await page.getByRole('navigation',{name:'Library categories'}).getByRole('button',{name:'Garment',exact:true}).click()
  const tile=page.getByRole('button',{name:/CLO Male T-Shirt · Source Pattern/}).first()
  await tile.waitFor({state:'visible',timeout:15000})
  await tile.scrollIntoViewIfNeeded()
  await tile.hover()
  const preview=page.locator('[data-library-preview="Garment:clo-male-tshirt"]')
  await preview.waitFor({state:'visible',timeout:12000})
  await page.waitForFunction(()=>document.querySelector('[data-library-preview="Garment:clo-male-tshirt"] canvas')?.dataset.previewStatus==='ready',{timeout:20000})
  const source=await preview.locator('canvas').evaluate(c=>c.dataset.previewSourceGeometry)
  assert.equal(source,'official-clo-obj-export')
  await tile.click()
  await page.waitForFunction(()=>Object.keys(localStorage).some(key=>{
    if(!key.includes('project')&&!key.includes('session'))return false
    try{const stored=JSON.parse(localStorage.getItem(key));return stored?.templateId==='clo-male-tshirt'}catch{return false}
  }),{timeout:12000})
  assert.deepEqual(errors,[])
  console.log('PASS: Full app Library > Garment displays CLO source mesh preview and loads independent seven-piece CLO male T-shirt into isolated session')
}finally{await browser.close()}
