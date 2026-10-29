const fail=reason=>({ok:false,reason,factoryApproved:false})
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&
  (Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null)
const safeSize=value=>typeof value==='string'&&/^[A-Za-z0-9-]{1,24}$/.test(value)
const safeInventory=value=>Array.isArray(value)&&value.length>=2&&value.length<=24&&
  value.every(safeSize)&&new Set(value).size===value.length
const same=(a,b)=>{
  if(Object.is(a,b))return true
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false
  const keys=Object.keys(a)
  return keys.length===Object.keys(b).length&&keys.every(key=>Object.hasOwn(b,key)&&same(a[key],b[key]))
}

/** Qualify an explicit industrial POM specification migration before the
 * authoritative Rust grade-run CAS. New targets are NEVER calculated from
 * pattern geometry or inherited from adjacent sizes. Existing stations,
 * tolerance and every previously authored target remain byte-for-byte equal.
 * This is a draft specification guard, not physical fit/factory approval.
 */
export function migrateNativeGradeNamedSizePom20261028({
  savedDefinitions,nextDefinitions,oldSizes,newSizes,
}={}){
  try{
    if(!safeInventory(oldSizes)||!safeInventory(newSizes)||newSizes.length<oldSizes.length||
      !same(oldSizes,newSizes.filter(size=>oldSizes.includes(size))))
      return fail('Canonical size migration must retain every saved size in its original order')
    if(!Array.isArray(savedDefinitions)||!Array.isArray(nextDefinitions)||
      savedDefinitions.length>64||nextDefinitions.length!==savedDefinitions.length)
      return fail('All saved POM stations must be retained without additions or deletion')
    const newOnly=newSizes.filter(size=>!oldSizes.includes(size))
    const definitions=[]
    const ids=new Set()
    for(let i=0;i<savedDefinitions.length;i++){
      const saved=savedDefinitions[i],next=nextDefinitions[i]
      if(!plain(saved)||!plain(next)||typeof saved.id!=='string'||!saved.id||
        ids.has(saved.id)||next.id!==saved.id||!plain(saved.targetsMm)||!plain(next.targetsMm))
        return fail('POM identity, order or target inventory changed')
      ids.add(saved.id)
      const savedMetadata={...saved},nextMetadata={...next}
      delete savedMetadata.targetsMm;delete nextMetadata.targetsMm
      if(!same(savedMetadata,nextMetadata))
        return fail('POM station, tolerance or metadata cannot change during canonical size evolution')
      if(Object.keys(saved.targetsMm).length!==oldSizes.length||
        oldSizes.some(size=>!Object.hasOwn(saved.targetsMm,size))||
        Object.keys(saved.targetsMm).some(size=>!oldSizes.includes(size)))
        return fail('Saved POM source has incomplete canonical size targets')
      if(Object.keys(next.targetsMm).length!==newSizes.length||
        newSizes.some(size=>!Object.hasOwn(next.targetsMm,size))||
        Object.keys(next.targetsMm).some(size=>!newSizes.includes(size)))
        return fail('Every new canonical size requires an explicit POM target cell')
      if(oldSizes.some(size=>!same(saved.targetsMm[size],next.targetsMm[size])))
        return fail('Existing physical POM targets cannot be altered during size evolution')
      if(newOnly.some(size=>typeof next.targetsMm[size]!=='number'||
        !Number.isFinite(next.targetsMm[size])||next.targetsMm[size]<=0||next.targetsMm[size]>10000))
        return fail('New canonical sizes require explicitly authored finite positive POM targets in mm')
      definitions.push({...next,targetsMm:Object.fromEntries(newSizes.map(size=>[size,next.targetsMm[size]]))})
    }
    return {ok:true,definitions,appendedSizes:newOnly,factoryApproved:false}
  }catch(error){return fail('Invalid named-size POM migration: '+String(error?.message||error))}
}
