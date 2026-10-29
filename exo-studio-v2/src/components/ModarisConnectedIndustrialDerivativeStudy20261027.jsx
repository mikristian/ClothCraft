import React,{useState} from 'react'
import {createModarisConnectedIndustrialDerivative20261027,regenerateModarisConnectedIndustrialDerivative20261027,verifySavedModarisConnectedIndustrialDerivative20261027} from '../core/modarisConnectedIndustrialDerivatives20261027.js'

const ID=/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/
const validID=value=>typeof value==='string'&&ID.test(value)
const safeError=error=>String(error?.message||error||'Unknown refusal').slice(0,300)

/** Operator preflight is advisory; the authoritative core independently rechecks all geometry. */
export function preflightModarisConnectedIndustrialDerivative20261027(project,{sourcePieceId,childPieceId,childName,depthCm,nativeMode=false,disabled=false}={}){
  if(nativeMode)return 'Native Rust projects are outside this legacy preview.'
  if(disabled)return 'Connected derivative preview is disabled.'
  if(!project||!Number.isSafeInteger(project.revision)||project.revision<0)return 'A revisioned legacy project is required.'
  if(!Array.isArray(project.pieces)||project.pieces.length!==1)return 'Exactly one detached source piece is required. Multi-piece and sewn assemblies are refused.'
  if(project.seams!==undefined||project.productionSpec!==undefined||project.industrialAllowanceGraph!==undefined||project.modarisSizeLinkedGrade!==undefined)return 'Sewn, allowance-linked or production-attached projects are refused.'
  if(!Array.isArray(project.grading?.sizes)||project.grading.sizes.length!==6||new Set(project.grading.sizes).size!==6||!project.grading.sizes.includes(project.grading.baseSize))return 'Exactly six distinct grading sizes and a valid base size are required.'
  const source=project.pieces[0]
  if(!validID(sourcePieceId)||source?.id!==sourcePieceId)return 'Select the existing source piece.'
  if(source.curves!==undefined||source.notches!==undefined||source.internalLines!==undefined||source.seams!==undefined||source.cutline!==undefined||source.holes!==undefined||source.edgeSeamAllowances!==undefined||source.seamAllowance!==undefined)return 'Curves, notches, holes, marks, cutlines, seam allowances and sewing attachments are refused.'
  if(!Array.isArray(source.points)||source.points.length!==4)return 'The source must have four exact rectangle vertices.'
  if(!validID(childPieceId)||childPieceId===sourcePieceId)return 'Choose a distinct valid child identifier.'
  if(typeof childName!=='string'||!childName.trim()||childName.length>120)return 'Enter a child study name of at most 120 characters.'
  if(typeof depthCm!=='number'||!Number.isFinite(depthCm)||depthCm<0.1||depthCm>5)return 'Physical depth must be between 0.1 and 5 cm.'
  return ''
}

/** Pure, read-only UI adapter with error details and a strict saved-proof gate. */
export function previewModarisConnectedIndustrialDerivative20261027(project,options,{savedProof=null,action='create'}={}){
  const reason=preflightModarisConnectedIndustrialDerivative20261027(project,options)
  if(reason)return {ok:false,reason,preview:null}
  try {
    if(action==='verify'){
      if(!savedProof)return {ok:false,reason:'No saved detached proof was supplied.',preview:null}
      const validation=verifySavedModarisConnectedIndustrialDerivative20261027(project,savedProof)
      if(validation.ok!==true)return {ok:false,reason:'Saved proof verification refused.',preview:null}
      const current=createModarisConnectedIndustrialDerivative20261027(project,options)
      if(current.provenance.childHash!==savedProof.provenance?.childHash||current.provenance.sourceHash!==savedProof.provenance?.sourceHash||
        current.provenance.childPieceId!==savedProof.provenance?.childPieceId||current.provenance.depthCm!==savedProof.provenance?.depthCm)
        return {ok:false,reason:'Saved proof does not match the selected derivative configuration.',preview:null}
      return {ok:true,reason:'Saved detached proof revalidated against the current revision.',preview:current,validation}
    }
    if(action==='regenerate'){
      if(!savedProof)return {ok:false,reason:'A prior detached proof is required to regenerate.',preview:null}
      const result=regenerateModarisConnectedIndustrialDerivative20261027(project,savedProof,{expectedRevision:project.revision})
      if(result.provenance.sourcePieceId!==options.sourcePieceId||result.provenance.childPieceId!==options.childPieceId||
        result.provenance.childName!==options.childName||result.provenance.depthCm!==options.depthCm)
        return {ok:false,reason:'Saved derivative configuration differs from the operator selection.',preview:null}
      return {ok:true,reason:'Detached six-size study regenerated from revision '+project.revision+'.',preview:result}
    }
    if(action!=='create')return {ok:false,reason:'Unsupported preview action.',preview:null}
    return {ok:true,reason:'Detached six-size preview calculated. Project geometry remains unchanged.',preview:createModarisConnectedIndustrialDerivative20261027(project,options)}
  }catch(error){return {ok:false,reason:'Preview refused: '+safeError(error),preview:null}}
}

export default function ModarisConnectedIndustrialDerivativeStudy20261027({project,savedProof=null,nativeMode=false,disabled=false}){
  const [sourcePieceId,setSourcePieceId]=useState('')
  const [childPieceId,setChildPieceId]=useState('facing-study')
  const [childName,setChildName]=useState('Connected rectangular facing preview')
  const [depthText,setDepthText]=useState('1.5')
  const [preview,setPreview]=useState(null)
  const [notice,setNotice]=useState('Select a source and calculate the six-size detached preview.')
  const depthCm=depthText.trim()?Number(depthText):NaN
  const options={sourcePieceId,childPieceId,childName,depthCm,nativeMode,disabled}
  const reason=preflightModarisConnectedIndustrialDerivative20261027(project,options)
  const stale=Boolean(preview&&(preview.provenance.sourceRevision!==project?.revision||preview.provenance.sourcePieceId!==sourcePieceId||
    preview.provenance.childPieceId!==childPieceId||preview.provenance.childName!==childName||preview.provenance.depthCm!==depthCm))
  const execute=(action)=>{
    const result=previewModarisConnectedIndustrialDerivative20261027(project,options,{action,savedProof:action==='create'?null:action==='verify'?savedProof:(preview||savedProof)})
    setPreview(result.ok?result.preview:null)
    setNotice(result.reason)
  }
  return <section aria-label="Modaris connected industrial derivative preview" data-connected-derivative="read-only" style={{display:'grid',gap:8}}>
    <h3>Connected six-size facing · read-only geometry preview</h3>
    <p>Calculates physical rectangular inward geometry in centimetres from six graded legacy size views. Source and child vertex mapping, dimensions and source provenance are exposed for inspection. This is a detached engineering study, not a manufactured or cut-ready piece.</p>
    <p>No authoritative child topology or manufacturing attachments are present; geometry commit, sewline creation, cut output and project mutation are unavailable.</p>
    <fieldset disabled={disabled||nativeMode} style={{display:'grid',gap:8}}><legend>Physical facing study (cm)</legend>
      <label>Source piece <select aria-label="Connected derivative source piece" value={sourcePieceId} onChange={e=>{setSourcePieceId(e.target.value);setPreview(null)}}>
        <option value="">Choose source</option>{(Array.isArray(project?.pieces)?project.pieces:[]).filter(p=>validID(p?.id)).map(p=><option value={p.id} key={p.id}>{p.name||p.id}</option>)}
      </select></label>
      <label>Child ID <input aria-label="Connected derivative child ID" value={childPieceId} onChange={e=>{setChildPieceId(e.target.value);setPreview(null)}}/></label>
      <label>Child name <input aria-label="Connected derivative child name" value={childName} onChange={e=>{setChildName(e.target.value);setPreview(null)}}/></label>
      <label>Physical inward depth (cm) <input aria-label="Connected derivative physical depth cm" type="number" min="0.1" max="5" step="0.1" value={depthText} onChange={e=>{setDepthText(e.target.value);setPreview(null)}}/></label>
    </fieldset>
    {reason&&<p role="alert">{reason}</p>}
    <div><button type="button" disabled={!!reason} onClick={()=>execute('create')}>Calculate six-size preview</button>{' '}
      <button type="button" disabled={!!reason||!savedProof} onClick={()=>execute('verify')}>Revalidate saved detached proof</button>{' '}
      <button type="button" disabled={!!reason||!(preview||savedProof)} onClick={()=>execute('regenerate')}>Regenerate detached preview</button>
    </div>
    {stale&&<p role="alert">Displayed study is stale; recalculate using the current project revision and selection.</p>}
    {preview&&!stale&&<div aria-label="Six-size derived geometry" data-preview-revision={preview.provenance.sourceRevision}>
      <p>Source fingerprint: <code>{preview.provenance.sourceHash}</code> · Source revision: {preview.provenance.sourceRevision} · Unit: cm · Factory approved: no</p>
      <table><caption>Six graded rectangular size views · physical dimensions in cm</caption><thead><tr><th>Size</th><th>Parent width × height</th><th>Child width × height</th><th>Vertex mapping (parent → child)</th></tr></thead>
        <tbody>{preview.sizeViews.map(view=><tr key={view.size}><th scope="row">{view.size}</th>
          <td>{view.widthCm.toFixed(3)} × {view.heightCm.toFixed(3)}</td>
          <td>{(view.widthCm-2*preview.provenance.depthCm).toFixed(3)} × {(view.heightCm-2*preview.provenance.depthCm).toFixed(3)}</td>
          <td>{view.childVertices.map(vertex=>vertex.sourceVertexId+' → '+vertex.id+' ('+vertex.x.toFixed(3)+', '+vertex.y.toFixed(3)+' cm)').join('; ')}</td>
        </tr>)}</tbody></table>
    </div>}
    <p role="status">{notice}</p>
  </section>
}
