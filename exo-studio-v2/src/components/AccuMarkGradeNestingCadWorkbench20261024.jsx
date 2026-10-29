import React,{useEffect,useMemo,useState} from 'react'
import {applyAccuMarkAtomicGradeRun20261024} from '../core/accumarkAtomicGradeRun20261024.js'
import {gradeProject} from '../core/grading.js'
import {nestPolygons} from '../core/accumarkPolygonNesting20261024.js'
import {optimizeAccuMarkMarkerProduction20261024,compareAccuMarkMarkerRollDemand20261024} from '../core/accumarkMarkerProductionOptimization20261024.js'
import {auditAccuMarkCadInterchangeReceiving20261024} from '../core/accumarkCadInterchangeReceivingQA20261024.mjs'

const num=s=>String(s).trim()!==''&&Number.isFinite(Number(s))?Number(s):NaN
const columns={display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:8}
function save(name,data){
 const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}))
 const a=document.createElement('a')
 try{a.href=url;a.download=name;document.body.appendChild(a);a.click()}
 finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
}
export default function AccuMarkGradeNestingCadWorkbench20261024({project,onApplyProject,disabled=false,nativeMode=false}){
 const sizes=project?.grading?.sizes||[],base=project?.grading?.baseSize
 const pieces=project?.pieces||[],fabrics=useMemo(()=>[...new Set(pieces.map(p=>p.fabricId||'main'))],[pieces])
 const [pieceId,setPieceId]=useState(''),[points,setPoints]=useState('1,2'),[matrix,setMatrix]=useState({})
 const [size,setSize]=useState(''),[fabric,setFabric]=useState(''),[width,setWidth]=useState('145'),[gap,setGap]=useState('1.5')
 const [length,setLength]=useState('1000'),[plies,setPlies]=useState('10'),[rollLength,setRollLength]=useState('2000')
 const [marker,setMarker]=useState(null),[markerSource,setMarkerSource]=useState(null),[improved,setImproved]=useState(null),[roll,setRoll]=useState(null)
 const [gradeResult,setGradeResult]=useState(null),[zip,setZip]=useState(null),[receivers,setReceivers]=useState([]),[cad,setCad]=useState(null)
 const [error,setError]=useState(''),[busy,setBusy]=useState(false)
 const chosen=pieces.find(p=>p.id===pieceId)||pieces[0],selectedSize=sizes.includes(size)?size:(base||sizes[0])
 const fabricId=fabrics.includes(fabric)?fabric:(fabrics[0]||'main')
 const canGrade=!disabled&&!nativeMode&&Boolean(chosen)&&typeof onApplyProject==='function'
 useEffect(()=>{setMarker(null);setMarkerSource(null);setImproved(null);setRoll(null)},[project,selectedSize,fabricId,width,gap,length])
 useEffect(()=>{setGradeResult(null)},[project])
 useEffect(()=>{setRoll(null)},[plies,rollLength])
 const attempt=(callback)=>{setError('');try{callback()}catch(e){setError(e.message||String(e))}}
 const grade=()=>attempt(()=>{
  if(!canGrade)throw Error('Authoring requires an editable legacy EXO project; native Rust source is separate')
  const tokens=points.split(',').map(v=>v.trim())
  if(tokens.some(v=>!/^\d+$/.test(v)))throw Error('Point indices must be explicit nonnegative integers; empty entries are invalid')
  const indices=tokens.map(Number)
  if(indices.some(n=>!Number.isSafeInteger(n)||n<0)||indices.length>32||!indices.length)throw Error('Select valid numeric point indices')
  const offsetsCm=sizes.map(name=>({size:name,dxCm:name===base?0:num(matrix[name]?.x??'0'),dyCm:name===base?0:num(matrix[name]?.y??'0')}))
  const out=applyAccuMarkAtomicGradeRun20261024(project,{edits:indices.map(pointIndex=>({pieceId:chosen.id,pointIndex,offsetsCm}))})
  onApplyProject(out.project,'Atomic complete industrial grade rule update: '+out.validation.editedPointCount+' points and '+out.validation.sizeCount+' sizes')
  setGradeResult(out.validation)
 })
 const buildMarker=()=>attempt(()=>{
  setMarker(null);setImproved(null);setRoll(null)
  if(!selectedSize)throw Error('Source project needs a graded size line')
  // Physical polygon marker discovery happens BEFORE the optimizer's
  // evaluation budget. Cap source cardinality before grade/shape expansion.
  const sourceQuantity=pieces.reduce((n,p)=>n+(p.cutQuantity||0),0)
  const pointSum=pieces.reduce((n,p)=>n+(p.points?.length||0),0)
  if(pieces.length>16||sizes.length>16||sourceQuantity>48||
    pieces.some(p=>!Array.isArray(p.points)||p.points.length>40||p.points.length<3)||
    pointSum>480||sourceQuantity*pointSum*pointSum>750000)
    throw Error('Marker source exceeds bounded polygon discovery budget; divide into smaller fabric/size studies')
  const graded=gradeProject(project,selectedSize)
  const single={...graded,grading:undefined,pieces:graded.pieces.filter(p=>(p.fabricId||'main')===fabricId)}
  if(!single.pieces.length)throw Error('No pieces for selected fabric')
  if(single.pieces.some(p=>p.curves&&Object.keys(p.curves).length||
    p.notches?.length||p.holes?.length||p.fold||p.cutOnFold||
    p.marker?.motif||p.marker?.plaid||p.marker?.stripe||p.marker?.repeat))
    throw Error('This bounded optimizer cannot preserve curved, notched, folded, or matched-fabric CUT semantics; use physical marker QA instead')
  const out=nestPolygons(single,{fabricWidth:num(width),gap:num(gap),maxLength:num(length),fabricId})
  setMarkerSource(single);setMarker(out)
  if(!out.ok)throw Error('Source physical CUT nesting refused: '+JSON.stringify([...out.errors||[],...out.unplaced||[]]).slice(0,220))
 })
 const improve=()=>attempt(()=>{
  if(!marker?.ok)throw Error('Build and verify a polygon marker first')
  const out=optimizeAccuMarkMarkerProduction20261024(markerSource,marker,
   {fabricWidthCm:num(width),gapCm:num(gap),maxLengthCm:num(length),maxEvaluations:500})
  setImproved(out);setRoll(null)
  if(!out.ok)throw Error(out.code+': '+out.detail)
 })
 const plan=()=>attempt(()=>{
  if(!improved?.ok)throw Error('Complete source marker optimization first')
  const out=compareAccuMarkMarkerRollDemand20261024(markerSource,marker,improved,
   {fabricWidthCm:num(width),gapCm:num(gap),maxLengthCm:num(length),plyCount:num(plies),
    rolls:[{rollId:'ROLL-1',usableLengthCm:num(rollLength)}]})
  setRoll(out)
  if(!out.ok)throw Error(out.code+': '+out.detail)
 })
 const audit=async()=>{
  setError('');setCad(null)
  if(!zip){setError('Choose a real original receiver-evaluation ZIP');return}
  setBusy(true)
  try{
   if(zip.size>20*1024*1024)throw Error('Source ZIP exceeds 20MB')
   if(receivers.length>6||receivers.reduce((sum,f)=>sum+f.size,0)>20*1024*1024)
     throw Error('Receiver files exceed six sizes or 20MB aggregate')
   // The independent receiver accepts only ordinary own-data maps or Map.
   // Sizes are numeric whitelist strings and cannot be prototype keys.
   const received={}
   for(const file of receivers){
    if(file.size>5*1024*1024)throw Error('Receiver DXF exceeds 5MB')
    const m=file.name.match(/(?:size-|graded-)(\d{1,3})\.dxf$/i)
    if(!m||Object.hasOwn(received,m[1]))throw Error('Receiver filenames must be unique size-NNN.dxf')
    received[m[1]]=await file.text()
   }
   const report=await auditAccuMarkCadInterchangeReceiving20261024(new Uint8Array(await zip.arrayBuffer()),
    {receiverDxfs:receivers.length?received:null})
   setCad(report)
  }catch(e){setError(e.message||String(e))}finally{setBusy(false)}
 }
 return <section data-accumark-grade-nesting-cad-workbench="true" style={{display:'grid',gap:12,padding:12,fontSize:12}}>
  <strong style={{fontSize:14}}>Industrial Grading · Physical Nesting · CAD Exchange QA</strong>
  <p>These are source-backed workflows with guarded edit/measure/roundtrip checks, not factory-certified licensed Gerber equivalents.</p>
  <details open><summary><strong>Atomic complete all-size grading rule edits</strong></summary>
    <p>One edit applies complete nonuniform per-size X/Y grading to every chosen point. Every size must pass all-piece industrial geometry QA before it can enter Undo history.</p>
    <label>Piece <select value={chosen?.id||''} onChange={e=>setPieceId(e.target.value)}>{pieces.map(p=><option key={p.id} value={p.id}>{p.name||p.id}</option>)}</select></label>
    <label>Point indices (comma separated) <input value={points} onChange={e=>setPoints(e.target.value)} /></label>
    <div style={{overflowX:'auto'}}><table style={{width:'100%'}}><thead><tr><th>Size</th><th>ΔX cm</th><th>ΔY cm</th></tr></thead>
      <tbody>{sizes.map(name=><tr key={name}><td>{name}{name===base?' (base)':''}</td>{['x','y'].map(axis=>
        <td key={axis}><input aria-label={'Grade '+name+' delta '+axis} type="number" step=".1" style={{width:'100%'}}
          disabled={name===base||!canGrade} value={name===base?'0':matrix[name]?.[axis]??'0'}
          onChange={e=>setMatrix(old=>({...old,[name]:{...old[name],[axis]:e.target.value}}))}/></td>)}</tr>)}</tbody></table></div>
    {nativeMode&&<p>Legacy EXO grading edits are disabled in native Rust mode. Native size-run QA is available in Seamly Native Engine.</p>}
    <button type="button" disabled={!canGrade||sizes.length<2} onClick={grade}>Validate and commit complete grade rules</button>
    {gradeResult&&<p role="status">Passed {gradeResult.sizeCount} graded sizes, {gradeResult.editedPointCount} points; source geometry unchanged, no factory approval.</p>}
  </details>
  <details><summary><strong>Shape-aware marker optimization and roll/ply demand</strong></summary>
    <div style={columns}>
      <label>Source size<select value={selectedSize||''} onChange={e=>setSize(e.target.value)}>{sizes.map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Fabric<select value={fabricId} onChange={e=>setFabric(e.target.value)}>{fabrics.map(x=><option key={x}>{x}</option>)}</select></label>
      {[['Width cm',width,setWidth],['Minimum gap cm',gap,setGap],['Maximum length cm',length,setLength]].map(([name,v,fn])=>
       <label key={name}>{name}<input style={{width:'100%'}} type="number" value={v} onChange={e=>fn(e.target.value)}/></label>)}
    </div>
    <button type="button" onClick={buildMarker} disabled={!pieces.length}>Build actual graded CUT marker</button>
    {marker&&<p role="status">Initial marker: {marker.ok?'complete':'blocked'} · {marker.placements?.length||0} instances · {marker.metrics?.length?.toFixed(2)??'—'} cm</p>}
    <button type="button" onClick={improve} disabled={!marker?.ok}>Optimize all placements with source CUT/spacing validation</button>
    {improved&&<p role="status">Optimization: {improved.ok?'verified':'blocked'}{improved.ok?' · '+improved.optimization.beforeLengthCm+' → '+improved.optimization.afterLengthCm+' cm · '+improved.optimization.evaluations+' checks':' · '+improved.code}</p>}
    <div style={columns}>
     <label>Plies<input style={{width:'100%'}} type="number" value={plies} onChange={e=>setPlies(e.target.value)}/></label>
     <label>Usable roll length cm<input style={{width:'100%'}} type="number" value={rollLength} onChange={e=>setRollLength(e.target.value)}/></label>
    </div>
    <button type="button" disabled={!improved?.ok} onClick={plan}>Calculate fabric demand by ply and roll</button>
    {roll&&<p role="status">Demand: {roll.ok?'Original '+roll.before.requiredCm+' cm → optimized '+roll.after.requiredCm+' cm; saved '+roll.materialSavedCm+' cm; feasible '+roll.after.feasible:roll.code}</p>}
    {improved?.ok&&<button type="button" onClick={()=>save('exo-physical-marker-NOT-APPROVED.json',improved)}>Download source-checked marker study</button>}
    {roll?.ok&&<button type="button" onClick={()=>save('exo-ply-roll-plan-NOT-APPROVED.json',roll)}>Download roll/ply plan</button>}
  </details>
  <details><summary><strong>Independent AAMA DXF receiving and source/geometry comparison</strong></summary>
    <p>Use actual EXO/Seamly receiver-evaluation ZIP. Add separately returned receiving CAD DXFs to compare cut, draw, grain, notch and internal-cut geometry across sizes. Tests do not certify that licensed Gerber software opened the files.</p>
    <label>Original evaluation ZIP <input aria-label="Original CAD ZIP" type="file" accept=".zip" disabled={busy} onChange={e=>{setZip(e.target.files?.[0]||null);setCad(null)}}/></label>
    <label>Optional returned receiving DXFs named size-48.dxf etc. <input aria-label="Independent receiver DXFs" type="file" accept=".dxf" multiple disabled={busy} onChange={e=>{setReceivers([...e.target.files||[]]);setCad(null)}}/></label>
    <button type="button" onClick={audit} disabled={!zip||busy}>{busy?'Verifying bytes and geometry…':'Audit source archive and receiver geometry'}</button>
    {cad&&<div role="status">CAD audit: <strong>{cad.ok?(cad.receiverGeometryCompared?'uploaded DXF geometry matched locally':'source packet integrity passed only'):'blocked'}</strong> · source bytes {cad.bytesVerified?'match included unsigned manifest':'unverified'} · receiver DXFs {cad.receiverGeometryCompared?'locally compared (not independently authenticated)':'not verified'} · licensed CAD import and factory approval NOT verified.
      {(cad.issues||[]).slice(0,4).map((x,i)=><p key={i}>{x.code}: {x.detail}</p>)}
      <button type="button" onClick={()=>save('exo-cad-receiving-audit-NOT-APPROVED.json',cad)}>Download detailed audit</button>
    </div>}
  </details>
  {error&&<p role="alert" style={{color:'#ce7777'}}>{error}</p>}
  <small>Exclusions: undocumented grading dependencies, all complex matched-fabric layouts, unverified external Gerber receiving, machine control and physical factory fit/plot/cut acceptance.</small>
 </section>
}
