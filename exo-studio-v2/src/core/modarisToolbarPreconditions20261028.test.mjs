import test from 'node:test'
import assert from 'node:assert/strict'
import {getModarisExoRoute20261028 as route} from './modarisCustomToolbarRoute20261028.js'
import {checkModarisToolbarPreconditions20261028 as check} from './modarisToolbarPreconditions20261028.js'

const session={name:'Native T-Shirt',busy:false,running:false,canUndo:true,canRedo:true,selection:{panelId:'front'}}
const native={nativeMode:true,full2D:true,session}

test('all tool activation routes fail closed with missing native session',()=>{
  assert.equal(check(null,native).ok,false)
  for(const id of ['modaris:f2:notch','modaris:f4:seam-allowance',
    'modaris:f6:grade-notch','modaris:f3:mirror','modaris:f8:measure-length']){
    const tool=route(id)
    assert.ok(tool,id)
    assert.equal(check(tool,{nativeMode:true,full2D:true,session:null}).ok,false,id)
    assert.equal(check(tool,native).ok,true,id)
  }
})

test('workspace activity and preconditions block stale operations',()=>{
  const notch=route('modaris:f2:notch')
  assert.equal(check(notch,{...native,full2D:false}).ok,false)
  assert.equal(check(notch,{...native,session:{...session,running:true}}).ok,false)
  assert.equal(check(notch,{...native,session:{...session,busy:true}}).ok,false)
  const mirror=route('modaris:f3:mirror')
  assert.equal(check(mirror,{...native,session:{...session,selection:null}}).ok,false)
  assert.equal(check(mirror,native).ok,true)
})

test('native save, undo and redo cannot claim success without capabilities',()=>{
  const undo=route('modaris:menu:undo')
  const redo=route('modaris:menu:redo')
  const save=route('modaris:menu:save')
  assert.equal(check(undo,{...native,session:{...session,canUndo:false}}).ok,false)
  assert.equal(check(redo,{...native,session:{...session,canRedo:false}}).ok,false)
  assert.equal(check(save,{...native,session:{...session,busy:true}}).ok,false)
  assert.equal(check(undo,native).ok,true)
  assert.equal(check(redo,native).ok,true)
  assert.equal(check(save,native).ok,true)
  // Navigational controls do not depend on a native project being loaded.
  assert.equal(check(route('modaris:menu:view-object-browser')).ok,true)
  assert.equal(check(route('modaris:menu:configure-toolbar')).ok,true)
})
