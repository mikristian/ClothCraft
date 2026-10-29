// Pure proposal for Rust PolygonPattern (DVec2 serialized as [x,y], metres).
// Consumers must commit via their existing revision-checked native edit path.
const fail = reason => ({ok:false,reason})
const vector = value => Array.isArray(value) && value.length===2 && value.every(Number.isFinite)
const add = (p,d) => [p[0]+d[0],p[1]+d[1]]
const scale = (d,s) => [d[0]*s,d[1]*s]

/** Move a set of native contour anchors; delta coordinates are material metres.
 *  Shift-constrained drags use axis 'x' or 'y'; arrow keys may supply deltaMm.
 *  Neither sewing topology nor native session state is mutated here.
 */
export function moveCloNativePolygonPoints20261025(template,{panelId,indices,delta,deltaMm,axis='xy'}={}) {
  if (!template || !Array.isArray(template.panels) || typeof panelId!=='string' || !panelId) return fail('Native template and panel ID required')
  if (!Array.isArray(indices) || indices.length===0 || new Set(indices).size!==indices.length || !indices.every(Number.isInteger)) return fail('Select distinct integer anchor indices')
  if (!['xy','x','y'].includes(axis)) return fail('Invalid axis constraint')
  if ((delta===undefined)===(deltaMm===undefined)) return fail('Supply one displacement in metres or millimetres')
  const raw=deltaMm===undefined?delta:scale(deltaMm,0.001)
  if (!vector(raw)) return fail('Displacement must be a finite XY pair')
  const d=axis==='x'?[raw[0],0]:axis==='y'?[0,raw[1]]:raw
  const panels=template.panels.filter(p=>p?.id===panelId)
  if (panels.length!==1 || !panels[0].polygon) return fail('Unique native polygon panel required')
  const poly=panels[0].polygon, n=poly.points?.length
  if (!Number.isInteger(n) || n<3 || !Array.isArray(poly.edges) || poly.edges.length!==n || new Set(poly.edges).size!==n || !poly.edges.every(e=>typeof e==='string'&&e) || !poly.points.every(vector)) return fail('Malformed native polygon')
  if (indices.some(i=>i<0||i>=n)) return fail('Anchor index out of range')
  const selected=new Set(indices)
  if (d[0]===0 && d[1]===0) return {ok:true,template:structuredClone(template),panelId,indices:[...selected]}
  // Native seam ranges depend on physical contour arclength and must be revalidated
  // by Rust; this proposal intentionally refuses edits to sewn panels.
  if (!Array.isArray(template.seams)) return fail('Native seam inventory unavailable')
  if (template.seams.some(s=>[s?.a?.panel,s?.b?.panel].includes(panelId))) return fail('Cannot move sewn panel anchors without native seam revalidation')
  if (poly.holes?.length || poly.lines?.length || poly.vertex_mirror_groups && Object.keys(poly.vertex_mirror_groups).length || Object.values(poly.free_curve_points??{}).some(marks=>marks.some(mark=>mark.mirror_group))) return fail('Linked internal or mirrored geometry requires native revalidation')
  const moved=structuredClone(template)
  const dest=moved.panels.find(p=>p.id===panelId).polygon
  const sourceCurves=poly.curves??{}, sourceStations=poly.free_curve_points??{}
  if (typeof sourceCurves!=='object'||Array.isArray(sourceCurves)||typeof sourceStations!=='object'||Array.isArray(sourceStations)) return fail('Malformed curve inventory')
  if ([...Object.keys(sourceCurves),...Object.keys(sourceStations)].some(e=>!poly.edges.includes(e))) return fail('Unknown authored curve boundary')
  for (let i=0;i<n;i++) {
    const edge=poly.edges[i],a=selected.has(i)?d:[0,0],b=selected.has((i+1)%n)?d:[0,0]
    const controls=sourceCurves[edge]
    if (controls!==undefined) {
      if (!Array.isArray(controls)||controls.length!==2||!controls.every(vector)) return fail('Malformed cubic controls')
      dest.curves[edge]=[add(controls[0],scale(a,2/3).map((v,j)=>v+b[j]/3)),add(controls[1],scale(a,1/3).map((v,j)=>v+b[j]*2/3))]
    }
    const stations=sourceStations[edge]
    if (stations!==undefined) {
      if (!Array.isArray(stations)) return fail('Malformed free station list')
      let previous=0
      dest.free_curve_points[edge]=[]
      for (const mark of stations) {
        if (!mark || typeof mark.id!=='string'||!mark.id||!Number.isFinite(mark.t)||mark.t<=previous||mark.t>=1||!vector(mark.position)) return fail('Malformed free station')
        previous=mark.t
        const offset=[a[0]*(1-mark.t)+b[0]*mark.t,a[1]*(1-mark.t)+b[1]*mark.t]
        const slope=[b[0]-a[0],b[1]-a[1]]
        const updated={...mark,position:add(mark.position,offset)}
        for (const key of ['derivative','derivative_in','derivative_out']) if (mark[key]!=null) {
          if (!vector(mark[key])) return fail('Malformed free station derivative')
          updated[key]=add(mark[key],slope)
        }
        dest.free_curve_points[edge].push(updated)
      }
    }
  }
  for (const i of selected) dest.points[i]=add(poly.points[i],d)
  if (dest.points.some(p=>!vector(p)||p.some(x=>Math.abs(x)>10))) return fail('Moved polygon exceeds native coordinate bounds')
  return {ok:true,template:moved,panelId,indices:[...selected]}
}

export const nudgeCloNativePolygonPoints20261025=(template,options)=>moveCloNativePolygonPoints20261025(template,options)
