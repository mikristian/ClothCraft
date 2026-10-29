import test from 'node:test'
import assert from 'node:assert/strict'
import {editTechPackMaterialCell} from './techPackMaterialEdits.js'
import {techPackPageTable,techPackCsv} from './techPackWorkspaceModel.js'
import {renderTechPackWorkspacePrintHTML} from './techPackWorkspacePrint.js'

const source={name:'T-shirt',kind:'native',revision:3,grading:{baseSize:'M'},panels:[],seams:[],
  fabrics:[{id:'jersey',name:'Jersey',color:'#111111',gsm:220,composition:'Cotton',supplier:'Mill A'}],pom:{}}

test('editing material specs updates the BOM and both printable source tables without mutating garment source',()=>{
  const original=structuredClone(source)
  const first=editTechPackMaterialCell(source,{}, {bom:[]},'materials','jersey',2,'245')
  assert.equal(first.bom.length,1)
  assert.equal(first.bom[0].gsm,'245')
  assert.equal(first.cells.fabrics.jersey[3],'245')
  const draft={bom:first.bom}
  assert.equal(techPackPageTable('materials',source,draft).rows[0].cells[2],'245')
  assert.equal(techPackPageTable('fabrics',source,draft).rows[0].cells[3],'245')
  assert.match(techPackCsv(techPackPageTable('materials',source,draft)),/"245"/)
  assert.deepEqual(source,original)
  const printed=renderTechPackWorkspacePrintHTML(source,draft,{cells:first.cells})
  assert.match(printed,/245/)
})

test('fabric composition edit reflects on BOM and preserves other authored trims',()=>{
  const existing={id:'zip',description:'Metal zipper',quantity:2,cost:5}
  const edited=editTechPackMaterialCell(source,{cells:{fabrics:{jersey:{4:'180'}}}},
    {bom:[existing]},'fabrics','jersey',2,'100% organic cotton')
  assert.equal(edited.bom.length,2)
  assert.equal(edited.bom[0],existing)
  assert.equal(edited.bom[1].composition,'100% organic cotton')
  assert.equal(edited.cells.materials.jersey[4],'100% organic cotton')
  assert.equal(techPackPageTable('materials',source,{bom:edited.bom}).rows[0].cells[4],'100% organic cotton')
  assert.equal(techPackPageTable('materials',source,{bom:edited.bom}).rows[1].cells[0],'Metal zipper')
  assert.equal(edited.cells.fabrics.jersey[4],'180')
})

test('fabric-only performance specs stay independent while shared supplier details mirror',()=>{
  const width=editTechPackMaterialCell(source,{}, {},'fabrics','jersey',4,'165')
  assert.equal(width.bom,undefined)
  assert.equal(width.cells.fabrics.jersey[4],'165')
  assert.equal(width.cells.materials,undefined)
  const mill=editTechPackMaterialCell(source,width,{},'fabrics','jersey',7,'Factory <A>')
  assert.equal(mill.bom[0].supplier,'Factory <A>')
  assert.equal(mill.cells.materials.jersey[5],'Factory <A>')
  const html=renderTechPackWorkspacePrintHTML(source,{bom:mill.bom},{cells:mill.cells})
  assert.match(html,/Factory &lt;A&gt;/)
  assert.doesNotMatch(html,/<A>/)
})

test('saved BOM-only edits appear in printed swatch cards and manufacturer tables after reopening',()=>{
  const draft={bom:[{id:'jersey',description:'Organic <jersey>',color:'#556677',gsm:'287',composition:'Pima cotton',supplier:'Mill B'}]}
  const table=techPackPageTable('fabrics',source,draft)
  assert.equal(table.rows[0].cells[0],'Organic <jersey>')
  assert.equal(table.rows[0].cells[3],'287')
  assert.equal(techPackPageTable('materials',source,draft).rows[0].cells[5],'Mill B')
  const html=renderTechPackWorkspacePrintHTML(source,draft,{})
  assert.match(html,/Organic &lt;jersey&gt;/)
  assert.match(html,/Pima cotton · 287 GSM/)
  assert.doesNotMatch(html,/<jersey>/)
})
