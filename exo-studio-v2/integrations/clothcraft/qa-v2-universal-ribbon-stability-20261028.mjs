import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
const browser=await chromium.connectOverCDP('http://127.0.0.1:9222').catch(()=>null)
if(!browser){console.log('Browser CDP unavailable; static and build checks only');process.exit(0)}
const context=browser.contexts()[0];const page=context.pages().find(p=>p.url().includes('5386'));if(!page){console.log('Installed EXO browser page unavailable');process.exit(0)}
const result=await page.evaluate(()=>({root:!!document.querySelector('.main-layout'),viewer:document.querySelector('.workspaces')?.getBoundingClientRect().toJSON(),palette:!!document.querySelector('.clo-right-tool-palette')}));assert(result.root&&result.viewer?.width>0);console.log(result);
