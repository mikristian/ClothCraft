import React,{useEffect,useMemo,useRef,useState} from 'react'
import {createNativeGradingPOM20261025,previewNativeGradingPOM20261025,inspectNativeGradingPOM20261025,reviseNativeGradingPOMAnchors20261025,exportNativeGradingPOMSpecsCSV20261025,importNativeGradingPOMSpecsCSV20261025,proposeNativeGradingPOMTargetRun20261025} from '../core/nativeGradingPOM20261025.js'
import {exportNativeGradeNamedSizePomCsv20261028,importNativeGradeNamedSizePomCsv20261028} from '../core/nativeGradeNamedSizePomCsv20261028.js'

const format=n=>typeof n==='number'&&Number.isFinite(n)?n.toFixed(2):'—'
const SIZES=['XS','S','M','L','XL','XXL']
function POMNumericTarget({value,onCommit,disabled,size}){
  const [draft,setDraft]=useState(value==null?'':String(value))
  const [editing,setEditing]=useState(false)
  const cancelled=useRef(false)
  const latest=useRef(value)
  useEffect(()=>{latest.current=value},[value])
  useEffect(()=>{if(!editing)setDraft(value==null?'':String(value))},[value,editing])
  const commit=()=>{
    setEditing(false)
    if(cancelled.current){cancelled.current=false;return}
    // The parent may have applied a new target while this field had focus.
    // A stale draft must never silently overwrite that newer specification.
    if(latest.current!==valueAtFocus.current){setDraft(value==null?'':String(value));return}
    const raw=draft.trim()
    if(raw===''){onCommit(null);setDraft('');return}
    const numeric=Number(raw)
    if(!Number.isFinite(numeric)||numeric<=0||numeric>10000){
      setDraft(value==null?'':String(value))
      return
    }
    if(numeric!==value)onCommit(numeric)
    setDraft(String(numeric))
  }
  const valueAtFocus=useRef(value)
  return <input type="number" aria-label={`POM target ${size} millimetres`}
    min={.01} max={10000} step="any" disabled={disabled}
    value={draft} placeholder="Unset"
    onFocus={()=>{cancelled.current=false;valueAtFocus.current=value;setEditing(true)}} onChange={event=>setDraft(event.target.value)}
    onBlur={commit} onKeyDown={event=>{
      if(event.key==='Enter'){event.currentTarget.blur()}
      if(event.key==='Escape'){
        // Escape cancels this in-progress numeric edit. Do not bubble into
        // the global grading-dialog Escape handler and close the whole tool.
        event.preventDefault()
        event.stopPropagation()
        cancelled.current=true
        setDraft(value==null?'':String(value))
        event.currentTarget.blur()
      }
    }}/>
}
export default function NativeGradingPOMEditor20261025({
  snapshot,ruleSet,definitions=[],onChange,disabled=false,selectedPanel,
  selectedId,onSelect,selectedSize,onSelectSize,onCommitNative,
}){
  const [panel,setPanel]=useState('')
  const [kind,setKind]=useState('anchor-distance')
  const [from,setFrom]=useState('0'),[to,setTo]=useState('1'),[edge,setEdge]=useState('')
  const [label,setLabel]=useState('')
  const [notice,setNotice]=useState('')
  const [active,setActive]=useState('')
  const [localSize,setLocalSize]=useState('M')
  const [targetBase,setTargetBase]=useState(''),[targetStep,setTargetStep]=useState('')
  const [toleranceDraft,setToleranceDraft]=useState(null)
  const toleranceCancelled=useRef(false)
  const toleranceAtFocus=useRef(null)
  const [confirmMeasured,setConfirmMeasured]=useState(false)
  const [confirmNativePOM,setConfirmNativePOM]=useState(null)
  const [nativePOMBusy,setNativePOMBusy]=useState(false)
  const [nativePOMRecoveryRequired,setNativePOMRecoveryRequired]=useState(false)
  // A Rust CAS can be in flight while its receipt and durable numerical
  // witness are pending. Keep all draft edits frozen, not just Confirm.
  const nativePOMBusyRef=useRef(false)
  const editorDisabled=disabled||nativePOMBusy||nativePOMRecoveryRequired
  // An unknown post-dispatch outcome is not a rollback. Do not permit a
  // second edit or blind retry against that revision. Reopen/recover a fresh
  // authoritative native snapshot before continuing.
  useEffect(()=>setNativePOMRecoveryRequired(false),[snapshot?.revision])
  const importRef=useRef(null)
  const sourceRef=useRef({snapshot,ruleSet,definitions})
  sourceRef.current={snapshot,ruleSet,definitions}
  const panels=snapshot?.template?.panels||[]
  const sizes=Array.isArray(ruleSet?.sizes)?ruleSet.sizes:SIZES
  const namedSizes=JSON.stringify(sizes)!==JSON.stringify(SIZES)
  const panelId=panels.some(p=>p.id===panel)?panel:
    panels.some(p=>p.id===selectedPanel)?selectedPanel:panels[0]?.id||''
  const chosen=panels.find(p=>p.id===panelId)
  const edges=chosen?.polygon?.edges||[]
  const preview=useMemo(()=>{
    const options={panelId,kind,fromPoint:Number(from),toPoint:Number(to),edge:edge||edges[0]}
    if(!namedSizes)return previewNativeGradingPOM20261025(snapshot,ruleSet,options)
    const created=createNativeGradingPOM20261025(snapshot,ruleSet,options)
    if(!created.ok)return created
    const definition={...created.definition,targetsMm:Object.fromEntries(sizes.map(size=>[size,null]))}
    const inspected=inspectNativeGradingPOM20261025(snapshot,ruleSet,[definition],{allowNamedSizes:true})
    return inspected.reason?{ok:false,reason:inspected.reason}:{ok:true,rows:inspected.rows}
  },[snapshot,ruleSet,panelId,kind,from,to,edge,namedSizes])
  const report=useMemo(()=>inspectNativeGradingPOM20261025(snapshot,ruleSet,definitions,{allowNamedSizes:namedSizes}),
    [snapshot?.revision,snapshot?.template,ruleSet,definitions])
  // Confirmation binds the exact authored POM targets, rule set, geometry and
  // native revision. A draft edited while confirmation is open cannot commit.
  const nativePOMIdentity=JSON.stringify({revision:snapshot?.revision,
    template:snapshot?.template,ruleSet,definitions})
  const nativePOMReady=Boolean(namedSizes&&typeof onCommitNative==='function'&&
    snapshot?.gradeRunPersisted===true&&!snapshot?.activeGradedSize&&
    !report.reason&&definitions.length>0&&
    report.rows.length===definitions.length*sizes.length&&
    report.rows.every(row=>row.targetMm!==null))
  const commitNativePOM=async()=>{
    if(editorDisabled||nativePOMBusyRef.current||!nativePOMReady||confirmNativePOM!==nativePOMIdentity){
      setConfirmNativePOM(null)
      setNotice('Native POM confirmation is stale or incomplete. Review the current graded specification.')
      return
    }
    nativePOMBusyRef.current=true
    setNativePOMBusy(true)
    setConfirmNativePOM(null)
    try{
      const result=await onCommitNative({expectedRevision:snapshot.revision,definitions})
      if(result?.ok&&result?.nativeCommitted===true){
        setNotice(`Rust revision ${result.revision} durably saved ${definitions.length} POM station(s). Factory release remains unapproved.`)
      }else{
        if(result?.needsNativeRecovery)setNativePOMRecoveryRequired(true)
        setNotice(result?.needsNativeRecovery?
          'Rust may have committed; inspect native history and recover before retrying.':
          `Native POM commit rejected: ${result?.reason||'no durable native witness'}`)
      }
    }catch(error){
      setNativePOMRecoveryRequired(true)
      setNotice('Native POM commit outcome is unknown. Inspect native history: '+String(error?.message||error))
    }finally{nativePOMBusyRef.current=false;setNativePOMBusy(false)}
  }
  // A parent can own the selected specification for synchronized board overlays.
  // When uncontrolled, preserve the editor's local selection behavior.
  const controlled=selectedId!==undefined
  const current=definitions.find(d=>d.id===(controlled?selectedId:active))||definitions[0]
  const currentId=current?.id||''
  useEffect(()=>{
    setTargetBase('');setTargetStep('');setToleranceDraft(null);toleranceCancelled.current=false;setConfirmMeasured(false)
  },[currentId])
  const sizeControlled=selectedSize!==undefined
  const displaySize=sizes.includes(sizeControlled?selectedSize:localSize)?
    (sizeControlled?selectedSize:localSize):ruleSet?.baseSize||'M'
  const selectSize=size=>{
    if(nativePOMBusyRef.current||!sizes.includes(size))return
    if(!sizeControlled)setLocalSize(size)
    onSelectSize?.(size)
  }
  const select=id=>{
    if(nativePOMBusyRef.current)return
    if(!controlled)setActive(id)
    onSelect?.(id)
  }
  const toleranceValue=toleranceDraft===null?String(current?.toleranceMm??''):toleranceDraft
  const commitTolerance=()=>{
    if(!current||editorDisabled||nativePOMBusyRef.current)return
    if(toleranceCancelled.current){toleranceCancelled.current=false;setToleranceDraft(null);return}
    if(toleranceAtFocus.current!==null&&current.toleranceMm!==toleranceAtFocus.current){
      setToleranceDraft(null)
      setNotice('Tolerance changed while editing. Your older draft was discarded; review the current tolerance.')
      return
    }
    const raw=toleranceValue.trim(),number=Number(raw)
    if(raw!==''&&Number.isFinite(number)&&number>=0&&number<=50&&number!==current.toleranceMm)
      update(def=>({...def,toleranceMm:number}))
    setToleranceDraft(null)
  }
  const rows=report.rows.filter(row=>row.id===current?.id)
  const measuredRunIdentity=JSON.stringify({
    revision:snapshot?.revision,
    ruleSet,
    station:current,
    rows:rows.map(row=>[row.size,row.actualMm]),
  })
  const measuredConfirmation=useRef(null)
  const activeSizeRow=rows.find(row=>row.size===displaySize)
  const update=(updater)=>{
    if(editorDisabled||nativePOMBusyRef.current||!current)return
    onChange?.(definitions.map(d=>d.id===current.id?updater(d):d))
  }
  const reviseStation=changes=>{
    if(!current||editorDisabled||nativePOMBusyRef.current)return
    const revised=reviseNativeGradingPOMAnchors20261025(snapshot,ruleSet,current,changes)
    if(!revised.ok){setNotice(revised.reason);return}
    if(revised.definition===current)return
    update(()=>({...revised.definition,
      targetsMm:Object.fromEntries(sizes.map(size=>[size,null]))}))
    setNotice('Measurement points changed. Prior targets cleared; recheck against your garment specification.')
  }
  const exportMeasurements=()=>{
    if(!report.rows.length||!ruleSet)return
    const escapeCsv=value=>{
      const raw=String(value??'')
      // Quoting a CSV field does not neutralize spreadsheet formula cells.
      const safe=/^[=+@\t\r]/.test(raw)?"'"+raw:raw
      return `"${safe.replaceAll('"','""')}"`
    }
    const columns=['sourceFingerprint','panelId','pointOfMeasure','kind','size','actualMm',
      'targetMm','differenceMm','toleranceMm','withinTolerance','manufacturingApproved']
    const records=[columns.join(','),...report.rows.map(row=>
      [ruleSet.templateFingerprint,row.panelId,row.label,row.kind,row.size,
        row.actualMm,row.targetMm,row.deltaMm,row.toleranceMm,row.pass,false]
        .map(escapeCsv).join(','))]
    const blob=new Blob([records.join('\n')+'\n'],{type:'text/csv;charset=utf-8'})
    const url=URL.createObjectURL(blob),link=document.createElement('a')
    try{
      link.href=url;link.download='exo-native-grading-pom-DRAFT-NOT-FACTORY-APPROVED.csv'
      document.body.appendChild(link);link.click()
    }finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),3000)}
    setNotice('Exported source-linked draft POM results. This does not certify fit or manufacturing.')
  }
  const downloadSpecs=()=>{
    const result=namedSizes?
      exportNativeGradeNamedSizePomCsv20261028(snapshot,ruleSet,definitions):
      exportNativeGradingPOMSpecsCSV20261025(snapshot,ruleSet,definitions)
    if(!result.ok){setNotice(result.reason);return}
    const blob=new Blob([result.csv],{type:'text/csv;charset=utf-8'})
    const url=URL.createObjectURL(blob),link=document.createElement('a')
    try{
      link.href=url;link.download=namedSizes?
        'exo-named-size-POM-target-SPECS-DRAFT.csv':'exo-grading-POM-target-SPECS-DRAFT.csv'
      document.body.appendChild(link);link.click()
    }finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),3000)}
    setNotice(`${result.rows} draft POM targets exported with source revision. Manufacturing approval remains blocked.`)
  }
  const importSpecs=async event=>{
    const file=event.target.files?.[0]
    event.target.value=''
    if(!file||editorDisabled||nativePOMBusyRef.current)return
    if(file.size>2_000_000){setNotice('Specification CSV exceeds the 2 MB limit');return}
    try{
      const sourceSnapshot=snapshot,sourceRuleSet=ruleSet,sourceDefinitions=definitions
      const csv=await file.text()
      if(nativePOMBusyRef.current||sourceSnapshot!==sourceRef.current.snapshot||sourceRuleSet!==sourceRef.current.ruleSet||sourceDefinitions!==sourceRef.current.definitions){
        setNotice('Import cancelled: grading data changed while the file was being read. Reimport the current specification.');return
      }
      const result=namedSizes?
        importNativeGradeNamedSizePomCsv20261028(csv,snapshot,ruleSet,definitions):
        importNativeGradingPOMSpecsCSV20261025(csv,snapshot,ruleSet,definitions)
      if(!result.ok){setNotice(`Import rejected: ${result.reason}. Existing specifications retained.`);return}
      onChange?.(result.definitions)
      select(result.definitions.some(def=>def.id===(controlled?selectedId:active))
        ?(controlled?selectedId:active):result.definitions[0]?.id||'')
      setNotice(`Imported ${result.rows} draft target rows. Check tolerances; manufacturing approval remains blocked.`)
    }catch(error){setNotice(`Import rejected: ${error.message}. Existing specifications retained.`)}
  }
  const add=()=>{
    if(editorDisabled||nativePOMBusyRef.current||!ruleSet)return
    const result=createNativeGradingPOM20261025(snapshot,ruleSet,{panelId,kind,
      fromPoint:Number(from),toPoint:Number(to),edge:edge||edges[0],label:label.trim()||undefined})
    if(!result.ok){setNotice(result.reason);return}
    const idBase=`${panelId}:${result.definition.id}`
    const id=Array.from({length:65},(_,i)=>i? `${idBase}-${i+1}`:idBase)
      .find(value=>!definitions.some(def=>def.id===value))
    if(!id||definitions.length>=64){setNotice('Maximum 64 POM definitions');return}
    const definition={...result.definition,id,
      targetsMm:Object.fromEntries(sizes.map(size=>[size,null]))}
    onChange?.([...definitions,definition])
    select(id);setNotice('POM added. Targets remain unset until you enter or explicitly adopt them.')
    setLabel('')
  }
  return <section className="exo-grading-pom" data-native-grading-pom-editor="true"
    aria-label="Native graded point of measure editor">
    <header><strong>Point of measure · {sizes.join(' / ')}</strong><small>Native material geometry · mm</small></header>
    <div className="exo-grading-pom-picker">
      <label>Graded size <select aria-label="POM selected graded size" disabled={editorDisabled} value={displaySize}
        onChange={event=>selectSize(event.target.value)}>
        {sizes.map(size=><option key={size} value={size}>{size}</option>)}
      </select></label>
      <small role="status" aria-live="polite">{activeSizeRow?
        `${current.label} · ${displaySize}: measured ${format(activeSizeRow.actualMm)} mm · target ${activeSizeRow.targetMm==null?'unset':`${format(activeSizeRow.targetMm)} mm`} · ${activeSizeRow.targetMm==null?'UNSET':activeSizeRow.pass?'PASS':'CHECK'}`:
        `${displaySize} · choose a measurement specification to preview`}</small>
    </div>
    <p>Define straight drafting distances, curved sewn edges, or multi-edge sewn boundary paths. Paths follow native boundary order from the start anchor to the end anchor, wrapping around the pattern when needed. Rust schema-v2 supports source-verified named-size sewn boundary path POM targets through a separate confirmed native transaction; unsupported or stale geometry is rejected. These are <strong>not body measurements</strong>. Numerical acceptance does not establish factory approval; missing targets never pass QA.</p>
    {nativePOMBusy&&<p role="status">Native POM commit is in flight. Draft edits are locked until Rust returns a verified outcome or a recovery requirement.</p>}
    {nativePOMRecoveryRequired&&<p role="alert">Native POM outcome requires history recovery. Editing and retry are locked until a fresh native revision is restored; do not assume Rust rolled back.</p>}
    <fieldset disabled={editorDisabled||!ruleSet}>
      <div className="exo-grading-pom-fields">
        <label>Piece<select aria-label="POM pattern piece" value={panelId} onChange={e=>{setPanel(e.target.value);setEdge('')}}>
          {panels.map(p=><option value={p.id} key={p.id}>{p.name||p.id}</option>)}
        </select></label>
        <label>Measure<select aria-label="POM measurement type" value={kind} onChange={e=>setKind(e.target.value)}>
          <option value="anchor-distance">Point-to-point distance</option>
          <option value="sewline-edge">Curved sewn edge length</option>
          <option value="sewline-path">Consecutive sewn boundary path</option>
        </select></label>
        {kind==='sewline-path'&&<p role="status" className="exo-grading-pom-full">Clockwise native boundary arclength across consecutive edges. A saved schema-v2 named-size catalog and explicit Rust POM target confirmation are required for persistence; a preview or CSV alone is only a draft.</p>}
        {kind!=='sewline-edge'?<>
          <label>From<select aria-label="POM start anchor" value={from} onChange={e=>setFrom(e.target.value)}>
            {(chosen?.polygon?.points||[]).map((_,i)=><option key={i} value={i}>P{i+1}</option>)}
          </select></label>
          <label>To<select aria-label="POM end anchor" value={to} onChange={e=>setTo(e.target.value)}>
            {(chosen?.polygon?.points||[]).map((_,i)=><option key={i} value={i}>P{i+1}</option>)}
          </select></label>
        </>:<label>Edge<select aria-label="POM sewn edge" value={edges.includes(edge)?edge:edges[0]||''}
          onChange={e=>setEdge(e.target.value)}>
          {edges.map(value=><option key={value}>{value}</option>)}
        </select></label>}
        <label className="exo-grading-pom-full">Specification name
          <input aria-label="POM measurement name" value={label} maxLength={100}
            placeholder="e.g. Front width between drafting points" onChange={e=>setLabel(e.target.value)}/>
        </label>
      </div>
      <div className="exo-grading-pom-full" aria-live="polite">
        {preview.ok?<small>Draft measurement preview (mm): {preview.rows.map(row=>`${row.size} ${format(row.actualMm)}`).join(' · ')}</small>
          :<small role="alert">{preview.reason}</small>}
      </div>
      <button type="button" onClick={add} disabled={editorDisabled||!ruleSet||!preview.ok}>+ Add measured specification</button>
    </fieldset>
    <div className="exo-grading-pom-picker">
      <input ref={importRef} type="file" accept=".csv,text/csv" aria-label="POM target specification CSV file"
        onChange={importSpecs} disabled={editorDisabled||!ruleSet} style={{display:'none'}}/>
      <button type="button" disabled={editorDisabled||!ruleSet} onClick={()=>importRef.current?.click()}>Import {namedSizes?'named-size ':'six-size '}targets</button>
      <button type="button" disabled={editorDisabled||!ruleSet||!definitions.length} onClick={downloadSpecs}>Download {namedSizes?'named-size ':'six-size '}specs</button>
    </div>
    {namedSizes&&typeof onCommitNative==='function'&&<div data-native-named-pom-rust-commit="true">
      <p>Draft POM targets are not saved in Rust until separately confirmed. This operation preserves the saved grading geometry and requires an exact native revision and durable catalog witness. It does not approve fit, cutting or factory release.</p>
      <button type="button" disabled={editorDisabled||!nativePOMReady}
        onClick={()=>setConfirmNativePOM(nativePOMIdentity)}>Review native POM target commit</button>
      {confirmNativePOM!==null&&<div role="group" aria-label="Confirm native named-size POM target commit">
        {confirmNativePOM!==nativePOMIdentity&&<p role="alert">Source or draft targets changed after review opened. Cancel and review again.</p>}
        <button type="button" disabled={editorDisabled||!nativePOMReady||confirmNativePOM!==nativePOMIdentity}
          onClick={commitNativePOM}>Confirm Rust POM target commit</button>
        <button type="button" disabled={nativePOMBusy} onClick={()=>setConfirmNativePOM(null)}>Cancel native POM commit</button>
      </div>}
    </div>}
    {definitions.length>0&&<>
      {namedSizes&&definitions.some(def=>sizes.some(size=>!Object.hasOwn(def.targetsMm||{},size))||
        Object.keys(def.targetsMm||{}).some(size=>!sizes.includes(size)))&&
        <button type="button" disabled={editorDisabled} data-native-named-pom-prepare="true" onClick={()=>{
          if(nativePOMBusyRef.current)return
          // Deliberate operator action: retain existing targets, create UNSET
          // cells for new canonical sizes, and never infer from geometry.
          const next=definitions.map(def=>({...def,targetsMm:Object.fromEntries(sizes.map(size=>
            [size,Object.hasOwn(def.targetsMm||{},size)?def.targetsMm[size]:null]))}))
          onChange?.(next)
          setNotice('Named-size target cells prepared. Enter each new physical target explicitly before Rust commit.')
        }}>Prepare missing named-size target cells (unset, no inferred measurements)</button>}
      <div className="exo-grading-pom-picker">
        <label>POM<select aria-label="Selected POM specification" disabled={editorDisabled} value={current?.id||''}
          onChange={e=>select(e.target.value)}>
          {definitions.map(d=><option key={d.id} value={d.id}>{d.label} · {d.panelId}</option>)}
        </select></label>
        <button type="button" disabled={editorDisabled} onClick={()=>{
          if(nativePOMBusyRef.current)return
          const next=definitions.filter(d=>d.id!==current.id)
          onChange?.(next)
          select(next[0]?.id||'')
        }}>Remove</button>
      </div>
      {current&&<>
        <div className="exo-grading-pom-fields">
          {current.kind!=='sewline-edge'?<>
            <label>Start measurement anchor<select aria-label="Edit POM start anchor" disabled={editorDisabled}
              value={current.fromPoint} onChange={event=>reviseStation({fromPoint:Number(event.target.value)})}>
              {(panels.find(p=>p.id===current.panelId)?.polygon?.points||[]).map((_,index)=><option key={index} value={index}>P{index+1}</option>)}
            </select></label>
            <label>End measurement anchor<select aria-label="Edit POM end anchor" disabled={editorDisabled}
              value={current.toPoint} onChange={event=>reviseStation({toPoint:Number(event.target.value)})}>
              {(panels.find(p=>p.id===current.panelId)?.polygon?.points||[]).map((_,index)=><option key={index} value={index}>P{index+1}</option>)}
            </select></label>
          </>:<label>Sewn measurement edge<select aria-label="Edit POM sewn edge" disabled={editorDisabled}
            value={current.edge} onChange={event=>reviseStation({edge:event.target.value})}>
            {(panels.find(p=>p.id===current.panelId)?.polygon?.edges||[]).map(name=><option key={name} value={name}>{name}</option>)}
          </select></label>}
        </div>
        {!namedSizes&&<fieldset disabled={editorDisabled}>
          <legend>Build target size run · {ruleSet?.baseSize} base</legend>
          <p>Set specification targets independently of the measured pattern. Applying replaces this POM’s six draft targets; it does not change pattern geometry.</p>
          <div className="exo-grading-pom-fields">
            <label>Base-size target mm<input type="number" aria-label="POM base-size target millimetres"
              min={.01} max={10000} step="any" value={targetBase}
              onChange={event=>setTargetBase(event.target.value)}/></label>
            <label>Increment per size mm<input type="number" aria-label="POM increment per size millimetres"
              step="any" value={targetStep} onChange={event=>setTargetStep(event.target.value)}/></label>
          </div>
        <button type="button" disabled={editorDisabled||targetBase.trim()===''||targetStep.trim()===''} onClick={()=>{
            if(nativePOMBusyRef.current)return
            const result=proposeNativeGradingPOMTargetRun20261025(snapshot,ruleSet,current,{
              baseTargetMm:Number(targetBase),incrementMm:Number(targetStep),
            })
            if(!result.ok){setNotice(result.reason);return}
            update(()=>result.definition)
            setTargetBase('');setTargetStep('');setConfirmMeasured(false)
            setNotice('Six draft targets applied. Review measured differences; geometry and manufacturing approval are unchanged.')
          }}>Apply target increments to XS–XXL</button>
        </fieldset>}
        <label>Acceptance tolerance ± mm
          <input key={`${current.id}:tolerance`} type="number" aria-label="POM tolerance millimetres" min={0} max={50} step="any"
            disabled={editorDisabled} value={toleranceValue}
            onFocus={()=>{toleranceCancelled.current=false;toleranceAtFocus.current=current.toleranceMm}} onChange={event=>setToleranceDraft(event.target.value)}
            onBlur={commitTolerance} onKeyDown={event=>{
              if(event.key==='Enter')event.currentTarget.blur()
              if(event.key==='Escape'){
                event.preventDefault();event.stopPropagation()
                // blur fires before a queued state update is visible: use a
                // synchronous ref to prevent committing the cancelled draft.
                toleranceCancelled.current=true
                setToleranceDraft(null)
                event.currentTarget.blur()
              }
            }}/>
        </label>
        <div className="exo-grading-qa-table-scroll">
          <table aria-label="All-size native measured POM with editable target">
            <thead><tr><th>Size</th><th>Measured</th><th>Measured size step</th><th>Target mm</th><th>Difference</th><th>Check</th></tr></thead>
            <tbody>{rows.map((row,index)=><tr key={row.size}>
              <th>{row.size}</th><td>{format(row.actualMm)}</td>
              <td>{index?format(row.actualMm-rows[index-1].actualMm):'—'}</td>
              <td><POMNumericTarget key={`${current.id}:${row.size}`} size={row.size}
                value={current.targetsMm?.[row.size]??null} disabled={editorDisabled}
                onCommit={value=>update(def=>({...def,targetsMm:{...def.targetsMm,[row.size]:value}}))}/></td>
              <td>{format(row.deltaMm)}</td><td>{row.targetMm===null?'UNSET':row.pass?'PASS':'CHECK'}</td>
            </tr>)}</tbody>
          </table>
        </div>
        {!namedSizes&&<button type="button" disabled={editorDisabled||rows.length!==6} onClick={()=>{measuredConfirmation.current=measuredRunIdentity;setConfirmMeasured(true)}}>
          Use current measured run as draft targets
        </button>}
        {!namedSizes&&confirmMeasured&&<div role="group" aria-label="Confirm copying measured values to targets">
          <p>This replaces all six targets for {current.label} with measurements from this pattern. It does not establish a fit specification or manufacturing approval.</p>
          {measuredConfirmation.current!==measuredRunIdentity&&<p role="alert">Measurements or grading source changed since confirmation opened. Cancel and review the current run before copying targets.</p>}
          <button type="button" disabled={editorDisabled||rows.length!==6||measuredConfirmation.current!==measuredRunIdentity} onClick={()=>{
            if(nativePOMBusyRef.current)return
            update(def=>({...def,targetsMm:Object.fromEntries(rows.map(row=>[row.size,Math.round(row.actualMm*100)/100]))}))
            setConfirmMeasured(false)
            setNotice('Measured values copied into editable draft targets. This is NOT an approved garment specification.')
          }}>Confirm replace six draft targets</button>
          <button type="button" onClick={()=>setConfirmMeasured(false)}>Cancel</button>
        </div>}
      </>}
      <button type="button" disabled={editorDisabled||!report.rows.length} onClick={exportMeasurements}>
        Export {sizes.length}-size measured POM CSV · draft
      </button>
    </>}
    <p role="status" data-pom-status={report.ok?'pass':'review'}>
      {definitions.length===0?'No POM specifications defined.':
        report.ok?`${report.requiredRows} / ${report.requiredRows} measurements match your targets (draft only).`:
        report.reason?`POM validation failed: ${report.reason}`:
        `${report.issues?.length||0} POM target(s) missing or outside tolerance.`}
    </p>
    {report.reason&&<small role="alert">{report.reason}</small>}
    {notice&&<small role="status">{notice}</small>}
  </section>
}
