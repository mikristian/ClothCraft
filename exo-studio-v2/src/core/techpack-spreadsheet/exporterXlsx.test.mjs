import test from 'node:test'
import assert from 'node:assert/strict'
import {unzipSync,strFromU8} from 'fflate'
import {exportTechPackXlsx,importTechPackXlsx} from './exporterXlsx.js'
test('export/import a typed manufacturer sheet without executing user-supplied formulas',()=>{
 const table={id:'pom',name:'POM (TEE)',columns:[{id:'name',label:'POM'},{id:'m',label:'M (cm)'}],rows:[{id:'chest',cells:{name:{input:'Chest',origin:'native'},m:{input:54,origin:'native'}}},{id:'note',cells:{name:{input:'=HYPERLINK("https://bad")',origin:'authored'},m:{input:'007',origin:'authored'}}}]}
 const zipped=exportTechPackXlsx([table]);const files=unzipSync(zipped)
 const xml=strFromU8(files['xl/worksheets/sheet1.xml'])
 assert.match(xml,/54<\/v>/);assert.match(xml,/=HYPERLINK/);assert.doesNotMatch(xml,/<f>HYPERLINK/)
 const imported=importTechPackXlsx(zipped)
 assert.equal(imported[0].rows[0].cells[1],54)
 assert.equal(imported[0].rows[1].cells[0],'=HYPERLINK("https://bad")')
 assert.equal(imported[0].rows[1].cells[1],'007')
 assert(imported[0].needsReview)
})
test('XLSX filename sanitization and resource guard',()=>{
 const bytes=exportTechPackXlsx([{name:'BOM / Trims:*?',headers:['SKU'],rows:[{id:'a',cells:['0012']}]}]);assert.equal(importTechPackXlsx(bytes)[0].name,'BOM   Trims')
 assert.throws(()=>importTechPackXlsx(bytes,{maxBytes:1}),/limit/)
})
test('editor row-ID cell formatting and column widths survive XLSX roundtrip',()=>{
 const source={name:'Specification',columns:[{id:'pom',label:'POM',width:189},{id:'size',label:'SIZE',width:140}],rows:[{id:'chest',cells:{pom:{input:'Chest'},size:{input:54}}}],cellStyles:{'chest:1':{bold:true,italic:true,color:'#992233',background:'#ff1122',align:'center'}}}
 const exported=exportTechPackXlsx([source])
 const xml=strFromU8(unzipSync(exported)['xl/worksheets/sheet1.xml'])
 assert.match(xml,/<c r="B2" s="[1-9]\d*"><v>54<\/v><\/c>/)
 const imported=importTechPackXlsx(exported)[0]
 assert.deepEqual(imported.columnWidths,[189,140])
 assert.deepEqual(imported.cellStyles['0:1'],source.cellStyles['chest:1'])
 const again=importTechPackXlsx(exportTechPackXlsx([imported]))[0]
 assert.deepEqual(again.cellStyles['0:1'],source.cellStyles['chest:1'])
 assert.deepEqual(again.columnWidths,[189,140])
})
