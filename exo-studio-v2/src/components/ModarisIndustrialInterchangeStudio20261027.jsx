import React,{useMemo,useState} from 'react'

/** Source-linked industrial/3D/interchange cockpit. All operations remain gated by native callbacks. */
export default function ModarisIndustrialInterchangeStudio20261027({
  snapshot,disabled=false,onAuditPattern,onGenerateCutlines,onOpenGrading,
  onOpenVariant,onOpenSewing,onOpen3D,onDownloadProject,onDownloadPattern,
  onDownloadDrape,onAuditSixSizes,onAuditSewing,
}) {
  const [note,setNote]=useState('')
  const panels=snapshot?.template?.panels||[]
  const seams=snapshot?.template?.seams||[]
  const revision=snapshot?.revision
  const validRevision=Number.isSafeInteger(revision)&&revision>=0
  const gradeSaved=Boolean(snapshot?.gradeRunPersisted||snapshot?.gradeRun?.persisted)
  const variantSaved=Boolean(snapshot?.pieceVariant?.persisted)
  const variantReady=snapshot?.pieceVariant?.review?.readyFor3D===true
  const active3D=Boolean(snapshot?.variantAssemblyActive)
  const issues=useMemo(()=>{
    const rows=[]
    if(!validRevision) rows.push('Native source revision is unavailable')
    if(!panels.length) rows.push('No authored pattern pieces are loaded')
    if(!seams.length) rows.push('No authored sewing relationships are present')
    if(!gradeSaved) rows.push('No persisted native size catalog is available')
    if(variantSaved&&!variantReady) rows.push('Saved article variant requires additional 3D review')
    if(active3D) rows.push('Restore the base garment before authoring or manufacturing review')
    return rows
  },[validRevision,panels.length,seams.length,gradeSaved,variantSaved,variantReady,active3D])
  const busy=disabled||!validRevision||!panels.length
  const run=async(fn)=>{
    if(typeof fn!=='function'||busy)return
    setNote('')
    try{await fn();setNote('Native operation completed. Review its own revision-matched proof before further use.')}
    catch(error){setNote(error?.message||String(error))}
  }
  const tools=[
    {title:'Industrial drafting',description:'Pattern QA, CUT/STITCH geometry, allowances and notches',actions:[
      ['Run native pattern QA',onAuditPattern],['Generate engineering CUT proofs',onGenerateCutlines],
      ['Open grade and industrialization editor',onOpenGrading],
    ]},
    {title:'Sewing & assembly',description:'Review seam pairs, graded lengths and size-specific alignment',actions:[
      ['Open sewing editor',onOpenSewing],['Audit six-size sewing balance',gradeSaved?onAuditSewing:null],
      ['Audit six-size industrial geometry',gradeSaved?onAuditSixSizes:null],
    ]},
    {title:'3D article',description:'Source-linked selection, physical instances and fitting review',actions:[
      ['Review article variant',onOpenVariant],['Open 3D fit workspace',onOpen3D],
    ]},
    {title:'Interchange & evidence',description:'Export current native evidence and review independent acceptance',actions:[
      ['Save editable native project',onDownloadProject],['Export reference pattern SVG',onDownloadPattern],
      ['Export current drape OBJ',onDownloadDrape],
    ]},
  ]
  return <section aria-label="EXO Modaris industrial assembly and interchange studio" data-modaris-six-stage-studio="true" style={{display:'grid',gap:12}}>
    <header><h3>Industrial engineering & 2D / 3D exchange</h3><p>Authoritative native source revision: {validRevision?revision:'unavailable'} · {panels.length} patterns · {seams.length} seams. These tools initiate existing EXO operations and do not approve factory manufacture.</p></header>
    <div role="status">Graded size catalog: {gradeSaved?'saved':'not saved'} · Article variant: {variantSaved?'saved':'not saved'} · Physical 3D variant: {active3D?'active':'inactive'}</div>
    {issues.length>0&&<div><strong>Readiness requirements</strong><ul>{issues.map(issue=><li key={issue}>{issue}</li>)}</ul></div>}
    {tools.map(group=><fieldset key={group.title} style={{display:'grid',gap:6}}><legend>{group.title}</legend><p>{group.description}</p>
      {group.actions.map(([label,fn])=><button type="button" key={label} disabled={busy||typeof fn!=='function'} onClick={()=>run(fn)} title={typeof fn!=='function'?'Native operation is unavailable or prerequisites are missing':label}>{label}</button>)}
    </fieldset>)}
    <fieldset><legend>External format acceptance</legend>
      <p>Native editable project JSON: supported by existing EXO project save. Engineering SVG, generic DXF and drape OBJ are research outputs with format-specific limits. Independent licensed Lectra Modaris import/export and physical cutter acceptance require external signed witness evidence.</p>
      <p role="status">Modaris interchange certified: no · Factory cutter validated: no · Manufacturer release: blocked</p>
    </fieldset>
    {note&&<p role="status">{note}</p>}
  </section>
}
