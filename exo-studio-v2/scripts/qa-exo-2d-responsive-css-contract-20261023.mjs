#!/usr/bin/env node
// Source-only regression for the 2D glass Pattern Studio switch and corner rail.
// Run: node --test scripts/qa-exo-2d-responsive-css-contract-20261023.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const cssPath = resolve(dirname(fileURLToPath(import.meta.url)), '../src/components/ClothCraftExoShell.css');
const source = readFileSync(cssPath, 'utf8');
const corner = '.app-shell .cc-board .cc-corner-tool-host';
const arrow = '.cc-v2-board-orientation>.cc-pattern-studio-glass-arrow';

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function blocks(css) {
  const text = stripComments(css);
  const result = [];
  const stack = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      stack.push({ selector: text.slice(start, i).trim(), start: i + 1, depth: stack.length });
      start = i + 1;
    } else if (text[i] === '}') {
      if (!stack.length) throw new Error('CSS has an unmatched closing brace');
      const open = stack.pop();
      result.push({ selector: open.selector, body: text.slice(open.start, i), depth: open.depth,
        parents: stack.map((parent) => parent.selector) });
      start = i + 1;
    }
  }
  if (stack.length) throw new Error('CSS has an unclosed block');
  return result;
}

function declarations(body) {
  return Object.fromEntries(body.split(';').map((segment) => {
    const colon = segment.indexOf(':');
    return colon < 0 ? [] : [[segment.slice(0, colon).trim().toLowerCase(), segment.slice(colon + 1).trim().toLowerCase()]];
  }).flat());
}

function assertContract(css) {
  const rules = blocks(css);
  const arrowRule = rules.find((r) => r.selector === arrow && r.depth === 0);
  assert.ok(arrowRule, 'the Pattern Studio arrow must be a direct child of the glass top strip');
  const hitbox = declarations(arrowRule.body);
  assert.match(hitbox['min-width'] ?? '', /^25px$/);
  assert.match(hitbox['min-height'] ?? '', /^25px$/);
  assert.equal(hitbox.cursor, 'pointer');
  assert.ok(rules.some((r) => r.selector === `${arrow}:hover` && r.depth === 0), 'arrow hover target must remain styled');

  const strip = rules.find((r) => r.selector === '.cc-v2-orientation' && r.depth === 0);
  assert.ok(strip, 'glass orientation strip must exist');
  const stripDecl = declarations(strip.body);
  assert.equal(stripDecl.position, 'absolute');
  assert.ok(Number.parseInt(stripDecl['z-index'], 10) > 0, 'glass strip must have a positive stacking layer');

  const responsiveRules = rules.filter((r) => r.selector === corner && r.parents.some((p) => p.startsWith('@media')));
  assert.ok(responsiveRules.length, 'corner host must have a responsive overlap rule');
  for (const width of [1280, 1720]) {
    const applicable = responsiveRules.filter((r) => r.parents.some((p) => {
      const match = p.match(/^@media\s*\(\s*max-width\s*:\s*(\d+)px\s*\)$/);
      return match && width <= Number(match[1]);
    }));
    if (width === 1280) {
      assert.equal(applicable.length, 1, '1280px needs exactly one effective corner clearance');
      assert.equal(declarations(applicable[0].body).top, '52px!important', 'corner tools must move below glass strip at 1280px');
    } else {
      assert.equal(applicable.length, 0, '1720px must retain standard corner layout');
    }
  }
  assert.ok(responsiveRules.some((r) => r.parents.includes('@media (max-width:1400px)')),
    'expected 1400px breakpoint missing or moved');
}

test('actual source respects the glass arrow / corner host responsive contract', () => {
  assertContract(source);
});

test('regression: removing the 1280px clearance is rejected', () => {
  const broken = source.replace('top:52px!important', 'top:11px!important');
  assert.notEqual(broken, source, 'fixture must mutate stylesheet');
  assert.throws(() => assertContract(broken), /move below glass strip/);
});

test('regression: shrinking breakpoint below 1280px is rejected', () => {
  const broken = source.replace('@media (max-width:1400px)', '@media (max-width:1200px)');
  assert.notEqual(broken, source, 'fixture must mutate stylesheet');
  assert.throws(() => assertContract(broken), /1280px needs/);
});

test('regression: losing pointer hitbox or priority is rejected', () => {
  const brokenArrow = source.replace('min-width:25px;min-height:25px', 'min-width:12px;min-height:12px');
  const brokenPriority = source.replace('top:52px!important', 'top:52px');
  assert.notEqual(brokenArrow, source);
  assert.notEqual(brokenPriority, source);
  assert.throws(() => assertContract(brokenArrow));
  assert.throws(() => assertContract(brokenPriority));
});
