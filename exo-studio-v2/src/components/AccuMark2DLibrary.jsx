import React,{useMemo,useState} from 'react'
import {ACCUMARK_2D_COMMANDS} from '../core/accumark2dCommandRegistry.js'
import vendorToolIndex from '../../research/accumark-v10-playlist/ACCUMARK_TOOL_INDEX.json'
import AccuMarkGradeActions from './AccuMarkGradeActions.jsx'
import AccuMarkEngineeringControls from './AccuMarkEngineeringControls.jsx'
import AccuMarkConstraintControls from './AccuMarkConstraintControls.jsx'
import AccuMarkProductionControls from './AccuMarkProductionControls.jsx'
import AccuMarkFoundationStudio20261024 from './AccuMarkFoundationStudio20261024.jsx'
import AccuMarkCommandParityAudit20261024 from './AccuMarkCommandParityAudit20261024.jsx'
import AccuMarkCommandImplementationStudio20261024_1341 from './AccuMarkCommandImplementationStudio20261024_1341.jsx'
import AccuMarkGradeNestingCadWorkbench20261024 from './AccuMarkGradeNestingCadWorkbench20261024.jsx'
import AccuMarkDigitizingControls from './AccuMarkDigitizingControls.jsx'
import AccuMarkNamedRules from './AccuMarkNamedRules.jsx'
import AccuMarkPointLineControls from './AccuMarkPointLineControls.jsx'
import AccuMarkGradeMeasureChart from './AccuMarkGradeMeasureChart.jsx'
import AccuMarkGradeAxisControls from './AccuMarkGradeAxisControls.jsx'
import AccuMarkGradingPrecisionControls20261023 from './AccuMarkGradingPrecisionControls20261023.jsx'
import {AccuMarkJoinedEndControls20261023,AccuMarkGradedNotchDistanceControls20261023} from './AccuMarkJoinedNotchControls20261023.jsx'
import AccuMarkGradedNestPreview20261023 from './AccuMarkGradedNestPreview20261023.jsx'
import AccuMarkGradingQualityInspector20261023 from './AccuMarkGradingQualityInspector20261023.jsx'
import AccuMarkSewlineMismatchInspector20261023 from './AccuMarkSewlineMismatchInspector20261023.jsx'
import AccuMarkDraftingPrecisionInspector20261023 from './AccuMarkDraftingPrecisionInspector20261023.jsx'
import AccuMarkGradeAngleParallelInspector20261023 from './AccuMarkGradeAngleParallelInspector20261023.jsx'
import AdvancedCadCurveHandleControls20261024_1423 from './AdvancedCadCurveHandleControls20261024_1423.jsx'
import IndustrialGradedNotchCorrection20261024 from './IndustrialGradedNotchCorrection20261024.jsx'
import IndustrialAllowanceLinkEditor20261027 from './IndustrialAllowanceLinkEditor20261027.jsx'
import ModarisLinkedFacingStudy20261027 from './ModarisLinkedFacingStudy20261027.jsx'
import ModarisSeamWalkInspector20261027 from './ModarisSeamWalkInspector20261027.jsx'
import ModarisSizeLinkedGradeStudy20261027 from './ModarisSizeLinkedGradeStudy20261027.jsx'
import ModarisDerivedContourStudy20261027 from './ModarisDerivedContourStudy20261027.jsx'
import ModarisSeamTrueingStudy20261027 from './ModarisSeamTrueingStudy20261027.jsx'
import ModarisCurvedSeamTrueingStudy20261027 from './ModarisCurvedSeamTrueingStudy20261027.jsx'
import ModarisGradedNotchLinkStudy20261027 from './ModarisGradedNotchLinkStudy20261027.jsx'
import ModarisGradedCurvedNotchStudy20261027 from './ModarisGradedCurvedNotchStudy20261027.jsx'
import ModarisIndustrialSixSizeWitness20261027 from './ModarisIndustrialSixSizeWitness20261027.jsx'
import ModarisConnectedIndustrialDerivativeStudy20261027 from './ModarisConnectedIndustrialDerivativeStudy20261027.jsx'
import './AccuMark2DLibrary.css'

const CATEGORIES=['All','workspace','drafting','sewing','grading','verification','digitizing','marker','exchange','simulation']
const VENDOR_CATEGORIES=['All',...new Set(vendorToolIndex.items.map(item=>item.category))]
const GRADE_DOMAIN='grading'

/**
 * The command atlas exposes executable EXO actions and read-only vendor study
 * records separately. A reference-only command cannot mutate the garment.
 */
export default function AccuMark2DLibrary({
  disabled=false,selectedPiece,grading,previewSize,showGradeNest,project,focusedGradePoint=null,
  nativeMode=false,
  onSelectSize,onToggleNest,onSetRule,onClearRule,onError,onExecute,onApplyGrade,onApplyDraft,onApplyConstraint,onImportDigitized,onApplyProject,onApplyPointLine,onApplyGradeAxis,onEditGradeDelta,onApplyGradeBatch,onApplyJoinedGrade,onApplyGradedNotch,
}){
  const legacyDisabled=disabled||nativeMode
  const [open,setOpen]=useState(false)
  const [tab,setTab]=useState('grade')
  const [search,setSearch]=useState('')
  const [category,setCategory]=useState('All')
  const [expanded,setExpanded]=useState(null)
  const [focusOperation,setFocusOperation]=useState(null)
  const constraintDetails=React.useRef(null)
  const commands=useMemo(()=>ACCUMARK_2D_COMMANDS.filter(command=>{
    if(tab==='grade'&&command.domain!==GRADE_DOMAIN&&command.domain!=='verification')return false
    if(category!=='All'&&command.domain!==category)return false
    if(!search.trim())return true
    const text=[command.id,command.label,command.domain,command.purpose,...(command.sourceIds||[])].join(' ').toLowerCase()
    return text.includes(search.trim().toLowerCase())
  }),[search,category,tab])
  const references=useMemo(()=>vendorToolIndex.items.filter(item=>{
    if(category!=='All'&&item.category!==category)return false
    if(!search.trim())return true
    return [item.label,item.source_id,item.category,item.purpose].join(' ').toLowerCase().includes(search.trim().toLowerCase())
  }),[category,search])
  const selectTab=next=>{setTab(next);setSearch('');setCategory('All');setExpanded(null)}
  const run=(command)=>{
    if(disabled||command.route?.kind==='reference'||!command.implemented)return
    if(nativeMode&&!['tool','slot','inspector'].includes(command.route?.kind||'')){
      setExpanded(command.id)
      return
    }
    if(command.route?.kind?.startsWith('engineering-')){
      setFocusOperation(command.route.target||command.id)
      if(command.route.kind==='engineering-constraint'&&constraintDetails.current)constraintDetails.current.open=true
      setExpanded(command.id)
      return
    }
    onExecute?.(command)
    setExpanded(command.id)
  }
  return <div className="exo-accu-wrapper" data-accumark-tool-library="true">
    <button type="button" className="exo-accu-launch" aria-label="Open AccuMark tools and grading engineering library" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>TOOLS<span>33 / GRADE</span></button>
    {open&&<div className="exo-accu-library" role="dialog" aria-label="2D pattern function engineering tools" onKeyDown={event=>{if(event.key==='Escape'){setOpen(false);event.stopPropagation()}}}>
      <div className="exo-accu-header"><div><strong>2D TOOL ENGINEERING</strong><small>AccuMark research · EXO native commands</small></div><button type="button" aria-label="Close 2D tool library" onClick={()=>setOpen(false)}>×</button></div>
      {nativeMode&&<p role="status" style={{margin:'8px 12px',fontSize:12,lineHeight:1.5}}>Native Rust is active. This research library includes legacy EXO project operations and should not be assumed to edit the Rust garment. For native source CUTs use Seamly2D native import; for native markers use Production → Generate native CUT / nesting study.</p>}
      <div className="exo-accu-tabs" role="group" aria-label="AccuMark library view">
        <button type="button" aria-pressed={tab==='grade'} onClick={()=>selectTab('grade')}>Grading</button>
        <button type="button" aria-pressed={tab==='functions'} onClick={()=>selectTab('functions')}>33 functions</button>
        <button type="button" aria-pressed={tab==='foundation'} onClick={()=>selectTab('foundation')}>Foundation studio</button>
        <button type="button" aria-pressed={tab==='implementation'} onClick={()=>selectTab('implementation')}>New command tools</button>
        <button type="button" aria-pressed={tab==='advancedCad'} onClick={()=>selectTab('advancedCad')}>Advanced CAD</button>
        <button type="button" aria-pressed={tab==='productionLoop'} onClick={()=>selectTab('productionLoop')}>Grade · Nest · CAD</button>
        <button type="button" aria-pressed={tab==='parity'} onClick={()=>selectTab('parity')}>Command audit</button>
        <button type="button" aria-pressed={tab==='reference'} onClick={()=>selectTab('reference')}>116 references</button>
      </div>
      <div className="exo-accu-scroll" aria-label="Scrollable AccuMark engineering tools">
      {tab==='parity'&&<AccuMarkCommandParityAudit20261024/>}
      {tab==='foundation'&&<AccuMarkFoundationStudio20261024 project={project} disabled={disabled} nativeMode={nativeMode} onApplyProject={onApplyProject}/>}
      {tab==='implementation'&&<AccuMarkCommandImplementationStudio20261024_1341
        project={project} selectedPiece={selectedPiece} disabled={disabled} nativeMode={nativeMode} onApplyProject={onApplyProject}/>} 
      {tab==='advancedCad'&&<AdvancedCadCurveHandleControls20261024_1423
        project={project} piece={selectedPiece} disabled={legacyDisabled} onApplyProject={onApplyProject}/>}
      {tab==='advancedCad'&&<details className="exo-accu-constraint-box"
        data-linked-facing-reference-study="true">
        <summary>Modaris-style Linked Facing · Detached Reference Study</summary>
        <ModarisLinkedFacingStudy20261027 project={project} nativeMode={nativeMode}
          disabled={disabled}/>
      </details>}
      {tab==='advancedCad'&&<details className="exo-accu-constraint-box"
        data-modaris-connected-industrial-derivative="true">
        <summary>Modaris-style Six-Size Connected Rectangular Facing · Source-Revalidated Study</summary>
        <ModarisConnectedIndustrialDerivativeStudy20261027 project={project}
          nativeMode={nativeMode} disabled={disabled}/>
      </details>}
      {tab==='advancedCad'&&<details className="exo-accu-constraint-box"
        data-modaris-derived-contour-study="true">
        <summary>Modaris-style Inward Contour · Source-Linked Geometry Study</summary>
        <ModarisDerivedContourStudy20261027 project={project} nativeMode={nativeMode}
          disabled={disabled}/>
      </details>}
      {tab==='advancedCad'&&<details className="exo-accu-constraint-box"
        data-modaris-straight-seam-trueing="true">
        <summary>Modaris-style Straight Seam Trueing · Qualified Legacy Research</summary>
        <ModarisSeamTrueingStudy20261027 project={project} nativeMode={nativeMode}
          disabled={disabled} onApplyProject={onApplyProject}/>
      </details>}
      {tab==='advancedCad'&&<details className="exo-accu-constraint-box"
        data-modaris-curved-seam-trueing="true">
        <summary>Modaris-style Curved Seam Trueing · Qualified Quadratic Research</summary>
        <ModarisCurvedSeamTrueingStudy20261027 project={project} nativeMode={nativeMode}
          disabled={disabled} onApplyProject={onApplyProject}/>
      </details>}
      {tab==='productionLoop'&&<AccuMarkGradeNestingCadWorkbench20261024
        project={project} disabled={disabled} nativeMode={nativeMode} onApplyProject={onApplyProject}/>}
      <div style={tab==='foundation'||tab==='parity'||tab==='implementation'||tab==='productionLoop'||tab==='advancedCad'?{display:'none'}:undefined}>
      {tab==='grade'&&<div className="exo-accu-grade-editor">
        <AccuMarkGradeActions piece={selectedPiece} grading={grading} previewSize={previewSize}
          showGradeNest={showGradeNest} onSelectSize={onSelectSize} onToggleNest={onToggleNest}
          onSetRule={onSetRule} onClearRule={onClearRule} onError={onError} disabled={legacyDisabled}/>
      </div>}
      {tab==='grade'&&<details className="exo-accu-constraint-box" data-modaris-linked-grading-study="true">
        <summary>Modaris-style Source-Linked Grading · Multi-Size Research</summary>
        <ModarisSizeLinkedGradeStudy20261027 project={project} onApplyProject={onApplyProject}
          disabled={disabled} nativeMode={nativeMode}/>
      </details>}
      {tab==='grade'&&<details className="exo-accu-constraint-box" data-modaris-graded-notch-link-study="true">
        <summary>Modaris-style Source-Linked Graded Notches · Straight-Edge Research</summary>
        <ModarisGradedNotchLinkStudy20261027 project={project} onApplyProject={onApplyProject}
          disabled={disabled} nativeMode={nativeMode}/>
      </details>}
      {tab==='grade'&&<details className="exo-accu-constraint-box" data-modaris-curved-graded-notch-study="true">
        <summary>Modaris-style Graded Curved Notches · Physical Arclength Research</summary>
        <ModarisGradedCurvedNotchStudy20261027 project={project} onApplyProject={onApplyProject}
          disabled={disabled} nativeMode={nativeMode}/>
      </details>}
      {tab==='grade'&&<details className="exo-accu-constraint-box" data-modaris-industrial-six-size-witness="true">
        <summary>Modaris-style Six-Size CUT · STITCH · DXF Industrial Evidence</summary>
        <ModarisIndustrialSixSizeWitness20261027 project={project} disabled={disabled} nativeMode={nativeMode}/>
      </details>}
      {tab!=='reference'&&<AccuMarkEngineeringControls piece={selectedPiece} grading={grading}
        disabled={legacyDisabled} onApplyGrade={onApplyGrade} onApplyDraft={onApplyDraft} focusOperation={focusOperation}/>}
      {tab!=='reference'&&<AccuMarkPointLineControls piece={selectedPiece} disabled={legacyDisabled} onApply={onApplyPointLine}/>}
      {tab!=='reference'&&<AccuMarkGradeMeasureChart project={project} piece={selectedPiece} disabled={disabled}/>}
      {tab!=='reference'&&<AccuMarkGradeAxisControls project={project} piece={selectedPiece} disabled={legacyDisabled} onApply={onApplyGradeAxis}/>}
      {tab!=='reference'&&<AccuMarkGradingPrecisionControls20261023 project={project} piece={selectedPiece}
        focusedGradePoint={focusedGradePoint} previewSize={previewSize}
        disabled={legacyDisabled} onEditDelta={onEditGradeDelta} onCopyBatch={onApplyGradeBatch}/>}
      {tab!=='reference'&&<AccuMarkJoinedEndControls20261023 project={project} piece={selectedPiece}
        disabled={legacyDisabled} onApply={onApplyJoinedGrade}/>}
      {tab!=='reference'&&<AccuMarkGradedNotchDistanceControls20261023 project={project} piece={selectedPiece}
        disabled={legacyDisabled} onApply={onApplyGradedNotch}/>}
      {tab!=='reference'&&<IndustrialGradedNotchCorrection20261024 project={project} disabled={disabled} nativeMode={nativeMode} onApplyProject={onApplyProject}/>}
      {tab!=='reference'&&<AccuMarkGradedNestPreview20261023 project={project} piece={selectedPiece} disabled={legacyDisabled}/>}
      {tab!=='reference'&&<AccuMarkGradingQualityInspector20261023 project={project} selectedPieceId={selectedPiece?.id}/>}
      {tab!=='reference'&&<AccuMarkSewlineMismatchInspector20261023 project={project} selectedPieceId={selectedPiece?.id}/>}
      {tab==='grade'&&<details className="exo-accu-constraint-box" data-modaris-grade-seamwalk="true">
        <summary>Advanced Seam Walk · Matched Physical Stations (Legacy 2D)</summary>
        <ModarisSeamWalkInspector20261027 project={project} nativeMode={nativeMode} disabled={disabled}/>
      </details>}
      {tab!=='reference'&&<AccuMarkDraftingPrecisionInspector20261023 project={project} selectedPieceId={selectedPiece?.id}/>}
      {tab!=='reference'&&<AccuMarkGradeAngleParallelInspector20261023 project={project} piece={selectedPiece}/>}
      {tab!=='reference'&&<AccuMarkNamedRules project={project} piece={selectedPiece} disabled={legacyDisabled} onApplyProject={onApplyProject}/>}
      {tab==='grade'&&<details data-linked-industrial-allowance-tool="true" className="exo-accu-constraint-box">
        <summary>Linked Seam Values · Source → Target Edge (Legacy 2D)</summary>
        <IndustrialAllowanceLinkEditor20261027 project={project} nativeMode={nativeMode}
          disabled={disabled} onApplyProject={onApplyProject}/>
      </details>}
      {tab!=='reference'&&<div className="exo-accu-constraint-box"><details ref={constraintDetails}><summary>Match Line · Keep Angle · Parallel · Intersection</summary>
        <AccuMarkConstraintControls selectedPiece={selectedPiece} grading={grading} allPieces={project?.pieces||[]}
          onApply={onApplyConstraint} disabled={legacyDisabled} focusOperation={focusOperation}/>
      </details></div>}
      {tab!=='reference'&&<AccuMarkProductionControls project={project} disabled={legacyDisabled} focusOperation={focusOperation}/>}
      {tab==='functions'&&<div className="exo-accu-digitizing-box"><details><summary>Digitizing · calibrated manual contour</summary>
        <AccuMarkDigitizingControls project={project} onImport={onImportDigitized} disabled={legacyDisabled}/>
      </details></div>}
      <div className="exo-accu-filters">
        <input type="search" aria-label="Search 2D engineering tools" placeholder="Find a tool or function…" value={search} onChange={event=>setSearch(event.target.value)}/>
        {tab!=='grade'&&<select aria-label="Filter 2D tool category" value={category} onChange={event=>setCategory(event.target.value)}>{(tab==='reference'?VENDOR_CATEGORIES:CATEGORIES).map(c=><option key={c} value={c}>{c==='All'?'All functions':c}</option>)}</select>}
      </div>
      <div className="exo-accu-count" role="status">{tab==='reference'?references.length:commands.length} indexed {tab==='reference'?'vendor topics':'engineering functions'} · Live actions use the EXO engine</div>
      <div className="exo-accu-results">
        {tab!=='reference'&&commands.map(command=>{
          const available=Boolean(command.implemented&&command.route?.kind!=='reference'&&(!nativeMode||['tool','slot','inspector'].includes(command.route.kind)))
          const active=expanded===command.id
          return <article className="exo-accu-command" key={command.id} data-accumark-command={command.id}>
            <div className="exo-accu-command-heading"><button type="button" className="exo-accu-command-title" aria-expanded={active} onClick={()=>setExpanded(active?null:command.id)}><strong>{command.label}</strong><small>{command.domain} · {command.id}</small></button><span className={available?'exo-accu-available':'exo-accu-reference'}>{available?(command.route.kind.startsWith('engineering-')?'LIMITED EXO TOOL':'EXO ACTION'):'REFERENCE'}</span></div>
            {active&&<div className="exo-accu-engineering"><p>{command.purpose}</p>
              {[
                ['Inputs',command.engineering?.inputs],['Engine steps',command.engineering?.steps],
                ['Outputs',command.engineering?.outputs],['Geometry checks',command.engineering?.invariants],
                ['Verification',command.engineering?.tests],['Existing code',command.engineering?.exoModules],
              ].map(([label,values])=><div key={label}><strong>{label}</strong><span>{values?.join(' · ')||'Not recorded'}</span></div>)}
            </div>}
            <div className="exo-accu-command-actions">
              {available?<button type="button" disabled={disabled} onClick={()=>run(command)}>{command.route?.kind==='toggle-nest'?'Toggle size nest':command.route?.kind==='tool'?'Activate tool':command.route?.kind==='slot'?'Activate CAD tool':'Open / run'}</button>:<span>{nativeMode&&command.implemented?'Legacy EXO only · not native Rust':'Engine interface pending'}</span>}
              {command.helpUrl&&<a href={command.helpUrl} target="_blank" rel="noopener noreferrer" title="AccuMark vendor documentation">Official help</a>}
              {command.sourceIds?.length>0&&<small>{command.sourceIds.slice(0,3).join(' · ')}</small>}
            </div>
          </article>
        })}
        {tab==='reference'&&references.map(item=><article className="exo-accu-command" key={item.source_id}>
          <div className="exo-accu-command-heading"><div><strong>{item.label}</strong><small>{item.source_id} · {item.tool_type}</small></div><span className="exo-accu-reference">DOCUMENTED</span></div>
          <div className="exo-accu-command-actions"><a href={item.official_url} target="_blank" rel="noopener noreferrer">Read vendor help</a><span>{item.engineering_function_ids?.length||0} mapped functions</span></div>
        </article>)}
        {((tab==='reference'&&references.length===0)||(tab!=='reference'&&commands.length===0))&&<p role="status">No matching commands. Try another search.</p>}
      </div>
      </div>
      </div>
      <footer>Engineering study references and working EXO tools are labeled separately. Digital checks do not constitute factory approval.</footer>
    </div>}
  </div>
}
