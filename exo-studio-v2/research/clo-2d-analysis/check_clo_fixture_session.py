#!/usr/bin/env python3
"""Read-only CLO fixture integrity and live-document readiness check.

Run before any native CLO pointer probe. The inspector's window count alone is
insufficient: after a CLO crash, AX may return application nodes as windows.
"""

import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from zipfile import ZipFile, BadZipFile


HERE = Path(__file__).resolve().parent
FIXTURE = HERE / "native-fixtures/Male_T-shirt-direct-test-20261018.zpac"
ORIGINAL = Path.home() / "Documents/clo/Assets/Garment/Male_T-shirt.zpac"
INSPECTOR = Path.home() / "Library/Application Support/EXO-CLO-Inspector/latest-status.json"
OUTPUT = HERE / "CLO_LIVE_FIXTURE_READINESS_20261018.json"


def digest(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            value.update(block)
    return value.hexdigest()


def verify(fixture: Path = FIXTURE, original: Path = ORIGINAL,
           inspector: Path = INSPECTOR) -> dict:
    result = {
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "fixture": str(fixture),
        "fixture_integrity": False,
        "matching_original_bytes": False,
        "live_copied_document_ready": False,
        "warnings": [],
    }
    if not fixture.is_file() or not original.is_file():
        result["warnings"].append("Original or copied test garment missing")
        return result
    result["fixture_sha256"] = digest(fixture)
    result["original_sha256"] = digest(original)
    result["matching_original_bytes"] = result["fixture_sha256"] == result["original_sha256"]
    result["fixture_bytes"] = fixture.stat().st_size

    try:
        with ZipFile(fixture) as archive:
            bad_member = archive.testzip()
            members = archive.namelist()
            pac_members = [n for n in members if n.lower().endswith(".pac")]
            manifest = json.loads(archive.read("clofiles.json").decode("utf-8"))
            result["zip_members"] = members
            result["garment_pac_members"] = pac_members
            result["fixture_integrity"] = (
                bad_member is None
                and len(pac_members) == 1
                and pac_members[0] in manifest
                and b"ZPAC" in fixture.read_bytes()[:32]
            )
            if bad_member:
                result["warnings"].append(f"ZIP CRC mismatch in {bad_member}")
    except (OSError, BadZipFile, KeyError, ValueError, UnicodeDecodeError) as exc:
        result["warnings"].append(f"Cannot validate native CLO package: {exc}")

    if not inspector.is_file():
        result["warnings"].append("Signed CLO inspector has not written status")
        return result
    try:
        state = json.loads(inspector.read_text())
        result["inspector_generated_at"] = state.get("generatedAt")
        result["inspector_accessibility"] = state.get("accessibility", False)
        result["inspector_screen_recording"] = state.get("screenRecording", False)
        windows = state.get("cloWindows", [])
        result["inspector_reported_window_count"] = state.get("cloWindowCount", 0)
        result["reported_window_roles"] = [w.get("role") for w in windows]
        result["reported_window_names"] = [w.get("name") for w in windows]
        def has_copied_tab(node: dict) -> bool:
            needle = "Male_T-shirt-direct-test-20261018.zpac"
            return (
                any(needle == str(node.get(key) or "") for key in ("name", "value"))
                or any(has_copied_tab(child) for child in node.get("children") or [])
            )

        result["live_copied_document_ready"] = bool(
            state.get("accessibility")
            and state.get("screenRecording")
            and len(windows) == 1
            and windows[0].get("role") == "AXWindow"
            and (
                windows[0].get("frame") is None
                or (
                    windows[0]["frame"].get("width", 0) >= 1100
                    and windows[0]["frame"].get("height", 0) >= 800
                )
            )
            and has_copied_tab(windows[0])
        )
        if not result["live_copied_document_ready"]:
            result["warnings"].append(
                "No actual AXWindow for the copied CLO T-shirt; skip native pointer tests"
            )
        result["warnings"].extend(state.get("warnings") or [])
    except (OSError, ValueError, TypeError) as exc:
        result["warnings"].append(f"Cannot read inspector status: {exc}")
    return result


if __name__ == "__main__":
    report = verify()
    OUTPUT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    print(json.dumps({
        "fixture_integrity": report["fixture_integrity"],
        "matching_original_bytes": report["matching_original_bytes"],
        "live_copied_document_ready": report["live_copied_document_ready"],
        "reported_window_roles": report.get("reported_window_roles", []),
        "warnings": report["warnings"],
        "report": str(OUTPUT),
    }, indent=2))
    sys.exit(0 if report["fixture_integrity"] and report["live_copied_document_ready"] else 2)
