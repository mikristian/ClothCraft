import {techPackPageTable} from '../techPackWorkspaceModel.js'
import {validateCellType} from './validation.js'

/**
 * Create typed, provenance-aware spreadsheet rows from the canonical EXO garment
 * projection. This is a READ-ONLY source adapter: no pattern/seam/garment edits.
 * Source cells remain bound, while authored cells are saved as separate overrides.
 */
const cleanId = value => String(value??'').replace(/[^a-zA-Z0-9_:.-]+/g,'-').slice(0,100)
const rawValue = value => value == null || value === '—' || value === 'Not set' || value === 'Not assigned' ? null : value
const numericColumn = (pageId,label)=>{
  const text=String(label||'').trim()
  if(['measurement-table','measurements'].includes(pageId))return /^(?:TOL\. \(cm\)|[^]+ \(cm\))$/i.test(text)
  if(pageId==='grading')return /^(?:[A-Za-z0-9-]+ \/ CM|TOLERANCE \/ CM)$/i.test(text)
  if(['patterns','pattern-cutlist'].includes(pageId))return /^(?:CUT QTY|W \(mm\)|H \(mm\)|POINTS|NOTCHES)$/i.test(text)
  if(['materials','fabrics'].includes(pageId))return /^(?:GSM|WEIGHT \(GSM\)|THICKNESS)$/i.test(text)
  return false
}
const asCell = (value, sourceRef, revision, origin='native',numberType=false) => {
  const raw=rawValue(value)
  const normalized=numberType&&raw!==null&&/^-?\d+(?:\.\d+)?$/.test(String(raw).trim())?Number(raw):raw
  return {input:normalized,value:normalized,origin,sourceRef,sourceRevision:revision??null,reviewState:origin==='native'?'source-derived':'needs-review'}
}
const keyFor = (id,index) => `col-${String(index).padStart(2,'0')}-${cleanId(id).slice(0,42)}`
const sameRow = (a,b)=>a?.id===b?.id

export function createBoundTechPackTable(pageId,source,draft={}){
  if(!source || typeof source!=='object')throw new TypeError('Garment source required')
  const existing=techPackPageTable(pageId,source,draft)
  const headers=Array.isArray(existing.headers)?existing.headers:[]
  const cols=headers.map((label,i)=>({id:keyFor(label,i),label:String(label),type:numericColumn(pageId,label)?'number':'text',width:i===0?190:110,locked:false}))
  const names=new Set()
  const rows=(existing.rows||[]).map((row,i)=>{
    const stable=cleanId(row.id||`source-row-${i}`)
    const rowId=names.has(stable)?`${stable}:${i}`:stable
    names.add(rowId)
    const ref=`${pageId}:${rowId}`
    const cells={}
    cols.forEach((column,j)=>{cells[column.id]=asCell(row.cells?.[j],ref,source.revision,'native',column.type==='number')})
    return {id:rowId,sourceRef:ref,cells}
  })
  const layoutNames={
    'measurement-table':'Finished garment POM','measurements':'Measurement & POM',
    grading:'Approved grading & increments',materials:'Materials & BOM',
    fabrics:'Fabric specifications',construction:'Seam operations',
    'construction-operations':'Construction operations',patterns:'Pattern pieces',
    'pattern-cutlist':'Cut list & pattern components',labels:'Labels & trims',
    packaging:'Packaging',notes:'Sample and revisions'
  }
  return {id:`source-${cleanId(pageId)}`,name:layoutNames[pageId]||pageId,kind:pageId,
    sourceRevision:source.revision??null,sourceKind:source.kind||'unknown',
    columns:cols,rows,styleId:'exo-seville-spec-v1',frozenHeaderRows:1,
    validation:[],provenance:{linked:true,garmentName:source.name||'',origin:'native'}}
}

/** Rows keyed by stable source ID are refreshed, but their explicitly authored
 * override survives unchanged and becomes needs-review if source changes. */
export function refreshBoundTechPackTable(previous,source,draft={}){
  const next=createBoundTechPackTable(previous.kind,source,draft)
  // Additional authored fields are part of the designer's specification, even
  // when the rest of the worksheet is refreshed from the garment revision.
  const sourceColumnIds=new Set(next.columns.map(col=>col.id))
  const authoredColumns=(previous.columns||[]).filter(col=>!sourceColumnIds.has(col.id)&&
    (col.provenance?.kind==='authored'||col.origin==='authored'||
      // The grid adapter creates columns without provenance metadata.
      !col.sourceRef&&col.provenance==null))
  next.columns=[...next.columns,...authoredColumns]
  const oldRows=new Map((previous.rows||[]).map(r=>[r.id,r]))
  next.rows=next.rows.map(row=>{
    const old=oldRows.get(row.id)
    if(!old)return row
    const cells={...row.cells}
    for(const col of next.columns){
      const before=old.cells?.[col.id]
      if(!before)continue
      if(!sourceColumnIds.has(col.id)){
        cells[col.id]=before
        continue
      }
      const now=cells[col.id]
      if(before.origin==='authored'||before.override){
        cells[col.id]={...now,...before,input:before.input,value:before.value,origin:'authored',override:true,
          sourceRef:now.sourceRef,sourceRevision:now.sourceRevision,
          provenance:{...before.provenance,kind:'override',sourceRef:now.sourceRef,
            originalValue:before.provenance?.originalValue??before.underlyingSourceValue??now.value},
          reviewState:previous.sourceRevision===source.revision?before.reviewState||'needs-review':'needs-re-review',
          underlyingSourceValue:now.value,underlyingSourceRevision:source.revision??null}
      }
    }
    return {...row,cells}
  })
  const survivingIds=new Set(next.rows.map(row=>row.id))
  const authoredRows=(previous.rows||[]).filter(row=>!survivingIds.has(row.id)&&
    !row.sourceRef&&(row.provenance?.kind==='authored'||row.provenance==null))
  next.rows.push(...authoredRows)
  // Refresh only source-linked cells; sheet formatting and layout are authored
  // by the editor and must survive a garment revision.
  for(const key of ['tableStyle','cellStyles','frozenHeaderRows']){
    if(Object.hasOwn(previous,key))next[key]=previous[key]
  }
  next.columns=next.columns.map(column=>{
    const old=(previous.columns||[]).find(item=>item.id===column.id)
    return old?{...column,width:old.width,locked:old.locked}:column
  })
  const orphanIds=(previous.rows||[]).filter(old=>!next.rows.some(now=>sameRow(old,now))).map(row=>row.id)
  return {...next,refreshWarnings:orphanIds.map(id=>`Removed source row: ${id}`)}
}

/** A spec cell override must never write to a native garment source object. */
export function authoredSpecOverride(table,rowId,columnId,input,{reason='',author=''}={}){
  const row=table.rows?.find(item=>item.id===rowId)
  const col=table.columns?.find(item=>item.id===columnId)
  if(!row||!col)throw Error('Unknown POM/BOM source link')
  const sourceCell=row.cells?.[columnId]
  if(!sourceCell)throw Error('Missing source-linked cell')
  if(!validateCellType(input,col.type))throw new TypeError(`Invalid ${col.type} value for ${col.label||columnId}`)
  const replacement={...sourceCell,input,value:input,origin:'authored',override:true,
    provenance:{...sourceCell.provenance,kind:'override',sourceRef:sourceCell.sourceRef??row.sourceRef??null,
      originalValue:sourceCell.underlyingSourceValue??sourceCell.provenance?.originalValue??sourceCell.value},
    reason:String(reason).slice(0,1000),
    author:String(author).slice(0,120),reviewState:'needs-review',underlyingSourceValue:sourceCell.underlyingSourceValue??sourceCell.value,
    underlyingSourceRevision:table.sourceRevision??null}
  return {...table,rows:table.rows.map(record=>record.id!==rowId?record:{...record,cells:{...record.cells,[columnId]:replacement}})}
}

export const TECHPACK_BOUND_TABLE_PAGE_IDS=['measurement-table','grading','materials','fabrics','construction-operations','pattern-cutlist','labels','packaging','notes']
export function createGarmentSpreadsheetTables(source,draft={}){
  return Object.fromEntries(TECHPACK_BOUND_TABLE_PAGE_IDS.map(page=>{
    const table=createBoundTechPackTable(page,source,draft)
    return [table.id,table]
  }))
}
