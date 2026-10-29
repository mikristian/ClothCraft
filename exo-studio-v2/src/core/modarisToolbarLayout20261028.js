/** A deterministic, safe toolbar plan for the Modaris command library.
 * Keeps saved user arrangements intact and adds only commands not already used.
 */
export const MODARIS_TOOLBAR_MAX_BARS_20261028=16
export const MODARIS_TOOLBAR_MAX_TOOLS_20261028=64

export function planCompleteModarisToolbars20261028(catalog,bars=[],stamp='modaris'){
  const existingBars=Array.isArray(bars)?bars:[]
  const alreadyPresent=new Set(existingBars.flatMap(bar=>Array.isArray(bar.tools)?bar.tools:[]))
  const seen=new Set()
  const missing=(Array.isArray(catalog)?catalog:[]).filter(tool=>{
    if(!tool||typeof tool.id!=='string'||!tool.id.startsWith('modaris:')||
        alreadyPresent.has(tool.id)||seen.has(tool.id))return false
    seen.add(tool.id)
    return true
  })
  const palettes=[...new Set(missing.map(tool=>tool.palette||'Menu'))]
  const additions=palettes.flatMap(palette=>{
    const tools=missing.filter(tool=>(tool.palette||'Menu')===palette)
    return Array.from({length:Math.ceil(tools.length/MODARIS_TOOLBAR_MAX_TOOLS_20261028)},(_,index)=>({
      id:`modaris-complete-${stamp}-${palette.toLowerCase()}-${index}`,
      name:`Modaris ${palette}${tools.length>MODARIS_TOOLBAR_MAX_TOOLS_20261028?` ${index+1}`:''}`,
      dock:'floating',columns:4,orientation:'vertical',visible:false,
      tools:tools.slice(index*MODARIS_TOOLBAR_MAX_TOOLS_20261028,(index+1)*MODARIS_TOOLBAR_MAX_TOOLS_20261028).map(tool=>tool.id),
    }))
  })
  return {
    ok:existingBars.length+additions.length<=MODARIS_TOOLBAR_MAX_BARS_20261028,
    missingCount:missing.length,requiredBars:additions.length,
    availableBars:Math.max(0,MODARIS_TOOLBAR_MAX_BARS_20261028-existingBars.length),
    additions,
  }
}
