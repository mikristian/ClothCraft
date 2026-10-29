// Techpack spreadsheet view/print pipeline. Escape authored values and never
// copy native provenance/approval state into HTML as trusted markup.
import {asPrintableRows} from './exporterXlsx.js'
import {normalizeTableStyle,TABLE_THEMES} from './tableAdapter.js'
const esc=value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
const validHex=value=>/^#[0-9a-f]{6}$/i.test(String(value||''))?value:null
const cellStyling=(style={})=>{
  const rules=[]
  if(style.bold)rules.push('font-weight:800')
  if(style.italic)rules.push('font-style:italic')
  if(style.underline)rules.push('text-decoration:underline')
  if(['left','center','right'].includes(style.align))rules.push(`text-align:${style.align}`)
  const color=validHex(style.color),background=validHex(style.background)
  if(color)rules.push(`color:${color}`)
  if(background)rules.push(`background:${background}`)
  return rules.join(';')
}
export function renderTechPackSpreadsheetTable(table,{title=table?.title||table?.name||'',rowCap=10000,showTitle=true}={}){
  const {columns,rows}=asPrintableRows(table||{})
  if(columns.length>256||rows.length>10001)throw Error('Spreadsheet print exceeds supported size')
  const data=rows.slice(1,Math.max(1,rowCap)+1)
  const head=rows[0]||[]
  const theme=normalizeTableStyle(table?.tableStyle)
  const palette=TABLE_THEMES[theme.theme==='custom'?'light':theme.theme]||TABLE_THEMES.light
  const header=validHex(theme.header)||palette.header
  const stripe=validHex(theme.stripe)||palette.stripe
  const text=validHex(theme.text)||palette.text
  const css=`--exo-table-header:${header};--exo-table-stripe:${stripe};--exo-table-head-text:${text}`
  const widths=columns.map(column=>Math.max(76,Math.min(700,Number(column.width)||110)))
  const sum=widths.reduce((total,width)=>total+width,0)||1
  const cols=widths.map(width=>`<col style="width:${(100*width/sum).toFixed(3)}%"/>`).join('')
  const html=`<table class="exo-spreadsheet-print" data-techpack-table="${esc(table?.id||'')}" style="${css}"><colgroup>${cols}</colgroup><thead><tr>${head.map(name=>`<th scope="col">${esc(name)}</th>`).join('')}</tr></thead><tbody>${data.map((row,r)=>`<tr>${head.map((_,i)=>{
    // Editor styles are keyed by stable row id; older documents may use
    // positional styles. Keep both readable during printing.
    const key=`${table?.rows?.[r]?.id??r}:${i}`
    const style=cellStyling(table?.cellStyles?.[key]??table?.cellStyles?.[`${r}:${i}`])
    return `<td${style?` style="${style}"`:''}>${esc(row[i])}</td>`
  }).join('')}</tr>`).join('')}</tbody></table>`
  return `<section class="exo-spreadsheet-print-region">${showTitle&&title?`<h2>${esc(title)}</h2>`:''}${html}${rows.length-1>data.length?`<p class="exo-spreadsheet-print-warning">${rows.length-1-data.length} additional rows omitted; increase the print row cap before factory release.</p>`:''}</section>`
}
export function techPackSpreadsheetStyles(){return `.exo-spreadsheet-print-region{max-width:100%;min-width:0;break-inside:auto}.exo-spreadsheet-print-region h2{font:800 10px/1.3 Arial,sans-serif;letter-spacing:.06em;padding-bottom:5px}.exo-spreadsheet-print{border-collapse:collapse;width:100%;font:9px/1.35 Arial,sans-serif;table-layout:fixed;print-color-adjust:exact;-webkit-print-color-adjust:exact}.exo-spreadsheet-print th,.exo-spreadsheet-print td{border:1px solid #84929e;padding:5px;overflow-wrap:anywhere;text-align:left}.exo-spreadsheet-print tbody tr:nth-child(even) td:not([style*="background"]){background:var(--exo-table-stripe,#f6f7f8)}.exo-spreadsheet-print thead{display:table-header-group}.exo-spreadsheet-print th{background:var(--exo-table-header,#e9eef2);color:var(--exo-table-head-text,#263245);font-weight:800;print-color-adjust:exact;-webkit-print-color-adjust:exact}.exo-spreadsheet-print tr{break-inside:avoid}.exo-spreadsheet-print-warning{font-weight:800;color:#9b3e3f}`}
export function listSpreadsheetTablesFromWorkspace(workspace={},sourceTables={}){
 const byId=new Map()
 for(const table of Object.values(sourceTables||{}))if(table?.id)byId.set(table.id,table)
 const registeredIds=new Set()
 for(const table of Object.values(workspace.spreadsheetTables||{}))if(table?.id){byId.set(table.id,table);registeredIds.add(table.id)}
 for(const [pageId,boxes] of Object.entries(workspace.pageBoxes||{}))for(const box of Array.isArray(boxes)?boxes:[]){
   const t=box?.slot?.spreadsheetTable
   if(t&&Array.isArray(t.rows)){
     // The registry is a fallback for sheets without a positioned block.
     // Avoid exporting a stale registry copy alongside its saved board edit.
     if(registeredIds.has(t.id))byId.delete(t.id)
     // A source table and two independently edited, positioned sheet blocks
     // can share their source ID. Keep the boxes separately in XLSX export;
     // each block may hold a different, saved override or formatting choice.
     byId.set(`box:${pageId}:${box.id}`,t)
   }
 }
 return [...byId.values()]
}
