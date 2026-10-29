import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu','--no-first-run']})
try{
 const page=await browser.newPage({viewport:{width:1500,height:900}})
 await page.goto(process.env.EXO_TEST_URL||'http://127.0.0.1:5992',{waitUntil:'domcontentloaded'})
 await page.evaluate(async()=>{
  const [react,dom,module]=await Promise.all([import('/node_modules/.vite/deps/react.js'),import('/node_modules/.vite/deps/react-dom_client.js'),import('/src/components/StudioCustomToolbarCollection.jsx')])
  const R=react.default,stage=document.createElement('main');stage.className='main-layout exo-custom-dock-fixture';stage.style.cssText='position:fixed;top:55px;left:40px;width:1400px;height:780px;display:flex;z-index:100000;background:#29333e';stage.innerHTML='<aside class="asset-browser" style="width:220px;flex:none"></aside><section class="workspaces" style="position:relative;flex:1"><div class="cc-viewport-3d" style="position:absolute;top:0;bottom:0;left:0;width:48%"></div><div class="cc-viewport-2d" style="position:absolute;top:0;bottom:0;right:0;width:52%"></div></section><aside class="clo-inspector" style="width:260px;flex:none"><div class="clo-inspector-content"><section class="clo-object-browser"></section></div></aside>';document.body.append(stage)
  const root=dom.default.createRoot(stage.querySelector('.workspaces'))
  const App=()=>{const [value,setValue]=R.useState({workspace:{customToolbars:[{id:'one',name:'Pattern tools',dock:'top',dockScope:'workspace',visible:true,tools:['select','point'],columns:2,orientation:'horizontal'}]}});window.__dockFixtureValue=value;return R.createElement(module.default,{value,onChange:setValue,onAction:()=>{},onCustomize:()=>{}})}
  root.render(R.createElement(App));window.__dockFixtureClean=()=>{root.unmount();stage.remove()}
 })
 const bar=page.locator('[data-custom-bar="one"]');await bar.waitFor()
 for(const scope of ['workspace','board']){
  if(scope==='board') {await bar.click({button:'right'});await page.getByRole('menuitemradio',{name:/Dock wide/}).click()}
  await page.waitForTimeout(150)
  const result=await page.evaluate(()=>{const region=document.querySelector('.exo-custom-dock-fixture [data-exo-custom-toolbar-dock=top]'),work=document.querySelector('.exo-custom-dock-fixture .workspaces').getBoundingClientRect(),board=document.querySelector('.exo-custom-dock-fixture').getBoundingClientRect(),r=region?.getBoundingClientRect();return {scope:region?.dataset.exoCustomDockScope,left:r?.left,right:r?.right,width:r?.width,workspaceLeft:work.left,workspaceRight:work.right,boardLeft:board.left,boardRight:board.right}})
  console.log(JSON.stringify(result))
  assert.equal(result.scope,scope)
  if(scope==='workspace'){assert(Math.abs(result.left-result.workspaceLeft)<3);assert(Math.abs(result.right-result.workspaceRight)<3)}
  else {assert(result.left<result.workspaceLeft-150);assert(result.right>result.workspaceRight+150)}
 }
 await page.evaluate(()=>window.__dockFixtureClean())
 console.log('CUSTOM_TOP_SCOPE_PASS')
}finally{await browser.close()}
