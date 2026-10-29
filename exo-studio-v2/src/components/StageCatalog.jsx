import React from 'react'
import {EXO_STAGE_ID, listStagePresets, normalizeStageId} from '../data/stagePresets.js'
import LibraryAssetHover from './LibraryAssetHover.jsx'
import Library3DAssetPreview from './Library3DAssetPreview.jsx'
import './StageCatalog.css'

function StagePoster({stage}) {
  const [failed, setFailed] = React.useState(false)
  return failed
    ? <span className="exo-stage-poster-fallback" role="img" aria-label={`${stage.name} preview unavailable`}>{stage.name}</span>
    : <img className="exo-stage-poster" src={stage.posterFile} alt={`EXO Blender stage: ${stage.name}`} loading="lazy" draggable={false} onError={()=>setFailed(true)}/>
}

export default function StageCatalog({selectedStageId='none',onSelectStage,search='',folderFilter='all',compact=false}) {
  const selected=normalizeStageId(selectedStageId)
  const term=search.trim().toLowerCase()
  const stages = listStagePresets().filter(stage =>
    (['all','scenes','cathedral'].includes(folderFilter)||folderFilter===stage.kind) &&
    (!term||[stage.id,stage.name,stage.kind,stage.description,...stage.sceneHints]
      .join(' ').toLowerCase().includes(term)))
  const showEmpty=(folderFilter==='all'||folderFilter==='none')&&(!term||'empty studio clear stage'.includes(term))
  return <div className={`exo-stage-catalog ${compact?'exo-stage-catalog-compact':''}`}>
    <div className="exo-stage-grid" aria-label="Stage previews">
      {showEmpty&&<LibraryAssetHover category="stage" id="none" title="Empty studio" description="Clear the stage while keeping the avatar and garment." source="Neutral EXO viewport" preview={<div className="exo-stage-empty-hover" role="img" aria-label="No stage geometry: neutral 3D garment workspace"><span>EMPTY STUDIO</span></div>}>
        <button type="button" className={`exo-stage-card exo-stage-clear-card ${selected==='none'?'is-selected':''}`} aria-pressed={selected==='none'} title="Clear current stage" onClick={()=>onSelectStage?.('none')}>
          <span className="exo-stage-clear-illustration" aria-hidden="true">○</span>
          <span className="exo-stage-card-name">Empty Studio</span>
        </button>
      </LibraryAssetHover>}
      {stages.map(stage=><LibraryAssetHover key={stage.id} category="stage" id={stage.id} title={stage.name} description={stage.description}
        details={[["Asset",stage.id],["Type",stage.kind],["Geometry","EXO Blender GLB scene"]]}
        source={stage.sourceStatus}
        preview={<Library3DAssetPreview kind="stage" variant={stage.id} label={stage.name} height={270}/> }>
        <button type="button" className={`exo-stage-card ${selected===stage.id?'is-selected':''}`} aria-pressed={selected===stage.id} onClick={()=>onSelectStage?.(stage.id)} title={`Apply ${stage.name}`}>
          <span className={`exo-stage-illustration ${stage.kind}`} data-stage-id={stage.id}><StagePoster stage={stage}/></span>
          <span className="exo-stage-card-name">{stage.name}</span>
        </button>
      </LibraryAssetHover>)}
    </div>
    {term&&!stages.length&&!showEmpty&&<p className="exo-stage-no-results">No stages match “{search}”.</p>}
  </div>
}
