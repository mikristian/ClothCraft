import test from 'node:test'
import assert from 'node:assert/strict'
import {assetInFolder,assetFolderDefault,TECHPACK_ASSET_FOLDERS}from './techPackAssetFolders.js'

test('grouped folders include garment interior tags and packaging bags and boxes',()=>{
  assert(assetInFolder({category:'brand label'},'inside-tags'))
  assert(assetInFolder({category:'care label'},'inside-tags'))
  assert(assetInFolder({category:'hangtag'},'hangtags'))
  assert(assetInFolder({category:'packaging bag'},'packaging'))
  assert(assetInFolder({category:'packaging box'},'packaging'))
  assert(!assetInFolder({category:'packaging'},'fabrics'))
  assert.equal(assetFolderDefault('graphics'),'graphic')
  assert(TECHPACK_ASSET_FOLDERS.length>=7)
})
