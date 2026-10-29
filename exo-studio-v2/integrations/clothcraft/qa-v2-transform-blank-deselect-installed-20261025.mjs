// Read-only installed EXO V2 acceptance: Transform Pattern blank canvas click
// must clear the actual selected native piece, its marquee and all handles.
// Run against existing installed 5386/5385; never starts services or edits a
// garment. Intended to be repeated after each desktop app relaunch.
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const host=process.env.EXO_INSTALLED_WEB_URL||'http://127.0.0.1:5386'
const browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--disable-gpu']})
try{
  const page=await browser.newPage({viewport:{width:1728,height:1040}})
  page.setDefaultTimeout(18000)
  const errors=[],blocked=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.route('**/*',route=>{
    const request=route.request(),url=request.url()
    if(!url.includes('127.0.0.1:5385')||request.method()==='GET')return route.continue()
    if(request.method()==='POST'){
      let operation=null
      try{operation=request.postDataJSON()?.op}catch{}
      if(url.endsWith('/agent/v1/keys') ||
        (url.endsWith('/workspace')&&['open','snapshot','status','get'].includes(operation)))
        return route.continue()
    }
    blocked.push(`${request.method()} ${url}`)
    return route.abort()
  })
  await page.goto(`${host}/?desktop=1&engine=clothcraft&transformDeselectReadOnly=20261025`,
    {waitUntil:'domcontentloaded',timeout:20000})
  const board=page.locator('.cc-board').first()
  const svg=board.locator('svg[aria-label="Metric 2D pattern board with linked sewing and measurements"]')
  await svg.waitFor()
  const front=board.locator('[data-panel="front"]').first()
  await front.waitFor({timeout:20000})
  const selectTool=board.getByRole('toolbar',{name:'2D viewport quick tools'})
    .getByRole('button',{name:'Select / Transform',exact:true}).first()
  await selectTool.click()
  const checks=[]
  for(let iteration=0;iteration<3;iteration++){
    // Graphic prints may cover the path center. Choose an actually visible
    // native pattern pixel instead of using Playwright's center heuristic.
    const visiblePatternPixel=await front.evaluate(el=>{
      const rect=el.getBoundingClientRect()
      for(const fx of [.05,.10,.20,.80,.90,.50])for(const fy of [.38,.48,.58,.25,.70]){
        const x=rect.x+rect.width*fx,y=rect.y+rect.height*fy
        if(document.elementFromPoint(x,y)===el)return {x,y}
      }
      return null
    })
    assert(visiblePatternPixel,'No uncovered native front pattern pixel')
    await page.mouse.click(visiblePatternPixel.x,visiblePatternPixel.y)
    const marquee=board.locator('[data-2d-marquee="front"]')
    await marquee.waitFor({state:'attached'})
    assert.equal(await marquee.locator('[data-2d-scale-guide]').count(),8)
    assert.equal(await board.locator('[data-2d-pattern-piece="front"]')
      .getAttribute('data-2d-pattern-selected'),'true')
    const rect=await svg.boundingBox()
    assert(rect&&rect.width>100&&rect.height>300)
    const x=rect.x+55+iteration*8,y=rect.y+rect.height-75-iteration*12
    const empty=await page.evaluate(([x,y])=>{
      const target=document.elementFromPoint(x,y)
      return target?.tagName?.toLowerCase()==='svg'&&
        !target?.closest?.('[data-panel],[data-2d-graphic-hit]')
    },[x,y])
    assert(empty,`Expected actually empty board target at (${x},${y})`)
    await page.mouse.click(x,y)
    await page.waitForFunction(()=>!document.querySelector('[data-2d-marquee="front"]')&&
      document.querySelector('[data-2d-pattern-piece="front"]')?.getAttribute('data-2d-pattern-selected')==='false')
    const after={marquee:await marquee.count(),handles:await board.locator('[data-2d-scale-guide]').count(),
      selected:await board.locator('[data-2d-pattern-piece="front"]')
        .getAttribute('data-2d-pattern-selected')}
    assert.deepEqual(after,{marquee:0,handles:0,selected:'false'})
    checks.push({iteration:iteration+1,click:[x,y],after})
  }
  assert.equal(errors.length,0,`Page errors: ${errors.join('; ')}`)
  assert.equal(blocked.length,0,`Unexpected native modifying requests: ${blocked.join('; ')}`)
  console.log(JSON.stringify({passed:true,installedWeb:host,checks,pageErrors:errors.length,
    backendWritesBlocked:blocked.length},null,2))
}finally{await browser.close()}
