import test from 'node:test'
import assert from 'node:assert/strict'
import {assessNativeWindowRun42} from './qa-exo-native-wkwebview-window-run42-20261029.mjs'
const valid=()=>({processCount:1,
  windowRecords:[{title:'EXO ClothCraft Studio V2',onscreen:true,width:1510,height:900}],
  axRecord:'WEB_AREA|EXO ClothCraft Studio V2|AXWebArea|EXO ClothCraft Studio — Native Rust Garment Workspace|4',
  serverHealth:{ok:true,nativeReady:true,nativeSession:{loaded:true}},
  projectUnchanged:true,signatureVerified:true})
test('native window evidence is read-only and never grants factory or WKWebView click proof',()=>{
  const result=assessNativeWindowRun42(valid())
  assert.equal(result.pass,true)
  assert.equal(result.wkWebViewClicksCertified,false)
  assert.equal(result.didMutateDocument,false)
  assert.equal(result.manufacturingApproved,false)
})
test('missing/hidden/undersized/spoofed native window fails closed',()=>{
  for(const mutate of [
    o=>{o.processCount=0},o=>{o.windowRecords=[]},
    o=>{o.windowRecords[0].title='Safari'},o=>{o.windowRecords[0].onscreen=false},
    o=>{o.windowRecords[0].width=800},o=>{o.windowRecords[0].height=400},
    o=>{o.axRecord='WINDOW_COUNT|0'},o=>{o.axRecord=o.axRecord.replace('AXWebArea','AXGroup')},
    o=>{o.axRecord=o.axRecord.replace('Native Rust Garment Workspace','Static Loading Screen')},
    o=>{o.serverHealth.nativeReady=false},o=>{o.serverHealth.nativeSession.loaded=false},
    o=>{o.signatureVerified=false},o=>{o.projectUnchanged=false},
  ]){
    const candidate=valid();mutate(candidate)
    assert.equal(assessNativeWindowRun42(candidate).pass,false)
  }
})
