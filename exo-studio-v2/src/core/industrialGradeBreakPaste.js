import {INDUSTRIAL_GRADE_MODES,convertIndustrialGradeRule,validateIndustrialGradeRule} from './industrialGradeRules.js'

const decimal=/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?$/

/** Spreadsheet-friendly, atomic edit of every independent X/Y size break.
 * Accepts either two numeric columns or From / To / X cm / Y cm columns.
 * Never infers a break, changes the base size, or mutates the original rule.
 */
export function parseIndustrialGradeBreakPaste(source,currentRule){
  const current=validateIndustrialGradeRule(currentRule)
  if(typeof source!=='string'||!source.trim()||source.length>16384)throw Error('Paste a size-break table under 16 KB')
  const rows=source.replace(/^\uFEFF/,'').trim().split(/\r\n|\r|\n/).map(line=>
    (line.includes('\t')?line.split('\t'):line.split(',')).map(cell=>cell.trim()))
  const header=rows[0].map(cell=>cell.toLowerCase().replace(/\s+/g,''))
  if(header.join('|')==='from|to|xcm|ycm'||header.join('|')==='sizefrom|sizeto|dxcm|dycm')rows.shift()
  const count=current.sizes.length-1
  if(rows.length!==count)throw Error(`Expected ${count} adjacent size breaks for ${current.sizes.join(' → ')}; received ${rows.length}`)
  const steps=rows.map((cells,index)=>{
    if(cells.length!==2&&cells.length!==4)throw Error(`Row ${index+1}: use X/Y values or From, To, X, Y columns`)
    if(cells.length===4&&(cells[0]!==current.sizes[index]||cells[1]!==current.sizes[index+1]))
      throw Error(`Row ${index+1}: expected ${current.sizes[index]} → ${current.sizes[index+1]} (size order changed)`)
    const [x,y]=cells.slice(-2)
    if(!decimal.test(x)||!decimal.test(y)||!Number.isFinite(Number(x))||!Number.isFinite(Number(y)))
      throw Error(`Row ${index+1}: X and Y must be finite numbers in centimetres`)
    if(Math.abs(Number(x))>12||Math.abs(Number(y))>12)
      throw Error(`Row ${index+1}: individual X/Y breaks must be within ±12 cm`)
    return {dx:Number(x),dy:Number(y)}
  })
  const incremental={mode:INDUSTRIAL_GRADE_MODES.SMALL_LARGE_INCREMENTAL,
    sizes:[...current.sizes],baseSize:current.baseSize,steps}
  const converted=convertIndustrialGradeRule(incremental,current.mode)
  return {rule:validateIndustrialGradeRule(converted),count}
}

export function formatIndustrialGradeBreakPaste(rule){
  const current=convertIndustrialGradeRule(rule,INDUSTRIAL_GRADE_MODES.SMALL_LARGE_INCREMENTAL)
  return ['From\tTo\tX cm\tY cm',...current.steps.map((step,index)=>
    [current.sizes[index],current.sizes[index+1],step.dx,step.dy].join('\t'))].join('\n')
}
