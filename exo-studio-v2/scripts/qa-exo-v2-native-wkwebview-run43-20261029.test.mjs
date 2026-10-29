import test from 'node:test'
import assert from 'node:assert/strict'
import {assessRun43Receipt} from './qa-exo-v2-native-wkwebview-run43-20261029.mjs'
const good=()=>({schema:'exo.run43.native-wkwebview-qa.v1',pass:true,
 source:'isolated-macos-wkwebview',origin:'http://127.0.0.1:5486',
 actualWKWebViewDOMInteraction:true,libraryOpened:true,libraryClosed:true,libraryRestored:true,
 nativeToolbarUndoPresent:true,nativeToolbarRedoPresent:true,panels:5,canvases:2,
 physicalMouseOrKeyboardVerified:false,factoryApproved:false,errors:[]})
test('correct QA-only native WKWebView DOM receipt validates without industrial overclaim',()=>{
  assert.equal(assessRun43Receipt(good(),'sha-a','sha-a').pass,true)
  assert.equal(assessRun43Receipt(good(),'sha-a','sha-a').manufacturingApproved,false)
})
test('native receipt checks block wrong origin, no toolbar, forged pass and changed garment',()=>{
  const cases=[
    x=>{x.pass=false},x=>{x.schema='wrong'},x=>{x.origin='http://127.0.0.1:5386'},
    x=>{x.source='chromium'},x=>{x.libraryOpened=false},
    x=>{x.libraryRestored=false},
    x=>{x.libraryClosed=false},x=>{x.actualWKWebViewDOMInteraction=false},
    x=>{x.nativeToolbarUndoPresent=false},x=>{x.nativeToolbarRedoPresent=false},
    x=>{x.panels=0},x=>{x.canvases=0},x=>{x.factoryApproved=true},
    x=>{x.physicalMouseOrKeyboardVerified=true},x=>{x.errors=['JS error']},
  ]
  for(const mutate of cases){const x=good();mutate(x)
    assert.equal(assessRun43Receipt(x,'sha-a','sha-a').pass,false)}
  assert.equal(assessRun43Receipt(good(),'sha-a','sha-b').pass,false)
})
