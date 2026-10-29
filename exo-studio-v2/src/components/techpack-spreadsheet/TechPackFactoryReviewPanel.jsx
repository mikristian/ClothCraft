import React, {useState} from 'react'
import {createFactoryReview,startFactorySampleRound,updateFactorySampleEntry,approveFactorySampleEntry,factoryEntryStatus,factoryRoundStatus,compareFactorySampleRounds} from '../../core/techpack-spreadsheet/factoryReview.js'
import './TechPackFactoryReviewPanel.css'

export default function TechPackFactoryReviewPanel({sourceTable,review,onChange}) {
  const [reviewer,setReviewer]=useState('')
  const [selected,setSelected]=useState('')
  const current=review||createFactoryReview(sourceTable)
  const round=current.rounds.find(item=>item.id===selected)||current.rounds.at(-1)
  const emit=next=>onChange?.(next)
  const compare=current.rounds.length>1&&round?compareFactorySampleRounds(current,current.rounds[current.rounds.length-2].id,round.id):null
  return <section className="factory-review-panel" aria-label="Factory sample review">
    <header><strong>Factory sample review</strong><span>Source revision: {String(sourceTable?.sourceRevision??'missing')}</span></header>
    <div className="factory-review-actions"><label>Reviewer <input value={reviewer} onChange={event=>setReviewer(event.target.value)} placeholder="Reviewer name" /></label><button type="button" onClick={()=>{const next=startFactorySampleRound(current,sourceTable);emit(next);setSelected(next.rounds.at(-1).id)}} disabled={!sourceTable?.sourceRevision}>New sample round</button>
      <label>Round <select value={round?.id||''} onChange={event=>setSelected(event.target.value)}><option value="">Latest round</option>{current.rounds.map(item=><option key={item.id} value={item.id}>{item.id} (rev {item.sourceRevision})</option>)}</select></label></div>
    {round?<><p>Round status: <strong>{factoryRoundStatus(round,sourceTable)}</strong>{round.sourceRevision!==String(sourceTable?.sourceRevision??'')?' — source revision changed; create a new round.':''}</p>
      <div className="factory-review-scroll"><table><thead><tr><th>Measurement</th><th>Target</th><th>Actual</th><th>Minus tolerance</th><th>Plus tolerance</th><th>Status</th><th>Issue note</th><th>Review</th></tr></thead><tbody>{round.entries.map(entry=><tr key={entry.id}><td>{entry.label}</td><td>{entry.target??'Missing'}</td>{['actual','toleranceMinus','tolerancePlus'].map(key=><td key={key}><input aria-label={`${entry.label} ${key}`} type="number" step="any" value={entry[key]??''} onChange={event=>emit(updateFactorySampleEntry(current,round.id,entry.id,{[key]:event.target.value}))}/></td>)}<td>{factoryEntryStatus(entry)}</td><td><input aria-label={`${entry.label} issue note`} value={entry.issueNote} onChange={event=>emit(updateFactorySampleEntry(current,round.id,entry.id,{issueNote:event.target.value}))}/></td><td>{entry.reviewerApproval?.approved?`Approved by ${entry.reviewerApproval.reviewer}`:<button type="button" disabled={!reviewer.trim()||factoryEntryStatus(entry)!=='PASS'||round.sourceRevision!==String(sourceTable?.sourceRevision??'')} onClick={()=>{try{emit(approveFactorySampleEntry(current,round.id,entry.id,sourceTable,reviewer))}catch(error){window.alert(error.message)}}}>Approve</button>}</td></tr>)}</tbody></table></div>
      {compare&&<p>Compared with previous round (revision {compare.fromRevision}): {compare.entries.filter(item=>item.delta!==null).length} comparable actual measurements; {compare.entries.filter(item=>item.targetChanged).length} changed targets.</p>}</>:<p>Create a sample round to enter factory measurements. Approvals require passing measurements and an identified reviewer.</p>}
  </section>
}
