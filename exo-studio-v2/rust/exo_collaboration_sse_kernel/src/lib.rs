//! A synchronous parser for complete SSE blocks, matching the existing JS
//! event-first/data-joined contract (including per-line trim semantics).
use std::alloc::{alloc, dealloc, Layout};
use std::cell::Cell;

thread_local! { static DATA_LENGTH: Cell<i32> = const { Cell::new(0) }; }

#[no_mangle]
pub extern "C" fn exo_collaboration_sse_abi_version() -> u32 {
    1
}

#[no_mangle]
pub extern "C" fn exo_collaboration_sse_alloc(size: usize) -> *mut u8 {
    let Ok(layout) = Layout::array::<u8>(size.max(1)) else {
        return std::ptr::null_mut();
    };
    unsafe { alloc(layout) }
}

#[no_mangle]
pub unsafe extern "C" fn exo_collaboration_sse_dealloc(pointer: *mut u8, capacity: usize) {
    if !pointer.is_null() {
        if let Ok(layout) = Layout::array::<u8>(capacity.max(1)) {
            dealloc(pointer, layout);
        }
    }
}

// ECMAScript String.prototype.trim whitespace (Rust's Unicode trim differs
// for U+0085 and U+FEFF).
fn trim_js(value: &str) -> &str {
    value.trim_matches(|c| {
        matches!(c,
        '\u{0009}'..='\u{000D}' | '\u{0020}' | '\u{00A0}' | '\u{1680}' |
        '\u{2000}'..='\u{200A}' | '\u{2028}' | '\u{2029}' | '\u{202F}' |
        '\u{205F}' | '\u{3000}' | '\u{FEFF}')
    })
}

fn parse_block(block: &str) -> (String, String) {
    let mut event = None;
    let mut data = Vec::new();
    for line in block.split('\n') {
        if event.is_none() {
            if let Some(value) = line.strip_prefix("event:") {
                event = Some(trim_js(value));
            }
        }
        if let Some(value) = line.strip_prefix("data:") {
            data.push(trim_js(value));
        }
    }
    (
        event
            .filter(|value| !value.is_empty())
            .unwrap_or("message")
            .to_string(),
        data.join("\n"),
    )
}

/// Returns event byte length, and exposes data byte length separately.
/// A negative result indicates invalid UTF-8 or insufficient output capacity.
#[no_mangle]
pub unsafe extern "C" fn exo_collaboration_sse_parse(
    input: *const u8,
    input_len: usize,
    output: *mut u8,
    output_capacity: usize,
) -> i32 {
    DATA_LENGTH.with(|length| length.set(-1));
    if input.is_null() || output.is_null() {
        return -1;
    }
    let Ok(block) = std::str::from_utf8(std::slice::from_raw_parts(input, input_len)) else {
        return -1;
    };
    let (event, data) = parse_block(block);
    let Some(total) = event.len().checked_add(data.len()) else {
        return -1;
    };
    if total > output_capacity || event.len() > i32::MAX as usize || data.len() > i32::MAX as usize
    {
        return -1;
    }
    std::ptr::copy_nonoverlapping(event.as_ptr(), output, event.len());
    std::ptr::copy_nonoverlapping(data.as_ptr(), output.add(event.len()), data.len());
    DATA_LENGTH.with(|length| length.set(data.len() as i32));
    event.len() as i32
}

#[no_mangle]
pub extern "C" fn exo_collaboration_sse_data_length() -> i32 {
    DATA_LENGTH.with(|length| length.get())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn defaults_and_multiline() {
        assert_eq!(
            parse_block("data: {\"ok\":true}"),
            ("message".into(), "{\"ok\":true}".into())
        );
        assert_eq!(
            parse_block("event: update\ndata:  {\"a\":\ndata:  2} \nevent: later"),
            ("update".into(), "{\"a\":\n2}".into())
        );
        assert_eq!(
            parse_block("event: \nevent: later\ndata:\ndata: "),
            ("message".into(), "\n".into())
        );
        assert_eq!(
            parse_block(": comment\nid: 4\nretry: 3000"),
            ("message".into(), "".into())
        );
        assert_eq!(
            parse_block("event:\u{00a0}更新\ndata:\u{2003}{\"x\":1}"),
            ("更新".into(), "{\"x\":1}".into())
        );
        assert_eq!(
            parse_block("event:\u{feff}change\ndata:\u{0085}x\u{0085}"),
            ("change".into(), "\u{0085}x\u{0085}".into())
        );
    }
    #[test]
    fn ffi_buffer_and_capacity() {
        let input = b"event: change\ndata: {\"x\":1}";
        let mut output = [0u8; 64];
        let event_len = unsafe {
            exo_collaboration_sse_parse(
                input.as_ptr(),
                input.len(),
                output.as_mut_ptr(),
                output.len(),
            )
        };
        assert_eq!(event_len, 6);
        assert_eq!(exo_collaboration_sse_data_length(), 7);
        assert_eq!(&output[..13], b"change{\"x\":1}");
        assert_eq!(
            unsafe {
                exo_collaboration_sse_parse(input.as_ptr(), input.len(), output.as_mut_ptr(), 2)
            },
            -1
        );
        assert_eq!(exo_collaboration_sse_data_length(), -1);
    }
}
