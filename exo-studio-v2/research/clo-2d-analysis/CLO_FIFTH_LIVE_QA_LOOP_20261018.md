# CLO 7 repeated QA loop — startup recovery and reference-test readiness

**Date:** 2026-10-18. **Scope:** CLO Standalone OnlineAuth Academic 7.0.242 on macOS, disposable `Male_T-shirt-direct-test-20261018.zpac` fixture, signed EXO CLO Inspector. User had authorized repeated live testing and accepted crash risk for the disposable document.

## Outcome

**Blocked at CLO application startup. No fresh geometry, notch, sewing, or POM interaction can be credited to this loop.** The preceding fourth live QA loop retains its independently captured evidence for native notch creation/Undo, 1.00 cm allowance, 26.17/26.18 cm sewn side pair, POM table refresh, and reference behavior.

The initial CLO process remained present without an accessible window. The inspector reported `CLO Accessibility window tree unavailable`; a separate old crash dialog was present. The crash dialog was terminated and the stuck application exited by TERM. CLO was restarted both with and without the copied garment. One startup state exposed a small `Information` dialog above the splash screen. The new signed inspector diagnostic added a narrow `--dismiss-clo-launch-information` operation requiring that specific dialog and its `OK` button before it can press anything. An initial implementation compared AXValue for the Information label; inspection showed the accessible heading is provided by AXTitle, and the implementation was corrected and rebuilt with its signature intact. During subsequent retries CLO returned application nodes and ScreenCaptureKit errors instead of a usable garment window, so that guarded action did not report a successful dismissal.

The later inspector capture gave `cloWindowCount=2`, but both records had `role=AXApplication` and no window frame or copied garment filename. Its screenshot capture returned `Failed to start stream due to audio/video capture failure`. **Two reported nodes do not mean two interactable windows.** Pointer tools must require a real `AXWindow` titled for the copied T-shirt.

The copy's archive passed independent validation with Python's ZIP CRC check for all five members: the native `.pac` garment, `clofiles.json`, and three image assets. The package starts with a CLO ZPAC header, its manifest names the garment PAC, and the original and disposable on-disk `.zpac` remained byte-identical:

- File size: **912,850 bytes** each
- SHA-256: `eb24014f28e46cd513ea603a3c441ceeda9dc62bc301d6457848ffe906b87a83`
- ZIP CRC error: **none**

The native CLO unified log includes generic AppKit errors and connections to `com.apple.linkd.autoShortcut`, along with a missing `/private/var/db/DetachedSignatures` path. None of those messages alone establishes the crash cause; this report makes no such claim.

## New reproducible test utility

`check_clo_fixture_session.py` is a read-only status gate. It verifies the native garment archive contents, SHA-256 equality with the original and current signed inspector state. It treats `AXApplication` objects as invalid document windows even if `cloWindowCount` is nonzero. It writes `CLO_LIVE_FIXTURE_READINESS_20261018.json` and exits code **2** if native CLO is not ready, versus code **0** when both package integrity and real copied document window readiness pass.

`test_clo_fixture_session.py` runs three deterministic tests of actual fixture CRC integrity plus synthetic inspector states:

1. Reject two `AXApplication` nodes despite `cloWindowCount=2`.
2. Accept a valid `AXWindow` with the exact copied T-shirt title when fixture CRC and permissions are good.
3. Reject corrupted test-package bytes even with an otherwise valid copied-document window.

`python3 -m unittest discover -s research/clo-2d-analysis -p test_clo_fixture_session.py -v`: **3/3 pass**. Running the readiness check on the actual Mac: **native fixture passes, document-window readiness fails**, as intended. The signed inspector passes `codesign --verify --strict`, and the Swift helper diff passes `git diff --check`. This round edited inspector diagnostic source and research test/report files only; no production EXO geometry or garment files were altered.

## Next live test once CLO's pattern window is available

With the readiness check returning 0 and the copied T-shirt visible:

1. Create a named Type I notch on a known left torso edge, note its name, length and normalized position.
2. Attach/inspect a 1.00 cm seam allowance and its start/end junction types; select and measure both sides of the sewing pair.
3. Insert a true topology point on the same edge, separately select the two new child edges, and record the notch and allowance properties after the split. Compare sewing pair lengths and the position of the notch relative to the original full edge.
4. Undo/Redo each operation while checking the exact same named notch, sewing relationship and POM records. Export a supported manufacturer pattern only after the in-memory checks are complete, and independently compare geometric elements and units. Screenshots alone cannot prove hidden native IDs.

There are **no newly verified native pattern behaviors from this fifth loop**. The useful result is a validated, fail-closed gate that prevents accidentally interpreting a crashed CLO window tree as successful reference testing, plus a confirmed intact disposable garment package for recovery.
