#!/usr/bin/env python3
"""Copy precisely the local EXO Node ESM import closure into a staged .app.

The installed Swift shell bundles Node but intentionally does not have access
to the developer's checkout. Transitive ./ and ../ imports must therefore be
copied with the same relative layout beneath Contents/Resources. This is
source code, not user files, tests, credentials or arbitrary research media.
"""
import re
import json
import shutil
import sys
from pathlib import Path

repo = Path(__file__).resolve().parents[2]
if len(sys.argv) != 2:
    raise SystemExit('usage: stage-desktop-node-module-closure.py APP')
app = Path(sys.argv[1]).resolve()
resources = app / 'Contents' / 'Resources'
if not (app / 'Contents' / 'MacOS' / 'EXOClothCraft').is_file():
    raise SystemExit('Refusing to stage dependencies in non-EXOClothCraft app')
if not resources.is_dir():
    raise SystemExit('Missing app Contents/Resources')
roots = [
    'integrations/clothcraft/server.mjs',
    'integrations/clothcraft/workspace.mjs',
    'integrations/clothcraft/mcp-server.mjs',
]
pattern = re.compile(r'''(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)(['"])(\.{1,2}/[^'"\n]+)\1''')
queue = list(roots)
visited = set()
while queue:
    rel = queue.pop()
    if rel in visited:
        continue
    visited.add(rel)
    source = (repo / rel).resolve()
    if not source.is_relative_to(repo):
        raise SystemExit(f'Import escaped source repository: {rel}')
    if source.suffix not in ('.mjs', '.js', '.json'):
        raise SystemExit(f'Unsupported server-side module: {rel}')
    if not source.is_file():
        raise SystemExit(f'Missing server-side module: {rel}')
    # Only allow first-party sources, not private local runtime data.
    if not (rel.startswith('integrations/clothcraft/') or rel.startswith('src/core/')):
        raise SystemExit(f'Unreviewed server-side module location: {rel}')
    destination = resources / rel
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)
    if source.suffix == '.json':
        continue
    data = source.read_text(encoding='utf-8')
    for match in pattern.finditer(data):
        fragment = match.group(2)
        if '?' in fragment or '#' in fragment:
            raise SystemExit(f'Unexpected relative module query in {rel}: {fragment}')
        child = (source.parent / fragment).resolve()
        if not child.suffix:
            child = child.with_suffix('.mjs')
        if not child.is_relative_to(repo):
            raise SystemExit(f'Module import outside source tree: {rel}: {fragment}')
        queue.append(str(child.relative_to(repo)))

print(f'EXO standalone Node module closure: staged {len(visited)} local modules')

# Copy only explicitly imported packages and their declared runtime
# dependencies from the locked local npm install. Never ship the entire
# node_modules developer tree, test fixtures or locally linked packages.
package_names = set()
bare = re.compile(r'''(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)(['"])([^.'"\n][^'"\n]*)\1''')
for rel in visited:
    path = repo / rel
    if path.suffix == '.json':
        continue
    for match in bare.finditer(path.read_text(encoding='utf-8')):
        identifier = match.group(2)
        if identifier.startswith('node:'):
            continue
        name = '/'.join(identifier.split('/')[:2]) if identifier.startswith('@') else identifier.split('/')[0]
        package_names.add(name)
pending = list(package_names)
copied = set()
while pending:
    name = pending.pop()
    if name in copied:
        continue
    copied.add(name)
    if '/' in name and not name.startswith('@'):
        raise SystemExit(f'Invalid runtime package name: {name}')
    package = repo / 'node_modules' / name
    manifest = package / 'package.json'
    if not manifest.is_file() or package.is_symlink():
        raise SystemExit(f'Missing or symlinked locked npm runtime package: {name}')
    info = json.loads(manifest.read_text(encoding='utf-8'))
    if info.get('name') != name:
        raise SystemExit(f'Package-name mismatch: {name}')
    for dependency in (info.get('dependencies') or {}):
        pending.append(dependency)
    destination = resources / 'node_modules' / name
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(package, destination, dirs_exist_ok=True,
        ignore=shutil.ignore_patterns('node_modules', 'test', 'tests', 'coverage', '.git'))
print(f'EXO standalone Node runtime packages: staged {len(copied)} locked npm packages')
