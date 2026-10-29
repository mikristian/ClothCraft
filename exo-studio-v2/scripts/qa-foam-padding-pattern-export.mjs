import assert from 'node:assert/strict'
import {exportFoamPaddingSvg} from '../src/core/foamPaddingPatternExport.js'

const sample={name:'Armor <Pad> & test',points:[{x:-5,y:-4},{x:5,y:-4},{x:5,y:4},{x:-5,y:4}],widthCm:12,heightCm:9,depthCm:1.5,edgeWidthCm:.8,mode:'sandwich'}
const svg=exportFoamPaddingSvg(sample)
assert.match(svg,/width="16cm" height="13cm"/)
assert.match(svg,/Armor &lt;Pad&gt; &amp; test/)
assert.match(svg,/id="foam-cut-line"/)
assert.match(svg,/id="foam-stitch-guides"/)
assert.match(svg,/id="calibration"/)
assert.match(svg,/width="1" height="1"/)
assert.match(svg,/NOT FACTORY CERTIFIED/)
assert.throws(()=>exportFoamPaddingSvg({...sample,points:[{x:0,y:0},{x:1,y:1},{x:0,y:1},{x:1,y:0}]}))
assert.throws(()=>exportFoamPaddingSvg({...sample,widthCm:-2}))
console.log('Foam PDF/techpack vector handoff: cut and stitch SVG pass')
