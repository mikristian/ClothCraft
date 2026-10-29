import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { join } from 'node:path';

const base = process.env.EXO_MARKET_QA_URL || 'http://127.0.0.1:5499/';
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--no-sandbox'] });
const errors = [];
let checks = 0;
const test = async (label, fn) => { await fn(); checks++; console.log('PASS ' + label); };
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base+'#marketplace', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#asset-grid .asset-card'));
  await test('Dedicated Marketplace route opens directly to listings without a large photo hero', async () => {
    assert.equal(await page.locator('#project-home').isVisible(), false);
    assert.equal(await page.locator('#catalog-section').isVisible(), true);
    assert.equal(await page.locator('#ar-studio').count(), 0);
    assert.ok((await page.locator('body').innerText()).includes('Explore the marketplace.'));
    assert.ok((await page.locator('#catalog-section').boundingBox()).y < 140);
  });
  await test('Filters appear horizontally above the card grid', async () => {
    const geometry = await page.evaluate(() => {
      const facet = document.querySelector('#facets').getBoundingClientRect();
      const card = document.querySelector('#asset-grid').getBoundingClientRect();
      return { width: facet.width, cardWidth: card.width, facetBottom: facet.bottom, cardTop: card.top };
    });
    assert.ok(geometry.width > geometry.cardWidth - 5 && geometry.facetBottom < geometry.cardTop, JSON.stringify(geometry));
    assert.ok(await page.locator('#date-choice').count());
    assert.ok(await page.locator('#animated-check').count());
  });
  await test('Runway subcategory filters existing sample resources', async () => {
    await page.locator('[data-market-category="Runways"]').click();
    assert.ok(Number((await page.locator('#result-count').innerText()).split(' ')[0]) > 0);
    assert.equal((await page.locator('.exo-market-tabs [aria-pressed="true"]').innerText()).trim(), 'Runways');
  });
  await test('Downloadable filter shows two genuine free PDF patterns', async () => {
    await page.locator('[data-market-category="All"]').click();
    await page.locator('#downloadable-check').check();
    assert.equal(await page.locator('.asset-card').count(), 2);
    assert.ok((await page.locator('.asset-grid').innerText()).includes('Drawstring Pouch'));
    assert.ok((await page.locator('.asset-grid').innerText()).includes('Foundation Tee'));
    await page.locator('#clear-filters').click();
    assert.ok(await page.locator('.asset-card').count() > 0);
  });
  await test('Date and style changes update result count and reset cleanly', async () => {
    await page.locator('#date-choice').selectOption('day');
    const today = await page.locator('#result-count').innerText();
    await page.locator('#date-choice').selectOption('all');
    const all = await page.locator('#result-count').innerText();
    assert.notEqual(today, all);
    await page.locator('#topic-choice').selectOption('Architecture');
    const styleCount = await page.locator('#result-count').innerText();
    assert.notEqual(styleCount, all);
    await page.locator('#clear-filters').click();
    assert.equal(await page.locator('#date-choice').inputValue(), 'all');
  });
  await test('Sort, search, and creator navigation function', async () => {
    await page.locator('#sort-choice').selectOption('new');
    await page.locator('#catalog-search').fill('denim');
    assert.ok(await page.locator('.asset-card').count() > 0);
    await page.locator('#catalog-search').fill('');
    await page.locator('.nav-discover-group>.nav-link').hover();
    await page.locator('.nav-discover-menu [data-nav="creators"]').click();
    assert.equal(new URL(page.url()).hash, '#creators');
    assert.ok((await page.locator('#alt-view').innerText()).toLowerCase().includes('creator'));
  });
  await test('Creator directory supports filtering and opening a portfolio', async () => {
    assert.ok(await page.locator('.dp-directory-card').count() > 0);
    await page.locator('[data-creator-filter="top"]').click();
    await page.locator('[data-creator-search]').fill('EXO Studio');
    assert.ok(await page.locator('.dp-directory-card').count() > 0);
    await page.locator('.dp-directory-open').first().click();
    assert.ok((await page.locator('.dp-person h1').innerText()).includes('EXO'));
    assert.ok(await page.locator('.dp-collection[data-collection]').count() > 0);
  });
  await test('Awards & contests route is available', async () => {
    await page.locator('.nav-discover-group>.nav-link').hover();
    await page.locator('.nav-discover-menu [data-nav="awards"]').click();
    assert.equal(new URL(page.url()).hash, '#awards');
    assert.ok(/awards|challenge|contest/i.test(await page.locator('#alt-view').innerText()));
  });
  await test('Contest submission is a local draft, not a live entry', async () => {
    await page.locator('.exa-root [data-action="new"]').first().click();
    await page.locator('#exa-draft-form [name="title"]').fill('QA fashion silhouette');
    await page.locator('#exa-draft-form [name="creator"]').fill('Local studio');
    await page.locator('#exa-draft-form [name="description"]').fill('A locally saved concept for QA only.');
    await page.locator('#exa-draft-form [type="submit"]').click();
    assert.ok((await page.locator('.exa-draft-grid').innerText()).includes('QA fashion silhouette'));
    assert.ok((await page.locator('.exa-notice').innerText()).includes('Nothing was submitted'));
    await page.locator('.main-links [data-nav="marketplace"]').click();
    assert.ok(await page.locator('#catalog-section').isVisible());
  });
  await page.screenshot({ path: '/tmp/exo-marketplace-20261018-desktop.png', animations: 'disabled', timeout: 12000 });
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  mobile.on('pageerror', e => errors.push(e.message));
  await mobile.goto(base+'#marketplace', { waitUntil: 'domcontentloaded' });
  await mobile.waitForFunction(() => document.querySelector('#asset-grid .asset-card'));
  await test('Mobile viewport has no horizontal document overflow', async () => {
    const width = await mobile.evaluate(() => ({ screen: innerWidth, scroll: document.documentElement.scrollWidth }));
    assert.ok(width.scroll <= width.screen + 3, JSON.stringify(width));
  });
  await mobile.screenshot({ path: '/tmp/exo-marketplace-20261018-mobile.png', animations: 'disabled', timeout: 12000 });
  assert.deepEqual(errors, [], 'Browser errors');
  console.log('PASS MARKETPLACE REDESIGN ' + checks + ' functional checks, no browser errors.');
} finally { await browser.close(); }
