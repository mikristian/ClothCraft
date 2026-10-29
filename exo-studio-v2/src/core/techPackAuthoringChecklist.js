// Document completeness is not factory approval, physical validation, or a
// grading audit. These flags identify missing authored factory handoff fields.
const present=value=>value!==null&&value!==undefined&&String(value).trim()!==''
const records=value=>Array.isArray(value)?value:[]

export function techPackAuthoringChecklist(source={},draft={},workspace={},assets=[]){
  const fabrics=records(source.fabrics)
  const bom=records(draft.bom)
  const material=id=>bom.find(item=>String(item?.id)===String(id))||{}
  const cell=(id,index)=>workspace.cells?.fabrics?.[id]?.[index]
  const measurements=Object.values(source.pom||{}).flatMap(records)
  const arrows=records(workspace.annotations?.callouts).filter(item=>item?.type==='arrow')
  const availableImages=new Set(records(assets).filter(item=>item?.id&&
    typeof (item.dataUrl||item.src||item._src)==='string'&&
    /^(data:image\/(png|jpeg|webp);base64,|data:image\/svg\+xml,%3Csvg)/i.test(item.dataUrl||item.src||item._src)).map(item=>item.id))
  const items=[
    {id:'style',pageId:'overview',title:'Style number',done:present(draft.sku),detail:'Give the style a production reference number'},
    {id:'patterns',pageId:'patterns',title:'Pattern / cut pieces',done:records(source.panels).length>0,detail:'Link the garment pattern pieces and cutting quantities'},
    {id:'pom',pageId:'measurement-table',title:'Points of measure',done:measurements.length>0&&measurements.every(m=>present(m.cm)&&present(m.toleranceCm)),detail:'Record size measurements and tolerances, verify against a physical sample'},
    {id:'fabric',pageId:'fabrics',title:'Fabric composition and weight',done:fabrics.length>0&&fabrics.every(f=>{
      const authored=material(f.id)
      return present(cell(f.id,2)??authored.composition??f.composition)&&present(cell(f.id,3)??authored.gsm??f.gsm)
    }),detail:'Specify each fabric fiber composition and GSM'},
    {id:'swatches',pageId:'fabrics',title:'Fabric swatch references',done:fabrics.length>0&&fabrics.every(f=>availableImages.has(workspace.fabricSwatches?.[f.id])),detail:'Assign a photographed or illustrated swatch to each fabric'},
    {id:'callouts',pageId:'callouts',title:'Construction callouts',done:arrows.length>0&&arrows.every(a=>present(a.component)&&present(a.instruction)),detail:'Draw leader arrows and provide factory construction instructions'},
    {id:'labels',pageId:'labels',title:'Labels and care details',done:records(draft.labels).length>0||records(workspace.extraRows?.labels).length>0,detail:'Specify main label, size/care labels and placement'},
    {id:'packaging',pageId:'packaging',title:'Packaging instructions',done:records(draft.packaging).length>0||records(workspace.extraRows?.packaging).length>0,detail:'Specify folding, bags, packing and cartons'},
    {id:'factory',pageId:'overview',title:'Manufacturing contact',done:present(draft.factory),detail:'Record the intended manufacturer or factory'},
  ]
  return {items,recorded:items.filter(item=>item.done).length,total:items.length,
    outstanding:items.filter(item=>!item.done).length}
}
