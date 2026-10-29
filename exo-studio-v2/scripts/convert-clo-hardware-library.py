#!/usr/bin/env python3
"""Convert locally installed CLO hardware packages to private GLBs and previews.

Requires trimesh, numpy, pillow. Uses installed CLO's off-line asset files;
does not modify the installation, trigger iCloud downloads, or redistribute assets.
Outputs are ignored by Git, with an honest catalog for nonmesh data references.

Usage:
    python3 scripts/convert-clo-hardware-library.py
    python3 scripts/convert-clo-hardware-library.py --verify
    python3 scripts/convert-clo-hardware-library.py --only YKK
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import re
import tempfile
import zipfile
from collections import Counter
from pathlib import Path

import numpy as np
import trimesh
from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path('/Applications/CLO_Standalone_OnlineAuth.app/Contents/Assets/Materials/Hardware_and_Trims')
PRESET_ROOT = Path('/Applications/CLO_Standalone_OnlineAuth.app/Contents/Resources/Preset/Zipper')
TARGET = Path(__file__).resolve().parents[1] / 'public/clo-hardware-converted'
CATEGORIES = ('Buttons', 'Buttonholes', 'Graphics', 'Zipper pullers', 'Zipper sliders',
              'Zipper stoppers', 'Zipper tape and teeth textures', 'OBJ ZIP archives')


def details(rel: Path):
    parts = rel.parts
    vendor = 'YKK' if 'YKK' in parts else 'CLO'
    if parts[0] == 'Button & Buttonhole':
        return ('Buttons' if parts[1] == 'Button' else 'Buttonholes', parts[1], vendor)
    if parts[0] == 'Graphic':
        return ('Graphics', 'Graphic', vendor)
    if parts[1] == 'YKK':
        return ('Zipper pullers' if parts[2] == 'Puller' else 'Zipper sliders', 'YKK', vendor)
    if parts[1] in ('Slider', 'Puller'):
        if 'OBJ' in parts:
            return ('OBJ ZIP archives', parts[1], vendor)
        return ('Zipper sliders' if parts[1] == 'Slider' else 'Zipper pullers', 'Standard', vendor)
    if parts[1] == 'Stopper':
        return ('Zipper stoppers', '/'.join(parts[2:-1]), vendor)
    return ('Zipper tape and teeth textures', parts[2] if len(parts) > 2 else '', vendor)


def identifier(rel: Path):
    base = re.sub(r'[^a-z0-9]+', '-', rel.stem.lower()).strip('-')[:78]
    return f"{base}-{hashlib.sha1(str(rel).encode()).hexdigest()[:9]}"


def nice_label(rel: Path):
    return rel.stem.replace('_', ' ').replace('-', ' ')


def save_thumb(data, target: Path, label: str, kind: str):
    target.parent.mkdir(parents=True, exist_ok=True)
    canvas = Image.new('RGB', (360, 360), '#e9e8e5')
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((12, 12, 347, 347), radius=20, fill='#f5f4f0')
    shown_image = False
    if data:
        try:
            with Image.open(io.BytesIO(data)) as source:
                source = ImageOps.exif_transpose(source)
                source.thumbnail((296, 266), Image.Resampling.LANCZOS)
                if source.mode not in ('RGBA', 'LA'):
                    source = source.convert('RGBA')
                canvas.paste(source, ((360-source.width)//2, (300-source.height)//2), source)
                shown_image = True
        except Exception:
            pass
    if not shown_image:
        draw.ellipse((119, 76, 241, 198), outline='#747b83', width=8)
        draw.text((180, 235), kind[:17].upper(), fill='#333333', anchor='mm')
    label = label[:35]
    draw.rectangle((17, 301, 343, 339), fill='#f5f4f0')
    draw.text((180, 321), label, fill='#222629', anchor='mm')
    canvas.save(target, 'PNG', optimize=True)


def build_scene(objects, workdir, scale_to_meters):
    """Keep all original named mesh parts and UV/material assignments intact."""
    assembly = trimesh.Scene()
    import_warnings = []
    for object_file in objects:
        try:
            loaded = trimesh.load(workdir / object_file, force='scene', process=False,
                                  maintain_order=True)
            for node in loaded.graph.nodes_geometry:
                transform, geometry_key = loaded.graph[node]
                mesh = loaded.geometry.get(geometry_key)
                if not isinstance(mesh, trimesh.Trimesh) or not len(mesh.faces):
                    continue
                mesh = mesh.copy()
                # OBJ from CLO claims cm units. Most zipper parts actually use cm.
                # Buttons use near-mm coordinates despite identical header and
                # are therefore assigned an explicit tentative mm unit.
                scaled_transform = np.array(transform, dtype=float)
                scaled_transform[:3, 3] *= scale_to_meters
                assembly.add_geometry(mesh, node_name=f'{Path(object_file).stem}-{node}',
                                      transform=scaled_transform)
        except Exception as exc:
            import_warnings.append(f'{object_file}: {type(exc).__name__}: {exc}')
    if not assembly.geometry:
        return None, import_warnings
    # Scales geometry in its native coordinate frame; translations were
    # scaled above. Geometry is not centered or rotated: original positions
    # and separate paired end stopper parts must remain intact.
    for geometry in assembly.geometry.values():
        geometry.apply_scale(scale_to_meters)
    return assembly, import_warnings


def preview_member(archive_members):
    candidates = [name for name in archive_members if Path(name).suffix.lower() in ('.png', '.jpg', '.jpeg')]
    candidates.sort(key=lambda n: (Path(n).suffix.lower() != '.png', len(n)))
    return candidates[0] if candidates else None


def record(path, relative, output_root, verify=False):
    kind, subtype, vendor = details(relative)
    asset_id = identifier(relative)
    target_glb = output_root / 'models' / f'{asset_id}.glb'
    target_thumb = output_root / 'thumbnails' / f'{asset_id}.png'
    item = {
        'id': asset_id, 'name': nice_label(relative), 'category': kind,
        'subcategory': subtype, 'vendor': vendor, 'sourcePath': str(relative),
        'sourceAbsolutePath': str(path), 'format': path.suffix.lower(),
        'extension': path.suffix.lower(), 'sourceBytes': path.stat().st_size,
        'glb': None, 'thumbnail': f'/clo-hardware-converted/thumbnails/{asset_id}.png',
        'status': 'reference', 'sourceSystem': 'CLO 7 installed library',
        'physics': 'not validated', 'dimensionsStatus': 'mesh-derived, not supplier calibrated',
        'notes': '', 'meshParts': 0, 'triangleCount': 0, 'dimensionsRaw': None,
        'originalObjNames': [], 'warnings': [],
    }
    image_bytes = None
    if zipfile.is_zipfile(path):
        with zipfile.ZipFile(path) as zip_source:
            members = [name for name in zip_source.namelist() if not name.endswith('/')]
            objfiles = [name for name in members if name.lower().endswith('.obj')]
            preview = preview_member(members)
            image_bytes = zip_source.read(preview) if preview else None
            item['originalObjNames'] = objfiles
            item['sourceArchiveMemberCount'] = len(members)
            if objfiles:
                # Use an isolated extraction folder; archived paths can contain
                # arbitrary user-controlled strings, so disallow traversal.
                with tempfile.TemporaryDirectory(prefix='exo-clo-hardware-') as folder:
                    workdir = Path(folder)
                    for name in members:
                        candidate = Path(name)
                        if candidate.is_absolute() or '..' in candidate.parts:
                            raise ValueError(f'Unsafe CLO package member: {name}')
                        dest = workdir / candidate
                        dest.parent.mkdir(parents=True, exist_ok=True)
                        dest.write_bytes(zip_source.read(name))
                    # Buttons and the OBJ companion ZIPs use roughly 9–22 raw
                    # units for common pieces, consistent with millimetres.
                    # Zipper CLO styles use roughly 1–3 units, consistent
                    # with centimetres. Record assumptions for user review.
                    raw_mm = kind in ('Buttons', 'OBJ ZIP archives')
                    unit = 'inferred-mm' if raw_mm else 'obj-comment-cm'
                    scale = .001 if raw_mm else .01
                    scene, issues = build_scene(objfiles, workdir, scale)
                    item['warnings'].extend(issues)
                    item['scaleAssumption'] = unit
                    item['metersPerRawUnit'] = scale
                    if scene is not None:
                        bounds = scene.bounds / scale
                        dims = bounds[1] - bounds[0]
                        item['dimensionsRaw'] = [round(float(x), 6) for x in dims]
                        item['dimensionsMm'] = [round(float(x * scale * 1000), 4) for x in dims]
                        item['meshParts'] = len(scene.geometry)
                        item['triangleCount'] = sum(len(g.faces) for g in scene.geometry.values())
                        item['status'] = 'converted-3d'
                        item['glb'] = f'/clo-hardware-converted/models/{asset_id}.glb'
                        if not verify or not target_glb.exists():
                            target_glb.parent.mkdir(parents=True, exist_ok=True)
                            scene.export(target_glb, file_type='glb')
            elif kind == 'Buttonholes':
                item['status'] = 'clo-buttonhole-definition'
                item['notes'] = 'CLO BTH stitches/cut definition; no original OBJ geometry to convert.'
            elif kind == 'Graphics':
                item['status'] = 'clo-graphic-definition'
                item['notes'] = 'CLO graphic with Illustrator artwork; not a 3D model.'
    else:
        if path.suffix.lower() in ('.png', '.jpg', '.jpeg'):
            image_bytes = path.read_bytes()
            item['status'] = 'texture'
            item['notes'] = '2D zipper tape/tooth texture or normal map. No standalone mesh.'
    if not verify or not target_thumb.exists():
        save_thumb(image_bytes, target_thumb, item['name'], kind)
    return item


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--only', help='Convert subset matching a name or relative path')
    parser.add_argument('--verify', action='store_true', help='Reuse existing GLB and thumbnail files if present')
    parser.add_argument('--target', type=Path, default=TARGET)
    args = parser.parse_args()
    if not ROOT.is_dir():
        parser.error(f'Installed CLO hardware resource folder not present: {ROOT}')
    target = args.target.resolve()
    target.mkdir(parents=True, exist_ok=True)
    paths = sorted(p for p in ROOT.rglob('*') if p.is_file())
    if args.only:
        paths = [p for p in paths if args.only.lower() in str(p.relative_to(ROOT)).lower()]
    elif len(paths) != 162:
        parser.error(f'Expected 162 source files, found {len(paths)}; do not overwrite catalog without auditing')
    items = []
    errors = []
    for i, path in enumerate(paths, 1):
        rel = path.relative_to(ROOT)
        try:
            entry = record(path, rel, target, verify=args.verify)
            items.append(entry)
            print(f"[{i:3}/{len(paths)}] {entry['status']:25} {rel}", flush=True)
        except Exception as exc:
            errors.append({'sourcePath': str(rel), 'error': f'{type(exc).__name__}: {exc}'})
            print(f'[{i:3}/{len(paths)}] ERROR {rel}: {exc}', flush=True)
    manifest = {
        'version': 1, 'source': 'Privately installed CLO 7 hardware and trims',
        'sourceRoot': str(ROOT), 'license': 'Original vendor assets; local private use. Verify rights before distribution.',
        'sizeUnits': 'meters (derived from raw OBJ units; see scaleAssumption on each asset)',
        'items': items, 'sourceCount': len(paths),
        'convertedCount': sum(bool(p['glb']) for p in items),
        'categoryCounts': dict(Counter(p['category'] for p in items)),
        'failures': errors,
    }
    if not args.only:
        (target / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    else:
        (target / 'subset-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print(f"Finished: {len(items)} source assets; {manifest['convertedCount']} GLBs; "
          f"{len(errors)} errors; {target}", flush=True)
    if errors:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
