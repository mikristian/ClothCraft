# EXO Rust static host

Dependency-free source migration of `../static.mjs`. Requires explicit `--web-root /absolute/path/to/Contents/Resources/web` or `EXO_WEB_ROOT`; `EXO_WEB_PORT` defaults to 5284. Binds to 127.0.0.1 only. GET/HEAD support, MIME types, path decoding and canonical path containment.

Build: `cargo build --offline --manifest-path integrations/clothcraft/rust-static-host/Cargo.toml`.

Parity QA: `node --test integrations/clothcraft/rust-static-host/parity.test.mjs` (requires prior binary build). No Swift launch or package routing has been modified.
