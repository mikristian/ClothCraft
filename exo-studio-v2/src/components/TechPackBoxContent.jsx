import React, {useMemo} from 'react'
import {ImagePlus, Pencil, Trash2, X} from 'lucide-react'
import TechPackSpreadsheetBlock from './techpack-spreadsheet/TechPackSpreadsheetBlock.jsx'
import {createTableV3} from '../core/techpack-spreadsheet/schemaV3.js'
import {toGridTable,normalizeTableStyle,TABLE_THEMES} from '../core/techpack-spreadsheet/tableAdapter.js'
import {evaluateTableFormulas} from '../core/techpack-spreadsheet/formulas.js'
import './TechPackBoxContent.css'

/**
 * Editable content inside a positioned Techpack page box.
 * box: {id,title,note,slot?:{category,id,title,headers,rows,header},assetId?}.
 * layoutMode: true disables all content editing for the outer transform overlay.
 * assets: [{id,name?,caption?,_src?,dataUrl?,url?}].
 * onEdit(patch): persist a shallow box patch (including updated slot).
 * onDelete(): remove this box; onAssetPick(): open the workspace asset picker.
 * onApplyTemplate(preset): apply a dropped EXO template to this box.
 * The parent owns state and persistence; this component never renders arbitrary HTML.
 */
export const safeBoxImageSrc=src=>typeof src==='string'&&(
  (/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(src)&&src.length<400000)||
  (/^data:image\/svg\+xml,%3Csvg/i.test(src)&&src.length<450000)
) ? src : ''

export const boxAssetInfo=(box,assets)=>{
  const selected=Array.isArray(assets)?assets.find(asset=>String(asset.id)===String(box?.assetId)):null
  // An unlinked URL must never render as a reference after a linked photo is cleared.
  const imageSource=selected?(selected._src||selected.dataUrl||selected.url):box?.assetId?'':box?.assetSrc
  return {selected,safeSrc:safeBoxImageSrc(imageSource),source:selected?selected._source||'library':'',category:selected?selected.category||'reference':''}
}

const safeColor=value=>/^#[0-9a-f]{6}$/i.test(value||'')?value:undefined
/** Read-only page preview uses the same formula engine and formatting contract as the editor. */
export const spreadsheetBoxPreview=table=>{
  const grid=toGridTable(table)
  const evaluation=evaluateTableFormulas(table)
  const theme=normalizeTableStyle(grid.tableStyle)
  const palette={...(TABLE_THEMES[theme.theme]||TABLE_THEMES.light),...Object.fromEntries(Object.entries(theme).filter(([key,value])=>key!=='theme'&&value))}
  return {
    theme:theme.theme,palette,
    columns:grid.headers.map((label,index)=>({label,width:Math.min(700,Math.max(76,Number(grid.columnWidths?.[index])||160))})),
    rows:grid.rows.map((row,r)=>({id:row.id||`row-${r}`,cells:grid.headers.map((_,c)=>{
      const result=evaluation.getCell(r,c)
      const rawCell=table?.columns?.[c]?.id?table.rows?.[r]?.cells?.[table.columns[c].id]:null
      const source=rawCell&&typeof rawCell==='object'?rawCell:null
      const status=source?.override||source?.provenance?.kind==='override'?'Override · review required':
        source?.origin==='native'||source?.sourceRef||source?.provenance?.kind==='source'?'Source linked':''
      const style=grid.cellStyles?.[`${row.id||`row-${r}`}:${c}`]||{}
      return {value:String(result?.error||(result?.value??'')),error:result?.error||'',status,
        style:{fontWeight:style.bold?'bold':undefined,fontStyle:style.italic?'italic':undefined,
          textDecoration:style.underline?'underline':undefined,
          textAlign:['left','center','right'].includes(style.align)?style.align:undefined,
          color:safeColor(style.color),background:safeColor(style.background)}}
    })}))
  }
}

export default function TechPackBoxContent({box={},layoutMode=false,assets=[],onEdit=()=>{},onDelete=()=>{},onApplyTemplate=()=>{},onAssetPick=()=>{}}){
  const id=box.id
  const editable=!layoutMode
  const slot=box.slot&&typeof box.slot==='object'?box.slot:{}
  const patch=change=>{if(editable)onEdit(change)}
  const patchSlot=change=>patch({slot:{...slot,...change}})
  const kind=slot.category==='tables'?'table':slot.category==='headers'?'header':
    ['pages','packs','garments','custom','themes','interactive'].includes(slot.category)?'module':
    box.templateType||box.contentType||((Array.isArray(slot.headers)&&slot.headers.length)||(Array.isArray(box.headers)&&box.headers.length)?'table':box.headerStyle?'header':box.assetId||box.assetSrc?'asset':'note')
  const headers=Array.isArray(slot.headers)?slot.headers.map(String).slice(0,12):Array.isArray(box.headers)?box.headers.map(String).slice(0,12):[]
  const rows=Array.isArray(slot.rows)?slot.rows.slice(0,40):Array.isArray(box.rows)?box.rows.slice(0,40):[]
  const typedSpreadsheet=useMemo(()=>slot.spreadsheetTable||createTableV3({
    id:slot.id||`box-grid-${id}`,title:slot.title||box.title||'Specification table',
    pageId:'',boxId:id,origin:'authored',
    columns:headers.map((label,i)=>({id:`col-${i}`,label,type:'text'})),
    rows:rows.map((row,i)=>({id:row.id||`row-${i}`,cells:headers.map((_,j)=>String(row?.cells?.[j]??''))}))
  }),[slot.spreadsheetTable,slot.id,slot.title,box.title,id,slot.headers,slot.rows,box.headers,box.rows])
  const preview=useMemo(()=>kind==='table'&&layoutMode?spreadsheetBoxPreview(typedSpreadsheet):null,[kind,layoutMode,typedSpreadsheet])
  const {selected,safeSrc,source,category}=boxAssetInfo(box,assets)
  const hasAsset=Boolean(box.assetId||box.assetSrc)
  const clearImage=()=>patch({assetId:null,assetSrc:null})
  const stopLayoutKeys=event=>{
    // Keep ordinary text editing and grid navigation inside the active control.
    // The spreadsheet owns its keyboard behavior and must continue receiving it.
    if(event.target.closest?.('input,textarea,button')&&!event.target.closest?.('.tps'))event.stopPropagation()
  }
  const updateCell=(index,column,value)=>patchSlot({rows:rows.map((row,i)=>i===index?{...(typeof row==='object'&&row?row:{}),id:row?.id||`row-${i}`,cells:headers.map((_,j)=>j===column?value:String(row?.cells?.[j]||''))}:row)})
  const normalizedRow=row=>headers.map((_,i)=>String(row?.cells?.[i]||''))
  const addRow=()=>{if(rows.length<40)patchSlot({rows:[...rows,{id:`row-${Date.now()}-${rows.length}`,cells:headers.map(()=>'')}]})}
  const removeRow=index=>patchSlot({rows:rows.filter((_,i)=>i!==index)})
  const addColumn=()=>{if(headers.length<12)patchSlot({headers:[...headers,`COLUMN ${headers.length+1}`],rows:rows.map(row=>({...row,cells:[...normalizedRow(row),'']}))})}
  const removeColumn=index=>{if(headers.length<=1)return;patchSlot({headers:headers.filter((_,i)=>i!==index),rows:rows.map(row=>({...row,cells:normalizedRow(row).filter((_,i)=>i!==index)}))})}
  const onDragOver=event=>{if(!editable)return;if(Array.from(event.dataTransfer?.types||[]).includes('application/x-exo-techpack-template')){event.preventDefault();event.dataTransfer.dropEffect='copy'}}
  const onDrop=event=>{
    if(!editable)return
    const raw=event.dataTransfer?.getData('application/x-exo-techpack-template')
    if(!raw)return
    event.preventDefault();event.stopPropagation()
    try{const preset=JSON.parse(raw);if(preset&&typeof preset==='object'&&!Array.isArray(preset)&&['boxes','tables','headers'].includes(preset.category))onApplyTemplate(preset)}catch{/* Ignore malformed external drag data. */}
  }
  // Do not stop events in the capture phase: that also prevents the nested
  // spreadsheet cell editor from receiving Enter, Escape, Tab and letter keys.
  // TechPackSpreadsheetBlock handles its own keystrokes and stops bubbling to
  // global layout shortcuts at its grid boundary.
  return <section className={`tpbc tpbc-${kind} ${layoutMode?'tpbc-layout':'tpbc-content'}`} aria-label={`Techpack detail box ${box.title||'Untitled'}`} onDragOver={onDragOver} onDrop={onDrop} onKeyDown={stopLayoutKeys}>
    <div className="tpbc-topline">
      {editable?<input className="tpbc-title" aria-label="Box title" maxLength={80} value={box.title||''} placeholder="DETAIL TITLE" onChange={event=>patch({title:event.target.value})}/>:<strong className="tpbc-title">{box.title||'DETAIL TITLE'}</strong>}
      {editable&&<button className="tpbc-icon-button" type="button" aria-label={`Delete box ${box.title||''}`} title="Delete box" onClick={()=>onDelete()}><Trash2 size={13}/></button>}
    </div>
    {kind==='header'&&<div className={`tpbc-header-panel tpbc-header-${/^[a-z0-9-]{1,32}$/i.test(slot.header||box.headerStyle||'')?slot.header||box.headerStyle:'technical'}`}>
      <small>TECHNICAL DOCUMENT / {slot.header||box.headerStyle||'HEADER'}</small>
      <strong>{slot.title||box.headerText||box.title||'GARMENT SPECIFICATION'}</strong>
      {editable&&<input aria-label="Header headline" maxLength={100} value={slot.title||''} placeholder="Header headline" onChange={event=>patchSlot({title:event.target.value})}/>}
      <span>STYLE / DEVELOPMENT / REVISION</span>
    </div>}
    {kind==='module'&&<div className="tpbc-template-module" aria-label="Inserted editable page template module">
      <small>{String(slot.category||'page').toUpperCase()} / {String(slot.layout||'BALANCED').toUpperCase()}</small>
      <strong>{slot.title||slot.name||'CUSTOM LAYOUT'}</strong>
      <span>Editable detail region · Add notes, table elements or an image to this box</span>
    </div>}
    {kind==='table'&&(editable?
      <TechPackSpreadsheetBlock table={typedSpreadsheet} sourceLabel={slot.title||box.title||'Techpack table'}
        onChange={next=>patchSlot({spreadsheetTable:next})} onExit={()=>{if(document.activeElement?.closest?.('.tps'))document.activeElement.blur()}}/>:
      <div className="tpbc-table-scroll"><table className="tpbc-table" aria-label={`${slot.title||box.title||'Techpack table'} preview`} style={{tableLayout:'fixed',minWidth:'100%'}}><colgroup>{preview.columns.map((column,index)=><col key={index} style={{width:column.width}}/>)}</colgroup><thead><tr>{preview.columns.map((column,index)=><th key={index} style={{background:preview.palette.header,color:preview.palette.text}}>{column.label}</th>)}</tr></thead><tbody>{preview.rows.map((row,index)=><tr key={row.id||index}>{row.cells.map((cell,j)=><td key={j} title={[cell.status,cell.error].filter(Boolean).join(' · ')||undefined} data-source-status={cell.status||undefined} style={{background:index%2?preview.palette.stripe:undefined,...cell.style}}>{cell.value}{cell.status&&<span aria-label={cell.status} style={{display:'block',fontSize:8,fontWeight:600,opacity:.8}}>{cell.status}</span>}</td>)}</tr>)}</tbody></table></div>)}
    {(kind==='asset'||hasAsset)&&<figure className="tpbc-asset">
      <div className="tpbc-photo-frame" onDoubleClick={event=>{if(!editable)return;event.stopPropagation();onAssetPick()}} title={editable?'Double-click to replace image':undefined}>
        {safeSrc?<img src={safeSrc} alt={selected?.caption||selected?.name||box.title||'Techpack reference'} draggable={false}/>:<div className="tpbc-empty-asset">{hasAsset?'Image preview unavailable':'No image selected'}</div>}
        {editable&&<button type="button" className="tpbc-photo-overlay" aria-label={hasAsset?'Replace selected image':'Choose image'} onClick={event=>{event.stopPropagation();onAssetPick()}}><Pencil size={13}/>{hasAsset?'Replace image':'Choose image'}</button>}
      </div>
      {selected&&<figcaption className="tpbc-asset-caption"><span>{selected.caption||selected.name||'Selected reference'}</span><span className="tpbc-asset-origin">{category} · {source}</span></figcaption>}
      {box.assetId&&!selected&&<figcaption className="tpbc-asset-missing">Linked asset is unavailable · {String(box.assetId).slice(0,45)}</figcaption>}
    </figure>}
    {editable&&(kind==='asset'||kind==='note'||kind==='header'||kind==='module'||hasAsset)&&<div className="tpbc-photo-actions">
      <button type="button" className="tpbc-asset-picker" onClick={event=>{event.stopPropagation();onAssetPick()}}><ImagePlus size={12}/> {hasAsset?'Replace photo':'Insert photo'}</button>
      {hasAsset&&<button type="button" className="tpbc-clear-photo" aria-label="Clear box photo" title="Remove photo from this box, keep text and layout" onClick={event=>{event.stopPropagation();clearImage()}}><X size={12}/> Clear</button>}
    </div>}
    {kind!=='table'&&(editable?<textarea className="tpbc-note" aria-label={`Notes for ${box.title||'box'}`} placeholder="Add garment details or factory instructions…" maxLength={1200} value={box.note||''} onChange={event=>patch({note:event.target.value})}/>:box.note?<p className="tpbc-note-readonly">{box.note}</p>:null)}
  </section>
}
