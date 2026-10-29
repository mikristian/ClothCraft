const str=value=>value==null?'':String(value)
export const isCanonicalSpreadsheet=table=>Array.isArray(table?.columns)
export const makeColumnId=()=>`column-${Date.now()}-${Math.random().toString(36).slice(2,9)}`
export const TABLE_THEMES={light:{header:'#e8eef7',stripe:'#f5f8fc',text:'#263245'},medium:{header:'#4472c4',stripe:'#e8f0fb',text:'#ffffff'},dark:{header:'#243449',stripe:'#334258',text:'#ffffff'}}
export const normalizeTableStyle=style=>({theme:['light','medium','dark','custom'].includes(style?.theme)?style.theme:'light',header:/^#[0-9a-f]{6}$/i.test(style?.header||'')?style.header:undefined,stripe:/^#[0-9a-f]{6}$/i.test(style?.stripe||'')?style.stripe:undefined,text:/^#[0-9a-f]{6}$/i.test(style?.text||'')?style.text:undefined})
export function moveGridColumn(grid,from,to){
  if(from===to||from<0||to<0||from>=grid.headers.length||to>=grid.headers.length)return grid
  const move=list=>{const values=[...list];values.splice(to,0,values.splice(from,1)[0]);return values}
  const cellStyles={}
  for(const [key,value] of Object.entries(grid.cellStyles||{})){
    const match=/^(.*):(\d+)$/.exec(key)
    if(!match){cellStyles[key]=value;continue}
    const old=Number(match[2]);const next=old===from?to:from<to&&old>from&&old<=to?old-1:to<from&&old>=to&&old<from?old+1:old
    cellStyles[`${match[1]}:${next}`]=value
  }
  return {...grid,headers:move(grid.headers),columnIds:move(grid.columnIds||grid.headers.map((_,i)=>`column-${i}`)),columnWidths:move(grid.headers.map((_,i)=>grid.columnWidths?.[i]||160)),rows:grid.rows.map(row=>({...row,cells:move(grid.headers.map((_,i)=>row.cells?.[i]??''))})),cellStyles}
}
/** UI uses positional headers and cells, while preserving canonical data in the source table. */
export function toGridTable(table={}){
  if(!isCanonicalSpreadsheet(table))return { ...table,headers:Array.isArray(table.headers)?table.headers.map(str):[],rows:Array.isArray(table.rows)?table.rows.map(row=>({...row,cells:Array.isArray(row.cells)?row.cells.map(str):[]})):[]}
  const columns=table.columns
  return {...table,headers:columns.map(column=>str(column.label)),columnIds:columns.map(column=>column.id),columnWidths:columns.map(column=>column.width||160),
    rows:(table.rows||[]).map(row=>({...row,cells:columns.map(column=>str(row.cells?.[column.id]?.input??row.cells?.[column.id]?.value))}))}
}
/** Rehydrate source objects, preserving origins, IDs, value metadata and additional fields. */
export function fromGridTable(original={},grid){
  if(!isCanonicalSpreadsheet(original))return grid
  const previousColumns=original.columns||[]
  const previousById=new Map(previousColumns.map(column=>[column.id,column]))
  const columns=grid.headers.map((label,c)=>{const id=grid.columnIds?.[c]||previousColumns[c]?.id||makeColumnId();const previous=previousById.get(id)||{};return {...previous,id,label,width:grid.columnWidths?.[c]||previous.width||160,type:previous.type||'text'}})
  const rowLookup=new Map((original.rows||[]).map(row=>[String(row.id),row]))
  const rows=grid.rows.map(row=>{
    const before=rowLookup.get(String(row.id))||{}
    const cells=Object.fromEntries(columns.map((column,c)=>{
      const previous=before.cells?.[column.id]||{}
      const input=str(row.cells?.[c])
      const changed=input!==str(previous.input??previous.value)
      if(!changed)return [column.id,Object.keys(previous).length?{...previous}:{input,value:input,origin:'authored'}]
      const linked=previous.origin==='native'||previous.override===true||
        previous.sourceRef!=null||before.sourceRef!=null||
        previous.provenance?.kind==='source'||previous.provenance?.kind==='override'
      const sourceValue=previous.underlyingSourceValue??previous.provenance?.originalValue??previous.value??previous.input??null
      const sourceRevision=previous.underlyingSourceRevision??previous.sourceRevision??original.sourceRevision??null
      const provenance=linked?{
        ...previous.provenance,kind:'override',
        sourceRef:previous.provenance?.sourceRef??previous.sourceRef??before.sourceRef??null,
        originalValue:sourceValue
      }:previous.provenance
      return [column.id,{...previous,input,value:input,origin:'authored',
        ...(provenance?{provenance}:{}),
        ...(linked?{override:true,reviewState:'needs-review',
          underlyingSourceValue:sourceValue,underlyingSourceRevision:sourceRevision}:{})}]
    }))
    // Keep row identity and source metadata tied to the original row even
    // when the editor reorders rows or duplicates their visible values.
    const {cells:ignoredCells,...gridRowMetadata}=row
    const sourceMetadata=before.sourceRef?{sourceRef:before.sourceRef}:{}
    return {...before,...gridRowMetadata,...sourceMetadata,cells}
  })
  const {headers,columnWidths,columnIds,...extras}=grid
  return {...original,...extras,tableStyle:normalizeTableStyle(grid.tableStyle||original.tableStyle),columns,rows}
}
