// Visual-contract smoke test against the running source app. No project edits,
// persistent settings changes or installed application changes.
import assert from 'node:assert/strict'
import {chromium} from '../../music-empire-game/node_modules/playwright-core/index.mjs'

const browser=await chromium.launch({
  headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--enable-webgl','--ignore-gpu-blocklist'],
})
try {
  const page=await browser.newPage({viewport:{width:1600,height:980}})
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto(process.env.EXO_QA_URL||'http://127.0.0.1:5188/?desktop=1&testSession=glass-foam-toolbar',
    {waitUntil:'domcontentloaded'})
  const fill=page.locator('.clo-reference-dual-bars .clo-observed-column [data-clo-slot="2d:B15"]')
  const foam=page.locator('.clo-reference-dual-bars .clo-observed-column [data-exo-action="foam-padding"]')
  await fill.waitFor({state:'attached',timeout:20000})
  assert.equal(await foam.count(),1,'Foam belongs inside the CLO-style right toolbar, not a separate footer')
  assert.equal(await page.locator('.clo-right-tool-palette > .clo-foam-padding-launch').count(),0,
    'No oversized footer Foam button')
  const geometry=await page.evaluate(()=>{
    const fill=document.querySelector('[data-clo-slot="2d:B15"]')
    const foam=document.querySelector('.clo-reference-dual-bars [data-exo-action="foam-padding"]')
    const f=fill.getBoundingClientRect(),p=foam.getBoundingClientRect()
    const fillStyle=getComputedStyle(fill),foamStyle=getComputedStyle(foam)
    return {fill:{x:f.x,y:f.y,width:f.width,height:f.height},
      foam:{x:p.x,y:p.y,width:p.width,height:p.height},
      fontFill:fillStyle.fontSize,fontFoam:foamStyle.fontSize,
      iconSize:[...foam.querySelectorAll('.cad-tool-icon')].map(icon=>icon.getBoundingClientRect().width).find(width=>width>0)}
  })
  assert.ok(Math.abs(geometry.fill.x-geometry.foam.x)<1,'Foam must align under Fill')
  assert.ok(Math.abs(geometry.foam.y-geometry.fill.y-34)<1,'Foam must be one normal row below Fill')
  assert.equal(geometry.foam.width,geometry.fill.width)
  assert.equal(geometry.foam.height,geometry.fill.height)
  assert.equal(geometry.iconSize,20)
  await fill.focus()
  await page.keyboard.press('ArrowDown')
  assert.equal(await foam.evaluate(button=>document.activeElement===button),true,
    'ArrowDown from Fill must navigate to Foam')
  await page.keyboard.press('ArrowUp')
  assert.equal(await fill.evaluate(button=>document.activeElement===button),true,
    'ArrowUp from Foam must return to Fill')

  // Native board may not be mounted when the development backend is offline.
  // Test precisely its production CSS in the existing app shell without
  // opening or changing a real garment or changing persisted preferences.
  const glass=await page.evaluate(()=>{
    const shell=document.querySelector('.app-shell')
    if(!shell)throw Error('EXO app shell not mounted')
    const oldGlass=shell.getAttribute('data-studio-liquid-glass')
    const oldIcon=shell.getAttribute('data-glass-icon-color')
    shell.setAttribute('data-studio-liquid-glass','true')
    shell.setAttribute('data-glass-icon-color','adaptive')
    const board=document.createElement('div')
    board.className='cc-board'
    board.innerHTML=`<div class="cc-v2-orientation cc-v2-board-orientation" role="group">
      <button class="active" aria-pressed="true">FR</button><button>GR</button>
    </div><div class="clo-corner-toolkit exo-viewport-inline-tools">
      <div class="clo-corner-tool-group"><button><span class="cad-tool-icon-mask"></span></button></div>
    </div>`
    shell.append(board)
    const top=board.querySelector('.cc-v2-board-orientation')
    const active=top.querySelector('.active')
    const glyph=board.querySelector('.clo-corner-tool-group > button')
    const sample=element=>{
      const style=getComputedStyle(element)
      return {backgroundColor:style.backgroundColor,backgroundImage:style.backgroundImage,
        backdropFilter:style.backdropFilter,color:style.color}
    }
    const data={bar:sample(top),selected:sample(active),idle:sample(top.lastElementChild),
      corner:sample(glyph)}
    board.remove()
    if(oldGlass===null)shell.removeAttribute('data-studio-liquid-glass')
    else shell.setAttribute('data-studio-liquid-glass',oldGlass)
    if(oldIcon===null)shell.removeAttribute('data-glass-icon-color')
    else shell.setAttribute('data-glass-icon-color',oldIcon)
    return data
  })
  for(const state of [glass.bar,glass.selected,glass.idle]) {
    assert.equal(state.backgroundColor,'rgba(0, 0, 0, 0)',
      'Glass background must have zero tint/opacity')
    assert.equal(state.backgroundImage,'none','Glass background cannot have a frosting gradient')
    assert.equal(state.backdropFilter,'none','2D top glass cannot blur the drafting canvas')
  }
  assert.equal(glass.corner.color,'rgb(16, 37, 50)','2D icons should use darker adaptive ink')
  assert.deepEqual(errors,[],`Unhandled EXO browser errors: ${errors.join('; ')}`)
  console.log(JSON.stringify({pass:true,geometry,glass}))
} finally {await browser.close()}
