// A browser image's decode/resize can finish AFTER the operator switches
// garments or imports a replacement photo. Never apply the old image or its
// error to the now-active document. No DOM or storage dependency.
export function createReferenceImageImportGate20261029(initialDocumentKey) {
  let documentKey = initialDocumentKey
  let epoch = 0
  return {
    setDocumentKey(next) {
      if (next !== documentKey) {
        documentKey = next
        epoch++
      }
    },
    begin() { return {documentKey, epoch: ++epoch} },
    isCurrent(ticket) {
      return ticket !== null && typeof ticket === 'object' &&
        ticket.documentKey === documentKey && ticket.epoch === epoch
    },
    invalidate() { epoch++ },
  }
}
