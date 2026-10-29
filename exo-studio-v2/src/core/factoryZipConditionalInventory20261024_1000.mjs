import {auditFactoryZipSemanticInventory20261024_0853} from './factoryZipSemanticInventory20261024_0853.mjs'

const own=(v,k)=>Object.prototype.hasOwnProperty.call(v,k)
function get(v,k){
  if(!v||typeof v!=='object')return undefined
  const d=Object.getOwnPropertyDescriptor(v,k)
  if(d&&!own(d,'value'))throw Error('accessor')
  return d?.value
}
const slug=v=>String(v||'garment').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'garment'
const decoder=new TextDecoder('utf-8',{fatal:true})

/** Development inventory diagnostic. Never authorizes manufacture. */
export function auditFactoryZipConditionalInventory20261024_1000(files,expectedProject){
  const base=auditFactoryZipSemanticInventory20261024_0853(files,expectedProject)
  const diagnostics=[...base.diagnostics]
  const reject=(code,message)=>diagnostics.push({code,message})
  const finish=()=>({ok:diagnostics.length===0,diagnostics,manufacturingApproved:false})
  try{
    if(!files||typeof files!=='object'||Array.isArray(files))return finish()
    const paths=Object.keys(files)
    const read=path=>{
      if(!own(files,path))throw Error('missing '+path)
      const b=get(files,path)
      if(!(b instanceof Uint8Array))throw Error('invalid bytes')
      return JSON.parse(decoder.decode(b))
    }
    const source=read('garment-source.json')
    const pieces=get(source,'pieces')
    const grading=get(source,'grading')
    const sizes=get(grading,'sizes')
    const name=get(source,'name')
    if(!Array.isArray(pieces)||!Array.isArray(sizes)||!sizes.length||
      sizes.some(s=>typeof s!=='string'||!s.trim())||new Set(sizes).size!==sizes.length||
      typeof name!=='string'||!name.trim())throw Error('invalid source')
    const expected=new Set()
    for(let index=0;index<pieces.length;index++){
      const piece=pieces[index],points=get(piece,'points'),id=get(piece,'id')
      if(!Array.isArray(points)||!points.length||!id)continue
      const industrial=points.some(point=>Boolean(get(point,'industrialGradeRule')))
      expected.add(`${industrial?'industrial-grading':'grading-rules'}/${String(index+1).padStart(3,'0')}-${slug(id)}.${industrial?'json':'csv'}`)
    }
    const plot=read('marker-plot-geometry-qa.json')
    const rows=get(plot,'rows')
    if(!Array.isArray(rows)||!rows.length)throw Error('invalid plot rows')
    const pairs=new Set()
    const fabricSets=new Map(sizes.map(size=>[size,new Set()]))
    const sourceCounts=new Map()
    for(const piece of pieces){
      const fabric=get(piece,'fabricId')||'main'
      const count=get(piece,'cutQuantity')
      const qty=Number.isInteger(count)&&count>=1&&count<=99?count:1
      sourceCounts.set(fabric,(sourceCounts.get(fabric)||0)+qty)
    }
    for(const row of rows){
      const size=get(row,'size'),fabric=get(row,'fabricId')
      const checked=get(row,'checkedPlacements'),mode=get(row,'calibrationMode')
      if(typeof size!=='string'||!fabricSets.has(size)||typeof fabric!=='string'||!fabric.trim()||
        !Number.isSafeInteger(checked)||checked<0||
        !['on-page','separate-sheet'].includes(mode)||get(row,'ok')!==true||
        get(row,'factoryApproved')!==false){
        reject('INVALID_CONDITIONAL_PLOT_QA','Malformed or unsupported marker plot QA row')
        continue
      }
      const pair=JSON.stringify([size,fabric])
      if(pairs.has(pair)){reject('DUPLICATE_CONDITIONAL_PLOT_QA',`Duplicate plot row: ${size}/${fabric}`);continue}
      pairs.add(pair)
      fabricSets.get(size).add(fabric)
      if(checked!==sourceCounts.get(fabric))
        reject('MISMATCHED_MARKER_PLACEMENTS',`Plot QA placements differ from authored cut quantities: ${size}/${fabric}`)
      const prefix=`${slug(name)}-${slug(fabric)}-${slug(size)}`
      expected.add(`markers/${prefix}.svg`)
      if(sourceCounts.has(fabric))expected.add(`markers/${prefix}.pdf`)
      if(mode==='separate-sheet'){
        expected.add(`print-calibration/${prefix}.svg`)
        expected.add(`print-calibration/${prefix}.pdf`)
      }
    }
    const sourceFabrics=new Set(pieces.map(piece=>get(piece,'fabricId')||'main'))
    const reference=JSON.stringify([...sourceFabrics].sort())
    if(sizes.some(size=>!fabricSets.get(size).size||JSON.stringify([...fabricSets.get(size)].sort())!==reference))
      reject('MISMATCHED_FABRIC_COVERAGE','Plot QA fabric coverage differs from authored pieces or sizes')
    const spec=get(source,'productionSpec')
    const neckband=get(spec,'neckband')
    if(get(spec,'format')==='garment-studio.tee-production-development.v1'&&
       get(neckband,'requiresSeparateNeckbandCutPattern')===true){
      expected.add('tee-development/neckband-proposal.json')
      expected.add('tee-development/neckband-proposal.csv')
      for(const size of sizes)expected.add(`tee-development/neckband-proposal-${slug(size)}.dxf`)
    }
    for(const path of expected)if(!own(files,path))reject('MISSING_CONDITIONAL_ARTIFACT',`Missing conditional artifact: ${path}`)
    for(const path of paths)if(/^(grading-rules|industrial-grading|markers|print-calibration|tee-development)\//.test(path)&&!expected.has(path))
      reject('UNEXPECTED_CONDITIONAL_ARTIFACT',`Unexpected conditional artifact: ${path}`)
  }catch{
    reject('UNSAFE_CONDITIONAL_INVENTORY','Unable to safely establish conditional factory inventory')
  }
  return finish()
}
