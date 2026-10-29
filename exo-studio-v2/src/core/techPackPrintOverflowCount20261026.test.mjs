import test from 'node:test'
import assert from 'node:assert/strict'
import {renderTechPackWorkspacePrintHTML} from './techPackWorkspacePrint.js'

test('continuation page reports total source rows across multiple boxes',()=>{
  const custom='custom-overflow-proof'
  const rows=n=>Array.from({length:n},(_,i)=>({id:`id-${i}`,cells:{ref:{input:`ROW-${i+1}`}}}))
  const source={kind:'native',name:'Test',revision:1,fabrics:[],panels:[],seams:[],pom:{},grading:{}}
  const workspace={customPages:[{id:custom,name:'Overflow'}],pageOrder:[custom],pageBoxes:{[custom]:[
    {id:'A',title:'First',height:180,slot:{spreadsheetTable:{columns:[{id:'ref',label:'Reference'}],rows:rows(46)}}},
    {id:'B',title:'Second',height:180,slot:{spreadsheetTable:{columns:[{id:'ref',label:'Reference'}],rows:rows(11)}}}
  ]}}
  const html=renderTechPackWorkspacePrintHTML(source,{},workspace)
  const sections=[...html.matchAll(/<section class="sheet exo-table-overflow-sheet"[\s\S]*?<\/section>/g)].map(match=>match[0])
  assert(sections.some(section=>section.includes('data-source-box="A"')&&section.includes('OF 46')))
  assert(sections.some(section=>section.includes('data-source-box="B"')&&section.includes('OF 11')))
})
