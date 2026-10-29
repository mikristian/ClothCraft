import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {initializeRustThemeKernel,rustThemeKernelReady,rustThemeResolveColor,rustThemeGlowEnabled,rustThemeNestVisible,rustThemeColorTokens} from './rustThemeKernel.js'
import {rustPomLabelAnchor} from './rustPomKernel.js'

test('shipped native Rust UI WASM governs customizable colors, glow and full 2D nest',async()=>{
  assert.equal(rustThemeKernelReady(),false)
  assert.equal(rustThemeResolveColor('#123456','#ffffff'),null)
  assert.equal(rustThemeGlowEnabled(true),false)
  const bytes=readFileSync(new URL('../../public/wasm/exo_ui_kernel.wasm',import.meta.url))
  assert.equal(await initializeRustThemeKernel({bytes}),true)
  assert.equal(rustThemeKernelReady(),true)
  assert.equal(rustThemeResolveColor('#12aBCd','#eeeeee'),'#12abcd')
  assert.equal(rustThemeResolveColor('auto','#778899'),'#778899')
  assert.equal(rustThemeResolveColor('red','#778899'),'#778899')
  assert.equal(rustThemeResolveColor('#12345Z','#778899'),'#778899')
  assert.equal(rustThemeResolveColor('url(x)','#778899'),'#778899')
  assert.equal(rustThemeResolveColor('#000000','#ffffff'),'#000000')
  assert.equal(rustThemeGlowEnabled(true),true)
  assert.equal(rustThemeGlowEnabled(false),false)
  assert.equal(rustThemeGlowEnabled('yes'),false)
  assert.equal(rustThemeNestVisible({isTwoD:true,fullWorkspace:true}),true)
  assert.equal(rustThemeNestVisible({isTwoD:true,nativeTwoD:true}),true)
  assert.equal(rustThemeNestVisible({isTwoD:true,fullWorkspace:false,nativeTwoD:false}),false)
  assert.equal(rustThemeNestVisible({isTwoD:false,fullWorkspace:true,nativeTwoD:true}),false)
  const tokens=rustThemeColorTokens({globalToolbarIconColor:'#3366AA',twoDToolbarIconColor:'auto',twoDToolbarGlassColor:'#abcdef'},
    {twoDPointColor:'#00aa11',twoDRulerMarkColor:'#1100AA',twoDCanvasColor:'#123456',twoDGridColor:'#ABCDEF'},'#ddeeff')
  assert.equal(tokens['--exo-ui-icon-ink'],'#3366aa')
  assert.equal(tokens['--exo-2d-toolbar-ink'],'#3366aa')
  assert.equal(tokens['--exo-2d-toolbar-glass'],'#abcdef')
  assert.equal(tokens['--exo-2d-point-color'],'#00aa11')
  assert.equal(tokens['--exo-2d-ruler-mark-color'],'#1100aa')
  assert.equal(tokens['--exo-2d-pattern-color'],'#f4f4f3')
  assert.equal(tokens['--exo-2d-canvas-color'],'#123456')
  assert.equal(tokens['--exo-2d-grid-color'],'#abcdef')
  const chrome=rustThemeColorTokens({twoDViewerHorizontalColor:'#123abc',twoDViewerVerticalColor:'#cdef12',threeDViewerHorizontalColor:'#ab1299',panelLibraryColor:'#101010'}, {},'#ededed')
  assert.equal(chrome['--exo-2d-horizontal-ink'],'#123abc')
  assert.equal(chrome['--exo-2d-vertical-ink'],'#cdef12')
  assert.equal(chrome['--exo-3d-horizontal-ink'],'#ab1299')
  assert.equal(chrome['--exo-library-panel-color'],'#101010')
  assert.equal(rustThemeColorTokens({interfaceInkColor:'#fedcba'},{},'#aabbcc')['--exo-interface-ink'],'#fedcba')
  assert.deepEqual(rustPomLabelAnchor({x:0,y:10},{x:20,y:10},{normalOffset:2,dx:3,dy:-1}),{x:13,y:7},'theme ABI preserves prior Rust POM API')
})
