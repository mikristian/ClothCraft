// Public screenshots of the real ClothCraft V2 UI; no recording or native
// writes. Captures a clean browser context, with ALL /workspace RPC directed
// to the isolated private backend, and aborts traffic to production 5385.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'screenshots');
const source=process.env.CLOTHCRAFT_GALLERY_UI||'http://127.0.0.1:5386';
const privateBackend=process.env.CLOTHCRAFT_GALLERY_PRIVATE||'http://127.0.0.1:5688';
const chrome=process.env.CLOTHCRAFT_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const stamp='20261019';
const written=[],pageErrors=[],routing=[];
let browser;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const summary=async page=>page.evaluate(()=>({
  title:document.title,theme:document.documentElement.dataset.studioTheme||document.body.dataset.studioTheme,
  boardCount:document.querySelectorAll('.cc-board').length,
  canvasCount:document.querySelectorAll('.cc-scene canvas').length,
  text:document.body.innerText.slice(0,500)
}));
async function save(page,name,description) {
  await sleep(850);
  const file=`clothcraft-v2-${stamp}-${name}.jpg`;
  const dest=path.join(output,file);
  await page.screenshot({path:dest,type:'jpeg',quality:83,animations:'disabled',timeout:25000});
  const bytes=(await fs.stat(dest)).size;
  assert(bytes>50000,`Empty screenshot: ${file}, ${bytes} bytes`);
  written.push({file,bytes,description,...await summary(page)});
  console.log('SCREENSHOT',file,bytes);
}
async function saveDetail(page,locator,name,description) {
  const file=`clothcraft-v2-${stamp}-${name}.jpg`;
  const dest=path.join(output,file);
  await sleep(600);
  await locator.screenshot({path:dest,type:'jpeg',quality:89,animations:'disabled',timeout:25000});
  const bytes=(await fs.stat(dest)).size;
  assert(bytes>18000,`Empty detail screenshot: ${file}, ${bytes} bytes`);
  written.push({file,bytes,description,detail:true,...await summary(page)});
  console.log('DETAIL',file,bytes);
}
async function button(page,label) {
  const target=page.getByRole('button',{name:label,exact:true}).first();
  if(await target.isVisible().catch(()=>false)){await target.click({timeout:2500});return true;}
  return false;
}
async function select(page,name,value) {
  const target=page.getByRole('combobox',{name,exact:true}).first();
  if(await target.count()){
    const options=await target.locator('option').evaluateAll(nodes=>nodes.map(n=>({value:n.value,label:n.textContent})));
    const hit=options.find(x=>x.value===value||x.label?.toLowerCase().includes(value.toLowerCase()));
    if(hit){
      await target.selectOption(hit.value,{force:true,timeout:3500});
      console.log('SELECT',name,value,'actual',await target.inputValue(),'visible',await target.isVisible());
      return true;
    }
  }
  return false;
}
try {
  await fs.mkdir(output,{recursive:true});
  const health=await fetch(privateBackend+'/health',{signal:AbortSignal.timeout(4500)});
  assert(health.ok,'Isolated private backend not ready');
  browser=await chromium.launch({headless:true,executablePath:chrome,
    args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']});
  const context=await browser.newContext({viewport:{width:1600,height:900},deviceScaleFactor:1});
  await context.route(/^http:\/\/(?:localhost|127\.0\.0\.1):5385\//,route=>route.abort());
  await context.route('**/workspace',async route=>{
    const request=route.request();
    const url=new URL(request.url());
    if(url.pathname!=='/workspace')return route.abort();
    routing.push({from:request.url(),method:request.method(),to:privateBackend+'/workspace'});
    const response=await route.fetch({url:privateBackend+'/workspace'});
    await route.fulfill({response});
  });
  const page=await context.newPage();
  page.on('pageerror',err=>pageErrors.push(err.message));
  await page.goto(source+'/?desktop=1&engine=clothcraft',{waitUntil:'domcontentloaded',timeout:30000});
  await page.locator('.workspaces').first().waitFor({state:'visible',timeout:30000});
  await page.locator('.cc-board').first().waitFor({state:'visible',timeout:30000});
  await sleep(2600);
  console.log('UI',JSON.stringify(await summary(page)));
  console.log('CONTROLS',JSON.stringify(await page.evaluate(()=>({
    selects:[...document.querySelectorAll('select')].map(x=>({aria:x.getAttribute('aria-label'),options:[...x.options].map(y=>({value:y.value,label:y.textContent})).slice(0,30)})),
    buttons:[...document.querySelectorAll('button')].map(x=>({aria:x.getAttribute('aria-label'),title:x.title,text:x.innerText?.slice(0,55)})).filter(x=>x.aria||x.title||x.text).slice(0,120)
  }))));
  assert((await page.locator('.cc-board').count())>0,'No authentic 2D board');
  await save(page,'01-overview','Real default Graphite ClothCraft UI with 2D and 3D workspaces');
  await saveDetail(page,page.locator('.cc-board').first(),'02-pattern-drafting','Close-up of real two-dimensional pattern cutlines and surface fill');
  if(await select(page,'Workspace','Sewing'))await save(page,'03-sewing','Real sewing workspace and pattern editing controls');
  await select(page,'3D and 2D window arrangement','split');
  if(await button(page,'Browse fabrics'))await save(page,'04-fabrics','Actual fabric swatch library and linked garment editor');
  if(await button(page,'Browse garments'))await save(page,'06-garments','Actual garment starter catalog');
  await saveDetail(page,page.locator('.cc-scene').first(),'07-3d-viewport','Close-up of real neutral fitting avatar and native T-shirt in live 3D viewport');
  if(await button(page,'Toggle Hardware and Trims folders'))await save(page,'09-hardware','Real hardware and trims library tree');
  if(await button(page,'Open Studio Settings')){
    const theme=page.locator('.studio-settings-dialog').getByRole('button',{name:'Theme',exact:true});
    if(await theme.isVisible().catch(()=>false))await theme.click();
    await save(page,'08-theme-settings','Real settings panel with current theme controls');
  }
  const report={source,privateBackend,viewport:[1600,900],capturedAt:new Date().toISOString(),
    screenshots:written,routeCount:routing.length,productionRequests:0,
    routeMethods:[...new Set(routing.map(x=>x.method))],pageErrors};
  await fs.writeFile(path.join(output,`clothcraft-v2-${stamp}-capture-evidence.json`),JSON.stringify(report,null,2)+'\n');
  assert(written.length>=5,'Insufficient real UI screenshots');
  console.log('RESULT',JSON.stringify({ok:true,files:written.map(x=>x.file),errors:pageErrors}));
  await context.close();
} finally {
  await browser?.close();
}
