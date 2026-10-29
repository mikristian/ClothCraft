// Development-only evidence check. Caller must independently pin the trust anchor.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { verifyPdfReferenceProvenance } from './factoryZipPdfReferenceProvenance20261024_2100.mjs';

const CHECKER = fileURLToPath(new URL('./factoryZipPdfTrustedVectorParity20261024_1956.py', import.meta.url));
const MAX_PDF = 1_400_000;
const MAX_SOURCE = 32 * 1024 * 1024;
const MAX_CONTOURS = 1000;
const MAX_POINTS = 20000;
const MAX_COORD = 1_000_000;
const fail = reason => ({ provenanceVerified: false, parityVerified: false, manufacturingApproved: false, reason });

function snapshot(value, label, limit) {
  if (!(value instanceof Uint8Array) || value.byteLength < 1 || value.byteLength > limit) {
    throw new Error(`invalid ${label} bytes`);
  }
  return Buffer.from(value);
}

function geometry(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).sort().join(',') !== 'contours,length,pages,width') throw new Error('invalid expected geometry fields');
  const { pages, width, length, contours } = value;
  if (!Number.isSafeInteger(pages) || pages < 1 || pages > 100 ||
      !Number.isFinite(width) || width <= 0 || width > MAX_COORD ||
      !Number.isFinite(length) || length <= 0 || length > MAX_COORD ||
      !Array.isArray(contours) || contours.length < 1 || contours.length > MAX_CONTOURS) throw new Error('invalid expected geometry dimensions');
  let points = 0;
  const copy = contours.map(contour => {
    if (!Array.isArray(contour) || contour.length < 3 || (points += contour.length) > MAX_POINTS) throw new Error('invalid contour count');
    return contour.map(point => {
      if (!Array.isArray(point) || point.length !== 2 || point.some(n => !Number.isFinite(n) || n < -MAX_COORD || n > MAX_COORD)) throw new Error('invalid contour point');
      return [...point];
    });
  });
  return { pages, width, length, contours: copy };
}

export function verifyAuthenticatedPdfParity({ referencePdfBytes, candidatePdfBytes, authoredSourceBytes, payload, signatureBase64, trust, expectedGeometry } = {}) {
  let reference, candidate, source, expected;
  try {
    reference = snapshot(referencePdfBytes, 'reference PDF', MAX_PDF);
    candidate = snapshot(candidatePdfBytes, 'candidate PDF', MAX_PDF);
    source = snapshot(authoredSourceBytes, 'authored source', MAX_SOURCE);
    expected = geometry(expectedGeometry);
    verifyPdfReferenceProvenance({ referencePdfBytes: reference, authoredSourceBytes: source, payload, signatureBase64, trust });
  } catch (error) {
    return fail(String(error?.message || 'invalid input'));
  }

  const verified = { provenanceVerified: true, parityVerified: false, manufacturingApproved: false };
  try {
    const input = JSON.stringify({ ...expected, referencePdf: reference.toString('base64'), candidatePdf: candidate.toString('base64') });
    if (Buffer.byteLength(input) > 4_200_000) throw new Error('parity request exceeds byte budget');
    const child = spawnSync('python3', [CHECKER], {
      input, encoding: 'utf8', timeout: 15000, maxBuffer: 512_000,
      shell: false, env: { PATH: '/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin', PYTHONDONTWRITEBYTECODE: '1' },
    });
    if (child.error || child.signal || child.status !== 0) throw new Error('independent parity checker failed');
    if (typeof child.stdout !== 'string' || child.stdout.length > 4096) throw new Error('invalid parity response');
    const result = JSON.parse(child.stdout);
    if (!result || result.ok !== true || !Number.isSafeInteger(result.pages) || result.pages !== expected.pages ||
        !Number.isSafeInteger(result.drawings) || result.drawings < 0 ||
        !Number.isSafeInteger(result.items) || result.items < 0 ||
        !Number.isSafeInteger(result.candidateDrawings) || result.candidateDrawings < 0 ||
        !Number.isSafeInteger(result.candidateItems) || result.candidateItems < 0 ||
        Object.keys(result).sort().join(',') !== 'candidateDrawings,candidateItems,drawings,items,ok,pages') throw new Error('malformed parity response');
    return { ...verified, parityVerified: true };
  } catch (error) {
    return { ...verified, reason: String(error?.message || 'parity verification failed') };
  }
}
