#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const folder = path.join(root, 'download');
for (const name of ['index.html', 'styles.css', 'releases.js', 'favicon.svg']) {
  if (!fs.statSync(path.join(folder, name)).isFile()) throw new Error(`Missing ${name}`);
}
const html = fs.readFileSync(path.join(folder, 'index.html'), 'utf8');
const manifest = fs.readFileSync(path.join(folder, 'releases.js'), 'utf8');
for (const id of ['mac-download', 'win-download', 'mac-status', 'win-status']) {
  if (!html.includes(`id="${id}"`)) throw new Error(`Missing ${id}`);
}
if (!manifest.includes('mac: null') || !manifest.includes('windows: null')) {
  // Changing the release manifest to published links requires a deliberate
  // code review with evidence of real installer artifacts and checksum tests.
  if (!process.env.EXO_APPROVED_RELEASE_MANIFEST) {
    throw new Error('Release manifest changed: require verified artifacts and explicit release approval');
  }
}
console.log('PASS: EXO landing page exists and unverified download links stay disabled.');
