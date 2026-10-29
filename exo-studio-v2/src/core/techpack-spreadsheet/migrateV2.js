import {createTableV3} from './schemaV3.js'

// Non-destructive migration: the original workspace is never modified.
export function migrateWorkspaceTablesV2(workspace={}){
  const tables=[]
  for(const [pageId,pageTables] of Object.entries(workspace.tables||{})){
    if(!Array.isArray(pageTables))continue
    for(const table of pageTables){
      if(!table||typeof table!=='object')continue
      tables.push(createTableV3({id:table.id,title:table.title,pageId,columns:(table.headers||[]).map((label,i)=>({id:`column-${i}`,label})),rows:table.rows||[]}))
    }
  }
  for(const [pageId,pageBoxes] of Object.entries(workspace.pageBoxes||{})){
    if(!Array.isArray(pageBoxes))continue
    for(const box of pageBoxes){
      const slot=box?.slot
      if(!slot||typeof slot!=='object'||(slot.category!=='tables'&&!Array.isArray(slot.headers)))continue
      tables.push(createTableV3({id:`box-table-${box.id}`,title:slot.title||box.title,pageId,boxId:box.id,columns:(slot.headers||[]).map((label,i)=>({id:`column-${i}`,label})),rows:slot.rows||[]}))
    }
  }
  return tables
}

export function migrateV2Workspace(workspace={}){
  return {...workspace,spreadsheetV3:{version:3,tables:migrateWorkspaceTablesV2(workspace)}}
}
