#!/usr/bin/env python3
"""Check the CLO native probe fails closed when a crash corrupts window discovery."""

import json
import shutil
import tempfile
import unittest
from pathlib import Path

from check_clo_fixture_session import FIXTURE, verify


class CLOFixtureReadinessTests(unittest.TestCase):
    def setUp(self):
        self.workspace = tempfile.TemporaryDirectory()
        root = Path(self.workspace.name)
        self.fixture = root / "copied.zpac"
        self.original = root / "original.zpac"
        self.inspector = root / "latest-status.json"
        shutil.copyfile(FIXTURE, self.fixture)
        shutil.copyfile(FIXTURE, self.original)

    def tearDown(self):
        self.workspace.cleanup()

    def set_status(self, windows, **extra):
        state = {
            "generatedAt": "2026-10-18T18:00:00Z",
            "cloWindowCount": len(windows),
            "cloWindows": windows,
            "accessibility": True,
            "screenRecording": True,
        }
        state.update(extra)
        self.inspector.write_text(json.dumps(state))

    def test_real_fixture_is_valid_but_ax_application_nodes_block_clicks(self):
        self.set_status([
            {"role": "AXApplication", "name": "CLO_Standalone_OnlineAuth"},
            {"role": "AXApplication", "name": "CLO_Standalone_OnlineAuth"},
        ])
        result = verify(self.fixture, self.original, self.inspector)
        self.assertTrue(result["fixture_integrity"])
        self.assertTrue(result["matching_original_bytes"])
        self.assertEqual(result["inspector_reported_window_count"], 2)
        self.assertFalse(result["live_copied_document_ready"])

    def test_actual_copied_document_window_enables_probe(self):
        self.set_status([
            {
                "role": "AXWindow", "name": "CLO Standalone OnlineAuth Academic",
                "frame": {"width": 1512, "height": 900},
                "children": [
                    {"role": "AXGroup", "name": "Male_T-shirt-direct-test-20261018.zpac"}
                ],
            }
        ])
        result = verify(self.fixture, self.original, self.inspector)
        self.assertTrue(result["live_copied_document_ready"])

    def test_corrupted_native_fixture_never_passes_integrity(self):
        self.set_status([
            {"role": "AXWindow", "name": "Male_T-shirt-direct-test-20261018.zpac"}
        ])
        self.fixture.write_bytes(b"not a CLO pattern package")
        result = verify(self.fixture, self.original, self.inspector)
        self.assertFalse(result["fixture_integrity"])
        self.assertFalse(result["matching_original_bytes"])
        self.assertTrue(result["warnings"])


if __name__ == "__main__":
    unittest.main()
