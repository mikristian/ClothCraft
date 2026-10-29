// Development-only byte packaging; does not authorize cutting or manufacturing.
import {zipSync} from 'fflate'
import {buildGuardedFactoryPackageFiles20261023_2159} from './guardedFactoryCutPackage20261023_2159.mjs'

export function buildGuardedFactoryCutZip20261023_2255(project) {
  // The guard must complete for every graded DXF before a ZIP is created.
  const files = buildGuardedFactoryPackageFiles20261023_2159(project)
  const bytes = zipSync(files, {level: 0})
  return {bytes, manufacturingApproved: false, factoryCertified: false}
}
