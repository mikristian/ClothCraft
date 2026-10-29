use std::{env, fs, io::{Read, Write}, net::{TcpListener, TcpStream}, path::{Path, PathBuf}};

fn decode(s: &str) -> Result<String, ()> {
    let b = s.as_bytes(); let mut out = Vec::new(); let mut i = 0;
    while i < b.len() {
        if b[i] == b'%' {
            if i + 2 >= b.len() {return Err(());}
            let d = |c: u8| (c as char).to_digit(16).map(|v|v as u8);
            out.push(d(b[i+1]).ok_or(())? * 16 + d(b[i+2]).ok_or(())?); i+=3;
        } else { out.push(b[i]); i+=1; }
    }
    String::from_utf8(out).map_err(|_|())
}
fn mime(ext: &str) -> &'static str {
    match ext {"html"=>"text/html; charset=utf-8","js"=>"text/javascript; charset=utf-8","css"=>"text/css; charset=utf-8","json"=>"application/json","png"=>"image/png","jpg"|"jpeg"=>"image/jpeg","svg"=>"image/svg+xml","webp"=>"image/webp","woff2"=>"font/woff2","glb"=>"model/gltf-binary","gltf"=>"model/gltf+json","obj"=>"text/plain; charset=utf-8","mp4"=>"video/mp4",_=>"application/octet-stream"}
}
fn response(stream: &mut TcpStream, method: &str, status: u16, bytes: &[u8], content_type: Option<&str>) {
    let reason=match status {200=>"OK",400=>"Bad Request",403=>"Forbidden",404=>"Not Found",405=>"Method Not Allowed",_=>"Error"};
    let mut header=format!("HTTP/1.1 {status} {reason}\r\nConnection: close\r\nContent-Length: {}\r\n",if method=="HEAD"{0}else{bytes.len()});
    if let Some(mime)=content_type {header.push_str(&format!("Content-Type: {mime}\r\nCache-Control: no-cache\r\nX-Content-Type-Options: nosniff\r\n"));}
    header.push_str("\r\n");let _=stream.write_all(header.as_bytes());if method!="HEAD" {let _=stream.write_all(bytes);}
}
fn handle(mut stream: TcpStream, root: &Path) {
    let _=stream.set_read_timeout(Some(std::time::Duration::from_secs(3)));
    let mut buf=[0;16384];let count=match stream.read(&mut buf){Ok(n)=>n,Err(_)=>return};
    let Some(line)=buf[..count].split(|b|*b==b'\n').next() else{return};
    let Ok(line)=std::str::from_utf8(line) else {response(&mut stream,"GET",400,b"",None);return};
    let mut words=line.trim_end_matches('\r').split_whitespace();
    let method=words.next().unwrap_or("");let uri=words.next().unwrap_or("");
    if method!="GET"&&method!="HEAD" {response(&mut stream,method,405,b"",None);return;}
    let path=uri.split(['?','#']).next().unwrap_or("/");
    if !path.starts_with('/') {response(&mut stream,method,400,b"",None);return;}
    let Ok(relative)=decode(path) else{response(&mut stream,method,400,b"",None);return};
    if relative.contains('\0')||relative.contains('\\'){response(&mut stream,method,400,b"",None);return;}
    let mut target=root.to_path_buf();
    for component in Path::new(relative.trim_start_matches('/')).components(){
        use std::path::Component;
        match component {Component::Normal(part)=>target.push(part),Component::CurDir=>{},Component::ParentDir=>{if !target.pop() {response(&mut stream,method,403,b"",None);return;}},_=>{response(&mut stream,method,403,b"",None);return;}}
    }
    if relative=="/" {target.push("index.html");}
    if !target.starts_with(root)||target==root {response(&mut stream,method,403,b"",None);return;}
    let Ok(actual)=fs::canonicalize(&target) else{response(&mut stream,method,404,b"Not found",None);return};
    if !actual.starts_with(root)||actual==root||!actual.is_file(){response(&mut stream,method,404,b"Not found",None);return;}
    let Ok(bytes)=fs::read(&actual) else{response(&mut stream,method,404,b"Not found",None);return};
    let extension=actual.extension().and_then(|s|s.to_str()).unwrap_or("").to_ascii_lowercase();
    response(&mut stream,method,200,&bytes,Some(mime(&extension)));
}
fn main(){
    let args:Vec<String>=env::args().collect();let mut root=env::var("EXO_WEB_ROOT").ok();let mut index=1;
    while index<args.len(){if args[index]=="--web-root"&&index+1<args.len(){root=Some(args[index+1].clone());index+=2;}else {eprintln!("Usage: exo-rust-static-host --web-root <directory> (or EXO_WEB_ROOT)");std::process::exit(2);}}
    let Some(root)=root else{eprintln!("Explicit --web-root or EXO_WEB_ROOT required");std::process::exit(2)};
    let root=fs::canonicalize(PathBuf::from(root)).expect("Web root must exist");assert!(root.is_dir(),"Web root must be a directory");
    let port=env::var("EXO_WEB_PORT").unwrap_or_else(|_|"5284".into());let port:u16=port.parse().expect("Invalid EXO_WEB_PORT");
    let listener=TcpListener::bind(("127.0.0.1",port)).expect("Unable to bind loopback port");
    println!("EXO Rust static assets available at http://{}",listener.local_addr().unwrap());
    for incoming in listener.incoming(){if let Ok(stream)=incoming {handle(stream,&root);}}
}

#[cfg(test)] mod tests {use super::*;#[test]fn decoding(){assert_eq!(decode("/a%20b").unwrap(),"/a b");assert!(decode("/%GG").is_err());assert!(decode("/%FF").is_err());}#[test]fn mime_contract(){assert_eq!(mime("glb"),"model/gltf-binary");assert_eq!(mime("foo"),"application/octet-stream");}}
