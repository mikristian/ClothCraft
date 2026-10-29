export const RUST_BODY_ARRANGEMENT_ABI_VERSION=1
let kernel=null,loading=null,error=null
export const rustBodyArrangementKernelReady=()=>!!kernel
export const rustBodyArrangementKernelStatus=()=>({backend:kernel?'rust-wasm':'javascript-fallback',abiVersion:kernel?.exo_body_arrangement_abi_version()??null,error})
export async function initializeRustBodyArrangementKernel({bytes,url='/wasm/exo_body_arrangement_kernel.wasm'}={}){
  if(kernel)return true
  if(loading)return loading
  loading=(async()=>{try{
    const raw=bytes??await fetch(url).then(r=>{if(!r.ok)throw Error(`Body arrangement WASM HTTP ${r.status}`);return r.arrayBuffer()})
    const mod=await WebAssembly.instantiate(raw,{})
    const exp=mod.instance?.exports??mod.exports
    if(exp.exo_body_arrangement_abi_version?.()!==1||typeof exp.exo_body_arrangement_role!=='function'||typeof exp.exo_body_arrangement_offset!=='function')throw Error('Unexpected body arrangement WASM ABI')
    kernel=exp;error=null;return true
  }catch(e){kernel=null;error=String(e?.message??e);return false}finally{loading=null}})()
  return loading
}
const tokenize=value=>String(value||'').toLowerCase().replace(/([a-z])([0-9])/g,'$1 $2').split(/[^a-z0-9]+/).filter(Boolean)
const includesAny=(tokens,words)=>words.some(word=>tokens.includes(word))
const roleNames=[null,'left-arm','right-arm','hood-left','hood-right','left-wrist','right-wrist','waist-band','neck','left-leg-front','left-leg-back','right-leg-front','right-leg-back','lower-front','lower-back','front','back']
const tokenGroups=[['left'],['right'],['back','rear'],['front'],['sleeve'],['arm'],['hood'],['cuff'],['wrist'],['waistband'],['waist'],['belt'],['pocket'],['neckband'],['collar'],['neck'],['ribneck'],['facing'],['lining'],['interfacing'],['leg'],['skirt']]
const flag=(tokens,groups)=>groups.reduce((flags,words,i)=>flags|(includesAny(tokens,words)?(1<<i):0),0)
function jsRole(t,c){
  const has=i=>!!(t&(1<<i)),ctx=i=>!!(c&(1<<i));const side=has(0)?1:has(1)?2:0
  const front=has(3),back=has(2)
  if((has(4)||has(5))&&side)return side
  if(has(6)&&side)return 2+side
  if((has(7)||has(8))&&side)return 4+side
  if((has(9)||has(10)||has(11))&&!has(12))return 7
  if(has(13)||has(14)||has(15)||has(16))return 8
  if(has(12)||has(17)||has(18)||has(19))return 0
  if((ctx(0)||has(20))&&side&&(front||back))return 9+(side-1)*2+(front?0:1)
  if((front||back)&&(ctx(0)||ctx(1)||has(21)))return front?13:14
  if(front||back)return front?15:16
  return 0
}
export function rustInferBodyRole(piece,project={}){
  const current=piece?.arrangement3d?.wrap
  if(typeof current==='string'&&current&&current!=='flat')return current
  const tokens=tokenize(`${piece?.id||''} ${piece?.name||''} ${piece?.generatedRole||''}`)
  const context=tokenize(`${project?.templateId||''} ${project?.name||''}`)
  const t=flag(tokens,tokenGroups),c=flag(context,[['pants','pant','trouser','trousers','jeans','denim','shorts','joggers'],['skirt','dress']])
  return roleNames[kernel?kernel.exo_body_arrangement_role(t,c):jsRole(t,c)]??null
}
const codeByName=new Map(roleNames.map((name,i)=>[name,i]))
export function rustBodyInferredOffset(role,piece){
  const prior=piece.arrangement3d||{}
  const code=codeByName.get(role)
  if(!code)return {x:prior.x||0,y:prior.y||0,z:prior.z||0}
  const ys=piece.points?.map(p=>Number(p.y)).filter(Number.isFinite)||[]
  const height=ys.length?(Math.max(...ys)-Math.min(...ys))/100:0.65
  if(kernel)return {x:kernel.exo_body_arrangement_offset(code,0,height),y:kernel.exo_body_arrangement_offset(code,1,height),z:kernel.exo_body_arrangement_offset(code,2,height)}
  const offsets={1:[-.285,1.26,.045],2:[.285,1.26,.045],3:[0,1.59,-.2],4:[0,1.59,-.2],5:[-.73,1,0],6:[.73,1,0],7:[0,.88,0],8:[0,1.59,0],9:[-.15,0,.14],10:[-.15,0,-.14],11:[.15,0,.14],12:[.15,0,-.14],13:[0,0,.16],14:[0,0,-.16],15:[0,Math.max(.63,1.66-height),.245],16:[0,Math.max(.63,1.66-height),-.245]}
  const [x,y,z]=offsets[code]
  return {x,y,z}
}
if(typeof window!=='undefined'&&typeof fetch==='function'&&typeof WebAssembly!=='undefined')void initializeRustBodyArrangementKernel()
