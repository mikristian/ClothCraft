# EXO foam preview kernel

`exo-foam-kernel` ports the 3D studio's bounded local foam-preview integration and radial press mask to native Rust/WebAssembly. It preserves the previous preview behavior: centimetres, kPa, seconds, maximum dt 0.25 s, 240 Hz internal integration, and the original damping/memory law. It is **not** an experimentally calibrated material law and does not replace the VBD/OGC garment solver.

Build and test via `node scripts/build-rust-foam-kernel.mjs` from project root. The script uses locked offline Cargo and produces `public/wasm/exo_foam_kernel.wasm` with a SHA-256 sidecar. `node scripts/qa-rust-foam-kernel.mjs` compares production `stepFoamCompressionState` and `foamPressFalloff` before and after loading real Rust WASM across contact, memory, pressure, recovery and bad-input sequences. The existing `node scripts/qa-foam-compression.mjs` test also runs unchanged.

The existing synchronous public functions still normalize input in JavaScript. Once the WebAssembly binary loads, the physical preview integration loop and contact falloff run in Rust; until that point, the original computation remains available. The WASM interface uses one synchronous `exo_foam_advance` call and reads five scalar results immediately. It assumes single-threaded browser calls; concurrent native programs should call the safe Rust `advance` function directly.
