/** Pantone reference records are user-authored until licensed Pantone data is installed. */
export const PANTONE_SYSTEMS=Object.freeze(['TCX','TPG','PMS'])

export function normalizePantoneReference(value,system='TCX'){
  const input=String(value||'').trim().toUpperCase().replace(/\s+/g,' ')
  if(!input)return ''
  if(system==='TCX'||system==='TPG'){
    const match=input.match(/^(?:PANTONE )?(\d{2})-(\d{4})(?: (TCX|TPG))?$/)
    if(!match||match[3]&&match[3]!==system)return null
    return `${match[1]}-${match[2]} ${system}`
  }
  if(system==='PMS'){
    const match=input.match(/^(?:PANTONE )?([A-Z0-9][A-Z0-9 ]{0,35}) ([CU])$/)
    return match?`PANTONE ${match[1]} ${match[2]}`:null
  }
  return null
}

export function validatePantoneCatalog(records){
  if(!Array.isArray(records))throw new Error('Color catalog must be an array')
  const seen=new Set()
  return records.map((record,index)=>{
    if(!record||!PANTONE_SYSTEMS.includes(record.system))throw new Error(`Invalid Pantone system at row ${index+1}`)
    const code=normalizePantoneReference(record.code,record.system)
    if(!code)throw new Error(`Invalid Pantone reference at row ${index+1}`)
    if(seen.has(code))throw new Error(`Duplicate Pantone reference: ${code}`)
    seen.add(code)
    const hex=record.hex==null||record.hex===''?null:String(record.hex).toUpperCase()
    if(hex&&!/^#[0-9A-F]{6}$/.test(hex))throw new Error(`Invalid screen color at row ${index+1}`)
    return {code,system:record.system,name:String(record.name||'').slice(0,120),hex,source:String(record.source||'Licensed reference').slice(0,120)}
  })
}

export function createManufacturerColorRecord({code,system,source,approval,hex}){
  const normalized=normalizePantoneReference(code,system)
  if(!normalized)throw new Error('Enter a valid Pantone reference')
  return {code:normalized,system,source:source||'Physical standard pending',approval:approval||'Unapproved',previewHex:/^#[0-9a-f]{6}$/i.test(hex||'')?hex:null,previewOnly:true}
}
