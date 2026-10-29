import test from 'node:test'
import assert from 'node:assert/strict'
import {TECHPACK_TABLE_TEMPLATES} from '../techPackTemplatePresets.js'
import {spreadsheetFromTechPackPreset} from './templateBinding.js'
import{validateTableV3}from'./validation.js'
test('every professional Table Library preset yields an editable schema with blank garment data',()=>{
 for(const preset of TECHPACK_TABLE_TEMPLATES){
   const table=spreadsheetFromTechPackPreset(preset,{pageId:'custom-tee',boxId:'box-1'})
   assert.equal(table.columns.length,preset.headers.length)
   assert.equal(table.rows.length,preset.rows)
   assert(table.rows.every(row=>Object.values(row.cells).every(cell=>cell.input==='')))
   assert.equal(table.needsReview,true)
   assert.equal(validateTableV3(table).valid,true,preset.name)
 }
})
