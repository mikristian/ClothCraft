// Shared by React preview and direct native command acceptance. No JSX or
// browser globals, so it also runs unchanged in native HTTP regression tests.
const SIZE_NAMES=['XS','S','M','L','XL','XXL']
const finite=x=>typeof x==='number'&&Number.isFinite(x)
const asCount=x=>Number.isSafeInteger(x)&&x>=0?x:null
const position=x=>Array.isArray(x)&&x.length===2&&x.every(finite)
const directOverrides=value=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length>0&&Object.keys(value).length<=64&&Object.entries(value).every(([key,mm])=>/^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(key)&&finite(mm)&&Math.abs(mm)<=5000)

export function validateSixSizeRegenerationPreview20261027(report,revision,expectedOverrides=null){
  if(!report||report.format!=='exo-native-reactive-size-run.v1'||report.sourceRevision!==revision||report.manufacturerApproved!==false||report.factoryApproved!==false)return false
  if(asCount(report.changedPanels)===null||asCount(report.changedBindings)===null||report.changedPanels<2||report.changedPanels>32||report.changedBindings<report.changedPanels||report.changedBindings>128)return false
  if(!Array.isArray(report.panelIds)||report.panelIds.length!==report.changedPanels||report.panelIds.some(id=>typeof id!=='string'||!id)||new Set(report.panelIds).size!==report.changedPanels)return false
  if(!Array.isArray(report.bindingIds)||report.bindingIds.length!==report.changedBindings||report.bindingIds.some(id=>typeof id!=='string'||!id)||new Set(report.bindingIds).size!==report.changedBindings)return false
  if(!directOverrides(report.measurementOverrides))return false
  if(expectedOverrides&&(!directOverrides(expectedOverrides)||JSON.stringify(Object.entries(expectedOverrides).sort())!==JSON.stringify(Object.entries(report.measurementOverrides).sort())))return false
  const source=report.bySize??report.sizes
  const rows=Array.isArray(source)?source:source&&typeof source==='object'?Object.entries(source).map(([size,value])=>({size,...value})):[]
  if(rows.length!==6||new Set(rows.map(row=>row?.size)).size!==6||!SIZE_NAMES.every(size=>rows.some(row=>row?.size===size)))return false
  // Newer Rust sessions include independently compiled physical CUT, notch,
  // seam and panel inventories for all sizes. Older qualified sessions have
  // only point rows; never invent this extra evidence for those releases.
  if(report.perSizeIntegrity!==undefined){
    const integrity=report.perSizeIntegrity
    const validCount=x=>Number.isSafeInteger(x)&&x>=0
    if(!Array.isArray(integrity)||integrity.length!==6||
      !SIZE_NAMES.every(size=>integrity.filter(x=>x?.size===size).length===1))return false
    const first=integrity[0]
    if(!validCount(first.panelCount)||first.panelCount<report.changedPanels||
      !validCount(first.seamCount)||!validCount(first.notchCount)||
      !validCount(first.namedEdgeCount)||!validCount(first.industrialPanelCount)||
      first.industrialPanelCount>first.panelCount)return false
    for(const entry of integrity){
      if(entry.nativeCutAndSewValidated!==true||
        !validCount(entry.panelCount)||entry.panelCount!==first.panelCount||
        !validCount(entry.seamCount)||entry.seamCount!==first.seamCount||
        !validCount(entry.notchCount)||entry.notchCount!==first.notchCount||
        !validCount(entry.namedEdgeCount)||entry.namedEdgeCount!==first.namedEdgeCount||
        !validCount(entry.industrialPanelCount)||entry.industrialPanelCount!==first.industrialPanelCount)
        return false
    }
  }
  const identities=new Set()
  for(const [index,row] of rows.entries()){
    if(!Array.isArray(row.changes)||row.changes.length!==report.changedBindings)return false
    const seen=new Set()
    for(const change of row.changes){
      if(!report.panelIds.includes(change?.panelId)||!Number.isSafeInteger(change.pointIndex)||change.pointIndex<0||!position(change.beforeMm)||!position(change.afterMm)||change.beforeMm.every((n,i)=>n===change.afterMm[i]))return false
      const identity=`${change.panelId}\u0000${change.pointIndex}`
      if(seen.has(identity))return false
      seen.add(identity)
    }
    if(new Set(row.changes.map(change=>change.panelId)).size!==report.changedPanels)return false
    if(index===0)for(const identity of seen)identities.add(identity)
    else if(seen.size!==identities.size||[...seen].some(identity=>!identities.has(identity)))return false
  }
  return true
}
