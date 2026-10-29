// Development-only diagnostic runner. POSIX process groups are a cleanup mechanism,
// not a CPU, memory, filesystem, or production sandbox.
import { spawn } from 'node:child_process'

export async function runDevelopmentPosixGroup({ command, args = [], timeoutMs = 1000, maxOutputBytes = 4096 } = {}) {
  if (process.platform !== 'darwin' && process.platform !== 'linux') {
    return { ok: false, reason: 'unsupported_platform' }
  }
  if (typeof command !== 'string' || !command || !Array.isArray(args) ||
      args.some(arg => typeof arg !== 'string') ||
      !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 5000 ||
      !Number.isSafeInteger(maxOutputBytes) || maxOutputBytes < 1 || maxOutputBytes > 1048576) {
    return { ok: false, reason: 'invalid_options' }
  }

  return await new Promise(resolve => {
    let child
    try {
      child = spawn(command, args, { detached: true, stdio: ['ignore', 'pipe', 'pipe'] })
    } catch (error) {
      resolve({ ok: false, reason: 'spawn_error', error: error.message })
      return
    }
    let settled = false
    let failure = null
    let outputBytes = 0
    let stdout = ''
    let stderr = ''
    let timer
    let watchdog
    const killOwnedGroup = () => {
      if (Number.isSafeInteger(child.pid) && child.pid > 1) {
        try { process.kill(-child.pid, 'SIGKILL') } catch (error) { if (error.code !== 'ESRCH') failure ??= 'cleanup_error' }
      }
    }
    const fail = reason => {
      failure ??= reason
      killOwnedGroup()
    }
    const finish = (code, signal) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      clearTimeout(watchdog)
      // Also clean descendants when the group leader exits before its children.
      killOwnedGroup()
      resolve({ ok: !failure && code === 0, reason: failure ?? (code === 0 ? 'completed' : 'child_exit'), code, signal, stdout, stderr })
    }
    const collect = (data, stream) => {
      const remaining = maxOutputBytes - outputBytes
      outputBytes += data.length
      if (remaining > 0) {
        const chunk = data.subarray(0, remaining).toString('utf8')
        if (stream === 'stdout') stdout += chunk
        else stderr += chunk
      }
      if (outputBytes > maxOutputBytes) fail('output_limit')
    }
    child.stdout.on('data', data => collect(data, 'stdout'))
    child.stderr.on('data', data => collect(data, 'stderr'))
    child.on('error', error => { failure ??= 'spawn_error'; stderr += error.message })
    child.on('close', finish)
    timer = setTimeout(() => fail('timeout'), timeoutMs)
    // Bounded even if child close never arrives due to inherited stdio.
    watchdog = setTimeout(() => { fail('cleanup_deadline'); finish(null, 'SIGKILL') }, timeoutMs + 1500)
  })
}
