import test from 'node:test'
import assert from 'node:assert/strict'
import {zipSync,unzipSync,strToU8,strFromU8} from 'fflate'
import {exportTechPackXlsx,importTechPackXlsx} from './exporterXlsx.js'

const mutate=(buffer,edits)=>{
 const entries=unzipSync(buffer)
 for(const [name,content] of Object.entries(edits))entries[name]=strToU8(content)
 return zipSync(entries,{level:1})
}
const baseline=()=>exportTechPackXlsx([{name:'First',headers:['Item','Measure','Date'],rows:[{cells:['A',12,'2026-10-26']}]},{name:'Second',headers:['Code'],rows:[{cells:['002'] }]}])
test('relationship sheet IDs and order can differ from worksheet part names',()=>{
 const bytes=baseline(),z=unzipSync(bytes),r=strFromU8(z['xl/_rels/workbook.xml.rels'])
 const reordered=mutate(bytes,{
  'xl/_rels/workbook.xml.rels':r.replace('Id="rId1"','Id="SWAP"').replace('Id="rId2"','Id="rId1"').replace('Id="SWAP"','Id="rId2"')
 })
 assert.equal(importTechPackXlsx(reordered)[0].rows[0].cells[0],'002')
 assert.equal(importTechPackXlsx(reordered)[1].rows[0].cells[0],'A')
})
test('Excel shared rich strings, sparse rows, booleans, formulas and cached values',()=>{
 const bytes=baseline(),files=unzipSync(bytes)
 const ws='<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><r><t>SKU</t></r><r><t> / ID</t></r></is></c><c r="B1" t="s"><v>0</v></c><c r="C1" t="inlineStr"><is><t>Date</t></is></c></row><row r="3"><c r="A3" t="s"><v>1</v></c><c r="B3" t="b"><v>1</v></c><c r="C3" s="2"><v>46000</v></c></row><row r="4"><c r="B4"><f>1+2</f><v>3</v></c><c r="C4" t="e"><v>#DIV/0!</v></c></row></sheetData></worksheet>'
 const styles='<?xml version="1.0"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cellXfs><xf numFmtId="0"/><xf numFmtId="0"/><xf numFmtId="14"/></cellXfs></styleSheet>'
 const rels=strFromU8(files['xl/_rels/workbook.xml.rels']).replace('</Relationships>','<Relationship Id="rShared" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>')
 const modified=mutate(bytes,{'xl/worksheets/sheet1.xml':ws,'xl/sharedStrings.xml':'<sst><si><r><t>Measure</t></r><r><t> cm</t></r></si><si><t>007</t></si></sst>','xl/_rels/workbook.xml.rels':rels,'xl/styles.xml':styles})
 const sheet=importTechPackXlsx(modified)[0]
 assert.deepEqual(sheet.headers,['SKU / ID','Measure cm','Date'])
 assert.deepEqual(sheet.rows[0].cells,['','',''])
 assert.equal(sheet.rows[1].cells[0],'007')
 assert.equal(sheet.rows[1].cells[1],true)
 assert.match(sheet.rows[1].cells[2],/^2025-/)
 assert.equal(sheet.rows[2].cells[1],'=1+2')
 assert.deepEqual(sheet.rows[2].formulaCachedValues['1'],{value:'3',type:'n'})
 assert.equal(sheet.rows[2].cells[2],'#DIV/0!')
 const again=importTechPackXlsx(exportTechPackXlsx([sheet]))[0]
 assert.equal(again.rows[2].cells[1],'=1+2')
 assert.equal(strFromU8(unzipSync(exportTechPackXlsx([sheet]))['xl/worksheets/sheet1.xml']).includes('<f>1+2</f>'),false)
})
test('deterministic supported roundtrip and safe text that looks like a formula',()=>{
 const table={name:'Tech Pack',headers:['SKU','Quantity','Approved','Potential formula'],rows:[{cells:['00045',22.5,false,'=WEBSERVICE("https://example.org")']},{cells:['+SUM(1,2)',0,true,'@evil']}]}
 const a=exportTechPackXlsx([table]),b=exportTechPackXlsx([table])
 assert.deepEqual(a,b)
 const result=importTechPackXlsx(a)[0]
 assert.deepEqual(result.rows.map(x=>x.cells),table.rows.map(x=>x.cells))
})
test('reject entity definitions, relationship traversal, and forged inflation sizes',()=>{
 const bytes=baseline(),files=unzipSync(bytes)
 const workbook=strFromU8(files['xl/workbook.xml'])
 assert.throws(()=>importTechPackXlsx(mutate(bytes,{'xl/workbook.xml':workbook.replace('<workbook','<!DOCTYPE workbook [<!ENTITY x SYSTEM "file:///etc/passwd">]><workbook')})),/entities/)
 const rel=strFromU8(files['xl/_rels/workbook.xml.rels'])
 assert.throws(()=>importTechPackXlsx(mutate(bytes,{'xl/_rels/workbook.xml.rels':rel.replace('worksheets/sheet1.xml','../../../unsafe.xml')})),/traversal/)
 const forged=Uint8Array.from(bytes)
 let central=-1;for(let i=0;i<forged.length-4;i++)if(forged[i]===0x50&&forged[i+1]===0x4b&&forged[i+2]===1&&forged[i+3]===2){central=i;break}
 assert(central>=0)
 new DataView(forged.buffer).setUint32(central+24,0x7fffffff,true)
 assert.throws(()=>importTechPackXlsx(forged),/limit|ratio/)
})
