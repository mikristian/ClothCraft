import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import {assertNativeAvatarPersistence} from './avatarPersistenceContract.mjs'

test('native V2 collision avatar survives save and JSON reopen with exact solver body identity',()=>{
  for (const model of ['makehuman-base','clo-thomas']) {
    const avatarPath=path.resolve('/tmp/native-avatar-test',`${model}.obj`)
    const project={version:1,template:{panels:[]},avatar_path:avatarPath}
    const reopened=JSON.parse(JSON.stringify(assertNativeAvatarPersistence(project,avatarPath)))
    assert.equal(reopened.avatar_path,avatarPath)
    assert.equal(assertNativeAvatarPersistence(reopened,avatarPath),reopened)
  }
})

test('native V2 rejects stale or missing avatar body before overwriting the serialized project',()=>{
  const thomas='/tmp/native-avatar-test/clo-thomas.obj'
  const previous='/tmp/native-avatar-test/makehuman-base.obj'
  for (const invalid of [null,{}, {avatar_path:''},{avatar_path:previous},{avatar_path:'relative/body.obj'}]) {
    assert.throws(()=>assertNativeAvatarPersistence(invalid,thomas),/collision body mismatch/)
  }
})
