// Presentation structure only; garment seam/panel/measurement data stays intact.
const arr=v=>Array.isArray(v)?v:[]
const validId=v=>typeof v==='string'&&/^[a-z0-9_-]{1,80}$/i.test(v)
const safeName=v=>typeof v==='string'?v.slice(0,100):''
const copy=v=>JSON.parse(JSON.stringify(v))
const isNativeCell=v=>v&&typeof v==='object'&&!Array.isArray(v)&&(v.origin==='native'||v.provenance?.kind==='source'||v.sourceRef)
export const MAX_TECHPACK_PAGES=60
const customId=id=>typeof id==='string'&&/^custom-[a-z0-9_-]{3,72}$/i.test(id)

export function resolveTechPackPages(workspace={},defaults=[]){
  const standard=arr(defaults).filter(p=>validId(p?.id))
  const existing=new Set(standard.map(p=>p.id))
  const custom=arr(workspace.customPages).slice(0,Math.max(0,MAX_TECHPACK_PAGES-standard.length)).filter(p=>{
    if(!customId(p?.id)||existing.has(p.id))return false
    existing.add(p.id);return true
  }).map(p=>({id:p.id,name:safeName(p.name)||'Custom page',subtitle:safeName(p.subtitle)||'Your layout'}))
  const byId=new Map([...standard,...custom].map(p=>[p.id,p]))
  const seen=new Set()
  const order=[...arr(workspace.pageOrder),...byId.keys()].filter(id=>{
    if(!byId.has(id)||seen.has(id))return false
    seen.add(id);return true
  })
  return order.map((id,i)=>({...byId.get(id),tag:String(i+1).padStart(2,'0')}))
}

export function insertCustomTechPackPage(workspace={},id,afterId='',name='New page',defaults=[]){
  if(!customId(id))throw Error('A unique custom page identifier is required')
  const current=resolveTechPackPages(workspace,defaults).map(p=>p.id)
  if(current.length>=MAX_TECHPACK_PAGES||current.includes(id))throw Error('Custom page limit or duplicate ID')
  const order=current.slice()
  const after=order.indexOf(afterId)
  order.splice(after>=0?after+1:order.length,0,id)
  const pages={...workspace.pages,[id]:{...workspace.pages?.[id],title:safeName(name)||'New page',layoutPreset:'balanced'}}
  return {...workspace,customPages:[...arr(workspace.customPages),{id,name:safeName(name)||'New page',subtitle:'Custom authoring layout'}],pageOrder:order,pages}
}

export function reorderTechPackPage(workspace={},pageId,targetId,defaults=[]){
  const pages=resolveTechPackPages(workspace,defaults).map(p=>p.id)
  if(!pages.includes(pageId)||!pages.includes(targetId)||pageId===targetId)return workspace
  const next=pages.filter(id=>id!==pageId)
  next.splice(next.indexOf(targetId),0,pageId)
  return {...workspace,pageOrder:next}
}
export function shiftTechPackPage(workspace={},pageId,direction,defaults=[]){
  const ids=resolveTechPackPages(workspace,defaults).map(p=>p.id)
  const index=ids.indexOf(pageId),target=index+direction
  if(index<0||target<0||target>=ids.length)return workspace
  const next=ids.slice()
  ;[next[index],next[target]]=[next[target],next[index]]
  return {...workspace,pageOrder:next}
}
export function removeCustomTechPackPage(workspace={},pageId){
  if(!arr(workspace.customPages).some(p=>p.id===pageId))return workspace
  const result={...workspace,customPages:workspace.customPages.filter(p=>p.id!==pageId),
    pageOrder:arr(workspace.pageOrder).filter(id=>id!==pageId)}
  for(const key of ['pages','boardObjects','pageBoxes','tables','pageAssets','annotations','cells','extraRows']){
    if(workspace[key]&&typeof workspace[key]==='object'){
      const cloned={...workspace[key]};delete cloned[pageId];result[key]=cloned
    }
  }
  return result
}

export function captureTechPackPageLayout(workspace={},pageId,name='Custom page template',{includeContent=false}={}){
  const settings=workspace.pages?.[pageId]||{}
  const clone=v=>JSON.parse(JSON.stringify(v))
  const editableCell=(value)=>{
    if(!includeContent)return ''
    if(value&&typeof value==='object'&&!Array.isArray(value)){
      if(isNativeCell(value)){
        // Do not persist a garment's native measurements, underlying source
        // values, revision, or IDs in a reusable design. The binding is
        // re-established from the CURRENT garment when the preset is used.
        return {input:'',value:'',origin:'native',reviewState:'needs-review'}
      }
      // Authored text can be preserved on request; auxiliary source fields
      // from overridden cells must not travel to another garment's template.
      const input=value.input??value.value??''
      const saved=typeof input==='number'&&Number.isFinite(input)?input:String(input).slice(0,2000)
      return {input:saved,value:saved,origin:'authored',reviewState:'needs-review',
        ...(value.format&&typeof value.format==='object'?{format:clone(value.format)}:{})}
    }
    return value==null?'':String(value).slice(0,2000)
  }
  const slotLayout=slot=>{
    if(!slot||typeof slot!=='object')return undefined
    const spreadsheet=slot.spreadsheetTable&&Array.isArray(slot.spreadsheetTable.columns)?slot.spreadsheetTable:null
    const headers=(spreadsheet?spreadsheet.columns.map(c=>c.label):arr(slot.headers)).slice(0,12).map(safeName)
    const blankSpreadsheet=spreadsheet?{
      id:safeName(spreadsheet.id),title:safeName(spreadsheet.title||spreadsheet.name),kind:safeName(spreadsheet.kind),
      name:safeName(spreadsheet.name),styleId:safeName(spreadsheet.styleId),version:3,origin:'authored',
      columns:spreadsheet.columns.slice(0,12).map(c=>({id:safeName(c.id),label:safeName(c.label),type:safeName(c.type)||'text',width:c.width||130})),
      sourceLinked:Boolean(slot.sourceLinked||spreadsheet.sourceLinked),
      rows:arr(spreadsheet.rows).slice(0,24).map((row,i)=>({
        id:'blank-row-'+i,
        // A stable source ROW identifier is safe template metadata. Preserve
        // it without retaining any native garment measurement or revision, so
        // future auto-techpacks cannot silently match an unrelated row by
        // physical position after grading/garment changes.
        ...((slot.sourceLinked||spreadsheet.sourceLinked)&&typeof row?.id==='string'&&typeof row?.sourceRef==='string'?{sourceRowId:safeName(row.id)}:{}),
        ...((slot.sourceLinked||spreadsheet.sourceLinked)&&typeof row?.sourceRef==='string'?{sourceRowRef:safeName(row.sourceRef)}:{}),
        cells:Object.fromEntries(spreadsheet.columns.slice(0,12).map(c=>[c.id,includeContent?editableCell(row?.cells?.[c.id]):{input:'',value:'',origin:'authored',reviewState:'needs-review'}]))})),
      ...(spreadsheet.tableTheme?{tableTheme:clone(spreadsheet.tableTheme)}:{}),
      ...(spreadsheet.tableStyle?{tableStyle:clone(spreadsheet.tableStyle)}:{}),
      ...(spreadsheet.cellStyles?{cellStyles:clone(spreadsheet.cellStyles)}:{}),
      ...(spreadsheet.sourceKind?{sourceKind:safeName(spreadsheet.sourceKind)}:{})
    }:undefined
    return {id:safeName(slot.id),name:safeName(slot.name),category:safeName(slot.category),
      title:safeName(slot.title),header:safeName(slot.header),layout:safeName(slot.layout),headers,
      sourceLinked:Boolean(slot.sourceLinked||spreadsheet?.sourceLinked),
      rows:arr(slot.rows).slice(0,25).map((r,i)=>({id:'row-'+i,cells:headers.map((_,j)=>editableCell(r?.cells?.[j]))})),
      ...(blankSpreadsheet?{spreadsheetTable:blankSpreadsheet}:{})}
  }
  const boxes=arr(workspace.pageBoxes?.[pageId]).slice(0,24).map(b=>({
    id:String(b.id).slice(0,80),title:safeName(b.title),width:b.width,height:b.height,border:b.border,lineColor:b.lineColor,note:includeContent?safeName(b.note):'',
    x:Number.isFinite(b.x)?b.x:0,y:Number.isFinite(b.y)?b.y:0,
    ...(b.assetId?{assetId:String(b.assetId).slice(0,100)}:{}),
    ...(b.headerStyle?{headerStyle:safeName(b.headerStyle)}:{}),
    positionMode:b.positionMode==='absolute'?'absolute':undefined,slot:slotLayout(b.slot)
  }))
  const tables=arr(workspace.tables?.[pageId]).slice(0,12).map(t=>({
    id:String(t.id).slice(0,80),title:safeName(t.title),headers:arr(t.headers).slice(0,12).map(safeName),
    rows:arr(t.rows).slice(0,25).map(r=>({id:String(r.id).slice(0,80),cells:arr(t.headers).slice(0,12).map((_,j)=>editableCell(r?.cells?.[j]))}))
  }))
  const editable={layoutPreset:settings.layoutPreset||workspace.layoutPreset||'balanced',
    headerPreset:settings.headerPreset||workspace.headerPreset||'seville',
    templateTheme:settings.templateTheme||workspace.templateTheme||'mono',
    templateColors:settings.templateColors||workspace.templateColors||{},
    orientation:settings.orientation||workspace.orientation||'portrait',
    paperSize:settings.paperSize||workspace.paperSize||'Letter'}
  return {id:'page-layout-'+Date.now().toString(36),name:safeName(name)||'Custom page template',
    description:includeContent?'Page design plus explicitly authored editable content':'Saved page composition, frames and empty table structure',category:'custom',kind:'page-layout',
    contentMode:includeContent?'authored':'schema',
    layout:editable.layoutPreset,header:editable.headerPreset,theme:editable.templateTheme,
    pageSnapshot:clone({settings:editable,boardObjects:workspace.boardObjects?.[pageId]||{},boxes,tables,
      footerLogoAssetId:workspace.pageFooterAssets?.[pageId]||null,
      pageAssets:arr(workspace.pageAssets?.[pageId]).slice(0,35),
      annotations:includeContent?arr(workspace.annotations?.[pageId]).slice(0,150):[]})}
}

/** Capture a complete multi-artboard design. Garment measurements, native
 * source revisions and sample approvals are NEVER embedded in a preset.
 * Authored text is included only after the designer explicitly requests it.
 */
export function captureTechPackDocumentTemplate(workspace={},defaults=[],name='My Techpack system',{includeContent=false,assets=[]}={}){
  const pages=resolveTechPackPages(workspace,defaults).slice(0,MAX_TECHPACK_PAGES).map(page=>({
    sourcePageId:page.id,
    name:safeName(workspace.pages?.[page.id]?.title||page.name)||'Techpack page',
    custom:customId(page.id),
    layout:captureTechPackPageLayout(workspace,page.id,page.name,{includeContent})
  }))
  const usedAssets=new Set(pages.flatMap(page=>{
    const snapshot=page.layout.pageSnapshot
    return [...arr(snapshot.pageAssets),snapshot.footerLogoAssetId,
      ...arr(snapshot.boxes).map(box=>box.assetId)].filter(Boolean)
  }))
  // Only explicit opt-in includes small designer-uploaded RASTER images. Keep
  // SVG, native garment graphics and overly large photos in the asset library;
  // they must be explicitly relinked in a different project. No binary files
  // are silently copied from an unrelated native garment.
  let totalImageBytes=0
  const imageAssets=includeContent?arr(assets).filter(asset=>{
    const src=asset?.dataUrl||asset?._src||''
    if(!usedAssets.has(asset?.id)||!['assets','references'].includes(asset?._source))return false
    if(typeof src!=='string'||src.length>90000||!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(src))return false
    totalImageBytes+=src.length
    return totalImageBytes<=260000
  }).slice(0,12).map(asset=>({id:String(asset.id).slice(0,100),name:safeName(asset.name),
    category:safeName(asset.category)||'reference',caption:safeName(asset.caption),
    dataUrl:asset.dataUrl||asset._src})):[]
  return {id:'pack-layout-'+Date.now().toString(36),name:safeName(name)||'My Techpack system',
    category:'custom',kind:'pack-layout',contentMode:includeContent?'authored':'schema',
    description:includeContent?'Reusable multi-page studio system with authored design content':'Reusable multi-page Techpack artboards, widgets and specifications',
    pages,imageAssets}
}

/** Apply a complete preset to a target document. Retains the destination
 * garment and its original source-specific cells; only presentation pages,
 * boxes, asset links, and explicitly authored template notes are updated. */
export function applyTechPackDocumentTemplate(workspace={},preset={},defaults=[],randomId=()=>Math.random().toString(36).slice(2),assetIds=[]){
  if(preset?.kind!=='pack-layout'||!Array.isArray(preset.pages))return workspace
  const standard=new Set(arr(defaults).map(item=>item.id))
  const imageAssets=arr(preset.imageAssets).slice(0,12)
  const remapped=new Map()
  const appended=[]
  for(const asset of imageAssets){
    if(!asset?.id||typeof asset?.dataUrl!=='string'||asset.dataUrl.length>90000||
      !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(asset.dataUrl))continue
    const newId='template-asset-'+String(randomId()).replace(/[^a-z0-9_-]/gi,'').slice(0,60)
    if(remapped.has(asset.id))continue
    remapped.set(asset.id,newId)
    appended.push({...asset,id:newId})
  }
  const validAssets=[...arr(assetIds),...appended.map(asset=>asset.id)]
  let next={...workspace,assets:[...arr(workspace.assets),...appended]}
  const order=[]
  for(const page of preset.pages.slice(0,MAX_TECHPACK_PAGES)){
    if(!page?.layout?.pageSnapshot)continue
    const existing=standard.has(page.sourcePageId)
    const pageId=existing?page.sourcePageId:'custom-page-'+String(randomId()).replace(/[^a-z0-9_-]/gi,'').slice(0,58)
    if(!existing){
      try{next=insertCustomTechPackPage(next,pageId,order.at(-1)||'',page.name,defaults)}
      catch{continue}
    }
    const layout={...page.layout,contentMode:preset.contentMode==='authored'?'authored':'schema'}
    next=applyTechPackCapturedLayout(next,pageId,layout,randomId)
    if(remapped.size){
      const boxes=arr(next.pageBoxes?.[pageId]).map(box=>({...box,
        assetId:remapped.get(box.assetId)||box.assetId}))
      const objects={...next.boardObjects?.[pageId]}
      for(const [oldId,newId] of remapped){
        const oldKey='asset-'+oldId
        if(objects[oldKey]){objects['asset-'+newId]=objects[oldKey];delete objects[oldKey]}
      }
      next={...next,pageBoxes:{...next.pageBoxes,[pageId]:boxes},
        pageAssets:{...next.pageAssets,[pageId]:arr(next.pageAssets?.[pageId]).map(id=>remapped.get(id)||id)},
        pageFooterAssets:{...next.pageFooterAssets,[pageId]:remapped.get(next.pageFooterAssets?.[pageId])||next.pageFooterAssets?.[pageId]},
        boardObjects:{...next.boardObjects,[pageId]:objects}}
    }
    next=reconcileTechPackTemplateAssets(next,pageId,validAssets)
    order.push(pageId)
  }
  const remainder=resolveTechPackPages(next,defaults).map(item=>item.id).filter(id=>!order.includes(id))
  return {...next,pageOrder:[...order,...remainder]}
}

/** Rehydrate a designed source-linked sheet with values from the active garment.
 * Saved column styling, column order and user content stay in their artboard slots.
 * Source values are accepted solely from `freshTable`, never from the preset.
 */
export function rebindTechPackTemplateTable(savedTable={},freshTable={},options={}){
  const columns=arr(savedTable.columns)
  if(!columns.length||!arr(freshTable.columns).length)return copy(savedTable)
  const freshColumns=arr(freshTable.columns)
  const freshRows=arr(freshTable.rows)
  const authored=options.includeAuthored===true
  const resolveColumn=column=>freshColumns.find(c=>c.id===column.id)||freshColumns.find(c=>c.label===column.label)||null
  const resolved=columns.map(resolveColumn)
  const rows=arr(savedTable.rows).map(row=>{
    const savedCells=row?.cells||{}
    const reference=typeof row?.sourceRowRef==='string'&&row.sourceRowRef?row.sourceRowRef:
      Object.values(savedCells).find(cell=>isNativeCell(cell)&&cell.sourceRef)?.sourceRef
    const match=reference?freshRows.find(candidate=>candidate.sourceRef===reference||
      Object.values(candidate?.cells||{}).some(cell=>cell?.sourceRef===reference)):null
    // A row without source identity must never inherit native content from a
    // coincidentally reused row ID in a different garment.
    const sourceIdentity=!reference&&(savedTable.sourceLinked===true||savedTable.origin==='native')?
      row?.sourceRowId:row?.sourceRowId||(!savedTable.sourceLinked&&savedTable.origin!=='native'?row?.id:null)
    const freshRow=match||(!reference&&sourceIdentity?freshRows.find(candidate=>candidate.id===sourceIdentity):null)
    const rowMatchesReference=!reference||freshRow?.sourceRef===reference||
      Object.values(freshRow?.cells||{}).some(cell=>cell?.sourceRef===reference)
    const cells={}
    columns.forEach((col,i)=>{
      const prior=savedCells[col.id]
      // In a mixed sheet, a user-authored notes column is still authored even
      // when other columns on that row are supplied by the live garment.
      const explicitlyAuthored=prior&&typeof prior==='object'&&prior.origin==='authored'&&!prior.sourceRef&&!prior.provenance?.kind
      const linked=!explicitlyAuthored&&(isNativeCell(prior)||savedTable.sourceLinked===true||savedTable.origin==='native')
      const actual=rowMatchesReference&&resolved[i]?freshRow?.cells?.[resolved[i].id]:undefined
      if(linked){
        const expectedRef=typeof prior?.sourceRef==='string'?prior.sourceRef:null
        const actualRef=actual&&typeof actual==='object'?actual.sourceRef:null
        // An explicitly source-linked template row needs a concrete row
        // identity. A new sheet with identical column names is insufficient.
        const authenticatedRow=Boolean(reference||sourceIdentity)
        const safeSource=authenticatedRow&&actual&&typeof actual==='object'&&isNativeCell(actual)&&
          (!reference||actualRef===reference||(!actualRef&&freshRow?.sourceRef===reference))
        cells[col.id]=!safeSource||(expectedRef&&actualRef!==expectedRef)?{input:'',value:'',origin:'authored',reviewState:'needs-review'}:copy(actual)
      }else cells[col.id]=authored?copy(prior??{input:'',value:'',origin:'authored'}):{input:'',value:'',origin:'authored',reviewState:'needs-review'}
    })
    return {...row,cells}
  })
  return {...copy(savedTable),rows,columns:copy(columns),sourceRevision:freshTable.sourceRevision??null}
}

// A template stores references rather than image blobs. Resolve those
// references against the assets in the destination document so an imported
// layout never displays the wrong photo after changing garments.
export function reconcileTechPackTemplateAssets(workspace={},pageId,assetIds=[]){
  const available=new Set(arr(assetIds).filter(id=>typeof id==='string'&&id.length>0))
  const boxes=arr(workspace.pageBoxes?.[pageId])
  const rebound=boxes.map(box=>box.assetId&&!available.has(box.assetId)?
    {...box,assetId:null}:box)
  const pageAssets=arr(workspace.pageAssets?.[pageId]).filter(id=>available.has(id))
  const footer=workspace.pageFooterAssets?.[pageId]
  const board=workspace.boardObjects?.[pageId]||{}
  const retained=new Set([...pageAssets,...rebound.map(box=>box.assetId).filter(Boolean),footer].filter(id=>available.has(id)).map(id=>'asset-'+id))
  const transformed=Object.fromEntries(Object.entries(board).filter(([key])=>
    !key.startsWith('asset-')||retained.has(key)))
  return {...workspace,
    pageBoxes:{...workspace.pageBoxes,[pageId]:rebound},
    pageAssets:{...workspace.pageAssets,[pageId]:pageAssets},
    pageFooterAssets:{...workspace.pageFooterAssets,[pageId]:available.has(footer)?footer:null},
    boardObjects:{...workspace.boardObjects,[pageId]:transformed}}
}

export function applyTechPackCapturedLayout(workspace={},pageId,preset,randomId=()=>Math.random().toString(36).slice(2)){
  const layout=preset?.pageSnapshot
  if(!layout||preset.kind!=='page-layout')return workspace
  const settings=layout.settings||{}
  const used=new Set()
  const nextId=prefix=>{
    let id,attempt=0
    do{
      const generated=String(randomId()).replace(/[^a-z0-9_-]/gi,'').slice(0,60)
      id=prefix+(generated||'new')+(attempt?'-'+attempt:'')
      attempt++
    }while(used.has(id))
    used.add(id)
    return id
  }
  const boxIds=new Map()
  const boxes=arr(layout.boxes).slice(0,24).map(b=>{
    const id=nextId('box-');boxIds.set(b.id,id)
    const slot=b.slot&&typeof b.slot==='object'?{...b.slot,
      ...(b.slot.spreadsheetTable?{spreadsheetTable:{...b.slot.spreadsheetTable,
        id:nextId('table-'),pageId,boxId:id,
        rows:arr(b.slot.spreadsheetTable.rows).map(row=>({...row,id:nextId('row-')}))}}:{})
    }:b.slot
    return {...copy(b),id,note:preset.contentMode==='authored'?b.note||'':'',slot:slot?copy(slot):slot}
  })
  const tables=arr(layout.tables).slice(0,12).map(t=>({...copy(t),id:nextId('table-'),rows:arr(t.rows).map(r=>({...copy(r),id:nextId('row-'),cells:preset.contentMode==='authored'?copy(r.cells):arr(t.headers).map(()=>'')}))}))
  const transforms={}
  for(const [key,value] of Object.entries(layout.boardObjects||{})){
    // The saved board key already contains the `box-` prefix. Map precisely
    // once, regardless of whether the underlying box ID also begins with box-.
    const suffix=key.startsWith('box-')?boxIds.get(key.slice(4)):null
    const transformed=suffix?'box-'+suffix:key
    if(!suffix&&key.startsWith('box-'))continue
    if(value&&typeof value==='object'&&['x','y','scaleX','scaleY'].every(k=>value[k]===undefined||Number.isFinite(value[k])))transforms[transformed]=copy(value)
  }
  return {...workspace,pages:{...workspace.pages,[pageId]:{...workspace.pages?.[pageId],...settings}},
    pageBoxes:{...workspace.pageBoxes,[pageId]:boxes},tables:{...workspace.tables,[pageId]:tables},
    boardObjects:{...workspace.boardObjects,[pageId]:transforms},
    pageAssets:{...workspace.pageAssets,[pageId]:arr(layout.pageAssets).slice(0,35)},
    pageFooterAssets:{...workspace.pageFooterAssets,[pageId]:layout.footerLogoAssetId||null},
    ...(preset.contentMode==='authored'?{annotations:{...workspace.annotations,[pageId]:arr(layout.annotations).map(annotation=>({...copy(annotation),id:nextId('annotation-')}))}}:{})}
}

/** Restyle only visual properties of a page. All boxes, objects, assets,
 * spreadsheet cells, IDs, annotations and garment source remain unchanged. */
export function restyleTechPackPage(workspace={},pageId,preset={}){
  const settings=preset?.pageSnapshot?.settings||preset?.settings||preset
  const keys=['layoutPreset','headerPreset','templateTheme','templateColors','orientation','paperSize']
  const patch=Object.fromEntries(keys.filter(key=>settings[key]!==undefined).map(key=>[key,settings[key]]))
  if(preset?.layout&&!patch.layoutPreset)patch.layoutPreset=preset.layout
  if(preset?.header&&!patch.headerPreset)patch.headerPreset=preset.header
  if(preset?.theme&&!patch.templateTheme)patch.templateTheme=preset.theme
  if(preset?.colors&&!patch.templateColors)patch.templateColors=preset.colors
  return {...workspace,pages:{...workspace.pages,[pageId]:{...workspace.pages?.[pageId],...patch}}}
}
