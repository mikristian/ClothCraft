use std::{collections::BTreeMap,env,fs,path::{Path,PathBuf}};

// Keep first-party Rust crates and runtime/automation scripts in the inventory.
// The vendored research/oss/clothcraft fork is excluded pending provenance
// classification; file counts must never be presented as functional ownership.
const SURFACES:[&str;9]=["src","rust","scripts","integrations/clothcraft","native_cpp","native_app","native_backend","ppf_backend","techpack-studio/src"];
const TYPES:[&str;8]=["js","jsx","mjs","ts","cpp","swift","rust","non_rust_remaining"];

fn excluded_dir(name:&str)->bool{
 matches!(name.to_ascii_lowercase().as_str(),"tests"|"test"|"__tests__"|"qa"|"node_modules"|"target"|"build"|"build-cmake"|"build-placement-qa"|"output"|"outputs"|"dist"|"generated"|"vendor"|"third_party"|"third-party"|"fixtures"|"examples"|"screenshots"|"coverage"|".git")
}
fn excluded_file(name:&str)->bool{
 let n=name.to_ascii_lowercase();
 n.starts_with("qa-")||n.starts_with("qa_")||n.starts_with("check-")||n.starts_with("test-")||n.starts_with("test_")||n.ends_with(".test.js")||n.ends_with(".test.jsx")||n.ends_with(".test.mjs")||n.ends_with(".test.ts")||n.ends_with(".spec.js")||n.ends_with(".spec.ts")||n.ends_with("_test.rs")||n.ends_with("_tests.rs")||n.ends_with(".generated.js")||n.ends_with(".generated.ts")||n.ends_with(".min.js")
}
fn category(path:&Path)->Option<&'static str>{
 match path.extension()?.to_str()?.to_ascii_lowercase().as_str(){
  "js"=>Some("js"),"jsx"=>Some("jsx"),"mjs"=>Some("mjs"),"ts"|"tsx"=>Some("ts"),"cpp"|"cc"|"cxx"|"c"|"hpp"|"h"|"hxx"=>Some("cpp"),"swift"=>Some("swift"),"rs"=>Some("rust"),_=>None
 }
}
fn count_dir(dir:&Path,counts:&mut BTreeMap<String,u64>)->std::io::Result<()>{
 if !dir.is_dir(){return Ok(())}
 let mut entries=fs::read_dir(dir)?.collect::<Result<Vec<_>,_>>()?;
 entries.sort_by_key(|entry|entry.file_name());
 for entry in entries{
  let name=entry.file_name().to_string_lossy().to_string();
  let ty=entry.file_type()?;
  if ty.is_symlink(){continue}
  if ty.is_dir(){if !excluded_dir(&name){count_dir(&entry.path(),counts)?}}
  else if ty.is_file()&&!excluded_file(&name){if let Some(kind)=category(&entry.path()){
    *counts.entry(kind.to_owned()).or_default()+=1;
    if kind!="rust"{*counts.entry("non_rust_remaining".to_owned()).or_default()+=1}
  }}
 }
 Ok(())
}
fn inventory(root:&Path)->std::io::Result<BTreeMap<String,BTreeMap<String,u64>>>{
 let mut report=BTreeMap::new();
 for surface in SURFACES{
  let mut counts=TYPES.iter().map(|x|(x.to_string(),0)).collect();
  count_dir(&root.join(surface),&mut counts)?;
  report.insert(surface.to_string(),counts);
 }
 Ok(report)
}
fn json(report:&BTreeMap<String,BTreeMap<String,u64>>)->String{
 let mut surfaces=Vec::new();
 let mut totals:BTreeMap<String,u64>=TYPES.iter().map(|x|(x.to_string(),0)).collect();
 for (surface,counts) in report{
  for (kind,value) in counts{*totals.get_mut(kind).unwrap()+=value}
  let values=counts.iter().map(|(key,value)|format!("\"{key}\":{value}")).collect::<Vec<_>>().join(",");
  surfaces.push(format!("\"{surface}\":{{{values}}}"));
 }
 let summary=totals.iter().map(|(key,value)|format!("\"{key}\":{value}")).collect::<Vec<_>>().join(",");
 format!("{{\"surfaces\":{{{}}},\"total\":{{{summary}}}}}",surfaces.join(","))
}
fn main(){
 let root=PathBuf::from(env::args().nth(1).unwrap_or_else(||".".to_string()));
 match inventory(&root){Ok(report)=>println!("{}",json(&report)),Err(err)=>{eprintln!("Audit failed: {err}");std::process::exit(1)}}
}

#[cfg(test)]mod tests{
 use super::*;
 use std::time::{SystemTime,UNIX_EPOCH};
 #[test]fn fixtures_exclude_qa_generated_and_symlinks(){
  let base=env::temp_dir().join(format!("exo-audit-{}-{}",std::process::id(),SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos()));
  fs::create_dir_all(base.join("src/core/tests")).unwrap();
  fs::create_dir_all(base.join("src/target")).unwrap();
  fs::create_dir_all(base.join("rust/exo_example/src")).unwrap();
  fs::create_dir_all(base.join("scripts")).unwrap();
  fs::create_dir_all(base.join("integrations/clothcraft/rust-service/src")).unwrap();
  for file in ["src/App.jsx","src/core/engine.tsx","src/core/mesh.cpp","src/core/sim.h","src/core/test-grader.js","src/core/engine.test.ts","src/core/tests/example.js","src/target/ignore.rs","rust/exo_example/src/lib.rs","scripts/rust-migration-autopilot.mjs","scripts/qa-rust-autopilot.mjs","integrations/clothcraft/rust-service/src/lib.rs"]{
   fs::write(base.join(file),"fixture").unwrap();
  }
  let counts=inventory(&base).unwrap();
  assert_eq!(counts["src"]["jsx"],1);
  assert_eq!(counts["src"]["ts"],1);
  assert_eq!(counts["src"]["cpp"],2);
  assert_eq!(counts["src"]["non_rust_remaining"],4);
  assert_eq!(counts["integrations/clothcraft"]["rust"],1);
  assert_eq!(counts["integrations/clothcraft"]["non_rust_remaining"],0);
  assert_eq!(counts["rust"]["rust"],1);
  assert_eq!(counts["scripts"]["mjs"],1);
  fs::remove_dir_all(base).unwrap();
 }
}
