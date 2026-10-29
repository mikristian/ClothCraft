/** Physical material-repeat QA for externally accepted polygon placements.
 * All lengths are centimeters. This is a blocking preflight, never cutting authorization.
 * Input: {project, nesting, fabricWidthCm, repeatCm:{x,y}, sourcesByPieceId,
 *         quantitiesBySize, shadeZones:[{shade,minY,maxY}], toleranceCm}.
 * Each source: {cutline:[{x,y}], anchor:{x,y}, group, size, shade,
 *               nap:'none'|'one-way', grainAngleDeg, cutQuantity, foldVerified:false}.
 * Source cutline must represent the actual physical boundary underlying the marker.
 */
const EPS=1e-6
const validPoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)
const finite=n=>typeof n==='number'&&Number.isFinite(n)
const key=(pieceId,size)=>`${pieceId}\u0000${size}`
const close=(a,b,t)=>Math.abs(a-b)<=t
const rotate=(p,degrees)=>{const a=degrees*Math.PI/180;return {x:p.x*Math.cos(a)-p.y*Math.sin(a),y:p.x*Math.sin(a)+p.y*Math.cos(a)}}
const bounds=points=>({minX:Math.min(...points.map(p=>p.x)),minY:Math.min(...points.map(p=>p.y)),maxX:Math.max(...points.map(p=>p.x)),maxY:Math.max(...points.map(p=>p.y))})
const congruent=(a,b,t)=>a.length===b.length&&a.some((_,start)=>[1,-1].some(dir=>a.every((p,i)=>{
  const q=b[(start+dir*i+a.length*2)%a.length]
  return close(p.x,q.x,t)&&close(p.y,q.y,t)
})))
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)
const onSegment=(p,a,b,t)=>Math.abs(cross(a,b,p))<=t&&p.x>=Math.min(a.x,b.x)-t&&p.x<=Math.max(a.x,b.x)+t&&p.y>=Math.min(a.y,b.y)-t&&p.y<=Math.max(a.y,b.y)+t
function inside(p,poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[i],b=poly[j]
  if(onSegment(p,a,b,EPS))return true
  if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)yes=!yes
}return yes}
function overlap(a,b){
  for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){
    const p=a[i],q=a[(i+1)%a.length],r=b[j],s=b[(j+1)%b.length]
    const c1=cross(p,q,r),c2=cross(p,q,s),c3=cross(r,s,p),c4=cross(r,s,q)
    if((c1*c2 < -EPS&&c3*c4 < -EPS)||onSegment(r,p,q,EPS)||onSegment(s,p,q,EPS)||onSegment(p,r,s,EPS)||onSegment(q,r,s,EPS))return true
  }
  return inside(a[0],b)||inside(b[0],a)
}
const difference=(a,b,r)=>{const d=((a-b)%r+r)%r;return Math.min(d,r-d)}
const id=x=>typeof x==='string'&&x.trim().length>0

export function validateAccuMarkMaterialRepeatQA({project,nesting,fabricWidthCm,repeatCm,sourcesByPieceId,quantitiesBySize,shadeZones,toleranceCm=0.01}={}) {
  const issues=[],registration=[]
  const add=(code,pieceId=null,instance=null,detail='')=>issues.push({code,pieceId,instance,detail,blocking:true})
  const fail=()=>({ok:false,issues,registration,manufacturingApproved:false,cuttingAuthorized:false})
  if(!finite(fabricWidthCm)||fabricWidthCm<=0||!finite(toleranceCm)||toleranceCm<0||toleranceCm>0.5) add('INVALID_LIMITS')
  if(!repeatCm||!finite(repeatCm.x)||!finite(repeatCm.y)||repeatCm.x<=0||repeatCm.y<=0) add('INVALID_REPEAT')
  if(!Array.isArray(project?.pieces)||!Array.isArray(nesting?.placements)||nesting?.ok!==true||
     !Array.isArray(nesting?.unplaced)||nesting.unplaced.length||!Array.isArray(nesting?.errors)||nesting.errors.length) add('UNVERIFIED_NESTING')
  if(!sourcesByPieceId||typeof sourcesByPieceId!=='object'||Array.isArray(sourcesByPieceId))add('MISSING_SOURCES')
  if(!quantitiesBySize||typeof quantitiesBySize!=='object'||Array.isArray(quantitiesBySize)||!Object.keys(quantitiesBySize).length) add('MISSING_SIZE_COUNTS')
  if(!Array.isArray(shadeZones)||!shadeZones.length||shadeZones.some(z=>!id(z.shade)||!finite(z.minY)||!finite(z.maxY)||z.minY<0||z.maxY<=z.minY))add('INVALID_SHADE_ZONES')
  if(issues.length)return fail()
  const sizes=Object.keys(quantitiesBySize)
  if(sizes.some(s=>!id(s)||!Number.isSafeInteger(quantitiesBySize[s])||quantitiesBySize[s]<0)||new Set(sizes.map(s=>s.toLowerCase())).size!==sizes.length)add('INVALID_SIZE_COUNTS')
  const pieces=new Map()
  for(const piece of project.pieces){
    if(!id(piece?.id)||pieces.has(piece.id)){add('INVALID_PIECE_ID',piece?.id);continue}
    pieces.set(piece.id,piece)
  }
  const observed=new Map(),seen=new Set(),groups=new Map(),acceptedOutlines=[]
  for(const placement of nesting.placements){
    const pid=placement?.pieceId,instance=placement?.instance
    if(!id(pid)||!Number.isSafeInteger(instance)||instance<0||!id(placement.size)||!sizes.includes(placement.size)||
       seen.has(`${pid}\u0000${placement.size}\u0000${instance}`)){add('INVALID_PLACEMENT_ID',pid,instance);continue}
    seen.add(`${pid}\u0000${placement.size}\u0000${instance}`)
    const piece=pieces.get(pid),source=sourcesByPieceId[pid]
    if(!piece||!source){add('MISSING_PIECE_SOURCE',pid,instance);continue}
    if(piece.fold||piece.cutOnFold||piece.marker?.fold||piece.marker?.onFold||source.foldVerified||source.onFold||source.fold||source.cutOnFold){add('FOLD_LAYOUT_UNVERIFIED',pid,instance);continue}
    if(!Number.isSafeInteger(piece.cutQuantity)||piece.cutQuantity<1||piece.cutQuantity>99||source.cutQuantity!==piece.cutQuantity||
       source.size!==placement.size){add('CUT_COUNT_OR_SIZE_MISMATCH',pid,instance);continue}
    observed.set(key(pid,placement.size),(observed.get(key(pid,placement.size))||0)+1)
    if(!id(source.group)||!id(source.shade)||!['none','one-way'].includes(source.nap)||
       !finite(source.grainAngleDeg)||!validPoint(source.anchor)||!Array.isArray(source.cutline)||source.cutline.length<3||
       source.cutline.some(p=>!validPoint(p))){add('INVALID_SOURCE_REGISTRATION',pid,instance);continue}
    if(!finite(placement.x)||!finite(placement.y)||!finite(placement.rotationDeg)||
       !Array.isArray(placement.outline)||placement.outline.length!==source.cutline.length||placement.outline.some(p=>!validPoint(p))){add('INVALID_PLACEMENT_GEOMETRY',pid,instance);continue}
    const rotated=source.cutline.map(p=>rotate(p,placement.rotationDeg)),b=bounds(rotated)
    const transformed=rotated.map(p=>({x:p.x-b.minX+placement.x,y:p.y-b.minY+placement.y}))
    if(!congruent(transformed,placement.outline,toleranceCm)){add('SOURCE_GEOMETRY_MISMATCH',pid,instance);continue}
    if(acceptedOutlines.some(other=>overlap(placement.outline,other.outline))){add('POLYGON_OVERLAP',pid,instance);continue}
    acceptedOutlines.push({outline:placement.outline,pieceId:pid})
    const pb=bounds(placement.outline)
    if(pb.minX < -toleranceCm||pb.maxX>fabricWidthCm+toleranceCm||pb.minY < -toleranceCm){add('FABRIC_BOUNDS',pid,instance);continue}
    const normalized=((placement.rotationDeg+source.grainAngleDeg)%360+360)%360
    if(difference(normalized,0,360)>0.01 && !(source.nap==='none'&&piece.marker?.allowReverseGrain===true&&difference(normalized,180,360)<=0.01)){
      add('GRAIN_OR_NAP',pid,instance);continue
    }
    if(source.nap==='one-way'&&piece.marker?.nap!=='one-way'){add('NAP_SOURCE_MISMATCH',pid,instance);continue}
    const eligible=shadeZones.filter(z=>z.shade===source.shade&&pb.minY>=z.minY-toleranceCm&&pb.maxY<=z.maxY+toleranceCm)
    if(eligible.length!==1){add('SHADE_ZONE_MISMATCH',pid,instance);continue}
    const a=rotate(source.anchor,placement.rotationDeg)
    const anchor={x:a.x-b.minX+placement.x,y:a.y-b.minY+placement.y}
    const row={pieceId:pid,instance,size:placement.size,group:source.group,shade:source.shade,anchor,zone:eligible[0].shade}
    registration.push(row)
    const groupKey=JSON.stringify([placement.size,source.group])
    if(!groups.has(groupKey))groups.set(groupKey,[])
    groups.get(groupKey).push(row)
  }
  for(const piece of project.pieces){
    if(!id(piece?.id)||!Number.isSafeInteger(piece.cutQuantity)||piece.cutQuantity<1)continue
    for(const size of sizes){
      const expected=quantitiesBySize[size]*piece.cutQuantity,got=observed.get(key(piece.id,size))||0
      if(got!==expected)add('SIZE_CUT_COUNT_MISMATCH',piece.id,null,`${size}: expected ${expected}, found ${got}`)
    }
  }
  for(const rows of groups.values())if(rows.length>1){
    const base=rows[0]
    for(const row of rows.slice(1)){
      if(row.shade!==base.shade){add('REGISTRATION_SHADE_MISMATCH',row.pieceId,row.instance,`${row.size}/${row.group}: ${row.shade} differs from ${base.shade}`);continue}
      if(difference(row.anchor.x,base.anchor.x,repeatCm.x)>toleranceCm||difference(row.anchor.y,base.anchor.y,repeatCm.y)>toleranceCm)
        add('REPEAT_REGISTRATION_MISMATCH',row.pieceId,row.instance,`size ${row.size}, group ${row.group}: anchor (${row.anchor.x},${row.anchor.y}) differs from (${base.anchor.x},${base.anchor.y}) modulo (${repeatCm.x},${repeatCm.y}) cm`)
    }
  }
  for(const row of registration)if(groups.get(JSON.stringify([row.size,row.group]))?.length===1)add('UNPAIRED_REGISTRATION_GROUP',row.pieceId,row.instance,`${row.size}/${row.group}`)
  return {ok:issues.length===0,issues,registration,manufacturingApproved:false,cuttingAuthorized:false}
}
