import React, {useEffect, useMemo, useRef, useState} from 'react'
import {toGridTable,fromGridTable,makeColumnId,moveGridColumn,TABLE_THEMES,normalizeTableStyle} from '../../core/techpack-spreadsheet/tableAdapter.js'
import {evaluateTableFormulas} from '../../core/techpack-spreadsheet/formulas.js'
import {fillGridRange} from '../../core/techpack-spreadsheet/rangeFill.js'
import {pasteSpreadsheetRange,serializeSpreadsheetSelection} from '../../core/techpack-spreadsheet/gridClipboard.js'
import './TechPackSpreadsheetBlock.css'

const clamp=(n,min,max)=>Math.min(max,Math.max(min,n))
const letters=n=>{let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s}
const coords=(a,b)=>({r:Math.min(a.r,b.r),r2:Math.max(a.r,b.r),c:Math.min(a.c,b.c),c2:Math.max(a.c,b.c)})
const asText=value=>value==null?'':String(value)
const createRow=(width)=>({id:`manual-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,cells:Array.from({length:width},()=>'')})
const normalized=table=>({...(table||{}),headers:Array.isArray(table?.headers)?table.headers.map(asText):[],rows:Array.isArray(table?.rows)?table.rows.map(row=>({...row,cells:Array.isArray(row.cells)?row.cells.map(asText):[]})):[]})

/** Controlled native techpack grid. onChange(nextTable) persists full headers/rows/styles/widths. */
export default function TechPackSpreadsheetBlock({table,spreadsheetTable,onChange=()=>{},onExit=()=>{},readOnly=false,sourceLabel='Techpack table'}){
  const original=spreadsheetTable||table||{}
  const model=normalized(toGridTable(original))
  // Calculations exist only in the view. The canonical table, source values
  // and overrides remain raw and are never assigned evaluated results.
  const calculated=useMemo(()=>evaluateTableFormulas(original),[original])
  const {headers,rows}=model
  const [active,setActive]=useState({r:0,c:0})
  const [anchor,setAnchor]=useState({r:0,c:0})
  const [dragging,setDragging]=useState(false)
  const selectionOrigin=useRef(null)
  const [editing,setEditing]=useState(null)
  const [draft,setDraft]=useState('')
  const [formula,setFormula]=useState('')
  const [formulaFocused,setFormulaFocused]=useState(false)
  const formulaTarget=useRef(null)
  const [nativeValidation,setNativeValidation]=useState(null)
  const [showProperties,setShowProperties]=useState(false)
  const [clipboardNotice,setClipboardNotice]=useState('')
  const grid=useRef(null)
  const input=useRef(null)
  const pendingFocus=useRef(null)
  // Enter moves focus away from the cell editor and triggers blur. Guard the
  // single user edit from being committed twice through those two callbacks,
  // which can otherwise race with the parent Techpack document update.
  const committing=useRef(false)
  const dragWidth=useRef(null)
  const widthDragState=useRef({model:null,emit:null})
  const maxR=Math.max(0,rows.length-1),maxC=Math.max(0,headers.length-1)
  const safeActive={r:clamp(active.r,0,maxR),c:clamp(active.c,0,maxC)}
  const range=coords({r:clamp(anchor.r,0,maxR),c:clamp(anchor.c,0,maxC)},safeActive)
  const cell=(r,c)=>asText(rows[r]?.cells?.[c])
  const displayCell=(r,c)=>{
    const result=calculated.getCell(r,c)
    return result?.error||asText(result?.value??cell(r,c))
  }
  const sourceStatus=(r,c)=>{
    const columnId=model.columnIds?.[c]||original.columns?.[c]?.id
    const rowId=String(rows[r]?.id??'')
    const sourceRow=original.rows?.find(item=>String(item.id)===rowId)
    const source=columnId?sourceRow?.cells?.[columnId]:null
    if(!source||typeof source!=='object')return ''
    if(source.override)return 'Override · review required'
    if(source.origin==='native'||source.sourceRef)return 'Source linked'
    return ''
  }
  const selectedKey=`${safeActive.r}:${safeActive.c}`
  const gridcraftFormula=cell(safeActive.r,safeActive.c)
  const canVerifyRust=typeof gridcraftFormula==='string'&&gridcraftFormula.startsWith('=')&&
    !/[A-Za-z_$]+[0-9]+/.test(gridcraftFormula)
  useEffect(()=>setNativeValidation(null),[selectedKey,gridcraftFormula])
  const verifyWithGridcraft=async()=>{
    if(!canVerifyRust)return
    setNativeValidation({status:'checking',message:'Verifying…'})
    const bridge=typeof window!=='undefined'&&
      (window.location.port==='5386'||window.location.port==='5486')
      ?`http://127.0.0.1:${window.location.port==='5486'?'5485':'5385'}`
      :(import.meta.env.VITE_CLOTHCRAFT_BRIDGE_URL||'http://127.0.0.1:5193')
    try{
      const response=await fetch(bridge+'/techpack/gridcraft/v1/evaluate',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({formula:gridcraftFormula}),
        signal:AbortSignal.timeout?.(3500)
      })
      const answer=await response.json()
      if(!response.ok||!answer?.ok||answer.engine!=='gridcraft-cli'||!Number.isFinite(answer.value)){
        setNativeValidation({status:'unavailable',message:answer?.code||'Rust engine unavailable'})
        return
      }
      const local=calculated.getCell(safeActive.r,safeActive.c)
      const agrees=typeof local?.value==='number'&&Math.abs(answer.value-local.value)<=1e-8*Math.max(1,Math.abs(answer.value))
      setNativeValidation({status:agrees?'match':'mismatch',
        message:agrees?`GridCraft Rust confirmed: ${answer.value}`:`GridCraft ${answer.value}; EXO ${local?.error||local?.value}`})
    }catch(error){setNativeValidation({status:'unavailable',message:'GridCraft Rust not connected'})}
  }
  const styles=model.cellStyles||{}
  const tableStyle=normalizeTableStyle(model.tableStyle)
  const palette={...(TABLE_THEMES[tableStyle.theme]||TABLE_THEMES.light),...Object.fromEntries(Object.entries(tableStyle).filter(([key,value])=>key!=='theme'&&value))}
  const rowKey=r=>String(rows[r]?.id??r)
  const styleKey=(r,c)=>`${rowKey(r)}:${c}`
  const emit=next=>{if(!readOnly)onChange(fromGridTable(original,next))}
  widthDragState.current={model,emit}
  const focusGrid=()=>grid.current?.focus()
  const pick=(r,c,extend=false)=>{const position={r:clamp(r,0,maxR),c:clamp(c,0,maxC)};setActive(position);if(!extend)setAnchor(position);setEditing(null)}
  const put=(r,c,value)=>{
    if(readOnly||!rows[r]||c>=headers.length)return
    emit({...model,rows:rows.map((row,i)=>i===r?{...row,cells:headers.map((_,j)=>j===c?asText(value):asText(row.cells[j]))}:row)})
  }
  const startEdit=(initial=cell(safeActive.r,safeActive.c),position=safeActive)=>{
    if(readOnly||!rows.length||!headers.length)return
    committing.current=false
    setEditing({...position});setDraft(asText(initial))
  }
  const saveEdit=(nextPosition=null)=>{
    if(!editing||committing.current)return
    committing.current=true
    setEditing(null)
    put(editing.r,editing.c,draft)
    if(nextPosition){const next={r:clamp(nextPosition.r,0,maxR),c:clamp(nextPosition.c,0,maxC)};setActive(next);setAnchor(next);pendingFocus.current=next}
    focusGrid()
  }
  const move=(dr,dc,extend=false)=>{pick(safeActive.r+dr,safeActive.c+dc,extend);focusGrid()}
  const selectedCells=()=>Array.from({length:range.r2-range.r+1},(_,ri)=>Array.from({length:range.c2-range.c+1},(_,ci)=>cell(range.r+ri,range.c+ci)))
  const paste=(value)=>{
    if(readOnly||!headers.length||!value)return
    try{
      const result=pasteSpreadsheetRange(model,range,value)
      emit(result.grid)
      setAnchor({r:result.range.r,c:result.range.c})
      setActive({r:result.range.r2,c:result.range.c2})
      setClipboardNotice('')
    }catch(error){setClipboardNotice(error?.message||'Unable to paste clipboard')}
  }
  const format=(property,value)=>{
    if(readOnly)return
    const next={...styles}
    for(let r=range.r;r<=range.r2;r++)for(let c=range.c;c<=range.c2;c++){
      const key=styleKey(r,c)
      next[key]={...next[key],[property]:value===undefined?!next[key]?.[property]:value}
    }
    emit({...model,cellStyles:next})
  }
  const clearFormatting=()=>{
    if(readOnly)return
    const next={...styles}
    for(let r=range.r;r<=range.r2;r++)for(let c=range.c;c<=range.c2;c++)delete next[styleKey(r,c)]
    emit({...model,cellStyles:next})
  }
  const fill=direction=>{
    if(readOnly||!rows.length||!headers.length)return
    emit(fillGridRange(model,range,direction))
    focusGrid()
  }
  const updateHeader=(c,value)=>emit({...model,headers:headers.map((header,i)=>i===c?value:header)})
  const addRow=()=>emit({...model,rows:[...rows,createRow(headers.length)]})
  const insertRow=()=>{const index=safeActive.r;emit({...model,rows:[...rows.slice(0,index),createRow(headers.length),...rows.slice(index)]});pick(index,safeActive.c)}
  const duplicateRow=r=>{
    const row=createRow(headers.length)
    const cellStyles={...styles}
    for(let c=0;c<headers.length;c++){
      const source=styles[styleKey(r,c)]
      if(source)cellStyles[`${row.id}:${c}`]={...source}
    }
    // A copied source-linked row must be authored with its own identity. A
    // literal native value would otherwise masquerade as a second POM sample.
    const sourceRow=original.rows?.find(item=>String(item.id)===String(rows[r]?.id))
    const linked=Boolean(original.sourceLinked||sourceRow?.sourceRef||
      sourceRow&&Object.values(sourceRow.cells||{}).some(value=>
        value&&typeof value==='object'&&(value.origin==='native'||value.sourceRef||value.provenance?.kind==='source')))
    emit({...model,rows:[...rows.slice(0,r+1),{...row,cells:linked?headers.map(()=>''):[...rows[r].cells]},...rows.slice(r+1)],cellStyles})
  }
  const moveRow=(r,offset)=>{const to=r+offset;if(to<0||to>=rows.length)return;const next=[...rows];next.splice(to,0,next.splice(r,1)[0]);emit({...model,rows:next});pick(to,safeActive.c)}
  const deleteRow=r=>{if(rows.length<=1)return;const prefix=`${rowKey(r)}:`;emit({...model,rows:rows.filter((_,i)=>i!==r),cellStyles:Object.fromEntries(Object.entries(styles).filter(([key])=>!key.startsWith(prefix)))});pick(Math.min(r,maxR-1),safeActive.c)}
  const addColumn=()=>emit({...model,headers:[...headers,`COLUMN ${headers.length+1}`],columnIds:[...(model.columnIds||headers.map((_,i)=>`column-${i}`)),makeColumnId()],columnWidths:[...(model.columnWidths||headers.map(()=>160)),160],rows:rows.map(row=>({...row,cells:[...row.cells,'']}))})
  const insertColumn=()=>{const index=safeActive.c;const initial={...model,headers:[...headers,`COLUMN ${headers.length+1}`],columnIds:[...(model.columnIds||headers.map((_,i)=>`column-${i}`)),makeColumnId()],columnWidths:[...(model.columnWidths||headers.map(()=>160)),160],rows:rows.map(row=>({...row,cells:[...row.cells,'']}))};emit(moveGridColumn(initial,headers.length,index));pick(safeActive.r,index)}
  const deleteColumn=c=>{if(headers.length<=1)return;const cellStyles={};for(const [key,value] of Object.entries(styles)){const match=/^(.*):(\d+)$/.exec(key);if(!match){cellStyles[key]=value;continue}const index=Number(match[2]);if(index!==c)cellStyles[`${match[1]}:${index>c?index-1:index}`]=value}emit({...model,headers:headers.filter((_,i)=>i!==c),columnIds:model.columnIds?.filter((_,i)=>i!==c),rows:rows.map(row=>({...row,cells:row.cells.filter((_,i)=>i!==c)})),columnWidths:(model.columnWidths||[]).filter((_,i)=>i!==c),cellStyles});pick(safeActive.r,Math.min(c,maxC-1))}
  const duplicateColumn=c=>{
    const cellStyles={...styles}
    rows.forEach((_,r)=>{const source=styles[styleKey(r,c)];if(source)cellStyles[styleKey(r,headers.length)]={...source}})
    const next=moveGridColumn({...model,headers:[...headers,headers[c]+' COPY'],columnIds:[...(model.columnIds||headers.map((_,i)=>`column-${i}`)),makeColumnId()],columnWidths:[...(model.columnWidths||headers.map(()=>160)),model.columnWidths?.[c]||160],rows:rows.map((row,r)=>({...row,cells:[...row.cells,sourceStatus(r,c)?'':row.cells[c]]})),cellStyles},headers.length,c+1)
    emit(next)
  }
  const shiftColumn=(c,delta)=>{const next=c+delta;if(next<0||next>=headers.length)return;emit(moveGridColumn(model,c,next));pick(safeActive.r,next)}
  const copySelection=async()=>{
    const value=serializeSpreadsheetSelection(selectedCells())
    try{
      if(!navigator.clipboard?.writeText)throw Error('Clipboard API unavailable')
      await navigator.clipboard.writeText(value)
      setClipboardNotice('')
    }catch{
      // Browser permissions vary in embedded macOS webviews. Select a real
      // temporary textarea for execCommand instead of copying an unselected div.
      const fallback=document.createElement('textarea')
      fallback.value=value;fallback.setAttribute('aria-hidden','true')
      fallback.style.cssText='position:fixed;left:-10000px;top:0;opacity:0'
      document.body.appendChild(fallback);fallback.focus();fallback.select()
      let copied=false
      try{copied=document.execCommand?.('copy')===true}catch{/* permission denied */}
      fallback.remove();focusGrid()
      setClipboardNotice(copied?'':'Copy blocked: use ⌘C with the grid selected')
    }
  }
  const setTheme=theme=>emit({...model,tableStyle:{...tableStyle,theme}})
  const setThemeColor=(property,value)=>emit({...model,tableStyle:{...tableStyle,theme:'custom',[property]:value}})
  const selectedStyle=styles[styleKey(safeActive.r,safeActive.c)]||{}
  const commitFormula=()=>{if(!formulaFocused)return;const target=formulaTarget.current;formulaTarget.current=null;setFormulaFocused(false);if(target&&formula!==cell(target.r,target.c))put(target.r,target.c,formula);setFormula('')}
  const keydown=e=>{
    if(editing||e.target!==grid.current)return
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='a'){e.preventDefault();setAnchor({r:0,c:0});setActive({r:maxR,c:maxC});return}
    if((e.metaKey||e.ctrlKey)&&['b','i','u'].includes(e.key.toLowerCase())){e.preventDefault();format(({b:'bold',i:'italic',u:'underline'})[e.key.toLowerCase()]);return}
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='d'){e.preventDefault();fill('down');return}
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='r'){e.preventDefault();fill('right');return}
    if(e.key==='ArrowUp'||e.key==='ArrowDown'||e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();move(e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:0,e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0,e.shiftKey);return}
    if(e.key==='Tab'){e.preventDefault();move(0,e.shiftKey?-1:1);return}
    if(e.key==='Enter'){e.preventDefault();if(e.shiftKey)move(-1,0);else startEdit();return}
    if(e.key==='Home'){e.preventDefault();pick(e.ctrlKey||e.metaKey?0:safeActive.r,0,e.shiftKey);return}
    if(e.key==='End'){e.preventDefault();pick(e.ctrlKey||e.metaKey?maxR:safeActive.r,maxC,e.shiftKey);return}
    if(e.key==='F2'){e.preventDefault();startEdit();return}
    if(e.key==='Escape'){onExit();return}
    if((e.key==='Backspace'||e.key==='Delete')&&!readOnly){e.preventDefault();const next=rows.map((row,r)=>({...row,cells:headers.map((_,c)=>r>=range.r&&r<=range.r2&&c>=range.c&&c<=range.c2?'':cell(r,c))}));emit({...model,rows:next});return}
    if(!readOnly&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&e.key.length===1){e.preventDefault();startEdit(e.key)}
  }
  useEffect(()=>{if(editing)input.current?.focus()},[editing])
  useEffect(()=>{if(!editing&&pendingFocus.current){pendingFocus.current=null;focusGrid()}},[editing])
  useEffect(()=>{if(!dragging)return;const done=()=>{setDragging(false);selectionOrigin.current=null};window.addEventListener('pointerup',done);window.addEventListener('pointercancel',done);return()=>{window.removeEventListener('pointerup',done);window.removeEventListener('pointercancel',done)}},[dragging])
  useEffect(()=>{const onMove=e=>{const data=dragWidth.current;if(!data)return;const {model:current,emit:publish}=widthDragState.current;const width=clamp(data.width+e.clientX-data.x,76,700);const widths=current.headers.map((_,c)=>c===data.column?width:current.columnWidths?.[c]||160);publish({...current,columnWidths:widths})};const stop=()=>{dragWidth.current=null};window.addEventListener('pointermove',onMove);window.addEventListener('pointerup',stop);window.addEventListener('pointercancel',stop);return()=>{window.removeEventListener('pointermove',onMove);window.removeEventListener('pointerup',stop);window.removeEventListener('pointercancel',stop)}},[])
  const activeValue=cell(safeActive.r,safeActive.c)
  const activeCalculation=calculated.getCell(safeActive.r,safeActive.c)
  return <section className="tps" aria-label="Techpack spreadsheet editor" onKeyDown={event=>event.stopPropagation()}>
    <header className="tps-top"><div><strong>SPREADSHEET</strong><span>{sourceLabel}</span></div><button type="button" onClick={onExit}>Close sheet</button></header>
    <div className="tps-tools">
      <button type="button" disabled={readOnly} onClick={()=>format('bold')} aria-label="Bold selection" aria-pressed={!!styles[styleKey(safeActive.r,safeActive.c)]?.bold}><b>B</b></button>
      <button type="button" disabled={readOnly} onClick={()=>format('italic')} aria-label="Italic selection"><i>I</i></button>
      <button type="button" disabled={readOnly} onClick={()=>format('underline')} aria-label="Underline selection"><u>U</u></button>
      <label>Align <select disabled={readOnly} value={styles[styleKey(safeActive.r,safeActive.c)]?.align||'left'} onChange={e=>format('align',e.target.value)}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
      <label>Fill <input type="color" disabled={readOnly} value={styles[styleKey(safeActive.r,safeActive.c)]?.background||'#ffffff'} onChange={e=>format('background',e.target.value)}/></label>
      <label>Font <input type="color" disabled={readOnly} value={selectedStyle.color||'#222222'} onChange={e=>format('color',e.target.value)}/></label>
      <label>Table style <select aria-label="Table style" disabled={readOnly} value={tableStyle.theme} onChange={e=>setTheme(e.target.value)}><option value="light">Excel light</option><option value="medium">Excel medium</option><option value="dark">Excel dark</option><option value="custom">Custom</option></select></label>
      <label>Header <input aria-label="Header color" type="color" disabled={readOnly} value={palette.header} onChange={e=>setThemeColor('header',e.target.value)}/></label>
      <label>Stripe <input aria-label="Stripe color" type="color" disabled={readOnly} value={palette.stripe} onChange={e=>setThemeColor('stripe',e.target.value)}/></label>
      <button type="button" onClick={copySelection}>Copy cells</button>
      <button type="button" disabled={readOnly||range.r===range.r2} onClick={()=>fill('down')} title="Repeat top selected row, adjusting formula references (⌘D)">Fill down</button>
      <button type="button" disabled={readOnly||range.c===range.c2} onClick={()=>fill('right')} title="Repeat left selected column, adjusting formula references (⌘R)">Fill right</button>
      <button type="button" disabled={readOnly} onClick={clearFormatting}>Clear formatting</button>
      <button type="button" onClick={()=>setShowProperties(v=>!v)} aria-expanded={showProperties}>Cell properties</button>
      <button type="button" disabled={readOnly} onClick={addRow}>+ Row</button>
      <button type="button" disabled={readOnly} onClick={insertRow} title="Insert before the selected row">Insert row</button>
      <button type="button" disabled={readOnly} onClick={addColumn}>+ Column</button>
      <button type="button" disabled={readOnly} onClick={insertColumn} title="Insert before the selected column">Insert column</button>
      <button type="button" disabled={readOnly||headers.length<=1} onClick={()=>deleteColumn(safeActive.c)} title="Remove the selected column">Delete column</button>
      <button type="button" disabled={readOnly||safeActive.c===0} onClick={()=>shiftColumn(safeActive.c,-1)} title="Move the selected column left">Column ←</button>
      <button type="button" disabled={readOnly||safeActive.c===maxC} onClick={()=>shiftColumn(safeActive.c,1)} title="Move the selected column right">Column →</button>
      <button type="button" disabled={readOnly} onClick={()=>duplicateColumn(safeActive.c)} title="Duplicate the selected column">Duplicate column</button>
    </div>
    {showProperties&&<aside className="tps-properties" aria-label="Selected cell properties"><strong>{letters(safeActive.c)}{safeActive.r+1}</strong><span>Column: {headers[safeActive.c]}</span><span>Row: {rows[safeActive.r]?.id||''}</span><span>Raw input: {activeValue||'(empty)'}</span><span>Formula result: {asText(calculated.getCell(safeActive.r,safeActive.c)?.value)}</span><span>Source: {sourceStatus(safeActive.r,safeActive.c)||'Manual'}</span><span>Style: {JSON.stringify(selectedStyle)}</span></aside>}
    <div className="tps-formula"><output>{letters(safeActive.c)}{safeActive.r+1}</output><span>fx</span><input aria-label="Formula bar" disabled={readOnly||!rows.length||!headers.length} value={formulaFocused?formula:activeValue} onFocus={()=>{formulaTarget.current={...safeActive};setFormulaFocused(true);setFormula(activeValue)}} onChange={e=>setFormula(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur()}else if(e.key==='Escape'){e.preventDefault();formulaTarget.current=null;setFormulaFocused(false);setFormula('');e.currentTarget.blur()}}} onBlur={commitFormula} /><span className={activeCalculation?.error?'tps-result tps-error':'tps-result'} title="Calculated display, source input unchanged">{activeCalculation?.error||((activeValue.startsWith('='))?asText(activeCalculation?.value):'')}</span>{sourceStatus(safeActive.r,safeActive.c)&&<span className="tps-origin">{sourceStatus(safeActive.r,safeActive.c)}</span>}{canVerifyRust&&<button type="button" className="tps-rust-verify" onClick={verifyWithGridcraft} disabled={nativeValidation?.status==='checking'} title="Independently evaluate this standalone formula in the GridCraft Rust engine. Cell references stay in EXO's local calculator.">Verify Rust</button>}{nativeValidation&&<output aria-live="polite" className={`tps-rust-status tps-rust-${nativeValidation.status}`}>{nativeValidation.message}</output>}</div>
    <div className="tps-scroll" ref={grid} tabIndex={0} role="grid" aria-label={sourceLabel} aria-rowcount={rows.length+1} aria-colcount={headers.length} onKeyDown={keydown} onCopy={e=>{if(editing)return;e.preventDefault();e.clipboardData.setData('text/plain',serializeSpreadsheetSelection(selectedCells()))}} onPaste={e=>{if(editing||readOnly)return;e.preventDefault();paste(e.clipboardData.getData('text/plain'))}}>
      <table className={tableStyle.theme==='dark'?'tps-dark':''} style={{'--tps-header':palette.header,'--tps-stripe':palette.stripe,'--tps-header-text':palette.text}}><colgroup><col className="tps-index"/>{headers.map((_,c)=><col key={model.columnIds?.[c]||c} style={{width:clamp(Number(model.columnWidths?.[c])||160,76,700)}}/>)}</colgroup><thead><tr><th className="tps-corner">#</th>{headers.map((header,c)=><th key={model.columnIds?.[c]||c} className="tps-colhead"><div><span>{letters(c)}</span><input aria-label={`Column ${letters(c)} title`} disabled={readOnly} value={header} onChange={e=>updateHeader(c,e.target.value)}/><button disabled={readOnly||c===0} title="Move left" aria-label={`Move column ${letters(c)} left`} onClick={()=>shiftColumn(c,-1)}>←</button><button disabled={readOnly||c===maxC} title="Move right" aria-label={`Move column ${letters(c)} right`} onClick={()=>shiftColumn(c,1)}>→</button><button disabled={readOnly} title="Duplicate column" aria-label={`Duplicate column ${letters(c)}`} onClick={()=>duplicateColumn(c)}>⧉</button><button disabled={readOnly||headers.length<=1} aria-label={`Delete column ${letters(c)}`} title="Delete column" onClick={()=>deleteColumn(c)}>×</button></div><span className="tps-resizer" role="separator" aria-label={`Resize column ${letters(c)}`} onPointerDown={e=>{if(readOnly)return;e.preventDefault();dragWidth.current={x:e.clientX,width:clamp(Number(model.columnWidths?.[c])||160,76,700),column:c}}}/></th>)}</tr></thead>
      <tbody>{rows.map((row,r)=><tr key={row.id||r}><th className="tps-rowhead"><span>{r+1}</span><button disabled={readOnly||r===0} aria-label={`Move row ${r+1} up`} onClick={()=>moveRow(r,-1)}>↑</button><button disabled={readOnly||r===maxR} aria-label={`Move row ${r+1} down`} onClick={()=>moveRow(r,1)}>↓</button><button disabled={readOnly} aria-label={`Duplicate row ${r+1}`} onClick={()=>duplicateRow(r)}>⧉</button><button disabled={readOnly||rows.length<=1} title="Delete row" aria-label={`Delete row ${r+1}`} onClick={()=>deleteRow(r)}>×</button></th>{headers.map((_,c)=>{const selected=r>=range.r&&r<=range.r2&&c>=range.c&&c<=range.c2;const isActive=r===safeActive.r&&c===safeActive.c;const style=styles[styleKey(r,c)]||{};const status=sourceStatus(r,c);const result=calculated.getCell(r,c);return <td key={c} role="gridcell" aria-selected={selected} title={status||result?.error||undefined} className={`${selected?'tps-selected ':''}${isActive?'tps-active ':''}${result?.error?'tps-cell-error ':''}${status?'tps-cell-source':''}`} style={{fontWeight:style.bold?'bold':undefined,fontStyle:style.italic?'italic':undefined,textDecoration:style.underline?'underline':undefined,textAlign:['left','center','right'].includes(style.align)?style.align:undefined,color:/^#[0-9a-f]{6}$/i.test(style.color||'')?style.color:undefined,background:/^#[0-9a-f]{6}$/i.test(style.background||'')?style.background:undefined}} onPointerDown={e=>{if(e.button!==0)return;selectionOrigin.current=e.shiftKey?{...anchor}:{r,c};pick(r,c,e.shiftKey);setDragging(true);focusGrid()}} onPointerEnter={()=>{if(dragging){if(selectionOrigin.current)setAnchor(selectionOrigin.current);setActive({r,c})}}} onDoubleClick={()=>{setActive({r,c});startEdit(cell(r,c),{r,c})}}>{editing?.r===r&&editing?.c===c?<input ref={input} className="tps-editor" aria-label={`Editing ${letters(c)}${r+1}`} value={draft} onChange={e=>setDraft(e.target.value)} onBlur={()=>saveEdit()} onKeyDown={e=>{e.stopPropagation();if(e.key==='Escape'){committing.current=true;setEditing(null);focusGrid()}else if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();saveEdit({r:r+(e.key==='Enter'?(e.shiftKey?-1:1):0),c:c+(e.key==='Tab'?(e.shiftKey?-1:1):0)})}}}/>:displayCell(r,c)}</td>})}</tr>)}</tbody></table>
    </div>
    <footer className="tps-footer"><span>{rows.length} rows · {headers.length} columns · {range.r2-range.r+1} × {range.c2-range.c+1} selected</span><span>{clipboardNotice||'Drag to select · Double click to edit · ⌘C / ⌘V · ⌘D down · ⌘R right'}</span></footer>
  </section>
}
