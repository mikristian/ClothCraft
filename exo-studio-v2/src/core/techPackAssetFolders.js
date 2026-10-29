// Virtual folders categorize assets stored in the editable EXO Tech Pack.
// They do not move or rewrite the user's source files or garment patterns.
export const TECHPACK_ASSET_FOLDERS=Object.freeze([
  {id:'all',name:'All assets',uploadCategory:'reference',categories:null},
  {id:'graphics',name:'Graphics & logos',uploadCategory:'graphic',categories:['graphic','logo','technical flat','mockup']},
  {id:'references',name:'Photo references',uploadCategory:'reference',categories:['reference','fit','construction','inspiration']},
  {id:'fabrics',name:'Fabrics & swatches',uploadCategory:'fabric swatch',categories:['fabric swatch','fabric']},
  {id:'inside-tags',name:'Inside tags & labels',uploadCategory:'brand label',categories:['brand label','care label','size label','inside label','trim']},
  {id:'hangtags',name:'Hangtags',uploadCategory:'hangtag',categories:['hangtag','hang tag']},
  {id:'packaging',name:'Packaging designs',uploadCategory:'packaging',categories:['packaging','packaging box','packaging bag']},
  {id:'patterns',name:'Patterns & cutlines',uploadCategory:'pattern',categories:['pattern']},
])
export function assetInFolder(asset,folder='all'){
  const record=TECHPACK_ASSET_FOLDERS.find(f=>f.id===folder)
  return !record||!record.categories||record.categories.includes(asset.category||'reference')
}
export const assetFolderDefault=id=>TECHPACK_ASSET_FOLDERS.find(f=>f.id===id)?.uploadCategory||'reference'
