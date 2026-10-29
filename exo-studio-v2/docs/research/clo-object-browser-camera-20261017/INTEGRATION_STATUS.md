# EXO V2 — Object Browser and Camera Property Editor

Reference: local Mac Downloads screenshot taken 2026-10-17 at 5:34:47 PM, inspected as a temporary workspace reference.

## Implemented

- Three-bullet Object Browser hierarchy uses smaller type, neutral gray indented rows, more whitespace and no repeated horizontal row dividers.
- Environment expands to Camera → Default Camera, Light → 3D → two Light objects, Render, Simulation Properties, Render_Image/Video Properties, Render_Light Properties and Render_Render Properties. Selected row stays visible as the Property Editor changes below.
- Camera Property Editor: editable name, Field of View, spherical or orthographic view type, distance in millimetres, horizontal/vertical angles, near/far clipping planes, Physical Camera enable, focal length and sensor width. Sliders and numeric values support immediate or commit-on-blur/Enter edits, including signed angles.
- Properties write real project.render.camera values via existing project mutation and saving workflows. Native ClothCraftSceneV2 and legacy GarmentViewport apply live camera position, lens projection, clipping and physical focal length without changing cloth physics.
- Two Light items edit separate key/fill intensity and color. Environment preset, exposure, background visibility and render image dimensions map to existing render settings.
- Initial Camera values match factory viewports (native FOV 34 degrees and distance 3982 mm; draft FOV 34 degrees and distance 4276 mm), avoiding unexpected initial jumps.

## Verification

- npm run build: PASS (1,921 modules).
- Camera math smoke: spherical, orthographic and physical-camera projection passed lens, distance, orientation, clipping and nondegenerate matrix checks.
- Integration QA script: integrations/clothcraft/qa-v2-environment-camera-20261017.mjs PASS in isolated Rust/Vite/Chrome. FOV 55 degrees, distance 2400 mm, horizontal 35 degrees, vertical 18 degrees, near 25 mm, far 125000 mm, Physical Camera enabled, orthographic selected; native viewport canvas reflected each setting. Key light intensity changed from 2.6 to 5.2. Environment tree remained open, Fabric tab restored ordinary inspector; zero JS errors.
- Installed signed EXO V2 web-only update: PASS, two native panels, bridge ready, WebAssembly ABI checks, no browser exceptions or texture warnings. Read-only installed UI check confirmed the Environment hierarchy and Camera inspector defaults.
- Prior web UI backup: integrations/clothcraft/output/app-backups/EXO-V2-web-before-camera-environment-inspector-20261017.

## Boundaries

This is a UI reference, not a declaration of complete CLO parity. Image/video properties expose existing still-render dimensions; the app has not gained a video encoding pipeline. Simulation Properties use existing simulation controls, not unimplemented fake sliders. The isolated Rust test fixture displayed a transient fetch banner with zero geometry; separate installed-app native smoke confirmed the bridge and two garment panels. No user saved garments were edited by QA.
