"""Read-only inventory of installed CLO hardware resources; writes metadata only."""
from collections import Counter, defaultdict
from pathlib import Path
import csv
import hashlib
import json
import zipfile


ROOT = Path('/Applications/CLO_Standalone_OnlineAuth.app/Contents/Assets/Materials/Hardware_and_Trims')
DOCUMENTS = Path.home() / 'Documents/clo/Assets/Materials/Hardware_and_Trims'
PRESETS = Path('/Applications/CLO_Standalone_OnlineAuth.app/Contents/Resources/Preset/Zipper')
OUTPUT = Path(__file__).resolve().parent


def classification(relative):
    parts = relative.parts
    if parts[0] == 'Button & Buttonhole':
        return ('Buttons' if parts[1] == 'Button' else 'Buttonholes', parts[1])
    if parts[0] == 'Graphic':
        return ('Graphics', 'Graphic')
    if parts[1] == 'YKK':
        return ('Zipper pullers' if parts[2] == 'Puller' else 'Zipper sliders', 'YKK ' + parts[2])
    if parts[1] in ('Puller', 'Slider'):
        if len(parts) > 3:
            return ('OBJ ZIP archives', parts[1] + ' OBJ archives')
        return ('Zipper pullers' if parts[1] == 'Puller' else 'Zipper sliders', 'Standard ' + parts[1])
    if parts[1] == 'Stopper':
        return ('Zipper stoppers', '/'.join(parts[2:-1]))
    if parts[1] == 'Tape':
        return ('Zipper tape and teeth textures', parts[2])
    return ('Other', 'Other')


def digest(p):
    h = hashlib.sha256()
    with p.open('rb') as handle:
        while True:
            block = handle.read(1024 * 1024)
            if not block:
                break
            h.update(block)
    return h.hexdigest()


rows = []
for p in sorted(ROOT.rglob('*')):
    if not p.is_file():
        continue
    relative = p.relative_to(ROOT)
    kind, subkind = classification(relative)
    cloud = DOCUMENTS / relative
    local_stat = p.stat()
    cloud_stat = cloud.stat() if cloud.exists() else None
    members = []
    if zipfile.is_zipfile(p):
        with zipfile.ZipFile(p) as z:
            members = [n for n in z.namelist() if not n.endswith('/')]
    obj = [name for name in members if name.lower().endswith('.obj')]
    companion = ''
    if kind == 'OBJ ZIP archives':
        typ = relative.parts[1]
        companion = str(Path('Zipper') / typ / (p.stem + ('.zpl' if typ == 'Puller' else '.zsd')))
    elif kind in ('Zipper pullers', 'Zipper sliders') and 'YKK' not in relative.parts:
        candidate = Path('Zipper') / relative.parts[1] / 'OBJ' / (p.stem + '.zip')
        if (ROOT / candidate).exists():
            companion = str(candidate)
    rows.append({
        'category': kind,
        'subcategory': subkind,
        'vendor': 'YKK' if 'YKK' in relative.parts else '',
        'filename': p.name,
        'extension': p.suffix.lower(),
        'relative_path': str(relative),
        'installed_clo_path': str(p),
        'documents_clo_path': str(cloud),
        'logical_size_bytes': local_stat.st_size,
        'installed_allocated_bytes': local_stat.st_blocks * 512,
        'documents_allocated_bytes': cloud_stat.st_blocks * 512 if cloud_stat else '',
        'documents_same_listed_size': bool(cloud_stat and cloud_stat.st_size == local_stat.st_size),
        'documents_sha256_matches_installed': digest(cloud) == digest(p) if cloud_stat and cloud_stat.st_blocks > 0 else '',
        'contains_obj': bool(obj),
        'obj_count': len(obj),
        'obj_filenames': ' | '.join(obj),
        'archive_member_count': len(members),
        'archive_extensions': ', '.join(sorted({Path(name).suffix.lower() for name in members})),
        'companion_relative_path': companion,
        'installed_sha256': digest(p),
    })

expected = {
    'Buttons': 45,
    'Buttonholes': 10,
    'Graphics': 1,
    'Zipper pullers': 31,
    'Zipper sliders': 20,
    'Zipper stoppers': 7,
    'Zipper tape and teeth textures': 18,
    'OBJ ZIP archives': 30,
}
counts = Counter(row['category'] for row in rows)
assert counts == expected, counts
assert len(rows) == 162
assert all(row['documents_same_listed_size'] for row in rows)
assert all(row['installed_allocated_bytes'] > 0 for row in rows)
assert sum(row['contains_obj'] for row in rows) == 133

with (OUTPUT / 'inventory.csv').open('w', newline='', encoding='utf-8') as out:
    writer = csv.DictWriter(out, fieldnames=list(rows[0]))
    writer.writeheader()
    writer.writerows(rows)

extra = []
for p in sorted(PRESETS.rglob('*')):
    if not p.is_file():
        continue
    potential = [row for row in rows if row['filename'] == p.name]
    extra.append({
        'relative_path': str(p.relative_to(PRESETS)),
        'filename': p.name,
        'extension': p.suffix.lower(),
        'size_bytes': p.stat().st_size,
        'present_in_core_by_filename': bool(potential),
        'identical_sha256_in_core': any(row['installed_sha256'] == digest(p) for row in potential),
    })
with (OUTPUT / 'installed-zipper-presets.csv').open('w', newline='', encoding='utf-8') as out:
    writer = csv.DictWriter(out, fieldnames=list(extra[0]))
    writer.writeheader()
    writer.writerows(extra)

grouped = defaultdict(list)
for row in rows:
    grouped[row['category'], str(Path(row['relative_path']).parent)].append(row)

summary = {
    'audit_date': '2026-10-17',
    'core_files': len(rows),
    'categories': dict(counts),
    'formats': dict(Counter(row['extension'] for row in rows)),
    'ykk_styles': sum(row['vendor'] == 'YKK' for row in rows),
    'mesh_container_files': sum(row['contains_obj'] for row in rows),
    'total_obj_members': sum(row['obj_count'] for row in rows),
    'main_library_logical_bytes': sum(row['logical_size_bytes'] for row in rows),
    'installed_allocated_bytes': sum(row['installed_allocated_bytes'] for row in rows),
    'icloud_dataless_entries': sum(row['documents_allocated_bytes'] == 0 for row in rows),
    'icloud_downloaded_entries': sum(row['documents_allocated_bytes'] > 0 for row in rows),
    'icloud_verified_matching_sha256': sum(row['documents_sha256_matches_installed'] is True for row in rows),
    'installed_root': str(ROOT),
    'icloud_documents_mirror': str(DOCUMENTS),
    'additional_zipper_preset_files': len(extra),
    'preset_names_absent_from_core': [x['filename'] for x in extra if not x['present_in_core_by_filename']],
}
(OUTPUT / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n', encoding='utf-8')

report = [
    '# CLO 3D hardware and trim files — local inventory',
    '',
    '**Audited:** October 17, 2026. **Core library:** 162 files, counted by actual file path.',
    '',
    '## Source folders',
    '',
    f'- **Installed and available offline:** `{ROOT}`',
    f'- **iCloud Documents mirror:** `{DOCUMENTS}`',
    f'- **Separate installed zipper presets:** `{PRESETS}`',
    '',
    'All 162 entries in the installed folder have matching relative names and listed sizes in Documents. '
    f"The Documents mirror now has {summary['icloud_downloaded_entries']} files allocated locally and "
    f"{summary['icloud_dataless_entries']} dataless placeholders. "
    f"{summary['icloud_verified_matching_sha256']} downloaded entries have identical SHA-256 hashes to installed CLO files. "
    'The installed CLO copy was used for the mesh conversion; macOS Optimize Storage could evict iCloud copies again later.',
    '',
    '## Exact counts',
    '',
    '| Category | Files | Files containing OBJ geometry |',
    '|---|---:|---:|',
]
for key in expected:
    group = [row for row in rows if row['category'] == key]
    report.append(f"| {key} | {len(group)} | {sum(row['contains_obj'] for row in group)} |")
report.extend([
    '| **Total** | **162** | **133** |',
    '',
    '**YKK:** 10 pullers and 11 sliders, included in the categories above (21 total). '
    'The 30 `.zip` files are companion OBJ archives for the corresponding numbered puller and slider styles. '
    'They are separate file entries; the matching OBJ bytes can differ, so they are not assumed duplicate contents.',
    '',
    '**File extensions:** ' + ', '.join(f'`{ext}` {n}' for ext, n in sorted(Counter(r['extension'] for r in rows).items())) + '.',
    '',
    f"**Total recorded size:** {summary['main_library_logical_bytes']:,} bytes ({summary['main_library_logical_bytes'] / 1_000_000:.2f} MB).",
    '',
    '## What is actually 3D?',
    '',
    '- Every `.btn` (45), `.zpl` (31), `.zsd` (20), `.zsp` (7) and companion `.zip` (30) contains one or more OBJ meshes. '
    'These files are ZIP-compatible containers, even when their filename extension is CLO-specific.',
    '- The 10 `.bth` buttonholes contain `.bnd` definitions, preview PNG and JSON. They do not contain `.obj` meshes.',
    '- The one `.grp` graphic includes Adobe Illustrator `.ai` data and its CLO graphic package, with no OBJ mesh.',
    '- The 18 PNGs are zipper tape and tooth textures, including normal maps.',
    '- Mesh presence confirms geometry availability, not collision physics, compatible sizing or redistribution rights.',
    '',
    '## Complete file-by-file list',
    '',
    'Files below are relative to the installed source or Documents mirror above. '
    'For searchable absolute paths, content checksum, sizes and embedded OBJ names use `inventory.csv`.',
])
for key in expected:
    report.extend(['', f'### {key} ({counts[key]})', ''])
    for (kind, dirname), matches in sorted(grouped.items()):
        if kind != key:
            continue
        report.extend([f'**`{dirname}/`** ({len(matches)} files)', ''])
        report.extend(f"- `{r['filename']}`" for r in matches)
        report.append('')

report.extend([
    '## Additional CLO zipper presets',
    '',
    f'The installed Resources/Preset/Zipper folder has {len(extra)} support files. '
    'These are counted separately to avoid inflating the 162 core library files.',
    '',
    '| Resource-relative file | Filename also in core | Identical bytes to a core file |',
    '|---|---|---|',
])
report.extend(f"| `{x['relative_path']}` | {'Yes' if x['present_in_core_by_filename'] else 'No'} | {'Yes' if x['identical_sha256_in_core'] else 'No'} |" for x in extra)
report.extend([
    '',
    '## Working with the assets',
    '',
    '- Both installed CLO.app resources and the hydrated Documents copy can be inspected offline. The original source files remain unchanged.',
    '- The iCloud copies were downloaded separately by the authorized hydration helper; see `icloud-hydration-report.md`. This inventory only reads metadata, hashes and ZIP member names.',
    '- Before distributing or incorporating vendor YKK/CLO assets in EXO, check the applicable supplier and CLO license permissions.',
    '',
])
(OUTPUT / 'INDEX.md').write_text('\n'.join(report), encoding='utf-8')

tree = [f'Hardware_and_Trims/ ({len(rows)} files)']
for (_, dirname), entries in sorted(grouped.items()):
    tree.append(f'  {dirname}/ [{len(entries)}]')
    tree.extend('    ' + r['filename'] for r in entries)
(OUTPUT / 'tree.txt').write_text('\n'.join(tree) + '\n', encoding='utf-8')
print('CREATED:', OUTPUT)
print(json.dumps(summary, indent=2))
