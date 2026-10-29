/** Independent installed-interface DOM/Playwright acceptance, no build or source mutations.
 * EXO_INSTALLED_URL and EXO_CHROME override defaults. EXO_UI_WIDTHS='1280,1720' customizes viewports.
 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { readFile } from 'node:fs/promises';

const url = process.env.EXO_INSTALLED_URL || 'http://127.0.0.1:5386/?desktop=1&engine=clothcraft';
const chrome = process.env.EXO_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const widths = (process.env.EXO_UI_WIDTHS || '1280,1720').split(',').map(Number);
const sourceFix = process.env.EXO_UI_SOURCE_FIX === '1'
  ? (await readFile(new URL('../src/components/ClothCraftExoShell.css',import.meta.url),'utf8'))
      .match(/@media \(max-width:1400px\)\{\s*\.app-shell \.cc-board \.cc-corner-tool-host\{top:52px!important\}\s*\}/)?.[0]
  : null;
if(process.env.EXO_UI_SOURCE_FIX === '1') assert.ok(sourceFix,'Expected narrow-screen collision fix in source CSS');
assert.ok(widths.length >= 1 && widths.length <= 5 && widths.every(w => Number.isInteger(w) && w >= 980 && w <= 3840), 'Widths must be 980..3840 pixels');
const browser = await chromium.launch({headless:true, executablePath:chrome});
const records = [];
const tools = [
  'Freehand pencil · draw a fitted editable pattern',
  'Bézier pen · place precision pattern anchors',
  'Physical cut-and-sewn dart · adjustable intake and depth',
  'Edit pattern curve and dart-related points',
  'Manufacturing grading QA',
  'Show or hide all graded sizes',
];
const panels = [
  ['Collapse library panel','Expand library panel'],
  ['Collapse left tools panel','Expand left tools panel'],
  ['Collapse right inspector','Expand right inspector'],
  ['Collapse right tools bar','Expand right tools bar'],
];
try {
  for (const width of widths) {
    const page = await browser.newPage({viewport:{width,height:1000},deviceScaleFactor:1});
    const errors=[];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(url,{waitUntil:'domcontentloaded',timeout:20000});
      if (sourceFix || process.env.EXO_UI_CSS_PROBE) await page.addStyleTag({content:sourceFix || process.env.EXO_UI_CSS_PROBE});
      const parent=page.locator('.cc-v2-board-orientation');
      await parent.waitFor({state:'visible',timeout:20000});
      const arrow=parent.locator(':scope > .cc-pattern-studio-glass-arrow');
      assert.equal(await arrow.count(),1,'Glass arrow must be a direct child of orientation toolbar');
      assert.equal(await arrow.getAttribute('title'),'Open Pattern Studio');
      const arrowBox=await arrow.boundingBox();
      assert.ok(arrowBox && arrowBox.width>=22 && arrowBox.height>=22,'Glass arrow needs usable physical hitbox');
      await arrow.hover({timeout:4000});
      const hover=await arrow.evaluate(el=>({hover:el.matches(':hover'),cursor:getComputedStyle(el).cursor,background:getComputedStyle(el).backgroundColor}));
      assert.equal(hover.hover,true,'Arrow must receive mouse hover');
      assert.equal(hover.cursor,'pointer','Arrow must advertise interactive cursor');
      await arrow.click({timeout:7000});
      await page.waitForFunction(()=>document.querySelector('.workspaces')?.dataset.viewportLayout==='2d',{timeout:15000});
      assert.equal(await arrow.getAttribute('title'),'Return to main studio');
      const state=[];
      for(const name of tools) {
        const control=page.locator('.tool-rail').getByRole('button',{name,exact:true});
        await control.waitFor({state:'visible',timeout:8000});
        assert.equal(await control.count(),1,`Accessible button name must be unique: ${name}`);
        assert.equal(await control.isEnabled(),true,`${name} must be enabled`);
        const box=await control.boundingBox();
        assert.ok(box && box.width>=20 && box.height>=20,`Insufficient hitbox: ${name}`);
        assert.ok(box.x+box.width>0 && box.x<width,`Offscreen hitbox: ${name}`);
        await control.click({timeout:7000});
        state.push({name,width:Math.round(box.width),height:Math.round(box.height)});
      }
      assert.equal(await page.getByRole('button',{name:'Show or hide all graded sizes',exact:true}).getAttribute('aria-pressed'),'true','Grade nest must visibly change on click');
      assert.equal(await page.locator('.clo-right-tool-palette').isVisible(),true,'Right palette should be retained');
      assert.equal(await page.locator('.clo-object-browser').isVisible(),true,'Object browser should be retained');
      for(const [close,open] of panels) {
        const collapse=page.getByRole('button',{name:close,exact:true});
        await collapse.click({timeout:7000});
        const expand=page.getByRole('button',{name:open,exact:true});
        await expand.waitFor({state:'visible',timeout:5000});
        await expand.click({timeout:7000});
        await collapse.waitFor({state:'visible',timeout:5000});
      }
      await arrow.click({timeout:7000});
      await page.waitForFunction(()=>document.querySelector('.workspaces')?.dataset.viewportLayout!=='2d',{timeout:10000});
      assert.equal(await arrow.getAttribute('title'),'Open Pattern Studio');
      assert.deepEqual(errors,[],'No browser runtime exceptions');
      records.push({width,hover,tools:state,panelsRestored:panels.length,returnedToMain:true,errors});
    } finally { await page.close(); }
  }
  console.log(JSON.stringify({pass:true,installedUrl:url,records},null,2));
} finally { await browser.close(); }
