import React from 'react'
import './NativeSewingGestureDock20261025.css'

/** Small, non-modal seam tool strip. Never covers the centre of the pattern
 * board with a floating dialog or mutates the native garment on its own. */
export default function NativeSewingGestureDock20261025({
  mode, variant, firstEdge, freePoints=[], reverse, onReverse,
  ease, onEase, committing, onCancel, onExit,
  groupMode='single', onGroupMode, manyCount=2, onManyCount, stagedEdges=[],
}) {
  if(mode!=='sew')return null
  const segment=variant==='segment'
  const steps=['Click start of first boundary','Click end of first boundary',
    'Click start of matching boundary','Click end of matching boundary']
  const groupSteps=groupMode==='many'?manyCount+1:2
  const text=committing?'Saving sewing…':segment?
    groupMode!=='single'?
      stagedEdges.length?`Select boundary ${stagedEdges.length+1} of ${groupSteps} · ${stagedEdges.length} staged`:
      groupMode==='symmetric'?'Select a boundary and its partner; left/right mirror must exist':
        `Select one primary boundary, then ${manyCount} matching boundaries`:
    firstEdge?'Select second boundary · '+firstEdge.panel+'/'+firstEdge.edge+' selected':
    'Select first boundary, then the matching boundary':steps[Math.min(freePoints.length,3)]
  return <aside className="cc-native-sewing-dock" data-native-sewing-tool-dock="true"
    data-native-sewing-variant={segment?'segment':'free'}
    data-native-segment-sewing-settings={segment?'true':undefined}
    data-native-free-sewing-settings={segment?undefined:'true'}
    aria-label={segment?'Segment Sewing settings':'Free Sewing settings'}>
    <div className="cc-native-sewing-dock-head">
      <strong>{segment?'SEGMENT SEWING':'FREE SEWING'}</strong>
      <button type="button" onClick={onExit} aria-label="Exit sewing tool" title="Exit sewing tool">×</button>
    </div>
    <p role="status">{text}</p>
    {segment&&onGroupMode&&<div className="cc-native-sewing-dock-groups">
      <label>Connection
        <select aria-label="Segment sewing connection type" value={groupMode} disabled={committing}
          onChange={e=>onGroupMode(e.target.value)}>
          <option value="single">Single pair</option>
          <option value="symmetric">Symmetric pair (atomic)</option>
          <option value="many">One to many (atomic)</option>
        </select>
      </label>
      {groupMode==='many'&&<label>Matching edges
        <select aria-label="Number of matching sewing edges" value={manyCount} disabled={committing}
          onChange={e=>onManyCount(Number(e.target.value))}>
          {[2,3,4].map(n=><option value={n} key={n}>{n}</option>)}
        </select>
      </label>}
      {groupMode!=='single'&&<small>Each group commits as one native Rust transaction. Undo removes the complete group.</small>}
    </div>}
    <div className="cc-native-sewing-dock-options">
      {segment&&<label><input type="checkbox" aria-label="Reverse Segment Sewing second boundary"
        checked={Boolean(reverse)} onChange={e=>onReverse(e.target.checked)} disabled={committing}/>
        Reverse direction B</label>}
      <label><input type="checkbox" aria-label={segment?'Allow Segment Sewing easing':'Allow Free Sewing easing'}
        checked={Boolean(ease)} onChange={e=>onEase(e.target.checked)} disabled={committing}/>
        Allow length easing</label>
    </div>
    <div className="cc-native-sewing-dock-foot">
      <span>{segment?groupMode==='single'?'2 full cutlines':`${stagedEdges.length}/${groupSteps} edges`:(freePoints.length+'/4 picked')}</span>
      <button type="button" onClick={onCancel} disabled={committing||(segment?groupMode==='single'?!firstEdge:!stagedEdges.length:!freePoints.length)}>
        Cancel picks
      </button>
    </div>
  </aside>
}
