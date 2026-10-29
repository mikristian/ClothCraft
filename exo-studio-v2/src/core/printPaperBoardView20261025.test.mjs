import {test} from 'node:test'
import assert from 'node:assert/strict'
import {fitCompletePrintBoard20261025,getPrintTileGrid20261025} from './printPaperBoardView20261025.js'
import {planPrintPages20261025} from './printLayout20261025.js'

test('full board Fit respects both width and long physical paper height',()=>{
  const zoom=fitCompletePrintBoard20261025({
    widthCm:150,heightCm:250,viewportWidthPx:1000,viewportHeightPx:500,
  })
  assert(zoom>0 && zoom<1)
  assert(zoom*4.2*150<=1000-48+1e-8)
  assert(zoom*4.2*250<=500-72+1e-8)
  assert.equal(fitCompletePrintBoard20261025({widthCm:0,heightCm:50,viewportWidthPx:900,viewportHeightPx:500}),null)
})
test('print tile guides match page setup including margins and print scale',()=>{
  const plan=planPrintPages20261025({widthCm:150,heightCm:220,paper:'A4',scale:100,marginCm:.5})
  const tiles=getPrintTileGrid20261025(plan,150,220)
  assert.equal(tiles.tileWidthCm,20)
  assert.equal(tiles.tileHeightCm,28.7)
  assert.equal(tiles.cols,8)
  assert.equal(tiles.rows,8)
  const scaled=planPrintPages20261025({widthCm:150,heightCm:220,paper:'A4',scale:50,marginCm:.5})
  assert.equal(getPrintTileGrid20261025(scaled,150,220).tileWidthCm,40)
  assert.equal(getPrintTileGrid20261025(null,150,220),null)
})
