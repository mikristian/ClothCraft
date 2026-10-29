/** Defensive validation of the *serialized* 0.0001 mm cutter-study outline.
 * This is geometric inspection only. It does not generate or approve machine
 * commands, kerf, cutter offset, notch/drill actions or fabric lay parameters.
 */
const finite=n=>typeof n==='number'&&Number.isFinite(n)
const orient=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)
const on=(a,b,p)=>Math.abs(orient(a,b,p))<=1e-10&&
 p.x>=Math.min(a.x,b.x)-1e-10&&p.x<=Math.max(a.x,b.x)+1e-10&&
 p.y>=Math.min(a.y,b.y)-1e-10&&p.y<=Math.max(a.y,b.y)+1e-10
const crossing=(a,b,c,d)=>{
 const abC=orient(a,b,c),abD=orient(a,b,d),cdA=orient(c,d,a),cdB=orient(c,d,b)
 if((abC>0&&abD<0||abC<0&&abD>0)&&(cdA>0&&cdB<0||cdA<0&&cdB>0))return true
 return on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b)
}
const signedArea=pts=>pts.reduce((sum,a,i)=>{
 const b=pts[(i+1)%pts.length]
 return sum+a.x*b.y-b.x*a.y
},0)/2
const reject=(code,reason)=>({ok:false,code,reason,cuttingAuthorized:false,manufacturingApproved:false})

export function inspectCutterStudyOutlineGeometry20261028(outline){
 if(!Array.isArray(outline)||outline.length<3||outline.length>2000||
  outline.some(p=>!p||!finite(p.x)||!finite(p.y)))
  return reject('INVALID_CUTLINE','CUT outline must contain 3–2000 finite 2D points')
 // The downstream study rounds cm coordinates to 0.0001 mm. Check precisely
 // that representation, not only its higher-resolution source geometry.
 const serialized=outline.map(p=>({x:Number((p.x*10).toFixed(4)),y:Number((p.y*10).toFixed(4))}))
 if(serialized.some(p=>!finite(p.x)||!finite(p.y)))
  return reject('INVALID_CUTLINE','CUT outline exceeds finite physical mm serialization')
 const n=serialized.length
 let perimeter=0
 for(let i=0;i<n;i++){
  const a=serialized[i],b=serialized[(i+1)%n]
  const edge=Math.hypot(b.x-a.x,b.y-a.y)
  if(edge<0.000099999)return reject('CUTLINE_QUANTIZED_COLLAPSE',`CUT segment ${i} collapses at 0.0001 mm precision`)
  perimeter+=edge
 }
 if(!finite(perimeter))return reject('INVALID_CUTLINE','Nonfinite serialized CUT perimeter')
 const area=signedArea(serialized)
 const sourceArea=signedArea(outline)
 if(!finite(area)||!finite(sourceArea)||Math.abs(area)<=1e-8||
  Math.sign(area)!==Math.sign(sourceArea))
  return reject('CUTLINE_AREA_COLLAPSE','CUT outline loses signed area or winding at physical output precision')
 for(let i=0;i<n;i++){
  const a=serialized[i],b=serialized[(i+1)%n]
  for(let j=i+1;j<n;j++){
   if(j===i+1||(i===0&&j===n-1))continue
   const c=serialized[j],d=serialized[(j+1)%n]
   if(crossing(a,b,c,d))
    return reject('CUTLINE_SELF_INTERSECTION',`CUT edges ${i} and ${j} intersect or touch`)
  }
 }
 return {ok:true,serializedOutlineMm:serialized,perimeterMm:perimeter,
  signedAreaMm2:area,cuttingAuthorized:false,manufacturingApproved:false}
}
