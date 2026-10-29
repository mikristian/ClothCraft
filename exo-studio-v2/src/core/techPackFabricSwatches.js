// Link a visual material reference to a specific fabric ID without modifying
// the garment's actual material parameters or duplicating its image bytes.
export function setTechPackFabricSwatch(workspace={},fabricId,assetId){
  if(typeof fabricId!=='string'||!fabricId)return workspace
  const fabricSwatches={...workspace.fabricSwatches}
  if(typeof assetId==='string'&&assetId)fabricSwatches[fabricId]=assetId
  else delete fabricSwatches[fabricId]
  return {...workspace,fabricSwatches}
}

export function getTechPackFabricSwatch(workspace={},fabricId,assets=[]){
  const assetId=workspace.fabricSwatches?.[fabricId]
  return typeof assetId==='string'&&assetId?assets.find(asset=>asset.id===assetId)||null:null
}

export function removeTechPackFabricSwatchAsset(workspace={},assetId){
  return {...workspace,fabricSwatches:Object.fromEntries(Object.entries(workspace.fabricSwatches||{})
    .filter(([,id])=>id!==assetId))}
}
