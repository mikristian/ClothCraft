# EXO CLO Inspector — native permission isolation

The CLO inspection task previously ran through Chat On Steroids.app → zsh → osascript/Swift. Although the user authorized Chat On Steroids, those subprocesses received macOS TCC denial code -25211 (Accessibility) and false (Screen Recording). The main Chat On Steroids package is ad-hoc signed and has no stable Apple Developer Team ID. We cannot claim that is the only reason macOS denied these requests because macOS's TCC database was not readable, but this isolated bridge removes both concerns.

## Installed implementation

The app at ~/Applications/EXO CLO Inspector.app is a real, signed native macOS application, not a browser wrapper and not a temporary terminal process. Its unique bundle identifier is com.mikristian.exo.cloinspector. Its stable developer signing identity provides a separately identifiable entry for Privacy & Security. By default it uses ScreenCaptureKit to capture only the CLO application window and macOS Accessibility APIs to inspect only CLO's read-only window hierarchy; this normal mode does not click or edit. There is no external networking or background monitoring. The app is an accessory one-shot process that exits after writing its report.

### Explicit direct CLO 7 testing (October 18, 2026)

The user authorized direct CLO tests through Chat On Steroids MCP. The signed inspector now accepts opt-in, one-shot flags that can **select** or **drag** points only in a copied `Male_T-shirt-direct-test-20261018.zpac` fixture, with named before/after and Undo screenshots. Its unflagged behavior remains read-only. The copied garment is kept at `research/clo-2d-analysis/native-fixtures/` and is never saved back by the probe. All mutating gesture flags check that the visible document is the exact copy, with one CLO window and the expected workspace dimensions. The installed original asset was reopened after direct tests.

Supported flags: `--probe-edit-pattern` (select actual toolbar), `--probe-select-point` (click original sample's previously inspected point), `--confirm-open-garment` (confirm CLO's real Open Garment dialog), `--probe-fixture-segment`, `--probe-fixture-neckline`, `--probe-fixture-point-drag`, `--probe-fixture-curve-handle`, and `--probe-fixture-undo-only`. These coordinate-based test gestures depend on the exact measured CLO 7 viewport and should only be run after verifying the current screenshot. A source-linked direct-run report with screenshots and exact centimetre readouts is at `research/clo-2d-analysis/clo7-direct-mcp-gesture-audit-20261018.md`.

Reports are written with private permissions to ~/Library/Application Support/EXO-CLO-Inspector/latest-status.json. When Screen Recording has been approved, a screenshot is stored at clo-property-editor-reference.png in the same directory. Neither file is transmitted elsewhere or added to Git.

Build from this folder using EXO_INSPECTOR_SIGN_IDENTITY with a valid signing identity and build.sh. The helper is separately signed and installed and does not modify Chat On Steroids, CLO3D or EXO Studio V1/V2. Do not rebuild or re-sign an already-authorized app unless necessary; changing signing identity may invalidate macOS privacy approvals.

To run, use the macOS open command with the path ~/Applications/EXO CLO Inspector.app, then check its JSON report. For initial authorization launch with the --request-permissions argument and add **EXO CLO Inspector** (not another Chat On Steroids entry) in System Settings → Privacy & Security → Accessibility and Screen & System Audio Recording. If the OS prompts, choose Allow. Run verify.sh to recheck read-only capture and Accessibility.

### Verified result, October 16, 2026

The installed helper was signed with an available Apple Development identity (Team ID MVU66XV7GK), and both permissions are now authorized for this dedicated native app. The verification script passed with Accessibility true, Screen Recording true, one CLO window and a real 1512 × 900 image captured at the private screenshot path. The Accessibility inspector returned real CLO controls including Simulate, sewing, buttons, zippers, binding, graphics and the CLO window title. The unmodified original Chat On Steroids app may still be denied access when its shell commands inspect macOS directly; all CLO GUI inspections should use the dedicated signed helper to retain the verified approval.

Privacy consent cannot be granted programmatically by an app or an agent. The recorded result above reflects macOS reporting both permissions as authorized for the signed helper.

## CLO7 audit extensions

The signed inspector now records each visible Accessibility node's global rectangle alongside its role, title and visible text. Both live CLO strips are independently measured: **3D A at x232, 3D B at x268, 2D A at x1096, 2D B at x1132**, giving 20 / 18 / 17 / 15 named controls respectively. These are authoritative observed CLO7 command names and vertical positions in the current 1512×900 window, not a guess based on icon appearance.

Optional, explicit one-shot flags:

- `--select-fabric`: uses an AX-located “FABRIC 1” row to select the existing fabric without editing or saving. Enables a real CLO Fabric Property Editor view.
- `--scroll-property`: scrolls the current CLO Property Editor to inspect sections below its visible fold, then captures a fresh window image. Never clicks a property or saves the file.

The initial fabric screenshot confirms “Information” (Name, Item No., Construction, Supplier, Owner), then “Material” (PBR, Front/Back/Side), with deeper material “Texture Mapping”, “Type: Fabric_Matte”, “Basic Parameters” (Texture, Normal Map, Displacement Map, Color, Opacity, Opacity Map) and “Reflection”. Full selected-pattern controls remain conditional on loading a pattern, not possible to infer from the currently empty CLO scene.
