import {nativeRustEdgeLength20261023,nativeRustArcLengthStation20261023} from './nativeRustArcLengthCompat20261023.js'

const finite=n=>typeof n==='number'&&Number.isFinite(n)
const decimal=/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/
const finiteDecimal=value=>typeof value==='number'?value:
  typeof value==='string'&&decimal.test(value.trim())?Number(value.trim()):NaN

/** Read-only proposed physical station on a native authored curved edge.
 * Rust is the only authority permitted to commit SplitBoundary. It checks
 * source topology, sewing IDs, and the current revision independently.
 */
export function buildNativeCurveStation20261023(snapshot,{panelId,edge,mode='distance',distanceMm=50,fraction=0.5}={}) {
  try {
    if(typeof panelId!=='string'||!panelId||typeof edge!=='string'||!edge||!['distance','fraction'].includes(mode))throw Error('Select a valid panel and named edge')
    const panels=snapshot?.template?.panels?.filter(p=>p?.id===panelId)
    if(panels?.length!==1)throw Error('Selected native panel is unavailable or duplicated')
    const polygon=panels[0].polygon
    if(!polygon?.edges?.includes(edge))throw Error('Selected named boundary is not in this panel')
    // Use Rust's actual 0.25mm convex-hull subdivision and per-span cubic
    // bisection contract, not an unrelated adaptive SVG chord approximation.
    const measured=nativeRustEdgeLength20261023(polygon,edge)
    if(!measured.ok)throw Error(`Unable to measure source curve: ${measured.reason}`)
    let distanceM
    if(mode==='distance'){
      if(typeof distanceMm==='string'&&!distanceMm.trim())throw Error('Enter a distance in millimetres')
      const mm=finiteDecimal(distanceMm)
      if(!finite(mm))throw Error('Distance must be finite millimetres')
      distanceM=mm/1000
    }else {
      if(typeof fraction==='string'&&!fraction.trim())throw Error('Enter a physical arclength fraction')
      const f=finiteDecimal(fraction)
      if(!finite(f)||f<0||f>1)throw Error('Arc length fraction must be between 0 and 1')
      distanceM=f*measured.totalLengthM
    }
    if(!finite(distanceM)||distanceM<=.0005||distanceM>=measured.totalLengthM-.0005)
      throw Error('Split must be at least 0.5 mm from each edge endpoint')
    const position=nativeRustArcLengthStation20261023(polygon,edge,{distanceM})
    if(!position.ok)throw Error(`Could not locate native curve station: ${position.reason}`)
    // Free curve stations can snap to a saved knot within 0.5mm, identical
    // to native SplitBoundary. Use the canonical coordinate for preview and
    // the command so it cannot visually drift after Rust promotes the knot.
    const canonical=position.canonicalDistanceM
    if(!(canonical>.0005&&canonical<measured.totalLengthM-.0005))
      throw Error('Canonical curve split is too close to a boundary endpoint')
    if(!Number.isSafeInteger(snapshot.revision)||snapshot.revision<0)throw Error('Native snapshot revision unavailable')
    return {ok:true,panelId,edge,units:'mm',revision:snapshot.revision,
      stationMm:canonical*1000,requestedStationMm:distanceM*1000,
      edgeLengthMm:measured.totalLengthM*1000,
      fraction:canonical/measured.totalLengthM,position:[...position.position],
      curveParameter:position.t,snappedToFreeKnot:position.snappedToFreeKnot,
      source:'RUST_COMPAT_CURVE_ARCLENGTH_PROPOSAL_NOT_COMMITTED',
      command:{kind:'SplitBoundary',panel:panelId,edge,at_m:canonical},
      manufacturingApproved:false,
      caution:'Preview uses the Rust-compatible 0.25 mm cubic flatten and physical station solver, not SVG chord lengths. Rust independently validates the edit; grade, seam and notch topology require subsequent QA.'}
  }catch(e){return {ok:false,reason:e?.message||String(e),manufacturingApproved:false}}
}
