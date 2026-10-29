// Independent read-only DXF R10 receiver audit for Seamly2D graded exports.
// This reader does not reuse EXO's drawing parser or infer receiving-CAD approval.
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { evaluateSeamly2DSizeRun20261023 } from './seamly2dNativeEngine20261023.mjs'

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const fail = (code, reason) => ({ ok: false, code, reason, receivingCadApproved: false, factoryApproved: false, physicalSampleApproved: false })
const finite = (value, what) => { const n = Number(value); if (!Number.isFinite(n)) throw Error(`Invalid ${what}`); return n }
const val = (item, code, fallback) => {
  const value = item.pairs.find(pair => pair[0] === code)?.[1]
  return value === undefined ? fallback : value
}

export function inspectAamaR10Dxf20261023(bytes, { declaredUnit, mmPerDrawingUnit } = {}) {
  if (!['mm', 'cm', 'in'].includes(declaredUnit)) throw Error('Explicit receiving unit declaration required (mm, cm or in)')
  if (!(Number.isFinite(mmPerDrawingUnit) && mmPerDrawingUnit > 0)) throw Error('Explicit positive mmPerDrawingUnit scale required')
  if (Math.abs(mmPerDrawingUnit - { mm: 1, cm: 10, in: 25.4 }[declaredUnit]) > 1e-9) throw Error('Unit declaration and mmPerDrawingUnit disagree')
  const data = Buffer.isBuffer(bytes) ? bytes.toString('utf8') : String(bytes)
  const lines = data.replace(/\r\n/g, '\n').trimEnd().split('\n')
  if (lines.length % 2 !== 0) throw Error('Incomplete DXF code/value pair')
  const groups = []
  for (let i = 0; i < lines.length; i += 2) {
    const n = Number(lines[i].trim())
    if (!Number.isSafeInteger(n) || n < 0) throw Error('Invalid DXF group code')
    groups.push([n, lines[i+1].trim()])
  }
  const sections = new Map()
  let section = null
  let item = null
  for (let i = 0; i < groups.length; i++) {
    const [code, value] = groups[i]
    if (code === 0 && value === 'SECTION') {
      if (groups[i+1]?.[0] !== 2) throw Error('Invalid SECTION name')
      section = groups[++i][1]
      if (sections.has(section)) throw Error('Duplicate DXF section')
      sections.set(section, [])
      item = null
    } else if (code === 0 && value === 'ENDSEC') { section = null; item = null }
    else if (section && code === 0) { item = { type:value, pairs:[] }; sections.get(section).push(item) }
    else if (item) item.pairs.push([code,value])
  }
  // HEADER variables use group code 9, so parse separately.
  let acadver = null, insunits = null
  for (let i = 0; i < groups.length - 1; i++) {
    if (groups[i][0] === 9 && groups[i][1] === '$ACADVER') acadver = groups[i+1][1]
    if (groups[i][0] === 9 && groups[i][1] === '$INSUNITS') insunits = finite(groups[i+1][1], '$INSUNITS')
  }
  if (acadver !== 'AC1009') throw Error(`Expected AutoCAD R10 (AC1009), received ${acadver || 'none'}`)
  if (insunits !== null && insunits !== { mm:4, cm:5, in:1 }[declaredUnit]) throw Error('DXF $INSUNITS conflicts with declared unit scale')
  const records = [...(sections.get('BLOCKS') || []), ...(sections.get('ENTITIES') || [])]
  if (!sections.has('ENTITIES') || !sections.has('BLOCKS')) throw Error('Missing DXF BLOCKS or ENTITIES')
  const contours = []
  const unsupported = new Map()
  let active = null
  for (const entry of records) {
    if (active && !['VERTEX','SEQEND'].includes(entry.type)) throw Error('Unexpected entity inside POLYLINE')
    if (entry.type === 'POLYLINE') {
      if (active) throw Error('Nested POLYLINE')
      const flag = finite(val(entry,70,'0'),'POLYLINE flag')
      if (!(flag & 1) || (flag & ~1)) throw Error('Open or unsupported POLYLINE geometry')
      if (Math.abs(finite(val(entry,30,'0'),'POLYLINE elevation')) > 1e-9) throw Error('Nonplanar POLYLINE')
      if (Math.abs(finite(val(entry,210,'0'),'POLYLINE extrusion X')) > 1e-9 ||
          Math.abs(finite(val(entry,220,'0'),'POLYLINE extrusion Y')) > 1e-9 ||
          Math.abs(finite(val(entry,230,'1'),'POLYLINE extrusion Z') - 1) > 1e-9) throw Error('Unsupported POLYLINE extrusion')
      active = { layer:val(entry,8,'0'), vertices:[], space:'mm' }
    } else if (entry.type === 'VERTEX') {
      if (!active) throw Error('VERTEX without POLYLINE')
      if (Math.abs(finite(val(entry,30,'0'),'VERTEX z')) > 1e-9) throw Error('Nonplanar VERTEX')
      if (Math.abs(finite(val(entry,42,'0'),'bulge')) > 1e-12) throw Error('Curved polyline segments require independent curve analysis')
      active.vertices.push([finite(val(entry,10,NaN),'vertex X')*mmPerDrawingUnit,finite(val(entry,20,NaN),'vertex Y')*mmPerDrawingUnit])
    } else if (entry.type === 'SEQEND') {
      if (!active) throw Error('SEQEND without POLYLINE')
      if (active.vertices.length < 3) throw Error('Polyline has fewer than three vertices')
      const pts=active.vertices
      let area=0,perimeter=0
      for(let i=0;i<pts.length;i++){const p=pts[i],q=pts[(i+1)%pts.length];area+=p[0]*q[1]-p[1]*q[0];perimeter+=Math.hypot(q[0]-p[0],q[1]-p[1])}
      area=Math.abs(area)/2
      if (!(area>1e-8 && perimeter>0)) throw Error('Degenerate contour')
      contours.push({ layer:active.layer, points:pts.length, areaMm2:Number(area.toFixed(5)), perimeterMm:Number(perimeter.toFixed(5)), closure:'closed', degree:pts.length })
      active=null
    } else if (['LWPOLYLINE','SPLINE','ARC','ELLIPSE','INSERT','LINE'].includes(entry.type)) {
      unsupported.set(entry.type,(unsupported.get(entry.type)||0)+1)
    } else if (!['BLOCK','ENDBLK','TEXT','POINT','ATTDEF','ATTRIB'].includes(entry.type)) {
      unsupported.set(entry.type,(unsupported.get(entry.type)||0)+1)
    }
  }
  if(active) throw Error('Unterminated POLYLINE')
  if(!contours.length) throw Error('No supported closed outlines in DXF')
  return { acadver, declaredUnit, mmPerDrawingUnit, dxfInsunits:insunits, headerUnitDeclared: insunits !== null, drawingScaleIndependentlyVerified: false,
    contours, contourCount: contours.length, totalAreaMm2:Number(contours.reduce((s,c)=>s+c.areaMm2,0).toFixed(5)),
    totalPerimeterMm:Number(contours.reduce((s,c)=>s+c.perimeterMm,0).toFixed(5)),
    entityKindsOutsideClosedOutlines:Object.fromEntries(unsupported),
    interpretiveLimits:['Contour roles (cut versus sewline) and physical scale require recipient confirmation',
      ...(unsupported.has('INSERT')?['Block INSERT transforms were not independently resolved']:[]),
      ...(unsupported.has('SPLINE') || unsupported.has('ARC') || unsupported.has('ELLIPSE')?['Curved entity geometry requires separate receiving-CAD verification']:[])] }
}

export function auditSeamlyAamaReceivingRoundtrip20261023({ run, declaredUnit, mmPerDrawingUnit } = {}) {
  try {
    if (!run?.ok || !Array.isArray(run.results) || run.results.length !== 2) return fail('TWO_SIZES_REQUIRED','Exactly two successful native Seamly2D size exports required')
    const sizes = run.results.map(x => x.sizeCm)
    if (new Set(sizes).size !== 2 || !sizes.every(Number.isInteger)) return fail('INVALID_SIZES','Two distinct numeric sizes required')
    const rows=[]
    for(const result of run.results){
      if(result.format !== 'aama-r10' || result.artifacts?.length !== 1) return fail('INVALID_EXPORT','One native AAMA R10 artifact required per size')
      const art=result.artifacts[0]
      if (!art.filename || !fs.statSync(art.filename).isFile()) return fail('MISSING_ARTIFACT','Missing DXF artifact')
      const bytes=fs.readFileSync(art.filename)
      if(bytes.length !== art.sizeBytes || sha256(bytes) !== art.sha256) return fail('HASH_MISMATCH','Native artifact SHA-256 or byte count differs')
      const inspection=inspectAamaR10Dxf20261023(bytes,{declaredUnit,mmPerDrawingUnit})
      rows.push({sizeCm:result.sizeCm,filename:art.filename,sha256:art.sha256,bytes:bytes.length,...inspection})
    }
    if(rows[0].contourCount !== rows[1].contourCount) return fail('CONTOUR_COUNT_MISMATCH','Size run contour count differs')
    if(rows[0].sha256 === rows[1].sha256 || rows[0].contours.every((c,i)=>c.areaMm2===rows[1].contours[i].areaMm2 && c.perimeterMm===rows[1].contours[i].perimeterMm)) return fail('NO_GRADE_CHANGE','Sizes do not show measurable contour variation')
    const manifest = { format:'exo-seamly-aama-receiver-qa.v1',engine:'Seamly2D',sizesCm:sizes,
      declaredUnit,mmPerDrawingUnit,artifacts:rows.map(({sizeCm,sha256,bytes,filename})=>({sizeCm,sha256,bytes,filename})),
      unresolvedSignoff:{externalReceiverCAD:false,unitScaleWitness:false,cutlineSewlineSemantics:false,physicalSample:false},
      receivingCadApproved:false,factoryApproved:false,physicalSampleApproved:false }
    return {ok:true, status:'LOCAL_DXF_INSPECTION_ONLY',rows,manifest,receivingCadApproved:false,factoryApproved:false,physicalSampleApproved:false}
  } catch(error){return fail('RECEIVER_AUDIT_REJECTED',error.message)}
}

export function generateNativeReceivingAudit20261023({patternPath,measurementsPath,outputRoot,declaredUnit,mmPerDrawingUnit, sizesCm=[48,52],heightCm=176}={}){
  const run=evaluateSeamly2DSizeRun20261023({patternPath,measurementsPath,outputRoot,format:'aama-r10',sizesCm,heightCm})
  if(!run.ok)return fail(run.code,run.reason)
  return auditSeamlyAamaReceivingRoundtrip20261023({run,declaredUnit,mmPerDrawingUnit})
}
