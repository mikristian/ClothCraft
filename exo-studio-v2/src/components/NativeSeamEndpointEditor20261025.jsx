import React,{useMemo,useState} from 'react'
import {preflightNativeSewing20261025} from '../core/nativeSewingPreflight20261025.js'

const refFrom=ref=>({panel:ref.panel,edge:ref.edge,side:ref.side||'top',range:[...ref.range]})
const normalizedPercent=value=>Number.isFinite(value)?Math.round(value*10000)/100:0

/** Authoring editor for physical seam endpoints, never a visual-only override.
 * Parent keys this by native seam ID/revision so stale drafts never span edits. */
export default function NativeSeamEndpointEditor20261025({snapshot,seam,disabled=false,onCommit}){
 const [sides,setSides]=useState(()=>[refFrom(seam.a),refFrom(seam.b)])
 const [saving,setSaving]=useState(false)
 const panels=snapshot?.template?.panels||[]
 const edgesFor=panel=>panels.find(p=>p.id===panel)?.polygon?.edges||[]
 const update=(index,field,value)=>setSides(before=>before.map((ref,i)=>{
  if(i!==index)return ref
  if(field==='panel')return {...ref,panel:value,edge:edgesFor(value)[0]||''}
  if(field==='edge')return {...ref,edge:value}
  const range=[...ref.range]
  range[field==='start'?0:1]=Number(value)/100
  return {...ref,range}
 }))
 const draft=useMemo(()=>preflightNativeSewing20261025(
  {...snapshot,template:{...snapshot.template,seams:snapshot.template.seams.filter(row=>row.id!==seam.id)}},
  {a:sides[0],b:sides[1],reverse:seam.reverse_b,ease:seam.allow_ease,
   expectedRevision:snapshot.revision}),[snapshot,seam,sides])
 const unchanged=sides.every((ref,index)=>ref.panel===seam[['a','b'][index]].panel&&
  ref.edge===seam[['a','b'][index]].edge&&
  ref.range.every((value,j)=>value===seam[['a','b'][index]].range[j]))
 const commit=async()=>{
  if(disabled||saving||unchanged||!draft.ok)return
  setSaving(true)
  try{await onCommit({a:sides[0],b:sides[1],expectedRevision:snapshot.revision})}
  finally{setSaving(false)}
 }
 return <div data-native-seam-endpoint-editor={seam.id} style={{display:'grid',gap:7,borderTop:'1px solid #667079',paddingTop:8}}>
  <strong style={{fontSize:10,letterSpacing:'.06em'}}>SEAM ENDPOINTS · MATERIAL SPACE</strong>
  {sides.map((ref,i)=><fieldset key={i} style={{display:'grid',gap:5,padding:'6px',margin:0,minWidth:0}}>
   <legend>Boundary {i===0?'A':'B'}</legend>
   <label>Pattern
    <select aria-label={`Sewing boundary ${i===0?'A':'B'} panel`} disabled={disabled||saving}
     value={ref.panel} onChange={e=>update(i,'panel',e.target.value)}>
     {panels.map(p=><option key={p.id} value={p.id}>{p.name||p.id}</option>)}
    </select>
   </label>
   <label>Cutline
    <select aria-label={`Sewing boundary ${i===0?'A':'B'} cutline`} disabled={disabled||saving}
     value={ref.edge} onChange={e=>update(i,'edge',e.target.value)}>
     {edgesFor(ref.panel).map(edge=><option key={edge} value={edge}>{edge}</option>)}
    </select>
   </label>
   <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
    {['start','end'].map((end,j)=><label key={end}>{end==='start'?'Start %':'End %'}
     <input aria-label={`Sewing boundary ${i===0?'A':'B'} ${end} percent`} disabled={disabled||saving}
      type="number" min="0" max="100" step="0.1" value={normalizedPercent(ref.range[j])}
      onChange={e=>update(i,end,e.target.value)}/>
    </label>)}
   </div>
  </fieldset>)}
  <p role="status" data-native-seam-endpoint-preflight={draft.ok?'valid':'invalid'} style={{margin:0,fontSize:10}}>
   {draft.ok?`Stitch lengths ${draft.measuredMm.map(v=>v.toFixed(2)).join(' / ')} mm · mismatch ${draft.mismatchMm.toFixed(2)} mm`:
    `Cannot apply: ${draft.reason}`}
  </p>
  <button type="button" data-native-apply-seam-endpoints="true" disabled={disabled||saving||unchanged||!draft.ok}
   onClick={()=>void commit()}>{saving?'Saving native endpoints…':'Apply endpoints · native Undo'}</button>
  <small>Changes retain this native seam ID. Material intervals and reassignments must compile in Rust. This is not physical seam closure certification.</small>
 </div>
}
