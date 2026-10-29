import {COLUMN_TYPES} from './schemaV3.js'

export function validateCellType(value,type){
  const text=String(value??'')
  if(!text.trim())return true
  switch(type){
    case 'number':return Number.isFinite(Number(text))
    case 'integer':return /^[-+]?\d+$/.test(text.trim())&&Number.isSafeInteger(Number(text))
    case 'boolean':return /^(true|false|yes|no|0|1)$/i.test(text.trim())
    case 'date':return /^\d{4}-\d{2}-\d{2}$/.test(text)&&!Number.isNaN(Date.parse(text))&&new Date(text).toISOString().slice(0,10)===text
    case 'formula':return text.startsWith('=')
    default:return true
  }
}
export function validateTableV3(table){
  const errors=[]
  if(!table||typeof table!=='object'||(table.version!=null&&table.version!==3))return {valid:false,errors:[{code:'version',message:'Expected V3 table'}]}
  if(typeof table.id!=='string'||!table.id)errors.push({code:'table-id'})
  if(!Array.isArray(table.columns)||!Array.isArray(table.rows))return {valid:false,errors:[...errors,{code:'shape'}]}
  const columns=new Set(),rows=new Set()
  for(const col of table.columns){
    if(typeof col?.id!=='string'||!col.id||columns.has(col.id))errors.push({code:'column-id',id:col?.id})
    columns.add(col?.id)
    if(!COLUMN_TYPES.includes(col?.type))errors.push({code:'column-type',id:col?.id})
  }
  for(const row of table.rows){
    if(typeof row?.id!=='string'||!row.id||rows.has(row.id))errors.push({code:'row-id',id:row?.id})
    rows.add(row?.id)
    if(!row?.cells||typeof row.cells!=='object'||Array.isArray(row.cells)){errors.push({code:'cells-shape',rowId:row?.id});continue}
    for(const col of table.columns){
      const cell=row.cells[col.id]
      if(!cell||!['string','number','boolean'].includes(typeof cell.value)&&cell.value!=null){errors.push({code:'cell-missing',rowId:row.id,columnId:col.id});continue}
      if(!validateCellType(cell.value,col.type))errors.push({code:'cell-type',rowId:row.id,columnId:col.id,type:col.type})
      if(!['source','authored','override'].includes(cell.provenance?.kind)&&!['native','authored'].includes(cell.origin))errors.push({code:'provenance',rowId:row.id,columnId:col.id})
    }
    for(const id of Object.keys(row.cells))if(!columns.has(id))errors.push({code:'orphan-cell',rowId:row.id,columnId:id})
  }
  return {valid:errors.length===0,errors}
}
