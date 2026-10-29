import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluatePpfFitAcceptance } from './fitAcceptance.mjs'

function validReport() {
  return {
    contact: {
      frames: 2, allFramesAvatarIntersectionFree: true,
      allFramesSelfIntersectionFree: true, allFramesWithinStrainLimit: true,
      perFrame: [0, 1].map(frame => ({ frame, avatarTriangleIntersectionPairs: 0,
        clothSelfIntersectionPairs: 0, maxPrincipalStretch: 1.03,
        strainLimitViolatingFaces: 0 })),
    },
    sewing: { framesAnalyzed: 2, stitchedPairs: 8,
      samples: [0, 1].map(frame => ({ frame, meanCm: 0.1, maxCm: 0.5 })),
      finalMeanGapCm: 0.1, finalMaxGapCm: 0.5 },
  }
}

test('complete physically consistent contact and sewing reports pass', () => {
  assert.equal(evaluatePpfFitAcceptance(validReport()).accepted, true)
})

test('invalid contact or seam metrics cannot certify a fitted garment', () => {
  const cases = [
    report => { report.contact.perFrame[0].avatarTriangleIntersectionPairs = -1 },
    report => { report.contact.perFrame[0].clothSelfIntersectionPairs = -1 },
    report => { report.contact.perFrame[0].strainLimitViolatingFaces = -1 },
    report => { report.contact.perFrame[0].maxPrincipalStretch = 1.2 },
    report => { report.sewing.samples[0].meanCm = -0.1 },
    report => { report.sewing.finalMeanGapCm = -0.1; report.sewing.samples[1].meanCm = -0.1 },
    report => { report.sewing.finalMaxGapCm = 0.05; report.sewing.samples[1].maxCm = 0.05 },
  ]
  for (const corrupt of cases) {
    const report = validReport()
    corrupt(report)
    assert.equal(evaluatePpfFitAcceptance(report).accepted, false)
  }
})
