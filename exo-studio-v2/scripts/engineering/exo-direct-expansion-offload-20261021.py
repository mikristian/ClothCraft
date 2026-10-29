#!/usr/bin/env python3
"""Offload only allowlisted obsolete EXO UI build snapshots to physical Expansion.

Streams a gzip TAR through the existing Tailscale SSH connection without a
local archive or WebDAV staging cache. Every remote archive member is
independently re-read and SHA-256 compared before local directories are
released. Live apps, active garments and Cargo target caches are excluded.
"""
import hashlib
import gzip
import io
import json
import os
from pathlib import Path
import shlex
import shutil
import subprocess
import sys
import tarfile
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[2]
SOURCES = ROOT / "integrations/clothcraft/output"
ALLOW = (
    "pattern-ui-backup-20261019",
    "visible-handles-backup-20261019",
    "clo-audit-backup-20261019",
)
REMOTE = "jarvismikristian@100.82.90.101"
KEY = Path.home() / ".ssh/openclaw_mac_ed25519"
DEST = "/Volumes/Expansion/EXO-Engineering/verified-backups/EXO-ClothCraft-Offload-20261021"
AUDIT = ROOT / "docs/qa/expansion-offload-20261021"
SSH = ["ssh", "-i", str(KEY), "-o", "IdentitiesOnly=yes", "-o",
       "BatchMode=yes", "-o", "ConnectTimeout=8", REMOTE]


def ssh(cmd, capture=True):
    return subprocess.run(SSH + [cmd], check=True, capture_output=capture, text=True)


def sha(path):
    hasher = hashlib.sha256()
    with path.open("rb") as stream:
        for piece in iter(lambda: stream.read(1024 * 1024), b""):
            hasher.update(piece)
    return hasher.hexdigest()


def entries(folder):
    result = {}
    original_stats = {}
    for base, dirs, files in os.walk(folder, topdown=True, followlinks=False):
        dirs.sort()
        files.sort()
        for item in [Path(base)] + [Path(base) / name for name in dirs + files]:
            rel = item.relative_to(SOURCES).as_posix()
            st = item.lstat()
            original_stats[str(item)] = [st.st_size, st.st_mtime_ns, st.st_mode]
            if item.is_symlink():
                result[rel] = {"kind": "symlink", "link": os.readlink(item)}
            elif item.is_dir():
                result[rel] = {"kind": "directory"}
            elif item.is_file():
                result[rel] = {"kind": "file", "size": st.st_size, "sha256": sha(item)}
            else:
                raise RuntimeError("Unsupported snapshot entry: " + str(item))
    return result, original_stats


class DigestWriter:
    def __init__(self, stream):
        self.stream = stream
        self.digest = hashlib.sha256()
        self.count = 0

    def write(self, data):
        self.digest.update(data)
        self.count += len(data)
        self.stream.write(data)
        return len(data)

    def flush(self):
        self.stream.flush()


def archive_and_verify(name):
    if name not in ALLOW:
        raise RuntimeError("Refusing offload outside static historical UI allowlist")
    src = SOURCES / name
    if not src.is_dir() or src.is_symlink() or src.resolve().parent != SOURCES.resolve():
        raise RuntimeError("Snapshot missing or not a real direct child: " + str(src))
    expected, source_stats = entries(src)
    final = f"{DEST}/{name}.tar.gz"
    uploading = final + ".uploading"
    qfinal, qupload = shlex.quote(final), shlex.quote(uploading)
    state = subprocess.run(SSH + [f"test ! -e {qfinal} && test ! -e {qupload}"],
                           stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    if state.returncode:
        raise RuntimeError("Remote archive/staged file already exists; refusing overwrite: " + final)
    print(f"BEGIN {name} {len(expected)} entries", flush=True)

    proc = subprocess.Popen(SSH + [f"umask 077; cat > {qupload}"],
                            stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    writer = DigestWriter(proc.stdin)
    try:
        with gzip.GzipFile(fileobj=writer, mode="wb", compresslevel=1, mtime=0) as compressed:
            with tarfile.open(fileobj=compressed, mode="w|", format=tarfile.PAX_FORMAT) as tar:
                tar.add(str(src), arcname=name, recursive=True)
        writer.flush()
        proc.stdin.close()
        error = proc.stderr.read().decode("utf-8", errors="replace")
        if proc.wait() != 0:
            raise RuntimeError("SSH streaming transfer failed: " + error[-800:])
    except Exception:
        try:
            proc.kill()
        except OSError:
            pass
        raise

    # Verify that the physical remote drive contains every logical source
    # member with its exact original checksum; the compressed archive digest
    # is also compared against the bytes streamed to SSH.
    observed_remote_hash = ssh(f"shasum -a 256 {qupload}").stdout.split()[0]
    if observed_remote_hash != writer.digest.hexdigest():
        raise RuntimeError("Remote compressed archive SHA-256 mismatch; sources retained")
    remote = subprocess.Popen(SSH + [f"cat {qupload}"],
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    actual = set()
    seen_hashes = {}
    try:
        with tarfile.open(fileobj=remote.stdout, mode="r|gz") as tar:
            for member in tar:
                key = member.name.rstrip("/")
                if key not in expected or key in actual:
                    raise RuntimeError("Unexpected or duplicate remote member: " + key)
                actual.add(key)
                want = expected[key]
                if member.isfile():
                    if want["kind"] != "file" or member.size != want["size"]:
                        raise RuntimeError("Remote file metadata mismatch: " + key)
                    content = tar.extractfile(member)
                    hasher = hashlib.sha256()
                    for chunk in iter(lambda: content.read(1024 * 1024), b""):
                        hasher.update(chunk)
                    if hasher.hexdigest() != want["sha256"]:
                        raise RuntimeError("Remote file contents differ: " + key)
                    seen_hashes[key] = hasher.hexdigest()
                elif member.islnk():
                    if want["kind"] != "file" or seen_hashes.get(member.linkname) != want["sha256"]:
                        raise RuntimeError("Remote hardlink mismatch: " + key)
                    seen_hashes[key] = want["sha256"]
                elif member.issym():
                    if want != {"kind": "symlink", "link": member.linkname}:
                        raise RuntimeError("Remote symlink mismatch: " + key)
                elif member.isdir():
                    if want["kind"] != "directory":
                        raise RuntimeError("Remote directory mismatch: " + key)
                else:
                    raise RuntimeError("Unexpected remote archive type: " + key)
        remote.stdout.close()
        error = remote.stderr.read().decode("utf-8", errors="replace")
        if remote.wait() != 0:
            raise RuntimeError("Remote archive readback failed: " + error[-800:])
    finally:
        if remote.poll() is None:
            remote.kill()
    if actual != set(expected):
        raise RuntimeError("Remote archive omitted source entries")
    for key, old in source_stats.items():
        st = os.lstat(key)
        if [st.st_size, st.st_mtime_ns, st.st_mode] != old:
            raise RuntimeError("Source changed during archive; original retained: " + key)

    ssh(f"mv {qupload} {qfinal}")
    if ssh(f"shasum -a 256 {qfinal}").stdout.split()[0] != writer.digest.hexdigest():
        raise RuntimeError("Completed remote archive hash mismatch; source retained")

    AUDIT.mkdir(parents=True, exist_ok=True)
    report = {
        "source": str(src), "destination": f"{REMOTE}:{final}",
        "archiveSha256": writer.digest.hexdigest(), "archiveBytes": writer.count,
        "membersVerified": len(expected), "logicalFileBytes": sum(
            x.get("size", 0) for x in expected.values()
        ), "verify": "remote SSH archive full stream and per-member SHA-256",
        "utc": datetime.now(timezone.utc).isoformat(),
    }
    (AUDIT / f"{name}.verified.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    # User explicitly requested offload. Release only this superseded
    # historical UI snapshot *after* complete remote re-read verification.
    shutil.rmtree(src)
    print("VERIFIED_AND_RELEASED", json.dumps(report, sort_keys=True), flush=True)


if __name__ == "__main__":
    try:
        ssh("test -d /Volumes/Expansion && test -w /Volumes/Expansion && mkdir -p " +
            shlex.quote(DEST))
        for name in ALLOW:
            if (SOURCES / name).is_dir():
                archive_and_verify(name)
                continue
            # Safe restart after an earlier fully verified release. A missing
            # local directory is NOT proof of successful offload by itself.
            marker = AUDIT / f"{name}.verified.json"
            if not marker.is_file():
                raise RuntimeError("Source missing without matching verified manifest: " + name)
            report = json.loads(marker.read_text(encoding="utf-8"))
            remote_file = f"{DEST}/{name}.tar.gz"
            if report.get("destination") != f"{REMOTE}:{remote_file}":
                raise RuntimeError("Unexpected prior offload destination for " + name)
            actual = ssh("shasum -a 256 " + shlex.quote(remote_file)).stdout.split()[0]
            if actual != report["archiveSha256"]:
                raise RuntimeError("Previously verified remote archive no longer matches: " + name)
            print("ALREADY_VERIFIED_SOURCE_RELEASED", name, flush=True)
        print("PHYSICAL_EXPANSION_SSH_OFFLOAD_COMPLETE", flush=True)
    except Exception as exc:
        print("OFFLOAD_STOPPED_SOURCE_RETAINED_WHERE_UNVERIFIED:", str(exc),
              file=sys.stderr, flush=True)
        sys.exit(1)
