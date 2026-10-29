import {createTableV3} from './schemaV3.js'

/** Build an editable authored table from an XLSX parser result.
 * Imported workbook content never gains native garment provenance or approval.
 */
export function importedSheetToWorkspaceTable(sheet,{id,pageId,boxId}={}){
  const headers=Array.isArray(sheet?.headers)?sheet.headers:[]
  const columns=headers.map((header,i)=>({
    id:'col-'+i,label:String(header??''),type:'text',
    width:Math.max(76,Math.min(700,Number(sheet.columnWidths?.[i]??sheet.columns?.[i]?.width)||160))
  }))
  const sourceRows=Array.isArray(sheet?.rows)?sheet.rows:[]
  const rows=sourceRows.map((row,i)=>({
    id:`import-row-${i+1}`,
    cells:columns.map((_,c)=>row?.cells?.[c]??'')
  }))
  const table=createTableV3({
    id,title:sheet?.name||'Imported sheet',pageId,boxId,origin:'authored',
    columns,rows
  })
  // createTableV3 deliberately normalizes columns; restore the imported widths
  // only after it has validated unique IDs and generated authored cell records.
  const cellStyles={}
  for(const [key,style] of Object.entries(sheet?.cellStyles||{})){
    const match=/^([^:]+):(\d+)$/.exec(key)
    if(!match||!style||typeof style!=='object'||Array.isArray(style))continue
    const rowIndex=/^\d+$/.test(match[1])?Number(match[1]):sourceRows.findIndex(row=>row?.id===match[1])
    const colIndex=Number(match[2])
    if(!table.rows[rowIndex]||!table.columns[colIndex])continue
    const result={}
    for(const flag of ['bold','italic','underline'])if(style[flag]===true)result[flag]=true
    if(['left','center','right'].includes(style.align))result.align=style.align
    for(const color of ['color','background'])if(/^#[0-9a-f]{6}$/i.test(style[color]||''))result[color]=style[color]
    if(Object.keys(result).length)cellStyles[`${table.rows[rowIndex].id}:${colIndex}`]=result
  }
  return {...table,columns:table.columns.map((column,i)=>({...column,width:columns[i].width})),cellStyles,
    imported:true,needsReview:true,importWarning:String(sheet?.importWarning||'Imported workbook requires verification before factory use').slice(0,500)}
}
