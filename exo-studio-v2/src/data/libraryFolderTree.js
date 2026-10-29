/**
 * One navigation hierarchy shared by the top library tree and its asset
 * views. The ids select existing assets, not synthetic empty directories.
 */
const leaf=(id,label)=>({id,label})

export const HARDWARE_FOLDERS=[
  {id:'fasteners',label:'Buttons & Fasteners',children:[
    leaf('button','Buttons'),leaf('buttonhole','Buttonholes'),
    leaf('snap','Snaps'),leaf('rivet','Rivets'),
  ]},
  {id:'zipper-parts',label:'Zippers & Components',children:[
    leaf('zipper','Zippers'),leaf('slider','Sliders'),
    leaf('puller','Pullers'),leaf('stopper','Stoppers'),
    leaf('tape','Tapes & Teeth'),
  ]},
  {id:'findings',label:'Other Hardware & Trims',children:[
    leaf('buckle','Buckles & Rings'),leaf('graphic','Graphics'),leaf('trim','Other Trims'),
  ]},
]

const garments=[
  {id:'tops',label:'Tops',children:[leaf('tees','T-Shirts'),leaf('hoodies','Hoodies')]},
  {id:'bottoms',label:'Bottoms',children:[leaf('pants','Pants'),leaf('jeans','Jeans'),leaf('skirts','Skirts')]},
  {id:'drafts',label:'Drafts & Blocks',children:[leaf('blank','Blank Drafts')]},
]

export function libraryFolders(category,fabricGroups=[]){
  if(category==='Hardware and Trims')return HARDWARE_FOLDERS
  if(category==='Garment'||category==='Patterns')return garments
  if(category==='Fabric'||category==='Material')return fabricGroups.map(([name])=>leaf(name,name))
  if(category==='Avatar')return [
    {id:'reference',label:'Reference Avatars',children:[leaf('theo','Theo'),leaf('nora','Nora'),leaf('clo-thomas','Thomas')]},
    {id:'base',label:'Fitting Bodies',children:[leaf('makehuman-base','MakeHuman')]},
  ]
  if(category==='Hanger')return [leaf('wood','Wood Hangers'),leaf('trouser-clip','Clip Hangers')]
  if(category==='Stage')return [
    {id:'scenes',label:'3D Scenes',children:[leaf('runway','Runways'),leaf('studio','Studios'),leaf('cathedral','Architectural Sets')]},
    leaf('none','Empty Studio'),
  ]
  return []
}

export function folderIncludes(folder,nodeId,folderTree){
  if(!folder||folder==='all')return true
  if(folder===nodeId)return true
  const visit=(items)=>items.some(node=>node.id===folder
    ? Boolean(node.children?.some(child=>child.id===nodeId||child.children?.some(grandchild=>grandchild.id===nodeId)))
    : Boolean(node.children&&visit(node.children)))
  return visit(folderTree)
}

export function templateMatchesFolder(template,folder){
  if(!folder||folder==='all')return true
  const id=template.id
  const kind={
    'tee':'tees','avatar-worn-tee':'tees','clo-male-tshirt':'tees','hoodie':'hoodies','zip-hoodie':'hoodies',
    'pants':'pants','jeans-501':'jeans','jeans-501-fit':'jeans',
    'skirt':'skirts','blank':'blank',
  }[id]
  return folderIncludes(folder,kind,garments)
}
