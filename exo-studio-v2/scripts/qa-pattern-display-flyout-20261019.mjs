// Interaction regression for 2D Pattern Display and the controlled quick-tool
// rail. Mount the actual components against source Vite; native backend and
// saved garment are intentionally not needed or touched by this test.
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const url=process.env.EXO_PATTERN_DISPLAY_URL||'http://127.0.0.1:5188/?desktop=1&engine=clothcraft&testSession=pattern-display-qa'
const browser=await chromium.launch({headless:true,
  executablePath:process.env.EXO_CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try {
  const page=await browser.newPage({viewport:{width:1512,height:900}})
  const pageErrors=[]
  page.on('pageerror',error=>pageErrors.push(error.message))
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:15000})
  assert.equal(response?.status(),200,'Source app must be reachable')
  await page.evaluate(async()=>{
    // Match the exact Vite-optimized React module URL used by JSX components.
    // Importing the same dependency with and without ?v= creates two React
    // module instances and breaks hooks (Invalid hook call).
    const transformed=await (await fetch('/src/components/ClothCraftCornerTools.jsx')).text()
    const reactUrl=transformed.match(/\/node_modules\/\.vite\/deps\/react\.js\?v=[\w]+/)?.[0]
    if(!reactUrl)throw Error('Could not resolve component React module version')
    const [{default:React},ReactDOM,{default:ClothCraftCornerTools}]=await Promise.all([
      import(reactUrl),
      import(reactUrl.replace('react.js','react-dom_client.js')),
      import('/src/components/ClothCraftCornerTools.jsx'),
    ])
    const host=document.createElement('div')
    host.id='pattern-display-qa-mount'
    host.className='cc-board'
    host.style.cssText='position:relative;min-height:650px;width:750px;margin:40px;background:#c6c8ca;z-index:1000'
    document.body.append(host)
    const external={}
    function Harness(){
      const [tool,setTool]=React.useState('select')
      const [mode,setMode]=React.useState('edit')
      const [layers,setLayers]=React.useState({reference:true,internal:true,notches:true,allowances:true})
      external.select=(next,nextMode='edit')=>{setTool(next);setMode(nextMode)}
      external.snapshot=()=>({tool,mode,layers})
      return React.createElement(ClothCraftCornerTools,{dimension:'2d',mode,activeTool:tool,
        onChangeMode:setMode,onChangeTool:setTool,displayLayers:layers,
        onToggleDisplayLayer:name=>setLayers(previous=>({...previous,[name]:!previous[name]}))})
    }
    const createRoot=ReactDOM.createRoot||ReactDOM.default?.createRoot
    if(typeof createRoot!=='function')throw Error('Source React DOM client createRoot export missing')
    createRoot(host).render(React.createElement(Harness))
    window.__patternDisplayQAHarness=external
  })
  const board=page.locator('#pattern-display-qa-mount')
  await page.waitForTimeout(900)
  if(await board.locator('[data-tool-family="pattern-display"]').count()===0){
    const source=await board.evaluate(element=>element.outerHTML.slice(0,1200))
    throw Error(`Corner Tools React component did not mount. Browser errors: ${pageErrors.join('; ')}. Container: ${source}`)
  }
  await board.locator('[data-tool-family="pattern-display"]').waitFor({timeout:10000})
  const host=board.locator('[data-tool-family="pattern-display"]').first()
  const trigger=host.getByRole('button',{name:'2D Pattern Display'})
  // Playwright role locators omit display:none nodes. Select by DOM identity
  // because the closed CSS state itself is one of the regression checks.
  const menu=host.locator('.cc-2d-display-menu')
  await trigger.waitFor({timeout:10000})
  const visible=()=>menu.evaluate(element=>getComputedStyle(element).display!=='none')
  const first=menu.locator('button[aria-label="Show Reference Lines"]')
  const second=menu.locator('button[aria-label="Show Internal Lines"]')
  const last=menu.locator('button[aria-label="Show Seam Allowance"]')
  const isFocused=button=>button.evaluate(element=>document.activeElement===element)

  await page.mouse.move(600,100)
  assert.equal(await visible(),false,'Default menu should leave the pattern canvas unobstructed')
  assert.equal(await trigger.getAttribute('aria-expanded'),'false')
  await trigger.hover()
  assert.equal(await visible(),true,'Hover reveals display layer controls')
  await trigger.press('Escape')
  assert.equal(await visible(),false,'Escape keeps flyout hidden while trigger retains focus/hover')
  assert.equal(await isFocused(trigger),true,'Escape returns keyboard focus to trigger')
  await trigger.press('ArrowRight')
  assert.equal(await visible(),true,'ArrowRight exposes the options before focus moves')
  assert.equal(await isFocused(first),true,'ArrowRight focuses the first option')
  await page.keyboard.press('ArrowRight')
  assert.equal(await isFocused(second),true,'ArrowRight advances to the next option')
  await page.keyboard.press('End')
  assert.equal(await isFocused(last),true,'End focuses the final option')
  await page.keyboard.press('Home')
  assert.equal(await isFocused(first),true,'Home focuses the first option')
  const initial=await first.getAttribute('aria-pressed')
  await page.keyboard.press('Enter')
  assert.notEqual(await first.getAttribute('aria-pressed'),initial,'Enter toggles an actual display layer')
  await page.keyboard.press('Enter')
  assert.equal(await first.getAttribute('aria-pressed'),initial,'Second Enter restores the original layer preference')
  await page.keyboard.press('Escape')
  assert.equal(await visible(),false,'Escape dismisses the menu after a control is used')
  await trigger.click()
  assert.equal(await visible(),true,'Click can explicitly open display menu')
  await trigger.click()
  assert.equal(await visible(),false,'Second click closes display menu while pointer remains over it')
  await page.mouse.move(600,100)
  await board.locator('[data-tool-family="select"] > button').first().focus()
  await trigger.focus()
  assert.equal(await visible(),true,'Returning focus from outside reopens the menu')
  await board.locator('[data-tool-family="select"] > button').first().focus()
  await page.mouse.move(600,100)
  assert.equal(await visible(),false,'Leaving focus and pointer closes temporary controls')
  const originalState=await page.evaluate(()=>window.__patternDisplayQAHarness.snapshot())
  assert.deepEqual(originalState.layers,{reference:true,internal:true,notches:true,allowances:true},
    'Temporary layer toggles leave the original visibility choices intact')
  const activeFamilies=()=>board.locator('.clo-corner-toolkit-2d > [data-tool-family] > button.active').count()
  const pointFamily=board.locator('[data-tool-family="point"]')
  await page.evaluate(()=>window.__patternDisplayQAHarness.select('split'))
  await pointFamily.locator('button').first().waitFor({state:'visible'})
  assert.equal(await activeFamilies(),1,'An externally selected Split tool activates exactly one quick-tool family')
  const activeSplit=board.locator('.clo-corner-toolkit-2d > [data-tool-family] > button.active').first()
  assert.equal(await activeSplit.locator('..').getAttribute('data-current-tool'),'split',
    'Quick-tool family reflects the externally controlled Split tool')
  await page.evaluate(()=>window.__patternDisplayQAHarness.select('curve'))
  assert.equal(await activeFamilies(),1,'Curve selection activates exactly one quick-tool family')
  assert.equal(await board.locator('[data-tool-family="curve"]').getAttribute('data-current-tool'),'curve')
  await page.evaluate(()=>window.__patternDisplayQAHarness.select('point'))
  assert.equal(await activeFamilies(),1,'Point selection activates exactly one quick-tool family')
  assert.equal(await pointFamily.getAttribute('data-current-tool'),'point')
  await pointFamily.locator(':scope > button').hover()
  await pointFamily.locator('.clo-corner-tool-options > button[aria-label="Add / Split Point"]').click()
  assert.equal(await pointFamily.getAttribute('data-current-tool'),'split',
    'A locally selected Split action is represented by the Point tool family')
  await page.evaluate(()=>window.__patternDisplayQAHarness.select('point'))
  await page.waitForFunction(()=>document.querySelector('#pattern-display-qa-mount [data-tool-family="point"]')
    ?.getAttribute('data-current-tool')==='point',null,{timeout:3000})
  assert.equal(await pointFamily.getAttribute('data-current-tool'),'point',
    'An external Point selection replaces the previous Split icon, instead of leaving stale artwork')
  assert.equal(await activeFamilies(),1,'A locally selected option followed by external change does not duplicate active families')
  await page.evaluate(()=>window.__patternDisplayQAHarness.select('select'))
  // Quick-tool flyouts must truthfully expose expanded state, support arrow
  // navigation, and stay closed after Escape (even while focus remains on it).
  await page.mouse.move(600,100)
  const selectMain=board.locator('[data-tool-family="select"] > button').first()
  const selectOptions=board.locator('[data-tool-family="select"] > .clo-corner-tool-options')
  const pointMain=board.locator('[data-tool-family="point"] > button').first()
  await selectMain.focus()
  assert.equal(await selectMain.getAttribute('aria-expanded'),'true','Focused quick-tool family exposes its available options')
  assert.equal(await selectOptions.evaluate(node=>getComputedStyle(node).display),'flex')
  assert.equal(await selectMain.getAttribute('aria-controls'),await selectOptions.getAttribute('id'),
    'Trigger controls the exact options group')
  await selectMain.press('Escape')
  assert.equal(await selectMain.getAttribute('aria-expanded'),'false','Escape closes the quick-tool family')
  assert.equal(await selectOptions.evaluate(node=>getComputedStyle(node).display),'none')
  await selectMain.press('ArrowRight')
  assert.equal(await selectMain.getAttribute('aria-expanded'),'true','ArrowRight reopens a dismissed family')
  const selectFirst=selectOptions.locator('button:not(:disabled)').first()
  const selectLast=selectOptions.locator('button:not(:disabled)').last()
  assert.equal(await isFocused(selectFirst),true,'ArrowRight focuses first enabled alternative')
  await page.keyboard.press('End')
  assert.equal(await isFocused(selectLast),true,'End focuses last enabled alternative')
  await page.keyboard.press('Home')
  assert.equal(await isFocused(selectFirst),true,'Home focuses first enabled alternative')
  await page.keyboard.press('Escape')
  await selectMain.press('ArrowDown')
  assert.equal(await isFocused(pointMain),true,'ArrowDown traverses primary quick-tool families')
  await pointMain.press('ArrowUp')
  assert.equal(await isFocused(selectMain),true,'ArrowUp traverses primary quick-tool families in reverse')
  // Simulate the native touch pointer event plus its trusted-equivalent click
  // in React: a touch opens choices instead of selecting the primary tool.
  await selectMain.press('Escape')
  await page.evaluate(()=>{
    const button=document.querySelector('#pattern-display-qa-mount [data-tool-family="select"] > button')
    button.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch',isPrimary:true}))
    button.click()
  })
  await page.waitForFunction(()=>document.querySelector('#pattern-display-qa-mount [data-tool-family="select"]')
    ?.dataset.touchOpen==='true')
  assert.equal(await selectMain.getAttribute('aria-expanded'),'true','Touch opens the quick-tool alternatives')
  await page.evaluate(()=>{
    const button=document.querySelector('#pattern-display-qa-mount [data-tool-family="select"] > button')
    button.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch',isPrimary:true}))
    button.click()
  })
  await page.waitForFunction(()=>document.querySelector('#pattern-display-qa-mount [data-tool-family="select"]')
    ?.dataset.touchOpen==='false')
  assert.equal(await selectMain.getAttribute('aria-expanded'),'false','Second touch closes choices')
  assert.equal(await selectOptions.evaluate(node=>getComputedStyle(node).display),'none',
    'Touch-close remains hidden even if mobile browser preserves hover')
  await page.evaluate(()=>{
    const button=document.querySelector('#pattern-display-qa-mount [data-tool-family="select"] > button')
    button.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch',isPrimary:true}))
    button.click()
  })
  await page.waitForFunction(()=>document.querySelector('#pattern-display-qa-mount [data-tool-family="select"]')
    ?.dataset.touchOpen==='true')
  await page.evaluate(()=>document.body.dispatchEvent(new PointerEvent('pointerdown',
    {bubbles:true,pointerType:'touch',isPrimary:true})))
  await page.waitForFunction(()=>document.querySelector('#pattern-display-qa-mount [data-tool-family="select"]')
    ?.dataset.touchOpen==='false')
  assert.equal(await selectMain.getAttribute('aria-expanded'),'false','Outside touch dismisses active flyout')
  assert.equal((await page.evaluate(()=>window.__patternDisplayQAHarness.snapshot())).tool,'select',
    'Opening tool alternatives through touch does not accidentally select a new tool')
  assert.deepEqual(pageErrors,[],'No runtime errors during flyout interactions')
  console.log(JSON.stringify({pass:true,url,fixture:'isolated React component; no native document opened',
    covered:['initially hidden','hover open','Escape dismissal','ArrowRight focus entry',
      'arrow navigation','Home/End','layer toggle and restore','click close',
      'focus reentry','blur dismissal','controlled Split/Curve/Point selection',
      'local split then external point synchronization','quick-tool ARIA and keyboard navigation',
      'touch open/close/outside dismissal','no page errors']},null,2))
}finally{
  await browser.close()
}
