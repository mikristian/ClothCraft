//! BOM wire format: recursive element tag u32, attribute count u32, length-prefixed
//! UTF-8 key/value pairs, child count u32, children. All integers little endian.
const TAGS: [&str; 8] = [
    "GarmentStudioBOM",
    "Fabrics",
    "Fabric",
    "Pattern",
    "TrimsAndConstruction",
    "Trim",
    "FabricCostEstimates",
    "EstimatedFabricCost",
];
fn escape(s: &str, out: &mut String) {
    for c in s.chars() {
        out.push_str(match c {
            '&' => "&amp;",
            '<' => "&lt;",
            '>' => "&gt;",
            '"' => "&quot;",
            '\'' => "&apos;",
            _ => {
                out.push(c);
                continue;
            }
        });
    }
}
struct Reader<'a>(&'a [u8]);
impl<'a> Reader<'a> {
    fn number(&mut self) -> Option<usize> {
        let bytes = self.0.get(..4)?;
        let n = u32::from_le_bytes(bytes.try_into().ok()?) as usize;
        self.0 = &self.0[4..];
        Some(n)
    }
    fn string(&mut self) -> Option<&'a str> {
        let n = self.number()?;
        let s = std::str::from_utf8(self.0.get(..n)?).ok()?;
        self.0 = &self.0[n..];
        Some(s)
    }
    fn element(&mut self, out: &mut String, depth: usize) -> Option<()> {
        if depth > 8 {
            return None;
        }
        let tag = TAGS.get(self.number()?)?;
        out.push('<');
        out.push_str(tag);
        for _ in 0..self.number()? {
            let key = self.string()?;
            if key.is_empty() || !key.bytes().all(|b| b.is_ascii_alphanumeric()) {
                return None;
            }
            out.push(' ');
            out.push_str(key);
            out.push_str("=\"");
            escape(self.string()?, out);
            out.push('"');
        }
        out.push('>');
        for _ in 0..self.number()? {
            self.element(out, depth + 1)?;
        }
        out.push_str("</");
        out.push_str(tag);
        out.push('>');
        Some(())
    }
}
pub fn export_xml(input: &[u8]) -> Option<String> {
    if input.get(..4)? != 0u32.to_le_bytes() {
        return None;
    }
    let mut reader = Reader(input);
    let mut out = String::from("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
    reader.element(&mut out, 0)?;
    if !reader.0.is_empty() {
        return None;
    }
    out.push('\n');
    Some(out)
}
#[no_mangle]
pub extern "C" fn exo_bom_abi_version() -> u32 {
    1
}
#[no_mangle]
pub extern "C" fn exo_bom_alloc(len: usize) -> *mut u8 {
    Box::into_raw(vec![0u8; len].into_boxed_slice()) as *mut u8
}
/// Caller must pass a live allocation of exactly len bytes from exo_bom_alloc.
#[no_mangle]
pub unsafe extern "C" fn exo_bom_free(ptr: *mut u8, len: usize) {
    drop(Box::from_raw(std::ptr::slice_from_raw_parts_mut(ptr, len)));
}
/// Writes into a caller-owned output allocation; returns required byte length.
#[no_mangle]
pub unsafe extern "C" fn exo_bom_export(
    ptr: *const u8,
    len: usize,
    out: *mut u8,
    capacity: usize,
) -> usize {
    let Some(xml) = export_xml(std::slice::from_raw_parts(ptr, len)) else {
        return 0;
    };
    if capacity >= xml.len() {
        std::ptr::copy_nonoverlapping(xml.as_ptr(), out, xml.len());
    }
    xml.len()
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn escaping() {
        let mut s = String::new();
        escape("&<>\"' 雪\n", &mut s);
        assert_eq!(s, "&amp;&lt;&gt;&quot;&apos; 雪\n");
    }
    #[test]
    fn contract() {
        assert_eq!(
            export_xml(&[0; 12]).unwrap(),
            "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<GarmentStudioBOM></GarmentStudioBOM>\n"
        );
    }
    #[test]
    fn malformed() {
        assert!(export_xml(&[]).is_none());
        assert!(export_xml(&[255; 12]).is_none());
        assert!(export_xml(&[0; 13]).is_none());
    }
}
