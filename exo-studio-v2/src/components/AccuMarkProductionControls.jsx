import React,{useEffect,useState} from 'react'
import {buildAccuMarkMarkerOrder,checkAccuMarkPlotCalibration} from '../core/accumarkMarkerProduction20261023.js'
import {nestPolygons} from '../core/accumarkPolygonNesting20261024.js'
import {adjustAccuMarkManualMarker20261024} from '../core/accumarkManualMarker20261024.js'
import {applyAccuMarkMarkerGroupPlacement20261024} from '../core/accumarkMarkerGroupPlacement20261024_1341.js'
import {buildAccuMarkCutterPathStudy20261024} from '../core/accumarkCutterPathStudy20261024.js'
import {buildAccuMarkCutRoomPlan} from '../core/accumarkCutRoomPlan20261024.js'
import {parseAccuMarkCutRoomRolls20261029} from '../core/accumarkCutRoomRollParser20261029.js'
import AccuMarkMaterialRepeatControls20261024 from './AccuMarkMaterialRepeatControls20261024.jsx'
import './AccuMarkProductionControls.css'

const numeric=(s)=>String(s??'').trim()?Number(s):NaN
const escapeXml=(s)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]))
function generateStudySvg(marker,project){
  const width=marker?.width, length=marker?.length
  if(!Number.isFinite(width)||!Number.isFinite(length)||width<=0||length<=0)throw Error('Invalid marker extents')
  if(!Array.isArray(marker.placements)||!marker.placements.length)throw Error('No marker placements to plot')
  const polys=marker.placements.map(item=>{
    const points=item.outline
    if(!Array.isArray(points)||points.length<3||points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))throw Error('A placement lacks a physical cut outline')
    const vertices=points.map(p=>`${p.x.toFixed(4)},${p.y.toFixed(4)}`).join(' ')
    return `<polygon points="${vertices}" fill="none" stroke="#111" stroke-width=".04"/><text x="${(item.x+.5).toFixed(3)}" y="${(item.y+1.5).toFixed(3)}" font-size="1.1">${escapeXml(`${item.pieceId} ${item.size} #${item.instance+1}`)}</text>`
  }).join('')
  const calibration=width>=11&&length>=4?'<line x1="1" y1="2" x2="11" y2="2" stroke="blue" stroke-width=".06"/><text x="1" y="1.5" font-size=".6">100 mm. Print at 100%; measure both axes.</text>':''
    return `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="${width}cm" height="${length}cm" viewBox="0 0 ${width} ${length}"><title>EXO marker research proof</title><desc>Operator inspection preview; requires manufacturer receiver verification before cutting.</desc><rect x="0" y="0" width="${width}" height="${length}" fill="white" stroke="#111" stroke-width=".06"/>${polys}${calibration}</svg>`
}
export default function AccuMarkProductionControls({project,focusOperation,disabled=false}){
 const section=React.useRef(null)
 const sizes=project?.grading?.sizes||[],pieces=project?.pieces||[]
 const [quantities,setQuantities]=useState({})
 const [cuts,setCuts]=useState({})
 const [width,setWidth]=useState('150')
 const [gap,setGap]=useState('1.5')
 const [meterCost,setMeterCost]=useState('0')
 const [nap,setNap]=useState(false)
 const [fabricId,setFabricId]=useState('main')
 const [report,setReport]=useState(null)
 const [failure,setFailure]=useState('')
 const [measuredX,setMeasuredX]=useState('100')
 const [measuredY,setMeasuredY]=useState('100')
 const [calibration,setCalibration]=useState(null)
 const [grainByPiece,setGrainByPiece]=useState({})
 const [polygonReport,setPolygonReport]=useState(null)
 const [polygonSource,setPolygonSource]=useState(null)
 const [placementOrder,setPlacementOrder]=useState('input')
 const [cutterStudy,setCutterStudy]=useState(null)
 const [manualTarget,setManualTarget]=useState('')
 const [manualX,setManualX]=useState('')
 const [manualY,setManualY]=useState('')
 const [manualRotate,setManualRotate]=useState('0')
 const [groupKeys,setGroupKeys]=useState([])
 const [groupKind,setGroupKind]=useState('group.slide')
 const [groupDeltaX,setGroupDeltaX]=useState('2')
 const [groupDeltaY,setGroupDeltaY]=useState('0')
 const [groupAxis,setGroupAxis]=useState('x')
 const [cutRoomReport,setCutRoomReport]=useState(null)
 const [rollCsv,setRollCsv]=useState('ROLL-01,BATCH-01,SHADE-A,3000,5')
 const [maxPly,setMaxPly]=useState('12')
 const invalidateLayoutStudies=()=>{setReport(null);setPolygonReport(null);setPolygonSource(null);setCutRoomReport(null);setCutterStudy(null);setGroupKeys([])}
 useEffect(()=>{
  setQuantities(Object.fromEntries(sizes.map(s=>[s,s===project?.grading?.baseSize?'1':'0'])))
  setCuts(Object.fromEntries(pieces.map(p=>[p.id,p.cutQuantity?String(p.cutQuantity):''])))
   setGrainByPiece(Object.fromEntries(pieces.map(p=>[p.id,Number.isFinite(p.grainAngleDeg)?String(p.grainAngleDeg):''])))
  setFabricId(pieces[0]?.fabricId||'main');setReport(null);setFailure('')
   setPolygonReport(null);setPolygonSource(null);setCutRoomReport(null);setCutterStudy(null);setGroupKeys([])
 },[project?.id,JSON.stringify(sizes),pieces.map(p=>p.id).join('|')])
 useEffect(()=>{if(focusOperation==='plot'&&section.current)section.current.open=true},[focusOperation])
 const run=()=>{
  try{
   if(!project)throw Error('Open a garment project first')
   const copy=structuredClone(project)
   for(const piece of copy.pieces){
    const count=numeric(cuts[piece.id])
    if(!Number.isSafeInteger(count)||count<1||count>100)throw Error('Specify cut quantity 1–100 for '+piece.id)
    piece.cutQuantity=count
   }
   const result=buildAccuMarkMarkerOrder(copy,{quantitiesBySize:Object.fromEntries(sizes.map(s=>[s,numeric(quantities[s])])),fabricWidthCm:numeric(width),
    spacingCm:numeric(gap),costPerMeter:numeric(meterCost),nap,fabricId})
   const marker=result.validation?.metrics
    ? {width:numeric(width),length:result.validation.metrics.lengthCm,placements:result.placements}
    : null
   setReport({...result,marker});setFailure('')
  }catch(error){setReport(null);setFailure(error.message||String(error))}
 }
 const save=()=>{
  try{
   if(!report?.validation?.ok||!report.marker)throw Error('Resolve all marker issues before exporting an inspection plot')
   const xml=generateStudySvg(report.marker,project)
   const url=URL.createObjectURL(new Blob([xml],{type:'image/svg+xml'}))
   const a=document.createElement('a');a.href=url;a.download='EXO-AccuMark-marker-inspection.svg';a.click()
   window.setTimeout(()=>URL.revokeObjectURL(url),5000)
  }catch(error){setFailure(error.message||String(error))}
 }
 const calibrate=()=>setCalibration(checkAccuMarkPlotCalibration({measuredXmm:numeric(measuredX),measuredYmm:numeric(measuredY)}))
 const sourceCopy=()=>{
   if(!project)throw Error('Open a garment project first')
   const copy=structuredClone(project)
   for(const piece of copy.pieces){
     const qty=numeric(cuts[piece.id])
     if(!Number.isSafeInteger(qty)||qty<1||qty>100)throw Error('Specify cut quantity 1–100 for '+piece.id)
     piece.cutQuantity=qty
   }
   return copy
 }
 const downloadQa=(name,body,type='application/json')=>{
   const objectUrl=URL.createObjectURL(new Blob([body],{type}))
   const anchor=document.createElement('a');anchor.href=objectUrl;anchor.download=name
   document.body.appendChild(anchor)
   try{anchor.click()}finally{anchor.remove();setTimeout(()=>URL.revokeObjectURL(objectUrl),1000)}
 }
 const previewPolygon=()=>{
   try{
     const copy=sourceCopy()
     for(const piece of copy.pieces){
       const angle=numeric(grainByPiece[piece.id])
       if(!Number.isFinite(angle)||angle< -360||angle>360)throw Error('Enter confirmed physical grain angle for '+piece.id)
       piece.grainAngleDeg=angle
       piece.marker={...piece.marker,nap:nap?'one-way':'none'}
     }
     const result=nestPolygons(copy,{fabricWidth:numeric(width),gap:numeric(gap),fabricId,maxLength:1000,maxCandidates:30000,placementOrder})
     setPolygonReport(result);setPolygonSource(result.ok?{project:copy,fabricWidth:numeric(width),gap:numeric(gap)}:null);setCutterStudy(null);setGroupKeys([]);setFailure('')
   }catch(error){setFailure(error.message||String(error));setPolygonReport(null);setPolygonSource(null);setCutterStudy(null)}
 }
 const manualMarkerMove=()=>{
  const selected=polygonReport?.placements?.find(p=>p.pieceId+'@@'+p.instance===manualTarget)
  if(!polygonReport?.ok||!polygonSource||!selected){setFailure('Choose a valid original marker placement');return}
  const working={...polygonSource.project,pieces:polygonSource.project.pieces.filter(p=>(p.fabricId||'main')===fabricId)}
  const result=adjustAccuMarkManualMarker20261024(working,polygonReport,{pieceId:selected.pieceId,
   instance:selected.instance,x:numeric(manualX),y:numeric(manualY),rotationDeg:numeric(manualRotate),
   fabricWidthCm:polygonSource.fabricWidth,gapCm:polygonSource.gap,maxLengthCm:1000})
  if(!result.ok){setFailure(result.code+': '+result.reason);return}
  setPolygonReport(result);setCutterStudy(null);setFailure('')
 }
 const selectMarker=value=>{
  setManualTarget(value)
  const selected=polygonReport?.placements?.find(p=>p.pieceId+'@@'+p.instance===value)
  if(selected){setManualX(String(selected.x));setManualY(String(selected.y));setManualRotate(String(selected.rotationDeg))}
 }
 const commitGroupMove=()=>{
  if(!polygonSource||!polygonReport?.ok){setFailure('Create a complete source-verified polygon nest first');return}
  const members=(polygonReport.placements||[]).filter(p=>groupKeys.includes(p.pieceId+'@@'+p.instance))
    .map(p=>({pieceId:p.pieceId,instance:p.instance}))
  if(members.length<2){setFailure('Select at least two distinct placed piece instances for a group action');return}
  const working={...polygonSource.project,
    pieces:polygonSource.project.pieces.filter(p=>(p.fabricId||'main')===fabricId)}
  const result=applyAccuMarkMarkerGroupPlacement20261024(working,polygonReport,{
    kind:groupKind,members,dxCm:numeric(groupDeltaX),dyCm:numeric(groupDeltaY),
    axis:groupAxis,fabricWidthCm:polygonSource.fabricWidth,
    gapCm:polygonSource.gap,maxLengthCm:1000
  })
  if(!result.ok){setFailure(result.code+': '+result.reason);return}
  setPolygonReport(result);setCutterStudy(null);setFailure('')
 }
 const planCutRoom=()=>{
   try{
     const copy=sourceCopy()
     const rolls=parseAccuMarkCutRoomRolls20261029(rollCsv,{fabricId,nap,widthCm:numeric(width)})
     const result=buildAccuMarkCutRoomPlan(copy,{quantitiesBySize:Object.fromEntries(sizes.map(s=>[s,numeric(quantities[s])])),
       rolls,fabricWidthCm:numeric(width),spacingCm:numeric(gap),maxPlyCount:numeric(maxPly),nap,fabricId})
     setCutRoomReport(result);setFailure('')
   }catch(error){setFailure(error.message||String(error));setCutRoomReport(null)}
 }
 return <section className="exo-accu-production" aria-label="AccuMark industrial marker and plot inspector" data-accumark-production-controls="true">
  <details ref={section}><summary>Marker layout, quantities and physical plot QA</summary>
   <fieldset disabled={disabled}>
    <p>Specify each size and cut quantity explicitly. Placements are verified with fabric width, spacing and grain restrictions; blocked jobs cannot export the inspection plot.</p>
    <div className="exo-accu-prod-row">{sizes.map(size=><label key={size}>{size}<input type="number" min="0" max="1000" aria-label={`Marker quantity ${size}`} value={quantities[size]??''} onChange={e=>{setQuantities(q=>({...q,[size]:e.target.value}));invalidateLayoutStudies()}}/></label>)}</div>
    <div className="exo-accu-prod-row">{pieces.map(piece=><label key={piece.id}>{piece.name||piece.id} cuts<input type="number" min="1" max="100" aria-label={`Cut quantity ${piece.id}`} placeholder="required" value={cuts[piece.id]??''} onChange={e=>{setCuts(q=>({...q,[piece.id]:e.target.value}));invalidateLayoutStudies()}}/></label>)}</div>
    <div className="exo-accu-prod-row"><label>Fabric ID<select aria-label="Marker fabric" value={fabricId} onChange={e=>{setFabricId(e.target.value);invalidateLayoutStudies()}}>{[...new Set(pieces.map(p=>p.fabricId||'main'))].map(s=><option key={s} value={s}>{s}</option>)}</select></label><label>Fabric width cm<input aria-label="Marker fabric width" type="number" min="1" value={width} onChange={e=>{setWidth(e.target.value);invalidateLayoutStudies()}}/></label></div>
    <div className="exo-accu-prod-row"><label>Spacing cm<input aria-label="Marker piece spacing" type="number" step=".1" min="0" value={gap} onChange={e=>{setGap(e.target.value);invalidateLayoutStudies()}}/></label><label>Fabric cost per metre<input aria-label="Marker cost per meter" type="number" step=".1" min="0" value={meterCost} onChange={e=>{setMeterCost(e.target.value);setCutRoomReport(null)}}/></label></div>
    <label className="exo-accu-prod-check"><input type="checkbox" checked={nap} onChange={e=>{setNap(e.target.checked);invalidateLayoutStudies()}}/> Directional fabric / nap: forbid 180° reversal</label>
    <button type="button" onClick={run}>Generate and validate marker order</button>
    {failure&&<p role="alert" className="exo-accu-prod-error">{failure}</p>}
    {report&&<div role="status" className="exo-accu-prod-report">
      <strong>{report.validation?.ok?'Marker geometric checks passed':'Marker blocked — review issues'}</strong>
      <span>Required {report.validation?.required??'?'} · Placed {report.validation?.placed??'?'} · Unplaced {report.validation?.unplaced?.length??'?'}</span>
      {report.validation?.metrics&&<span>Length {report.validation.metrics.meters.toFixed(2)} m · Utilization {(report.validation.metrics.utilization*100).toFixed(1)}% · Est. fabric cost {report.validation.metrics.estimatedFabricCost.toFixed(2)}</span>}
      {report.validation?.issues?.slice(0,12).map((item,i)=><small key={i}>{item.code}: {item.detail}</small>)}
      <button type="button" disabled={!report.validation?.ok} onClick={save}>Download inspection SVG</button>
    </div>}
    <details><summary>Shape-aware polygon nesting · experimental</summary>
      <p>Unlike the basic rectangular packer, this checks each physical cutline polygon against the others. Requires grain and nap declarations; fold and unsupported holes are blocked. For investigation, not cutter authorization.</p>
      <div className="exo-accu-prod-row">{pieces.map(piece=><label key={piece.id}>{piece.name||piece.id} grain °<input type="number" aria-label={`Physical grain angle ${piece.id}`} min="-360" max="360" step="any" value={grainByPiece[piece.id]??''} onChange={e=>{setGrainByPiece(v=>({...v,[piece.id]:e.target.value}));invalidateLayoutStudies()}}/></label>)}</div>
      <label>Placement sequence <select aria-label="Polygon nest placement sequence" value={placementOrder} onChange={e=>{setPlacementOrder(e.target.value);invalidateLayoutStudies()}}><option value="input">Pattern list order</option><option value="largest-first">Largest footprint first</option></select></label>
      <button type="button" onClick={previewPolygon}>Calculate shape-aware nest</button>
      {polygonReport&&<div role="status">
        <strong>{polygonReport.ok?'Geometric placement complete':'Nest incomplete / blocked'}</strong>
        <p>Placed {polygonReport.metrics?.placed??0} of {polygonReport.metrics?.requested??0} · length {polygonReport.metrics?.length?.toFixed(2)??'—'} cm · utilization {polygonReport.metrics?(polygonReport.metrics.efficiency*100).toFixed(1)+'%':'—'} · order {polygonReport.metrics?.placementOrder==='largest-first'?'largest first':'pattern list'}.</p>
        {polygonReport.errors?.map((e,i)=><p key={i}>{typeof e==='string'?e:(e.pieceId+': '+e.reason)}</p>)}
        {polygonReport.unplaced?.map((e,i)=><p key={i}>{e.pieceId} #{e.instance+1}: {e.reason}</p>)}
        {polygonReport.ok&&<button type="button" onClick={()=>downloadQa('exo-polygon-nest-QA-NOT-APPROVED.json',JSON.stringify(polygonReport,null,2))}>Download checked polygon nest JSON</button>}
      </div>}
      {polygonReport?.ok&&polygonSource&&<details><summary>Easy Marking · precise manual move and rotation</summary>
        <p>Edits an existing physical polygon marker placement, recalculates all geometry, and blocks collisions, spacing errors, wrong-grain rotations and fabric overflow. The source garment is unchanged.</p>
        <label>Marker piece instance<select aria-label="Manual marker piece" value={manualTarget} onChange={e=>selectMarker(e.target.value)}>
          <option value="">Select a piece</option>{polygonReport.placements.map(p=><option key={p.pieceId+'@@'+p.instance} value={p.pieceId+'@@'+p.instance}>{p.pieceId} #{p.instance+1}</option>)}
        </select></label>
        <div className="exo-accu-prod-row">
         <label>X cm<input type="number" step=".1" aria-label="Manual marker X" value={manualX} onChange={e=>setManualX(e.target.value)}/></label>
         <label>Y cm<input type="number" step=".1" aria-label="Manual marker Y" value={manualY} onChange={e=>setManualY(e.target.value)}/></label>
         <label>Rotation °<input type="number" step="90" aria-label="Manual marker rotation" value={manualRotate} onChange={e=>setManualRotate(e.target.value)}/></label>
        </div>
        <button type="button" disabled={!manualTarget} onClick={manualMarkerMove}>Commit guarded manual marker placement</button>
      </details>}
      {polygonReport?.ok&&polygonSource&&<details><summary>Easy Marking · group slide, step and alignment</summary>
        <p>Move multiple physically placed CUT pieces as one checked transaction. Group slide preserves relative offsets; step increments each selected instance; align sets their bounding origins on one axis. Source grain, nap, quantities, physical clearance and marker bounds must still pass.</p>
        <div style={{display:'flex',gap:9,flexWrap:'wrap',maxHeight:130,overflowY:'auto'}}>
         {polygonReport.placements.map(p=>{
          const id=p.pieceId+'@@'+p.instance
          return <label key={id} style={{fontSize:11}}><input type="checkbox" aria-label={'Group member '+p.pieceId+' instance '+p.instance}
             checked={groupKeys.includes(id)} onChange={e=>setGroupKeys(old=>e.target.checked?[...new Set([...old,id])]:old.filter(x=>x!==id))}/>
             {p.pieceId} #{p.instance+1}</label>
         })}
        </div>
        <label>Group operation<select aria-label="Marker group placement operation" value={groupKind} onChange={e=>setGroupKind(e.target.value)}>
           <option value="group.slide">Slide group together</option><option value="group.step">Step group pieces</option><option value="group.align">Align member bounds</option>
        </select></label>
        {groupKind==='group.align'?<label>Align axis<select aria-label="Group alignment axis" value={groupAxis} onChange={e=>setGroupAxis(e.target.value)}>
          <option value="x">X (across roll)</option><option value="y">Y (along roll)</option>
        </select></label>:<div className="exo-accu-prod-row">
          <label>Group ΔX (cm)<input aria-label="Marker group delta X" type="number" step=".1" value={groupDeltaX} onChange={e=>setGroupDeltaX(e.target.value)}/></label>
          <label>Group ΔY (cm)<input aria-label="Marker group delta Y" type="number" step=".1" value={groupDeltaY} onChange={e=>setGroupDeltaY(e.target.value)}/></label>
        </div>}
        <button type="button" disabled={groupKeys.length<2} onClick={commitGroupMove}>Commit group CUT placement with full collision and grain validation</button>
      </details>}
      {polygonReport?.ok&&polygonSource&&<details><summary>Physical cutting path study · plotter/cutter integration foundation</summary>
        <p>Computes measured CUT perimeter paths in millimetres with a 100 mm calibration reference, cut counts and travel estimates. This exports a machine-neutral review record only. No device protocol, knife compensation or cutter approval is implied.</p>
        <button type="button" onClick={()=>{
          const result=buildAccuMarkCutterPathStudy20261024(polygonReport,{
           fabricWidthCm:polygonSource.fabricWidth,spaceCm:polygonSource.gap,calibrationMm:100})
          setCutterStudy(result)
        }}>Inspect actual CUT geometry and perimeter</button>
        {cutterStudy&&<div role="status">
         <strong>{cutterStudy.ok?'Cutline study generated':'Cutline study blocked'}</strong>
         <p>{cutterStudy.ok?cutterStudy.totals.physicalCuts+' closed CUT paths · '+cutterStudy.totals.totalPerimeterMm.toFixed(1)+' mm perimeter':cutterStudy.code+': '+cutterStudy.reason}</p>
         {cutterStudy.ok&&<button type="button" onClick={()=>downloadQa('exo-cutter-geometric-study-NOT-MACHINE-READY.json',JSON.stringify(cutterStudy,null,2))}>Download non-machine-ready CUT path inspection</button>}
        </div>}
      </details>}
      {polygonReport?.ok&&polygonSource&&<AccuMarkMaterialRepeatControls20261024 key={JSON.stringify({pieces:polygonSource.project.pieces.map(p=>[p.id,p.cutQuantity,p.grainAngleDeg]),fabricWidth:polygonSource.fabricWidth})} project={{...polygonSource.project,pieces:polygonSource.project.pieces.filter(p=>(p.fabricId||'main')===fabricId)}} nesting={polygonReport} fabricWidthCm={polygonSource.fabricWidth} gapCm={polygonSource.gap}
         onApplyRepairedNest={adjusted=>{setPolygonReport(adjusted);setCutterStudy(null);setFailure('')}}/>}
    </details>
    <details><summary>Cut room order · rolls, plies and cut tickets</summary>
      <p>Enter one roll per line: ID, batch, shade, usable length cm, cost per metre. Optionally append dye lot, maximum ply count, and excluded defect ranges (e.g. 110-120|390-406 in cm). Lays never cross declared defects; mixed dye lots, conflicting shade/nap and insufficient clean contiguous fabric are blocked. These remain operator declarations, not factory-verified roll evidence.</p>
      <label>Fabric roll inventory<textarea aria-label="Cut room fabric rolls" rows={3} value={rollCsv} onChange={e=>{setRollCsv(e.target.value);setCutRoomReport(null)}}/></label>
      <label>Maximum ply count per lay<input type="number" aria-label="Maximum cut room ply count" min="1" max="1000" value={maxPly} onChange={e=>{setMaxPly(e.target.value);setCutRoomReport(null)}}/></label>
      <button type="button" onClick={planCutRoom}>Build validated cut room estimate</button>
      {cutRoomReport&&<div role="status">
        <strong>{cutRoomReport.ok?'Cut-room allocation computed · not approved':'Cut-room plan blocked'}</strong>
        {cutRoomReport.ok&&<p>{cutRoomReport.totals?.garments} garments · {cutRoomReport.totals?.lays} lays · {cutRoomReport.totals?.materialMeters} m total stock used ({cutRoomReport.totals?.unusableMaterialMeters} m unusable) · estimated cost {cutRoomReport.totals?.estimatedFabricCost}</p>}
        {cutRoomReport.issues?.map((i,index)=><p key={index}>{i.code}: {i.detail}</p>)}
        {cutRoomReport.ok&&<>
          <button type="button" onClick={()=>downloadQa('exo-cutroom-worksheet-NOT-APPROVED.txt',cutRoomReport.operatorWorksheet,'text/plain')}>Download operator worksheet</button>
          <button type="button" onClick={()=>downloadQa('exo-cutroom-tickets-NOT-APPROVED.json',JSON.stringify(cutRoomReport.manifest,null,2))}>Download cut tickets / roll allocation JSON</button>
        </>}
      </div>}
    </details>
    <div className="exo-accu-prod-row"><label>Printed horizontal ruler (mm)<input type="number" aria-label="Measured horizontal plot millimeters" value={measuredX} onChange={e=>setMeasuredX(e.target.value)}/></label><label>Printed vertical ruler (mm)<input type="number" aria-label="Measured vertical plot millimeters" value={measuredY} onChange={e=>setMeasuredY(e.target.value)}/></label></div>
    <button type="button" onClick={calibrate}>Validate 100 mm plot ruler</button>
    {calibration&&<p role="status">{calibration.ok?'Both plot axes within 0.5%':calibration.issues.map(i=>i.code).join(', ')}{Number.isFinite(calibration.errorXPct)?` · X ${calibration.errorXPct.toFixed(3)}% / Y ${calibration.errorYPct.toFixed(3)}%`:''}</p>}
   </fieldset>
  </details>
  <small>Research plot and marker preview only. Requires independent cutter/receiving CAD and physical operator approval.</small>
 </section>
}
