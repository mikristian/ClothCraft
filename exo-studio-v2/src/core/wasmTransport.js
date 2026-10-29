/** Shared download transport only. Callers retain their own ABI validation,
 * initialization promises, retry policy, error reporting and math fallbacks.
 * Return the fetch chain directly so synchronous throws and scheduling retain
 * the same behavior as the original inline fetch(...).then(...) calls.
 */
export function fetchWasmBytes(url, errorPrefix) {
  return fetch(url).then(response => {
    if (!response.ok) throw new Error(errorPrefix + response.status)
    return response.arrayBuffer()
  })
}
