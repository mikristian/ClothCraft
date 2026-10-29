// Isolated 2D grading interaction. The browser uses the tee test-session key
// and never opens or edits the user's production garments or saved projects.
import assert from 'node:assert/strict'
import { chromium } from '../../music-empire-game/node_modules/playwright-core/index.mjs'
import { parseGradeRulesCsv } from '../src/core/gradeRuleCsv.js'

const browser = await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
const context = await browser.newContext({viewport:{width:1560,height:1050},acceptDownloads:true})
const page = await context.newPage()
const errors = []
page.on('pageerror', error => errors.push(error.message))
try {
  await page.goto('http://127.0.0.1:5297/?desktop=1&testSession=tee',{waitUntil:'domcontentloaded'})
  await page.getByLabel('CLO-style workspace layout presets').waitFor({state:'visible',timeout:20000})
  await page.getByLabel('CLO-style workspace layout presets').selectOption('gradingStudio')
  const table = page.locator('.grade-point-table')
  try { await table.waitFor({state:'visible',timeout:10000}) } catch (error) {
    console.error(JSON.stringify(await page.evaluate(() => ({
      selection: document.querySelector('.clo-layout-preset-select')?.value,
      workspace: document.querySelector('.clo-workspace-select')?.value,
      tables: document.querySelectorAll('.grade-point-table').length,
      inspector: document.querySelector('.clo-inspector')?.innerText?.slice(0,900),
      body: document.body.innerText.slice(0,700),
    }))))
    console.error('PAGE_ERRORS',errors)
    throw error
  }
  assert.equal(await page.locator('.workspaces').getAttribute('data-viewport-layout'),'2d')
  await page.getByRole('button',{name:'AUTO',exact:true}).first().click()
  const x = page.getByRole('spinbutton',{name:'Point 1 X grade increment in centimeters per size'})
  const y = page.getByRole('spinbutton',{name:'Point 1 Y grade increment in centimeters per size'})
  await x.fill('-1.25'); await x.press('Tab')
  await y.fill('0.75'); await y.press('Tab')
  await page.waitForTimeout(550)
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button',{name:'Export grade CSV'}).click()
  const download = await downloadPromise
  assert.match(download.suggestedFilename(),/grade-rules\.csv$/)
  const chunks = []
  for await (const chunk of await download.createReadStream()) chunks.push(chunk)
  const csv = Buffer.concat(chunks).toString('utf8')
  const savedPieceId = csv.split('\r\n')[1].match(/^"([^"]+)"/)[1]
  const count = await table.locator('.grade-point-row').count()
  const originalPiece = await page.evaluate(id => JSON.parse(localStorage.getItem('garment-studio-tee-first-fit-project-v2')).pieces.find(piece => piece.id === id),savedPieceId)
  assert.equal(parseGradeRulesCsv(csv,originalPiece)[0].dxPerSize,-1.25)
  await page.getByRole('button',{name:'Reset piece to AUTO'}).click()
  await page.getByLabel('Import selected piece grading rules CSV').setInputFiles({name:'grading.csv',mimeType:'text/csv',buffer:Buffer.from(csv)})
  await page.waitForTimeout(650)
  assert.equal(await page.getByRole('spinbutton',{name:'Point 1 X grade increment in centimeters per size'}).inputValue(),'-1.25')
  assert.equal(await page.getByRole('spinbutton',{name:'Point 1 Y grade increment in centimeters per size'}).inputValue(),'0.75')
  const snapshot = async () => page.evaluate(() => JSON.parse(localStorage.getItem('garment-studio-tee-first-fit-project-v2')))
  await page.waitForTimeout(600)
  const importedProject = await snapshot()
  const importedPiece = importedProject.pieces.find(piece => piece.id === savedPieceId)
  assert.deepEqual(importedPiece.points.map(({x,y}) => ({x,y})),originalPiece.points.map(({x,y}) => ({x,y})), 'CSV import must not change cutline coordinates')
  const badCsv = csv.replace(/,1,([-\d.]+),([-\d.]+),CUSTOM/, (_, x, y) => `,1,${Number(x)+1},${y},CUSTOM`)
  assert.notEqual(badCsv,csv)
  await page.getByLabel('Import selected piece grading rules CSV').setInputFiles({name:'wrong-pattern.csv',mimeType:'text/csv',buffer:Buffer.from(badCsv)})
  await page.waitForTimeout(650)
  assert.deepEqual((await snapshot()).pieces,importedProject.pieces,'Invalid CSV cannot mutate previously imported grading or base cutlines')
  await page.getByTitle('Undo',{exact:true}).first().click()
  await page.waitForTimeout(650)
  assert.ok(!(await snapshot()).pieces.find(piece=>piece.id===savedPieceId).points[0].gradeRule?.enabled, 'Import must be reversible with one undo action')
  const countAfter = await table.locator('.grade-point-row').count()
  assert.equal(countAfter,count)
  assert.deepEqual(errors,[])
  console.log(JSON.stringify({pass:true,pointCount:count,workspace:'gradingStudio',viewport:'2d',exportDownload:true,resetAndImport:true,invalidImportPreservedProject:true,undoImport:true,cutlinesUnchanged:true,browserErrors:0}))
} finally {
  await browser.close()
}
