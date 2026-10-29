// Non-mutating, conservative geometry preflight for EXO quadratic-edge patterns.
// This is a development QA report, never a factory release certificate.
import { gradePiece } from './grading.js'

const finite = n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 1e6
const point = p => p && finite(p.x) && finite(p.y)
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k)
const validIndex = (n, count) => Number.isInteger(n) && n >= 0 && n < count

function safeCopy(value, budget = { count: 0 }, depth = 0) {
  if (++budget.count > 24000 || depth > 28) throw new Error('Input exceeds inspection budget')
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') return value
  if (typeof value !== 'object' || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null && !Array.isArray(value))) throw new Error('Unsupported input object')
  if (budget.seen?.has(value)) throw new Error('Cyclic or shared input object')
  ;(budget.seen ||= new WeakSet()).add(value)
  const keys = Reflect.ownKeys(value)
  if (keys.some(k => typeof k !== 'string' || (k !== 'length' && !Object.getOwnPropertyDescriptor(value, k)?.enumerable))) throw new Error('Hidden or symbol metadata cannot be verified')
  const result = Array.isArray(value) ? [] : Object.create(null)
  for (const key of keys) {
    if (key === 'length' && Array.isArray(value)) continue
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') throw new Error('Unsafe input key')
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (!own(descriptor, 'value')) throw new Error('Accessor input cannot be verified')
    result[key] = safeCopy(descriptor.value, budget, depth + 1)
  }
  return result
}

function sampledBoundary(piece) {
  const result = []
  for (let i = 0; i < piece.points.length; i++) {
    const a = piece.points[i], b = piece.points[(i + 1) % piece.points.length]
    const c = piece.curves?.[i]
    for (let k = 0; k < (c ? 16 : 1); k++) {
      const t = c ? k / 16 : 0, u = 1 - t
      result.push(c ? { x: u*u*a.x + 2*u*t*c.cx + t*t*b.x, y: u*u*a.y + 2*u*t*c.cy + t*t*b.y } : { x:a.x, y:a.y })
    }
  }
  return result
}
const cross = (a,b,c) => (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)
function segmentsIntersect(a,b,c,d) {
  const eps = 1e-9
  const ab1=cross(a,b,c), ab2=cross(a,b,d), cd1=cross(c,d,a), cd2=cross(c,d,b)
  if ((ab1 > eps && ab2 < -eps || ab1 < -eps && ab2 > eps) &&
      (cd1 > eps && cd2 < -eps || cd1 < -eps && cd2 > eps)) return true
  const within = (p,q,r) => Math.min(p.x,q.x)-eps <= r.x && r.x <= Math.max(p.x,q.x)+eps && Math.min(p.y,q.y)-eps <= r.y && r.y <= Math.max(p.y,q.y)+eps
  return (Math.abs(ab1)<=eps && within(a,b,c)) || (Math.abs(ab2)<=eps && within(a,b,d)) ||
    (Math.abs(cd1)<=eps && within(c,d,a)) || (Math.abs(cd2)<=eps && within(c,d,b))
}

export function preflightAdvancedCadGradedCurves(project, { maxSizes = 16 } = {}) {
  const diagnostics = []
  const add = (code, path, message, size = null) => diagnostics.push({ severity:'error', code, path, size, message })
  let source
  try { source = safeCopy(project) } catch(e) {
    add('UNSAFE_SOURCE', 'project', e.message)
    return { ok:false, manufacturingApproved:false, diagnostics, checkedSizes:[] }
  }
  if (!Array.isArray(source?.pieces) || source.pieces.length < 1 || source.pieces.length > 64) add('PIECE_COUNT','pieces','Provide 1–64 pattern pieces.')
  const sizes = source?.grading?.sizes
  if (!Array.isArray(sizes) || !sizes.length || sizes.length > maxSizes || maxSizes > 32 ||
      sizes.some(s => typeof s !== 'string' || !s.trim()) || new Set(sizes).size !== sizes.length ||
      !sizes.includes(source?.grading?.baseSize)) add('GRADE_SIZES','grading','Specify a unique, bounded size list containing baseSize.')
  if (diagnostics.length) return { ok:false, manufacturingApproved:false, diagnostics, checkedSizes:[] }
  const ids = new Set()
  const inspect = (piece, path, size) => {
    const n = piece?.points?.length
    if (!Array.isArray(piece?.points) || n < 3 || n > 128) { add('POINT_COUNT',path,'A piece requires 3–128 boundary vertices.',size); return }
    if (piece.points.some(p => !point(p))) { add('NONFINITE_POINT',path+'.points','Use finite coordinates within ±1,000,000 cm.',size); return }
    if (piece.curves != null) {
      if (!piece.curves || typeof piece.curves !== 'object' || Array.isArray(piece.curves)) add('CURVE_MAP',path+'.curves','Curves must be keyed by zero-based edge index.',size)
      else for (const [key,c] of Object.entries(piece.curves)) {
        if (!/^(0|[1-9]\d*)$/.test(key) || !validIndex(Number(key),n)) add('CURVE_EDGE',path+'.curves.'+key,'Remove stale curve indices after topology edits.',size)
        if (!c || !finite(c.cx) || !finite(c.cy)) add('CURVE_CONTROL',path+'.curves.'+key,'Provide finite quadratic control cx/cy.',size)
      }
    }
    if (!finite(piece.seamAllowance ?? 0) || (piece.seamAllowance ?? 0) < 0 || piece.seamAllowance > 100) add('ALLOWANCE',path+'.seamAllowance','Allowance must be 0–100 cm.',size)
    if (piece.edgeSeamAllowances != null) {
      if (!piece.edgeSeamAllowances || typeof piece.edgeSeamAllowances !== 'object' || Array.isArray(piece.edgeSeamAllowances)) add('EDGE_ALLOWANCE_MAP',path+'.edgeSeamAllowances','Provide a numeric edge allowance map.',size)
      else for (const [key,v] of Object.entries(piece.edgeSeamAllowances))
        if (!/^(0|[1-9]\d*)$/.test(key) || !validIndex(Number(key),n) || !finite(v) || v < 0 || v > 100) add('EDGE_ALLOWANCE',path+'.edgeSeamAllowances.'+key,'Use a current edge index and a 0–100 cm allowance.',size)
    }
    if (piece.notches != null && (!Array.isArray(piece.notches) || piece.notches.length > 512)) add('NOTCH_COUNT',path+'.notches','Limit notches to 512 per piece.',size)
    else for (const [i,notch] of (piece.notches || []).entries()) {
      if (!notch || !validIndex(notch.edgeIndex,n) || !finite(notch.t ?? .5) || (notch.t ?? .5) < 0 || (notch.t ?? .5) > 1 ||
        (notch.depthCm != null && (!finite(notch.depthCm) || notch.depthCm < 0))) add('NOTCH_ANCHOR',path+'.notches.'+i,'Anchor notch to an existing edge at t=0..1 with nonnegative depth.',size)
      if (notch && (own(notch,'x') || own(notch,'y')) && !point(notch)) add('NOTCH_POSITION',path+'.notches.'+i,'Stored notch x/y must both be finite.',size)
    }
    if (piece.internalLines != null && (!Array.isArray(piece.internalLines) || piece.internalLines.length > 512)) add('INTERNAL_LINE_COUNT',path+'.internalLines','Limit internal lines to 512.',size)
    else for (const [i,line] of (piece.internalLines || []).entries()) {
      if (!point(line?.a) || !point(line?.b)) add('INTERNAL_ENDPOINT',path+'.internalLines.'+i,'Line endpoints must be finite.',size)
      for (const end of ['aAnchor','bAnchor']) if (line?.[end]) {
        const a = line[end]
        if (!(validIndex(a.vertexIndex,n) || (a.vertexIndex == null && validIndex(a.edgeIndex,n) && finite(a.t) && a.t >= 0 && a.t <= 1)))
          add('EDGE_REFERENCE',path+'.internalLines.'+i+'.'+end,'Reference a valid vertex or edge and t=0..1.',size)
      }
    }
    if (diagnostics.some(d => d.path.startsWith(path) && d.size === size)) return
    const outline = sampledBoundary(piece)
    if (outline.some(p => !point(p))) {add('SAMPLE_OVERFLOW',path,'Sampled curve exceeds coordinate bounds.',size);return}
    const area = outline.reduce((a,p,i) => {const q=outline[(i+1)%outline.length];return a+p.x*q.y-q.x*p.y},0)/2
    if (Math.abs(area) < 1e-7) add('ZERO_AREA',path,'Check boundary winding and area.',size)
    for (let i=0;i<outline.length;i++) {
      const a=outline[i], b=outline[(i+1)%outline.length]
      if (Math.hypot(a.x-b.x,a.y-b.y)<1e-7) {add('ZERO_EDGE',path,'Remove coincident sampled boundary stations.',size);break}
      for (let j=i+2;j<outline.length;j++) {
        if (i===0 && j===outline.length-1) continue
        if (segmentsIntersect(a,b,outline[j],outline[(j+1)%outline.length])) {
          add('SELF_INTERSECTION',path,'Repair crossing or touching cutline edges.',size)
          return
        }
      }
    }
  }
  for (const [i,p] of source.pieces.entries()) {
    if (typeof p?.id !== 'string' || !p.id || ids.has(p.id)) add('PIECE_ID','pieces.'+i,'Each piece needs a unique nonempty id.')
    else ids.add(p.id)
    inspect(p,'pieces.'+i,null)
  }
  if (diagnostics.length) return { ok:false, manufacturingApproved:false, diagnostics, checkedSizes:[] }
  const checkedSizes = []
  for (const size of sizes) {
    for (const [i,p] of source.pieces.entries()) {
      let graded
      try { graded = gradePiece(p,source.grading,size) }
      catch(e) {add('GRADE_FAILURE','pieces.'+i,'Grading failed: '+e.message,size);continue}
      if (graded.points?.length !== p.points.length) add('GRADE_TOPOLOGY','pieces.'+i,'Graded vertex count changed.',size)
      inspect(graded,'pieces.'+i,size)
      // Current gradePiece can copy plain notch coordinates without relocating them.
      if (size !== source.grading.baseSize && p.notches?.some(n => point(n)) &&
          !p.points.some(v => v.industrialGradeRule) && !(p.internalLines||[]).some(l=>l.aAnchor||l.bAnchor))
        add('NOTCH_GRADE_DRIFT','pieces.'+i+'.notches','Coordinate notches are copied through grading; attach and recompute their physical positions.',size)
    }
    checkedSizes.push(size)
  }
  return { ok:diagnostics.length===0, manufacturingApproved:false, diagnostics, checkedSizes }
}
