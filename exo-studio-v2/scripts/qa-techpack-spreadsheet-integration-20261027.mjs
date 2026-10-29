import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

// Browser interaction check against an already running EXO Vite workspace.
// The temporary React root lives only in this browser context.
const origin=process.env.EXO_QA_ORIGIN||'http://127.0.0.1:5174'
const chrome=process.env.EXO_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const browser=await chromium.launch({headless:true,executablePath:chrome})
const page=await browser.newPage({viewport:{width:1450,height:950}})
try{
  await page.goto(origin,{waitUntil:'domcontentloaded',timeout:20000})
  await page.evaluate(async()=>{
    const React=await import('/node_modules/.vite/deps/react.js')
    const ReactDOM=await import('/node_modules/.vite/deps/react-dom_client.js')
    const {default:Block}=await import('/src/components/techpack-spreadsheet/TechPackSpreadsheetBlock.jsx')
    const initial={id:'qa-table',sourceRevision:7,columns:[{id:'a',label:'Calculated'},{id:'b',label:'Base'},{id:'c',label:'Notes'}],rows:[
      {id:'r1',cells:{a:{input:'=B1+1',origin:'authored'},b:{input:'2',origin:'native',sourceRef:'native:base',value:'2'},c:{input:'original',origin:'authored'}}},
      {id:'r2',cells:{a:{input:'',origin:'authored'},b:{input:'3',origin:'authored'},c:{input:'',origin:'authored'}}},
      {id:'r3',cells:{a:{input:'',origin:'authored'},b:{input:'',origin:'authored'},c:{input:'',origin:'authored'}}}
    ]}
    const surface=document.createElement('div')
    surface.id='tps-integration-qa'
    surface.style.cssText='position:fixed;inset:0;z-index:2147483000;background:white;padding:15px'
    document.body.appendChild(surface)
    window.__sheetIntegrationQa={initial:structuredClone(initial),latest:initial}
    const root=(ReactDOM.createRoot||ReactDOM.default?.createRoot)(surface)
    const render=table=>root.render((React.createElement||React.default?.createElement)(Block,{table,sourceLabel:'TechPack integration QA',onChange:next=>{window.__sheetIntegrationQa.latest=next;render(next)}}))
    render(initial)
  })
  const sheet=page.locator('#tps-integration-qa')
  const cells=sheet.locator('.tps-scroll tbody td')
  await cells.first().waitFor()
  assert.equal((await cells.first().innerText()).trim(),'3')
  await cells.nth(0).click()
  await cells.nth(3).click({modifiers:['Shift']})
  await sheet.getByRole('button',{name:'Fill down'}).click()
  assert.equal((await cells.nth(3).innerText()).trim(),'4')
  assert.equal(await page.evaluate(()=>window.__sheetIntegrationQa.latest.rows[1].cells.a.input),'=B2+1')

  await cells.nth(1).click()
  await cells.nth(5).click({modifiers:['Shift']})
  await sheet.locator('.tps-scroll').evaluate(node=>{
    const transfer=new DataTransfer()
    transfer.setData('text/plain','8')
    node.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:transfer}))
  })
  const state=await page.evaluate(()=>window.__sheetIntegrationQa.latest)
  assert.equal(state.rows[0].cells.b.input,'8')
  assert.equal(state.rows[1].cells.c.input,'8')
  assert.equal(state.rows[0].cells.b.reviewState,'needs-review')
  assert.equal(state.rows[0].cells.b.underlyingSourceValue,'2')

  await cells.nth(1).click()
  await cells.nth(5).click({modifiers:['Shift']})
  await sheet.getByRole('button',{name:'Bold selection'}).click()
  assert.equal(await page.evaluate(()=>window.__sheetIntegrationQa.latest.cellStyles?.['r1:1']?.bold),true)
  assert.equal(await page.evaluate(()=>window.__sheetIntegrationQa.latest.cellStyles?.['r2:2']?.bold),true)
  await sheet.getByLabel('Table style').selectOption('dark')
  assert.equal(await page.evaluate(()=>window.__sheetIntegrationQa.latest.tableStyle?.theme),'dark')
  assert.deepEqual(await page.evaluate(()=>window.__sheetIntegrationQa.initial.rows[0].cells.b),
    {input:'2',origin:'native',sourceRef:'native:base',value:'2'})
  console.log('PASS spreadsheet browser integration: formula fill, multi-cell paste, native review, range formatting, theme persistence')
}catch(error){
  console.error('FAIL spreadsheet browser integration:',error.stack||String(error))
  process.exitCode=1
}finally{await browser.close()}
