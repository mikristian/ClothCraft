// Experimental envelope and CUT planarity gate; source-only, not factory certification.
import {preflightPhysicalCutOverlap20261023_2000} from './physicalCutOverlapPreflight20261023_2000.mjs'

const invalid = detail => ({
  ok:false, contourCount:0, overlaps:[],
  diagnostics:[{code:'INVALID_CUT_DXF',detail}],
  manufacturingApproved:false,
})
const readNumber = (raw, name) => {
  if (raw === undefined || raw === '' || !Number.isFinite(Number(raw))) throw Error('invalid ' + name)
  return Number(raw)
}
const checkCutPolylineFlags = (raw, name) => {
  const flags=readNumber(raw ?? '0',name)
  // Closed 2D polyline, optionally with linetype generation. All other
  // bits imply unsupported fit, spline, mesh or 3D CUT semantics.
  if(flags!==1 && flags!==129) throw Error('unsupported '+name)
}
const single = (pairs, code, name) => {
  const values=pairs.filter(p=>p.code===code)
  if (values.length>1) throw Error('duplicate ' + name)
  return values[0]?.value
}
const checkZeroWidths = (record, codes, name, allowRepeated = false) => {
  for (const code of codes) {
    const values=record.filter(p=>p.code===code)
    if (!allowRepeated && values.length>1) throw Error('duplicate '+name+' width group '+code)
    for (const {value} of values) {
      if (readNumber(value,name+' width group '+code)!==0) throw Error('unsupported nonzero '+name+' width group '+code)
    }
  }
}
const checkLightVertexWidthPlacement = record => {
  let hasVertex=false
  let seen=new Set()
  for (const {code} of record) {
    if (code===10) { hasVertex=true; seen=new Set(); continue }
    if (code!==40 && code!==41) continue
    if (!hasVertex) throw Error('CUT LWPOLYLINE width before first vertex')
    if (seen.has(code)) throw Error('duplicate CUT LWPOLYLINE width on one vertex')
    seen.add(code)
  }
}
const checkPlanarity = (record, oldStyle = false) => {
  const layer=single(record,8,'CUT layer')
  if (!layer?.startsWith('CUT_')) return
  checkCutPolylineFlags(single(record,70,'CUT polyline flags'),'CUT polyline flags')
  // The overlap inspector uses only XY centerlines. DXF stroke widths change
  // the physical cut footprint, so they cannot be silently flattened to zero.
  checkZeroWidths(record,[40,41],oldStyle?'CUT POLYLINE default':'CUT LWPOLYLINE vertex',!oldStyle)
  if (!oldStyle) {
    checkZeroWidths(record,[43],'CUT LWPOLYLINE constant')
    checkLightVertexWidthPlacement(record)
  }
  const elevation=single(record,38,'CUT elevation')
  if (elevation!==undefined && readNumber(elevation,'CUT elevation')!==0) throw Error('nonzero CUT elevation')
  if (!oldStyle && record.some(p=>p.code===30)) throw Error('unsupported CUT LWPOLYLINE z coordinate')
  if (oldStyle) {
    const z=single(record,30,'CUT POLYLINE elevation z')
    if (z!==undefined && readNumber(z,'CUT POLYLINE elevation z')!==0) throw Error('nonzero CUT POLYLINE elevation')
  }
  const thickness=single(record,39,'CUT thickness')
  if (thickness!==undefined && readNumber(thickness,'CUT thickness')!==0) throw Error('nonzero CUT thickness')
  for (const [code, expected, label] of [[210,0,'extrusion x'],[220,0,'extrusion y'],[230,1,'extrusion z']]) {
    const value=single(record,code,'CUT '+label)
    if (value!==undefined && readNumber(value,'CUT '+label)!==expected) throw Error('nonplanar CUT '+label)
  }
}
export function strictCutDxfEnvelope20261023_2053(source) {
  try {
    if (typeof source!=='string' || !source.trim()) throw Error('DXF must be nonempty text')
    const lines=source.replace(/\r\n?/g,'\n').split('\n')
    if (lines.at(-1)==='') lines.pop()
    if (lines.length%2!==0) throw Error('incomplete DXF pair')
    const pairs=[]
    for(let i=0;i<lines.length;i+=2) {
      const key=lines[i].trim()
      if(!/^\d+$/.test(key)) throw Error('invalid DXF group code')
      pairs.push({code:Number(key),value:lines[i+1].trim()})
    }
    let section=null, entities=0, ended=false
    for(let i=0;i<pairs.length;) {
      const p=pairs[i]
      if(ended) throw Error('data after EOF')
      if(p.code===0 && p.value==='SECTION') {
        if(section!==null) throw Error('nested SECTION')
        if(pairs[i+1]?.code!==2 || !pairs[i+1].value) throw Error('SECTION without name')
        section=pairs[i+1].value
        if(section==='ENTITIES' && ++entities!==1) throw Error('duplicate ENTITIES section')
        i+=2
        continue
      }
      if(p.code===0 && p.value==='ENDSEC') {
        if(section===null) throw Error('unmatched ENDSEC')
        section=null
        i++
        continue
      }
      if(p.code===0 && p.value==='EOF') {
        if(section!==null) throw Error('EOF before ENDSEC')
        if(i!==pairs.length-1) throw Error('EOF must be terminal')
        ended=true
        i++
        continue
      }
      // The existing exporter emits DXF comment records between HEADER and ENTITIES.
      if(section===null && p.code===999) { i++; continue }
      if(section===null) throw Error('DXF content outside SECTION')
      if(section==='ENTITIES' && p.code===0 && p.value==='LWPOLYLINE') {
        let end=i+1
        while(end<pairs.length && pairs[end].code!==0) end++
        checkPlanarity(pairs.slice(i+1,end))
        i=end
        continue
      }
      if(section==='ENTITIES' && p.code===0 && p.value==='POLYLINE') {
        let end=i+1
        while(end<pairs.length && pairs[end].code!==0) end++
        const head=pairs.slice(i+1,end)
        const isCut=single(head,8,'POLYLINE layer')?.startsWith('CUT_')
        if(isCut) {
          checkPlanarity(head,true)
          if(single(head,66,'CUT POLYLINE vertices-follow')!=='1') throw Error('invalid CUT POLYLINE vertices-follow')
        }
        i=end
        while(i<pairs.length && pairs[i].code===0 && pairs[i].value==='VERTEX') {
          let vertexEnd=i+1
          while(vertexEnd<pairs.length && pairs[vertexEnd].code!==0) vertexEnd++
          if(isCut) {
            const vertex=pairs.slice(i+1,vertexEnd)
            const vertexLayer=single(vertex,8,'CUT VERTEX layer')
            if(vertexLayer!==undefined && vertexLayer!==single(head,8,'POLYLINE layer')) throw Error('CUT VERTEX layer differs from parent')
            const flags=single(vertex,70,'CUT VERTEX flags')
            // Nonzero VERTEX flags can describe fitted, spline, 3D, mesh or
            // polyface vertices. The downstream 2D polygon parser ignores them.
            if(flags!==undefined && readNumber(flags,'CUT VERTEX flags')!==0) throw Error('unsupported CUT VERTEX flags')
            checkZeroWidths(vertex,[40,41],'CUT VERTEX')
            const z=single(vertex,30,'CUT VERTEX z')
            if(z!==undefined && readNumber(z,'CUT VERTEX z')!==0) throw Error('nonzero CUT VERTEX z')
            for(const [code,label] of [[38,'elevation'],[39,'thickness']]) {
              const value=single(vertex,code,'CUT VERTEX '+label)
              if(value!==undefined && readNumber(value,'CUT VERTEX '+label)!==0) throw Error('nonzero CUT VERTEX '+label)
            }
            for(const [code,expected,label] of [[210,0,'extrusion x'],[220,0,'extrusion y'],[230,1,'extrusion z']]) {
              const value=single(vertex,code,'CUT VERTEX '+label)
              if(value!==undefined && readNumber(value,'CUT VERTEX '+label)!==expected) throw Error('nonplanar CUT VERTEX '+label)
            }
          }
          i=vertexEnd
        }
        continue
      }
      i++
    }
    if(!ended || entities!==1 || section!==null) throw Error('missing ENTITIES section or terminal EOF')
    return preflightPhysicalCutOverlap20261023_2000(source)
  } catch(e) {
    return invalid(String(e?.message ?? e))
  }
}
