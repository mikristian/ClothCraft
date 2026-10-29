import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {join} from 'node:path';

const url=process.env.EXO_MARKET_QA_URL||'http://127.0.0.1:5499/';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox']});
let checks=0;
try{
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:850},reducedMotion:'reduce'});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const check=async (name,fn)=>{await fn();checks++;console.log('PASS',width,name)};
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.EXO_CONCEPT&&location.hash==='#home');
  await check('Home is default and distinct from Marketplace',async()=>{
   assert.equal(await page.locator('#project-home').isVisible(),true);
   assert.equal(await page.locator('nav.main-links [data-nav="discover"]').innerText(),'Home');
   assert.equal(await page.locator('nav.main-links [data-nav="creators"]').count(),1);
  });
  await page.locator('nav.main-links [data-nav="marketplace"]').click();
  await check('Explore marketplace and free filter',async()=>{
   assert.equal(new URL(page.url()).hash,'#marketplace');
   assert.equal(await page.locator('#catalog-section').isVisible(),true);
   await page.locator('#free-only-check').check();
   assert.ok(await page.locator('#asset-grid .asset-card').count()>0);
   const prices=await page.locator('#asset-grid .asset-price').allInnerTexts();
   assert.ok(prices.every(p=>p==='Free'),prices.join(','));
   await page.locator('#free-only-check').uncheck();
   assert.equal(await page.locator('.nav-discover-menu [data-ai-discover]').count(),0);
   assert.equal(await page.locator('.exo-market-tabs [data-market-category="Made with AI"]').count(),0);
  });
  await page.waitForFunction(()=>document.querySelectorAll('.market-fabric-photo img').length>0);
  await check('Catalog includes actual textile and hardware previews',async()=>{
   assert.ok(await page.locator('.market-fabric-photo.has-scan img').count()>0);
   assert.ok(await page.locator('.asset-card.asset-trims .asset-photograph img').count()>0);
   const failed=await page.locator('.market-fabric-photo.has-scan img').first().evaluate(el=>el.complete&&el.naturalWidth===0);
   assert.equal(failed,false);
  });
  await page.locator('.nav-discover-group>.nav-link').click();
  await check('Discover is a distinct page with nested creators',async()=>{
   assert.equal(new URL(page.url()).hash,'#explore');
   assert.ok(await page.locator('#alt-view').isVisible());
   const trigger=page.locator('.nav-discover-group>.nav-link');
   await trigger.hover();
   assert.ok(await page.locator('.nav-discover-menu [data-nav="creators"]').isVisible());
   await page.locator('.nav-discover-menu [data-nav="creators"]').click();
   assert.equal(new URL(page.url()).hash,'#creators');
  });
  await check('Creator portfolio follows collections layout',async()=>{
   await page.locator('.dp-directory-card [data-creator]').first().click();
   assert.ok((await page.locator('.dp-tabs').innerText()).includes('Collections'));
   assert.ok((await page.locator('.dp-tabs').innerText()).includes('All Items'));
   assert.ok((await page.locator('.dp-tabs').innerText()).includes('Info'));
   assert.ok((await page.locator('.dp-tabs').innerText()).includes('Board'));
   assert.ok((await page.locator('.dp-tabs').innerText()).includes('Likes'));
   assert.equal(await page.locator('[data-tab="collections"]').getAttribute('aria-current'),'page');
   const firstCollection=page.locator('.dp-collection[data-collection]').first();
   if(await firstCollection.count()){
    await firstCollection.click();
    assert.ok(await page.locator('[data-collection-back]').isVisible());
    assert.ok(await page.locator('.dp-project-grid .dp-project').count()>0);
    await page.locator('[data-collection-back]').click();
    assert.ok(await page.locator('.dp-collection[data-collection]').count()>0);
   }
  });
  await page.locator('nav.main-links [data-nav="forum"]').click();
  await check('Community remains independently navigable',async()=>assert.equal(new URL(page.url()).hash,'#forum'));
  assert.deepEqual(errors,[],`browser errors: ${errors.join(' | ')}`);
  await page.goto(url+'#fabrics',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#exfs-grid .exfs-card');
  await check('Full fabric library reuses real scans',async()=>{
   assert.ok(await page.locator('.exfs-card .exfs-real-scan').count()>0);
   assert.equal(new URL(page.url()).hash,'#fabrics');
   assert.equal(await page.locator('#catalog-section .explore-shell').isVisible(),false);
  });
  await page.screenshot({path:join('concepts/exo-community-ui/previews',`market-nav-fabric-${width}-20261018.png`),fullPage:false});
  await page.close();
 }
}finally{await browser.close();}
console.log('PASS',checks,'marketplace navigation and media checks');
