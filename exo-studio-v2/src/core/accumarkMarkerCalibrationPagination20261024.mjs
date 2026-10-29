// Pure, deterministic, true-size marker pagination in centimeters.
// Reserve at least 3 cm on every calibrated page for the 100 mm ruler.
export function planCalibratedMarkerPdfPages20261024(lengthCm, pageLengthCm = 400, { calibration = false } = {}) {
  if (typeof lengthCm !== 'number' || !Number.isFinite(lengthCm) || lengthCm <= 0 ||
      typeof pageLengthCm !== 'number' || !Number.isFinite(pageLengthCm) || pageLengthCm <= 0 ||
      typeof calibration !== 'boolean' || (calibration && lengthCm < 3)) {
    throw new RangeError('Invalid marker PDF pagination input')
  }

  const maximum = Math.max(10, Math.min(400, pageLengthCm))
  const count = Math.ceil(lengthCm / maximum)
  if (!Number.isSafeInteger(count) || count < 1 || (calibration && count * 3 > lengthCm)) {
    throw new RangeError('Marker PDF page count exceeds supported range')
  }

  const pages = []
  let startCm = 0
  for (let index = 0; index < count; index += 1) {
    const remaining = lengthCm - startCm
    const remainingPages = count - index
    // When a final calibrated slice would be under 3 cm, borrow just enough
    // from its predecessor. Otherwise retain ordinary maximum-length cuts.
    let heightCm = index === count - 1 ? remaining : Math.min(maximum, remaining)
    if (calibration && remainingPages === 2 && remaining - heightCm < 3) {
      heightCm = remaining - 3
      // Subtracting large fractional coordinates can round the final span
      // slightly below 3, which would suppress the PDF calibration ruler.
      if (lengthCm - (startCm + heightCm) < 3) heightCm -= 1e-10
    }
    const endCm = index === count - 1 ? lengthCm : startCm + heightCm
    heightCm = endCm - startCm
    if (!(heightCm > 0) || heightCm > maximum + 1e-9 ||
        (calibration && heightCm < 3)) {
      throw new RangeError('Cannot fit calibrated marker PDF pages')
    }
    pages.push({ startCm, endCm, heightCm })
    startCm = endCm
  }
  return pages
}
