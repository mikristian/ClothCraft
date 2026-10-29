// EXO's native Techpack document lives independently of the separate website
// Digital Tech Pack Studio. All source tables are built from the active editor.
export function nativeTechPackDocument(source,value){
  if(value&&value.kind==='exo-native-techpack-v2'&&value.draft&&typeof value.draft==='object')return value
  return {kind:'exo-native-techpack-v2',version:2,
    draft:{styleName:source?.name||'Garment',brand:'',sku:'',season:'',factory:'',status:'draft',
      pom:{},bom:[],references:[],workspace:{paperSize:'Letter',orientation:'portrait',pages:{},cells:{},extraRows:{},assets:[],pageAssets:{}}},
    samples:[]}
}

export function editNativeTechPackDocument(document,patch){
  return {...document,draft:{...document.draft,...patch}}
}
