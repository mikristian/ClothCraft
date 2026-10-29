//! Color-raster-to-normal/roughness PBR estimate. This is approximate
//! appearance, not physical displacement or calibrated material mechanics.
//! Browser Canvas source decoding and PNG encoding remain JavaScript-owned.
use std::alloc::{alloc,dealloc,Layout};
use std::slice;

#[cfg(target_arch="wasm32")]
#[link(wasm_import_module="env")]
unsafe extern "C" {
    #[link_name="pow"] fn host_pow(x:f64,y:f64)->f64;
    #[link_name="sqrt"] fn host_sqrt(x:f64)->f64;
    #[link_name="round"] fn host_round(x:f64)->f64;
    #[link_name="hypot3"] fn host_hypot3(x:f64,y:f64,z:f64)->f64;
}
#[inline]fn pow(x:f64,y:f64)->f64{
 #[cfg(target_arch="wasm32")] {unsafe {host_pow(x,y)}}
 #[cfg(not(target_arch="wasm32"))] {x.powf(y)}
}
#[inline]fn sqrt(x:f64)->f64{
 #[cfg(target_arch="wasm32")] {unsafe {host_sqrt(x)}}
 #[cfg(not(target_arch="wasm32"))] {x.sqrt()}
}
#[inline]fn round(x:f64)->f64{
 #[cfg(target_arch="wasm32")] {unsafe {host_round(x)}}
 #[cfg(not(target_arch="wasm32"))] {(x+0.5).floor()}
}
#[inline]fn hypot3(x:f64,y:f64,z:f64)->f64{
 #[cfg(target_arch="wasm32")] {unsafe {host_hypot3(x,y,z)}}
 #[cfg(not(target_arch="wasm32"))] {x.hypot(y).hypot(z)}
}

#[inline]fn clip(x:f64,lo:f64,hi:f64)->f64{x.max(lo).min(hi)}
#[inline]fn linear(channel:u8)->f64{
 let c=channel as f64/255.;
 if c<=0.04045 {c/12.92} else {pow((c+0.055)/1.055,2.4)}
}
#[no_mangle]pub extern "C" fn exo_pbr_pixels_abi_version()->u32 {1}
#[no_mangle]pub extern "C" fn exo_pbr_alloc(bytes:u32)->u32{
 if bytes==0 || bytes>64*1024*1024{return 0}
 let layout=match Layout::from_size_align(bytes as usize,8){Ok(layout)=>layout,Err(_)=>return 0};
 unsafe {alloc(layout) as u32}
}
#[no_mangle]pub extern "C" fn exo_pbr_free(pointer:u32,bytes:u32){
 if pointer==0||bytes==0||bytes>64*1024*1024{return}
 if let Ok(layout)=Layout::from_size_align(bytes as usize,8){unsafe{dealloc(pointer as *mut u8,layout)}}
}

/// Input [RGBA pixels], output [RGBA normals], output [RGBA roughness] occupy
/// three consecutive equally-sized slices in the same preallocated buffer.
/// 1 means successful full calculation, 0 means unsupported dimensions.
#[no_mangle]pub extern "C" fn exo_pbr_compute(pointer:u32,width:u32,height:u32,gain:f64)->u32{
 let count=match (width as usize).checked_mul(height as usize){Some(n) if width>=2&&height>=2&&n<=1048576=>n,_=>return 0};
 let stride=match count.checked_mul(4){Some(n)=>n,None=>return 0};
 let total=match stride.checked_mul(3){Some(n)=>n,None=>return 0};
 if pointer==0||total>64*1024*1024||!gain.is_finite(){return 0}
 let pixels=unsafe{slice::from_raw_parts_mut(pointer as *mut u8,total)};
 let mut lum=vec![0f32;count];
 for i in 0..count{
  let off=i*4;
  lum[i]=(0.2126*linear(pixels[off])+
    0.7152*linear(pixels[off+1])+0.0722*linear(pixels[off+2])) as f32;
 }
 let sample=|x:i64,y:i64|->f64{
  let xx=x.max(0).min(width as i64-1) as usize;
  let yy=y.max(0).min(height as i64-1) as usize;
  lum[yy*width as usize+xx] as f64
 };
 for y in 0..height as i64 {for x in 0..width as i64 {
  let off=(y*width as i64+x) as usize*4;
  let dx=(sample(x+1,y)-sample(x-1,y))*0.5*gain;
  let dy=(sample(x,y+1)-sample(x,y-1))*0.5*gain;
  let reciprocal=1./hypot3(dx,dy,1.);
  let normal=stride+off;
  pixels[normal]=clip(round((1.-dx*reciprocal)*127.5),0.,255.) as u8;
  pixels[normal+1]=clip(round((1.-dy*reciprocal)*127.5),0.,255.) as u8;
  pixels[normal+2]=clip(round((1.+reciprocal)*127.5),0.,255.) as u8;
  pixels[normal+3]=255;
  let (mut average,mut squared)=(0.,0.);
  for by in -1..=1 {for bx in -1..=1 {
   let value=sample(x+bx,y+by);
   average+=value;squared+=value*value;
  }}
  average/=9.;
  let variance=sqrt((squared/9.-average*average).max(0.));
  let r=clip(round(clip(198.+150.*variance,173.,245.)),0.,255.) as u8;
  let rough=2*stride+off;
  pixels[rough]=r;pixels[rough+1]=r;pixels[rough+2]=r;pixels[rough+3]=255;
 }}
 1
}

#[cfg(test)]mod tests{use super::*;
 #[test]fn gamma_bounds(){assert_eq!(linear(0),0.);assert!(linear(255)<=1.);assert!(linear(127)>0.);}
 #[cfg(target_arch="wasm32")]
 #[test]fn allocator_and_uniform_image(){
  let bytes=3*4*4*4;let ptr=exo_pbr_alloc(bytes);
  assert_ne!(ptr,0);
  unsafe{slice::from_raw_parts_mut(ptr as *mut u8,bytes as usize)[..64].fill(130)};
  assert_eq!(exo_pbr_compute(ptr,4,4,2.),1);
  let p=unsafe{slice::from_raw_parts(ptr as *const u8,bytes as usize)};
  assert_eq!(&p[64..68],&[128,128,255,255]);
  exo_pbr_free(ptr,bytes);
 }
}
