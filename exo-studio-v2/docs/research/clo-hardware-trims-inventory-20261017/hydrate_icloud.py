#!/usr/bin/env python3
"""Safely request iCloud hydration and compare the CLO hardware mirror."""

import concurrent.futures
import hashlib
import json
import shutil
import subprocess
from pathlib import Path

SOURCE = Path('/Applications/CLO_Standalone_OnlineAuth.app/Contents/Assets/Materials/Hardware_and_Trims')
MIRROR = Path.home() / 'Documents/clo/Assets/Materials/Hardware_and_Trims'
OUT = Path(__file__).with_name('icloud-hydration-results.json')


def sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def main():
    source = {p.relative_to(SOURCE).as_posix(): p for p in SOURCE.rglob('*') if p.is_file()}
    mirror = {p.relative_to(MIRROR).as_posix(): p for p in MIRROR.rglob('*') if p.is_file()}
    estimated = sum(p.stat().st_size for p in mirror.values())
    free = shutil.disk_usage(MIRROR).free
    if free < estimated * 3:
        raise SystemExit(f'Insufficient free space: {free}, logical mirror bytes {estimated}')
    if source.keys() != mirror.keys():
        raise SystemExit(f'Unexpected path differences: missing={len(source.keys()-mirror.keys())}, extra={len(mirror.keys()-source.keys())}')

    def hydrate(item):
        name, path = item
        command = subprocess.run(['/usr/bin/brctl', 'download', str(path)], capture_output=True, text=True, timeout=45)
        return name, {'returncode': command.returncode, 'error': (command.stderr or command.stdout).strip()[:1000]}

    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        requested = dict(executor.map(hydrate, mirror.items()))

    records = []
    for name, path in mirror.items():
        st = path.stat()
        local = st.st_blocks > 0 and not (st.st_flags & 0x40000000)
        record = {'path': name, 'logical_size': st.st_size, 'allocated_bytes': st.st_blocks * 512,
                  'flags': hex(st.st_flags), 'download_request': requested[name], 'hydrated': local}
        if local:
            try:
                record['sha256_icloud'] = sha256(path)
                record['sha256_installed'] = sha256(source[name])
                record['hash_match'] = record['sha256_icloud'] == record['sha256_installed']
            except Exception as exc:
                record['hash_error'] = str(exc)
        records.append(record)
    result = {'free_bytes_before': free, 'expected_logical_bytes': estimated,
              'source_count': len(source), 'mirror_count': len(mirror), 'hydrated_count': sum(r['hydrated'] for r in records),
              'hash_matches': sum(r.get('hash_match') is True for r in records),
              'hash_mismatches': sum(r.get('hash_match') is False for r in records),
              'pending': [r['path'] for r in records if not r['hydrated']],
              'failures': [r for r in records if r['download_request']['returncode'] != 0 or 'hash_error' in r],
              'records': records}
    OUT.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({k: v for k, v in result.items() if k not in ('records',)}, indent=2))


if __name__ == '__main__':
    main()
