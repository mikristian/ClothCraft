import test from 'node:test'
import assert from 'node:assert/strict'
import { CLO_MENUS } from './cloMenus.js'
import { getCloNativeMenuRoute } from './cloNativeMenuBridge.js'

test('2D sewing menu exposes independent native segment, free and edit commands', () => {
  const sewing=CLO_MENUS.find(menu=>menu.title==='Sewing')
  const actions=sewing.commands.map(item=>item[1])
  for(const [action,tool] of [['sewing.segment','segment-sew'],['sewing.free','free-sew'],['sewing.edit','seam-edit']]){
    assert(actions.includes(action),`${action} must be reachable from the Sewing menu`)
    assert.deepEqual(getCloNativeMenuRoute(action),{type:'tool',tool,section:'Sewing'})
  }
})
