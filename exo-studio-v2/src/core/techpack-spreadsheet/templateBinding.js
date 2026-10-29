import {createTableV3,COLUMN_TYPES} from './schemaV3.js'

/** Create a fresh editable table SCHEMA from an EXO Library preset. A template
 * never carries another garment's measurements, supplier costs or approvals. */
export function spreadsheetFromTechPackPreset(preset={}, {pageId='',boxId='',id}={}){
  if(preset.category!=='tables')throw Error('A spreadsheet table template is required')
  const headers=Array.isArray(preset.headers)?preset.headers.map(v=>String(v).slice(0,80)).slice(0,12):[]
  if(!headers.length)throw Error('This template does not define table columns')
  const count=Math.min(30,Math.max(1,Number.isInteger(preset.rows)?preset.rows:4))
  const columns=headers.map((label,i)=>({id:`column-${i}`,label,
    type:COLUMN_TYPES.includes(preset.columnTypes?.[i])?preset.columnTypes[i]:'text',
    width:Math.min(240,Math.max(76,Number(preset.columnWidths?.[i])||130))}))
  const rows=Array.from({length:count},(_,i)=>({id:`blank-${i}`,cells:headers.map(()=>'')}))
  const table=createTableV3({id:id||`preset-${String(preset.id||'table').replace(/[^a-z0-9_-]/gi,'-')}-${Math.random().toString(36).slice(2)}`,
    title:String(preset.title||preset.name||'Specification table').slice(0,80),pageId,boxId,columns,rows})
  return {...table,kind:String(preset.id||'custom'),name:table.title,styleId:'exo-seville-spec-v1',
    presetId:String(preset.id||''),sourceKind:'manual',needsReview:true}
}
