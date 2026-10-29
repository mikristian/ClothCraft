import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

// Mount isolated editor on the already-running Vite server. No server restart.
const origin=process.env.EXO_QA_ORIGIN||'http://127.0.0.1:5174'
const chrome=process.env.EXO_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const browser=await chromium.launch({headless:true,executablePath:chrome})
const results=[]
const check=async(name,fn)=>{try{await fn();results.push({name,ok:true})}catch(error){results.push({name,ok:false,reason:error.message})}}
try{
 const page=await browser.newPage()
 const exceptions=[]
 page.on('pageerror',error=>exceptions.push(error.message))
 await page.goto(origin,{waitUntil:'domcontentloaded',timeout:12000})
 await page.evaluate(async()=>{
  const React=await import('/node_modules/.vite/deps/react.js')
  const ReactDOM=await import('/node_modules/.vite/deps/react-dom_client.js')
  const {default:Workbench}=await import('/src/components/IndustrialGradeWorkbench.jsx')
  const grading={sizes:['XS','S','M','L','XL','XXL'],baseSize:'M'}
  const initial={id:'factory-front',points:[{id:'p1',x:0,y:0,industrialGradeRule:{
   mode:'base-up-down-incremental',sizes:[...grading.sizes],baseSize:'M',
   down:[{dx:-.5,dy:0},{dx:-.4,dy:0}],up:[{dx:.6,dy:.1},{dx:.8,dy:.2},{dx:1,dy:.3}]
  }}]}
  const holder=document.createElement('div')
  holder.id='isolated-grade-qa'
  holder.style.cssText='position:fixed;inset:0;z-index:2147483000;background:#13191d;overflow:auto'
  document.body.appendChild(holder)
  const root=(ReactDOM.createRoot||ReactDOM.default.createRoot)(holder)
  window.__gradeQa={latest:initial,writes:[],errors:[]}
  const render=piece=>root.render((React.createElement||React.default.createElement)(Workbench,{
   piece,grading,
   onSetRule:(index,rule)=>{
    const next={...piece,points:piece.points.map((point,i)=>i===index?{...point,industrialGradeRule:rule}:point)}
    window.__gradeQa.latest=next;window.__gradeQa.writes.push(rule);render(next)
   },
   onClearRule:()=>{},onError:message=>window.__gradeQa.errors.push(message)
  }))
  render(initial)
 })
 const ui=page.locator('#isolated-grade-qa')
 await ui.getByRole('button',{name:'Paste complete size-break table'}).waitFor({timeout:7000})
 await ui.getByRole('button',{name:'Paste complete size-break table'}).click()
 const table=ui.getByRole('textbox',{name:'Spreadsheet size break values'})
 await check('copy existing independent breaks into a six-size table',async()=>{
  const data=await table.inputValue()
  assert.match(data,/From\tTo\tX cm\tY cm/)
  assert.equal(data.trim().split('\n').length,6)
 })
 await check('wrong size order blocks the whole pasted table',async()=>{
  const valid=await table.inputValue()
  await table.fill(valid.replace('XS\tS\t','XS\tL\t'))
  assert.equal(await ui.getByRole('button',{name:'Apply all size breaks'}).isDisabled(),true)
  assert.match(await ui.locator('.industrial-grade-paste span[role=status]').innerText(),/expected XS → S/)
  assert.equal(await page.evaluate(()=>window.__gradeQa.writes.length),0)
  await table.fill(valid.replace('0.4\t0','2.25\t-0.75'))
 })
 await check('valid table applies once and preserves base-up-down rule mode',async()=>{
  assert.equal(await ui.getByRole('button',{name:'Apply all size breaks'}).isEnabled(),true)
  await ui.getByRole('button',{name:'Apply all size breaks'}).click()
  const state=await page.evaluate(()=>window.__gradeQa)
  assert.equal(state.writes.length,1)
  assert.equal(state.latest.points[0].industrialGradeRule.mode,'base-up-down-incremental')
  assert.equal(state.latest.points[0].industrialGradeRule.down[1].dx,-2.25)
  assert.equal(state.latest.points[0].industrialGradeRule.down[1].dy,.75)
 })
 await check('invalid single-break value is visibly rejected without saving',async()=>{
  const input=ui.getByRole('spinbutton',{name:'XS to S X grade delta centimeters'})
  await input.fill('13')
  await input.blur()
  assert.equal(await input.getAttribute('aria-invalid'),'true')
  assert.match(await ui.locator('.industrial-grade-break-field [role=alert]').first().innerText(),/±12 cm/)
  assert.equal(await page.evaluate(()=>window.__gradeQa.writes.length),1)
 })
 assert.equal(exceptions.length,0,exceptions.join(' | '))
}finally{await browser.close()}
for(const item of results)console.log(`${item.ok?'PASS':'FAIL'} ${item.name}${item.reason?` — ${item.reason}`:''}`)
console.log(`${results.filter(result=>result.ok).length}/${results.length} passed`)
if(results.some(result=>!result.ok))process.exitCode=1
