#!/usr/bin/env python3
"""Archive historical EXO build snapshots via the already-mounted Expansion tunnel.

Uses standard tar hard links to store identical contents once. Both normal files
and duplicates can be restored with 'tar -xzf <archive>'. Input directories are
deleted only after a complete streamed *remote* re-read verifies each file's
SHA-256 and archive structure; active installations are never candidates.

Usage:
 python3 scripts/exo-expansion-offload.py --source-root PATH --prefix NAME \
    --destination PATH --batch-name NAME --items DIR1 DIR2
"""
import argparse
import gzip
import hashlib
import json
import os
import shutil
import sys
import tarfile
from pathlib import Path

BUF = 1024 * 1024


def digest_file(path):
    hasher = hashlib.sha256()
    with open(path, "rb") as source:
        while True:
            data = source.read(BUF)
            if not data:
                break
            hasher.update(data)
    return hasher.hexdigest()


def items_in(directory):
    yield directory
    for base, folders, files in os.walk(str(directory), topdown=True, followlinks=False):
        folders.sort()
        files.sort()
        for name in folders + files:
            yield Path(base) / name


def archive_batch(args):
    root = Path(args.source_root).resolve(strict=True)
    destination = Path(args.destination).resolve(strict=True)
    requested = list(args.items)
    if not requested or len(set(requested)) != len(requested):
        raise ValueError("Specify distinct historical snapshot directory names")
    if not args.batch_name or any(c not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_" for c in args.batch_name):
        raise ValueError("Invalid batch name")
    for name in requested:
        if name in (".", "..") or Path(name).name != name:
            raise ValueError("Only direct child snapshot names are allowed: " + name)
        directory = root / name
        if not directory.is_dir() or directory.is_symlink() or directory.resolve().parent != root:
            raise ValueError("Not a safe snapshot directory: " + str(directory))

    destination_archive = destination / (args.batch_name + ".tar.gz")
    upload = destination / (args.batch_name + ".tar.gz.uploading")
    manifest_path = destination / (args.batch_name + ".manifest.json")
    if destination_archive.exists() or manifest_path.exists():
        raise FileExistsError("Completed archive or manifest already exists")
    if bool(upload.exists()) != bool(args.resume):
        raise FileExistsError("Use --resume only for an existing staged archive")
    expected = {}
    original_state = {}
    seen = {}
    original_bytes = 0
    saved_by_links = 0
    print("START", args.batch_name, len(requested), "snapshots", flush=True)

    # Resume reconstructs the complete source checksum manifest without
    # overwriting an existing WebDAV upload; the duplicate payload stream is
    # discarded locally, then the remote staged archive is verified anew.
    with open(os.devnull if args.resume else str(upload), "wb") as target:
        with gzip.GzipFile(fileobj=target, mode="wb", compresslevel=1, mtime=0) as compressed:
          with tarfile.open(fileobj=compressed, mode="w|",
                            format=tarfile.PAX_FORMAT) as tar:
            for name in requested:
                source = root / name
                for path in items_in(source):
                    rel = path.relative_to(root)
                    member_name = args.prefix + "/" + rel.as_posix()
                    info = tar.gettarinfo(str(path), arcname=member_name)
                    if info is None:
                        raise RuntimeError("Unsupported snapshot entry: " + str(path))
                    stat = path.lstat()
                    original_state[str(path)] = (stat.st_size, stat.st_mtime_ns, stat.st_mode)
                    if path.is_symlink():
                        expected[member_name] = {"kind": "symlink", "link": os.readlink(str(path))}
                        tar.addfile(info)
                    elif path.is_dir():
                        expected[member_name] = {"kind": "directory"}
                        tar.addfile(info)
                    elif path.is_file():
                        checksum = digest_file(path)
                        file_size = stat.st_size
                        original_bytes += file_size
                        key = (file_size, checksum)
                        expected[member_name] = {"kind": "file", "size": file_size, "sha256": checksum}
                        if key in seen:
                            info.type = tarfile.LNKTYPE
                            info.linkname = seen[key]
                            info.size = 0
                            tar.addfile(info)
                            saved_by_links += file_size
                        else:
                            info.type = tarfile.REGTYPE
                            info.linkname = ""
                            info.size = file_size
                            with open(str(path), "rb") as content:
                                tar.addfile(info, fileobj=content)
                            seen[key] = member_name
                    else:
                        raise RuntimeError("Unsupported snapshot node: " + str(path))
                print("PACKED", name, flush=True)
    print("UPLOADED", str(upload), "bytes", upload.stat().st_size, flush=True)

    checked = set()
    observed = {}
    # Sequential read from the Expansion-backed archive validates gzip CRC
    # and every restored logical file, including hardlinks and exact names.
    with tarfile.open(str(upload), mode="r|gz") as tar:
        for member in tar:
            if member.name in checked or member.name not in expected:
                raise RuntimeError("Duplicate or unexpected member: " + member.name)
            checked.add(member.name)
            entry = expected[member.name]
            if member.isfile():
                if entry["kind"] != "file" or member.size != entry["size"]:
                    raise RuntimeError("File metadata mismatch: " + member.name)
                hasher = hashlib.sha256()
                content = tar.extractfile(member)
                while True:
                    data = content.read(BUF)
                    if not data:
                        break
                    hasher.update(data)
                actual = hasher.hexdigest()
                if actual != entry["sha256"]:
                    raise RuntimeError("Remote file digest mismatch: " + member.name)
                observed[member.name] = actual
            elif member.islnk():
                if entry["kind"] != "file" or member.linkname not in observed:
                    raise RuntimeError("Invalid hardlink target: " + member.name)
                if observed[member.linkname] != entry["sha256"]:
                    raise RuntimeError("Hardlink digest mismatch: " + member.name)
                observed[member.name] = observed[member.linkname]
            elif member.issym():
                if entry != {"kind": "symlink", "link": member.linkname}:
                    raise RuntimeError("Symlink target mismatch: " + member.name)
            elif member.isdir():
                if entry["kind"] != "directory":
                    raise RuntimeError("Directory mismatch: " + member.name)
            else:
                raise RuntimeError("Unsupported remote member: " + member.name)
    if checked != set(expected):
        raise RuntimeError("Remote archive is missing members")

    for original, (size, mtime, mode) in original_state.items():
        st = os.lstat(original)
        if (st.st_size, st.st_mtime_ns, st.st_mode) != (size, mtime, mode):
            raise RuntimeError("Source changed during transfer; keeping all originals")

    metadata = {
        "schema": 1, "batch": args.batch_name,
        "source_root": str(root), "prefix": args.prefix,
        "archive": destination_archive.name, "snapshots": requested,
        "original_file_bytes": original_bytes,
        "identical_payload_bytes_saved": saved_by_links,
        "remote_archive_bytes": upload.stat().st_size,
        "members": expected,
        "status": "verified_by_remote_stream_sha256",
    }
    staged_manifest = destination / (args.batch_name + ".manifest.json.uploading")
    if staged_manifest.exists():
        raise FileExistsError("Staged manifest already exists")
    staged_manifest.write_text(json.dumps(metadata, indent=2, sort_keys=True), encoding="utf-8")
    staged_manifest.replace(manifest_path)
    upload.replace(destination_archive)
    if not destination_archive.is_file() or not manifest_path.is_file():
        raise RuntimeError("Remote verified archive or manifest disappeared; retain originals")
    print("REMOTE_VERIFIED", args.batch_name, "members", len(expected),
          "original_bytes", original_bytes, "archive_bytes", metadata["remote_archive_bytes"],
          flush=True)
    for name in requested:
        original = root / name
        if not original.is_dir() or original.is_symlink():
            raise RuntimeError("Source altered before release: " + str(original))
        shutil.rmtree(str(original))
        print("RELEASED_LOCAL", name, flush=True)
    print("COMPLETE", args.batch_name, flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-root", required=True)
    parser.add_argument("--destination", required=True)
    parser.add_argument("--prefix", required=True)
    parser.add_argument("--batch-name", required=True)
    parser.add_argument("--items", nargs="+", required=True)
    parser.add_argument("--resume", action="store_true", help="Verify a staged WebDAV upload and release sources if valid")
    args = parser.parse_args()
    if "/" in args.prefix or args.prefix in ("", ".", ".."):
        parser.error("Prefix must be one safe directory name")
    archive_batch(args)


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print("OFFLOAD_NOT_COMPLETED:", str(error), file=sys.stderr, flush=True)
        sys.exit(1)
