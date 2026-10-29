// Engineering drafting foundation. All coordinates, offsets and lengths are centimetres.
// No operation edits boundary topology, seam stations, notches or curves.
const LIMIT=1e6, EPS=1e-9, MAX_LINES=512
// Inspect own property descriptors before any authored property access. Produces
// detached plain data while rejecting getters, setters, cycles and large graphs.
function safeData(value,budget={nodes:0,fields:0},seen=new Set(),depth=0){
 if(value===null||typeof value==='string'||typeof value==='boolean')return value
 if(typeof value==='number'&&Number.isFinite(value))return value
 if(typeof value!=='object')throw Error('UNSAFE_INPUT_VALUE')
 if(depth>32||++budget.nodes>20000||seen.has(value))throw Error('SOURCE_COMPLEXITY_BUDGET')
 const proto=Object.getPrototypeOf(value)
 if(!Array.isArray(value)&&proto!==Object.prototype&&proto!==null)throw Error('UNSAFE_INPUT_PROTOTYPE')
 if(Array.isArray(value)&&Object.getOwnPropertyDescriptor(value,'length').value>20000)throw Error('SOURCE_COMPLEXITY_BUDGET')
 seen.add(value)
 const descriptors=Object.getOwnPropertyDescriptors(value)
 const keys=Reflect.ownKeys(descriptors)
 if((budget.fields+=keys.length)>60000)throw Error('SOURCE_COMPLEXITY_BUDGET')
 const result=Array.isArray(value)?[]:{}
 for(const key of keys){
  if(typeof key==='symbol')throw Error('UNSAFE_INPUT_SYMBOL')
  const d=descriptors[key]
  if(!Object.hasOwn(d,'value'))throw Error('UNSAFE_INPUT_ACCESSOR')
  if(key==='__proto__'||key==='constructor'||key==='prototype')throw Error('UNSAFE_INPUT_KEY')
  if(Array.isArray(value)&&key==='length'){
   if(!Number.isSafeInteger(d.value)||d.value>20000)throw Error('SOURCE_COMPLEXITY_BUDGET')
   result.length=d.value
  }else if(!Array.isArray(value)&&!d.enumerable)throw Error('UNSAFE_NONENUMERABLE_FIELD')
  else result[key]=safeData(d.value,budget,seen,depth+1)
 }
 seen.delete(value)
 if(Array.isArray(value)&&Object.keys(result).length!==result.length)throw Error('UNSAFE_SPARSE_ARRAY')
 return result
}
function prepared(project,spec){
 const budget={nodes:0,fields:0}
 const safeProject=safeData(project,budget)
 const safeSpec=safeData(spec,budget)
 if(!safeProject||!Array.isArray(safeProject.pieces)||safeProject.pieces.length>128||safeProject.pieces.reduce((n,p)=>n+(Array.isArray(p?.points)?p.points.length:0),0)>4096)throw Error('SOURCE_COMPLEXITY_BUDGET')
 if(safeProject.pieces.some(p=>(p.internalLines?.length||0)>512))throw Error('SOURCE_COMPLEXITY_BUDGET')
 return [safeProject,safeSpec]
}
const numeric=n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=LIMIT
const point=p=>p&&typeof p==='object'&&numeric(p.x)&&numeric(p.y)
const copyPoint=p=>({x:p.x,y:p.y})
const length=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y)
function requirePoint(p){if(!point(p))throw Error('INVALID_POINT_CM');return copyPoint(p)}
function positive(n,key){if(!numeric(n)||n<=EPS)throw Error(`INVALID_${key}`);return n}
function inside(p){if(!point(p))throw Error('OUT_OF_BOUNDS_CM');return p}
function source(project,spec){
 if(!project||!Array.isArray(project.pieces)||project.pieces.length>128||!spec||typeof spec!=='object'||typeof spec.pieceId!=='string')throw Error('INVALID_PROJECT_OR_SPEC')
 const matches=project.pieces.filter(p=>p?.id===spec.pieceId)
 if(matches.length!==1)throw Error('MISSING_OR_DUPLICATE_PIECE')
 const piece=matches[0]
 if(!Array.isArray(piece.points)||piece.points.length<3||piece.points.length>4096||!piece.points.every(point))throw Error('INVALID_PIECE_GEOMETRY')
 if(piece.locked)throw Error('PIECE_LOCKED')
 if(piece.internalLines!=null&&!Array.isArray(piece.internalLines))throw Error('INVALID_INTERNAL_LINES')
 if((piece.internalLines?.length||0)>=MAX_LINES)throw Error('INTERNAL_LINE_LIMIT')
 return piece
}
function reference(piece,spec){
 if(spec.referenceLineId!==undefined){
  if(typeof spec.referenceLineId!=='string'||!spec.referenceLineId)throw Error('INVALID_REFERENCE_LINE_ID')
  const matches=(piece.internalLines||[]).filter(l=>l?.id===spec.referenceLineId)
  if(matches.length!==1)throw Error('UNKNOWN_OR_DUPLICATE_REFERENCE_LINE')
  const line=matches[0]
  if(line.aAnchor||line.bAnchor||line.curve||line.controlPoints||line.points||line.gradeRule||line.industrialGradeRule||line.type==='dart'||line.type==='sew'||line.type==='notch')throw Error('UNSUPPORTED_SOURCE_ATTACHMENT')
  const a=requirePoint(line.a),b=requirePoint(line.b)
  positive(length(a,b),'REFERENCE_LENGTH_CM')
  return {a,b}
 }
 const a=requirePoint(spec.a),b=requirePoint(spec.b)
 positive(length(a,b),'REFERENCE_LENGTH_CM')
 return {a,b}
}
function vector(a,b){const d=positive(length(a,b),'REFERENCE_LENGTH_CM');return {x:(b.x-a.x)/d,y:(b.y-a.y)/d}}
function createGeometry(piece,spec){
 let a,b
 switch(spec.kind){
  case 'line.twoPoint':a=requirePoint(spec.a);b=requirePoint(spec.b);break
  case 'line.parallel':
  case 'line.offset':{
   const ref=reference(piece,spec),u=vector(ref.a,ref.b)
   const distanceCm=spec.kind==='line.offset'?spec.offsetCm:spec.distanceCm
   if(!numeric(distanceCm))throw Error('INVALID_OFFSET_CM')
   a={x:ref.a.x-u.y*distanceCm,y:ref.a.y+u.x*distanceCm}
   b={x:ref.b.x-u.y*distanceCm,y:ref.b.y+u.x*distanceCm}
   break
  }
  case 'line.perpendicular':{
   const ref=reference(piece,spec),u=vector(ref.a,ref.b)
   const t=spec.atFraction===undefined?.5:spec.atFraction
   if(!numeric(t)||t<0||t>1)throw Error('INVALID_REFERENCE_FRACTION')
   const l=positive(spec.lengthCm,'LENGTH_CM')
   a={x:ref.a.x+(ref.b.x-ref.a.x)*t,y:ref.a.y+(ref.b.y-ref.a.y)*t}
   b={x:a.x-u.y*l,y:a.y+u.x*l}
   break
  }
  case 'line.setLength':{
   const ref=reference(piece,spec),u=vector(ref.a,ref.b),l=positive(spec.lengthCm,'LENGTH_CM')
   a=ref.a;b={x:a.x+u.x*l,y:a.y+u.y*l};break
  }
  default:throw Error('UNSUPPORTED_LINE_ACTION')
 }
 inside(a);inside(b)
 const lengthCm=positive(length(a,b),'RESULT_LENGTH_CM')
 return {a,b,lengthCm}
}
/**
 * applyAccuMarkLineConstruction(project, spec) -> {project, line, validation}.
 * Kinds: line.twoPoint {a,b}; line.parallel / line.offset
 * {a,b,distanceCm / offsetCm}; line.perpendicular {a,b,atFraction,lengthCm};
 * line.setLength {a,b,lengthCm}. Any reference can instead use referenceLineId.
 * Sign of the offset determines the left/right side of the oriented source.
 * Produced lines are non-cutting construction marks, never production-approved.
 */
export function applyAccuMarkLineConstruction(project,spec){
 ;[project,spec]=prepared(project,spec)
 const piece=source(project,spec)
 if(spec.kind==='line.measureDistance')return {measurement:measureAccuMarkLineDistance(project,spec)}
 const geo=createGeometry(piece,spec)
 const lineId=spec.lineId
 if(typeof lineId!=='string'||!lineId||lineId.length>120||!/^[-\w:.]+$/.test(lineId))throw Error('INVALID_LINE_ID')
 if((piece.internalLines||[]).some(l=>l?.id===lineId))throw Error('DUPLICATE_LINE_ID')
 // The descriptor preflight already returned detached ordinary data objects.
 const clone=project
 const edited=clone.pieces.find(p=>p.id===spec.pieceId)
 const line={id:lineId,type:'construction',a:geo.a,b:geo.b,notes:`Engineering construction: ${spec.kind}; dimensions cm`}
 edited.internalLines=[...(edited.internalLines||[]),line]
 clone.revision=(Number.isSafeInteger(clone.revision)&&clone.revision>=0?clone.revision:0)+1
 return {project:clone,line,validation:{units:'cm',lengthCm:geo.lengthCm,engineeringOnly:true,manufacturingApproved:false}}
}

/** Straight-line Euclidean measurement with no mutation. */
export function measureAccuMarkLineDistance(project,spec){
 ;[project,spec]=prepared(project,spec)
 const piece=source(project,spec),ref=reference(piece,spec)
 return {pieceId:spec.pieceId,a:ref.a,b:ref.b,lengthCm:length(ref.a,ref.b),units:'cm',measurement:'euclidean-straight-distance'}
}
