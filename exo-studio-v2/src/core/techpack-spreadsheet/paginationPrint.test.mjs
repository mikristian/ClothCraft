import test from 'node:test';import assert from 'node:assert/strict';import {renderTechPackWorkspacePrintHTML} from '../techPackWorkspacePrint.js'
const source={kind:'native',name:'Tee',ready:true,revision:12,panels:[],seams:[],fabrics:[],pom:{},grading:{}}
const custom='custom-factory-long'
const t={id:'long-factory',title:'FACTORY POM',columns:[{id:'ref',label:'REF'},{id:'size',label:'SIZE M'}],rows:Array.from({length:92},(_,i)=>({id:'r-'+i,cells:{ref:{input:`POM-${String(i+1).padStart(3,'0')}`},size:{input:String(60+i)}}}))}
const ws={customPages:[{id:custom,name:'Long factory POM'}],pageOrder:['overview',custom],pages:{[custom]:{orientation:'landscape'}},pageBoxes:{[custom]:[{id:'box-a',title:'Factory POM',x:25,y:30,width:500,height:220,positionMode:'absolute',slot:{category:'tables',spreadsheetTable:t}}]}}
test('92-row printed Letter landscape table creates continuation pages, preserves order and values once',()=>{
 const html=renderTechPackWorkspacePrintHTML(source,{},ws)
 const appendices=[...html.matchAll(/data-source-box="box-a"/g)]
 assert(appendices.length>=4)
 assert.match(html,/data-source-page="custom-factory-long"/)
 assert.match(html,/page:LetterLandscape/)
 assert.match(html,/CONTINUED FROM SOURCE PAGE/)
 assert.equal((html.match(/POM-001/g)||[]).length,1)
 assert.equal((html.match(/POM-092/g)||[]).length,1)
 for(let i=1;i<=92;i++)assert.equal((html.match(new RegExp('POM-'+String(i).padStart(3,'0'),'g'))||[]).length,1,`row ${i} appears once`)
 assert.equal((html.match(/<th scope="col">REF<\/th>/g)||[]).length,appendices.length+1)
})
test('script-looking POM notes escaped across print continuations',()=>{
 const danger='</table><img onerror="evil">'
 const modified=structuredClone(ws)
 modified.pageBoxes[custom][0].slot.spreadsheetTable.rows[80].cells.ref.input=danger
 const html=renderTechPackWorkspacePrintHTML(source,{},modified)
 assert(!html.includes(danger));assert(html.includes('&lt;img onerror=&quot;evil&quot;&gt;'))
})
