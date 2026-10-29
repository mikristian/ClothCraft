//! Regression coverage for native cubic coordinates used by EXO's vector
//! pattern editor. Keep this independent of concurrent Rust kernel changes.
use exo_geometry_kernel::{cubic_coordinate, cubic_derivative};

fn legacy_coordinate(a:f64,b:f64,c:f64,d:f64,t:f64)->f64{
    let q=1.-t;
    q*q*q*a+3.*q*q*t*b+3.*q*t*t*c+t*t*t*d
}

#[test]
fn vector_editor_cubic_matches_legacy_at_authored_stations(){
    let controls=[
        [0.,0.2,0.8,1.],
        [-0.12,0.5,-0.25,0.8],
        [0.03,-0.07,0.14,0.33],
    ];
    for [a,b,c,d] in controls {
        for i in 0..=100 {
            let t=i as f64/100.;
            let expected=legacy_coordinate(a,b,c,d,t);
            assert!((cubic_coordinate(a,b,c,d,t)-expected).abs()<1e-12,
                "cubic coordinate mismatch at t={t}");
        }
        assert!((cubic_derivative(a,b,c,d,0.)-3.*(b-a)).abs()<1e-12);
        assert!((cubic_derivative(a,b,c,d,1.)-3.*(d-c)).abs()<1e-12);
    }
}
