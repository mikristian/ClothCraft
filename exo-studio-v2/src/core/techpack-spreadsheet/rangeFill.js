// Spreadsheet fill operations change only authored cell input strings.
// A1 references shift by the destination offset; $A$1 anchors stay fixed.
const columnIndex=letters=>[...letters.toUpperCase()].reduce((n,ch)=>n*26+ch.charCodeAt(0)-64,0)-1
const columnLabel=index=>{let out='';for(let n=index+1;n>0;n=Math.floor((n-1)/26))out=String.fromCharCode(65+(n-1)%26)+out;return out}

export function shiftFormulaReferences(value,rowDelta,columnDelta){
  if(typeof value!=='string'||!value.startsWith('='))return value
  // Preserve spreadsheet quoted strings, including Excel's doubled quote escape.
  // A cell-looking token inside a literal must never be rewritten as a reference.
  const reference=/(^|[^A-Za-z0-9_.])([$]?)([A-Za-z]{1,3})([$]?)([1-9][0-9]*)(?![A-Za-z0-9_])/g
  const shift=segment=>segment.replace(reference,(match,prefix,fixedColumn,column,fixedRow,row)=>{
    const nextColumn=columnIndex(column)+(fixedColumn?0:columnDelta)
    const nextRow=Number(row)+(fixedRow?0:rowDelta)
    if(nextColumn<0||nextRow<1||nextColumn>16383||!Number.isSafeInteger(nextRow))return `${prefix}#REF!`
    return `${prefix}${fixedColumn}${columnLabel(nextColumn)}${fixedRow}${nextRow}`
  })
  let output='',start=0,quoted=false
  for(let i=0;i<value.length;i++){
    if(value[i]!=='"')continue
    if(quoted&&value[i+1]==='"'){i++;continue}
    if(!quoted){output+=shift(value.slice(start,i));start=i;quoted=true}
    else{output+=value.slice(start,i+1);start=i+1;quoted=false}
  }
  return output+(quoted?value.slice(start):shift(value.slice(start)))
}

export function fillGridRange(grid,range,direction){
  const {r,r2,c,c2}=range
  if(!['down','right'].includes(direction))throw new RangeError('Unknown fill direction')
  if(r<0||c<0||r2>=grid.rows.length||c2>=grid.headers.length||r>r2||c>c2)return grid
  const rows=grid.rows.map(row=>({...row,cells:[...row.cells]}))
  for(let row=r;row<=r2;row++)for(let column=c;column<=c2;column++){
    const sourceRow=direction==='down'?r:row
    const sourceColumn=direction==='right'?c:column
    if(sourceRow===row&&sourceColumn===column)continue
    rows[row].cells[column]=shiftFormulaReferences(String(grid.rows[sourceRow].cells[sourceColumn]??''),row-sourceRow,column-sourceColumn)
  }
  return {...grid,rows}
}
