import React, {useEffect, useRef, useState} from 'react'
import {ChevronDown, ChevronRight, Eye, ImagePlus, Pencil, Trash2} from 'lucide-react'
import CloObjectPropertyFields from './CloObjectPropertyFields.jsx'
import CloEditableIdentity from './CloEditableIdentity.jsx'
import NativeFabricAppearanceEditor from './NativeFabricAppearanceEditor.jsx'
import FabricFileToolbar from './FabricFileToolbar.jsx'
import {resolveCloDraftTarget} from '../core/cloPropertyCommands.js'
import {CLO_LENGTH_UNITS,fromCentimetres,toCentimetresValue,formatPropertyLength} from '../core/cloPropertyUnits.js'
import {getHardwarePreset} from '../data/hardwarePresets.js'
import {resolveHardwareStyle} from '../core/hardwareStyleProperties.js'
import HardwareStyleEditor from './HardwareStyleEditor.jsx'
import PatternReferencePanel20261025 from './PatternReferencePanel20261025.jsx'
import CloButtonShapeEditor from './CloButtonShapeEditor.jsx'
import ZipperMaterialPreview from './ZipperMaterialPreview.jsx'
import './CloPropertyEditorAccordion.css'
import './CloPropertyEditorGray.css'

// Mirror the grouping of CLO's context-sensitive pattern Property Editor.
// This is an EXO UI shell. A setting is editable only when its underlying
// native/project command really exists; Bond and Solidify are not fake toggles.
export const CLO_PROPERTY_GROUPS = [
  ['information','Information'],
  ['selected-line','Selected Line'],
  ['simulation','Simulation Properties'],
  ['fabric','Fabric'],
  ['bond','Bond'],
  ['solidify','Solidify'],
  ['arrange','Arrange'],
  ['miscellaneous','Miscellaneous'],
]

// These are real selection classes, not extra accordion headings shown for
// every pattern. CLO's Fabric asset and a fabric assigned to a pattern have
// different editors; the same is true of topstitch and hardware instances.
const CONTEXT_GROUPS={
  fabric:[['information','Information'],['material','Material'],['physical','Physical Property'],['fabric','Fabric Library & Texture'],['miscellaneous','Miscellaneous']],
  sewing:[['information','Information'],['sewing','Sewing'],['miscellaneous','Miscellaneous']],
  button:[['information','Information'],['button','Shape'],['button-material','Material'],['position','2D Placement'],['miscellaneous','Miscellaneous']],
  zipper:[['information','Information'],['zipper-style','Zipper Style'],['zipper-mechanics','Fastening & Sliders'],['zipper-extension','Start & End Extension'],['zipper-specification','Chain, Tape & Dimensions'],['zipper-material','Component Materials & Colors'],['zipper-reflection','Lighting & Reflection'],['miscellaneous','Miscellaneous']],
  hardware:[['information','Information'],['hardware','Shape & Specifications'],['hardware-material','Material · Basic Parameters & Reflection'],['construction','Construction & Placement']],
  buttonhole:[['information','Information'],['buttonhole','Buttonhole'],['buttonhole-material','Thread Material & Reflection'],['position','2D Placement'],['miscellaneous','Miscellaneous']],
  binding:[['information','Information'],['binding','Binding Width & Construction'],['binding-material','Binding Material & Reflection'],['miscellaneous','Miscellaneous']],
  fastener:[['information','Information'],['fastener','Fastener Pair & Closure'],['miscellaneous','Miscellaneous']],
  topstitch:[['information','Information'],['topstitch','Stitch'],['miscellaneous','Miscellaneous']],
  graphic:[['information','Information'],['graphic','Graphic'],['position','2D Placement'],['miscellaneous','Miscellaneous']],
  avatar:[['information','Information'],['miscellaneous','Miscellaneous']],
  grading:[['information','Information'],['grading','Grading'],['miscellaneous','Miscellaneous']],
  pom:[['information','Information'],['pom','POM'],['miscellaneous','Miscellaneous']],
  puckering:[['information','Information'],['puckering','Puckering'],['miscellaneous','Miscellaneous']],
}

const EDITOR_GROUP_FOR_SECTION = {
  Pattern:'arrange',
  Sewing:'selected-line',
  Fit:'simulation',
  Fabric:'fabric',
  Render:'miscellaneous',
  Avatar:'miscellaneous',
  Production:'miscellaneous',
}

function Readout({label,value}) {
  return <div className="clo-pe-readout"><span>{label}</span><strong>{value ?? '—'}</strong></div>
}

function FabricMapRow({label,kind,src,onChoose,onRemove,editable=false}) {
  const hasMap=typeof src==='string'&&src.length>0
  const [expanded,setExpanded]=useState(false)
  const previewId=`clo-fabric-${kind}-map-preview`
  return <div className="clo-pe-fabric-map-entry" data-fabric-map={kind}>
    <div className="clo-pe-fabric-map-row">
      <button type="button" className="clo-pe-fabric-map-label" aria-expanded={expanded}
        aria-controls={previewId} onClick={()=>setExpanded(value=>!value)}
        aria-label={`Show ${label.toLowerCase()} details`} title={`Show ${label.toLowerCase()} details`}>
        {expanded?<ChevronDown size={12}/>:<ChevronRight size={12}/>}<span>{label}</span>
        {hasMap&&<img className="clo-pe-fabric-map-thumb" alt="" src={src}/>}
      </button>
      <div className="clo-pe-fabric-map-actions" aria-label={`${label} controls`}>
        <button type="button" disabled={!editable} onClick={()=>onChoose?.(kind)}
          title={editable?`Choose ${label.toLowerCase()} image`:'Native image map assignment is unavailable'}
          aria-label={`Choose map for ${label}`}><ImagePlus size={12}/></button>
        <button type="button" disabled={!hasMap} onClick={()=>setExpanded(value=>!value)}
          aria-label={`Preview map for ${label}`} aria-expanded={expanded} aria-controls={previewId}
          title={hasMap?`Preview ${label.toLowerCase()} image`:'No image assigned'}><Eye size={12}/></button>
        <button type="button" disabled={!editable||!hasMap} onClick={()=>onChoose?.(kind)}
          title="Replace the assigned image map" aria-label={`Replace map for ${label}`}><Pencil size={12}/></button>
        <button type="button" disabled={!editable||!hasMap} onClick={()=>{setExpanded(false);onRemove?.(kind)}}
          title="Remove the assigned image map" aria-label={`Remove map for ${label}`}><Trash2 size={12}/></button>
      </div>
    </div>
    <div id={previewId} className="clo-pe-fabric-map-preview" hidden={!expanded}>
      {hasMap?<><img src={src} alt={`${label} assigned material map preview`}/>
        <span>Assigned image · shares the fabric’s grain-aligned texture mapping</span></>
        :<span>No {label.toLowerCase()} image assigned{editable?'. Use Choose to import a PNG, JPEG, or WebP.':'.'}</span>}
    </div>
  </div>
}

export default function CloPropertyEditorAccordion({
  activeSection,selectedPiece,project,fabric,clothcraftHybrid,clothcraftLive,
  selectedArea,onSwitchSection,onShowFabric,onSimulate,onReset,onSetLineTarget,objectTab='Scene',draftLineSelection,objectSelection,onPropertyEdit,onNativePropertyEdit,onSelectNativeSeam,onPlaceHardwarePreset,onPairZipperToSeam,onHardwareStyleEdit,onFabricTextureRepeatChange,onFabricMapChoose,onFabricMapRemove,onFabricPresetImport,onFabricSelect,
  referenceProjectKey=null,referenceItems=[],onReferenceChange,selectedReferenceId=null,onReferenceSelect,
  children,
}) {
  const accessoryKinds=['button','buttonhole','zipper','binding','fastener','topstitch','puckering']
  const accessoryTab=accessoryKinds.includes(String(objectTab).toLowerCase())
    ? String(objectTab).toLowerCase():null
  const selectedDraftAccessory=objectSelection?.source==='draft' &&
    accessoryKinds.includes(String(objectSelection.type).toLowerCase())
  const selection=clothcraftHybrid?clothcraftLive?.selection:null
  const nativeLine=clothcraftHybrid?(selection?.kind==='line'?selection:null):draftLineSelection
  const nativeSewing=selection?.kind==='sewing'?selection:null
  const nativePattern=selection?.kind==='pattern'?selection:null
  const referencedNativePanel=clothcraftLive?.panelRefs?.find(p=>p.id===nativePattern?.panelId)
  const nativeObject=clothcraftHybrid&&objectSelection?.source==='native'
    ? (objectSelection.type==='fabric'
      ?clothcraftLive?.fabricRefs?.find(f=>f.id===objectSelection.id)||objectSelection
      :clothcraftLive?.panelRefs?.find(p=>p.id===objectSelection.id)||objectSelection)
    :clothcraftHybrid&&activeSection==='Fabric'&&objectTab==='Fabric'
      ?clothcraftLive?.fabricRefs?.[0]||null:null
  const selectedObjectKind=objectSelection?.source==='library'?'hardware':selectedDraftAccessory
    ?String(objectSelection.type).toLowerCase():clothcraftHybrid && accessoryTab && !objectSelection
      ?accessoryTab:clothcraftHybrid
    ? nativeObject?.type?.toLowerCase() || (objectTab==='Fabric'&&activeSection==='Fabric'?'none'
      : nativeLine?'line':nativeSewing?'sewing':nativePattern?'pattern':'none')
    : (objectSelection?.type==='Scene'&&objectSelection?.pieceId?'pattern':objectSelection?.type?.toLowerCase())
      ||(accessoryTab && !objectSelection ? accessoryTab :null)
      ||(activeSection==='Production'&&['Grading','POM'].includes(objectTab)?objectTab.toLowerCase():null)
      ||(selectedPiece&&objectTab==='Scene'?'pattern':'none')
  const visibleGroups=selectedObjectKind==='none'?[]:CONTEXT_GROUPS[selectedObjectKind] || (selectedObjectKind==='pattern'||selectedObjectKind==='line'||selectedObjectKind==='project'
      ? CLO_PROPERTY_GROUPS
      : CLO_PROPERTY_GROUPS.filter(([id])=>['information','miscellaneous'].includes(id)))
  const draftSelection=(!clothcraftHybrid||selectedDraftAccessory)?(objectSelection?.type==='Scene'&&objectSelection.pieceId
    ? {...objectSelection,type:'pattern'}
    : objectSelection|| (selectedPiece ? {type:'pattern',id:selectedPiece.id,pieceId:selectedPiece.id,name:selectedPiece.name}:null)):null
  const draftObject=resolveCloDraftTarget(project,draftSelection)
  const hardwarePreset=getHardwarePreset(objectSelection?.source==='library'?objectSelection.id:draftObject?.hardwarePresetId)
  const selectedHardwareStyle=objectSelection?.source==='library'?resolveHardwareStyle(project,objectSelection.id):null
  const propertySubject=(selectedDraftAccessory?objectSelection.name:null)||(objectSelection?.source==='library'?objectSelection.name:null)||nativeObject?.name||
    (accessoryTab && !objectSelection ? `Choose a ${objectTab.toLowerCase()} · EXO draft`:null)||
    (clothcraftHybrid?(selection?.panelName||'Select a pattern or fabric')
      :(draftObject?.name||objectSelection?.name||selectedPiece?.name||'Select an object'))
  const identityKind=selectedObjectKind==='fabric'?'Fabric':selectedObjectKind==='pattern'?'Pattern Piece':
    selectedObjectKind==='line'?'Pattern Line':selectedObjectKind==='sewing'?'Sewing':
    selectedObjectKind==='none'?'':selectedObjectKind[0].toUpperCase()+selectedObjectKind.slice(1)
  const identityId=nativeObject?.id||nativePattern?.panelId||selection?.panelId||draftSelection?.id||selectedPiece?.id||null
  const identityName=nativeObject?.name||nativePattern?.panelName||selection?.panelName||draftObject?.name||objectSelection?.name||null
  const identityItemNo=nativeObject?.itemNo??referencedNativePanel?.itemNo??nativePattern?.itemNo??draftObject?.itemNo??''
  const commitIdentity=(field,value)=>{
    if(clothcraftHybrid){
      if(!identityId||!['pattern','fabric'].includes(selectedObjectKind))return {ok:false,error:'Select a native pattern or fabric'}
      return onNativePropertyEdit?.({kind:selectedObjectKind,id:identityId,field,value,revision:clothcraftLive?.revision})
        ||{ok:false,error:'Native editor unavailable'}
    }
    if(!draftSelection||!['pattern','fabric'].includes(selectedObjectKind))return {ok:false,error:'Select a pattern or fabric'}
    return onPropertyEdit?.(draftSelection,field,value)||{ok:false,error:'Editor unavailable'}
  }
  // A selected Fabric asset has CLO-style Material and Physical Property
  // accordions, not the generic Pattern "Fabric" accordion. Attach EXO's
  // existing live fabric controls to that visible Physical Property region.
  // Otherwise they were silently portaled into hidden Miscellaneous when
  // switching from the 400-fabric catalog, making the inspector look empty.
  // The embedded advanced editor must live in a group that belongs to the
  // selected object's schema. A Sewing selection, for example, has a Sewing
  // group rather than the Pattern-only Selected Line group; the old mapping
  // silently buried its actual controls in Miscellaneous.
  const defaultContextGroup=selectedObjectKind==='grading'?'grading'
    :selectedObjectKind==='pom'?'pom'
    :selectedObjectKind==='fabric'?'physical'
    :selectedObjectKind==='sewing'?'sewing'
    :EDITOR_GROUP_FOR_SECTION[activeSection]||'miscellaneous'
  const contextGroup=visibleGroups.some(([id])=>id===defaultContextGroup)
    ?defaultContextGroup
    :visibleGroups.find(([id])=>id===selectedObjectKind)?.[0]
      ||visibleGroups.find(([id])=>!['information','miscellaneous'].includes(id))?.[0]
      ||'miscellaneous'
  const [open,setOpen]=useState(()=>['information'])
  const [materialDetails,setMaterialDetails]=useState({basic:true,reflection:true})
  const [materialFace,setMaterialFace]=useState('front')
  const [buttonMaterialPart,setButtonMaterialPart]=useState('button')
  const toggleMaterialDetail=key=>setMaterialDetails(previous=>({...previous,[key]:!previous[key]}))
  const [lengthUnit,setLengthUnit]=useState('cm')
  useEffect(()=>{
    // The little selected-line number in CLO's Property Editor and the Pen
    // drafting label must use the SAME display units. Rust geometry stays SI.
    const sync=event=>{
      const unit=event?.detail?.unit||document.querySelector('.cc-board')?.dataset.penUnit
      if(CLO_LENGTH_UNITS.includes(unit))setLengthUnit(unit)
    }
    window.addEventListener('exo-clothcraft-pen-unit-changed',sync)
    sync()
    return()=>window.removeEventListener('exo-clothcraft-pen-unit-changed',sync)
  },[])
  const length=cm=>formatPropertyLength(cm,lengthUnit)
  const previousSection=useRef(activeSection)
  useEffect(()=>{
    // Start compact like CLO's category accordion. When the user actually
    // changes workspaces, reveal its relevant advanced fields automatically.
    // Keeping collapsed bodies mounted preserves PatternEditor's portal host.
    if(previousSection.current===activeSection)return
    previousSection.current=activeSection
    setOpen(previous=>previous.includes(contextGroup)?previous:[...previous,contextGroup])
  },[activeSection,contextGroup])
  useEffect(()=>{
    if(activeSection!=='Fabric'||selectedObjectKind!=='fabric')return
    setOpen(previous=>previous.includes('physical')?previous:[...previous,'physical'])
  },[activeSection,selectedObjectKind,fabric?.id])
  const toggle=id=>setOpen(previous=>previous.includes(id)?previous.filter(item=>item!==id):[...previous,id])
  useEffect(()=>{
    // CLO changes its Property Editor schema with the selection, not merely
    // with the top-level workspace tab. Never reuse stale expanded pattern
    // controls for a newly selected Fabric (or vice versa).
    if(selectedObjectKind==='fabric')setOpen(['information','material','physical','fabric'])
    else if(selectedObjectKind==='pattern')setOpen(['information',contextGroup])
    else if(selectedObjectKind==='grading'||selectedObjectKind==='pom')setOpen(['information',selectedObjectKind])
    else if(selectedObjectKind==='line')setOpen(['information','selected-line'])
    else if(selectedObjectKind==='sewing')setOpen(['information','sewing'])
    else if(selectedObjectKind==='button')setOpen(['information','button','button-material','position'])
    else if(selectedObjectKind==='zipper')setOpen(['information','zipper-style','zipper-mechanics','zipper-extension','zipper-specification','zipper-material','zipper-reflection'])
    else if(selectedObjectKind==='binding')setOpen(['information','binding','binding-material'])
    else if(selectedObjectKind==='fastener')setOpen(['information','fastener'])
    else if(selectedObjectKind==='hardware')setOpen(['information','hardware','hardware-material','construction'])
    else if(selectedObjectKind==='topstitch'||selectedObjectKind==='puckering'||selectedObjectKind==='buttonhole')
      setOpen(['information',selectedObjectKind,...(selectedObjectKind==='buttonhole'?['buttonhole-material','position']:[])])
    else if(selectedObjectKind==='none')setOpen(['information'])
    else setOpen(['information'])
  },[selectedObjectKind,identityId,objectTab])
  useEffect(()=>setMaterialFace('front'),[selectedObjectKind,identityId])
  useEffect(()=>{
    if(nativeLine)setOpen(previous=>previous.includes('selected-line')?previous:[...previous,'selected-line'])
  },[nativeLine?.panelId,nativeLine?.edgeId])
  useEffect(()=>{
    if(!objectSelection)return
    const relevant={fabric:'material',button:'button',zipper:'zipper-mechanics',hardware:'hardware',buttonhole:'buttonhole',binding:'binding',fastener:'fastener',topstitch:'topstitch',graphic:'graphic',grading:'grading',pom:'pom',puckering:'puckering'}[selectedObjectKind]
    if(relevant)setOpen(previous=>previous.includes(relevant)?previous:[...previous,relevant])
  },[objectSelection?.id,selectedObjectKind])
  const selectedSeams=selectedPiece
    ? (project?.seams||[]).filter(seam=>seam.a?.pieceId===selectedPiece.id||seam.b?.pieceId===selectedPiece.id).length
    : 0
  const selectedFabric=selectedPiece?.fabricId
    ? project?.fabrics?.[selectedPiece.fabricId]
    : fabric
  // The Rust workspace serializes commands. A color edit immediately after a
  // slider commit must queue behind it, even when metadata snapshots update
  // before the previous command's response reaches the Property Editor.
  const nativeAppearanceQueue=useRef(Promise.resolve())
  const changeNativeAppearance=(field,value)=>{
    if(!clothcraftHybrid||selectedObjectKind!=='fabric'||!nativeObject?.id)
      return Promise.resolve({ok:false,error:'Select a native Fabric asset first'})
    const details={kind:'fabric',id:nativeObject.id,field:`appearance.${materialFace==='front'?'':`${materialFace}.`}${field}`,value,
      revision:clothcraftLive?.revision}
    const next=nativeAppearanceQueue.current.catch(()=>{}).then(()=>
      onNativePropertyEdit?.(details)||{ok:false,error:'Native Fabric appearance editor is unavailable'})
    nativeAppearanceQueue.current=next
    return next
  }

  const overview=id=>{
    switch(id){
      case 'information':
        return <>
          {['pattern','fabric'].includes(selectedObjectKind)&&<>
            <CloEditableIdentity field="name" label="Name" value={identityName||''}
              kind={selectedObjectKind} objectId={identityId||'none'}
              editable={Boolean(identityId)} onCommit={commitIdentity}/>
            <CloEditableIdentity field="itemNo" label="Item No." value={identityItemNo}
              kind={selectedObjectKind} objectId={identityId||'none'}
              editable={Boolean(identityId)} onCommit={commitIdentity}/>
            {selectedObjectKind!=='fabric'&&<CloEditableIdentity field="type" label="Type" value={identityKind}
              kind={selectedObjectKind} objectId={identityId||'none'} editable={false}/>}
          </>}
          {!['pattern','fabric'].includes(selectedObjectKind)&&<>
            <Readout label="Name" value={propertySubject}/>
            <Readout label="Type" value={selectedObjectKind==='line'?'Pattern Line':selectedObjectKind==='pattern'?'Pattern Piece':selectedObjectKind==='project'?'Garment Project':selectedObjectKind[0].toUpperCase()+selectedObjectKind.slice(1)}/>
            <Readout label="Item No." value={objectSelection?.id||(clothcraftHybrid?(selection?.edgeId||selection?.panelId||'—'):(selectedPiece?.id||'—'))}/>
            <Readout label="Pattern Pieces" value={clothcraftHybrid?(clothcraftLive?.panels??'Loading'):(project?.pieces?.length??0)}/>
            {!clothcraftHybrid&&selectedPiece&&<Readout label="Area" value={`${selectedArea.toFixed(1)} cm²`}/>}
          </>}
          {nativePattern&&selectedObjectKind==='pattern'&&<><Readout label="2D Perimeter" value={length(nativePattern.length2DCm)}/><Readout label="3D Perimeter" value={length(nativePattern.length3DCm)}/><Readout label="Boundary Count" value={nativePattern.edgeCount}/></>}
          {draftObject&&<CloObjectPropertyFields group="information" selection={draftSelection} project={project}
            onEdit={onPropertyEdit} omitFields={['pattern','fabric'].includes(selectedObjectKind)?['name','itemNo']:['itemNo']}/>}
          {hardwarePreset&&<><Readout label="Style" value={hardwarePreset.name}/><Readout label="Category" value={hardwarePreset.kind}/><Readout label="Finish" value={hardwarePreset.finish}/></>}
          {selectedObjectKind==='fabric'&&clothcraftHybrid&&['construction','supplier','owner'].map(field=>
            <CloEditableIdentity key={field} field={field}
              label={field==='construction'?'Construction':field==='supplier'?'Supplier':'Owner'}
              value={nativeObject?.[field]||''}
              kind="fabric" objectId={identityId||'none'} editable={Boolean(identityId)}
              onCommit={commitIdentity}/>)}
          {clothcraftHybrid&&selectedDraftAccessory&&<p className="clo-pe-note">EXO draft construction annotation. These appearance properties are saved with the EXO draft; buttons, zippers and puckering do not create physical hardware or puckering forces in the live Rust cloth solver.</p>}
          {clothcraftHybrid&&!selectedDraftAccessory&&objectSelection?.source!=='library'&&<p className="clo-pe-note">Native records are edited in ClothCraft; EXO draft values are not substituted. Object Type is structural and cannot be changed with a text edit.</p>}
        </>
      case 'selected-line':
        return <>
          <Readout label="Selected Pattern" value={clothcraftHybrid?(selection?.panelName||'No pattern selected'):(selectedPiece?.name||'No pattern selected')}/>
          <Readout label="Selected Line" value={nativeLine?.edgeId||'Select a line in the 2D or 3D view'}/>
          <Readout label="2D Line Length" value={length(nativeLine?.length2DCm)}/>
          <Readout label="3D Line Length" value={length(nativeLine?.length3DCm)}/>
          <Readout label="3D Stretch" value={nativeLine?.elongationPercent!=null?`${nativeLine.elongationPercent>=0?'+':''}${nativeLine.elongationPercent.toFixed(2)}%`:'—'}/>
          <Readout label="Sewing Links" value={nativeLine?(Array.isArray(nativeLine.seamIds)?nativeLine.seamIds.join(', ')||'None':'—'):selectedSeams}/>
          {nativeLine&&<form className="clo-pe-line-target" onSubmit={event=>{event.preventDefault();const value=toCentimetresValue(Number(event.currentTarget.elements.namedItem('targetLength')?.value),lengthUnit);if(Number.isFinite(value)&&value>=0.01&&value<=1000&&nativeLine.source==='rust')onSetLineTarget?.(nativeLine.panelId,nativeLine.edgeId,value)}}>
            <label htmlFor="clo-pe-target-length">Target 2D length ({lengthUnit})</label>
            <input id="clo-pe-target-length" key={`${nativeLine.panelId}:${nativeLine.edgeId}:${nativeLine.revision}:${lengthUnit}`} name="targetLength" type="number" min={fromCentimetres(.01,lengthUnit)} max={fromCentimetres(1000,lengthUnit)} step="any" defaultValue={fromCentimetres(nativeLine.targetLengthCm??nativeLine.length2DCm,lengthUnit)?.toFixed(lengthUnit==='in'?3:lengthUnit==='mm'?1:2)||''} disabled={nativeLine.source!=='rust'||!onSetLineTarget}/>
            <button type="submit" disabled={nativeLine.source!=='rust'||!onSetLineTarget}>SET LENGTH SPEC</button>
          </form>}
          <div className="clo-pe-line-settings" aria-label="Elastic and seam taping properties">
            <div className="clo-pe-line-subheading">ELASTIC</div>
            <label><span>Elastic</span><input type="checkbox" disabled aria-label="Elastic physical simulation not yet implemented"/></label>
            <Readout label="Strength" value="10 (not simulated)"/>
            <Readout label="Ratio" value="100% (not simulated)"/>
            <Readout label="Segment Length" value={length(nativeLine?.length2DCm)}/>
            <div className="clo-pe-line-subheading">SEAM TAPING</div>
            <label><span>Seam Taping</span><input type="checkbox" disabled aria-label="Seam taping physical simulation not yet implemented"/></label>
            <Readout label="Width" value="— mm"/>
            <Readout label="Preset" value="Not assigned"/>
            <Readout label="Extend" value="None"/>
          </div>
          <p className="clo-pe-note">{nativeLine?.source==='rust'?'2D and 3D lengths come from the same selected Rust boundary, using pattern UVs and live simulated vertices. The editable target length is a drafting specification, not an elastic force.':'2D length comes from the selected EXO draft segment. A corresponding measured 3D simulated boundary is not yet mapped, so no 3D length is invented.'} Elastic and Seam Taping have no physical Rust solver support yet.</p>
          {activeSection!=='Sewing'&&<button className="clo-pe-action" onClick={()=>onSwitchSection('Sewing')}>OPEN SEWING PROPERTIES</button>}
        </>
      case 'sewing':
        return <>
          <Readout label="Sewing Relationship" value={nativeSewing?.seamId||'Select sewing in the native seam list'}/>
          {nativeSewing&&<>
            <Readout label="First Edge" value={`${nativeSewing.first.panel} · ${nativeSewing.first.edge}`}/>
            <Readout label="First 2D Line Length" value={length(nativeSewing.first.length2DCm)}/>
            <Readout label="First 3D Line Length" value={length(nativeSewing.first.length3DCm)}/>
            <Readout label="Second Edge" value={`${nativeSewing.second.panel} · ${nativeSewing.second.edge}`}/>
            <Readout label="Second 2D Line Length" value={length(nativeSewing.second.length2DCm)}/>
            <Readout label="Second 3D Line Length" value={length(nativeSewing.second.length3DCm)}/>
            <Readout label="Measured 3D Seam Gap" value={nativeSewing.gapMm!=null?`${nativeSewing.gapMm.toFixed(2)} mm`:'Not simulated'}/>
            <Readout label="Reverse Orientation" value={nativeSewing.reversed?'Yes':'No'}/>
            <Readout label="Ease Allowed" value={nativeSewing.allowEase?'Yes':'No'}/>
            <Readout label="Native Seam Stiffness" value={nativeSewing.nativeStiffnessNPerM2!=null?`${nativeSewing.nativeStiffnessNPerM2.toFixed(0)} N/m²`:'—'}/>
          </>}
          <div className="clo-pe-line-settings"><div className="clo-pe-line-subheading">SEWING TENSION</div>
          <Readout label="Strength" value="Not implemented"/><Readout label="Ratio" value="Not implemented"/>
          <div className="clo-pe-line-subheading">FOLD</div><Readout label="Turned" value="Not implemented"/>
          <Readout label="Fold Angle" value="Not implemented"/><Readout label="Fold Strength" value="Not implemented"/></div>
          <p className="clo-pe-note">Native Rust reports real paired sewing lengths, seam geometry and correspondence. CLO-style tension and fold controls require new solver constraints; they cannot be emulated by an appearance-only toggle.</p>
        </>
      case 'simulation':
        return <>
          {draftObject&&<CloObjectPropertyFields group="simulation" selection={draftSelection} project={project} onEdit={onPropertyEdit}/>}
          {nativePattern&&selectedObjectKind==='pattern'&&<>
            <Readout label="Actual Rust vertices" value={nativePattern.meshVertexCount}/>
            <Readout label="Actual Rust triangles" value={nativePattern.meshTriangleCount}/>
            <Readout label="Mesh edge target" value={nativePattern.meshTargetEdgeMm!=null?`${nativePattern.meshTargetEdgeMm.toFixed(2)} mm`:'Mesh preset · not specified'}/>
            <Readout label="Material thickness" value={nativePattern.materialThicknessMm!=null?`${nativePattern.materialThicknessMm.toFixed(3)} mm`:'—'}/>
          </>}
          <Readout label="Engine" value={clothcraftHybrid?'ClothCraft · Rust VBD + OGC':'EXO Cloth Simulation'}/>
          <Readout label="Status" value={clothcraftLive?.running?'Running':'Ready / Paused'}/>
          <div className="clo-pe-actions">
            <button type="button" onClick={onSimulate}>SIMULATE / PAUSE</button>
            <button type="button" onClick={onReset}>RESET PANELS</button>
          </div>
          {activeSection!=='Fit'&&<button className="clo-pe-action" onClick={()=>onSwitchSection('Fit')}>OPEN FIT SETTINGS</button>}
          {clothcraftHybrid&&<p className="clo-pe-note">Rust collision and cloth fitting remain experimental, not production certified.</p>}
        </>
      case 'fabric':
        return <>
          <Readout label="Assigned Fabric" value={clothcraftHybrid?(selection?.fabricName||'Select a native panel'):(selectedFabric?.name||'Not assigned')}/>
          {draftObject&&<CloObjectPropertyFields group="fabric" selection={draftSelection} project={project} onEdit={onPropertyEdit}/>}
          {!clothcraftHybrid&&<div className="clo-pe-fabric"><span aria-hidden="true" style={{background:selectedFabric?.color||'#818a96'}}/>
            <strong>{selectedFabric?.name||'Fabric'}</strong>
            <small>{Number.isFinite(selectedFabric?.gsm)?`${selectedFabric.gsm} gsm`:'Material'}</small></div>}
          {clothcraftHybrid&&<p className="clo-pe-note">The native Rust fabric library is available in the Fabric workspace. Draft swatches are not substituted for native physical material properties.</p>}
          {activeSection!=='Fabric'&&<button className="clo-pe-action" onClick={onShowFabric}>OPEN FABRIC PROPERTIES</button>}
        </>
      case 'material':
        return <>
          <div className="clo-pe-material-mode"><span>Material</span><strong>PBR</strong></div>
          <div className="clo-pe-material-faces" role="tablist" aria-label="Material faces">
            <button type="button" role="tab" aria-selected={materialFace==='front'} onClick={()=>setMaterialFace('front')}>Front</button>
            <button type="button" role="tab" aria-selected={materialFace==='back'}
              disabled={!clothcraftHybrid||selectedObjectKind!=='fabric'}
              title={clothcraftHybrid?'Edit the native Fabric back material independently':'Draft Back material is not yet supported'}
              onClick={()=>setMaterialFace('back')}>Back</button>
            <button type="button" role="tab" aria-selected={materialFace==='side'}
              disabled={!clothcraftHybrid||selectedObjectKind!=='fabric'}
              title={clothcraftHybrid?'Edit the visible fabric-edge appearance':'Draft Side material is not yet supported'}
              onClick={()=>setMaterialFace('side')}>Side</button>
          </div>
          {materialFace!=='front'&&clothcraftHybrid&&<>
            <p className="clo-pe-note">{materialFace==='back'?'Back surface':'Visible fabric-edge'} appearance is independent. Unedited properties inherit Front. Fabric weave and Rust cloth physics remain shared.</p>
            {Object.keys(nativeObject?.appearance?.[materialFace]||{}).length>0&&<button type="button"
              className="clo-pe-action" disabled={Boolean(clothcraftLive?.running||clothcraftLive?.busy)}
              aria-label={`Reset ${materialFace==='back'?'Back':'Side'} appearance to Front`}
              onClick={()=>void changeNativeAppearance('reset',true)}>RESET {materialFace==='back'?'BACK':'SIDE'} TO FRONT</button>}
          </>}
          <div data-fabric-texture-repeat><label className="clo-pe-fabric-mode-select"><span>Texture Mapping</span>
            <select aria-label="Fabric texture mapping mode" value="repeat" disabled title="Repeat mapping is the currently supported fabric UV mode"><option value="repeat">Repeat</option></select>
          </label>
            {!clothcraftHybrid&&selectedObjectKind==='fabric'&&<div className="clo-pe-texture-repeat-controls" aria-label="Fabric texture repeat dimensions">
              {[['repeatWidthCm','Width'],['repeatHeightCm','Height']].map(([key,label])=><label key={key}>{label} (cm)
                <input type="number" min="0.5" max="200" step="0.5" aria-label={`Texture repeat ${label.toLowerCase()} in centimeters`}
                  value={fabric?.texture?.[key]??20}
                  onChange={event=>{const value=Number(event.target.value);if(Number.isFinite(value)&&value>=.5&&value<=200)onFabricTextureRepeatChange?.(key,value)}}/>
              </label>)}
            </div>}
          </div>
          <label className="clo-pe-fabric-mode-select"><span>Type</span>
            <select aria-label="Fabric PBR material type" value="Fabric_Matte" disabled title="Fabric_Matte is the current cloth shader type"><option value="Fabric_Matte">Fabric_Matte</option></select>
          </label>
          <button type="button" className="clo-pe-subtrigger" aria-expanded={materialDetails.basic} aria-controls="clo-pe-material-basic" onClick={()=>toggleMaterialDetail('basic')}>
            {materialDetails.basic?<ChevronDown size={12}/>:<ChevronRight size={12}/>} Basic Parameters
          </button>
          <div id="clo-pe-material-basic" role="region" aria-label="Basic Parameters" hidden={!materialDetails.basic}>
            <FabricMapRow label="Texture" kind="color" src={fabric?.texture?.src} editable={!clothcraftHybrid&&selectedObjectKind==='fabric'} onChoose={onFabricMapChoose} onRemove={onFabricMapRemove}/>
            <FabricMapRow label="Normal Map" kind="normal" src={fabric?.texture?.normalSrc} editable={!clothcraftHybrid&&selectedObjectKind==='fabric'} onChoose={onFabricMapChoose} onRemove={onFabricMapRemove}/>
            <FabricMapRow label="Displacement Map" kind="displacement" src={fabric?.texture?.displacementSrc} editable={!clothcraftHybrid&&selectedObjectKind==='fabric'} onChoose={onFabricMapChoose} onRemove={onFabricMapRemove}/>
            {draftObject&&<CloObjectPropertyFields group="material" selection={draftSelection} project={project} onEdit={onPropertyEdit} includeFields={['color','opacity']}/>}
            {clothcraftHybrid&&selectedObjectKind==='fabric'&&<NativeFabricAppearanceEditor fabric={nativeObject} face={materialFace} group="basic"
              onChange={changeNativeAppearance} disabled={Boolean(clothcraftLive?.running||clothcraftLive?.busy)}/>}
            <FabricMapRow label="Opacity Map" kind="opacity" src={fabric?.texture?.opacitySrc} editable={!clothcraftHybrid&&selectedObjectKind==='fabric'} onChoose={onFabricMapChoose} onRemove={onFabricMapRemove}/>
          </div>
          <button type="button" className="clo-pe-subtrigger" aria-expanded={materialDetails.reflection} aria-controls="clo-pe-material-reflection" onClick={()=>toggleMaterialDetail('reflection')}>
            {materialDetails.reflection?<ChevronDown size={12}/>:<ChevronRight size={12}/>} Reflection
          </button>
          <div id="clo-pe-material-reflection" role="region" aria-label="Reflection" hidden={!materialDetails.reflection}>
            {draftObject&&<CloObjectPropertyFields group="material" selection={draftSelection} project={project} onEdit={onPropertyEdit} includeFields={['roughness','reflectionIntensity','metalness']}/>}
            {clothcraftHybrid&&selectedObjectKind==='fabric'&&<NativeFabricAppearanceEditor fabric={nativeObject} face={materialFace} group="reflection"
              onChange={changeNativeAppearance} disabled={Boolean(clothcraftLive?.running||clothcraftLive?.busy)}/>}
            <FabricMapRow label="Roughness Map" kind="roughness" src={fabric?.texture?.roughnessSrc} editable={!clothcraftHybrid&&selectedObjectKind==='fabric'} onChoose={onFabricMapChoose} onRemove={onFabricMapRemove}/>
            <FabricMapRow label="Metalness Map" kind="metalness" src={fabric?.texture?.metalnessSrc} editable={!clothcraftHybrid&&selectedObjectKind==='fabric'} onChoose={onFabricMapChoose} onRemove={onFabricMapRemove}/>
            {clothcraftHybrid&&selectedObjectKind==='fabric'&&<p className="clo-pe-note">Appearance changes update the native garment viewport and save with its Fabric asset. The Rust cloth solver keeps its existing physical material unchanged.</p>}
          </div>
          {draftObject&&<p className="clo-pe-note">Appearance values and uploaded texture maps save with this EXO swatch. Independent back and side materials require additional renderer support.</p>}
        </>
      case 'button-material':
        return <>
          <div className="clo-pe-material-mode">
            <span>Material</span>
            <strong>PBR</strong>
          </div>
          <div className="clo-pe-material-faces" role="tablist" aria-label="Button and thread material">
            <button type="button" role="tab" aria-selected={buttonMaterialPart==='button'} onClick={()=>setButtonMaterialPart('button')}>Button</button>
            <button type="button" role="tab" aria-selected={buttonMaterialPart==='thread'} onClick={()=>setButtonMaterialPart('thread')}>Thread</button>
          </div>
          {buttonMaterialPart==='button'?<>
            <button type="button" className="clo-pe-subtrigger" aria-expanded={materialDetails.basic} aria-controls="clo-pe-button-material-basic" onClick={()=>toggleMaterialDetail('basic')}>
              {materialDetails.basic?<ChevronDown size={12}/>:<ChevronRight size={12}/>} Basic Parameters
            </button>
            <div id="clo-pe-button-material-basic" role="region" aria-label="Button material basic parameters" hidden={!materialDetails.basic}>
              {draftObject&&<CloObjectPropertyFields group="button-material" selection={draftSelection} project={project} onEdit={onPropertyEdit} includeFields={['materialType','color']}/>}
              <Readout label="Texture Map" value="No independent texture mapping"/>
              <Readout label="Normal Map" value="Not assigned"/>
              <Readout label="Displacement Map" value="Not assigned"/>
            </div>
            <button type="button" className="clo-pe-subtrigger" aria-expanded={materialDetails.reflection} aria-controls="clo-pe-button-material-reflection" onClick={()=>toggleMaterialDetail('reflection')}>
              {materialDetails.reflection?<ChevronDown size={12}/>:<ChevronRight size={12}/>} Reflection
            </button>
            <div id="clo-pe-button-material-reflection" role="region" aria-label="Button material reflection" hidden={!materialDetails.reflection}>
              {draftObject&&<CloObjectPropertyFields group="button-material" selection={draftSelection} project={project} onEdit={onPropertyEdit} includeFields={['roughness','metalness','reflectionIntensity','clearcoat']}/>}
            </div>
          </>:<>
            {draftObject&&<CloObjectPropertyFields group="button" selection={draftSelection} project={project} onEdit={onPropertyEdit} includeFields={['threadType','threadColor','threadLengthMm']}/>}
            <p className="clo-pe-note">Thread construction settings are part of this saved EXO button record. Independent thread roughness is not yet supported.</p>
          </>}
          <p className="clo-pe-note">Material appearance is connected to the EXO button renderer. Full rigid button collision and thread physics require separate native implementation.</p>
        </>
      case 'zipper-style':
        return <>
          {draftObject&&<ZipperMaterialPreview zipper={draftObject}/>}
          {draftObject&&<CloObjectPropertyFields group="zipper-style" selection={draftSelection} project={project} onEdit={onPropertyEdit}/>}
          <Readout label="Construction" value={hardwarePreset?.zipperType||draftObject?.type||'coil'}/>
          <Readout label="Closure" value={hardwarePreset?.separating?'Separating':'Closed end'}/>
          <Readout label="Components" value="Tape · chain/teeth · slider · puller · end stops"/>
        </>
      case 'zipper-mechanics': {
        const candidates=(project.seams||[]).filter(seam=>['normal','zipper',undefined].includes(seam.type)&&[seam.a,seam.b].some(edge=>edge?.pieceId===draftSelection?.pieceId&&edge.edgeIndex===draftObject?.edgeIndex))
        const linked=(project.seams||[]).find(seam=>seam.id===draftObject?.pairedSeamId)
        const primaryClosed=Math.max(0,Math.min(1,Number(draftObject?.sliderFraction??1)))
        const oppositeOpen=draftObject?.twoWay?Math.max(0,Math.min(1,Number(draftObject.bottomSliderFraction??0))):0
        const middleClosed=Math.max(0,primaryClosed-oppositeOpen)
        return <>
          {draftObject&&<CloObjectPropertyFields group="zipper-mechanics" selection={draftSelection} project={project} onEdit={onPropertyEdit}/>}
          {draftObject&&<label className="clo-pe-zipper-slider"><span>{draftObject.twoWay?'Primary slider · closes from selected opening end':'Drag Zipper Pull'}</span><input type="range" aria-label="Drag Zipper Pull" min="0" max="100" step="1" value={Math.round(primaryClosed*100)} onChange={event=>onPropertyEdit?.(draftSelection,'sliderFraction',Number(event.target.value)/100)}/><strong>{Math.round(primaryClosed*100)}% primary closed</strong></label>}
          {draftObject?.twoWay&&<label className="clo-pe-zipper-slider"><span>Secondary slider · opens from opposite end</span><input type="range" aria-label="Drag Bottom Zipper Pull" min="0" max="100" step="1" value={Math.round(oppositeOpen*100)} onChange={event=>onPropertyEdit?.(draftSelection,'bottomSliderFraction',Number(event.target.value)/100)}/><strong>{Math.round(oppositeOpen*100)}% opposite end open</strong></label>}
          {draftObject?.twoWay&&<div className="clo-pe-zipper-closure" aria-label="Two-way zipper locked chain"><span>Chain engaged</span><strong>{draftObject.fastened===false?0:Math.round(middleClosed*100)}%</strong><div className="clo-pe-zipper-closure-bar"><span style={{width:`${draftObject.fastened===false?0:middleClosed*100}%`}}/></div></div>}
          {draftObject&&<label className="clo-pe-zipper-seam"><span>Sewn Edge Pair</span><select aria-label="Pair zipper with sewn edge" value={linked?.id||''} onChange={event=>onPairZipperToSeam?.(draftSelection.pieceId,draftSelection.itemId,event.target.value)}><option value="">Unpaired (visual hardware only)</option>{candidates.map(seam=><option key={seam.id} value={seam.id}>{seam.name||seam.id}</option>)}</select></label>}
          <p className="clo-pe-note">{linked?`Connected to ${linked.name||linked.id}. ${draftObject?.twoWay?'Both sliders update the EXO draft seam’s independently open ends.':'The slider updates the EXO draft seam opening.'} Full rigid slider collisions and physical tooth interlock are not in the native Rust solver.`:'Create or select a sewing relationship between matching garment edges to enable draft cloth closure. A single-edge zipper remains visual.'}</p>
        </>
      }
      case 'zipper-extension':
        return <>
          {draftObject&&<CloObjectPropertyFields group="zipper-extension" selection={draftSelection} project={project} onEdit={onPropertyEdit}/>}
          <p className="clo-pe-note">Start and end distances extend their respective rendered zipper terminals along the garment edge direction. Legacy zippers without a Start Extension setting continue to use End Extension for both ends until customized.</p>
        </>
      case 'zipper-specification':
        return <>
          {draftObject&&<CloObjectPropertyFields group="zipper-specification" selection={draftSelection} project={project} onEdit={onPropertyEdit}/>}
          <Readout label="Supplier gauge" value={hardwarePreset?.sizeCode||'Illustrative'}/>
          <p className="clo-pe-note">Lengths, widths and thicknesses are real millimetre dimensions in the 3D zipper mesh. Weight is an editable supplier specification in grams; the cloth solver does not yet calculate rigid hardware mass.</p>
        </>
      case 'zipper-material':
        return <>
          {draftObject&&<CloObjectPropertyFields group="zipper-material" selection={draftSelection} project={project} onEdit={onPropertyEdit}/>}
          <p className="clo-pe-note">Choose materials and color independently for the tape, chain, slider, puller, and stops. These fields update the EXO 3D appearance; supplier-specific maps and physical manufacturing certification are separate.</p>
        </>
      case 'zipper-reflection':
        return <>
          {draftObject&&<CloObjectPropertyFields group="zipper-reflection" selection={draftSelection} project={project} onEdit={onPropertyEdit}/>}
          <p className="clo-pe-note">Roughness changes highlight softness, metalness sets metallic reflection, reflected-light intensity adjusts environment response and clearcoat adds specular finish. Each component has its own roughness.</p>
        </>
      case 'buttonhole-material':
      case 'binding-material':
        return <>
          {draftObject&&<CloObjectPropertyFields group={id} selection={draftSelection} project={project} onEdit={onPropertyEdit}/>}
        </>
      case 'hardware':
        return <>
          {selectedHardwareStyle&&hardwarePreset?.kind==='button'&&<HardwareStyleEditor project={project} preset={hardwarePreset} group="hardware" onChange={(field,value)=>onHardwareStyleEdit?.(hardwarePreset.id,field,value)}/>}
          <Readout label="Mount" value={hardwarePreset?.mount||hardwarePreset?.zipperType||hardwarePreset?.kind||'—'}/>
          {!selectedHardwareStyle&&Object.entries(hardwarePreset?.dimensionsMm||{}).map(([key,value])=><Readout key={key} label={key.replace(/([A-Z])/g,' $1').replace(/^./,letter=>letter.toUpperCase())} value={`${value} mm`}/>)}
          {hardwarePreset?.holes!=null&&<Readout label="Sewing Holes" value={hardwarePreset.holes}/>}
          {hardwarePreset?.components&&<Readout label="Components" value={hardwarePreset.components.join(', ')}/>}
        </>
      case 'hardware-material':
        return <>
          {selectedHardwareStyle&&hardwarePreset?.kind==='button'
            ? <HardwareStyleEditor project={project} preset={hardwarePreset} group="hardware-material" onChange={(field,value)=>onHardwareStyleEdit?.(hardwarePreset.id,field,value)}/>
            : <><Readout label="Base Material" value={hardwarePreset?.material||'—'}/><Readout label="Finish" value={hardwarePreset?.finish||'—'}/><div className="clo-pe-fabric"><span style={{background:hardwarePreset?.pbr.baseColor||'#888888'}}/><strong>Base Color</strong><small>{hardwarePreset?.pbr.baseColor||'—'}</small></div><Readout label="Metalness" value={hardwarePreset?.pbr.metalness?.toFixed(2)||'—'}/><Readout label="Roughness" value={hardwarePreset?.pbr.roughness?.toFixed(2)||'—'}/></>}
          <p className="clo-pe-note">{selectedHardwareStyle&&hardwarePreset?.kind==='button'?'These appearance and size values are saved with your EXO project and used for new draft button placements. Native Rust button collision is not yet implemented.':'Select a supported button style for editable dimensions and material; other hardware categories display reference specifications.'}</p>
        </>
      case 'construction':
        return <>
          <p className="clo-pe-note">{hardwarePreset?.construction||'No construction instructions available.'}</p>
          <Readout label="Measurement Status" value={hardwarePreset?.measurementStatus||'—'}/>
          {['button','buttonhole','zipper'].includes(hardwarePreset?.kind)&&<button type="button" className="clo-pe-action" disabled={clothcraftHybrid||!selectedPiece} onClick={()=>onPlaceHardwarePreset?.(hardwarePreset.id)}>PLACE {hardwarePreset.kind.toUpperCase()} ON SELECTED PATTERN</button>}
          {clothcraftHybrid&&<p className="clo-pe-note">Library reference only in native mode; draft button hardware is not installed into the Rust garment.</p>}
          {!['button','buttonhole','zipper'].includes(hardwarePreset?.kind)&&<p className="clo-pe-note">Detailed placement and physical attachment for this hardware family are in development.</p>}
        </>
      case 'physical':
        return <>
          {selectedObjectKind==='fabric'&&<div className="clo-pe-physical-preset"><span>Preset</span><strong>Custom</strong></div>}
          {draftObject&&<CloObjectPropertyFields group="physical" selection={draftSelection} project={project} onEdit={onPropertyEdit}/>}
          {clothcraftHybrid&&selectedObjectKind==='fabric'
            ? <div id="cc-native-fabric-inspector" className="clo-native-fabric-host"
                aria-label="Native selected fabric properties"/>
            : <p className="clo-pe-note">Real-world fabric calibration requires measured specimens. These are EXO draft approximations; native Rust fabric physics is managed separately.</p>}
        </>
      case 'bond':
        return <>
          <Readout label="Bond" value="Not configured"/>
          <p className="clo-pe-note">Bond/Skive is a separate physical reinforcement property in CLO. No equivalent native Rust bonding command is connected yet.</p>
        </>
      case 'solidify':
        return <>
          <Readout label="Solidify" value="Not enabled"/>
          <p className="clo-pe-note">CLO Solidify maintains a selected pattern’s simulated 3D shape. This Rust solver has no equivalent Solidify strength property yet; the UI does not change physics.</p>
        </>
      case 'arrange':
        return <>
          {draftObject&&<CloObjectPropertyFields group="arrange" selection={draftSelection} project={project} onEdit={onPropertyEdit}/>}
          {selectedObjectKind==='pattern'&&nativePattern?.grainAngleDeg!=null&&<Readout label="Native Grain Direction" value={`${nativePattern.grainAngleDeg.toFixed(2)}°`}/>}
          {selectedObjectKind==='pattern'&&nativePattern?.rotationDeg?.map((deg,index)=><Readout key={`rot-${index}`} label={`3D Rotation ${'XYZ'[index]}`} value={`${deg.toFixed(2)}°`}/>)}
          <Readout label="Pattern" value={clothcraftHybrid?(selection?.panelName||'No pattern selected'):(selectedPiece?.name||'No pattern selected')}/>
          {clothcraftHybrid&&selection?.positionCm?.map((cm,index)=><Readout key={index} label={`Position ${'XYZ'[index]}`} value={`${cm.toFixed(1)} cm`}/>)}
          {!clothcraftHybrid&&selectedPiece&&['X','Y','Z'].map(axis=><Readout key={axis} label={`Position ${axis}`}
            value={`${(Number(selectedPiece.arrangement3d?.[`stagingOffset${axis}`]||0)*100).toFixed(1)} cm`}/>)}
          {activeSection!=='Pattern'&&<button className="clo-pe-action" onClick={()=>onSwitchSection('Pattern')}>OPEN PATTERN ARRANGEMENT</button>}
          <p className="clo-pe-note">Use the Move tool in 3D to reposition a draped panel; reset to arrange the starting pattern.</p>
        </>
      case 'miscellaneous':
        return <>
          <Readout label="Workspace" value={activeSection}/>
          {!draftObject&&objectSelection&&<p className="clo-pe-note">Selected {selectedObjectKind} has no validated editable settings in this session. Its unavailable CLO properties are documented in the property parity audit.</p>}
          {activeSection!=='Render'&&<button className="clo-pe-action" onClick={()=>onSwitchSection('Render')}>RENDER / ENVIRONMENT SETTINGS</button>}
        </>
      case 'button':
        return draftObject?<CloButtonShapeEditor selection={draftSelection} project={project} onEdit={onPropertyEdit}/>
          :<p className="clo-pe-note">Select an EXO draft button to edit its shape and specifications.</p>
      case 'buttonhole':case 'binding':case 'fastener':case 'topstitch':case 'graphic':case 'position':
        return draftObject?<CloObjectPropertyFields group={id} selection={draftSelection} project={project} onEdit={onPropertyEdit}/>:<p className="clo-pe-note">Select an EXO draft object to edit these properties. Rust garment objects have separate schemas and must not inherit EXO draft values.</p>
      case 'grading':
        return <><Readout label="Size" value={objectSelection?.id||'—'}/><Readout label="Available Sizes" value={project.grading?.sizes?.join(', ')||'—'}/><p className="clo-pe-note">Grading rules and size deltas are authored in the Production workspace. Selection does not mutate the base pattern.</p></>
      case 'pom': {
        const pom=project.customMeasurements?.find((m,i)=>String(m.id??i)===String(objectSelection?.id))
        return <><Readout label="Measurement" value={pom?.name||'—'}/><Readout label="Draft Value" value={typeof pom?.valueCm==='number'?`${pom.valueCm.toFixed(2)} cm`:'Not independently measured'}/><p className="clo-pe-note">See Production for traced 2D/3D POM construction and size grading. Unmapped 3D length is never copied from the 2D value.</p></>
      }
      case 'puckering':return draftObject?<CloObjectPropertyFields group="puckering" selection={draftSelection} project={project} onEdit={onPropertyEdit}/>:<p className="clo-pe-note">Select or add an EXO draft puckering annotation in Object Browser to edit its visible construction specifications. The native Rust solver does not currently implement fabric puckering forces.</p>
      default:return null
    }
  }

  // All Object Browser contexts share one scroll panel and one drafting portal
  // node. Switching to the special graphic inspector must not replace the
  // portal target retained by PatternEditor while a draft edit is in progress.
  const showNativeGraphic=clothcraftHybrid&&objectTab==='Graphic'
  const showNativeReference=clothcraftHybrid&&objectTab==='Reference'
  const selectedGraphic=showNativeGraphic
    ?clothcraftLive?.graphicRefs?.find(item=>item.id===clothcraftLive?.selectedGraphicId)||clothcraftLive?.graphicRefs?.[0]
    :null
  return <>
    <div className="inspector-head clo-pe-header" data-property-editor-design="neutral-gray"><span>Property Editor</span><strong title={showNativeReference?(referenceItems.find(item=>item.id===selectedReferenceId)?.name||'Reference'):showNativeGraphic?(selectedGraphic?.name||'Graphic'):propertySubject}>{showNativeReference?(referenceItems.find(item=>item.id===selectedReferenceId)?.name||'Reference'):showNativeGraphic?(selectedGraphic?.name||'Graphic'):propertySubject}</strong></div>
    {!showNativeGraphic&&!showNativeReference&&<>
    {(selectedObjectKind==='fabric'||(activeSection==='Fabric'&&objectTab==='Fabric'))&&<FabricFileToolbar kind={clothcraftHybrid&&!selectedDraftAccessory?'native':'draft'}
      fabric={clothcraftHybrid&&!selectedDraftAccessory?(nativeObject||clothcraftLive?.fabricRefs?.[0]):(draftObject||fabric)}
      options={clothcraftHybrid&&!selectedDraftAccessory?(clothcraftLive?.fabricRefs||[]):Object.entries(project?.fabrics||{}).map(([id,item])=>({...item,id}))}
      onSelect={id=>onFabricSelect?.(id)}
      onImport={entry=>onFabricPresetImport?.({kind:clothcraftHybrid&&!selectedDraftAccessory?'native':'draft',id:identityId||(clothcraftHybrid?clothcraftLive?.fabricRefs?.[0]?.id:fabric?.id),entry})}/>}
    <label className="clo-pe-unit-selection">Measurement Display
      <select aria-label="Property Editor length unit" value={lengthUnit} onChange={event=>{
        const unit=event.target.value
        setLengthUnit(unit)
        window.dispatchEvent(new CustomEvent('exo-clothcraft-set-pen-unit',{detail:{unit}}))
      }}>
        {CLO_LENGTH_UNITS.map(unit=><option key={unit} value={unit}>{unit}</option>)}
      </select>
    </label>
    {clothcraftHybrid&&activeSection==='Sewing'&&!accessoryTab&&!selectedDraftAccessory&&clothcraftLive?.seamRefs?.length>0&&
      <label className="clo-pe-native-seam-picker">Sewing Relationship
        <select aria-label="Select native sewing relationship" value={nativeSewing?.seamId||''}
          onChange={event=>onSelectNativeSeam?.(event.target.value)}>
          <option value="">Select a sewn edge pair…</option>
          {clothcraftLive.seamRefs.map(ref=><option key={ref.id} value={ref.id}>{ref.id} · {ref.first} ↔ {ref.second}</option>)}
        </select>
      </label>}
    </>}
    <div className="clo-pe-list" aria-label="Property Editor sections" data-property-context={showNativeReference?'reference':showNativeGraphic?'graphic':selectedObjectKind}>
      {showNativeReference?<PatternReferencePanel20261025
        projectKey={referenceProjectKey} references={referenceItems} onChange={onReferenceChange}
        selectedId={selectedReferenceId} onSelect={onReferenceSelect}
        disabled={!referenceProjectKey} variant="properties"/>:
      showNativeGraphic?<div id="cc-native-graphic-editor" className="clo-native-graphic-host" aria-label="Selected graphic measurements and materials"/>:<>
      {selectedObjectKind==='none'&&<div className="clo-pe-empty" role="status">
        Select a pattern in the 2D or 3D viewport, or select a fabric in Object Browser, to edit its properties.
      </div>}
      {visibleGroups.map(([id,title])=>{
        const expanded=open.includes(id)
        return <section key={id} className={`clo-pe-section ${expanded?'expanded':''}`}>
          <button type="button" className="clo-pe-trigger" aria-expanded={expanded}
            aria-controls={`clo-pe-section-${id}`} onClick={()=>toggle(id)}>
            {expanded?<ChevronDown size={13}/>:<ChevronRight size={13}/>}
            <span>{title}</span>
          </button>
          <div id={`clo-pe-section-${id}`} role="region" hidden={!expanded}
            aria-label={`${title} properties`} className="clo-pe-content">
            {overview(id)}
            {(id===contextGroup||(!visibleGroups.some(([key])=>key===contextGroup)&&id==='miscellaneous'))&&<div className="clo-pe-existing-properties" aria-label={`${title} advanced settings`}>{children}</div>}
          </div>
        </section>
      })}
      </>}
      {/* PatternEditor creates its controls in this DOM node via a React portal.
          Keep its DOM identity across every Object Browser selection, including
          Graphic, and do not bury controls in the collapsed Arrange group. */}
      <div id="clo-pattern-properties-host" className="clo-pattern-properties-host clo-pe-persistent-drafting"
        role="region" aria-label="2D drafting precision properties"
        hidden={showNativeGraphic||showNativeReference||!['Pattern','Sewing','Production'].includes(activeSection)}/>
    </div>
  </>
}
