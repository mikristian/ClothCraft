import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {transform,build} from 'esbuild'
import {createRequire} from 'node:module'
import Module from 'node:module'
import {fileURLToPath} from 'node:url'

const component=fs.readFileSync(new URL('./TechPackBoxContent.jsx',import.meta.url),'utf8')

test('TechPack box JSX compiles with spreadsheet and image editing controls',async()=>{
  const output=await transform(component,{loader:'jsx',format:'esm'})
  assert.match(output.code,/TechPackSpreadsheetBlock/)
  assert.match(output.code,/Replace photo/)
  assert.match(output.code,/Clear box photo/)
})

test('photo updates keep authored contents and do not allow remote image preview URLs',()=>{
  assert.match(component,/patch\(\{assetId:\s*null,\s*assetSrc:\s*null\}\)/)
  assert.match(component,/safeBoxImageSrc/)
  assert.match(component,/data:image/)
  assert.doesNotMatch(component,/dangerouslySetInnerHTML/)
  assert.match(component,/onDoubleClick/)
})

test('read-only preview computes formulas, applies theme and cell styles, and preserves source warnings',async()=>{
  const filename=fileURLToPath(new URL('./TechPackBoxContent.jsx',import.meta.url))
  const output=await build({entryPoints:[filename],bundle:true,write:false,platform:'node',format:'cjs',packages:'external',loader:{'.jsx':'jsx','.css':'empty'},logLevel:'silent'})
  const executable=new Module(filename)
  executable.filename=filename
  executable.paths=Module._nodeModulePaths(fileURLToPath(new URL('.',import.meta.url)))
  executable.require=createRequire(import.meta.url)
  executable._compile(output.outputFiles[0].text,filename)
  const {spreadsheetBoxPreview}=executable.exports
  const original={columns:[{id:'a',label:'Quantity',width:190},{id:'b',label:'Total'}],rows:[
    {id:'native',cells:{a:{input:'7',origin:'native',sourceRef:'pom:qty'},b:{input:'=A1*3',value:'=A1*3'}}},
    {id:'changed',cells:{a:{input:'9',override:true,sourceRevision:3},b:{input:'=A2/0'}}}
  ],tableStyle:{theme:'dark'},cellStyles:{'native:1':{bold:true,align:'right',color:'#123456',background:'#abcdef'},'changed:0':{italic:true,color:'red'}}}
  const before=JSON.stringify(original)
  const view=spreadsheetBoxPreview(original)
  assert.equal(view.rows[0].cells[1].value,'21')
  assert.equal(view.rows[1].cells[1].value,'#DIV/0!')
  assert.equal(view.rows[0].cells[0].status,'Source linked')
  assert.equal(view.rows[1].cells[0].status,'Override · review required')
  assert.equal(view.rows[0].cells[1].style.fontWeight,'bold')
  assert.equal(view.rows[0].cells[1].style.textAlign,'right')
  assert.equal(view.rows[0].cells[1].style.background,'#abcdef')
  assert.equal(view.rows[1].cells[0].style.color,undefined)
  assert.equal(view.palette.header,'#243449')
  assert.equal(view.columns[0].width,190)
  assert.equal(JSON.stringify(original),before,'preview must leave source data untouched')
})
