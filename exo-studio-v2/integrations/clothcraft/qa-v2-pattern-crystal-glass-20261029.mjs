import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu','--no-first-run']})
try{
 const page=await browser.newPage({viewport:{width:1280,height:820}})
 const errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/src/main.jsx',r=>r.fulfill({status:200,contentType:'application/javascript',body:''}))
 await page.goto(process.env.EXO_UI_URL||'http://127.0.0.1:5958',{waitUntil:'domcontentloaded'})
 await page.evaluate(async()=>{
  await Promise.all([
   import('/src/components/ClothCraftExoShell.css'),
   import('/src/components/ClothCraftCornerTools.css'),
   import('/src/components/ViewportQuickTools.css'),
   import('/src/components/ExoPatternCrystalGlass20261029.css'),
  ])
  const scope=document.createElement('div')
  scope.id='exo-pattern-glass-shell';scope.className='app-shell exo-v2-shell cc-rust-embedded'
  scope.dataset.patternClearGlass='true'
  scope.dataset.studioCustomized='true'
  scope.dataset.studioLiquidGlass='true'
  scope.dataset.glassToolbars='true'
  scope.style.cssText='position:fixed;inset:0;--studio-accent:#f29ec7;--studio-panel:#492439;--studio-glass-fill:51%'
  scope.innerHTML=`<div class="cc-board" style="position:absolute;inset:0 200px 0 0;background:repeating-conic-gradient(#a5b2c1 0% 25%, #d5e3ee 0% 50%) 50%/40px 40px">
   <div class="cc-corner-tool-host"><div class="clo-corner-toolkit clo-corner-toolkit-2d exo-viewport-inline-tools"><div class="clo-corner-tool-group" data-tool-family="polygon"><button aria-label="Pen" class="active"><span class="cad-tool-icon">✎</span></button><div class="clo-corner-tool-options"><button>Pen</button></div></div></div></div>
   <div class="cc-v2-orientation cc-v2-board-orientation"><strong>2D</strong><button class="active">Front</button><button>Grid</button></div>
   <div class="cc-vector-anchor-actions cc-anchor-liquid-glass"><button>+ Add</button><button>− Remove</button></div>
  </div><div class="clo-right-tool-palette" style="position:absolute;top:10px;right:7px;width:185px;height:420px">Pattern tools</div>`
  document.body.append(scope)
 })
 const check=()=>page.evaluate(()=>{
  const scope=[...document.querySelectorAll('#exo-pattern-glass-shell')].at(-1);const get=sel=>{const node=scope.querySelector(sel);if(!node)return {missing:sel,body:document.body.innerHTML.slice(-450)};const s=getComputedStyle(node);return {background:s.backgroundColor,image:s.backgroundImage,color:s.color,filter:s.backdropFilter||s.webkitBackdropFilter}}
  return {active:scope.dataset.patternClearGlass, pen:get('.clo-corner-tool-group>button'),orientation:get('.cc-v2-board-orientation'),anchor:get('.cc-anchor-liquid-glass'),palette:get('.clo-right-tool-palette')}
 })
 const matchInfo=await page.evaluate(()=>{const pen=[...document.querySelectorAll('#exo-pattern-glass-shell')].at(-1).querySelector('.clo-corner-tool-group>button');const sel='#exo-pattern-glass-shell[data-pattern-clear-glass=\"true\"] .cc-board .cc-corner-tool-host .clo-corner-toolkit-2d.exo-viewport-inline-tools .clo-corner-tool-group > button';return {match:pen?.matches(sel),selector:sel,parent:pen?.parentElement?.outerHTML.slice(0,260),styles:[...document.styleSheets].filter(s=>[...(s.cssRules||[])].some(r=>r.cssText?.includes('No solid #394650'))).map(s=>s.href)}});console.log('CSS_MATCH',JSON.stringify(matchInfo));
 const glass=await check();console.log('CRYSTAL_ON',JSON.stringify(glass))
 assert.equal(glass.active,'true')
 assert(Number(glass.pen.background.match(/rgba?\([^)]*, ([.\d]+)\)/)?.[1]||'1')<.12,'Pen lens must be nearly transparent')
 assert.match(glass.pen.filter,/blur\(1px\)/)
 assert.match(glass.orientation.filter,/blur\(1.5px\)/)
 assert.match(glass.palette.background,/rgba\(0, 0, 0, 0\)/)
 assert.match(glass.anchor.filter,/blur\(2px\)/)
 await page.screenshot({path:'integrations/clothcraft/output/exo-pattern-crystal-20261029.png'})
 await page.evaluate(()=>[...document.querySelectorAll('#exo-pattern-glass-shell')].at(-1).dataset.patternClearGlass='false')
 const original=await check();console.log('CRYSTAL_OFF',JSON.stringify(original))
 assert.notEqual(original.orientation.filter,glass.orientation.filter,'Disabling clear UI restores normal board chrome')
 assert.notEqual(original.pen.filter,glass.pen.filter,'Disabling clear UI restores normal pen lens diffusion')
 assert.deepEqual(errors,[])
 console.log('PASS True clear pattern UI: transparent rail/button/palette, clear blur, opt-out, no errors')
}finally{await browser.close()}
