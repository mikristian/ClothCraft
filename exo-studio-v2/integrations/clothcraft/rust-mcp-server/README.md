# EXO Rust MCP stdio bridge

Standalone Rust replacement for `../mcp-server.mjs`. It is a thin JSON-RPC 2.0 facade over the **existing** localhost `agent/v1` API, not a second simulation process. It exposes the same ten MCP tools, descriptions, input schemas, read-only defaults, and action mapping as the Node implementation.

## Build and exercise

From the EXO project root:

```sh
$HOME/.cargo/bin/cargo build --locked --offline --manifest-path integrations/clothcraft/rust-mcp-server/Cargo.toml
$HOME/.cargo/bin/cargo test --locked --offline --manifest-path integrations/clothcraft/rust-mcp-server/Cargo.toml
node --test integrations/clothcraft/rust-mcp-server/parity.test.mjs
```

The integration test runs the original Node MCP implementation and the Rust binary as separate child processes, with an ephemeral mock localhost HTTP bridge. It compares tool schemas, JSON-RPC responses, API paths, HTTP methods, request JSON, bearer forwarding, edit permissions, malformed calls, and HTTP failure handling, including chunked responses. Neither child interacts with a real garment.

To run this implementation explicitly instead of the Node MCP process, configure the MCP client's stdio executable to:

```
integrations/clothcraft/rust-mcp-server/target/debug/exo-rust-mcp-server
```

Environment variables are the same as the existing Node tool: `EXO_MCP_BRIDGE_URL` defaults to `http://127.0.0.1:5385`, `EXO_CLOTHCRAFT_AGENT_KEY` (or legacy `EXO_AGENT_API_TOKEN`) supplies a bearer credential, and `EXO_MCP_ALLOW_EDITS=1` enables mutating tools. The bridge refuses non-loopback HTTP addresses. This binary handles one stdin JSON-RPC line at a time and serializes HTTP requests. Its HTTP client is intentionally limited to localhost HTTP/1.1; this matches the EXO V2 bridge transport.

## Remaining deployment work

This crate is **source-only**. No installed bundle or MCP client configuration was changed. A future packaging step can build this crate with the release Cargo toolchain and stage the executable into `Contents/Resources`, followed by explicit MCP client selection and verification against the packaged `agent/v1` API. The native solver and React app are untouched.
