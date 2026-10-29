import { buildFabricMarkers } from './marker.js'
import { gradeProject } from './grading.js'

const token = value => String(value || 'PATTERN').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 48).toUpperCase()
const finite = value => typeof value === 'number' && Number.isFinite(value)
const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y)
const bbox = points => ({minX:Math.min(...points.map(p=>p.x)),maxX:Math.max(...points.map(p=>p.x)),minY:Math.min(...points.map(p=>p.y)),maxY:Math.max(...points.map(p=>p.y))})
const area = points => Math.abs(points.reduce((sum,p,i) => {const q=points[(i+1)%points.length];return sum+p.x*q.y-q.x*p.y},0))/2
const perimeter = points => points.reduce((sum,p,i)=>sum+dist(p,points[(i+1)%points.length]),0)
function segmentDistance(p,a,b) {
  const dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy
  const t=den?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/den)):0
  return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)
}
function contourDistance(a,b) {
  return Math.max(...a.map(p=>Math.min(...b.map((q,i)=>segmentDistance(p,q,b[(i+1)%b.length])))),
    ...b.map(p=>Math.min(...a.map((q,i)=>segmentDistance(p,q,a[(i+1)%a.length])))))
}
function validatePolygon(points,label) {
  if (!Array.isArray(points)||points.length<3||points.length>10000||points.some(p=>!finite(p.x)||!finite(p.y))||area(points)<1e-8) throw Error(`Invalid ${label} polygon`)
  for(let i=0;i<points.length;i++){
    if(dist(points[i],points[(i+1)%points.length])<1e-9)throw Error(`Zero length edge in ${label}`)
    for(let j=i+2;j<points.length;j++){
      if(i===0&&j===points.length-1)continue
      if(intersect(points[i],points[(i+1)%points.length],points[j],points[(j+1)%points.length]))throw Error(`Self-intersecting ${label}`)
    }
  }
}

/** Read original DXF group pairs directly; no exporter geometry helpers. Only closed legacy POLYLINE CUT entities are accepted. */
export function readPhysicalCutContours20261024(dxf) {
  if(typeof dxf!=='string'||!dxf.trim()) throw Error('Missing exact manufacturing DXF bytes')
  const lines=dxf.replace(/\r/g,'').trimEnd().split('\n')
  if(lines.length%2) throw Error('Malformed DXF group pairs')
  const pairs=[]
  for(let i=0;i<lines.length;i+=2){const raw=lines[i].trim();if(!/^\d+$/.test(raw))throw Error('Malformed DXF group code');pairs.push({code:Number(raw),value:lines[i+1].trim()})}
  if(pairs.at(-1)?.code!==0||pairs.at(-1)?.value!=='EOF')throw Error('DXF missing EOF')
  if(pairs.filter(p=>p.code===999&&p.value==='CUT_LAYER_IS_PHYSICAL_ALLOWANCE_OUTLINE_STITCH_IS_SEWLINE_EXPLICIT_NOTCHES_ONLY').length!==1) throw Error('DXF lacks unique manufacturing physical CUT marker')
  const units=pairs.flatMap((p,i)=>p.code===9&&p.value==='$INSUNITS'?[i]:[])
  if(units.length!==1||pairs[units[0]+1]?.code!==70||pairs[units[0]+1].value!=='4'||pairs.filter(p=>p.code===999&&p.value==='COORDINATES_MM').length!==1)throw Error('DXF unit is not verified millimetres')
  // A header variable may have one value only. A second 70 before the next
  // variable/section marker makes INSUNITS ambiguous even if the first is 4.
  for(let i=units[0]+2;i<pairs.length;i++){
    if(pairs[i].code===9||pairs[i].code===0)break
    if(pairs[i].code===70)throw Error('Duplicate DXF INSUNITS group 70')
  }
  const contours=new Map();let entities=false
  for(let i=0;i<pairs.length;){const p=pairs[i]
    if(p.code===0&&p.value==='SECTION'&&pairs[i+1]?.value==='ENTITIES'){entities=true;i+=2;continue}
    if(p.code===0&&p.value==='ENDSEC'){entities=false;i++;continue}
    if(!entities||p.code!==0){i++;continue}
    if(p.value!=='POLYLINE'){
      if(!['ENDSEC','EOF','SEQEND','VERTEX'].includes(p.value)){
        let j=i+1
        while(j<pairs.length&&pairs[j].code!==0){if(pairs[j].code===8&&pairs[j].value.startsWith('CUT_'))throw Error(`Unsupported ${p.value} entity on physical CUT layer ${pairs[j].value}`);j++}
      }
      i++;continue
    }
    i++;let layer=null,closed=false,points=[],seenLayer=false,seenFlags=false
    while(i<pairs.length){const v=pairs[i];if(v.code===0)break;if(v.code===8){if(seenLayer)throw Error('Duplicate DXF contour layer field');layer=v.value;seenLayer=true}if(v.code===70){if(seenFlags)throw Error('Duplicate DXF POLYLINE group 70');seenFlags=true;closed=(Number(v.value)&1)!==0}i++}
    while(i<pairs.length&&pairs[i].code===0&&pairs[i].value==='VERTEX'){
      i++;let x=null,y=null,seenX=false,seenY=false
      while(i<pairs.length&&pairs[i].code!==0){const v=pairs[i++];if(v.code===42&&Number(v.value)!==0)throw Error(`Unsupported DXF bulge in ${layer}`);if(v.code===10){if(seenX)throw Error(`Duplicate DXF vertex X in ${layer}`);seenX=true;x=Number(v.value)/10}if(v.code===20){if(seenY)throw Error(`Duplicate DXF vertex Y in ${layer}`);seenY=true;y=Number(v.value)/10}}
      points.push({x,y})
    }
    if(pairs[i]?.value!=='SEQEND')throw Error(`Unterminated DXF contour ${layer}`)
    i++
    if(!layer?.startsWith('CUT_'))continue
    if(!closed)throw Error(`Open DXF CUT ${layer}`)
    validatePolygon(points,`DXF CUT ${layer}`)
    if(contours.has(layer))throw Error(`Ambiguous duplicate DXF CUT ${layer}`)
    contours.set(layer,points)
  }
  if(!contours.size)throw Error('No physical DXF CUT contours')
  return contours
}

function inside(point,poly){let result=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[i],b=poly[j];if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)result=!result
}return result}
function intersect(a,b,c,d){const cross=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x)
  return cross(a,b,c)*cross(a,b,d)<-1e-8&&cross(c,d,a)*cross(c,d,b)<-1e-8
}
function overlap(a,b){const aa=bbox(a),bb=bbox(b);if(aa.maxX<=bb.minX+1e-7||bb.maxX<=aa.minX+1e-7||aa.maxY<=bb.minY+1e-7||bb.maxY<=aa.minY+1e-7)return false
  for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++)if(intersect(a[i],a[(i+1)%a.length],b[j],b[(j+1)%b.length]))return true
  // Interior probes also detect exactly coincident outlines and shared edges
  // enclosing positive area; a boundary vertex alone is not a reliable probe.
  const witness=(poly,other)=>{
    const signed=poly.reduce((s,p,i)=>{const q=poly[(i+1)%poly.length];return s+p.x*q.y-q.x*p.y},0)
    const side=Math.sign(signed)
    for(let i=0;i<poly.length;i++){
      const p=poly[i],q=poly[(i+1)%poly.length],dx=q.x-p.x,dy=q.y-p.y,len=Math.hypot(dx,dy)
      if(len<1e-8)continue
      const epsilon=Math.min(0.001,len/100)
      const sample={x:(p.x+q.x)/2-side*dy/len*epsilon,y:(p.y+q.y)/2+side*dx/len*epsilon}
      if(inside(sample,poly)&&inside(sample,other))return true
    }
    return false
  }
  return witness(a,b)||witness(b,a)
}

/** Read-only evidence; ok does not imply factory certification or export approval. */
export function auditMarkerDxfGeometryParity20261024(project,{dxfBySize,gradedBySize,markersBySize,toleranceCm=0.08,defaultFabricWidth,gap}={}) {
  const issues=[],sizes=[],measurements=[]
  const fail=(code,size,pieceId,detail)=>issues.push({code,size,pieceId,detail})
  if(!project||!Array.isArray(project.pieces)||!project.pieces.length) return {ok:false,issues:[{code:'INVALID_PROJECT'}],sizes,measurements,factoryApproved:false}
  defaultFabricWidth ??= project.markerSettings?.fabricWidthCm ?? 150
  gap ??= project.markerSettings?.gapCm ?? 1.5
  if(!finite(toleranceCm)||toleranceCm<=0||toleranceCm>0.25)throw Error('Tolerance must be positive and at most 0.25 cm')
  const named=project.grading?.sizes?.length?project.grading.sizes:[project.previewSize||project.grading?.baseSize||'BASE']
  for(const size of named){
    const graded=gradedBySize?.[size]??gradeProject(project,size)
    const dxf=dxfBySize?.[size]
    if(typeof dxf!=='string'){fail('MISSING_EXACT_DXF',size,null,'Exact DXF must be supplied');continue}
    let cuts
    try{
      cuts=readPhysicalCutContours20261024(dxf)
      const lines=dxf.replace(/\r/g,'').trimEnd().split('\n')
      const comments=[]
      for(let i=0;i+1<lines.length;i+=2)if(lines[i].trim()==='999')comments.push(lines[i+1].trim())
      const exactly=(prefix,value)=>comments.filter(v=>v.startsWith(prefix)).length===1&&comments.includes(`${prefix}${value}`)
      if(!exactly('GARMENT_STUDIO_PROJECT ',project.id||'untitled'))throw Error('DXF project metadata mismatch or duplicate')
      if(!exactly('GARMENT_STUDIO_SIZE ',size))throw Error('DXF size metadata mismatch or duplicate')
    }catch(e){fail('INVALID_DXF',size,null,e.message);continue}
    const markers=markersBySize?.[size]??buildFabricMarkers(graded,defaultFabricWidth,gap)
    const expected=new Map()
    for(const piece of graded.pieces||[]){const layer=`CUT_${token(piece.name)}_${token(size)}`
      if(expected.has(layer))fail('AMBIGUOUS_PIECE_NAME',size,piece.id,layer)
      expected.set(layer,piece)
    }
    for(const layer of cuts.keys())if(!expected.has(layer))fail('EXTRA_DXF_CUT',size,null,layer)
    for(const [layer,piece] of expected){if(!cuts.has(layer))fail('MISSING_DXF_CUT',size,piece.id,layer)}
    const byFabric=new Map()
    for(const piece of graded.pieces||[]){
      if(piece.cutQuantity != null && (!Number.isInteger(piece.cutQuantity)||piece.cutQuantity<1||piece.cutQuantity>99))fail('INVALID_CUT_QUANTITY',size,piece.id,`cutQuantity: ${String(piece.cutQuantity)}`)
      const fabric=piece.fabricId||'main';if(!byFabric.has(fabric))byFabric.set(fabric,[]);byFabric.get(fabric).push(piece)
    }
    for(const fabric of Object.keys(markers))if(!byFabric.has(fabric))fail('EXTRA_MARKER_FABRIC',size,null,fabric)
    for(const [fabric,pieces] of byFabric){const marker=markers[fabric]
      if(!marker){fail('MISSING_MARKER_FABRIC',size,null,fabric);continue}
      const expectedCount=pieces.reduce((n,p)=>n+(Number.isInteger(p.cutQuantity)&&p.cutQuantity>=1&&p.cutQuantity<=99?p.cutQuantity:1),0)
      const placements=marker.placements||[]
      if(marker.unusedPieces!==0||marker.unplaced?.length)fail('UNUSED_MARKER_PIECES',size,null,`${fabric}: ${marker.unusedPieces}`)
      const configuredWidth=Number(graded.markerSettings?.fabricWidthsCm?.[fabric]??defaultFabricWidth)
      if(!finite(marker.width)||Math.abs(marker.width-configuredWidth)>1e-6||!finite(marker.gap)||marker.gap+1e-6<gap)fail('MARKER_SETTINGS_MISMATCH',size,null,fabric)
      if(placements.length!==expectedCount||marker.requestedPieces!==expectedCount)fail('PLACEMENT_QUANTITY',size,null,`${fabric}: ${placements.length}/${expectedCount}`)
      const seen=new Set()
      for(const placement of placements){const piece=pieces.find(p=>p.id===placement.pieceId)
        if(!piece){fail('UNKNOWN_PLACEMENT',size,placement.pieceId,fabric);continue}
        const quantity=Number.isInteger(piece.cutQuantity)&&piece.cutQuantity>=1&&piece.cutQuantity<=99?piece.cutQuantity:1,key=`${piece.id}:${placement.instance}`
        if(!Number.isInteger(placement.instance)||placement.instance<0||placement.instance>=quantity||seen.has(key))fail('DUPLICATE_OR_INVALID_INSTANCE',size,piece.id,key)
        seen.add(key)
        const poly=placement.outline
        try{validatePolygon(poly,`marker ${piece.id}`)}catch(e){fail('INVALID_MARKER_OUTLINE',size,piece.id,e.message);continue}
        const bounds=bbox(poly)
        if(!finite(placement.x)||!finite(placement.y)||!finite(placement.width)||!finite(placement.height)||!finite(marker.width)||!finite(marker.length)||
          Math.abs(bounds.minX-placement.x)>0.005||Math.abs(bounds.minY-placement.y)>0.005||Math.abs(bounds.maxX-bounds.minX-placement.width)>0.005||Math.abs(bounds.maxY-bounds.minY-placement.height)>0.005)
          fail('PLACEMENT_BOUNDS_INCONSISTENT',size,piece.id,key)
        if(bounds.minX< -1e-6||bounds.minY< -1e-6||bounds.maxX>marker.width+1e-6||bounds.maxY>marker.length+1e-6)fail('OUTSIDE_FABRIC',size,piece.id,key)
        const cut=cuts.get(`CUT_${token(piece.name)}_${token(size)}`)
        if(!cut)continue
        const theta=Number(placement.rotationDeg)*Math.PI/180
        if(!finite(theta)){fail('INVALID_ROTATION',size,piece.id,key);continue}
        const rotated=cut.map(p=>({x:p.x*Math.cos(theta)-p.y*Math.sin(theta),y:p.x*Math.sin(theta)+p.y*Math.cos(theta)}))
        const origin=bbox(rotated)
        const aligned=rotated.map(p=>({x:p.x-origin.minX+placement.x,y:p.y-origin.minY+placement.y}))
        const hausdorffCm=contourDistance(aligned,poly),areaDifferenceCm2=Math.abs(area(aligned)-area(poly)),perimeterDifferenceCm=Math.abs(perimeter(aligned)-perimeter(poly))
        measurements.push({size,fabric,pieceId:piece.id,instance:placement.instance,hausdorffCm,areaDifferenceCm2,perimeterDifferenceCm})
        if(hausdorffCm>toleranceCm)fail('CUT_MARKER_GEOMETRY_MISMATCH',size,piece.id,`maximum contour distance ${hausdorffCm.toFixed(5)} cm exceeds ${toleranceCm} cm`)
        if(Math.abs((bbox(aligned).maxX-bbox(aligned).minX)-placement.width)>toleranceCm||Math.abs((bbox(aligned).maxY-bbox(aligned).minY)-placement.height)>toleranceCm)fail('CUT_MARKER_BBOX_MISMATCH',size,piece.id,key)
      }
      for(const piece of pieces)for(let instance=0;instance<(Number.isInteger(piece.cutQuantity)&&piece.cutQuantity>=1&&piece.cutQuantity<=99?piece.cutQuantity:1);instance++)if(!seen.has(`${piece.id}:${instance}`))fail('MISSING_INSTANCE',size,piece.id,`${fabric}/${instance}`)
      for(let i=0;i<placements.length;i++)for(let j=i+1;j<placements.length;j++)if(Array.isArray(placements[i].outline)&&Array.isArray(placements[j].outline)&&overlap(placements[i].outline,placements[j].outline))fail('OVERLAPPING_MARKER_PLACEMENTS',size,null,`${fabric}/${i}/${j}`)
      for(let i=0;i<placements.length;i++)for(let j=i+1;j<placements.length;j++){
        const a=placements[i],b=placements[j]
        if(![a.x,a.y,a.width,a.height,b.x,b.y,b.width,b.height].every(finite))continue
        const dx=Math.max(0,a.x-(b.x+b.width),b.x-(a.x+a.width))
        const dy=Math.max(0,a.y-(b.y+b.height),b.y-(a.y+a.height))
        if(Math.hypot(dx,dy)<gap-1e-6)fail('MARKER_GAP_VIOLATION',size,null,`${fabric}/${i}/${j}`)
      }
    }
    sizes.push(size)
  }
  return {ok:issues.length===0,issues,sizes,measurements,checkedPlacements:measurements.length,toleranceCm,factoryApproved:false}
}
