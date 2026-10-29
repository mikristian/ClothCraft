import test from 'node:test';import assert from'node:assert/strict'
import {captureTechPackPageLayout,applyTechPackCapturedLayout} from '../techPackPageComposer.js'
test('reusable spreadsheet page layout copies full typed schema, not previous garment data',()=>{
 const cols=[{id:'pom',label:'POM',type:'text'},{id:'m',label:'M',type:'number'}]
 const source={pageBoxes:{'custom-abc':[ {id:'original',x:40,y:61,width:480,height:300,positionMode:'absolute',title:'POM box',slot:{category:'tables',spreadsheetTable:{id:'table-old',columns:cols,rows:[{id:'chest',cells:{pom:{input:'Chest',origin:'native'},m:{input:54,origin:'native'}}}]}}}]}}
 const saved=captureTechPackPageLayout(source,'custom-abc','Reusable measurement layout')
 const string=JSON.stringify(saved)
 assert(!string.includes('Chest'));assert(!string.includes('54'))
 assert.equal(saved.pageSnapshot.boxes[0].slot.spreadsheetTable.columns[1].type,'number')
 const next=applyTechPackCapturedLayout({},'custom-new',saved,()=>String(Math.random()).slice(2))
 assert.equal(next.pageBoxes['custom-new'][0].x,40)
 assert.equal(next.pageBoxes['custom-new'][0].slot.spreadsheetTable.rows[0].cells.m.input,'')
 assert.equal(next.pageBoxes['custom-new'][0].slot.spreadsheetTable.columns[1].label,'M')
})
