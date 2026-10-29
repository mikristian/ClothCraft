export const TABLE_SCHEMA_VERSION = 3
export const COLUMN_TYPES = Object.freeze(['text','number','integer','boolean','date','formula'])
const str = value => value == null ? '' : String(value)
export const stableId = (prefix, used=new Set()) => {
  let id
  do { id=`${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}` } while(used.has(id))
  return id
}
export const nativeProvenance = (sourceRef=null) => ({kind:'source',sourceRef})
export const authoredProvenance = () => ({kind:'authored'})
export const normalizeColumn = (column={}, used=new Set()) => {
  const id=str(column.id)||stableId('col',used)
  if(used.has(id))throw new Error(`Duplicate column ID: ${id}`)
  used.add(id)
  return {id,label:str(column.label??column.header??''),type:COLUMN_TYPES.includes(column.type)?column.type:'text',provenance:column.provenance||authoredProvenance()}
}
export function createTableV3({id,title='',pageId='',boxId=null,origin='authored',columns=[],rows=[]}={}) {
  const usedColumns=new Set(), usedRows=new Set()
  const normalizedColumns=columns.map(col=>normalizeColumn(typeof col==='string'?{label:col}:col,usedColumns))
  const normalizedRows=rows.map(row=>{
    const rowId=str(row?.id)||stableId('row',usedRows)
    if(usedRows.has(rowId))throw new Error(`Duplicate row ID: ${rowId}`)
    usedRows.add(rowId)
    const cells={}
    normalizedColumns.forEach((col,index)=>{
      const input=Array.isArray(row?.cells)?row.cells[index]:row?.cells?.[col.id]
      cells[col.id]=input&&typeof input==='object'&&!Array.isArray(input)&&Object.hasOwn(input,'value')?
        {...input,input:input.input??input.value,value:input.value,origin:input.origin||'authored',provenance:input.provenance||authoredProvenance()}:
        {input:str(input),value:str(input),origin:origin==='source'?'native':'authored',provenance:origin==='source'?nativeProvenance({rowId,columnId:col.id}):authoredProvenance()}
    })
    return {id:rowId,cells,provenance:row?.provenance||(origin==='source'?nativeProvenance({rowId}):authoredProvenance())}
  })
  return {version:TABLE_SCHEMA_VERSION,id:str(id)||stableId('table'),title:str(title),pageId:str(pageId),boxId:boxId==null?null:str(boxId),origin:origin==='source'?'source':'authored',columns:normalizedColumns,rows:normalizedRows}
}
export function toLegacyTable(table){
  return {id:table.id,title:table.title,headers:table.columns.map(c=>c.label),rows:table.rows.map(row=>({id:row.id,cells:table.columns.map(col=>row.cells[col.id]?.value??'')}))}
}
