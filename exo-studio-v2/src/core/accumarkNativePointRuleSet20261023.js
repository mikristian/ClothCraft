// Named-size per-vertex grade rules. Preview-only: does not update the native Rust session.
const SOURCE = 'INDEPENDENT_PER_POINT_EXO_NATIVE_RULES_NOT_RUST_COMMITTED'
const SCHEMA = 'exo.native.point-grading.v1'
const fail = (reason, metadata = {}) => ({ok:false,reason,...metadata})
const finite = n => typeof n === 'number' && Number.isFinite(n)
const xy = p => Array.isArray(p) && p.length === 2 && p.every(finite)
const clone = value => structuredClone(value)
const own = (obj,key) => Object.prototype.hasOwnProperty.call(obj,key)
const safeName = name => typeof name === 'string' && !!name.trim() &&
  name.length <= 256 && !['__proto__','prototype','constructor'].includes(name)

function sourcePanels(snapshot) {
  const panels = snapshot?.template?.panels
  if (!Array.isArray(panels) || !panels.length || panels.length > 256)
    throw Error('Native template must contain 1–256 panels')
  const ids = new Set()
  for (const panel of panels) {
    if (!safeName(panel?.id) || ids.has(panel.id)) throw Error('Duplicate or unsafe native panel ID')
    ids.add(panel.id)
    const p = panel.polygon
    if (!p || !Array.isArray(p.points) || p.points.length < 3 || p.points.length > 10000 ||
      !p.points.every(xy) || !Array.isArray(p.edges) || p.edges.length !== p.points.length ||
      p.edges.some(edge => !safeName(edge)) || new Set(p.edges).size !== p.edges.length)
      throw Error(`Invalid native polygon points or edges in panel ${panel.id}`)
    if (p.holes?.length || p.lines?.length)
      throw Error(`Unsupported internal lines or holes in panel ${panel.id}`)
    for (const [edge, controls] of Object.entries(p.curves || {})) {
      if (!p.edges.includes(edge) || !Array.isArray(controls) || controls.length !== 2 ||
        !controls.every(xy)) throw Error(`Invalid cubic controls in panel ${panel.id}`)
    }
    for (const [edge, knots] of Object.entries(p.free_curve_points || {})) {
      if (!p.edges.includes(edge) || !Array.isArray(knots)) throw Error(`Invalid free curve in panel ${panel.id}`)
      for (const knot of knots) {
        if (!finite(knot?.t) || knot.t <= 0 || knot.t >= 1 || !xy(knot.position) ||
          ['derivative','derivative_in','derivative_out'].some(key => knot[key] != null && !xy(knot[key])))
          throw Error(`Invalid free curve knot in panel ${panel.id}`)
      }
    }
  }
  return panels
}

// Deterministic FNV-1a over authored source topology + coordinates, independent
// of compiled UV mesh/revision. Changing points, curves or IDs invalidates rules.
function fingerprint(panels) {
  const data = JSON.stringify(panels.map(p => [p.id,p.polygon.points,p.polygon.edges,
    p.polygon.curves || {},p.polygon.free_curve_points || {},p.polygon.holes || [],
    p.polygon.lines || []]))
  let hash = 2166136261
  for (let i = 0; i < data.length; i++) {
    hash ^= data.charCodeAt(i)
    hash = Math.imul(hash,16777619)
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8,'0')}:${data.length}`
}

function check(snapshot, ruleSet) {
  const panels = sourcePanels(snapshot)
  if (ruleSet?.schema !== SCHEMA || !Array.isArray(ruleSet.sizes) ||
    ruleSet.sizes.length < 2 || ruleSet.sizes.length > 24 ||
    ruleSet.sizes.some(s => !safeName(s) || s.length > 32) ||
    new Set(ruleSet.sizes).size !== ruleSet.sizes.length ||
    !ruleSet.sizes.includes(ruleSet.baseSize))
    throw Error('Invalid native point grading rule set or sizes')
  const sourceHash = fingerprint(panels)
  if (sourceHash !== ruleSet.templateFingerprint)
    throw Error('Stale native source polygon or panel ID; recreate point grading rules')
  const entries = Object.keys(ruleSet.panels || {})
  if (entries.length !== panels.length || panels.some(p => !own(ruleSet.panels,p.id)))
    throw Error('Stale or incomplete rule panel IDs')
  for (const panel of panels) {
    const item = ruleSet.panels[panel.id]
    if (item.sourcePointCount !== panel.polygon.points.length ||
      Object.keys(item.pointOffsetsMm || {}).length !== ruleSet.sizes.length)
      throw Error(`Stale point count or size offsets for ${panel.id}`)
    for (const size of ruleSet.sizes) {
      const offsets = item.pointOffsetsMm[size]
      if (!Array.isArray(offsets) || offsets.length !== panel.polygon.points.length ||
        !offsets.every(xy)) throw Error(`Invalid point offset vector for ${panel.id}/${size}`)
      if (size === ruleSet.baseSize && offsets.some(([x,y]) => x !== 0 || y !== 0))
        throw Error('Base size cannot have point grading offsets')
    }
  }
  return panels
}

export function createAccuMarkNativeRuleSet(snapshot,{sizes=['XS','S','M','L','XL','XXL'],baseSize='M'}={}) {
  try {
    if (!Array.isArray(sizes) || sizes.length < 2 || sizes.length > 24 ||
      sizes.some(s => !safeName(s) || s.length > 32) ||
      new Set(sizes).size !== sizes.length || !sizes.includes(baseSize))
      return fail('Invalid named sizes or base size')
    const panels = sourcePanels(snapshot), byId = Object.create(null)
    for (const panel of panels) {
      const pointOffsetsMm = Object.create(null)
      for (const size of sizes) pointOffsetsMm[size] = panel.polygon.points.map(() => [0,0])
      byId[panel.id] = {sourcePointCount:panel.polygon.points.length,pointOffsetsMm}
    }
    return {ok:true,ruleSet:{schema:SCHEMA,templateFingerprint:fingerprint(panels),
      sizes:[...sizes],baseSize,panels:byId,source:SOURCE}}
  } catch (e) {return fail(e.message)}
}

export function editAccuMarkNativePointRule(snapshot,ruleSet,{
  panelId,pointIndex,size,dxMm,dyMm,maintainGrowths=false,
}={}) {
  try {
    const panels = check(snapshot,ruleSet)
    const panel = panels.find(p => p.id === panelId)
    if (!panel) return fail('Unknown native panel ID',{panelId})
    if (!Number.isInteger(pointIndex) || pointIndex < 0 || pointIndex >= panel.polygon.points.length)
      return fail('Point index is outside native source polygon',{panelId,pointIndex})
    if (!ruleSet.sizes.includes(size) || size === ruleSet.baseSize)
      return fail('Only non-base named sizes can be edited',{size})
    if (!finite(dxMm) || !finite(dyMm) || Math.abs(dxMm)>1e6 || Math.abs(dyMm)>1e6)
      return fail('Grade offsets must be finite millimetres within ±1,000,000',{size,pointIndex})
    if (maintainGrowths)
      return fail('Maintain growths is not yet defined for independent point rules; edit each size explicitly')
    const next = clone(ruleSet)
    next.panels[panelId].pointOffsetsMm[size][pointIndex] = [dxMm,dyMm]
    return {ok:true,ruleSet:next}
  } catch (e) {return fail(e.message)}
}

export function compileAccuMarkNativeRuleSizeRun(snapshot,ruleSet,{selectedSize='L'}={}) {
  try {
    const panels = check(snapshot,ruleSet)
    if (!ruleSet.sizes.includes(selectedSize)) return fail('Selected size is absent from rule set',{selectedSize})
    const byPanel=Object.create(null),issues=[]
    for (const panel of panels) {
      const source=panel.polygon
      const curved=Object.keys(source.curves || {}).length ||
        Object.values(source.free_curve_points || {}).some(knots=>knots?.length)
      const sizeRun=Object.create(null)
      let issue=null
      for (const size of ruleSet.sizes) {
        const offsets=ruleSet.panels[panel.id].pointOffsetsMm[size]
        const polygon=clone(source)
        polygon.points=source.points.map(([x,y],index)=>[
          x+offsets[index][0]/1000,y+offsets[index][1]/1000])
        // Deform each cubic control by the linear interpolation of the
        // endpoint offsets at its Bezier parameter (1/3 and 2/3).
        // Hermite knots follow a linear blend
        // of endpoint displacement and tangent vectors gain the displacement
        // gradient. This is an approximate preview, not Rust grade persistence.
        if (curved && offsets.some(([x,y])=>x!==0||y!==0)) {
          const translate=(p,delta)=>p.map((v,k)=>v+delta[k])
          for(let i=0;i<source.edges.length;i++) {
            const edge=source.edges[i],start=offsets[i].map(v=>v/1000)
            const end=offsets[(i+1)%offsets.length].map(v=>v/1000)
            if (source.curves?.[edge]) {
              polygon.curves[edge]=[
                translate(source.curves[edge][0],start.map((v,k)=>(2*v+end[k])/3)),
                translate(source.curves[edge][1],start.map((v,k)=>(v+2*end[k])/3))]
            }
            if (source.free_curve_points?.[edge]?.length) {
              polygon.free_curve_points[edge]=source.free_curve_points[edge].map(knot=>{
                const next=clone(knot),t=knot.t
                const blend=start.map((v,k)=>v*(1-t)+end[k]*t)
                next.position=translate(knot.position,blend)
                const slope=start.map((v,k)=>end[k]-v)
                for(const key of ['derivative','derivative_in','derivative_out'])
                  if (knot[key]!=null) next[key]=translate(knot[key],slope)
                return next
              })
            }
          }
        }
        if (!polygon.points.every(xy)) {issue='Nonfinite graded coordinates';break}
        sizeRun[size]={panelId:panel.id,polygon,units:'m'}
      }
      if (issue) {issues.push({panelId:panel.id,reason:issue});continue}
      byPanel[panel.id]={ok:true,panelId:panel.id,basePolygon:clone(source),sizeRun,
        sizes:[...ruleSet.sizes],baseSize:ruleSet.baseSize,selectedSize,
        source:SOURCE,accuracy:curved?'approximate':'exact'}
    }
    if (issues.length) return fail('One or more native panels could not be graded',{issues})
    return {ok:true,byPanel,issues,source:SOURCE}
  } catch(e) {return fail(e.message)}
}
