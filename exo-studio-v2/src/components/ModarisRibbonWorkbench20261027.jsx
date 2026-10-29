import React, {useState} from 'react'
import {MousePointer2, Hand, ZoomIn, ZoomOut, Maximize, PenLine, CircleDot, Ruler, Scissors, GitBranch, Layers3, Copy, RotateCcw, Undo2, Redo2, Waypoints, ShieldCheck, Download, Grid2X2, Crosshair, FilePlus2, Save, SlidersHorizontal, Move, PanelTop, Eye, Settings2, ScanLine, Spline, ArrowUpRight} from 'lucide-react'
import './ModarisRibbonWorkbench20261027.css'

// All commands are explicit integrations. No built-in geometry mutation or synthetic
// success state is allowed: the owning workspace supplies the native callbacks.
const FAMILIES=[
  {id:'select',key:'F1',label:'Selection',commands:[['select','Select',MousePointer2],['pan','Pan',Hand],['zoomIn','Zoom in',ZoomIn],['zoomOut','Zoom out',ZoomOut],['fit','Fit all',Maximize],['zoomSelected','Fit piece',Crosshair]]},
  {id:'construct',key:'F2',label:'Construction',commands:[['point','Point',CircleDot],['line','Line',PenLine],['curve','Curve',Spline],['measure','Measure',Ruler],['move','Move',Move],['copy','Copy',Copy]]},
  {id:'modify',key:'F3',label:'Modification',commands:[['editPoint','Edit point',CircleDot],['split','Split',Scissors],['rotate','Rotate',RotateCcw],['transform','Transform',SlidersHorizontal],['offset','Offset',ArrowUpRight]]},
  {id:'pieces',key:'F4',label:'Pieces',commands:[['newPiece','New piece',FilePlus2],['cut','Cut',Scissors],['pieceProperties','Properties',Settings2],['duplicate','Duplicate',Copy],['layers','Layers',Layers3]]},
  {id:'assembly',key:'F5',label:'Assembly',commands:[['sew','Sew',Waypoints],['unsew','Unsew',Scissors],['notches','Notches',ScanLine],['seamAudit','Balance',ShieldCheck]]},
  {id:'grading',key:'F6',label:'Grading',commands:[['grade','Grade rules',GitBranch],['gradeSizes','Size table',Grid2X2],['gradeNest','Nest',Layers3],['gradeAudit','Grade audit',ShieldCheck]]},
  {id:'production',key:'F7',label:'Industrial',commands:[['allowances','Allowances',Ruler],['cutlines','Cutlines',Scissors],['industrialAudit','Audit',ShieldCheck],['export','Export',Download]]},
  {id:'display',key:'F8',label:'Display',commands:[['toggleGrid','Grid',Grid2X2],['togglePoints','Points',CircleDot],['toggleSeams','Seams',Eye],['fit','Fit all',Maximize],['save','Save',Save],['undo','Undo',Undo2],['redo','Redo',Redo2]]},
]
const actionAliases={
  zoomSelected:['zoomSelected','zoomToSelection'],
  grade:['grade','openGrade','onOpenGrade'],
  gradeAudit:['gradeAudit','auditGrade','onGradeAudit'],
  industrialAudit:['industrialAudit','auditIndustrial','onIndustrialAudit'],
  seamAudit:['seamAudit','sewingAudit','auditSewing','onSewingAudit'],
  cutlines:['cutlines','generateCutlines','onGenerateCutlines'],
  export:['export','exportPattern','onExportPattern'],
}
const isFiniteNumber=n=>typeof n==='number'&&Number.isFinite(n)
const toMm=n=>isFiniteNumber(n)?(n*1000).toFixed(2):'—'
const validZoom=n=>isFiniteNumber(n)&&n>0

/**
 * Full-size 2D only: parent mounts this when its 2D workspace is maximized.
 * snapshot: native Rust session {revision,template:{panels},activeGradedSize,gradeRunPersisted}.
 * selection: {panel,anchor?/pointIndex?,edge?,seamId?}; anchor selects polygon.points[index]
 *              in native metres. Missing explicit point selection shows X/Y as unknown.
 * actions: named callbacks; each receives {command,family,panel,anchor,edge,seamId,revision,
 *          selection,snapshot}. Missing callbacks always disable command buttons.
 * disabled: busy or unavailable session; zoom: viewport zoom factor (1 === 100%).
 * full2D: false hides the ribbon completely, even when a parent keeps it mounted.
 * activeCommand: optional currently active tool key (controlled by real workspace state).
 */
export default function ModarisRibbonWorkbench20261027({
  snapshot,selection,actions={},disabled=false,zoom,full2D=true,activeCommand=null,
}) {
  const [familyId,setFamilyId]=useState('select')
  if(!full2D)return null
  const family=FAMILIES.find(item=>item.id===familyId)||FAMILIES[0]
  const panels=Array.isArray(snapshot?.template?.panels)?snapshot.template.panels:[]
  const panel=panels.find(item=>item.id===selection?.panel)
  const points=Array.isArray(panel?.polygon?.points)?panel.polygon.points:[]
  const index=selection?.anchor??selection?.pointIndex
  const point=Number.isInteger(index)&&index>=0&&index<points.length?points[index]:null
  const coordinates=Array.isArray(point)?point:point?.position
  const x=Array.isArray(coordinates)?coordinates[0]:point?.x
  const y=Array.isArray(coordinates)?coordinates[1]:point?.y
  const locked=disabled||!snapshot
  const resolve=key=>{
    for(const alias of [key,...(actionAliases[key]||[])])if(typeof actions?.[alias]==='function')return actions[alias]
    return null
  }
  const commandPayload=key=>({
    command:key,family:family.id,panel:selection?.panel??null,
    anchor:Number.isInteger(index)?index:null,edge:selection?.edge??null,
    seamId:selection?.seamId??null,revision:snapshot?.revision??null,
    selection:selection??null,snapshot,
  })
  const activate=key=>{if(!locked)resolve(key)?.(commandPayload(key))}
  return <section className="mrw27" aria-label="2D pattern CAD ribbon" data-modaris-ribbon-workbench="20261027">
    <div className="mrw27-tabs" role="tablist" aria-label="CAD tool families">
      <span className="mrw27-brand">EXO <strong>MODARIS / 2D</strong></span>
      {FAMILIES.map(item=><button type="button" role="tab" key={item.id}
        id={'mrw27-tab-'+item.id} aria-controls="mrw27-tool-panel"
        aria-selected={family.id===item.id} className={family.id===item.id?'is-active':''}
        onClick={()=>setFamilyId(item.id)}><span className="mrw27-fkey">{item.key}</span> {item.label}</button>)}
    </div>
    <div id="mrw27-tool-panel" role="tabpanel" aria-labelledby={'mrw27-tab-'+family.id} className="mrw27-tools">
      <span className="mrw27-family-label">{family.label.toUpperCase()}</span>
      <div className="mrw27-tool-actions">
        {family.commands.map(([key,label,Icon])=>{
          const enabled=!locked&&Boolean(resolve(key))
          return <button type="button" key={key} className={'mrw27-action '+(activeCommand===key?'is-engaged':'')}
            disabled={!enabled} aria-pressed={enabled&&activeCommand===key}
            title={enabled?label:label+' — command unavailable'}
            onClick={()=>activate(key)}><Icon aria-hidden="true" size={17} strokeWidth={1.7}/><span>{label}</span></button>
        })}
      </div>
    </div>
    <div className="mrw27-status" aria-label="Native pattern coordinates and view status">
      <span className={'mrw27-native '+(snapshot?'is-connected':'')}>{snapshot?'NATIVE SESSION':'NO SESSION'}</span>
      <span title="Selected native piece">PIECE <b>{panel?.name||panel?.id||'—'}</b></span>
      <span title="Selected native point">POINT <b>{point?'P'+(index+1):'—'}</b></span>
      <span className="mrw27-coordinate">X <b>{toMm(x)}</b> mm</span>
      <span className="mrw27-coordinate">Y <b>{toMm(y)}</b> mm</span>
      <span>ZOOM <b>{validZoom(zoom)?Math.round(zoom*100)+'%':'—'}</b></span>
      <span>GRADE <b>{snapshot?.activeGradedSize||'BASE'}</b></span>
      <span title="Saved native six-size grading catalog">{snapshot?.gradeRunPersisted===true?'6-SIZE SAVED':'NO SAVED GRADE'}</span>
      <span className="mrw27-revision">REV {snapshot?.revision??'—'}</span>
    </div>
  </section>
}
