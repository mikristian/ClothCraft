/**
 * GarmentCode/PyGarment v2 read-only interoperability gate.
 * Semantics are independently implemented from the open schema, not copied
 * from the MIT-licensed Python library. Prevents silent dropped sewing edges,
 * wrong centimetre scale and quadratic/cubic confusion in our narrower parser.
 * Verified against local GarmentCode commit d449629979028123a5c4dc9e732a2ec19b7fce31.
 */
const finite = n => typeof n === 'number' && Number.isFinite(n)
const edgeIndex = (n, length) => Number.isInteger(n) && n >= 0 && n < length

export function inspectGarmentCodeImport(spec) {
  const issues = [], warnings = []
  const block = (code, location, message) => issues.push({code, location, message, severity:'blocker'})
  const warn = (code, location, message) => warnings.push({code, location, message, severity:'warning'})
  const panels = spec?.pattern?.panels
  const stitches = spec?.pattern?.stitches
  if (!panels || typeof panels !== 'object' || Array.isArray(panels) || !Object.keys(panels).length || Object.keys(panels).length > 1000) {
    block('PANELS_MISSING','pattern.panels','Pattern must contain 1–1000 named panels.')
  }
  if (!Array.isArray(stitches) || stitches.length > 100000) block('STITCHES_INVALID','pattern.stitches','Stitches must be an array of at most 100000 pairs.')
  const properties = spec?.properties || {}
  if (!Number.isFinite(Number(properties.units_in_meter ?? 100)) || Number(properties.units_in_meter ?? 100) !== 100) {
    block('UNSUPPORTED_UNITS','properties.units_in_meter','This import path only accepts 100 pattern units per metre (centimetres); convert other units before import.')
  }
  if (properties.curvature_coords != null && properties.curvature_coords !== 'relative') {
    block('UNSUPPORTED_CURVE_COORDS','properties.curvature_coords','Absolute curve controls need explicit conversion to relative quadratic coordinates.')
  }
  if (properties.normalize_panel_translation === true) {
    block('UNSUPPORTED_TRANSLATION_NORMALIZATION','properties.normalize_panel_translation','Translation normalization is not implemented in this importer.')
  }
  if (issues.some(i => ['PANELS_MISSING','STITCHES_INVALID'].includes(i.code))) return result()

  const entries = Object.entries(panels)
  const edgeCountByName = new Map()
  for (const [name,panel] of entries) {
    const root = `pattern.panels.${name}`
    if (!name.trim() || name.length > 180 || !panel || typeof panel !== 'object' || Array.isArray(panel)) {
      block('INVALID_PANEL',root,'Panel name/object must be valid.')
      continue
    }
    const vertices = panel.vertices
    if (!Array.isArray(vertices) || vertices.length < 3 || vertices.length > 20000 || vertices.some(v => !Array.isArray(v) || v.length !== 2 || v.some(n => !finite(n)))) {
      block('INVALID_VERTICES',root,'Require three or more finite 2D vertices, at most 20000.')
      continue
    }
    const edges = panel.edges
    if (edges != null && !Array.isArray(edges)) {
      block('INVALID_EDGES',root,'Edges must be an array when provided.')
      continue
    }
    if (edges && edges.length !== vertices.length) {
      block('EDGE_LOOP_COUNT',root,'This importer requires one closed loop with one edge per vertex.')
      continue
    }
    edgeCountByName.set(name,edges?.length||vertices.length)
    if (edges?.length) {
      const degree = vertices.map(()=>0)
      const keys = new Set()
      for (const [i,edge] of edges.entries()) {
        const at = `${root}.edges[${i}]`
        const ends = edge?.endpoints
        if (!Array.isArray(ends) || ends.length !== 2 || !edgeIndex(ends[0], vertices.length) || !edgeIndex(ends[1], vertices.length) || ends[0] === ends[1]) {
          block('EDGE_ENDPOINT',at,'Edge endpoints must be distinct in-range integer vertex indices.')
          continue
        }
        const key = [ends[0], ends[1]].sort((a,b)=>a-b).join(':')
        if (keys.has(key)) block('DUPLICATE_EDGE',at,'Duplicated geometric edge would corrupt closed-loop mapping.')
        keys.add(key)
        degree[ends[0]]++
        degree[ends[1]]++
        if (edge.curvature) {
          const shape=edge.curvature
          if(shape.type !== 'quadratic' || !Array.isArray(shape.params) || shape.params.length !== 1 ||
            !Array.isArray(shape.params[0]) || shape.params[0].length !== 2 || !shape.params[0].every(finite)) {
            block('UNSUPPORTED_CURVE',at,'Only finite relative quadratic curve controls are currently supported; cubic edges cannot be flattened silently.')
          }
        }
      }
      if (degree.some(value => value !== 2)) block('OPEN_OR_BRANCHING_LOOP',root,'Every vertex must have exactly two connected edges.')
      if (degree.every(value=>value===2)) {
        const adjacency=vertices.map(()=>[])
        for(const edge of edges){if(!Array.isArray(edge?.endpoints)||edge.endpoints.length!==2||!edge.endpoints.every(x=>edgeIndex(x,vertices.length)))continue;const [a,b]=edge.endpoints;adjacency[a].push(b);adjacency[b].push(a)}
        const seen = new Set([0]), todo=[0]
        while(todo.length){const current=todo.pop();for(const next of adjacency[current])if(!seen.has(next)){seen.add(next);todo.push(next)}}
        if(seen.size !== vertices.length)block('DISCONNECTED_LOOPS',root,'Multiple loops/holes require a dedicated importer, not silent reordering.')
      }
    } else {
      warn('INFERRED_EDGES',root,'Edge loop will be inferred in listed vertex order; verify it is the intended cutline.')
    }
    if (panel.translation != null && (!Array.isArray(panel.translation) || panel.translation.length !== 3 || !panel.translation.every(finite))) {
      block('INVALID_TRANSLATION',root,'Panel placement requires three finite 3D coordinates.')
    }
    if (panel.rotation != null && (!Array.isArray(panel.rotation) || panel.rotation.length !== 3 || !panel.rotation.every(finite))) {
      block('INVALID_ROTATION',root,'Panel orientation requires three finite 3D values.')
    }
  }
  if (Array.isArray(stitches)) for (const [i,stitch] of stitches.entries()) {
    if (!Array.isArray(stitch) || stitch.length !== 2) {block('INVALID_STITCH_PAIR',`stitches[${i}]`,'Sewing pair must have exactly two endpoints.');continue}
    const locations=[]
    for (const [j,end] of stitch.entries()) {
      if (!end || typeof end.panel !== 'string' || !edgeCountByName.has(end.panel) || !edgeIndex(end.edge,edgeCountByName.get(end.panel))) {
        block('DANGLING_SEWING_EDGE',`stitches[${i}][${j}]`,'Sewing pair references unknown panel or out-of-range edge.')
      } else locations.push(`${end.panel}:${end.edge}`)
    }
    if (locations.length === 2 && locations[0] === locations[1]) block('SELF_SEWING_EDGE',`stitches[${i}]`,'Identical edge cannot be sewn to itself.')
  }
  return result()

  function result(){return {ok:issues.length===0,issues,warnings,panelCount:panels&&!Array.isArray(panels)?Object.keys(panels).length:0,stitchCount:Array.isArray(stitches)?stitches.length:0,factoryCertified:false}}
}

export function assertGarmentCodeImportable(spec) {
  const report = inspectGarmentCodeImport(spec)
  if (!report.ok) {
    const detail=report.issues.slice(0,4).map(row=>`${row.code} at ${row.location}`).join('; ')
    throw new Error(`GarmentCode import blocked to prevent data loss: ${detail}`)
  }
  return report
}
