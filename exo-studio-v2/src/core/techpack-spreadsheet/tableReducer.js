import {authoredProvenance,stableId} from './schemaV3.js'
import {parseSpreadsheetClipboard} from './gridClipboard.js'

const ensure=(condition,message)=>{if(!condition)throw new RangeError(message)}
const indexFor=(array,id,type)=>{const index=array.findIndex(item=>item.id===id);ensure(index>=0,`Unknown ${type} ID: ${id}`);return index}
const cellValue=value=>String(value??'')
export function editCell(table,rowId,columnId,value){
  indexFor(table.columns,columnId,'column')
  const index=indexFor(table.rows,rowId,'row')
  const row=table.rows[index], old=row.cells[columnId]
  const linked=old?.origin==='native'||old?.override||old?.provenance?.kind==='source'||old?.provenance?.kind==='override'
  const provenance=linked?
    {kind:'override',sourceRef:old.provenance?.sourceRef??old.sourceRef??row.sourceRef??null,originalValue:old.provenance?.originalValue??old.underlyingSourceValue??old.value}:authoredProvenance()
  const text=cellValue(value)
  const updated={...old,input:text,value:text,origin:'authored',provenance,...(linked?{override:true,reviewState:'needs-review',underlyingSourceValue:old.underlyingSourceValue??old.value,underlyingSourceRevision:old.underlyingSourceRevision??table.sourceRevision??null}:{})}
  return {...table,rows:table.rows.map((current,i)=>i===index?{...row,cells:{...row.cells,[columnId]:updated}}:current)}
}
export function insertRow(table,{at=table.rows.length,id=stableId('row'),values=[]}={}){
  ensure(Number.isInteger(at)&&at>=0&&at<=table.rows.length,'Invalid row insertion index')
  ensure(!table.rows.some(r=>r.id===id),'Duplicate row ID')
  const cells=Object.fromEntries(table.columns.map((column,i)=>{const value=cellValue(Array.isArray(values)?values[i]:values[column.id]);return [column.id,{input:value,value,origin:'authored',provenance:authoredProvenance()}]}))
  const rows=table.rows.slice();rows.splice(at,0,{id,cells,provenance:authoredProvenance()})
  return {...table,rows}
}
export function deleteRow(table,rowId){indexFor(table.rows,rowId,'row');return {...table,rows:table.rows.filter(r=>r.id!==rowId)}}
export function insertColumn(table,{at=table.columns.length,id=stableId('col'),label='',type='text'}={}){
  ensure(Number.isInteger(at)&&at>=0&&at<=table.columns.length,'Invalid column insertion index')
  ensure(!table.columns.some(c=>c.id===id),'Duplicate column ID')
  ensure(['text','number','integer','boolean','date','formula'].includes(type),'Invalid column type')
  const columns=table.columns.slice();columns.splice(at,0,{id,label:String(label),type,provenance:authoredProvenance()})
  return {...table,columns,rows:table.rows.map(row=>({...row,cells:{...row.cells,[id]:{input:'',value:'',origin:'authored',provenance:authoredProvenance()}}}))}
}
export function deleteColumn(table,columnId){
  indexFor(table.columns,columnId,'column')
  return {...table,columns:table.columns.filter(c=>c.id!==columnId),rows:table.rows.map(row=>{const cells={...row.cells};delete cells[columnId];return {...row,cells}})}
}
export function parseTSV(tsv){
  return parseSpreadsheetClipboard(String(tsv??''))
}
export function pasteTSV(table,{rowId,columnId,tsv,expand=true}={}){
  let next=table
  const startRow=indexFor(next.rows,rowId,'row'),startColumn=indexFor(next.columns,columnId,'column')
  const matrix=parseTSV(tsv)
  if(!matrix.length)return table
  const width=Math.max(0,...matrix.map(line=>line.length))
  if(!expand)ensure(startRow+matrix.length<=next.rows.length&&startColumn+width<=next.columns.length,'Paste exceeds table bounds')
  while(next.columns.length<startColumn+width)next=insertColumn(next)
  while(next.rows.length<startRow+matrix.length)next=insertRow(next)
  for(let i=0;i<matrix.length;i++)for(let j=0;j<matrix[i].length;j++){
    next=editCell(next,next.rows[startRow+i].id,next.columns[startColumn+j].id,matrix[i][j])
  }
  return next
}
export function tableReducer(table,action){
  switch(action.type){
    case 'editCell':return editCell(table,action.rowId,action.columnId,action.value)
    case 'insertRow':return insertRow(table,action)
    case 'deleteRow':return deleteRow(table,action.rowId)
    case 'insertColumn':return insertColumn(table,action)
    case 'deleteColumn':return deleteColumn(table,action.columnId)
    case 'pasteTSV':return pasteTSV(table,action)
    default:throw new Error(`Unknown table action: ${action.type}`)
  }
}
