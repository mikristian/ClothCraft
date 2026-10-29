// Development-only PDF verifier research helper. RSS sampling is observational:
// /bin/ps polls can miss transient peaks between samples and races with child exit.
// This is NOT an OS-enforced memory limit or a manufacturing acceptance control.
// The existing spawnSync PDF parity verifier does not invoke this async prototype;
// integration requires an explicit caller refactor and separate validation.
// Caller-provided command allowlists and sampleRssKb test seam are NOT
// independently authenticated. NEVER pass untrusted options to this prototype.
import { spawn, spawnSync } from 'node:child_process'

const MAX_INPUT = 64 * 1024
const MAX_OUTPUT = 8 * 1024
const MAX_TIMEOUT = 10_000
const MAX_RSS_KB = 100 * 1024

const reject = reason => ({ accepted: false, reason })
const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key)

function sampleProcessRssKb(pid) {
  const ps = spawnSync('/bin/ps', ['-o', 'rss=', '-p', String(pid)], {
    shell: false, encoding: 'utf8', timeout: 500, maxBuffer: 1024,
  })
  if (ps.error || ps.status !== 0 || !/^\s*\d+\s*$/.test(ps.stdout ?? '')) {
    throw new Error('RSS sample failed')
  }
  return Number(ps.stdout.trim())
}

function validResult(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).sort().join(',') === 'candidateDrawings,candidateItems,drawings,items,ok,pages' &&
    own(value, 'ok') && value.ok === true &&
    Number.isSafeInteger(value.pages) && value.pages > 0 &&
    ['drawings', 'items', 'candidateDrawings', 'candidateItems'].every(k =>
      own(value, k) && Number.isSafeInteger(value[k]) && value[k] >= 0)
}

// Exact bounded JSON subset: six literal names, unescaped keys, integer/boolean
// scalar values, arbitrary key order and JSON whitespace. No duplicate names,
// unknown names, escape sequences, alternate numeric syntax, or trailing data.
function parseStrictVerifierOutput(source) {
  const names = new Set(['ok', 'pages', 'drawings', 'items', 'candidateDrawings', 'candidateItems'])
  let at = 0
  const ws = () => { while (at < source.length && /[ \t\r\n]/.test(source[at])) at++ }
  const take = char => { ws(); if (source[at] !== char) throw Error('invalid grammar'); at++ }
  const data = Object.create(null)
  take('{')
  for (let index = 0; index < 6; index++) {
    if (index) take(',')
    ws()
    const key = /^"(ok|pages|drawings|items|candidateDrawings|candidateItems)"/.exec(source.slice(at))
    if (!key || !names.has(key[1]) || own(data, key[1])) throw Error('duplicate or invalid key')
    at += key[0].length
    take(':')
    ws()
    if (key[1] === 'ok') {
      if (source.slice(at, at + 4) !== 'true') throw Error('invalid boolean')
      data.ok = true
      at += 4
    } else {
      const number = /^(0|[1-9][0-9]*)/.exec(source.slice(at))
      if (!number) throw Error('invalid integer')
      data[key[1]] = Number(number[0])
      at += number[0].length
    }
  }
  take('}')
  ws()
  if (at !== source.length || !validResult(data)) throw Error('invalid result')
  return data
}

/**
 * Development-only observer. The trusted caller MUST supply an independently
 * fixed executable/argument allowlist; user-provided commands must not populate it.
 * Return is always fail-closed if any sample fails or the child exits before a
 * successful sample. No process group signals or PID enumeration are used.
 */
export async function runPdfRssWatchdog({
  command, args, allowedCommand, allowedArgs, input = '',
  timeoutMs = 1500, sampleIntervalMs = 25, rssLimitKb = 64 * 1024,
  // Test seam only: trusted callers must leave this at its default.
  sampleRssKb = sampleProcessRssKb,
} = {}) {
  if (typeof command !== 'string' || !command.startsWith('/') ||
      typeof allowedCommand !== 'string' || command !== allowedCommand ||
      !Array.isArray(args) || !Array.isArray(allowedArgs) ||
      args.length !== allowedArgs.length ||
      !args.every((arg, i) => typeof arg === 'string' && arg === allowedArgs[i]) ||
      typeof input !== 'string' || Buffer.byteLength(input) > MAX_INPUT ||
      !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > MAX_TIMEOUT ||
      !Number.isSafeInteger(sampleIntervalMs) || sampleIntervalMs < 5 || sampleIntervalMs > 250 ||
      !Number.isSafeInteger(rssLimitKb) || rssLimitKb < 1 || rssLimitKb > MAX_RSS_KB ||
      typeof sampleRssKb !== 'function') {
    return reject('invalid input')
  }

  return new Promise(resolve => {
    let child
    try {
      child = spawn(command, args, {
        shell: false, stdio: ['pipe', 'pipe', 'pipe'], detached: false,
        env: { PATH: '/usr/bin:/bin', PYTHONDONTWRITEBYTECODE: '1' },
      })
    } catch {
      resolve(reject('child error'))
      return
    }
    let settled = false
    let sampled = false
    let stdout = Buffer.alloc(0)
    let outputBytes = 0
    let timer
    let interval
    const finish = (reason, data) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      clearInterval(interval)
      if (reason && child.pid && child.exitCode === null && child.signalCode === null) {
        try { child.kill('SIGKILL') } catch { /* exit race */ }
      }
      resolve(reason ? reject(reason) : { accepted: true, data })
    }
    const sample = () => {
      if (settled || !child.pid) return
      let rss
      try { rss = sampleRssKb(child.pid) } catch { finish('RSS sample failure'); return }
      if (!Number.isSafeInteger(rss) || rss <= 0) { finish('RSS sample failure'); return }
      sampled = true
      if (rss > rssLimitKb) finish('RSS threshold exceeded')
    }
    child.once('error', () => finish('child error'))
    child.stdout.on('data', chunk => {
      outputBytes += chunk.length
      if (outputBytes > MAX_OUTPUT) { finish('oversized output'); return }
      stdout = Buffer.concat([stdout, chunk])
    })
    child.stderr.on('data', chunk => {
      outputBytes += chunk.length
      if (outputBytes > MAX_OUTPUT) finish('oversized output')
    })
    child.once('close', (code, signal) => {
      if (settled) return
      if (signal || code !== 0) { finish('nonzero exit'); return }
      if (!sampled) { finish('RSS sample failure'); return }
      let data
      try { data = parseStrictVerifierOutput(stdout.toString('utf8')) } catch { finish('invalid JSON output'); return }
      finish(null, data)
    })
    child.stdin.on('error', () => { if (!settled) finish('child error') })
    timer = setTimeout(() => finish('timeout'), timeoutMs)
    interval = setInterval(sample, sampleIntervalMs)
    sample()
    if (!settled) child.stdin.end(input)
  })
}
