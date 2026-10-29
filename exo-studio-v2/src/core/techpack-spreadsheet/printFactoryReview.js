import {factoryRoundStatus,factoryEntryStatus} from './factoryReview.js'
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))
/** Print review is evidentiary only. A recorded approval is invalidated if its
 * source revision/POM values changed. Never imply a garment was approved. */
export function renderFactorySampleReviewPrint(review,sourceTable){
 if(!Array.isArray(review?.rounds)||!review.rounds.length)return ''
 const header=['MEASUREMENT','TARGET','ACTUAL','− TOL','+ TOL','STATUS','APPROVAL','ISSUE / NOTE']
 const rows=(review.rounds||[]).map(round=>{
  const status=factoryRoundStatus(round,sourceTable)
  const title='<h3>PHYSICAL SAMPLE '+esc(round.id)+' · '+esc(status)+' · REV. '+esc(round.sourceRevision)+'</h3>'
  const head='<thead><tr>'+header.map(label=>'<th>'+esc(label)+'</th>').join('')+'</tr></thead>'
  const body='<tbody>'+(round.entries||[]).map(entry=>{
   const approval=status!=='BLOCKED'&&entry.reviewerApproval?.approved?entry.reviewerApproval?.reviewer:'UNAPPROVED'
   const values=[entry.label,entry.target??'PENDING',entry.actual??'NOT MEASURED',entry.toleranceMinus??'UNSET',entry.tolerancePlus??'UNSET',factoryEntryStatus(entry),approval,entry.issueNote||'']
   return '<tr>'+values.map(value=>'<td>'+esc(value)+'</td>').join('')+'</tr>'
  }).join('')+'</tbody>'
  return title+'<table class="exo-sample-review-table">'+head+body+'</table>'
 }).join('')
 return '<section class="custom-spec exo-sample-review-print"><h2>PHYSICAL SAMPLE / FACTORY REVIEW · LINKED SOURCE REV. '+esc(sourceTable?.sourceRevision??'NOT RECORDED')+'</h2>'+rows+'<p>Document review is not manufacturing authorization; physical sample approval requires all current revision measurements and explicit reviewers.</p></section>'
}
