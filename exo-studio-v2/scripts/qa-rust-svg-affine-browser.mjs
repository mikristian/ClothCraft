// Requires existing playwright-core and a locally installed Chrome; installs nothing.
import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {readFile} from 'node:fs/promises'
import {execFileSync} from 'node:child_process'
import {resolve,sep} from 'node:path'
import {chromium} from '../../music-empire-game/node_modules/playwright-core/index.mjs'

const baseline=execFileSync('git',['show','e328e48ee21a49f8fa4093e2119719edc1a567be'],{encoding:'utf8'})
const root=resolve('.')
const server=createServer(async(req,res)=>{
  try{
    if(req.url==='/baseline.js'){res.setHeader('Content-Type','text/javascript');res.end(baseline);return}
    if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>SVG affine QA</title>');return}
    const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname)
    if(!path.startsWith(root+sep))throw new Error('outside snapshot')
    res.setHeader('Content-Type',path.endsWith('.wasm')?'application/wasm':'text/javascript')
    res.end(await readFile(path))
  }catch{res.writeHead(404);res.end()}
})
await new Promise(r=>server.listen(0,'127.0.0.1',r))
let browser
try{
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
  const page=await browser.newPage()
  // Hold automatic initialization so the exact same fixtures exercise fallback first.
  await page.route('**/wasm/exo_svg_affine_kernel.wasm',route=>
    new URL(route.request().url()).pathname==='/wasm/exo_svg_affine_kernel.wasm'
      ?route.fulfill({status:404,body:''}):route.continue())
  await page.goto(`http://127.0.0.1:${server.address().port}`)
  const result=await page.evaluate(async()=>{
    const original=(await import('/baseline.js')).parseSvgPattern
    const current=(await import('/src/core/svgPatternImport.js')).parseSvgPattern
    const kernel=await import('/src/core/rustSvgAffineKernel.js')
    await kernel.initializeRustSvgAffineKernel()
    if(kernel.rustSvgAffineKernelStatus().backend!=='javascript-fallback')throw new Error('Fallback not exercised')
    const wrap=body=>`<svg xmlns="http://www.w3.org/2000/svg" width="100cm" viewBox="0 0 1000 1000">${body}</svg>`
    const fixtures=[
      '<rect width="100" height="200"/>',
      '<g transform="translate(-20,30)"><g transform="scale(-2,3)"><rect transform="rotate(27)" width="100" height="50"/></g></g>',
      '<polygon transform="matrix(1 .2 -.3 1 20 -40)" points="0,0 100,0 100,80 0,80"/>',
      '<polyline points="0,0 100,0 100,80 0,80 0,0"/>',
      '<circle cx="30" cy="50" r="20"/>',
      '<ellipse cx="40" cy="30" rx="30" ry="15"/>',
      '<path d="M0 0 L100 0 L100 100 L0 100 Z"/>',
      '<path transform="translate(10 20) scale(2) rotate(-45)" d="M0 0 C100 -30 120 100 0 100 Z"/>',
      '<defs><rect width="500" height="500"/></defs><rect display="none" width="20" height="20"/><rect data-name="Panel" x="-30" width="60" height="90"/>',
      '<g transform="scale(0)"><rect width="100" height="100"/></g><rect width="70" height="30"/><circle transform="rotate(90)" r="20"/>',
    ].map(wrap)
    const errors=[null,'x'.repeat(3*1024*1024+1),'<svg', '<html/>',wrap(''),
      ...['script','foreignObject','iframe','use','image','style','filter','clipPath','mask'].map(tag=>wrap(`<${tag}/>`)),
      ...['translate(Infinity)','scale(NaN)','matrix(1 2)','rotate(2 3)','skewX(2)','scale()','scale(1e308)'].map(t=>wrap(`<rect transform="${t}" width="100" height="100"/>`)),
      wrap('<path d="M0 0 L100 0"/>'),wrap('<rect width="1" height="1"/>')]
    const capture=(fn,source,options)=>{try{return {value:fn(source,options)}}catch(e){return {error:e.message}}}
    const expected=[...fixtures,...errors].map(s=>capture(original,s))
    const check=()=>{
      const actual=[...fixtures,...errors].map(s=>capture(current,s))
      if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('Full importer parity failed')
      const many=wrap('<rect width="100" height="100"/>'.repeat(2))
      if(JSON.stringify(capture(original,many,{maxPieces:1}))!==JSON.stringify(capture(current,many,{maxPieces:1})))throw new Error('Piece limit parity failed')
      if(fixtures.some((_,i)=>!actual[i].value?.pieces.length))throw new Error('Representative import failed')
    }
    check()
    const bytes=await fetch('/public/wasm/exo_svg_affine_kernel.wasm').then(r=>r.arrayBuffer())
    if(!await kernel.initializeRustSvgAffineKernel({bytes}))throw new Error(kernel.rustSvgAffineKernelStatus().error)
    check()
    return {pass:true,imports:fixtures.length,errorCases:errors.length+1,backend:kernel.rustSvgAffineKernelStatus().backend}
  })
  assert.equal(result.pass,true);console.log(JSON.stringify(result))
}finally{
  await browser?.close()
  await new Promise(r=>server.close(r))
}
