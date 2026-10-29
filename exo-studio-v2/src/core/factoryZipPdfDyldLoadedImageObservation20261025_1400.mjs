// DEVELOPMENT-ONLY untrusted runtime observation; never authorization or authentication.
import { spawnSync } from 'node:child_process'
import { lstatSync, realpathSync } from 'node:fs'
import { posix } from 'node:path'
import { types } from 'node:util'

const PYTHON = '/usr/bin/python3'
const KEYS = ['packageRoot', 'moduleName', 'allowUntrustedPathInjection']
const MAX_IMAGES = 4096
const SCRIPT = String.raw`
import ctypes,json,os,sys
root=sys.argv[1]
sys.path.insert(0,os.path.dirname(root)) # Explicit UNTRUSTED test-only opt-in
import fitz
document=fitz.open()
document.new_page()
document.close()
dyld=ctypes.CDLL(None)
dyld._dyld_image_count.argtypes=[]
dyld._dyld_image_count.restype=ctypes.c_uint32
dyld._dyld_get_image_name.argtypes=[ctypes.c_uint32]
dyld._dyld_get_image_name.restype=ctypes.c_char_p
count=dyld._dyld_image_count()
if count>4096: raise RuntimeError("IMAGE_COUNT_LIMIT")
images=[]
for index in range(count):
    name=dyld._dyld_get_image_name(index)
    if name is None: raise RuntimeError("NULL_IMAGE_NAME")
    images.append(os.fsdecode(name))
print(json.dumps({"images":images,"modulePath":fitz.__file__},separators=(",",":")))
`

function fail(code) { throw Error(code) }
function optionsOf(value) {
  if (!value || typeof value !== 'object' || types.isProxy(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail('UNSAFE_OPTIONS')
  const d = Object.getOwnPropertyDescriptors(value)
  const keys = Reflect.ownKeys(d)
  if (keys.some(k => typeof k !== 'string' || !KEYS.includes(k) ||
      !Object.hasOwn(d[k], 'value')) || !Object.hasOwn(d, 'packageRoot')) fail('UNSAFE_OPTIONS')
  if (d.moduleName !== undefined && d.moduleName.value !== 'fitz') fail('UNSUPPORTED_MODULE')
  if (d.allowUntrustedPathInjection?.value !== true) fail('UNTRUSTED_OPT_IN_REQUIRED')
  return d.packageRoot.value
}

function canonicalDirectory(path) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.length > 2048 ||
      path === '/' || path.endsWith('/') || path.includes('//') ||
      /[\\\x00-\x1f\x7f]/.test(path) ||
      path.split('/').some(x => x === '.' || x === '..')) fail('UNSAFE_PATH')
  let current = '/'
  for (const part of path.slice(1).split('/')) {
    current = posix.join(current, part)
    const stat = lstatSync(current)
    if (stat.isSymbolicLink() || !stat.isDirectory()) fail('UNSAFE_PATH_COMPONENT')
  }
  if (realpathSync.native(path) !== path) fail('NONCANONICAL_ROOT')
  return path
}

function inside(path, root) { return path === root || path.startsWith(root + '/') }

function canonicalModuleFile(path, root, shimRoot) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.length > 4096 ||
      path.endsWith('/') || path.includes('//') || /[\\\x00-\x1f\x7f]/.test(path) ||
      path.split('/').some(part => part === '.' || part === '..')) fail('UNSAFE_MODULE_PATH')
  if (!inside(path, root) && !inside(path, shimRoot)) fail('EXTERNAL_PACKAGE_MODULE')
  let current = '/'
  for (const part of path.slice(1).split('/')) {
    current = posix.join(current, part)
    let stat
    try { stat = lstatSync(current) } catch { fail('INVALID_MODULE_FILE') }
    if (stat.isSymbolicLink()) fail('SYMLINK_MODULE_PATH')
    if (current === path ? !stat.isFile() : !stat.isDirectory()) fail('INVALID_MODULE_FILE')
  }
  if (realpathSync.native(path) !== path) fail('NONCANONICAL_MODULE_FILE')
  return path
}

export function observeDyldLoadedPyMuPDFImages(options) {
  const root = canonicalDirectory(optionsOf(options))
  if (posix.basename(root) !== 'pymupdf') fail('EXPECTED_PYMUPDF_ROOT')
  if (process.platform !== 'darwin') fail('MACOS_ONLY')
  const processResult = spawnSync(PYTHON, ['-I', '-c', SCRIPT, root], {
    encoding: 'utf8', timeout: 8000, maxBuffer: 256 * 1024,
    env: { PATH: '/usr/bin:/bin', PYTHONNOUSERSITE: '1' }, cwd: '/',
    windowsHide: true
  })
  if (processResult.error || processResult.signal || processResult.status !== 0) fail('OBSERVATION_FAILED')
  let payload
  try { payload = JSON.parse(processResult.stdout) } catch { fail('MALFORMED_OBSERVATION') }
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.images) ||
      payload.images.length > MAX_IMAGES || !payload.images.length ||
      typeof payload.modulePath !== 'string') fail('MALFORMED_OBSERVATION')
  const shimRoot = posix.join(posix.dirname(root), 'fitz')
  canonicalModuleFile(payload.modulePath, root, shimRoot)
  const images = []
  const packageImages = []
  const seen = new Set()
  for (const name of payload.images) {
    if (typeof name !== 'string' || !name.startsWith('/') ||
        name.length > 4096 || /[\x00-\x1f\x7f]/.test(name) ||
        name.split('/').some(s => s === '..' || s === '.') || name.includes('//') ||
        seen.has(name)) fail('INVALID_IMAGE_PATH')
    seen.add(name)
    images.push(name)
    if (inside(name, root)) {
      if (!/\.(so|dylib)$/.test(name)) fail('UNEXPECTED_PACKAGE_IMAGE')
      if (realpathSync.native(name) !== name) fail('NONCANONICAL_PACKAGE_IMAGE')
      packageImages.push(name)
    } else if (name.toLowerCase().includes('/fitz/') ||
               name.toLowerCase().includes('/pymupdf/')) fail('EXTERNAL_PACKAGE_IMAGE')
  }
  if (!packageImages.length) fail('NO_PACKAGE_NATIVE_IMAGES')
  return Object.freeze({
    observed: true, expectedPackageRoot: root, modulePath: payload.modulePath,
    packageImages: Object.freeze(packageImages), allImages: Object.freeze(images),
    imageCount: images.length, untrustedTestPathInjection: true,
    manufacturingApproved: false, runtimeExecutionAuthorized: false,
    publisherAuthenticated: false, atomicLoaderBindingProven: false
  })
}
