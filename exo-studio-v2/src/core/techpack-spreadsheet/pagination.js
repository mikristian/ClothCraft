/** Deterministic physical-sheet pagination. The artboard remains the source
 * of truth for box placement; excess rows are continued on separate plates.
 * Avoid splitting a row or silently truncating any factory specification. */
export const paperRowsPerSheet=(pageStyle='LetterPortrait')=>/Landscape/i.test(pageStyle)?18:27
export function paginateTechPackTable(table,{firstRowCapacity=0,pageStyle='LetterPortrait',minRows=1}={}){
  if(!table||!Array.isArray(table.rows))throw new TypeError('Editable table required')
  if(table.rows.length>10000)throw new Error('Table exceeds 10000 physical-print row cap')
  const first=Math.max(0,Math.min(table.rows.length,Math.floor(Number(firstRowCapacity)||0)))
  const subsequent=Math.max(minRows,paperRowsPerSheet(pageStyle))
  const fragments=[{kind:'first',offset:0,rows:table.rows.slice(0,first),continuation:false}]
  for(let offset=first;offset<table.rows.length;offset+=subsequent){
    fragments.push({kind:'continuation',offset,rows:table.rows.slice(offset,offset+subsequent),continuation:true})
  }
  return fragments.map((part,i)=>({...part,index:i+1,total:fragments.length,table:{...table,rows:part.rows},
    firstRowIndex:part.rows.length?part.offset+1:null,lastRowIndex:part.rows.length?part.offset+part.rows.length:null}))
}
/** Approximation for designed boxes: reserve space for frame, header, title,
 * and browser/font metrics. Auto-pagination errs conservatively rather than
 * clipping rows. Tall multiline text may still require print-preview review. */
export function boxTableRowCapacity(height=180){
  const h=Math.max(0,Number(height)||0)
  return Math.max(0,Math.min(25,Math.floor((h-95)/30)))
}
export function enumerateWorkspaceOverflowPages(workspace={},orderedPages=[],pageLayout=()=>({pageStyle:'LetterPortrait'})){
  const overflow=[]
  for(const page of orderedPages){
    const style=pageLayout(page.id)?.pageStyle||'LetterPortrait'
    for(const box of (workspace.pageBoxes?.[page.id]||[]).slice(0,24)){
      const t=box?.slot?.spreadsheetTable
      if(!Array.isArray(t?.columns)||!Array.isArray(t?.rows))continue
      const fragments=paginateTechPackTable(t,{firstRowCapacity:boxTableRowCapacity(box.height),pageStyle:style})
      for(const part of fragments.slice(1))overflow.push({sourcePageId:page.id,boxId:box.id,title:String(box.title||t.name||t.title||'Specification'),pageStyle:style,...part})
    }
  }
  return overflow
}
