//! Private localhost HTTP adapter for the native server's unknown-operation JSON route.
//! Never binds the production port; EXO_PROBE_PORT must be explicitly provided.
use std::{env,io::{Read,Write},net::TcpListener};
fn trusted(origin:&str)->bool {
    const PORTS:[&str;11]=["5173","5174","5188","5189","5416","5386","5284","5286","5297","5298","5300"];
    // Match the production allowlist exactly (5297/5298/5300 intentionally excluded).
    PORTS[..8].iter().any(|port| origin==format!("http://127.0.0.1:{port}")||origin==format!("http://localhost:{port}"))
}
fn reply(origin:&str)->String {
    let blocked=!origin.is_empty()&&!trusted(origin);
    let (status,body)=if blocked {(403,"{\"error\":\"Origin not allowed\"}")}else{(404,"{\"error\":\"Unknown integration operation\"}")};
    let cors=if !blocked && !origin.is_empty() {format!("Access-Control-Allow-Origin: {origin}\r\nVary: Origin\r\n")}else{String::new()};
    format!("HTTP/1.1 {status} {}\r\nContent-Type: application/json; charset=utf-8\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\n{cors}Content-Length: {}\r\nConnection: close\r\n\r\n{body}",if status==403{"Forbidden"}else{"Not Found"},body.len())
}
fn main()->std::io::Result<()> {
    let port:u16=env::var("EXO_PROBE_PORT").expect("EXO_PROBE_PORT required").parse().expect("numeric private port");
    assert_ne!(port,5385,"production port forbidden");
    let listener=TcpListener::bind(("127.0.0.1",port))?;
    for stream in listener.incoming(){
        let mut stream=stream?;stream.set_read_timeout(Some(std::time::Duration::from_secs(2)))?;
        let mut buffer=[0u8;8192];let n=stream.read(&mut buffer)?;
        let request=String::from_utf8_lossy(&buffer[..n]);
        let origin=request.lines().find_map(|line|line.split_once(':').filter(|(k,_)|k.eq_ignore_ascii_case("Origin")).map(|(_,v)|v.trim().trim_end_matches('\r'))).unwrap_or("");
        stream.write_all(reply(origin).as_bytes())?;
    }
    Ok(())
}
#[cfg(test)]mod tests {use super::*;
    #[test]fn origin_policy_and_error_payload(){
        assert!(trusted("http://localhost:5173"));assert!(!trusted("http://localhost:5297"));
        assert!(reply("").contains("404 Not Found"));
        assert!(reply("http://localhost:5173").contains("Access-Control-Allow-Origin: http://localhost:5173"));
        assert!(reply("https://evil.test").contains("403 Forbidden"));
        assert!(!reply("https://evil.test").contains("Access-Control-Allow-Origin:"));
    }
}
