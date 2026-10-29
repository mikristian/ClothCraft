// Node-side adapter for the original standalone GPLv3+ Seamly2D application.
// It runs the real upstream calculator as a separate process; EXO does not
// reimplement or certify Seamly2D geometry or redistribute its source here.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { parseSeamlyConstructionReference } from '../../src/core/seamlyConstructionReference.js'
import { parseSeamlyMeasurements } from '../../src/core/seamlyMeasurements.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const sourceEngine = path.join(ROOT, 'research/oss/pattern-cad/runtime/Seamly2D.app/Contents/MacOS/Seamly2D')
const installedEngine = path.join(os.homedir(), 'Library/Application Support/EXO-ClothCraft-Studio-V2/Tools/Seamly2D.app/Contents/MacOS/Seamly2D')
export const SEAMLY2D_RUNTIME_20261023 = fs.existsSync(sourceEngine) ? sourceEngine : installedEngine
const DEFAULT_OUTPUT = path.join(ROOT, 'research/oss/pattern-cad/runtime/engine-outputs')
const FORMATS = Object.freeze({
  svg: { id: '0', extension: '.svg' },
  'aama-r10': { id: '19', extension: '.dxf' },
  'flat-r10': { id: '10', extension: '.dxf' },
})
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const fail = (code, reason) => ({ ok: false, code, reason, manufacturingApproved: false })

function readInput(file, extension, maxBytes) {
  if (typeof file !== 'string' || !file || !file.toLowerCase().endsWith(extension)) {
    throw new Error(`Expected ${extension} input path`)
  }
  const full = path.resolve(file)
  const stat = fs.lstatSync(full)
  if (!stat.isFile() || stat.size === 0 || stat.size > maxBytes) throw new Error(`Invalid or oversized ${extension} input`)
  return { full, bytes: fs.readFileSync(full) }
}

function validateArtifact(buffer, format) {
  if (!buffer.length || buffer.length > 32 * 1024 * 1024) return false
  const sample = buffer.toString('utf8')
  if (format === 'svg') return /<svg\b/.test(sample) && /<(?:path|polyline|polygon|rect)\b/.test(sample)
  return /(?:^|\n)SECTION\s*\n\s*2\s*\nENTITIES\b/.test(sample) &&
    /(?:^|\n)EOF\s*$/.test(sample.trimEnd()) &&
    /(?:^|\n)(?:POLYLINE|LWPOLYLINE|SPLINE|LINE|ARC)\s*\n/.test(sample)
}

/**
 * Calculate a real .sm2d pattern with the separate Seamly2D executable.
 * The source files are copied before execution because Seamly2D may lock or
 * rewrite working files. Output is an isolated new folder for each invocation.
 *
 * Returns preview/exchange artifacts only; no factory acceptance inferred.
 */
export function evaluateSeamly2DPattern20261023({
  patternPath, measurementsPath, format = 'svg', sizeCm, heightCm,
  executablePath = SEAMLY2D_RUNTIME_20261023, outputRoot = DEFAULT_OUTPUT,
} = {}, { spawn = spawnSync } = {}) {
  let scratch
  try {
    if (!Object.hasOwn(FORMATS, format)) return fail('INVALID_FORMAT', 'Supported formats: svg, aama-r10, flat-r10')
    if (typeof measurementsPath !== 'string' || !/\.(smis|smms)$/i.test(measurementsPath)) {
      return fail('MEASUREMENTS_REQUIRED', 'Supply an explicit SeamlyMe .smis or .smms measurement file')
    }
    const dimensions = [['sizeCm', sizeCm, 20, 100], ['heightCm', heightCm, 50, 250]]
    for (const [name, value, min, max] of dimensions) {
      if (value !== undefined && (!Number.isInteger(value) || value < min || value > max)) {
        return fail('INVALID_GRADATION', `${name} must be an integer from ${min} to ${max}`)
      }
    }
    if (typeof executablePath !== 'string' || !path.isAbsolute(executablePath)) {
      return fail('ENGINE_UNAVAILABLE', 'Standalone Seamly2D executable must have an absolute path')
    }
    try { fs.accessSync(executablePath, fs.constants.X_OK) }
    catch { return fail('ENGINE_UNAVAILABLE', 'Install the original Seamly2D application first') }
    const pattern = readInput(patternPath, '.sm2d', 4 * 1024 * 1024)
    const measurement = readInput(measurementsPath, path.extname(measurementsPath).toLowerCase(), 2 * 1024 * 1024)
    const source = parseSeamlyConstructionReference(pattern.bytes.toString('utf8'))
    const measures = parseSeamlyMeasurements(measurement.bytes.toString('utf8'))
    if (sizeCm !== undefined || heightCm !== undefined) {
      if (measures.kind !== 'smms') return fail('GRADATION_REQUIRES_SMMS', 'Size/height selection requires multisize .smms measurements')
    }
    if (typeof outputRoot !== 'string' || !path.isAbsolute(outputRoot)) {
      return fail('INVALID_OUTPUT_ROOT', 'Output directory must be an absolute path')
    }
    fs.mkdirSync(outputRoot, { recursive: true })
    scratch = fs.mkdtempSync(path.join(outputRoot, 'seamly-engine-'))
    const sourceDir = path.join(scratch, 'input')
    const exportsDir = path.join(scratch, 'export')
    fs.mkdirSync(sourceDir)
    fs.mkdirSync(exportsDir)
    const input = path.join(sourceDir, 'input.sm2d')
    const measurementInput = path.join(sourceDir, `measurements.${measures.kind}`)
    fs.writeFileSync(input, pattern.bytes, { flag: 'wx' })
    fs.writeFileSync(measurementInput, measurement.bytes, { flag: 'wx' })
    const fmt = FORMATS[format]
    const args = [
      '--basename', 'exo-seamly-evaluated',
      '--destination', exportsDir,
      '--format', fmt.id,
      '--exportOnlyDetails',
      '--mfile', measurementInput,
      ...(sizeCm !== undefined ? ['--gsize', String(sizeCm)] : []),
      ...(heightCm !== undefined ? ['--gheight', String(heightCm)] : []),
      input,
    ]
    const run = spawn(executablePath, args, {
      cwd: sourceDir, encoding: 'utf8', timeout: 60000, maxBuffer: 512 * 1024,
      windowsHide: true,
    })
    if (run.error || run.status !== 0) throw new Error(`Seamly2D calculation failed (${run.error?.code ?? run.status ?? 'unknown'}): ${String(run.stderr || run.error?.message || '').slice(-800)}`)
    const files = fs.readdirSync(exportsDir).filter(name =>
      name.startsWith('exo-seamly-evaluated') && name.endsWith(fmt.extension))
    if (files.length === 0 || files.length > 40) throw new Error('Seamly2D returned no usable pattern output')
    const artifacts = files.sort().map(name => {
      const filename = path.join(exportsDir, name)
      const stat = fs.lstatSync(filename)
      if (!stat.isFile() || stat.size > 32 * 1024 * 1024) throw new Error('Invalid Seamly2D artifact')
      const bytes = fs.readFileSync(filename)
      if (!validateArtifact(bytes, format)) throw new Error('Seamly2D artifact has no verified drawing entities')
      return { filename, name, sizeBytes: bytes.length, sha256: hash(bytes) }
    })
    return {
      ok: true, engine: 'Seamly2D', calculation: 'upstream-executable', format,
      patterns: source.blocks.length, constructionTools: source.toolCount,
      inputSha256: hash(pattern.bytes), measurementsSha256: hash(measurement.bytes),
      sizeCm: sizeCm ?? null, heightCm: heightCm ?? null, artifacts,
      outputDirectory: exportsDir, manufacturingApproved: false,
      qualification: 'Unapproved technical pattern output: verify scale, sewlines, grading, cutline semantics, receiver CAD and physical sample.',
    }
  } catch (error) {
    // Only scratch folders made by this invocation can be removed.
    if (scratch) { try { fs.rmSync(scratch, { recursive: true, force: true }) } catch {} }
    return fail('ENGINE_EVALUATION_FAILED', error instanceof Error ? error.message : String(error))
  }
}

/** Produce an independently evaluated, hash-indexed size run with real Seamly2D grading. */
export function evaluateSeamly2DSizeRun20261023({ sizesCm, ...config } = {}, dependencies) {
  if (!Array.isArray(sizesCm) || sizesCm.length < 2 || sizesCm.length > 12 ||
      sizesCm.some(size => !Number.isInteger(size) || size < 20 || size > 100) ||
      new Set(sizesCm).size !== sizesCm.length) {
    return fail('INVALID_SIZE_RUN', 'Size run requires 2–12 distinct integer sizes, 20–100 cm')
  }
  if (typeof config.measurementsPath !== 'string' || !/\.smms$/i.test(config.measurementsPath)) {
    return fail('GRADATION_REQUIRES_SMMS', 'Graded size runs require multisize .smms measurements')
  }
  const outputRoot = config.outputRoot ?? DEFAULT_OUTPUT
  let runDirectory
  try {
    if (typeof outputRoot !== 'string' || !path.isAbsolute(outputRoot)) return fail('INVALID_OUTPUT_ROOT', 'Output directory must be absolute')
    fs.mkdirSync(outputRoot, { recursive: true })
    runDirectory = fs.mkdtempSync(path.join(outputRoot, 'seamly-size-run-'))
    const results = []
    for (const sizeCm of sizesCm) {
      const result = evaluateSeamly2DPattern20261023({ ...config, sizeCm, outputRoot: runDirectory }, dependencies)
      if (!result.ok) throw new Error(`Size ${sizeCm} refused: ${result.reason}`)
      results.push(result)
    }
    if (new Set(results.map(result => result.artifacts.map(item => item.sha256).join(','))).size !== results.length) {
      throw new Error('Two sizes produced identical drawings; graded geometry is unverified')
    }
    const manifest = {
      format: 'exo-seamly-upstream-graded-export.v1',
      engine: 'Seamly2D', calculation: 'upstream-executable',
      sizeUnit: 'cm', sizesCm: [...sizesCm], heightCm: config.heightCm ?? null,
      patternSha256: results[0].inputSha256,
      measurementsSha256: results[0].measurementsSha256,
      results: results.map(result => ({ sizeCm: result.sizeCm, format: result.format, artifacts: result.artifacts })),
      manufacturingApproved: false,
      qualification: 'Independent receiving CAD round-trip and physical garment sample still required.',
    }
    const manifestPath = path.join(runDirectory, 'seamly-evaluated-manifest.json')
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), { flag: 'wx' })
    return { ok: true, sizesCm: [...sizesCm], manifestPath, runDirectory, results, manufacturingApproved: false }
  } catch (error) {
    if (runDirectory) { try { fs.rmSync(runDirectory, { recursive: true, force: true }) } catch {} }
    return fail('GRADED_EVALUATION_FAILED', error instanceof Error ? error.message : String(error))
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  const config = {}
  const aliases = { '--pattern': 'patternPath', '--measurements': 'measurementsPath',
    '--format': 'format', '--size': 'sizeCm', '--height': 'heightCm',
    '--binary': 'executablePath', '--output': 'outputRoot', '--sizes': 'sizesCm' }
  for (let i = 0; i < args.length; i += 2) {
    if (!Object.hasOwn(aliases, args[i]) || typeof args[i+1] !== 'string') {
      console.error('Usage: node integrations/clothcraft/seamly2dNativeEngine20261023.mjs --pattern PATH --measurements PATH [--format svg|aama-r10|flat-r10] [--size CM --height CM] [--output ABSOLUTE_DIR]')
      process.exitCode = 2
      break
    }
    config[aliases[args[i]]] = ['--size','--height'].includes(args[i]) ? Number(args[i+1]) :
      args[i] === '--sizes' ? args[i+1].split(',').map(Number) : args[i+1]
  }
  if (!process.exitCode) {
    const result = config.sizesCm ? evaluateSeamly2DSizeRun20261023(config) : evaluateSeamly2DPattern20261023(config)
    console.log(JSON.stringify(result, null, 2))
    if (!result.ok) process.exitCode = 1
  }
}
