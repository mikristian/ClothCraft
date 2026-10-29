import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

// Run against an already running Vite session. No app builds/restarts or source writes.
const origin=process.env.EXO_QA_ORIGIN||'http://127.0.0.1:5174'
const chrome=process.env.EXO_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const browser=await chromium.launch({headless:true,executablePath:chrome})
const results=[]
const check=async(name,fn)=>{try{await fn();results.push({name,status:'PASS'})}catch(error){results.push({name,status:'FAIL',reason:error.message})}}
try{
  const page=await browser.newPage()
  const pageErrors=[]
  page.on('pageerror',error=>pageErrors.push(error.message))
  await page.goto(origin,{waitUntil:'domcontentloaded',timeout:12000})
  await page.evaluate(async()=>{
    const React=await import('/node_modules/.vite/deps/react.js?v=c918d781')
    const ReactDOM=await import('/node_modules/.vite/deps/react-dom_client.js?v=c918d781')
    const {default:Block}=await import('/src/components/techpack-spreadsheet/TechPackSpreadsheetBlock.jsx')
    const root=document.createElement('div')
    root.id='techpack-sheet-qa-root'
    root.style.cssText='position:fixed;inset:0;z-index:2147483000;background:white'
    document.body.appendChild(root)
    const initial={sourceRevision:12,columns:[{id:'price',label:'Price',width:150},{id:'units',label:'Units',width:150},{id:'total',label:'Total',width:150}],
      rows:[{id:'material',sourceRef:'bom:material',cells:{
        price:{input:'4',value:'4',origin:'native',sourceRef:'bom:material',sourceRevision:12},
        units:{input:'2',value:'2',origin:'native',sourceRef:'bom:material',sourceRevision:12},
        total:{input:'',value:'',origin:'native',sourceRef:'bom:material',sourceRevision:12}
      }}]}
    window.__spreadsheetQa={original:structuredClone(initial),latest:initial,keys:[]}
    window.addEventListener('keydown',event=>{if(event.key.toLowerCase()==='v'||event.key.toLowerCase()==='b')window.__spreadsheetQa.keys.push({key:event.key,stage:'bubble'})})
    const app=(ReactDOM.createRoot||ReactDOM.default?.createRoot)(root)
    const render=table=>app.render((React.createElement||React.default.createElement)(Block,{table,sourceLabel:'QA source BOM',onChange:next=>{window.__spreadsheetQa.latest=next;render(next)},onExit:()=>{}}))
    render(initial)
  })
  const sheet=page.locator('#techpack-sheet-qa-root')
  try{await sheet.locator('.tps-scroll td').first().waitFor({timeout:7000})}
  catch(error){console.error(`BLOCKED spreadsheet mount: ${pageErrors.join(' | ')||error.message}`);process.exitCode=1;await page.close();process.exit(1)}
  await check('new linked table shows source status and raw formula bar',async()=>{
    await sheet.locator('.tps-scroll td').first().click()
    assert.match(await sheet.locator('.tps-origin').innerText(),/Source linked/)
    assert.equal(await sheet.getByRole('textbox',{name:'Formula bar'}).inputValue(),'4')
  })
  await check('formula input computes SUM without persisting calculated result',async()=>{
    await sheet.locator('.tps-scroll td').nth(2).dblclick()
    const edit=sheet.getByRole('textbox',{name:'Editing C1'})
    await edit.fill('=SUM(A1:B1)')
    await edit.press('Enter')
    await assert.doesNotReject(()=>sheet.locator('.tps-scroll td').nth(2).getByText('6').waitFor())
    const state=await page.evaluate(()=>window.__spreadsheetQa)
    assert.equal(state.latest.rows[0].cells.total.input,'=SUM(A1:B1)')
    assert.equal(state.latest.rows[0].cells.total.origin,'authored')
    assert.equal(state.latest.rows[0].cells.total.override,true)
    assert.equal(state.latest.rows[0].cells.total.reviewState,'needs-review')
    assert.equal(state.original.rows[0].cells.total.input,'')
    await sheet.locator('.tps-scroll td').nth(2).click()
    assert.match(await sheet.locator('.tps-origin').innerText(),/Override.*review required/)
    assert.equal(await sheet.getByRole('textbox',{name:'Formula bar'}).inputValue(),'=SUM(A1:B1)')
    assert.equal((await sheet.locator('.tps-result').innerText()).trim(),'6')
  })
  await check('formula error displays while raw formula remains editable',async()=>{
    await sheet.locator('.tps-scroll td').nth(2).dblclick()
    const edit=sheet.getByRole('textbox',{name:'Editing C1'})
    await edit.fill('=1/0')
    await edit.press('Enter')
    assert.equal((await sheet.locator('.tps-scroll td').nth(2).innerText()).trim(),'#DIV/0!')
    await sheet.locator('.tps-scroll td').nth(2).click()
    assert.equal(await sheet.getByRole('textbox',{name:'Formula bar'}).inputValue(),'=1/0')
    assert.equal((await sheet.locator('.tps-result').innerText()).trim(),'#DIV/0!')
  })
  await check('V and B typing in cells stays in editor, away from app shortcuts',async()=>{
    const count=await page.evaluate(()=>window.__spreadsheetQa.keys.length)
    await sheet.locator('.tps-scroll td').nth(2).dblclick()
    const edit=sheet.getByRole('textbox',{name:'Editing C1'})
    await edit.fill('VB')
    await edit.press('Enter')
    assert.equal((await sheet.locator('.tps-scroll td').nth(2).innerText()).trim(),'VB')
    assert.equal(await page.evaluate(()=>window.__spreadsheetQa.keys.length),count)
  })
  await page.close()
}finally{await browser.close()}
for(const result of results)console.log(`${result.status} ${result.name}${result.reason?` — ${result.reason}`:''}`)
console.log(`${results.filter(r=>r.status==='PASS').length}/${results.length} passed`)
if(results.some(r=>r.status==='FAIL'))process.exitCode=1
