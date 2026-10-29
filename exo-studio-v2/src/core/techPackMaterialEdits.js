// One authored BOM is the material data shared by the fabric specification
// and bill-of-materials sheets. Keep per-sheet cells for existing documents,
// but mirror overlapping fields so both editor views and exports agree.
const columns={
  materials:['description','color','gsm','thickness','composition','supplier','quantity','cost'],
  fabrics:['description','color','composition','gsm',null,null,null,'supplier',null]
}

export function editTechPackMaterialCell(source,workspace={},draft={},pageId,id,index,value){
  if(!Object.hasOwn(columns,pageId)||!Number.isInteger(index)||index<0||index>=columns[pageId].length)return null
  const current=workspace.cells||{}
  const edited={...current,[pageId]:{...current[pageId],[id]:{...current[pageId]?.[id],[index]:value}}}
  const key=columns[pageId][index]
  if(!key)return {cells:edited}
  const otherPage=pageId==='fabrics'?'materials':'fabrics'
  const otherIndex=columns[otherPage].indexOf(key)
  if(otherIndex!==-1)edited[otherPage]={...current[otherPage],[id]:{
    ...current[otherPage]?.[id],[otherIndex]:value
  }}

  const sourceFabric=(source.fabrics||[]).find(f=>String(f.id)===String(id))
  const authored=Array.isArray(draft.bom)?draft.bom:[]
  if(!sourceFabric&&!authored.some(b=>String(b.id)===String(id)))return {cells:edited}
  const previous=authored.find(b=>String(b.id)===String(id))||{
    id,description:sourceFabric?.name||'',color:sourceFabric?.color||'',gsm:sourceFabric?.gsm??'',
    thickness:sourceFabric?.thickness??'',composition:sourceFabric?.composition||'',
    supplier:sourceFabric?.supplier||'',quantity:sourceFabric?.quantity??'',cost:''
  }
  const next={...previous,[key]:value}
  return {cells:edited,bom:authored.some(b=>String(b.id)===String(id))?
    authored.map(b=>String(b.id)===String(id)?next:b):[...authored,next]}
}
