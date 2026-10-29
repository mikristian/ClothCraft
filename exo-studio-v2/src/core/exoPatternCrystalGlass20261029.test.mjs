import test from 'node:test'
import assert from 'node:assert/strict'
import {resolveExoPatternCrystalSurface20261029 as surface} from './exoPatternCrystalGlass20261029.js'
import {normalizeStudioCustomization} from './studioCustomization.js'
test('2D pattern crystal clear is on by default, including legacy settings',()=>{
 assert.equal(normalizeStudioCustomization({}).appearance.patternClearGlass,true)
 assert.equal(normalizeStudioCustomization({appearance:{theme:'raspberry'}}).appearance.patternClearGlass,true)
 assert.equal(surface({patternClearGlass:true},{twoDPatternSurfaceStyle:'solid'}),'glass')
})
test('crystal toggle is independent from studio theme, solid option and outline mode',()=>{
 assert.equal(surface({patternClearGlass:true},{twoDPatternSurfaceStyle:'outline'}),'outline')
 assert.equal(surface({patternClearGlass:false},{twoDPatternSurfaceStyle:'solid'}),'solid')
 assert.equal(surface({patternClearGlass:false},{twoDPatternSurfaceStyle:'glass'}),'glass')
 assert.equal(normalizeStudioCustomization({appearance:{patternClearGlass:false}}).appearance.patternClearGlass,false)
})
test('transient pattern preview overrides active crystal without writing saved choice',()=>{
 const preferences={twoDPatternSurfaceStyle:'solid'}
 const appearance={patternClearGlass:true}
 assert.equal(surface(appearance,preferences,{surface:'outline'}),'outline')
 assert.equal(surface(appearance,preferences,{surface:'solid'}),'solid')
 assert.equal(surface(appearance,preferences,{surface:'glass'}),'glass')
 assert.equal(surface(appearance,preferences),'glass')
 assert.equal(preferences.twoDPatternSurfaceStyle,'solid')
})
