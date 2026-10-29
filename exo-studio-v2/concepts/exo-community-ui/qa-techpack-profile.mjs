import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox']});
const base=process.env.EXO_MARKET_QA_URL||'http://127.0.0.1:5499/';
let page;
try {
  page=await browser.newPage({viewport:{width:1280,height:900}});
  await page.goto(base+'#profile/mikristian-lab',{waitUntil:'domcontentloaded'});
  await page.locator('[data-tab="techpacks"]').click();
  assert.match(await page.locator('.tp-private').innerText(),/Locked|private workspace/i);
  assert.equal(await page.locator('.tp-private [data-tp-collab]').count(),0);
  console.log('PASS: public profile is locked');
  await page.evaluate(async()=>{
    const {mountDesignerProfiles}=await import('./designer-profiles.js');
    const surface=document.createElement('main');
    surface.id='qa-private-profile';
    document.body.replaceChildren(surface);
    window.__qaProfileDestroy=mountDesignerProfiles(surface,{creatorId:'mikristian-lab',techPacks:[{packId:'qa-1',draft:{styleName:'Private Fit Spec',sku:'SKU-QA-55'},revisions:[{id:'v1',label:'Studio baseline'}]}],techPackAccess:{creatorId:'mikristian-lab',role:'owner'}});
  });
  await page.locator('#qa-private-profile [data-tab="techpacks"]').click();
  assert.match(await page.locator('.tp-private').innerText(),/Private Fit Spec/);
  await page.locator('[data-tp-notes] textarea').fill('Factory fit review');
  await page.locator('[data-tp-notes] button').click();
  await page.locator('[data-tp-save-version]').click();
  await page.locator('[data-tp-comment] textarea').fill('Check sleeve balance');
  await page.locator('[data-tp-comment] button').click();
  await page.locator('[data-tp-collab] input').fill('Sample Factory');
  await page.locator('[data-tp-collab] select').selectOption('comment');
  await page.locator('[data-tp-collab] button').click();
  assert.match(await page.locator('.tp-private').innerText(),/Check sleeve balance/);
  assert.match(await page.locator('.tp-private').innerText(),/Sample Factory/);
  assert.match(await page.locator('.tp-private').innerText(),/Local version 1/);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('[data-tab="techpacks"]').click();
  assert.doesNotMatch(await page.locator('.tp-private').innerText(),/Factory fit review|Private Fit Spec|Sample Factory/);
  console.log('PASS: local edit, revision, comment and collaborator interactions; reload stays private');
} finally {await browser.close();}
