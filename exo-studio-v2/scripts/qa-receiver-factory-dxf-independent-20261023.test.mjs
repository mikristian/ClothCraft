import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultProject } from '../src/data/defaultProject.js';
import { projectToDxf, parseDxfPatterns } from '../src/core/dxf.js';
import { pieceArea } from '../src/core/project.js';

// Receiver-side scanner: intentionally does not reuse EXO's DXF entity parser.
function receive(text) {
  const lines = text.replace(/\r/g, '').split('\n');
  assert.equal(lines.length % 2, 0, 'DXF must contain complete code/value pairs');
  const pairs = [];
  for (let i = 0; i < lines.length; i += 2) {
    assert.match(lines[i].trim(), /^\d+$/, `Invalid group code at line ${i + 1}`);
    pairs.push([Number(lines[i]), lines[i + 1].trim()]);
  }
  const header = (name) => {
    const index = pairs.findIndex(([code, value]) => code === 9 && value === name);
    assert.ok(index >= 0, `Missing ${name}`);
    assert.equal(pairs[index + 1]?.[0], 70);
    return Number(pairs[index + 1][1]);
  };
  const versionAt = pairs.findIndex(([c,v]) => c === 9 && v === '$ACADVER');
  assert.ok(versionAt >= 0);
  const version = pairs[versionAt + 1]?.[1];
  const comments = pairs.filter(([c]) => c === 999).map(([,v]) => v);
  const entities = [];
  for (let i = 0; i < pairs.length; i++) {
    if (pairs[i][0] !== 0 || pairs[i][1] !== 'POLYLINE') continue;
    let layer = '', closed = false;
    for (i++; i < pairs.length && pairs[i][0] !== 0; i++) {
      if (pairs[i][0] === 8) layer = pairs[i][1];
      if (pairs[i][0] === 70) closed = (Number(pairs[i][1]) & 1) !== 0;
    }
    const vertices = [];
    while (i < pairs.length && pairs[i][0] === 0 && pairs[i][1] === 'VERTEX') {
      let x, y;
      for (i++; i < pairs.length && pairs[i][0] !== 0; i++) {
        if (pairs[i][0] === 10) x = Number(pairs[i][1]);
        if (pairs[i][0] === 20) y = Number(pairs[i][1]);
      }
      assert.ok(Number.isFinite(x) && Number.isFinite(y), `Nonfinite vertex on ${layer}`);
      vertices.push({ x, y });
    }
    assert.equal(pairs[i]?.[1], 'SEQEND', `Missing SEQEND on ${layer}`);
    entities.push({ layer, closed, vertices });
  }
  return { version, units: header('$INSUNITS'), measurement: header('$MEASUREMENT'), comments, entities };
}

function area(points) {
  let twice = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    twice += a.x * b.y - b.x * a.y;
  }
  return Math.abs(twice / 2);
}

function assess(text, size, expectedPieces) {
  const received = receive(text);
  assert.equal(received.version, 'AC1009');
  assert.equal(received.units, 4, 'Receiver must resolve geometry to millimetres');
  assert.equal(received.measurement, 1);
  assert.ok(received.comments.includes('COORDINATES_MM'));
  assert.ok(received.comments.includes(`GARMENT_STUDIO_SIZE ${size}`));
  assert.ok(received.comments.some(x => x.startsWith('GARMENT_STUDIO_PROJECT ')));
  assert.ok(received.comments.includes('CUT_LAYER_IS_PHYSICAL_ALLOWANCE_OUTLINE_STITCH_IS_SEWLINE_EXPLICIT_NOTCHES_ONLY'));
  const cuts = received.entities.filter(x => x.layer.startsWith('CUT_'));
  const stitches = received.entities.filter(x => x.layer.startsWith('STITCH_'));
  assert.equal(cuts.length, expectedPieces);
  assert.equal(stitches.length, expectedPieces);
  const stitchMap = new Map(stitches.map(x => [x.layer.slice(7), x]));
  assert.equal(stitchMap.size, stitches.length);
  for (const cut of cuts) {
    assert.ok(cut.layer.endsWith(`_${size}`));
    const key = cut.layer.slice(4, -size.length - 1);
    const stitch = stitchMap.get(key);
    assert.ok(stitch, `Missing paired STITCH for ${cut.layer}`);
    assert.ok(cut.closed && stitch.closed, 'Both physical outlines must be closed');
    assert.ok(cut.vertices.length >= 3 && stitch.vertices.length >= 3);
    assert.ok(area(cut.vertices) > area(stitch.vertices), `Physical CUT must enclose more area than STITCH: ${key}`);
    stitchMap.delete(key);
  }
  assert.equal(stitchMap.size, 0);
  return received;
}

test('factory DXF independently scans at 1:1 mm scale, layer semantics, metadata and reference roundtrip', () => {
  const original = createDefaultProject();
  const size = 'M';
  const dxf = projectToDxf(original, size, { cutlineMode: 'manufacturing' });
  const received = assess(dxf, size, original.pieces.length);
  assert.throws(() => parseDxfPatterns(dxf), /Manufacturing DXF contains physical CUT/);
  const cutReference = parseDxfPatterns(dxf, { manufacturingImport: 'cut-reference' });
  const stitchReference = parseDxfPatterns(dxf, { manufacturingImport: 'stitch-reference' });
  assert.equal(cutReference.scaleToCm, 0.1);
  assert.equal(stitchReference.scaleToCm, 0.1);
  assert.equal(cutReference.pieces.length, original.pieces.length);
  assert.equal(stitchReference.pieces.length, original.pieces.length);
  assert.ok(cutReference.pieces.every(piece => piece.patternImportProvenance?.referenceOnly));
  assert.ok(stitchReference.pieces.every(piece => piece.patternImportProvenance?.referenceOnly));
  const cuts = received.entities.filter(e => e.layer.startsWith('CUT_'));
  for (let i = 0; i < cuts.length; i++) {
    const receivedCm2 = area(cuts[i].vertices) / 100;
    const importedCm2 = pieceArea(cutReference.pieces[i]);
    assert.ok(Math.abs(receivedCm2 - importedCm2) < 0.05, `CUT area roundtrip ${i}: ${receivedCm2} vs ${importedCm2}`);
  }
  assert.throws(() => projectToDxf(cutReference, size, { cutlineMode: 'manufacturing' }), /locked manufacturing/);
});

test('receiver rejects wrong units, missing metadata, and altered CUT/STITCH roles', () => {
  const source = projectToDxf(createDefaultProject(), 'M', { cutlineMode: 'manufacturing' });
  const n = createDefaultProject().pieces.length;
  assert.throws(() => assess(source.replace('$INSUNITS\n70\n4', '$INSUNITS\n70\n1'), 'M', n), /millimetres/);
  assert.throws(() => assess(source.replace('COORDINATES_MM', 'COORDINATES_UNKNOWN'), 'M', n));
  assert.throws(() => assess(source.replace('STITCH_', 'OTHER_'), 'M', n));
});
