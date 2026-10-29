import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {chromium} from 'playwright-core'
import {readFile,mkdir,writeFile} from 'node:fs/promises'
import {join} from 'node:path'
const ui='http://127.0.0.1:5386/?desktop=1&testSession=v2-exports-20261023'
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
const folder='/tmp/clothcraft_installed_v2_real_exports_20261023'
await mkdir(folder,{recursive:true})
try {
 const page=await browser.newPage({viewport:{width:1640,height:1050},acceptDownloads:true})
 const errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto(ui,{waitUntil:'domcontentloaded',timeout:30000})
 await page.locator('.pattern-canvas').waitFor({timeout:25000})
 const workspace=page.getByRole('combobox',{name:'Workspace',exact:true})
 await workspace.selectOption('Production')
 await page.getByText('Manufacturing preflight · all sizes').waitFor({timeout:20000})
 const specs=[[/EXPORT DXF/,'.dxf'],[/EXPORT TRUE-SCALE MARKER PDF/,'.pdf'],[/EXPORT TRUE-SCALE MARKER SVG/,'.svg'],[/EXPORT BOM · XML/,'.xml'],[/EXPORT FACTORY PACKAGE/,'.zip']]
 const files=[]
 for (const [label,ext] of specs){
  const [download]=await Promise.all([page.waitForEvent('download',{timeout:25000}),page.getByRole('button',{name:label}).click()])
  const name=download.suggestedFilename();assert(name.endsWith(ext),`${name} not ${ext}`)
  const stream=await download.createReadStream();const chunks=[]
  for await (const chunk of stream)chunks.push(chunk)
  const bytes=Buffer.concat(chunks);assert(bytes.length>20,`${ext}: empty`)
  const signature={'.dxf':bytes.subarray(0,256).toString('utf8').includes('SECTION'),'.pdf':bytes.subarray(0,5).toString()==='%PDF-','.svg':bytes.subarray(0,500).toString('utf8').includes('<svg'),'.xml':bytes.subarray(0,200).toString('utf8').includes('<?xml'),'.zip':bytes.subarray(0,4).equals(Buffer.from([0x50,0x4b,0x03,0x04]))}[ext]
  assert(signature,`${ext}: invalid signature`)
  await writeFile(join(folder,name),bytes)
  files.push({name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),validSignature:true})
 }
 assert.deepEqual(errors,[])
 console.log(JSON.stringify({pass:true,installedV2:true,ui,files,pageErrors:0},null,2))
} finally {await browser.close()}
