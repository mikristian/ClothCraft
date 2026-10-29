const text = value => String(value ?? '').trim()
const number = value => value === '' || value == null ? null : Number.isFinite(Number(value)) ? Number(value) : null
const revision = table => text(table?.sourceRevision) || null

export function createFactoryReview(sourceTable) {
  return {version:1,sourceTableId:text(sourceTable?.id),rounds:[]}
}

export function getFactoryPOMRows(sourceTable) {
  const columns=sourceTable?.columns||[]
  const targetColumns=columns.filter(col=>col.type==='number' && !/tol(?:erance)?/i.test(col.label))
  const toleranceColumn=columns.find(col=>/tol(?:erance)?/i.test(col.label))
  return (sourceTable?.rows||[]).flatMap(row=>targetColumns.map(col=>{
    const target=number(row.cells?.[col.id]?.value)
    const tolerance=number(row.cells?.[toleranceColumn?.id]?.value)
    return {id:`${row.id}:${col.id}`,rowId:row.id,columnId:col.id,label:`${text(row.cells?.[columns[0]?.id]?.value)||row.id} / ${col.label}`,target,
      toleranceMinus:tolerance == null ? null : Math.abs(tolerance),tolerancePlus:tolerance == null ? null : Math.abs(tolerance),sourceRef:row.sourceRef||null}
  }))
}

export function startFactorySampleRound(review,sourceTable,{id,reviewer='',notes=''}={}) {
  if(!sourceTable?.id || !revision(sourceTable))throw Error('Source table and revision are required')
  if(review?.sourceTableId && review.sourceTableId!==sourceTable.id)throw Error('Review belongs to another source table')
  const rounds=review?.rounds||[]
  const roundId=text(id)||`sample-${rounds.length+1}`
  if(rounds.some(round=>round.id===roundId))throw Error('Duplicate sample round')
  const entries=getFactoryPOMRows(sourceTable).map(row=>({...row,actual:null,issueNote:'',reviewerApproval:null}))
  return {...(review||createFactoryReview(sourceTable)),sourceTableId:sourceTable.id,rounds:[...rounds,{id:roundId,sourceRevision:revision(sourceTable),reviewer:text(reviewer),notes:text(notes),entries}]}
}

export function updateFactorySampleEntry(review,roundId,entryId,changes) {
  const allowed=['actual','toleranceMinus','tolerancePlus','issueNote']
  return {...review,rounds:(review.rounds||[]).map(round=>round.id!==roundId?round:{...round,entries:round.entries.map(entry=>{
    if(entry.id!==entryId)return entry
    const next={...entry}
    for(const key of allowed)if(Object.hasOwn(changes,key))next[key]=key==='issueNote'?text(changes[key]):number(changes[key])
    next.reviewerApproval=null
    return next
  })})}
}

export function factoryEntryStatus(entry) {
  if(entry.target==null || entry.actual==null || entry.toleranceMinus==null || entry.tolerancePlus==null || entry.toleranceMinus<0 || entry.tolerancePlus<0)return 'PENDING'
  return entry.actual>=entry.target-entry.toleranceMinus-1e-9 && entry.actual<=entry.target+entry.tolerancePlus+1e-9?'PASS':'FAIL'
}

export function factoryRoundStatus(round,sourceTable) {
  if(!round || round.sourceRevision!==revision(sourceTable) || !round.entries?.length)return 'BLOCKED'
  const sourceRows=getFactoryPOMRows(sourceTable)
  if(sourceRows.length!==round.entries.length || sourceRows.some(row=>{
    const entry=round.entries.find(item=>item.id===row.id)
    return !entry || entry.target!==row.target || entry.sourceRef!==row.sourceRef
  }))return 'BLOCKED'
  if(round.entries.some(entry=>factoryEntryStatus(entry)!=='PASS'))return 'BLOCKED'
  return round.entries.every(entry=>entry.reviewerApproval?.approved===true && text(entry.reviewerApproval.reviewer))?'APPROVED':'PENDING_APPROVAL'
}

export function approveFactorySampleEntry(review,roundId,entryId,sourceTable,reviewer) {
  if(!text(reviewer))throw Error('Reviewer identity required')
  const round=review?.rounds?.find(item=>item.id===roundId)
  if(!round || round.sourceRevision!==revision(sourceTable))throw Error('Source revision mismatch')
  const sourceRows=getFactoryPOMRows(sourceTable)
  const entry=round.entries.find(item=>item.id===entryId)
  const current=sourceRows.find(item=>item.id===entryId)
  if(!entry || !current || current.target!==entry.target || current.sourceRef!==entry.sourceRef || factoryEntryStatus(entry)!=='PASS')throw Error('Sample entry is missing, mismatched or outside tolerance')
  return {...review,rounds:review.rounds.map(item=>item.id!==roundId?item:{...item,entries:item.entries.map(cell=>cell.id!==entryId?cell:{...cell,reviewerApproval:{approved:true,reviewer:text(reviewer),sourceRevision:round.sourceRevision}})})}
}

export function compareFactorySampleRounds(review,firstId,secondId) {
  const first=review?.rounds?.find(round=>round.id===firstId)
  const second=review?.rounds?.find(round=>round.id===secondId)
  if(!first||!second)throw Error('Both rounds required')
  return {fromRevision:first.sourceRevision,toRevision:second.sourceRevision,entries:second.entries.map(entry=>{
    const previous=first.entries.find(item=>item.id===entry.id)
    return {id:entry.id,previousActual:previous?.actual??null,actual:entry.actual,delta:previous?.actual==null||entry.actual==null?null:entry.actual-previous.actual,previousStatus:previous?factoryEntryStatus(previous):'MISSING',status:factoryEntryStatus(entry),targetChanged:previous?.target!==entry.target}
  })}
}
