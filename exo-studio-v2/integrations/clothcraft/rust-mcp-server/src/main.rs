use serde_json::{json, Map, Value};
use std::env;
use std::io::{self, BufRead, Read, Write};
use std::net::{TcpStream, ToSocketAddrs};
use std::time::Duration;

const EDIT_DISABLED: &str = "Editing disabled. Launch MCP with EXO_MCP_ALLOW_EDITS=1 only after reviewing actions and project revisions.";
const INVALID_ARGS: &str = "Invalid or missing tool arguments";

struct Spec {
    name: &'static str,
    description: &'static str,
    fields: &'static [&'static str],
    required: &'static [&'static str],
    read_only: bool,
    action: Option<&'static str>,
}

const SPECS: &[Spec] = &[
    Spec { name: "exo_capabilities", description: "Inspect the exact native EXO agent capabilities and limitations.", fields: &[], required: &[], read_only: true, action: None },
    Spec { name: "exo_status", description: "Read the local native garment session status.", fields: &[], required: &[], read_only: true, action: None },
    Spec { name: "exo_project_summary", description: "Read panel, material and sewing summaries from the current Rust project.", fields: &[], required: &[], read_only: true, action: Some("workspace.summary") },
    Spec { name: "exo_workspace_save", description: "Save the currently loaded native garment after checking its revision.", fields: &["expectedRevision"], required: &["expectedRevision"], read_only: false, action: Some("workspace.save") },
    Spec { name: "exo_workspace_undo", description: "Undo one native authoring action at the current revision.", fields: &["expectedRevision"], required: &["expectedRevision"], read_only: false, action: Some("workspace.undo") },
    Spec { name: "exo_workspace_redo", description: "Redo one native authoring action at the current revision.", fields: &["expectedRevision"], required: &["expectedRevision"], read_only: false, action: Some("workspace.redo") },
    Spec { name: "exo_line_inspect", description: "Measure a named edge in real 2D and 3D geometry.", fields: &["panel", "edge"], required: &["panel", "edge"], read_only: true, action: Some("line.inspect") },
    Spec { name: "exo_step_simulation", description: "Advance the actual Rust cloth solver 1–4 steps; requires the current revision and EXO_MCP_ALLOW_EDITS=1.", fields: &["expectedRevision", "steps"], required: &["expectedRevision", "steps"], read_only: false, action: Some("simulation.step") },
    Spec { name: "exo_pause_simulation", description: "Pause the native solver at a verified revision; requires EXO_MCP_ALLOW_EDITS=1.", fields: &["expectedRevision"], required: &["expectedRevision"], read_only: false, action: Some("simulation.pause") },
    Spec { name: "exo_set_line_target", description: "Set a 2D pattern line target specification in centimeters (annotation, no physical deformation). Requires EXO_MCP_ALLOW_EDITS=1.", fields: &["expectedRevision", "panel", "edge", "targetCm"], required: &["expectedRevision", "panel", "edge", "targetCm"], read_only: false, action: Some("line.setTargetSpecification") },
];

fn schema_field(name: &str) -> Value {
    match name {
        "expectedRevision" => json!({"type":"integer","minimum":0}),
        "steps" => json!({"type":"integer","minimum":1,"maximum":4}),
        "targetCm" => json!({"type":"number","minimum":0.01,"maximum":1000}),
        _ => json!({"type":"string"}),
    }
}

fn list_tools() -> Value {
    Value::Array(SPECS.iter().map(|spec| {
        let properties: Map<String, Value> = spec.fields.iter().map(|field| (field.to_string(), schema_field(field))).collect();
        json!({
            "name": spec.name,
            "description": spec.description,
            "inputSchema": {"type":"object","properties":properties,"required":spec.required,"additionalProperties":false},
            "annotations": {"readOnlyHint":spec.read_only,"destructiveHint":false,"openWorldHint":false}
        })
    }).collect())
}

// Only an explicitly loopback IPv4/IPv6/localhost HTTP origin may receive tokens.
fn parse_bridge(input: &str) -> Result<(String, u16), String> {
    const ERROR: &str = "EXO MCP requires an explicit loopback bridge URL";
    let rest = input.strip_prefix("http://").ok_or(ERROR)?;
    let authority = rest.split(['/', '?', '#']).next().ok_or(ERROR)?;
    if !rest[authority.len()..].is_empty() && &rest[authority.len()..] != "/" {
        return Err(ERROR.to_owned());
    }
    if authority.contains('@') {
        return Err(ERROR.to_owned());
    }
    let (host, port_string) = if let Some(after) = authority.strip_prefix('[') {
        let end = after.find(']').ok_or(ERROR)?;
        let host = &after[..end];
        let suffix = &after[end + 1..];
        if !suffix.is_empty() && !suffix.starts_with(':') {
            return Err(ERROR.to_owned());
        }
        (host, suffix.strip_prefix(':'))
    } else {
        let (host, port) = authority
            .split_once(':')
            .map_or((authority, None), |(h, p)| (h, Some(p)));
        (host, port)
    };
    if !matches!(host, "127.0.0.1" | "localhost" | "::1") {
        return Err(ERROR.to_owned());
    }
    if host == "::1" && !authority.starts_with('[') {
        return Err(ERROR.to_owned());
    }
    let port = match port_string {
        Some("") => return Err(ERROR.to_owned()),
        Some(s) => s.parse::<u16>().map_err(|_| ERROR)?,
        None => 80,
    };
    if port == 0 {
        return Err(ERROR.to_owned());
    }
    Ok((host.to_owned(), port))
}

fn find_bytes(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    haystack
        .windows(needle.len())
        .position(|window| window == needle)
}

fn decode_chunked(input: &[u8]) -> Result<Vec<u8>, String> {
    let mut cursor = 0;
    let mut result = Vec::new();
    loop {
        let end = find_bytes(&input[cursor..], b"\r\n")
            .ok_or("EXO bridge returned invalid JSON")?
            + cursor;
        let line = std::str::from_utf8(&input[cursor..end])
            .map_err(|_| "EXO bridge returned invalid JSON")?;
        let size = usize::from_str_radix(line.split(';').next().unwrap_or(""), 16)
            .map_err(|_| "EXO bridge returned invalid JSON")?;
        cursor = end + 2;
        if size == 0 {
            return Ok(result);
        }
        if size > 8 * 1024 * 1024
            || cursor
                .checked_add(size + 2)
                .filter(|end| *end <= input.len())
                .is_none()
        {
            return Err("EXO bridge returned invalid JSON".into());
        }
        result.extend_from_slice(&input[cursor..cursor + size]);
        cursor += size;
        if &input[cursor..cursor + 2] != b"\r\n" {
            return Err("EXO bridge returned invalid JSON".into());
        }
        cursor += 2;
    }
}

fn request(
    host: &str,
    port: u16,
    endpoint: &str,
    body: Option<Value>,
    token: Option<&str>,
) -> Result<Value, String> {
    let authority = if host == "::1" { "[::1]" } else { host };
    let destinations = (host, port).to_socket_addrs().map_err(|e| e.to_string())?;
    let mut last_error = None;
    let mut stream = None;
    for address in destinations {
        match TcpStream::connect_timeout(&address, Duration::from_secs(5)) {
            Ok(s) => {
                stream = Some(s);
                break;
            }
            Err(e) => last_error = Some(e),
        }
    }
    let mut stream = stream
        .ok_or_else(|| last_error.map_or("Bridge unreachable".to_owned(), |e| e.to_string()))?;
    stream
        .set_read_timeout(Some(Duration::from_secs(20)))
        .map_err(|e| e.to_string())?;
    stream
        .set_write_timeout(Some(Duration::from_secs(20)))
        .map_err(|e| e.to_string())?;
    let serialized = body.as_ref().map(Value::to_string).unwrap_or_default();
    let mut headers = format!(
        "{} {} HTTP/1.1\r\nHost: {}:{}\r\nAccept: application/json\r\nConnection: close\r\n",
        if body.is_some() { "POST" } else { "GET" },
        endpoint,
        authority,
        port
    );
    if let Some(token) = token {
        if token.contains(['\r', '\n']) {
            return Err("Invalid agent token".into());
        }
        headers.push_str(&format!("Authorization: Bearer {token}\r\n"));
    }
    if body.is_some() {
        headers.push_str(&format!(
            "Content-Type: application/json\r\nContent-Length: {}\r\n",
            serialized.len()
        ));
    }
    headers.push_str("\r\n");
    stream
        .write_all(headers.as_bytes())
        .and_then(|_| stream.write_all(serialized.as_bytes()))
        .map_err(|e| e.to_string())?;
    let mut response = Vec::new();
    stream
        .take(8 * 1024 * 1024 + 4096)
        .read_to_end(&mut response)
        .map_err(|e| e.to_string())?;
    let split = find_bytes(&response, b"\r\n\r\n").ok_or("EXO bridge returned invalid JSON")?;
    let header =
        std::str::from_utf8(&response[..split]).map_err(|_| "EXO bridge returned invalid JSON")?;
    let status = header
        .lines()
        .next()
        .and_then(|line| line.split_whitespace().nth(1))
        .and_then(|n| n.parse::<u16>().ok())
        .ok_or("EXO bridge returned invalid JSON")?;
    let data = &response[split + 4..];
    let payload_bytes = if header.lines().any(|line| {
        line.to_ascii_lowercase().starts_with("transfer-encoding:")
            && line.to_ascii_lowercase().contains("chunked")
    }) {
        decode_chunked(data)?
    } else {
        data.to_vec()
    };
    let payload: Value =
        serde_json::from_slice(&payload_bytes).map_err(|_| "EXO bridge returned invalid JSON")?;
    if !(200..300).contains(&status) || payload.get("ok") == Some(&Value::Bool(false)) {
        let reason = payload
            .get("error")
            .or_else(|| payload.get("code"))
            .and_then(Value::as_str)
            .map(str::to_owned)
            .unwrap_or_else(|| format!("EXO service returned HTTP {status}"));
        return Err(reason);
    }
    Ok(payload)
}

struct Config {
    host: String,
    port: u16,
    allow_edits: bool,
    token: Option<String>,
}

fn call(config: &Config, name: Option<&str>, args: Value) -> Result<Value, String> {
    let spec = SPECS
        .iter()
        .find(|spec| Some(spec.name) == name)
        .ok_or("Unsupported tool")?;
    let object = args.as_object().ok_or(INVALID_ARGS)?;
    if object
        .keys()
        .any(|field| !spec.fields.contains(&field.as_str()))
        || spec
            .required
            .iter()
            .any(|field| !object.contains_key(*field))
    {
        return Err(INVALID_ARGS.into());
    }
    if !spec.read_only && !config.allow_edits {
        return Err(EDIT_DISABLED.into());
    }
    let (endpoint, body) = if spec.name == "exo_capabilities" {
        ("/agent/v1/capabilities", None)
    } else if spec.name == "exo_status" {
        ("/agent/v1/status", None)
    } else {
        let mut command = object.clone();
        command.insert("action".into(), Value::String(spec.action.unwrap().into()));
        ("/agent/v1/actions", Some(Value::Object(command)))
    };
    let result = request(
        &config.host,
        config.port,
        endpoint,
        body,
        config.token.as_deref(),
    )?;
    Ok(json!({"content":[{"type":"text","text":result.to_string()}],"isError":false}))
}

fn message(config: &Config, parsed: Result<Value, serde_json::Error>) -> Option<Value> {
    let data = match parsed {
        Ok(v) => v,
        Err(e) => {
            return Some(
                json!({"jsonrpc":"2.0","id":null,"error":{"code":-32600,"message":e.to_string()}}),
            )
        }
    };
    let id = data.get("id").cloned().unwrap_or(Value::Null);
    let valid = data.get("jsonrpc") == Some(&Value::String("2.0".into()))
        && data.get("method").and_then(Value::as_str).is_some();
    if !valid {
        return Some(
            json!({"jsonrpc":"2.0","id":id,"error":{"code":-32600,"message":"Invalid JSON-RPC"}}),
        );
    }
    if data.get("id").is_none() {
        return None;
    }
    let response = match data["method"].as_str().unwrap() {
        "initialize" => {
            json!({"result":{"protocolVersion":"2025-03-26","capabilities":{"tools":{"listChanged":false}},"serverInfo":{"name":"exo-clothcraft-local","version":"0.1.0"}}})
        }
        "ping" => json!({"result":{}}),
        "tools/list" => json!({"result":{"tools":list_tools()}}),
        "tools/call" => {
            let params = data.get("params");
            let name = params.and_then(|v| v.get("name")).and_then(Value::as_str);
            let args = params
                .and_then(|v| v.get("arguments"))
                .filter(|v| !v.is_null())
                .cloned()
                .unwrap_or_else(|| json!({}));
            let result = match call(config, name, args) {
                Ok(result) => result,
                Err(error) => json!({"content":[{"type":"text","text":error}],"isError":true}),
            };
            json!({"result":result})
        }
        _ => json!({"error":{"code":-32601,"message":"Method not found"}}),
    };
    let mut result = response.as_object().unwrap().clone();
    result.insert("jsonrpc".into(), Value::String("2.0".into()));
    result.insert("id".into(), id);
    Some(Value::Object(result))
}

fn main() {
    let origin = env::var("EXO_MCP_BRIDGE_URL").unwrap_or_else(|_| "http://127.0.0.1:5385".into());
    let (host, port) = match parse_bridge(&origin) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("{e}");
            std::process::exit(1);
        }
    };
    let config = Config {
        host,
        port,
        allow_edits: env::var("EXO_MCP_ALLOW_EDITS").ok().as_deref() == Some("1"),
        token: env::var("EXO_CLOTHCRAFT_AGENT_KEY")
            .ok()
            .filter(|t| !t.is_empty())
            .or_else(|| {
                env::var("EXO_AGENT_API_TOKEN")
                    .ok()
                    .filter(|t| !t.is_empty())
            }),
    };
    let stdout = io::stdout();
    let mut out = stdout.lock();
    for line in io::stdin().lock().lines() {
        match line {
            Ok(line) => {
                if let Some(value) = message(&config, serde_json::from_str(&line)) {
                    if writeln!(out, "{value}").and_then(|_| out.flush()).is_err() {
                        break;
                    }
                }
            }
            Err(_) => break,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn bridge_only_loopback() {
        assert_eq!(
            parse_bridge("http://127.0.0.1:5385").unwrap(),
            ("127.0.0.1".into(), 5385)
        );
        assert_eq!(
            parse_bridge("http://[::1]:5386/").unwrap(),
            ("::1".into(), 5386)
        );
        for rejected in [
            "https://127.0.0.1:5385",
            "http://evil.com/",
            "http://user@localhost:5385/",
            "http://localhost:5385/foo",
            "http://localhost:5385/?key=x",
            "http://127.0.0.1:5385#secret",
        ] {
            assert!(parse_bridge(rejected).is_err(), "{rejected}");
        }
    }
    #[test]
    fn chunked_parses_multi_chunk_json() {
        assert_eq!(
            decode_chunked(b"4\r\n{\"ok\r\n6\r\n\":true\r\n1\r\n}\r\n0\r\n\r\n").unwrap(),
            b"{\"ok\":true}"
        );
    }
    #[test]
    fn stdio_notification_and_errors() {
        let cfg = Config {
            host: "127.0.0.1".into(),
            port: 5385,
            allow_edits: false,
            token: None,
        };
        assert!(message(&cfg, Ok(json!({"jsonrpc":"2.0","method":"ping"}))).is_none());
        assert_eq!(
            message(&cfg, Ok(json!({"jsonrpc":"2.0","id":4,"method":"unknown"}))).unwrap()["error"]
                ["code"],
            -32601
        );
        assert_eq!(message(&cfg,Ok(json!({"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"exo_workspace_save","arguments":{"expectedRevision":1}}}))).unwrap()["result"]["isError"],true);
    }
}
