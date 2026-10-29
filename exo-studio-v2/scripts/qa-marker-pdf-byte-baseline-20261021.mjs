// Frozen baseline from the pre-RUST-020 live JS writer. In-memory fixtures only.
// Both SVG and PDF must remain byte-for-byte identical after Rust coordinates.
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {createZipHoodieTemplate} from '../src/data/templates.js'
import {buildFabricMarkers} from '../src/core/marker.js'
import {markerToPdf,markerToSvg} from '../src/core/markerArtifacts.js'

const project=createZipHoodieTemplate()
const marker=Object.values(buildFabricMarkers(project))[0]
assert.equal(marker.placements.length,7)
const cases=[
  {input:{marker,size:'L',pageLengthCm:400},
    pdf:'8854f40fd8e4720ac8ccc1e030dc0c2c1f48f1ab8b5d16932480768eb53c5416',
    svg:'8c3c7b15a552e5961a829c95e432ca44d75bd7b1be31c597c569a9d702471c71'},
  {input:{marker:{...marker,length:805},size:'XL',pageLengthCm:400},
    pdf:'a2239380684dfdb753245f02be24a9606469274e1b05b6a35156d784efe002e7',
    svg:'23c7849d752b7e77fdb77832cca537f09701436fcaad7eb36e2d6729fbbba804'},
  {input:{marker,size:'M',pageLengthCm:400,project},
    pdf:'f177d1aca09bff19ec570d916a9f2ba4b6f22cf11d7e87b6d08fb12f1006a508',
    svg:'6121a9052d0e228e9e8c9194d5975438803e01dd9a627098f5667fdbd41fd03d'},
]
const sha=data=>createHash('sha256').update(data).digest('hex')
for(const [index,fixture] of cases.entries()){
  const {input,pdf,svg}=fixture
  assert.equal(sha(markerToPdf(input.marker,input)),pdf,`PDF exact bytes fixture ${index}`)
  assert.equal(sha(markerToSvg(input.marker,input)),svg,`SVG exact bytes fixture ${index}`)
}
// A placement outside the printed page must not have its malformed outline
// inspected; the pre-Rust writer skips it before reading any coordinates.
const offPage={width:150,length:400,placements:[{x:0,y:500,height:10,outline:[null,null,null]}]}
assert.ok(markerToPdf(offPage).length>100,'Off-page malformed outline remains ignored')
console.log(JSON.stringify({pass:true,fixtures:cases.length,exactByteChecks:cases.length*2}))
