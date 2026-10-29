import test from 'node:test'
import assert from 'node:assert/strict'
import {createBoundTechPackTable,refreshBoundTechPackTable,authoredSpecOverride,createGarmentSpreadsheetTables} from './sourceBindings.js'
import {fromGridTable,toGridTable} from './tableAdapter.js'
const sample={kind:'native',revision:1,name:'Tee',panels:[{id:'front',name:'Front panel',quantity:1,fabricId:'cotton',width:540,height:650,points:12,notches:2,allowance:8}],seams:[{id:'neck-seam',name:'Neck seam',first:'front',second:'rib',type:'overlock'}],fabrics:[{id:'cotton',name:'Cotton jersey',gsm:220,color:'Black'}],pom:{M:[{id:'chest',label:'Half chest',cm:54,toleranceCm:1}],L:[{id:'chest',label:'Half chest',cm:56,toleranceCm:1}]},pomTargets:{},grading:{sizes:['M','L'],baseSize:'M'}}
test('manufacturer worksheets source only known values with source IDs',()=>{
 const tables=createGarmentSpreadsheetTables(sample)
 assert(tables['source-measurement-table'].rows.length>0)
 assert.equal(tables['source-pattern-cutlist'].rows[0].id,'front')
 const row=tables['source-measurement-table'].rows[0]
 assert.equal(row.sourceRef,'measurement-table:chest')
 assert.equal(row.cells[tables['source-measurement-table'].columns[2].id].origin,'native')
 const materials=tables['source-materials'];assert.equal(materials.rows.length,1)
 assert.equal(materials.rows[0].cells[materials.columns[0].id].sourceRevision,1)
})
test('overriding a source value preserves native data and requires review on source change',()=>{
 const before=structuredClone(sample),old=createBoundTechPackTable('measurement-table',sample)
 const col=old.columns[2],changed=authoredSpecOverride(old,'chest',col.id,'54.5',{reason:'Factory sample'})
 assert.equal(changed.rows[0].cells[col.id].origin,'authored')
 assert.deepEqual(sample,before)
 const revised={...sample,revision:2}
 const result=refreshBoundTechPackTable(changed,revised)
 assert.equal(result.rows[0].cells[col.id].input,'54.5')
 assert.equal(result.rows[0].cells[col.id].reviewState,'needs-re-review')
 assert.equal(result.rows[0].cells[col.id].underlyingSourceRevision,2)
})
test('numeric source cells reject invalid overrides without changing source',()=>{
 const original=structuredClone(sample),table=createBoundTechPackTable('measurement-table',sample)
 const column=table.columns.find(item=>item.label==='M (cm)')
 assert(column)
 assert.throws(()=>authoredSpecOverride(table,'chest',column.id,'not measured'),/Invalid number value/)
 assert.throws(()=>authoredSpecOverride(table,'chest',column.id,Infinity),/Invalid number value/)
 assert.equal(authoredSpecOverride(table,'chest',column.id,'55.2').rows[0].cells[column.id].value,'55.2')
 assert.deepEqual(sample,original)
})

test('source override survives repeated refresh with authored context and native source identity',()=>{
 const source=createBoundTechPackTable('measurement-table',sample)
 const column=source.columns.find(item=>item.label==='M (cm)')
 const override=authoredSpecOverride(source,'chest',column.id,'55.2',{reason:'Approved sample measurement',author:'Pattern team'})
 const revised=refreshBoundTechPackTable(override,{...sample,revision:2,pom:{...sample.pom,M:[{id:'chest',label:'Half chest',cm:55,toleranceCm:1}]}})
 const cell=revised.rows[0].cells[column.id]
 assert.equal(cell.value,'55.2')
 assert.equal(cell.reason,'Approved sample measurement')
 assert.equal(cell.author,'Pattern team')
 assert.equal(cell.provenance.kind,'override')
 assert.equal(cell.provenance.sourceRef,'measurement-table:chest')
 assert.equal(cell.provenance.originalValue,54)
 assert.equal(cell.sourceRevision,2)
 assert.equal(cell.underlyingSourceValue,55)
 assert.equal(cell.reviewState,'needs-re-review')
 const repeated=refreshBoundTechPackTable(revised,{...sample,revision:3})
 assert.equal(repeated.rows[0].cells[column.id].provenance.originalValue,54)
 assert.equal(repeated.rows[0].cells[column.id].underlyingSourceRevision,3)
})

test('editor-added notes row and column survive source revision and XLSX refresh workflow',()=>{
 const source=createBoundTechPackTable('measurement-table',sample)
 const grid=toGridTable(source)
 const withColumn={...grid,headers:[...grid.headers,'Factory note'],columnIds:[...grid.columnIds,'notes-extra'],
   rows:[...grid.rows.map(row=>({...row,cells:[...row.cells,'Review shrinkage']})),
     {id:'designer-note',cells:[...grid.headers.map(() => ''),'Lab approval pending']}]}
 const saved=fromGridTable(source,withColumn)
 // New columns from the live grid editor are authored by definition.
 const revised=refreshBoundTechPackTable(saved,{...sample,revision:2})
 assert(revised.columns.some(column=>column.id==='notes-extra'))
 assert.equal(revised.rows.find(r=>r.id==='chest').cells['notes-extra'].input,'Review shrinkage')
 assert.equal(revised.rows.find(r=>r.id==='designer-note').cells['notes-extra'].input,'Lab approval pending')
 assert.equal(revised.rows.find(r=>r.id==='chest').cells[source.columns[2].id].sourceRevision,2)
})

test('refresh retains cell formatting, theme and resized source column widths',()=>{
 const first=createBoundTechPackTable('measurement-table',sample)
 const column=first.columns[2]
 const saved={...first,tableStyle:{theme:'custom',header:'#112233'},cellStyles:{'chest:2':{bold:true}},
   columns:first.columns.map(c=>c.id===column.id?{...c,width:264}:c)}
 const refreshed=refreshBoundTechPackTable(saved,{...sample,revision:4,pom:{...sample.pom,M:[{id:'chest',label:'Half chest',cm:58,toleranceCm:1}]}})
 assert.deepEqual(refreshed.tableStyle,saved.tableStyle)
 assert.deepEqual(refreshed.cellStyles,saved.cellStyles)
 assert.equal(refreshed.columns.find(c=>c.id===column.id).width,264)
 assert.equal(refreshed.rows.find(r=>r.id==='chest').cells[column.id].value,58)
})
