import test from 'node:test'
import assert from 'node:assert/strict'
import {unzipSync,strFromU8} from 'fflate'
import {exportTechPackXlsx,importTechPackXlsx} from './exporterXlsx.js'
test('Excel document exports actual theme, cell styles and original values',()=>{
 const table={id:'t-1',name:'Materials',tableStyle:{theme:'custom',header:'#124578',stripe:'#ddebfa',text:'#ffffff'},
   cellStyles:{'0:1':{bold:true,color:'#992233',background:'#ff1122',align:'center'}},
   columns:[{id:'item',label:'MATERIAL'},{id:'usage',label:'USAGE'}],
   rows:[{id:'first',cells:{item:{input:'Rib',origin:'authored'},usage:{input:54,origin:'authored'}}},
     {id:'second',cells:{item:{input:'Cotton',origin:'authored'},usage:{input:'007',origin:'authored'}}}]}
 const bytes=exportTechPackXlsx([table])
 const zip=unzipSync(bytes),style=strFromU8(zip['xl/styles.xml']),sheet=strFromU8(zip['xl/worksheets/sheet1.xml'])
 for(const hex of ['FF124578','FFDDEBFA','FFFFFFFF','FFFF1122','FF992233'])assert(style.includes(hex),'missing '+hex)
 assert.match(sheet,/<c r="A1" s="[1-9]/)
 assert.match(sheet,/<c r="B2" s="[1-9]/)
 const imported=importTechPackXlsx(bytes)
 assert.deepEqual(imported[0].headers,['MATERIAL','USAGE'])
 assert.equal(imported[0].rows[0].cells[0],'Rib')
 assert.equal(imported[0].rows[0].cells[1],54)
 assert.equal(imported[0].rows[1].cells[1],'007')
})
