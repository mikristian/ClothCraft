import React,{useEffect,useState} from 'react'
import {applyModarisF7SizeEvolution20261028 as apply,MODARIS_F7_EXO_ACTIONS_20261028} from '../core/modarisF7SizeEvolution20261028.js'

const labels={
 'add-size-correspondence':'Attach size correspondence',
 'delete-size-correspondence':'Remove size correspondence',
 'add-size-to-product':'Append evolved size',
 'delete-size-from-product':'Delete non-base size',
 'add-intermediate-size':'Interpolate intermediate size',
 'break-size':'Break attached correspondence',
 'load-size-table':'Import independent size table',
 'copy-size-table':'Copy independent size table',
 'size-grouping':'Assign or clear size group',
 'size-correspondence-management':'View correspondence mappings',
 'evolution-table':'View full evolution table',
}

/** F7 edits the source-linked draft; explicit native catalog save separately
 * validates and persists schema v2. No factory approval is inferred. */
export default function ModarisF7SizeEvolution20261028({snapshot,ruleSet,onChange,onNativeCommit,disabled=false}){
 const [action,setAction]=useState('evolution-table')
 const [size,setSize]=useState('XL')
 const [name,setName]=useState('3XL')
 const [alias,setAlias]=useState('US16')
 const [group,setGroup]=useState('Extended')
 const [leftSize,setLeftSize]=useState('M')
 const [fraction,setFraction]=useState('0.5')
 const [json,setJson]=useState('')
 const [notice,setNotice]=useState('Choose an operation. Draft changes remain separate from native Rust production grading.')
 const [view,setView]=useState('evolution-table')
 const [nativeWorking,setNativeWorking]=useState(false)
 const sizes=ruleSet?.sizes||[]
 const index=sizes.indexOf(leftSize)
 const rightSize=sizes[index+1]||''
 useEffect(()=>{
  const receive=event=>{
   const id=event.detail?.action
   if(MODARIS_F7_EXO_ACTIONS_20261028.includes(id)){
    setAction(id)
    setView(id==='size-correspondence-management'?'size-correspondence-management':'evolution-table')
    setNotice(`Selected ${labels[id]}. Review fields and press Apply; changes are not automatic.`)
   }
  }
  window.addEventListener('exo-clothcraft-f7-action',receive)
  if(window.__exoPendingF7Action){const action=window.__exoPendingF7Action;window.__exoPendingF7Action=null;receive({detail:{action}})}
  return()=>window.removeEventListener('exo-clothcraft-f7-action',receive)
 },[])
 useEffect(()=>{
  if(!sizes.includes(size))setSize(sizes.find(item=>item!==ruleSet?.baseSize)||sizes[0]||'')
  if(!sizes.includes(leftSize)||sizes.indexOf(leftSize)===sizes.length-1)setLeftSize(sizes.at(-2)||'')
 },[sizes.join('|'),ruleSet?.baseSize])
 const run=()=>{
  if(!ruleSet){setNotice('Create point grading rules in the Grade Points tab first.');return}
  let table
  if(action==='load-size-table'){
   try{table=JSON.parse(json)}catch{setNotice('Import rejected: enter valid EXO size-table JSON.');return}
  }
  const result=apply(snapshot,ruleSet,{action,size,name,alias,group,
   leftSize,rightSize,fraction:Number(fraction),table})
  if(!result.ok){setNotice('Rejected: '+result.reason);return}
  if(result.ruleSet&&onChange?.(result.ruleSet)!==true){setNotice('Draft storage did not acknowledge this change; operation not confirmed.');return}
  if(result.table){
   const value=JSON.stringify(result.table,null,2)
   setJson(value)
   if(navigator.clipboard?.writeText)void navigator.clipboard.writeText(value).catch(()=>{})
  }
  if(action==='size-correspondence-management')setView(action)
  else if(action==='evolution-table')setView(action)
  setNotice(result.notice||'Validated authoring operation completed.')
 }
 const commitCanonical=async()=>{
  if(typeof onNativeCommit!=='function'||nativeWorking||disabled)return
  setNativeWorking(true)
  setNotice('Checking exact native source, all graded geometry and durable Rust revision…')
  try{
   const result=await onNativeCommit()
   setNotice(result?.ok?
    `Rust committed ${result.sizes.length} canonical graded sizes at revision ${result.revision}; Undo and durable geometry were verified. Factory release remains blocked.`:
    (result?.needsNativeRecovery?'Native outcome requires Undo/history inspection before retry: ':'Native preflight rejected: ')+(result?.reason||'No confirmed native receipt'))
  }catch(error){setNotice('Native outcome requires history inspection: '+String(error?.message||error))}
  finally{setNativeWorking(false)}
 }
 const field={display:'grid',gap:4,fontSize:12}
 const control={width:'100%',minWidth:0,padding:'7px 8px',borderRadius:5,border:'1px solid var(--exo-border,#8d98a6)',background:'var(--exo-panel,#222831)',color:'inherit'}
 return <section aria-label="F7 advanced size management" data-exo-f7-size-management="true" style={{display:'grid',gap:12,padding:10}}>
  <strong>F7 · Advanced size evolution</strong>
  <p style={{margin:0,fontSize:12}}>Independent source-linked grading drafts support 2–24 named sizes. Use Save grading catalog to Rust after editing; native save and manufacturing release require separate verification.</p>
  <label style={field}>F7 operation
   <select style={control} value={action} onChange={event=>setAction(event.target.value)}>
    {MODARIS_F7_EXO_ACTIONS_20261028.map(id=><option key={id} value={id}>{labels[id]}</option>)}
   </select>
  </label>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(135px,1fr))',gap:9}}>
   <label style={field}>Existing size
    <select style={control} value={sizes.includes(size)?size:(sizes[0]||'')} onChange={event=>setSize(event.target.value)}>
     {sizes.map(s=><option key={s}>{s}</option>)}
    </select>
   </label>
   {['add-size-to-product','add-intermediate-size'].includes(action)&&<label style={field}>New size name
    <input style={control} value={name} onChange={event=>setName(event.target.value)} maxLength={24}/>
   </label>}
   {action==='add-intermediate-size'&&<>
    <label style={field}>Lower bound
     <select style={control} value={sizes.includes(leftSize)?leftSize:(sizes[0]||'')} onChange={event=>setLeftSize(event.target.value)}>
      {sizes.slice(0,-1).map(s=><option key={s}>{s}</option>)}
     </select>
    </label>
    <label style={field}>Upper bound
     <input style={control} readOnly value={rightSize}/>
    </label>
    <label style={field}>Interpolation fraction (0–1)
     <input style={control} type="number" min="0.01" max="0.99" step="0.05" value={fraction} onChange={event=>setFraction(event.target.value)}/>
    </label>
   </>}
   {['add-size-correspondence','delete-size-correspondence'].includes(action)&&<label style={field}>Correspondence alias
    <input style={control} value={alias} onChange={event=>setAlias(event.target.value)}/>
   </label>}
   {action==='size-grouping'&&<label style={field}>Group name (empty clears)
    <input style={control} value={group} onChange={event=>setGroup(event.target.value)}/>
   </label>}
  </div>
  {['load-size-table','copy-size-table'].includes(action)&&<label style={field}>Independent size table JSON
   <textarea style={{...control,minHeight:100,fontFamily:'monospace'}} value={json}
    onChange={event=>setJson(event.target.value)} placeholder="Use Copy size table to create an exact source-linked JSON archive."/>
  </label>}
  <button type="button" disabled={disabled||!ruleSet} onClick={run} style={{...control,cursor:'pointer',fontWeight:650}}>
   {['size-correspondence-management','evolution-table'].includes(action)?'Inspect table':'Apply validated F7 operation'}
  </button>
  {snapshot?.gradeRunPersisted===true&&ruleSet?.sizes?.length>=4&&<button type="button"
   data-native-f7-canonical-commit="true" disabled={disabled||nativeWorking||Boolean(snapshot?.activeGradedSize)||typeof onNativeCommit!=='function'}
   onClick={commitCanonical} style={{...control,cursor:'pointer',fontWeight:650}}>
   {nativeWorking?'Verifying native size transaction…':'Commit canonical F7 sizes to Rust (verified)'}
  </button>}
  <small role="status">{notice}</small>
  <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
   <button type="button" style={control} onClick={()=>setView('evolution-table')} aria-pressed={view==='evolution-table'}>Evolution table</button>
   <button type="button" style={control} onClick={()=>setView('size-correspondence-management')} aria-pressed={view==='size-correspondence-management'}>Correspondence table</button>
  </div>
  <div style={{overflowX:'auto'}}>
   {view==='evolution-table'?<table style={{width:'100%',fontSize:11,borderCollapse:'collapse'}} aria-label="Size evolution table">
    <thead><tr><th style={{textAlign:'left'}}>Size</th><th style={{textAlign:'left'}}>First point growth X/Y (mm)</th><th style={{textAlign:'left'}}>Group</th><th style={{textAlign:'left'}}>Correspondences</th></tr></thead>
    <tbody>{sizes.map(sz=><tr key={sz}>
     <td>{sz}{sz===ruleSet?.baseSize?' (base)':''}</td>
     <td>{Object.entries(ruleSet?.panels||{}).map(([panel,p])=>`${panel}: ${p.pointOffsetsMm?.[sz]?.[0]?.map(v=>Number(v).toFixed(2)).join(' / ')||'—'}`).join(' · ')}</td>
     <td>{ruleSet?.sizeEvolution?.groups?.[sz]||'—'}</td>
     <td>{Object.entries(ruleSet?.sizeEvolution?.correspondences||{}).filter(([,target])=>target===sz).map(([key])=>key).join(', ')||'—'}</td>
    </tr>)}</tbody>
   </table>:<table style={{width:'100%',fontSize:11,borderCollapse:'collapse'}} aria-label="Size correspondence management table">
    <thead><tr><th style={{textAlign:'left'}}>Alias</th><th style={{textAlign:'left'}}>Mapped size</th><th style={{textAlign:'left'}}>Group</th></tr></thead>
    <tbody>{Object.entries(ruleSet?.sizeEvolution?.correspondences||{}).map(([key,target])=><tr key={key}>
     <td>{key}</td><td>{target}</td><td>{ruleSet?.sizeEvolution?.groups?.[target]||'—'}</td>
    </tr>)}</tbody>
   </table>}
  </div>
  <small>Draft changes are not native commits. Save the catalog separately and verify native persistence; no industrial cut approval or vendor certification is implied.</small>
 </section>
}
