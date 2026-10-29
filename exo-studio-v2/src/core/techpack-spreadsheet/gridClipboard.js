// Excel-compatible TSV clipboard: quoted cells may contain tabs, newlines,
// and escaped double quotes. Inputs remain inert strings.
export function parseSpreadsheetClipboard(raw,{maxRows=1000,maxColumns=256,maxCellLength=10000}={}){
  if(typeof raw!=='string'||raw.length===0)return []
  const rows=[],row=[];let value='',quoted=false
  for(let i=0;i<raw.length;i++){
    const ch=raw[i]
    if(quoted){
      if(ch==='"'&&raw[i+1]==='"'){if(value.length<maxCellLength)value+='"';i++}
      else if(ch==='"')quoted=false
      else if(value.length<maxCellLength)value+=ch
      continue
    }
    if(ch==='"'&&value.length===0){quoted=true;continue}
    if(ch==='\t'||ch==='\n'||ch==='\r'){
      row.push(value.slice(0,maxCellLength));value=''
      if(row.length>maxColumns)throw new RangeError('Clipboard exceeds 256 columns')
      if(ch==='\t')continue
      rows.push([...row]);row.length=0
      if(rows.length>maxRows)throw new RangeError('Clipboard exceeds 1000 rows')
      if(ch==='\r'&&raw[i+1]==='\n')i++
      continue
    }
    if(value.length<maxCellLength)value+=ch
  }
  if(value.length||row.length||!rows.length){
    row.push(value.slice(0,maxCellLength))
    if(row.length>maxColumns)throw new RangeError('Clipboard exceeds 256 columns')
    if(rows.length>=maxRows)throw new RangeError('Clipboard exceeds 1000 rows')
    rows.push(row)
  }
  return rows
}

export function serializeSpreadsheetSelection(cells){
  return cells.map(row=>row.map(value=>{
    const string=String(value??'')
    return /[\t\n\r"]/.test(string)?'"'+string.replace(/"/g,'""')+'"':string
  }).join('\t')).join('\r\n')
}

/** Paste into a copy of the grid. Single-cell paste fills selected rectangles. */
export function pasteSpreadsheetRange(grid,selection,clipboard,{maxRows=1000}={}){
  const pasted=parseSpreadsheetClipboard(clipboard)
  if(!pasted.length||!grid?.headers?.length)return {grid,range:selection}
  const startR=selection.r,startC=selection.c
  const replicate=pasted.length===1&&pasted[0].length===1
  const height=replicate?selection.r2-selection.r+1:pasted.length
  const width=replicate?selection.c2-selection.c+1:Math.max(...pasted.map(row=>row.length))
  const rows=grid.rows.map(row=>({...row,cells:[...row.cells]}))
  const count=Math.min(maxRows,startR+height)
  while(rows.length<count)rows.push({id:'manual-'+(globalThis.crypto?.randomUUID?.()||String(Date.now())+'-'+String(Math.random())),cells:grid.headers.map(()=>'')})
  for(let i=0;i<height;i++)for(let j=0;j<width;j++){
    const row=rows[startR+i],col=startC+j
    if(!row||col>=grid.headers.length)continue
    const value=replicate?pasted[0][0]:pasted[i]?.[j]
    if(value!==undefined)row.cells[col]=value
  }
  return {grid:{...grid,rows},range:{r:startR,r2:Math.min(rows.length-1,startR+height-1),
    c:startC,c2:Math.min(grid.headers.length-1,startC+width-1)}}
}
