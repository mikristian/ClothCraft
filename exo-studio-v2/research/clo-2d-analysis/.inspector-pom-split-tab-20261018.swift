import AppKit
import ApplicationServices
import CoreGraphics
import Foundation
import ImageIO
import ScreenCaptureKit
import UniformTypeIdentifiers

// A real launchd/LaunchServices app process, never osascript or a temporary
// Swift process. Default inspections are read-only and restricted to CLO.
// Explicit --probe-* flags perform local interaction with a copied test garment.
struct Node: Codable {
    var role: String
    var name: String
    var value: String?
    var frame: [String: Double]?
    var children: [Node]
}

struct Report: Codable {
    var version = "1.0.0"
    var generatedAt = ISO8601DateFormatter().string(from: Date())
    var identifier = Bundle.main.bundleIdentifier ?? "unknown"
    var executable = CommandLine.arguments.first ?? "unknown"
    var accessibility = false
    var screenRecording = false
    var cloPID: Int32?
    var cloWindowCount = 0
    var cloWindows: [Node] = []
    var screenshotPath: String?
    var warnings: [String] = []
    var directProbe: [String] = []
    var cloMenuBar: Node?
}

// Opt-in, one-shot CLO interaction probes. Never save, simulate, create or
// delete CLO geometry. Use the currently visible window's AX frame as origin;
// each probe records its named operation for a before/after screenshot audit.
func clickCLOWindowPoint(_ window: AXUIElement, relativeX: CGFloat, relativeY: CGFloat) -> Bool {
    guard let f = rectAttribute(window), let x = f["x"], let y = f["y"],
          let width = f["width"], let height = f["height"],
          width >= 1450, height >= 850,
          relativeX > 0, relativeX < width, relativeY > 0, relativeY < height else { return false }
    let point = CGPoint(x: x + Double(relativeX), y: y + Double(relativeY))
    guard let source = CGEventSource(stateID: .hidSystemState),
          let moved = CGEvent(mouseEventSource: source, mouseType: .mouseMoved, mouseCursorPosition: point, mouseButton: .left),
          let down = CGEvent(mouseEventSource: source, mouseType: .leftMouseDown, mouseCursorPosition: point, mouseButton: .left),
          let up = CGEvent(mouseEventSource: source, mouseType: .leftMouseUp, mouseCursorPosition: point, mouseButton: .left)
    else { return false }
    moved.post(tap: .cghidEventTap)
    Thread.sleep(forTimeInterval: 0.25)
    down.post(tap: .cghidEventTap)
    // Give CLO's custom 2D viewport its full native mouse-down cycle before
    // sending mouse-up. Instant down/up could be collapsed by its event loop.
    Thread.sleep(forTimeInterval: 0.085)
    up.post(tap: .cghidEventTap)
    return true
}

func clickCLOObjectBrowserTab(_ window: AXUIElement, localX: CGFloat) -> Bool {
    guard localX == 1228 || localX == 1475,
          let frame=rectAttribute(window),
          let x=frame["x"], let y=frame["y"],
          frame["width",default:0] >= 1450, frame["height",default:0] >= 850,
          let source=CGEventSource(stateID:.hidSystemState) else { return false }
    let location=CGPoint(x:x+Double(localX),y:y+104)
    guard let move=CGEvent(mouseEventSource:source,mouseType:.mouseMoved,
                            mouseCursorPosition:location,mouseButton:.left),
          let down=CGEvent(mouseEventSource:source,mouseType:.leftMouseDown,
                            mouseCursorPosition:location,mouseButton:.left),
          let up=CGEvent(mouseEventSource:source,mouseType:.leftMouseUp,
                          mouseCursorPosition:location,mouseButton:.left) else { return false }
    move.post(tap:.cghidEventTap)
    Thread.sleep(forTimeInterval:0.15)
    down.post(tap:.cghidEventTap)
    Thread.sleep(forTimeInterval:0.09)
    up.post(tap:.cghidEventTap)
    return true
}

func doubleClickCLOWindowPoint(_ window: AXUIElement, relativeX: CGFloat, relativeY: CGFloat) -> Bool {
    guard let f = rectAttribute(window), let x = f["x"], let y = f["y"],
          let width = f["width"], let height = f["height"],
          width >= 1450, height >= 850,
          relativeX > 700, relativeX < 1094, relativeY > 90, relativeY < 850,
          let source = CGEventSource(stateID: .hidSystemState) else { return false }
    let point = CGPoint(x: x + Double(relativeX), y: y + Double(relativeY))
    for count in 1...2 {
        guard let down = CGEvent(mouseEventSource: source, mouseType: .leftMouseDown,
                                 mouseCursorPosition: point, mouseButton: .left),
              let up = CGEvent(mouseEventSource: source, mouseType: .leftMouseUp,
                               mouseCursorPosition: point, mouseButton: .left) else { return false }
        down.setIntegerValueField(.mouseEventClickState, value: Int64(count))
        up.setIntegerValueField(.mouseEventClickState, value: Int64(count))
        down.post(tap: .cghidEventTap)
        Thread.sleep(forTimeInterval: 0.055)
        up.post(tap: .cghidEventTap)
        Thread.sleep(forTimeInterval: 0.085)
    }
    return true
}

func inspectorOption(_ name: String, fallback: CGFloat) -> CGFloat {
    let prefix = "--\(name)="
    guard let value = CommandLine.arguments.first(where: { $0.hasPrefix(prefix) }),
          let parsed = Double(value.dropFirst(prefix.count)), parsed.isFinite else { return fallback }
    return CGFloat(parsed)
}

func typeCLOWidthInNumericEditor(_ field: AXUIElement, value: String) -> Bool {
    guard value == "1.50" || value == "1.00",
          stringAttribute(field,kAXRoleAttribute as CFString) == "AXIncrementor",
          let f = rectAttribute(field), let x=f["x"], let y=f["y"],
          let width=f["width"], let height=f["height"],
          x>1350, x<1490, y>700, y<800, width>60, height>15,
          let source=CGEventSource(stateID: .hidSystemState),
          let mouseDown=CGEvent(mouseEventSource:source,mouseType:.leftMouseDown,
                                mouseCursorPosition:CGPoint(x:x+width/2,y:y+height/2),mouseButton:.left),
          let mouseUp=CGEvent(mouseEventSource:source,mouseType:.leftMouseUp,
                              mouseCursorPosition:CGPoint(x:x+width/2,y:y+height/2),mouseButton:.left)
    else { return false }
    mouseDown.post(tap:.cghidEventTap)
    Thread.sleep(forTimeInterval:0.11)
    mouseUp.post(tap:.cghidEventTap)
    Thread.sleep(forTimeInterval:0.2)
    func key(_ code: CGKeyCode, command: Bool = false) -> Bool {
        guard let down=CGEvent(keyboardEventSource:source,virtualKey:code,keyDown:true),
              let up=CGEvent(keyboardEventSource:source,virtualKey:code,keyDown:false) else { return false }
        if command { down.flags = .maskCommand; up.flags = .maskCommand }
        down.post(tap:.cghidEventTap)
        up.post(tap:.cghidEventTap)
        Thread.sleep(forTimeInterval:0.055)
        return true
    }
    guard key(0,command:true) else { return false } // Cmd+A selects numeric field
    let codes: [CGKeyCode] = value == "1.50" ? [18,47,23,29] : [18,47,29,29]
    for code in codes where !key(code) { return false }
    return key(36) // Return commits QDoubleSpinBox
}

func scrollCLO2D(_ window: AXUIElement, localX: CGFloat, localY: CGFloat, steps: Int32) -> Bool {
    guard let f = rectAttribute(window), let x = f["x"], let y = f["y"],
          let width = f["width"], let height = f["height"],
          width >= 1450, height >= 850,
          localX >= 705, localX <= 1085, localY >= 100, localY <= 845,
          abs(steps) <= 8, let source = CGEventSource(stateID: .hidSystemState),
          let move = CGEvent(mouseEventSource: source, mouseType: .mouseMoved,
                             mouseCursorPosition: CGPoint(x: x + Double(localX), y: y + Double(localY)),
                             mouseButton: .left),
          let scroll = CGEvent(scrollWheelEvent2Source: source, units: .line,
                                wheelCount: 1, wheel1: steps, wheel2: 0, wheel3: 0) else { return false }
    move.post(tap: .cghidEventTap)
    Thread.sleep(forTimeInterval: 0.3)
    scroll.post(tap: .cghidEventTap)
    return true
}

func findCLOControl(_ element: AXUIElement, name: String) -> AXUIElement? {
    var pending = [element]
    var budget = 2000
    while !pending.isEmpty && budget > 0 {
        budget -= 1
        let current = pending.removeFirst()
        let title = stringAttribute(current, kAXTitleAttribute as CFString)
        if title == name, let rect = rectAttribute(current),
           rect["width", default: 0] > 15, rect["height", default: 0] >= 14 { return current }
        if let children = attribute(current, kAXChildrenAttribute as CFString) as? [AXUIElement] {
            pending.append(contentsOf: children.prefix(180))
        }
    }
    return nil
}

func clickCLOControl(_ window: AXUIElement, name: String) -> Bool {
    guard let control = findCLOControl(window, name: name),
          let f = rectAttribute(control), let x = f["x"], let y = f["y"],
          let width = f["width"], let height = f["height"] else { return false }
    guard let wf = rectAttribute(window), let wx = wf["x"], let wy = wf["y"] else { return false }
    return clickCLOWindowPoint(window, relativeX: x + width / 2 - wx,
                               relativeY: y + height / 2 - wy)
}

func pressCLODialogControl(_ dialog: AXUIElement, name: String) -> Bool {
    guard let control = findCLOControl(dialog, name: name) else { return false }
    if AXUIElementPerformAction(control, kAXPressAction as CFString) == .success { return true }
    guard let f = rectAttribute(control), let x = f["x"], let y = f["y"],
          let width = f["width"], let height = f["height"],
          let source = CGEventSource(stateID: .hidSystemState),
          let down = CGEvent(mouseEventSource: source, mouseType: .leftMouseDown,
               mouseCursorPosition: CGPoint(x: x + width / 2, y: y + height / 2), mouseButton: .left),
          let up = CGEvent(mouseEventSource: source, mouseType: .leftMouseUp,
               mouseCursorPosition: CGPoint(x: x + width / 2, y: y + height / 2), mouseButton: .left) else { return false }
    down.post(tap: .cghidEventTap)
    up.post(tap: .cghidEventTap)
    return true
}

func cloHasCopiedFixture(_ window: AXUIElement) -> Bool {
    var pending = [window]
    var budget = 1200
    while !pending.isEmpty && budget > 0 {
        budget -= 1
        let current = pending.removeFirst()
        let value = stringAttribute(current, kAXValueAttribute as CFString)
        if value == "Male_T-shirt-direct-test-20261018.zpac" { return true }
        if let children = attribute(current, kAXChildrenAttribute as CFString) as? [AXUIElement] {
            pending.append(contentsOf: children.prefix(120))
        }
    }
    return false
}

func dragCopiedPatternPoint(_ window: AXUIElement,
                            localX: CGFloat = 765, localY: CGFloat = 220,
                            deltaX: CGFloat = -22, deltaY: CGFloat = -9) -> Bool {
    guard let f = rectAttribute(window), let originX = f["x"], let originY = f["y"],
          f["width", default: 0] >= 1450, f["height", default: 0] >= 850,
          let source = CGEventSource(stateID: .hidSystemState) else { return false }
    // CLO zoomed-to-selected pattern when entering Edit Pattern. This is
    // the observed left shoulder node in the new 1512x882 screenshot.
    let start = CGPoint(x: originX + localX, y: originY + localY)
    guard let down = CGEvent(mouseEventSource: source, mouseType: .leftMouseDown,
                             mouseCursorPosition: start, mouseButton: .left) else { return false }
    down.post(tap: .cghidEventTap)
    Thread.sleep(forTimeInterval: 0.12)
    for i in 1...12 {
        let t = CGFloat(i) / 12
        let position = CGPoint(x: start.x + deltaX * t, y: start.y + deltaY * t)
        guard let moved = CGEvent(mouseEventSource: source, mouseType: .leftMouseDragged,
                                  mouseCursorPosition: position, mouseButton: .left) else { return false }
        moved.post(tap: .cghidEventTap)
        Thread.sleep(forTimeInterval: 0.025)
    }
    guard let up = CGEvent(mouseEventSource: source, mouseType: .leftMouseUp,
                           mouseCursorPosition: CGPoint(x: start.x + deltaX, y: start.y + deltaY),
                           mouseButton: .left) else { return false }
    up.post(tap: .cghidEventTap)
    return true
}

func undoCLOTestGesture() -> Bool {
    guard let source = CGEventSource(stateID: .hidSystemState),
          let down = CGEvent(keyboardEventSource: source, virtualKey: 6, keyDown: true),
          let up = CGEvent(keyboardEventSource: source, virtualKey: 6, keyDown: false) else { return false }
    down.flags = .maskCommand
    up.flags = .maskCommand
    down.post(tap: .cghidEventTap)
    up.post(tap: .cghidEventTap)
    return true
}

func pressCLOEditUndo(_ appElement: AXUIElement) -> (Bool, String) {
    guard let ref = attribute(appElement, kAXMenuBarAttribute as CFString) else {
        return (false, "CLO menu bar not accessible")
    }
    let bar = ref as! AXUIElement
    guard let editMenu = (attribute(bar, kAXChildrenAttribute as CFString) as? [AXUIElement])?.first(where: {
        stringAttribute($0, kAXTitleAttribute as CFString) == "Edit"
    }) else { return (false, "CLO Edit menu unavailable") }
    let editChildren = (attribute(editMenu, kAXChildrenAttribute as CFString) as? [AXUIElement]) ?? []
    guard let menu = editChildren.first,
          let undo = (attribute(menu, kAXChildrenAttribute as CFString) as? [AXUIElement])?.first(where: {
              stringAttribute($0, kAXTitleAttribute as CFString) == "Undo"
          }) else { return (false, "CLO Undo menu item unavailable") }
    let enabled = (attribute(undo, kAXEnabledAttribute as CFString) as? NSNumber)?.boolValue
    if enabled == false { return (false, "CLO Undo menu item disabled") }
    let result = AXUIElementPerformAction(undo, kAXPressAction as CFString)
    return (result == .success, "CLO Edit > Undo AXPress result \(result.rawValue), enabled \(enabled.map(String.init(describing:)) ?? "unknown")")
}

func pressCLOEditRedo(_ appElement: AXUIElement) -> (Bool, String) {
    guard let ref = attribute(appElement, kAXMenuBarAttribute as CFString) else { return (false, "CLO menu bar unavailable") }
    let bar = ref as! AXUIElement
    guard let edit = (attribute(bar, kAXChildrenAttribute as CFString) as? [AXUIElement])?.first(where: {
        stringAttribute($0, kAXTitleAttribute as CFString) == "Edit"
    }), let menu = (attribute(edit, kAXChildrenAttribute as CFString) as? [AXUIElement])?.first,
       let redo = (attribute(menu, kAXChildrenAttribute as CFString) as? [AXUIElement])?.first(where: {
           stringAttribute($0, kAXTitleAttribute as CFString) == "Redo"
       }) else { return (false, "CLO Redo menu item unavailable") }
    let enabled = (attribute(redo, kAXEnabledAttribute as CFString) as? NSNumber)?.boolValue
    if enabled == false { return (false, "CLO Redo menu item disabled") }
    let code = AXUIElementPerformAction(redo, kAXPressAction as CFString)
    return (code == .success, "CLO Edit > Redo AXPress result \(code.rawValue), enabled \(enabled.map(String.init(describing:)) ?? "unknown")")
}

func pressCLO2DMenuTool(_ appElement: AXUIElement, name: String) -> (Bool, String) {
    guard let ref = attribute(appElement, kAXMenuBarAttribute as CFString) else {
        return (false, "CLO menu bar unavailable")
    }
    let bar = ref as! AXUIElement
    func child(_ root: AXUIElement, _ label: String) -> AXUIElement? {
        (attribute(root, kAXChildrenAttribute as CFString) as? [AXUIElement])?.first {
            stringAttribute($0, kAXTitleAttribute as CFString) == label
        }
    }
    func first(_ root: AXUIElement) -> AXUIElement? {
        (attribute(root, kAXChildrenAttribute as CFString) as? [AXUIElement])?.first
    }
    guard let patternItem = child(bar, "2D Pattern"), let patternMenu = first(patternItem),
          let editItem = child(patternMenu, "Edit"), let editMenu = first(editItem),
          let toolItem = child(editMenu, name) else {
        return (false, "CLO 2D Pattern > Edit > \(name) inaccessible")
    }
    let error = AXUIElementPerformAction(toolItem, kAXPressAction as CFString)
    return (error == .success, "CLO native menu activated \(name): AX result \(error.rawValue)")
}

func pressCLOMenuPath(_ appElement: AXUIElement, labels: [String]) -> (Bool, String) {
    guard let ref = attribute(appElement, kAXMenuBarAttribute as CFString), !labels.isEmpty else {
        return (false, "CLO menu bar or path unavailable")
    }
    var current = ref as! AXUIElement
    for (index, label) in labels.enumerated() {
        guard let item = (attribute(current, kAXChildrenAttribute as CFString) as? [AXUIElement])?.first(where: {
            stringAttribute($0, kAXTitleAttribute as CFString) == label
        }) else { return (false, "CLO native menu missing: \(labels.prefix(index+1).joined(separator: " > "))") }
        if index == labels.count - 1 {
            let code = AXUIElementPerformAction(item, kAXPressAction as CFString)
            return (code == .success, "CLO native menu \(labels.joined(separator: " > ")) AXPress \(code.rawValue)")
        }
        guard let submenu = (attribute(item, kAXChildrenAttribute as CFString) as? [AXUIElement])?.first else {
            return (false, "CLO submenu inaccessible at \(label)")
        }
        current = submenu
    }
    return (false, "Invalid menu path")
}

func attribute(_ element: AXUIElement, _ key: CFString) -> AnyObject? {
    var result: CFTypeRef?
    guard AXUIElementCopyAttributeValue(element, key, &result) == .success else { return nil }
    return result
}

func stringAttribute(_ element: AXUIElement, _ key: CFString) -> String {
    guard let result = attribute(element, key) else { return "" }
    if let text = result as? String { return String(text.prefix(180)) }
    return ""
}

func rectAttribute(_ element: AXUIElement) -> [String: Double]? {
    guard let position = attribute(element, kAXPositionAttribute as CFString),
          let size = attribute(element, kAXSizeAttribute as CFString) else { return nil }
    let p = position as! AXValue, s = size as! AXValue
    var origin = CGPoint.zero, dimensions = CGSize.zero
    guard AXValueGetValue(p, .cgPoint, &origin), AXValueGetValue(s, .cgSize, &dimensions) else { return nil }
    return ["x":Double(origin.x),"y":Double(origin.y),"width":Double(dimensions.width),"height":Double(dimensions.height)]
}

// Explicit, one-shot inspection action: select the existing first Fabric row
// without assigning materials, changing project values, or saving anything.
// Target is resolved from the live CLO AX label; no guessed screen click.
func selectExistingFabricForInspection(_ appElement: AXUIElement) -> Bool {
    var pending = [appElement], count = 0
    while !pending.isEmpty && count < 500 {
        let element = pending.removeFirst()
        count += 1
        if stringAttribute(element, kAXValueAttribute as CFString) == "FABRIC 1",
           let frame = rectAttribute(element), frame["width", default: 0] > 20,
           let x = frame["x"], let y = frame["y"], let w = frame["width"], let h = frame["height"] {
            let location = CGPoint(x: x + min(30,w/2), y: y+h/2)
            guard let source = CGEventSource(stateID: .hidSystemState),
                  let down = CGEvent(mouseEventSource: source, mouseType: .leftMouseDown, mouseCursorPosition: location, mouseButton: .left),
                  let up = CGEvent(mouseEventSource: source, mouseType: .leftMouseUp, mouseCursorPosition: location, mouseButton: .left)
            else { return false }
            down.post(tap: .cghidEventTap); up.post(tap: .cghidEventTap)
            return true
        }
        if let children = attribute(element, kAXChildrenAttribute as CFString) as? [AXUIElement] {
            pending.append(contentsOf: children.prefix(160))
        }
    }
    return false
}

// Scroll only inside CLO's right Property Editor at a position derived from
// its live AX heading. No clicks, project changes, or dialog interactions.
func scrollLivePropertyEditor(_ appElement: AXUIElement) -> Bool {
    // CLO exposes its document through AXWindows, whereas AXChildren on the
    // application element can be empty. Scan the actual window hierarchy.
    var pending = (attribute(appElement,kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? [appElement]
    var count = 0
    var targetWindowFrame: [String:Double]?
    var propertyRegionConfirmed = false
    while !pending.isEmpty && count < 500 {
        let element = pending.removeFirst()
        count += 1
        let value=stringAttribute(element, kAXValueAttribute as CFString)
        let title=stringAttribute(element, kAXTitleAttribute as CFString)
        if stringAttribute(element, kAXRoleAttribute as CFString) == "AXWindow",
           let f = rectAttribute(element), (f["width"] ?? 0)>1100 {
            targetWindowFrame=f
        }
        let frame=rectAttribute(element)
        // CLO's custom property heading is not always exported to AX.
        // Identify the visible right-side inspector by one of its actual
        // editable fields or its Open/Save hardware buttons.
        let onRight=(frame?["x"] ?? 0)>1150
        // The header moves upward as CLO scrolls; 470 remains within the
        // Property Editor at the bottom of the 900-point CLO window.
        let belowBrowser=(frame?["y"] ?? 0)>470
        if onRight && belowBrowser &&
            (value == "Property Editor" || value == "Button" || value == "Fabric" ||
             title == "Open" || title == "Save" || value == "Thread Type" ||
             value == "Width (cm)" || value == "Specification") {
            propertyRegionConfirmed = true
        }
        if let children=attribute(element,kAXChildrenAttribute as CFString) as? [AXUIElement]{
            pending.append(contentsOf:children.prefix(160))
        }
    }
    guard propertyRegionConfirmed,let base=targetWindowFrame else { return false }
    let position=CGPoint(x:(base["x"] ?? 0)+(base["width"] ?? 1512)-105,
                         y:(base["y"] ?? 0)+(base["height"] ?? 900)-152)
    guard let source=CGEventSource(stateID:.hidSystemState),
          let event=CGEvent(scrollWheelEvent2Source:source,units:.line,wheelCount:1,wheel1:-9,wheel2:0,wheel3:0)
    else { return false }
    event.location=position
    event.post(tap:.cghidEventTap)
    return true
}

func scan(_ element: AXUIElement, depth: Int, budget: inout Int) -> Node {
    budget -= 1
    var node = Node(
        role: stringAttribute(element, kAXRoleAttribute as CFString),
        name: stringAttribute(element, kAXTitleAttribute as CFString),
        value: nil,
        frame: rectAttribute(element),
        children: []
    )
    if let value = attribute(element, kAXValueAttribute as CFString), let text = value as? String {
        node.value = String(text.prefix(180))
    }
    if depth >= 7 || budget <= 0 { return node }
    for key in [kAXChildrenAttribute as CFString] {
        if let children = attribute(element, key) as? [AXUIElement] {
            for child in children.prefix(160) where budget > 0 {
                node.children.append(scan(child, depth: depth + 1, budget: &budget))
            }
        }
    }
    return node
}

@MainActor
func captureCLO(to folder: URL, report: inout Report) async {
    guard report.screenRecording else { return }
    do {
        let list = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
        let windows = list.windows.filter {
            let name = $0.owningApplication?.applicationName ?? ""
            let bundle = $0.owningApplication?.bundleIdentifier ?? ""
            return name.contains("CLO_Standalone") || bundle == "com.clo3d.security.closo"
        }
        guard let target = windows.first(where: { $0.frame.width >= 400 }) else {
            report.warnings.append("CLO screen-sharing window not found")
            return
        }
        let config = SCStreamConfiguration()
        config.width = max(1, Int(target.frame.width))
        config.height = max(1, Int(target.frame.height))
        config.showsCursor = false
        let filter = SCContentFilter(desktopIndependentWindow: target)
        let image = try await SCScreenshotManager.captureImage(contentFilter: filter, configuration: config)
        let output = folder.appendingPathComponent("clo-property-editor-reference.png")
        guard let destination = CGImageDestinationCreateWithURL(output as CFURL, UTType.png.identifier as CFString, 1, nil) else {
            report.warnings.append("Cannot create CLO PNG image destination")
            return
        }
        CGImageDestinationAddImage(destination, image, nil)
        guard CGImageDestinationFinalize(destination) else {
            report.warnings.append("Cannot write CLO PNG screenshot")
            return
        }
        try? FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: output.path)
        report.screenshotPath = output.path
    } catch {
        report.warnings.append("CLO screenshot failed: \(error.localizedDescription)")
    }
}

@main
struct CLOInspectorBridge {
    @MainActor static func main() async {
        let app = NSApplication.shared
        app.setActivationPolicy(.accessory)
        let folder = FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent("Library/Application Support/EXO-CLO-Inspector", isDirectory: true)
        do { try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true) }
        catch { return }
        try? FileManager.default.setAttributes([.posixPermissions: 0o700], ofItemAtPath: folder.path)
        var report = Report()
        let request = CommandLine.arguments.contains("--request-permissions")
        let axPromptOptions = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: request] as CFDictionary
        report.accessibility = AXIsProcessTrustedWithOptions(axPromptOptions)
        report.screenRecording = request ? CGRequestScreenCaptureAccess() : CGPreflightScreenCaptureAccess()

        let clo = NSRunningApplication.runningApplications(withBundleIdentifier: "com.clo3d.security.closo").first
            ?? NSWorkspace.shared.runningApplications.first(where: { $0.localizedName?.contains("CLO_Standalone") ?? false })
        report.cloPID = clo?.processIdentifier
        if report.accessibility, let clo {
            let appElement = AXUIElementCreateApplication(clo.processIdentifier)
            if CommandLine.arguments.contains("--probe-fixture-pom-split-tab-refresh") {
                let windows=(attribute(appElement,kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                let copied=windows.filter { cloHasCopiedFixture($0) }
                let overlays=windows.filter { !cloHasCopiedFixture($0) }.allSatisfy {
                    let f=rectAttribute($0) ?? [:]
                    return f["width",default:10000]<=250 && f["height",default:10000]<=100
                }
                if copied.count==1, overlays, let window=copied.first, clo.activate(options:[]) {
                    let src=folder.appendingPathComponent("clo-property-editor-reference.png")
                    func snap(_ stage:String) async {
                        await captureCLO(to:folder,report:&report)
                        let dst=folder.appendingPathComponent("clo-pom-split-tab-\(stage).png")
                        try? FileManager.default.removeItem(at:dst)
                        try? FileManager.default.copyItem(at:src,to:dst)
                    }
                    let (pom,pomMsg)=pressCLOMenuPath(appElement,
                        labels:["2D Pattern","Point of Measure","Edit Point of Measure"])
                    report.directProbe.append("Starting POM: \(pomMsg)")
                    if pom {
                        try? await Task.sleep(for:.milliseconds(500))
                        await snap("before")
                        let (split,splitMsg)=pressCLO2DMenuTool(appElement,name:"Add Point/Split Line")
                        report.directProbe.append("Activate cutline split: \(splitMsg)")
                        if split {
                            try? await Task.sleep(for:.milliseconds(330))
                            _=clo.activate(options:[])
                            let x=inspectorOption("split-x",fallback:1004)
                            let y=inspectorOption("split-y",fallback:522)
                            report.directProbe.append("Test split at (\(x),\(y))")
                            if clickCLOWindowPoint(window,relativeX:x,relativeY:y) {
                                try? await Task.sleep(for:.milliseconds(620))
                                await snap("after-split")
                                let (inspect,msg)=pressCLOMenuPath(appElement,
                                    labels:["2D Pattern","Point of Measure","Edit Point of Measure"])
                                report.directProbe.append("POM after split: \(msg)")
                                if inspect {
                                    try? await Task.sleep(for:.milliseconds(550))
                                    await snap("before-refresh")
                                    _=clo.activate(options:[])
                                    if clickCLOObjectBrowserTab(window,localX:1228) {
                                        try? await Task.sleep(for:.milliseconds(350))
                                        await snap("fabric-tab")
                                        _=clo.activate(options:[])
                                        if clickCLOObjectBrowserTab(window,localX:1475) {
                                            try? await Task.sleep(for:.milliseconds(550))
                                            await snap("after-refresh")
                                            report.directProbe.append("Re-entered POM Object Browser tab after cutline split")
                                        } else {report.warnings.append("POM tab revisit failed")}
                                    } else {report.warnings.append("Fabric tab selection failed")}
                                } else {report.warnings.append("POM mode after split unavailable")}
                                _=clo.activate(options:[])
                                let (undid,undoMsg)=pressCLOEditUndo(appElement)
                                report.directProbe.append("Undo split: \(undoMsg)")
                                if undid {
                                    try? await Task.sleep(for:.milliseconds(650))
                                    await snap("undo")
                                } else {report.warnings.append("Undo after split unavailable")}
                            } else {report.warnings.append("Split click not dispatched")}
                        } else {report.warnings.append("Split mode unavailable")}
                    } else {report.warnings.append("POM baseline menu unavailable")}
                } else {report.warnings.append("POM split tab test requires copied garment, no modal")}
            }
            if CommandLine.arguments.contains("--probe-fixture-pom-tab-filter-control") {
                let windows=(attribute(appElement,kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                let copied=windows.filter { cloHasCopiedFixture($0) }
                let overlays=windows.filter { !cloHasCopiedFixture($0) }.allSatisfy {
                    let f=rectAttribute($0) ?? [:]
                    return f["width",default:10000]<=250 && f["height",default:10000]<=100
                }
                if copied.count==1, overlays, let window=copied.first, clo.activate(options:[]) {
                    let src=folder.appendingPathComponent("clo-property-editor-reference.png")
                    func snap(_ stage:String) async {
                        await captureCLO(to:folder,report:&report)
                        let dst=folder.appendingPathComponent("clo-pom-tab-filter-\(stage).png")
                        try? FileManager.default.removeItem(at:dst)
                        try? FileManager.default.copyItem(at:src,to:dst)
                    }
                    let (pom,pomMsg)=pressCLOMenuPath(appElement,
                        labels:["2D Pattern","Point of Measure","Edit Point of Measure"])
                    report.directProbe.append("POM baseline: \(pomMsg)")
                    if pom {
                        try? await Task.sleep(for:.milliseconds(500))
                        await snap("before")
                        let (transform,transformMsg)=pressCLO2DMenuTool(appElement,name:"Transform Pattern")
                        report.directProbe.append(transformMsg)
                        if transform {
                            try? await Task.sleep(for:.milliseconds(250))
                            _=clo.activate(options:[])
                            if clickCLOWindowPoint(window,relativeX:1045,relativeY:476) {
                                try? await Task.sleep(for:.milliseconds(500))
                                await snap("selected-other")
                                let (view,pomAgain)=pressCLOMenuPath(appElement,
                                    labels:["2D Pattern","Point of Measure","Edit Point of Measure"])
                                report.directProbe.append("After other selection: \(pomAgain)")
                                if view {
                                    try? await Task.sleep(for:.milliseconds(550))
                                    await snap("other-pattern-pom")
                                    _=clo.activate(options:[])
                                    if clickCLOObjectBrowserTab(window,localX:1228) {
                                        try? await Task.sleep(for:.milliseconds(500))
                                        await snap("fabric-tab")
                                        _=clo.activate(options:[])
                                        if clickCLOObjectBrowserTab(window,localX:1475) {
                                            try? await Task.sleep(for:.milliseconds(750))
                                            await snap("pom-tab-reselected")
                                            report.directProbe.append("Revisited POM browser tab after selecting another pattern, without geometry edits")
                                        } else { report.warnings.append("POM Object Browser tab could not be clicked") }
                                    } else { report.warnings.append("Fabric Object Browser tab could not be clicked") }
                                }
                            }
                        }
                    }
                } else { report.warnings.append("POM tab-filter test requires copied garment without modal") }
            }
            if CommandLine.arguments.contains("--probe-fixture-advanced-2d-modes") {
                let windows=(attribute(appElement,kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                let copied=windows.filter { cloHasCopiedFixture($0) }
                let overlays=windows.filter { !cloHasCopiedFixture($0) }.allSatisfy {
                    let f=rectAttribute($0) ?? [:]
                    return f["width",default:10000] <= 250 && f["height",default:10000] <= 100
                }
                if copied.count==1, overlays, clo.activate(options:[]) {
                    let source=folder.appendingPathComponent("clo-property-editor-reference.png")
                    let modes:[(String,[String])] = [
                        ("edit-grading",["2D Pattern","Grading","Edit Grading"]),
                        ("edit-curve-grading",["2D Pattern","Grading","Edit Curve Grading"]),
                        ("walk-pattern",["2D Pattern","Walk Pattern"]),
                        ("mn-segment-sewing",["Sewing","M:N Segment Sewing"]),
                        ("mn-free-sewing",["Sewing","M:N Free Sewing"])
                    ]
                    for (label,path) in modes {
                        let (selected,message)=pressCLOMenuPath(appElement,labels:path)
                        report.directProbe.append(message)
                        if !selected {
                            report.warnings.append("Could not activate \(label)")
                            continue
                        }
                        try? await Task.sleep(for:.milliseconds(580))
                        await captureCLO(to:folder,report:&report)
                        let out=folder.appendingPathComponent("clo-advanced-mode-\(label).png")
                        try? FileManager.default.removeItem(at:out)
                        try? FileManager.default.copyItem(at:source,to:out)
                    }
                    let (restored,restoredMessage)=pressCLO2DMenuTool(appElement,name:"Transform Pattern")
                    report.directProbe.append("Neutral mode after advanced tools: \(restoredMessage)")
                    if !restored { report.warnings.append("Could not restore neutral tool") }
                } else { report.warnings.append("Advanced tool inspection requires copied fixture and no modal") }
            }
            if CommandLine.arguments.contains("--probe-fixture-pom-mode-switch-control") {
                let windows=(attribute(appElement,kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                let copied=windows.filter { cloHasCopiedFixture($0) }
                let overlays=windows.filter { !cloHasCopiedFixture($0) }.allSatisfy {
                    let f=rectAttribute($0) ?? [:]
                    return f["width",default:10000] <= 250 && f["height",default:10000] <= 100
                }
                if copied.count==1, overlays, clo.activate(options:[]) {
                    let src=folder.appendingPathComponent("clo-property-editor-reference.png")
                    func snap(_ stage:String) async {
                        await captureCLO(to:folder,report:&report)
                        let dst=folder.appendingPathComponent("clo-pom-mode-control-\(stage).png")
                        try? FileManager.default.removeItem(at:dst)
                        try? FileManager.default.copyItem(at:src,to:dst)
                    }
                    let (start,msg)=pressCLOMenuPath(appElement,
                        labels:["2D Pattern","Point of Measure","Edit Point of Measure"])
                    report.directProbe.append("Start POM: \(msg)")
                    if start {
                        try? await Task.sleep(for:.milliseconds(630))
                        await snap("baseline")
                        let (neutral,neutralMsg)=pressCLO2DMenuTool(appElement,name:"Transform Pattern")
                        report.directProbe.append("Switch to Transform without clicking: \(neutralMsg)")
                        if neutral {
                            try? await Task.sleep(for:.milliseconds(380))
                            await snap("transform-only")
                            let (back,backMsg)=pressCLOMenuPath(appElement,
                                labels:["2D Pattern","Point of Measure","Edit Point of Measure"])
                            report.directProbe.append("Return to POM without clicking: \(backMsg)")
                            if back {
                                try? await Task.sleep(for:.milliseconds(650))
                                await snap("pom-after-mode-only")
                            } else { report.warnings.append("Cannot reenter POM") }
                        } else { report.warnings.append("Cannot enter neutral tool") }
                    } else { report.warnings.append("Cannot enter initial POM") }
                } else { report.warnings.append("POM tool-only test requires copied fixture without modal") }
            }
            if CommandLine.arguments.contains("--probe-fixture-pom-selection-control") {
                let windows=(attribute(appElement,kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                let copied=windows.filter { cloHasCopiedFixture($0) }
                let overlays=windows.filter { !cloHasCopiedFixture($0) }.allSatisfy {
                    let f=rectAttribute($0) ?? [:]
                    return f["width",default:10000] <= 250 && f["height",default:10000] <= 100
                }
                if copied.count == 1, overlays, let window=copied.first, clo.activate(options:[]) {
                    let source=folder.appendingPathComponent("clo-property-editor-reference.png")
                    func snap(_ stage:String) async {
                        await captureCLO(to:folder,report:&report)
                        let dest=folder.appendingPathComponent("clo-pom-selection-control-\(stage).png")
                        try? FileManager.default.removeItem(at:dest)
                        try? FileManager.default.copyItem(at:source,to:dest)
                    }
                    let (pom,baseline)=pressCLOMenuPath(appElement,
                        labels:["2D Pattern","Point of Measure","Edit Point of Measure"])
                    report.directProbe.append("POM baseline: \(baseline)")
                    if pom {
                        try? await Task.sleep(for:.milliseconds(580))
                        await snap("baseline")
                        let samples:[(String,CGFloat,CGFloat)] = [
                            ("other-pattern",1045,476),
                            ("measured-pattern",827,470),
                            ("empty-canvas",941,690)
                        ]
                        for (label,x,y) in samples {
                            let (neutral,neutralMessage)=pressCLO2DMenuTool(appElement,name:"Transform Pattern")
                            report.directProbe.append("Transform mode for \(label): \(neutralMessage)")
                            if !neutral {
                                report.warnings.append("Cannot select \(label) in neutral mode")
                                break
                            }
                            try? await Task.sleep(for:.milliseconds(270))
                            _ = clo.activate(options:[])
                            if !clickCLOWindowPoint(window,relativeX:x,relativeY:y) {
                                report.warnings.append("Could not click \(label)")
                                break
                            }
                            try? await Task.sleep(for:.milliseconds(460))
                            await snap("\(label)-selected")
                            let (view,description)=pressCLOMenuPath(appElement,
                                labels:["2D Pattern","Point of Measure","Edit Point of Measure"])
                            report.directProbe.append("POM after \(label): \(description)")
                            if !view {
                                report.warnings.append("Cannot reopen POM after \(label)")
                                break
                            }
                            try? await Task.sleep(for:.milliseconds(560))
                            await snap("\(label)-pom")
                        }
                    } else { report.warnings.append("POM selection control could not activate POM view") }
                } else { report.warnings.append("POM selection control requires copied fixture with no modal dialog") }
            }
            if CommandLine.arguments.contains("--probe-fixture-right-pom-pattern-anchor") {
                let windows=(attribute(appElement,kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                let copied=windows.filter { cloHasCopiedFixture($0) }
                let overlays=windows.filter { !cloHasCopiedFixture($0) }.allSatisfy {
                    let f=rectAttribute($0) ?? [:]
                    return f["width",default:10000] <= 250 && f["height",default:10000] <= 100
                }
                if copied.count==1, overlays, let window=copied.first, clo.activate(options:[]) {
                    let src=folder.appendingPathComponent("clo-property-editor-reference.png")
                    func snap(_ step:String) async {
                        await captureCLO(to:folder,report:&report)
                        let dest=folder.appendingPathComponent("clo-pom-anchor-\(step).png")
                        try? FileManager.default.removeItem(at:dest)
                        try? FileManager.default.copyItem(at:src,to:dest)
                    }
                    let (pom,pomDescription)=pressCLOMenuPath(appElement,labels:
                        ["2D Pattern","Point of Measure","Edit Point of Measure"])
                    report.directProbe.append("POM baseline: \(pomDescription)")
                    if pom {
                        try? await Task.sleep(for:.milliseconds(600))
                        await snap("before")
                        let (edit,editDescription)=pressCLO2DMenuTool(appElement,name:"Edit Pattern")
                        report.directProbe.append(editDescription)
                        if edit {
                            try? await Task.sleep(for:.milliseconds(380))
                            _ = clo.activate(options:[])
                            if dragCopiedPatternPoint(window,localX:1004,localY:496,deltaX:-15,deltaY:-8) {
                                try? await Task.sleep(for:.milliseconds(780))
                                await snap("pattern-moved")
                                let (pomAgain,pomDesc)=pressCLOMenuPath(appElement,labels:
                                    ["2D Pattern","Point of Measure","Edit Point of Measure"])
                                report.directProbe.append("POM after pattern move: \(pomDesc)")
                                if pomAgain {
                                    try? await Task.sleep(for:.milliseconds(600))
                                    await snap("pom-after-pattern")
                                } else {report.warnings.append("POM table not available after pattern move")}
                                _ = clo.activate(options:[])
                                let (undid,undoDesc)=pressCLOEditUndo(appElement)
                                report.directProbe.append("Pattern vertex Undo: \(undoDesc)")
                                if undid {
                                    try? await Task.sleep(for:.milliseconds(650))
                                    await snap("undone")
                                } else {report.warnings.append("Pattern vertex Undo not available")}
                            } else {report.warnings.append("Pattern vertex drag not dispatched")}
                        } else {report.warnings.append("Edit Pattern tool not available")}
                    } else {report.warnings.append("Edit POM baseline tool not available")}
                } else {report.warnings.append("Right POM pattern point test requires sole copied T-shirt")}
            }
            if CommandLine.arguments.contains("--probe-fixture-right-side-pom-create") {
                let windows=(attribute(appElement,kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                let copied=windows.filter { cloHasCopiedFixture($0) }
                let overlays=windows.filter { !cloHasCopiedFixture($0) }.allSatisfy {
                    let f=rectAttribute($0) ?? [:]
                    return f["width",default:10000]<=250 && f["height",default:10000]<=100
                }
                if copied.count==1, overlays, let window=copied.first, clo.activate(options:[]) {
                    let src=folder.appendingPathComponent("clo-property-editor-reference.png")
                    func capture(_ stage:String) async {
                        await captureCLO(to:folder,report:&report)
                        let dest=folder.appendingPathComponent("clo-pomright-\(stage).png")
                        try? FileManager.default.removeItem(at:dest)
                        try? FileManager.default.copyItem(at:src,to:dest)
                    }
                    let (selected,description)=pressCLOMenuPath(appElement,
                        labels:["2D Pattern","Point of Measure","Point of Measure"])
                    report.directProbe.append(description)
                    if selected {
                        try? await Task.sleep(for:.milliseconds(400))
                        await capture("before")
                        _ = clo.activate(options:[])
                        if clickCLOWindowPoint(window,relativeX:1004,relativeY:496) &&
                           doubleClickCLOWindowPoint(window,relativeX:1004,relativeY:546) {
                            try? await Task.sleep(for:.milliseconds(700))
                            await capture("first-completion")
                            _ = clo.activate(options:[])
                            if doubleClickCLOWindowPoint(window,relativeX:1004,relativeY:546) {
                                try? await Task.sleep(for:.milliseconds(600))
                                await capture("second-completion")
                            }
                            report.directProbe.append("Right-side POM traced over x1004,y496→546 and completed with native double-click")
                        } else {report.warnings.append("Right-side POM creation clicks did not execute")}
                    } else {report.warnings.append("Right-side POM menu unavailable")}
                } else {report.warnings.append("Right-side POM creation needs copied fixture and no modal dialog")}
            }
            if CommandLine.arguments.contains("--probe-fixture-right-side-pom-drag") {
                let windows=(attribute(appElement,kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                let copied=windows.filter { cloHasCopiedFixture($0) }
                let overlays=windows.filter { !cloHasCopiedFixture($0) }.allSatisfy {
                    let f=rectAttribute($0) ?? [:]
                    return f["width",default:10000]<=250 && f["height",default:10000]<=100
                }
                if copied.count==1, overlays, let window=copied.first, clo.activate(options:[]) {
                    let src=folder.appendingPathComponent("clo-property-editor-reference.png")
                    func capture(_ stage:String) async {
                        await captureCLO(to:folder,report:&report)
                        let dst=folder.appendingPathComponent("clo-pomright-edit-\(stage).png")
                        try? FileManager.default.removeItem(at:dst)
                        try? FileManager.default.copyItem(at:src,to:dst)
                    }
                    let (selected,description)=pressCLOMenuPath(appElement,
                        labels:["2D Pattern","Point of Measure","Edit Point of Measure"])
                    report.directProbe.append(description)
                    if selected {
                        try? await Task.sleep(for:.milliseconds(450))
                        await capture("before")
                        _ = clo.activate(options:[])
                        if dragCopiedPatternPoint(window,localX:1004,localY:496,deltaX:-18,deltaY:-12) {
                            try? await Task.sleep(for:.milliseconds(800))
                            await capture("after")
                            let (undid,desc)=pressCLOEditUndo(appElement)
                            report.directProbe.append("POM edit undo: \(desc)")
                            if undid {
                                try? await Task.sleep(for:.milliseconds(600))
                                await capture("undone")
                            } else {report.warnings.append("POM endpoint drag Undo unavailable")}
                        } else {report.warnings.append("POM endpoint drag dispatch failed")}
                    } else {report.warnings.append("Edit POM menu unavailable")}
                } else {report.warnings.append("Right-side POM editing needs copied fixture and no modal dialog")}
            }
            if CommandLine.arguments.contains("--probe-fixture-pom-split-refresh") {
                let windows=(attribute(appElement,kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                let fixtures=windows.filter { cloHasCopiedFixture($0) }
                let harmless=windows.filter { !cloHasCopiedFixture($0) }.allSatisfy {
                    let f=rectAttribute($0) ?? [:]
                    return f["width",default:10000] < 250 && f["height",default:10000] < 100
                }
                if fixtures.count == 1, harmless, let window=fixtures.first, clo.activate(options:[]) {
                    let src=folder.appendingPathComponent("clo-property-editor-reference.png")
                    func snap(_ s:String) async {
                        await captureCLO(to:folder,report:&report)
                        let dst=folder.appendingPathComponent("clo-pomrefresh-\(s).png")
                        try? FileManager.default.removeItem(at:dst)
                        try? FileManager.default.copyItem(at:src,to:dst)
                    }
                    let (pom,desc)=pressCLOMenuPath(appElement,
                        labels:["2D Pattern","Point of Measure","Edit Point of Measure"])
                    report.directProbe.append("POM initial: \(desc)")
                    if pom {
                        try? await Task.sleep(for:.milliseconds(500))
                        await snap("before")
                        let (split,splitDesc)=pressCLO2DMenuTool(appElement,name:"Add Point/Split Line")
                        report.directProbe.append(splitDesc)
                        if split {
                            try? await Task.sleep(for:.milliseconds(350))
                            _=clo.activate(options:[])
                            let splitX=inspectorOption("pom-split-x",fallback:787)
                            let splitY=inspectorOption("pom-split-y",fallback:516)
                            report.directProbe.append("POM split target: (\(splitX),\(splitY))")
                            if clickCLOWindowPoint(window,relativeX:splitX,relativeY:splitY) {
                                try? await Task.sleep(for:.milliseconds(600))
                                await snap("split")
                                let (inspect,pomMsg)=pressCLOMenuPath(appElement,
                                    labels:["2D Pattern","Point of Measure","Edit Point of Measure"])
                                report.directProbe.append(pomMsg)
                                if inspect {
                                    try? await Task.sleep(for:.milliseconds(900))
                                    await snap("pom-after-split")
                                }
                                let (normal,normalMsg)=pressCLO2DMenuTool(appElement,name:"Transform Pattern")
                                report.directProbe.append("Exit POM: \(normalMsg)")
                                if normal {
                                    try? await Task.sleep(for:.milliseconds(300))
                                    let (again,againMsg)=pressCLOMenuPath(appElement,
                                        labels:["2D Pattern","Point of Measure","Edit Point of Measure"])
                                    report.directProbe.append("Re-enter POM: \(againMsg)")
                                    if again {
                                        try? await Task.sleep(for:.milliseconds(900))
                                        await snap("pom-after-reenter")
                                    }
                                }
                                _ = clo.activate(options:[])
                                let (undid,undoMsg)=pressCLOEditUndo(appElement)
                                report.directProbe.append("Undo split: \(undoMsg)")
                                if undid {
                                    try? await Task.sleep(for:.milliseconds(900))
                                    await snap("pom-after-undo")
                                } else {report.warnings.append("Undo split not available")}
                            } else {report.warnings.append("Split point click unavailable")}
                        } else {report.warnings.append("Split tool unavailable")}
                    } else {report.warnings.append("POM initial mode unavailable")}
                } else {report.warnings.append("POM refresh test blocked: copied fixture window unavailable")}
            }
            if CommandLine.arguments.contains("--dismiss-fixture-small-popup") {
                let windows=(attribute(appElement,kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                let source=CGEventSource(stateID:.hidSystemState)
                let copied=windows.filter{cloHasCopiedFixture($0)}
                let rest=windows.filter{!cloHasCopiedFixture($0)}
                if copied.count == 1 && rest.count == 1,
                   let floating=rest.first, let size=rectAttribute(floating),
                   size["width",default:999] <= 235 && size["height",default:999] <= 80,
                   (attribute(floating,kAXChildrenAttribute as CFString) as? [AXUIElement])?.contains(where:{
                       stringAttribute($0,kAXRoleAttribute as CFString)=="AXMenu"
                   }) == true,
                   let source,
                   let down=CGEvent(keyboardEventSource:source,virtualKey:53,keyDown:true),
                   let up=CGEvent(keyboardEventSource:source,virtualKey:53,keyDown:false) {
                    _ = clo.activate(options:[])
                    down.post(tap:.cghidEventTap)
                    up.post(tap:.cghidEventTap)
                    report.directProbe.append("Dispatched Escape to dismiss small transient CLO popup on copied test fixture")
                    try? await Task.sleep(for:.milliseconds(400))
                } else {report.warnings.append("No safely identifiable small copied-fixture popup to dismiss")}
            }
            if CommandLine.arguments.contains("--probe-fixture-pom-boundary-point") {
                let windows=(attribute(appElement,kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                let copied=windows.filter{cloHasCopiedFixture($0)}
                let overlays=windows.filter{!cloHasCopiedFixture($0)}
                let overlaysSafe=overlays.allSatisfy{
                    let f=rectAttribute($0) ?? [:]
                    return f["width",default:999] <= 235 && f["height",default:999] <= 80 &&
                      (attribute($0,kAXChildrenAttribute as CFString) as? [AXUIElement])?.contains(where:{
                          stringAttribute($0,kAXRoleAttribute as CFString) == "AXMenu"
                      }) == true
                }
                if copied.count == 1, overlaysSafe, let window=copied.first,
                   clo.activate(options:[]) {
                    let source=folder.appendingPathComponent("clo-property-editor-reference.png")
                    func preserve(_ step:String) {
                        let target=folder.appendingPathComponent("clo-pomboundary-\(step).png")
                        try? FileManager.default.removeItem(at:target)
                        try? FileManager.default.copyItem(at:source,to:target)
                    }
                    func snap(_ step:String) async {
                        await captureCLO(to:folder,report:&report)
                        preserve(step)
                    }
                    let (pom,desc)=pressCLOMenuPath(appElement,
                        labels:["2D Pattern","Point of Measure","Edit Point of Measure"])
                    report.directProbe.append("POM baseline menu: \(desc)")
                    if pom {
                        try? await Task.sleep(for:.milliseconds(400))
                        await snap("pom-before")
                    }
                    let (edit,editDesc)=pressCLO2DMenuTool(appElement,name:"Edit Pattern")
                    report.directProbe.append("Edit Pattern mode: \(editDesc)")
                    if edit {
                        try? await Task.sleep(for:.milliseconds(450))
                        _ = clo.activate(options:[])
                        let startX=inspectorOption("boundary-x",fallback:787)
                        let startY=inspectorOption("boundary-y",fallback:496)
                        let deltaX=inspectorOption("boundary-dx",fallback:-10)
                        let deltaY=inspectorOption("boundary-dy",fallback:0)
                        if dragCopiedPatternPoint(window,localX:startX,localY:startY,
                                                  deltaX:deltaX,deltaY:deltaY) {
                            report.directProbe.append("Dragged pattern outline boundary vertex \(startX),\(startY) by \(deltaX),\(deltaY) screen pixels")
                            try? await Task.sleep(for:.milliseconds(850))
                            await snap("pattern-after")
                            let (pomAfter,pomDesc)=pressCLOMenuPath(appElement,
                                labels:["2D Pattern","Point of Measure","Edit Point of Measure"])
                            report.directProbe.append("Inspect POM after move: \(pomDesc)")
                            if pomAfter {
                                try? await Task.sleep(for:.milliseconds(450))
                                await snap("pom-after")
                            }
                            _ = clo.activate(options:[])
                            let (undo,undoDesc)=pressCLOEditUndo(appElement)
                            report.directProbe.append("Boundary move Undo: \(undoDesc)")
                            if undo {
                                try? await Task.sleep(for:.milliseconds(650))
                                await snap("undo")
                                let (pomUndo,pomUndoDesc)=pressCLOMenuPath(appElement,
                                    labels:["2D Pattern","Point of Measure","Edit Point of Measure"])
                                report.directProbe.append("Inspect POM after Undo: \(pomUndoDesc)")
                                if pomUndo {try? await Task.sleep(for:.milliseconds(350));await snap("pom-restored")}
                            } else {report.warnings.append("Boundary point Undo unavailable")}
                        } else {report.warnings.append("Boundary anchor drag failed")}
                    } else {report.warnings.append("Edit Pattern mode unavailable")}
                } else {report.warnings.append("POM boundary point test requires sole copied T-shirt window")}
            }
            if CommandLine.arguments.contains("--probe-fixture-attached-split-references") {
                let windows = (attribute(appElement,kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                if windows.count == 1, let window = windows.first,
                   cloHasCopiedFixture(window), clo.activate(options:[]) {
                    let source=folder.appendingPathComponent("clo-property-editor-reference.png")
                    func preserve(_ step:String) {
                        let target=folder.appendingPathComponent("clo-attachedsplit-\(step).png")
                        try? FileManager.default.removeItem(at:target)
                        try? FileManager.default.copyItem(at:source,to:target)
                    }
                    func snap(_ step:String) async {
                        await captureCLO(to:folder,report:&report)
                        preserve(step)
                    }
                    await snap("baseline")
                    let (notch,notchDescription)=pressCLOMenuPath(appElement,
                        labels:["2D Pattern","Create","Notch"])
                    report.directProbe.append("Notch: \(notchDescription)")
                    if notch {
                        try? await Task.sleep(for:.milliseconds(350))
                        _ = clo.activate(options:[])
                        if clickCLOWindowPoint(window,relativeX:787,relativeY:532) {
                            try? await Task.sleep(for:.milliseconds(550))
                            await snap("notch-added")
                        } else {report.warnings.append("Notch not created")}
                    } else {report.warnings.append("Notch menu unavailable")}
                    let (allowance,allowanceDescription)=pressCLOMenuPath(appElement,
                        labels:["2D Pattern","Create","Seam Allowance "])
                    report.directProbe.append("Allowance: \(allowanceDescription)")
                    if allowance {
                        try? await Task.sleep(for:.milliseconds(350))
                        _ = clo.activate(options:[])
                        if clickCLOWindowPoint(window,relativeX:787,relativeY:515) {
                            try? await Task.sleep(for:.milliseconds(650))
                            await snap("allowance-added")
                        } else {report.warnings.append("Allowance not selected")}
                    } else {report.warnings.append("Allowance menu unavailable")}
                    let (split,splitDescription)=pressCLO2DMenuTool(appElement,name:"Add Point/Split Line")
                    report.directProbe.append("Split: \(splitDescription)")
                    if split {
                        try? await Task.sleep(for:.milliseconds(370))
                        _ = clo.activate(options:[])
                        if clickCLOWindowPoint(window,relativeX:787,relativeY:522) {
                            try? await Task.sleep(for:.milliseconds(700))
                            await snap("split-with-attachments")
                        } else {report.warnings.append("Split click did not dispatch")}
                    } else {report.warnings.append("Split menu unavailable")}
                    let (inspectNotch,notchDesc)=pressCLOMenuPath(appElement,
                        labels:["2D Pattern","Create","Notch"])
                    report.directProbe.append("Revisit notch: \(notchDesc)")
                    if inspectNotch {
                        try? await Task.sleep(for:.milliseconds(320))
                        _ = clo.activate(options:[])
                        if clickCLOWindowPoint(window,relativeX:787,relativeY:532) {
                            try? await Task.sleep(for:.milliseconds(540))
                            await snap("notch-after-split")
                        }
                    }
                    let (inspectAllow,allowDesc)=pressCLOMenuPath(appElement,
                        labels:["2D Pattern","Create","Seam Allowance "])
                    report.directProbe.append("Revisit allowance: \(allowDesc)")
                    if inspectAllow {
                        try? await Task.sleep(for:.milliseconds(320))
                        _ = clo.activate(options:[])
                        if clickCLOWindowPoint(window,relativeX:787,relativeY:514) {
                            try? await Task.sleep(for:.milliseconds(540))
                            await snap("allowance-after-split")
                        }
                    }
                    let (inspectSew,sewDesc)=pressCLOMenuPath(appElement,
                        labels:["Sewing","Edit Sewing"])
                    report.directProbe.append("Revisit seam: \(sewDesc)")
                    if inspectSew {
                        try? await Task.sleep(for:.milliseconds(320))
                        _ = clo.activate(options:[])
                        if clickCLOWindowPoint(window,relativeX:787,relativeY:514) {
                            try? await Task.sleep(for:.milliseconds(600))
                            await snap("sewing-after-split")
                        }
                    }
                    let (inspectPOM,pomDesc)=pressCLOMenuPath(appElement,
                        labels:["2D Pattern","Point of Measure","Edit Point of Measure"])
                    report.directProbe.append("Revisit POM: \(pomDesc)")
                    if inspectPOM {
                        try? await Task.sleep(for:.milliseconds(550))
                        await snap("pom-after-split")
                    }
                    // Leave current in-memory fixture intact for inspection.
                    // Another probe may undo the split/notch/allowance separately.
                } else {report.warnings.append("Attached-reference test requires copied T-shirt as sole document")}
            }
            if CommandLine.arguments.contains("--probe-fixture-sewn-references-after-split") {
                let windows = (attribute(appElement,kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                if windows.count == 1, let window = windows.first,
                   cloHasCopiedFixture(window), clo.activate(options: []) {
                    let screenshotFile=folder.appendingPathComponent("clo-property-editor-reference.png")
                    func preserve(_ stage:String) {
                        let dst=folder.appendingPathComponent("clo-splitref-\(stage).png")
                        try? FileManager.default.removeItem(at:dst)
                        try? FileManager.default.copyItem(at:screenshotFile,to:dst)
                    }
                    func snap(_ stage:String) async {
                        await captureCLO(to:folder,report:&report)
                        preserve(stage)
                    }
                    let (edit,editResult)=pressCLOMenuPath(appElement,labels:["Sewing","Edit Sewing"])
                    report.directProbe.append("Baseline: \(editResult)")
                    if edit {
                        try? await Task.sleep(for:.milliseconds(450))
                        _ = clo.activate(options: [])
                        if clickCLOWindowPoint(window,relativeX:787,relativeY:523) {
                            try? await Task.sleep(for:.milliseconds(480))
                            await snap("sewing-before")
                        }
                    } else {report.warnings.append("Baseline Edit Sewing unavailable")}
                    let (split,splitResult)=pressCLO2DMenuTool(appElement,name:"Add Point/Split Line")
                    report.directProbe.append(splitResult)
                    if split {
                        try? await Task.sleep(for:.milliseconds(400))
                        _ = clo.activate(options: [])
                        if clickCLOWindowPoint(window,relativeX:787,relativeY:522) {
                            try? await Task.sleep(for:.milliseconds(620))
                            await snap("cutline-after")
                            let (editAfter,desc)=pressCLOMenuPath(appElement,labels:["Sewing","Edit Sewing"])
                            report.directProbe.append("After split: \(desc)")
                            if editAfter {
                                try? await Task.sleep(for:.milliseconds(400))
                                _ = clo.activate(options: [])
                                if clickCLOWindowPoint(window,relativeX:787,relativeY:504) {
                                    try? await Task.sleep(for:.milliseconds(450))
                                    await snap("upper-sewing-after")
                                }
                                _ = clo.activate(options: [])
                                if clickCLOWindowPoint(window,relativeX:787,relativeY:534) {
                                    try? await Task.sleep(for:.milliseconds(450))
                                    await snap("lower-sewing-after")
                                }
                            } else {report.warnings.append("Cannot inspect sewing references after split")}
                            let (pom,pomDesc)=pressCLOMenuPath(appElement,
                                labels:["2D Pattern","Point of Measure","Edit Point of Measure"])
                            report.directProbe.append(pomDesc)
                            if pom {
                                try? await Task.sleep(for:.milliseconds(550))
                                await snap("pom-after-split")
                            }
                            _ = clo.activate(options: [])
                            let (undid,undoDesc)=pressCLOEditUndo(appElement)
                            report.directProbe.append("Split undo: \(undoDesc)")
                            if undid {
                                try? await Task.sleep(for:.milliseconds(600))
                                await snap("undo")
                                _ = clo.activate(options: [])
                                let (redid,redoDesc)=pressCLOEditRedo(appElement)
                                report.directProbe.append("Split redo: \(redoDesc)")
                                if redid {
                                    try? await Task.sleep(for:.milliseconds(550))
                                    await snap("redo")
                                    _ = clo.activate(options: [])
                                    let (restore,restoreDesc)=pressCLOEditUndo(appElement)
                                    report.directProbe.append("Split final undo: \(restoreDesc)")
                                    if restore {
                                        try? await Task.sleep(for:.milliseconds(600))
                                        await snap("restored")
                                    } else {report.warnings.append("Split final undo failed")}
                                } else {report.warnings.append("Split redo unavailable")}
                            } else {report.warnings.append("Split undo unavailable")}
                        } else {report.warnings.append("Cutline split click not dispatched")}
                    } else {report.warnings.append("Cutline split mode unavailable")}
                } else {report.warnings.append("Sewing reference probe requires copied T-shirt as sole window")}
            }
            if CommandLine.arguments.contains("--probe-fixture-pom-curve-update") {
                let windows = (attribute(appElement, kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                let copiedWindows=windows.filter { cloHasCopiedFixture($0) }
                let safeOverlays=windows.filter { !cloHasCopiedFixture($0) }.allSatisfy {
                    let f=rectAttribute($0) ?? [:]
                    return f["width",default:10000] <= 250 && f["height",default:10000] <= 100
                }
                if copiedWindows.count==1, safeOverlays, let window=copiedWindows.first,
                   clo.activate(options: []) {
                    let screenshotFile = folder.appendingPathComponent("clo-property-editor-reference.png")
                    func preserve(_ label: String) {
                        let dst = folder.appendingPathComponent("clo-pomcurve-\(label).png")
                        try? FileManager.default.removeItem(at: dst)
                        try? FileManager.default.copyItem(at: screenshotFile, to: dst)
                    }
                    func snap(_ label: String) async {
                        await captureCLO(to: folder, report: &report)
                        preserve(label)
                    }
                    let (pomMode, pomDescription) = pressCLOMenuPath(appElement,
                        labels: ["2D Pattern", "Point of Measure", "Point of Measure"])
                    report.directProbe.append(pomDescription)
                    if pomMode {
                        try? await Task.sleep(for: .milliseconds(450))
                        await snap("initial-pom-table")
                        // Exactly one normal side POM is expected in this disposable
                        // unsaved CLO session. If it exists already, retain it;
                        // otherwise create a one-edge test measurement.
                        let tableContents = (attribute(window, kAXChildrenAttribute as CFString) as? [AXUIElement]) ?? []
                        var rows = [AXUIElement]()
                        var pending = tableContents
                        var budget = 1200
                        while !pending.isEmpty && budget > 0 {
                            budget -= 1
                            let node = pending.removeFirst()
                            if stringAttribute(node, kAXValueAttribute as CFString) == "Point of Measure" { rows.append(node) }
                            if let children = attribute(node,kAXChildrenAttribute as CFString) as? [AXUIElement] {
                                pending.append(contentsOf: children.prefix(160))
                            }
                        }
                        report.directProbe.append("Existing POM Accessibility row matches: \(rows.count)")
                        if rows.isEmpty && !CommandLine.arguments.contains("--skip-initial-pom") {
                            _ = clo.activate(options: [])
                            if clickCLOWindowPoint(window, relativeX: 787, relativeY: 496) &&
                               doubleClickCLOWindowPoint(window, relativeX: 787, relativeY: 546) {
                                try? await Task.sleep(for: .milliseconds(500))
                                _ = doubleClickCLOWindowPoint(window, relativeX: 787, relativeY: 546)
                                try? await Task.sleep(for: .milliseconds(550))
                                await snap("created-pom-table")
                                report.directProbe.append("Attempted initial POM on left side; verify table row in screenshot")
                            } else { report.warnings.append("Cannot create initial POM") }
                        }
                        let (freeMode, freeDescription) = pressCLO2DMenuTool(appElement, name: "Edit Curve Point")
                        report.directProbe.append(freeDescription)
                        if freeMode {
                            try? await Task.sleep(for: .milliseconds(350))
                            _ = clo.activate(options: [])
                            let testX=inspectorOption("pom-curve-x",fallback:787)
                            let testY=inspectorOption("pom-curve-y",fallback:521)
                            if clickCLOWindowPoint(window, relativeX: testX, relativeY: testY) {
                                try? await Task.sleep(for: .milliseconds(650))
                                await snap("inserted-free-point")
                                _ = clo.activate(options: [])
                                if dragCopiedPatternPoint(window, localX:testX, localY:testY,deltaX:-12,deltaY:0) {
                                    try? await Task.sleep(for: .milliseconds(850))
                                    await snap("curve-dragged")
                                    let (reviewMode, reviewDescription) = pressCLOMenuPath(appElement,
                                        labels:["2D Pattern","Point of Measure","Edit Point of Measure"])
                                    report.directProbe.append(reviewDescription)
                                    if reviewMode {
                                        try? await Task.sleep(for: .milliseconds(600))
                                        await snap("pom-table-after-curve")
                                    } else { report.warnings.append("Could not inspect POM row after curve drag") }
                                    _ = clo.activate(options: [])
                                    let (undoDrag, undoMessage) = pressCLOEditUndo(appElement)
                                    report.directProbe.append("Undo free-point displacement: \(undoMessage)")
                                    if undoDrag {
                                        try? await Task.sleep(for: .milliseconds(650))
                                        await snap("pom-table-after-undo")
                                    } else { report.warnings.append("POM curve displacement Undo unavailable") }
                                } else { report.warnings.append("Free curve point drag not dispatched") }
                            } else { report.warnings.append("Free curve point click not dispatched") }
                        } else { report.warnings.append("Edit Curve Point unavailable during POM experiment") }
                    } else { report.warnings.append("POM tool could not activate") }
                } else { report.warnings.append("POM curve test requires sole copied T-shirt window") }
            }
            if CommandLine.arguments.contains("--probe-fixture-allowance-width") {
                let windows = (attribute(appElement, kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                if windows.count == 1, let window = windows.first,
                   cloHasCopiedFixture(window), clo.activate(options: []) {
                    let screenshotFile = folder.appendingPathComponent("clo-property-editor-reference.png")
                    func preserve(_ stage: String) {
                        let path = folder.appendingPathComponent("clo-allowance-width-\(stage).png")
                        try? FileManager.default.removeItem(at: path)
                        try? FileManager.default.copyItem(at: screenshotFile, to: path)
                    }
                    var queue: [AXUIElement] = [window]
                    var field: AXUIElement?
                    var budget = 1200
                    while !queue.isEmpty && budget > 0 {
                        budget -= 1
                        let node = queue.removeFirst()
                        let box = rectAttribute(node) ?? [:]
                        if stringAttribute(node, kAXRoleAttribute as CFString) == "AXIncrementor" &&
                           box["x",default:0] > 1350 && box["y",default:0] > 700 &&
                           box["y",default:0] < 800 {
                            field = node; break
                        }
                        if let children = attribute(node,kAXChildrenAttribute as CFString) as? [AXUIElement] {
                            queue.append(contentsOf: children.prefix(160))
                        }
                    }
                    if let field {
                        let before = stringAttribute(field,kAXValueAttribute as CFString)
                        report.directProbe.append("CLO seam-allowance Width prior AX value: \(before)")
                        if before == "1" || before == "1.00" {
                            await captureCLO(to: folder, report: &report)
                            preserve("before")
                            let setResult = AXUIElementSetAttributeValue(field, kAXValueAttribute as CFString,
                                                                         "1.50" as CFTypeRef)
                            report.directProbe.append("Set Width AXValue to 1.50 cm: \(setResult.rawValue)")
                            if setResult == .success {
                                try? await Task.sleep(for: .milliseconds(700))
                                report.directProbe.append("Width readback after set: \(stringAttribute(field,kAXValueAttribute as CFString))")
                                await captureCLO(to: folder, report: &report)
                                preserve("after")
                                let rollback = AXUIElementSetAttributeValue(field, kAXValueAttribute as CFString,
                                                                           "1.00" as CFTypeRef)
                                report.directProbe.append("Restored width AX result: \(rollback.rawValue)")
                                try? await Task.sleep(for: .milliseconds(700))
                                report.directProbe.append("Width readback after restore: \(stringAttribute(field,kAXValueAttribute as CFString))")
                                await captureCLO(to: folder, report: &report)
                                preserve("restored")
                                if rollback != .success { report.warnings.append("Width restore AX attempt failed") }
                                if stringAttribute(field,kAXValueAttribute as CFString) == "1" {
                                    _ = clo.activate(options: [])
                                    if typeCLOWidthInNumericEditor(field, value:"1.50") {
                                        try? await Task.sleep(for: .milliseconds(750))
                                        report.directProbe.append("Width after keyboard entry: \(stringAttribute(field,kAXValueAttribute as CFString))")
                                        await captureCLO(to: folder, report: &report)
                                        preserve("keyboard-150")
                                        if typeCLOWidthInNumericEditor(field, value:"1.00") {
                                            try? await Task.sleep(for: .milliseconds(750))
                                            report.directProbe.append("Width after keyboard restore: \(stringAttribute(field,kAXValueAttribute as CFString))")
                                            await captureCLO(to: folder, report: &report)
                                            preserve("keyboard-restored")
                                        } else { report.warnings.append("Numeric keyboard rollback could not be sent") }
                                    } else { report.warnings.append("Numeric keyboard editor interaction unavailable") }
                                }
                            } else { report.warnings.append("AX width value not writable; no numeric edit performed") }
                        } else { report.warnings.append("Width precondition value is not 1 cm") }
                    } else { report.warnings.append("CLO seam-allowance numeric width control inaccessible") }
                } else { report.warnings.append("Width probe requires copied garment as sole window") }
            }
            if CommandLine.arguments.contains("--probe-fixture-allowance-properties") {
                let windows = (attribute(appElement, kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                if windows.count == 1, let window = windows.first,
                   cloHasCopiedFixture(window), clo.activate(options: []) {
                    let screenshotFile = folder.appendingPathComponent("clo-property-editor-reference.png")
                    func preserve(_ suffix: String) {
                        let target = folder.appendingPathComponent("clo-allowance-property-\(suffix).png")
                        try? FileManager.default.removeItem(at: target)
                        try? FileManager.default.copyItem(at: screenshotFile, to: target)
                    }
                    await captureCLO(to: folder, report: &report)
                    preserve("before")
                    let (selected, description) = pressCLOMenuPath(appElement, labels: ["2D Pattern", "Create", "Seam Allowance "])
                    report.directProbe.append(description)
                    if selected {
                        try? await Task.sleep(for: .milliseconds(480))
                        _ = clo.activate(options: [])
                        if clickCLOWindowPoint(window, relativeX: 787, relativeY: 523) {
                            try? await Task.sleep(for: .milliseconds(550))
                            await captureCLO(to: folder, report: &report)
                            preserve("first")
                            _ = clo.activate(options: [])
                            if clickCLOWindowPoint(window, relativeX: 787, relativeY: 523) {
                                try? await Task.sleep(for: .milliseconds(550))
                                await captureCLO(to: folder, report: &report)
                                preserve("selected")
                                report.directProbe.append("Clicked left side once to create/select seam allowance and again to inspect native width/property state")
                            } else { report.warnings.append("Second seam allowance click unavailable") }
                        } else { report.warnings.append("First seam allowance click unavailable") }
                    } else { report.warnings.append("Seam Allowance mode unavailable") }
                } else { report.warnings.append("Seam allowance property test requires sole copied garment window") }
            }
            if CommandLine.arguments.contains("--probe-fixture-seam-allowance-placement") {
                let windows = (attribute(appElement, kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                if windows.count == 1, let window = windows.first, cloHasCopiedFixture(window),
                   clo.activate(options: []) {
                    let screenshotFile = folder.appendingPathComponent("clo-property-editor-reference.png")
                    func preserve(_ stage: String) {
                        let path = folder.appendingPathComponent("clo-allowance-\(stage).png")
                        try? FileManager.default.removeItem(at: path)
                        try? FileManager.default.copyItem(at: screenshotFile, to: path)
                    }
                    await captureCLO(to: folder, report: &report)
                    preserve("before")
                    let (activated, desc) = pressCLOMenuPath(appElement,
                        labels: ["2D Pattern", "Create", "Seam Allowance "])
                    report.directProbe.append(desc)
                    if activated {
                        try? await Task.sleep(for: .milliseconds(550))
                        _ = clo.activate(options: [])
                        if clickCLOWindowPoint(window, relativeX: 787, relativeY: 522) {
                            report.directProbe.append("Clicked copied T-shirt left torso side (787,522) with Seam Allowance")
                            try? await Task.sleep(for: .milliseconds(750))
                            await captureCLO(to: folder, report: &report)
                            preserve("after")
                            let (undid, message) = pressCLOEditUndo(appElement)
                            report.directProbe.append(message)
                            if undid {
                                try? await Task.sleep(for: .milliseconds(700))
                                await captureCLO(to: folder, report: &report)
                                preserve("undo")
                            } else { report.warnings.append("Seam Allowance Undo unavailable") }
                        } else { report.warnings.append("Seam Allowance click was not dispatched") }
                    } else { report.warnings.append("Seam Allowance mode unavailable") }
                    let (restored, message) = pressCLO2DMenuTool(appElement, name: "Transform Pattern")
                    report.directProbe.append("Restored Transform Pattern: \(message)")
                    if !restored { report.warnings.append("Cannot restore neutral tool after allowance test") }
                } else { report.warnings.append("Allowance test requires one copied garment window") }
            }
            if CommandLine.arguments.contains("--probe-fixture-notch-placement") {
                let windows = (attribute(appElement, kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                if windows.count == 1, let window = windows.first, cloHasCopiedFixture(window),
                   clo.activate(options: []) {
                    let screenshotFile = folder.appendingPathComponent("clo-property-editor-reference.png")
                    func preserve(_ stage: String) {
                        let path = folder.appendingPathComponent("clo-notch-\(stage).png")
                        try? FileManager.default.removeItem(at: path)
                        try? FileManager.default.copyItem(at: screenshotFile, to: path)
                    }
                    await captureCLO(to: folder, report: &report)
                    preserve("before")
                    let (activated, desc) = pressCLOMenuPath(appElement,
                        labels: ["2D Pattern", "Create", "Notch"])
                    report.directProbe.append(desc)
                    if activated {
                        try? await Task.sleep(for: .milliseconds(450))
                        _ = clo.activate(options: [])
                        if clickCLOWindowPoint(window, relativeX: 787, relativeY: 528) {
                            report.directProbe.append("Clicked copied T-shirt left side edge (787,528) in Notch mode")
                            try? await Task.sleep(for: .milliseconds(750))
                            await captureCLO(to: folder, report: &report)
                            preserve("after")
                            let (undid, message) = pressCLOEditUndo(appElement)
                            report.directProbe.append(message)
                            if undid {
                                try? await Task.sleep(for: .milliseconds(650))
                                await captureCLO(to: folder, report: &report)
                                preserve("undo")
                            } else { report.warnings.append("Notch Undo not available") }
                        } else { report.warnings.append("Notch edge click unavailable") }
                    } else { report.warnings.append("Notch creation tool unavailable") }
                    let (restored, message) = pressCLO2DMenuTool(appElement, name: "Transform Pattern")
                    report.directProbe.append("Restored Transform Pattern: \(message)")
                    if !restored { report.warnings.append("Could not restore neutral mode after notch probe") }
                } else { report.warnings.append("Notch placement requires sole copied garment window") }
            }
            if CommandLine.arguments.contains("--probe-fixture-pom-undo-redo") {
                let windows = (attribute(appElement, kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                if windows.count == 1, let window = windows.first,
                   cloHasCopiedFixture(window), clo.activate(options: []) {
                    let screenshotFile = folder.appendingPathComponent("clo-property-editor-reference.png")
                    func preserve(_ name: String) {
                        let output = folder.appendingPathComponent(name)
                        try? FileManager.default.removeItem(at: output)
                        try? FileManager.default.copyItem(at: screenshotFile, to: output)
                    }
                    await captureCLO(to: folder, report: &report)
                    preserve("clo-pom-undo-before.png")
                    let (undid, undoMessage) = pressCLOEditUndo(appElement)
                    report.directProbe.append(undoMessage)
                    if undid {
                        try? await Task.sleep(for: .milliseconds(800))
                        await captureCLO(to: folder, report: &report)
                        preserve("clo-pom-undo-after.png")
                        let (redid, redoMessage) = pressCLOEditRedo(appElement)
                        report.directProbe.append(redoMessage)
                        if redid {
                            try? await Task.sleep(for: .milliseconds(800))
                            await captureCLO(to: folder, report: &report)
                            preserve("clo-pom-redo-after.png")
                            let (restored, finalUndoMessage) = pressCLOEditUndo(appElement)
                            report.directProbe.append(finalUndoMessage)
                            if restored {
                                try? await Task.sleep(for: .milliseconds(700))
                                await captureCLO(to: folder, report: &report)
                                preserve("clo-pom-final-undo.png")
                            } else { report.warnings.append("Final POM Undo unavailable") }
                        } else { report.warnings.append("POM Redo unavailable") }
                    } else { report.warnings.append("POM Undo unavailable") }
                } else { report.warnings.append("POM undo/redo requires one copied garment window") }
            }
            if CommandLine.arguments.contains("--probe-fixture-complete-pom") {
                let windows = (attribute(appElement, kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                if windows.count == 1, let window = windows.first,
                   cloHasCopiedFixture(window), clo.activate(options: []) {
                    let screenshotFile = folder.appendingPathComponent("clo-property-editor-reference.png")
                    func preserve(_ name: String) {
                        let output = folder.appendingPathComponent(name)
                        try? FileManager.default.removeItem(at: output)
                        try? FileManager.default.copyItem(at: screenshotFile, to: output)
                    }
                    await captureCLO(to: folder, report: &report)
                    preserve("clo-pom-before-completion.png")
                    if doubleClickCLOWindowPoint(window, relativeX: 787, relativeY: 546) {
                        report.directProbe.append("Repeated POM completion double-click at front side hem (787,546)")
                        try? await Task.sleep(for: .milliseconds(750))
                        await captureCLO(to: folder, report: &report)
                        preserve("clo-pom-after-completion.png")
                    } else { report.warnings.append("POM completion double-click could not be dispatched") }
                } else { report.warnings.append("POM completion requires sole copied garment window") }
            }
            if CommandLine.arguments.contains("--probe-fixture-create-pom") {
                let windows = (attribute(appElement, kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                if windows.count == 1, let window = windows.first,
                   cloHasCopiedFixture(window), clo.activate(options: []) {
                    let screenshotFile = folder.appendingPathComponent("clo-property-editor-reference.png")
                    func preserve(_ name: String) {
                        let output = folder.appendingPathComponent(name)
                        try? FileManager.default.removeItem(at: output)
                        try? FileManager.default.copyItem(at: screenshotFile, to: output)
                    }
                    await captureCLO(to: folder, report: &report)
                    preserve("clo-pom-before.png")
                    let (activated, description) = pressCLOMenuPath(appElement,
                        labels: ["2D Pattern", "Point of Measure", "Point of Measure"])
                    report.directProbe.append(description)
                    if activated {
                        try? await Task.sleep(for: .milliseconds(500))
                        await captureCLO(to: folder, report: &report)
                        preserve("clo-pom-tool.png")
                        _ = clo.activate(options: [])
                        try? await Task.sleep(for: .milliseconds(250))
                        if clickCLOWindowPoint(window, relativeX: 787, relativeY: 496) {
                            report.directProbe.append("POM trace: clicked existing front torso side at (787,496)")
                            try? await Task.sleep(for: .milliseconds(240))
                            if doubleClickCLOWindowPoint(window, relativeX: 787, relativeY: 546) {
                                report.directProbe.append("POM trace: double-clicked side hem corner at (787,546) to complete")
                                try? await Task.sleep(for: .milliseconds(900))
                                await captureCLO(to: folder, report: &report)
                                preserve("clo-pom-completed.png")
                            } else { report.warnings.append("POM completion double-click failed") }
                        } else { report.warnings.append("POM starting point click failed") }
                    } else { report.warnings.append("POM mode unavailable") }
                } else { report.warnings.append("POM probe requires one copied-garment window") }
            }
            if CommandLine.arguments.contains("--probe-fixture-notch-pom-modes") {
                let windows = (attribute(appElement, kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                if windows.count == 1, let window = windows.first,
                   cloHasCopiedFixture(window), clo.activate(options: []) {
                    let screenshotFile = folder.appendingPathComponent("clo-property-editor-reference.png")
                    let modes: [(String, [String])] = [
                        ("notch", ["2D Pattern", "Create", "Notch"]),
                        ("seam-allowance", ["2D Pattern", "Create", "Seam Allowance "]),
                        ("point-of-measure", ["2D Pattern", "Point of Measure", "Point of Measure"]),
                        ("edit-point-of-measure", ["2D Pattern", "Point of Measure", "Edit Point of Measure"])
                    ]
                    for (name, path) in modes {
                        let (activated, description) = pressCLOMenuPath(appElement, labels: path)
                        report.directProbe.append(description)
                        if activated {
                            try? await Task.sleep(for: .milliseconds(500))
                            await captureCLO(to: folder, report: &report)
                            let output = folder.appendingPathComponent("clo-inspect-mode-\(name).png")
                            try? FileManager.default.removeItem(at: output)
                            try? FileManager.default.copyItem(at: screenshotFile, to: output)
                        } else { report.warnings.append("\(name) mode could not activate") }
                    }
                    let (restored, description) = pressCLO2DMenuTool(appElement, name: "Transform Pattern")
                    report.directProbe.append("Restored neutral Transform Pattern: \(description)")
                    if !restored { report.warnings.append("Neutral tool restoration unavailable") }
                } else { report.warnings.append("Notch/POM mode probe requires one copied garment window") }
            }
            if CommandLine.arguments.contains("--close-sewing-length-inspector") {
                let windows = (attribute(appElement, kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                if let panel = windows.first(where: {
                    stringAttribute($0, kAXTitleAttribute as CFString) == "Check Sewing Length"
                }), windows.contains(where: { cloHasCopiedFixture($0) }) {
                    let closeButtons = (attribute(panel, kAXChildrenAttribute as CFString) as? [AXUIElement])?.filter {
                        stringAttribute($0, kAXRoleAttribute as CFString) == "AXButton"
                    } ?? []
                    let closeButton = closeButtons.max(by: {
                        (rectAttribute($0)?["x"] ?? 0) < (rectAttribute($1)?["x"] ?? 0)
                    })
                    let closeResult: AXError = closeButton.map {
                        AXUIElementPerformAction($0, kAXPressAction as CFString)
                    } ?? .actionUnsupported
                    report.directProbe.append("Closed copied garment Check Sewing Length inspector: AX result \(closeResult.rawValue)")
                    if closeResult != .success { report.warnings.append("Check Sewing Length inspector did not close") }
                    try? await Task.sleep(for: .milliseconds(450))
                } else { report.warnings.append("No copied-garment Check Sewing Length inspector found") }
            }
            if CommandLine.arguments.contains("--probe-fixture-sewing-inspection") ||
               CommandLine.arguments.contains("--probe-fixture-sewing-only") {
                let windows = (attribute(appElement, kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                if windows.count == 1, let window = windows.first,
                   cloHasCopiedFixture(window), clo.activate(options: []) {
                    let screenshotFile = folder.appendingPathComponent("clo-property-editor-reference.png")
                    func preserve(_ name: String) {
                        let output = folder.appendingPathComponent(name)
                        try? FileManager.default.removeItem(at: output)
                        try? FileManager.default.copyItem(at: screenshotFile, to: output)
                    }
                    await captureCLO(to: folder, report: &report)
                    preserve("clo-sewing-inspect-before.png")
                    let (editSew, message) = pressCLOMenuPath(appElement, labels: ["Sewing", "Edit Sewing"])
                    report.directProbe.append(message)
                    if editSew {
                        try? await Task.sleep(for: .milliseconds(550))
                        await captureCLO(to: folder, report: &report)
                        preserve("clo-sewing-inspect-tool.png")
                        _ = clo.activate(options: [])
                        if clickCLOWindowPoint(window, relativeX: 787, relativeY: 519) {
                            report.directProbe.append("Selected left torso seam candidate at (787,519) while in Edit Sewing")
                            try? await Task.sleep(for: .milliseconds(650))
                            await captureCLO(to: folder, report: &report)
                            preserve("clo-sewing-inspect-selected.png")
                        }
                    }
                    if !CommandLine.arguments.contains("--probe-fixture-sewing-only") {
                        let (lengthMode, lengthDescription) = pressCLOMenuPath(appElement, labels: ["Sewing", "Check Sewing Length"])
                        report.directProbe.append(lengthDescription)
                        if lengthMode {
                            try? await Task.sleep(for: .milliseconds(600))
                            await captureCLO(to: folder, report: &report)
                            preserve("clo-sewing-length-mode.png")
                        } else { report.warnings.append("Check Sewing Length tool could not activate") }
                    }
                } else { report.warnings.append("Sewing inspect blocked: copied T-shirt must be sole document") }
            }
            if CommandLine.arguments.contains("--probe-fixture-sewn-split-cycle") {
                let windows = (attribute(appElement, kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                if windows.count == 1, let window = windows.first,
                   cloHasCopiedFixture(window), clo.activate(options: []) {
                    let screenshotFile = folder.appendingPathComponent("clo-property-editor-reference.png")
                    func preserve(_ name: String) {
                        let output = folder.appendingPathComponent(name)
                        try? FileManager.default.removeItem(at: output)
                        try? FileManager.default.copyItem(at: screenshotFile, to: output)
                    }
                    await captureCLO(to: folder, report: &report)
                    preserve("clo-sewn-split-before.png")
                    let (activated, message) = pressCLO2DMenuTool(appElement, name: "Add Point/Split Line")
                    report.directProbe.append(message)
                    if activated {
                        try? await Task.sleep(for: .milliseconds(500))
                        _ = clo.activate(options: [])
                        let clickX = inspectorOption("sewn-x", fallback: 787)
                        let clickY = inspectorOption("sewn-y", fallback: 521)
                        if clickCLOWindowPoint(window, relativeX: clickX, relativeY: clickY) {
                            report.directProbe.append("Clicked side cutline candidate at (\(clickX),\(clickY)) to test symmetry/sewing split")
                            try? await Task.sleep(for: .milliseconds(900))
                            await captureCLO(to: folder, report: &report)
                            preserve("clo-sewn-split-after.png")
                            if CommandLine.arguments.contains("--probe-fixture-sewn-split-measure") {
                                _ = clo.activate(options: [])
                                let (sewingMode, sewingMessage) = pressCLOMenuPath(appElement, labels: ["Sewing", "Edit Sewing"])
                                report.directProbe.append(sewingMessage)
                                if sewingMode {
                                    try? await Task.sleep(for: .milliseconds(550))
                                    _ = clo.activate(options: [])
                                    if clickCLOWindowPoint(window, relativeX: clickX, relativeY: clickY + 10) {
                                        report.directProbe.append("Inspected split-side sewing reference after insertion")
                                        try? await Task.sleep(for: .milliseconds(600))
                                        await captureCLO(to: folder, report: &report)
                                        preserve("clo-sewn-split-selected-sewing.png")
                                    }
                                } else { report.warnings.append("Split-edge sewing measurement mode could not activate") }
                            }
                            _ = clo.activate(options: [])
                            let (undid, undoDescription) = pressCLOEditUndo(appElement)
                            report.directProbe.append(undoDescription)
                            if undid {
                                try? await Task.sleep(for: .milliseconds(700))
                                await captureCLO(to: folder, report: &report)
                                preserve("clo-sewn-split-undone.png")
                                _ = clo.activate(options: [])
                                let (redid, redoDescription) = pressCLOEditRedo(appElement)
                                report.directProbe.append(redoDescription)
                                if redid {
                                    try? await Task.sleep(for: .milliseconds(700))
                                    await captureCLO(to: folder, report: &report)
                                    preserve("clo-sewn-split-redone.png")
                                    _ = clo.activate(options: [])
                                    let (restored, lastUndo) = pressCLOEditUndo(appElement)
                                    report.directProbe.append(lastUndo)
                                    if restored {
                                        try? await Task.sleep(for: .milliseconds(700))
                                        await captureCLO(to: folder, report: &report)
                                        preserve("clo-sewn-split-restored.png")
                                    } else { report.warnings.append("Final sewn split Undo was unavailable") }
                                } else { report.warnings.append("Sewn split Redo was unavailable") }
                            } else { report.warnings.append("Sewn split Undo was unavailable") }
                        } else { report.warnings.append("Sewn edge insertion click unavailable") }
                    } else { report.warnings.append("Add Point/Split Line did not activate") }
                } else { report.warnings.append("Sewn split requires the copied T-shirt as sole native document") }
            }
            if CommandLine.arguments.contains("--dismiss-clo-intersection-information") {
                let windows = (attribute(appElement, kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                let copiedDocument = windows.first(where: { cloHasCopiedFixture($0) })
                let info = windows.first(where: { window in
                    let children = (attribute(window, kAXChildrenAttribute as CFString) as? [AXUIElement]) ?? []
                    return children.contains(where: {
                        stringAttribute($0, kAXValueAttribute as CFString) == "Information"
                    }) && findCLOControl(window, name: "OK") != nil
                })
                if copiedDocument != nil, let info, pressCLODialogControl(info, name: "OK") {
                    report.directProbe.append("Dismissed CLO intersection Information alert on copied test fixture")
                    try? await Task.sleep(for: .milliseconds(400))
                } else { report.warnings.append("Expected CLO test-fixture Information alert was not present") }
            }
            if CommandLine.arguments.contains("--dismiss-fixture-intersection-warning") {
                let windows = (attribute(appElement, kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                let copiedWindow = windows.first(where: { cloHasCopiedFixture($0) })
                let dialog = windows.first(where: {
                    let f = rectAttribute($0) ?? [:]
                    return f["width", default: 0] >= 380 && f["width", default: 0] <= 440 &&
                           f["height", default: 0] >= 180 && f["height", default: 0] <= 230 &&
                           findCLOControl($0, name: "OK") != nil &&
                           findCLOControl($0, name: "Proceed") == nil
                })
                if copiedWindow != nil, windows.count == 2, let dialog,
                   pressCLODialogControl(dialog, name: "OK") {
                    report.directProbe.append("Dismissed CLO's native invalid-pattern Information dialog in copied fixture")
                    try? await Task.sleep(for: .milliseconds(900))
                } else { report.warnings.append("Cannot safely identify copied-garment intersection dialog") }
            }
            if CommandLine.arguments.contains("--probe-fixture-zoom-2d") {
                let windows = (attribute(appElement, kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                if windows.count == 1, let window = windows.first,
                   cloHasCopiedFixture(window), clo.activate(options: []) {
                    let screenshotFile = folder.appendingPathComponent("clo-property-editor-reference.png")
                    func preserve(_ name: String) {
                        let path = folder.appendingPathComponent(name)
                        try? FileManager.default.removeItem(at: path)
                        try? FileManager.default.copyItem(at: screenshotFile, to: path)
                    }
                    await captureCLO(to: folder, report: &report)
                    preserve("clo-zoom-before.png")
                    let amount = Int32(inspectorOption("zoom-steps", fallback: 5))
                    if scrollCLO2D(window, localX: 837, localY: 458, steps: amount) {
                        report.directProbe.append("Scrolled CLO 2D pattern viewport by \(amount) zoom units at (837,458)")
                        try? await Task.sleep(for: .milliseconds(900))
                        await captureCLO(to: folder, report: &report)
                        preserve("clo-zoom-after.png")
                    } else { report.warnings.append("CLO 2D zoom probe was blocked") }
                } else { report.warnings.append("CLO zoom requires visible copied fixture") }
            }
            if CommandLine.arguments.contains("--cancel-low-disk-clo-warning") {
                let windows = (attribute(appElement, kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                let warning = windows.first(where: {
                    findCLOControl($0, name: "Proceed") != nil &&
                    findCLOControl($0, name: "Cancel") != nil
                })
                if let warning, pressCLODialogControl(warning, name: "Cancel") {
                    report.directProbe.append("Cancelled CLO warning before low-disk garment load")
                    try? await Task.sleep(for: .milliseconds(400))
                } else { report.warnings.append("Low-disk CLO warning Cancel button unavailable") }
            }
            if CommandLine.arguments.contains("--discard-unsaved-copied-fixture") {
                let windows = (attribute(appElement, kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                let copiedWindow = windows.first(where: { cloHasCopiedFixture($0) })
                let savePrompt = windows.first(where: {
                    findCLOControl($0, name: "No") != nil &&
                    findCLOControl($0, name: "Overwrite") != nil &&
                    findCLOControl($0, name: "Save As") != nil
                })
                if copiedWindow != nil, let savePrompt,
                   pressCLODialogControl(savePrompt,name:"No") {
                    report.directProbe.append("Declined to save unsaved edits in copied garment on reload")
                    try? await Task.sleep(for: .milliseconds(800))
                } else { report.warnings.append("Copied-garment discard dialog not safely confirmed") }
            }
            if CommandLine.arguments.contains("--inspect-clo-menu") {
                if let bar = attribute(appElement, kAXMenuBarAttribute as CFString) {
                    var budget = 1800
                    report.cloMenuBar = scan(bar as! AXUIElement, depth: 0, budget: &budget)
                    report.directProbe.append("Read live CLO menu bar using Accessibility")
                } else { report.warnings.append("CLO menu bar inaccessible through AX") }
            }
            if CommandLine.arguments.contains("--probe-fixture-tool-modes") {
                let windows = (attribute(appElement, kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                if windows.count == 1, let window = windows.first,
                   cloHasCopiedFixture(window), clo.activate(options: []) {
                    let temporary = folder.appendingPathComponent("clo-property-editor-reference.png")
                    // Only switch tool modes; never click a pattern, run simulation,
                    // change coordinates, or save the test garment.
                    let modes = ["Edit Pattern", "Edit Curvature", "Edit Curve Point", "Add Point/Split Line", "Transform Point/Segment"]
                    for (number, mode) in modes.enumerated() {
                        let (ok, explanation) = pressCLO2DMenuTool(appElement, name: mode)
                        report.directProbe.append(explanation)
                        if !ok { continue }
                        try? await Task.sleep(for: .milliseconds(500))
                        await captureCLO(to: folder, report: &report)
                        let output = folder.appendingPathComponent("clo-tool-mode-\(number + 1).png")
                        try? FileManager.default.removeItem(at: output)
                        try? FileManager.default.copyItem(at: temporary, to: output)
                    }
                    // Return to nonediting Transform Pattern selection mode.
                    let (restored, explanation) = pressCLO2DMenuTool(appElement, name: "Transform Pattern")
                    report.directProbe.append("Restore default selection mode: \(explanation)")
                    if !restored { report.warnings.append("2D tool mode restoration could not be verified") }
                } else { report.warnings.append("Tool-mode inspection requires exactly one CLO window showing the copied T-shirt") }
            }
            if CommandLine.arguments.contains("--probe-fixture-menu-undo") {
                let windows = (attribute(appElement, kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                let copiedWindows = windows.filter { cloHasCopiedFixture($0) }
                let extraWindows = windows.filter { !cloHasCopiedFixture($0) }
                let safeOverlays = extraWindows.allSatisfy {
                    let rect = rectAttribute($0) ?? [:]
                    return rect["width", default: 10000] <= 250 &&
                           rect["height", default: 10000] <= 100
                }
                if copiedWindows.count == 1, safeOverlays,
                   clo.activate(options: []) {
                    let screenshotFile = folder.appendingPathComponent("clo-property-editor-reference.png")
                    func preserve(_ name: String) {
                        let output = folder.appendingPathComponent(name)
                        try? FileManager.default.removeItem(at: output)
                        try? FileManager.default.copyItem(at: screenshotFile, to: output)
                    }
                    await captureCLO(to: folder, report: &report)
                    preserve("clo-menu-undo-before.png")
                    let (ok, description) = pressCLOEditUndo(appElement)
                    report.directProbe.append(description)
                    if ok { try? await Task.sleep(for: .milliseconds(950)) }
                    await captureCLO(to: folder, report: &report)
                    preserve("clo-menu-undo-after.png")
                    if !ok { report.warnings.append("CLO Edit menu Undo did not execute") }
                } else { report.warnings.append("CLO menu Undo guarded: copied fixture must be sole visible garment") }
            }
            if CommandLine.arguments.contains("--probe-fixture-redo-undo") {
                let windows = (attribute(appElement, kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                let copiedWindows = windows.filter { cloHasCopiedFixture($0) }
                let safeOverlays = windows.filter { !cloHasCopiedFixture($0) }.allSatisfy {
                    let f = rectAttribute($0) ?? [:]
                    return f["width",default:10000] <= 250 && f["height",default:10000] <= 100
                }
                if copiedWindows.count == 1, safeOverlays,
                   clo.activate(options: []) {
                    let screenshotFile = folder.appendingPathComponent("clo-property-editor-reference.png")
                    func preserve(_ name: String) {
                        let output = folder.appendingPathComponent(name)
                        try? FileManager.default.removeItem(at: output)
                        try? FileManager.default.copyItem(at: screenshotFile, to: output)
                    }
                    await captureCLO(to: folder, report: &report)
                    preserve("clo-redo-before.png")
                    let (redid, redoMessage) = pressCLOEditRedo(appElement)
                    report.directProbe.append(redoMessage)
                    if redid {
                        try? await Task.sleep(for: .milliseconds(850))
                        await captureCLO(to: folder, report: &report)
                        preserve("clo-redo-after.png")
                        _ = clo.activate(options: [])
                        let (undid, undoMessage) = pressCLOEditUndo(appElement)
                        report.directProbe.append(undoMessage)
                        if undid {
                            try? await Task.sleep(for: .milliseconds(850))
                            await captureCLO(to: folder, report: &report)
                            preserve("clo-redo-undo-restored.png")
                        } else { report.warnings.append("Undo after Redo not available") }
                    } else { report.warnings.append("Copied garment Redo unavailable") }
                } else { report.warnings.append("Redo/Undo requires single copied CLO garment") }
            }
            if CommandLine.arguments.contains("--probe-fixture-add-point") {
                let windows = (attribute(appElement, kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                if windows.count == 1, let window = windows.first, cloHasCopiedFixture(window),
                   clo.activate(options: []) {
                    let screenshotFile = folder.appendingPathComponent("clo-property-editor-reference.png")
                    func preserve(_ name: String) {
                        let output = folder.appendingPathComponent(name)
                        try? FileManager.default.removeItem(at: output)
                        try? FileManager.default.copyItem(at: screenshotFile, to: output)
                    }
                    await captureCLO(to: folder, report: &report)
                    preserve("clo-native-add-point-before.png")
                    let (activated, message) = pressCLO2DMenuTool(appElement, name: "Add Point/Split Line")
                    report.directProbe.append(message)
                    if activated {
                        try? await Task.sleep(for: .milliseconds(650))
                        await captureCLO(to: folder, report: &report)
                        preserve("clo-native-add-point-tool.png")
                        _ = clo.activate(options: [])
                        try? await Task.sleep(for: .milliseconds(350))
                        let targetX = inspectorOption("point-x", fallback: 815)
                        let targetY = inspectorOption("point-y", fallback: 543)
                        if clickCLOWindowPoint(window, relativeX: targetX, relativeY: targetY) {
                            report.directProbe.append("Clicked loaded 2D T-shirt outline candidate at (\(targetX),\(targetY)) with Add Point/Split Line")
                            try? await Task.sleep(for: .milliseconds(950))
                            await captureCLO(to: folder, report: &report)
                            preserve("clo-native-add-point-result.png")
                        } else { report.warnings.append("Add Point click could not be dispatched") }
                    } else { report.warnings.append("Add Point menu tool was not activated") }
                } else { report.warnings.append("Add Point blocked: copied garment must be sole CLO document") }
            }
            if CommandLine.arguments.contains("--probe-fixture-edit-curve-point") {
                let windows = (attribute(appElement, kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                if windows.count == 1, let window = windows.first,
                   cloHasCopiedFixture(window), clo.activate(options: []) {
                    let screenshotFile = folder.appendingPathComponent("clo-property-editor-reference.png")
                    func preserve(_ name: String) {
                        let output = folder.appendingPathComponent(name)
                        try? FileManager.default.removeItem(at: output)
                        try? FileManager.default.copyItem(at: screenshotFile, to: output)
                    }
                    await captureCLO(to: folder, report: &report)
                    preserve("clo-native-free-curve-point-before.png")
                    let (activated, message) = pressCLO2DMenuTool(appElement, name: "Edit Curve Point")
                    report.directProbe.append(message)
                    if activated {
                        try? await Task.sleep(for: .milliseconds(450))
                        await captureCLO(to: folder, report: &report)
                        preserve("clo-native-free-curve-point-tool.png")
                        _ = clo.activate(options: [])
                        try? await Task.sleep(for: .milliseconds(300))
                        let testX = inspectorOption("free-point-x", fallback: 830)
                        let testY = inspectorOption("free-point-y", fallback: 435)
                        if clickCLOWindowPoint(window, relativeX: testX, relativeY: testY) {
                            report.directProbe.append("Clicked copied T-shirt segment (\(testX),\(testY)) with native Edit Curve Point")
                            try? await Task.sleep(for: .milliseconds(800))
                            await captureCLO(to: folder, report: &report)
                            preserve("clo-native-free-curve-point-after.png")
                        } else { report.warnings.append("Free curve point click could not be dispatched") }
                    } else { report.warnings.append("Edit Curve Point tool could not be selected") }
                } else { report.warnings.append("Curve point probe requires copied garment visible in one CLO window") }
            }
            if CommandLine.arguments.contains("--probe-fixture-edit-curvature") {
                let windows = (attribute(appElement, kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                if windows.count == 1, let window = windows.first, cloHasCopiedFixture(window),
                   clo.activate(options: []) {
                    let screenshotFile = folder.appendingPathComponent("clo-property-editor-reference.png")
                    func preserve(_ name: String) {
                        let output = folder.appendingPathComponent(name)
                        try? FileManager.default.removeItem(at: output)
                        try? FileManager.default.copyItem(at: screenshotFile, to: output)
                    }
                    let (activated, message) = pressCLO2DMenuTool(appElement, name: "Edit Curvature")
                    report.directProbe.append(message)
                    if activated {
                        try? await Task.sleep(for: .milliseconds(650))
                        await captureCLO(to: folder, report: &report)
                        preserve("clo-native-curvature-before.png")
                        _ = clo.activate(options: [])
                        let startX = inspectorOption("curve-x", fallback: 825)
                        let startY = inspectorOption("curve-y", fallback: 422)
                        if dragCopiedPatternPoint(window, localX: startX, localY: startY,
                                                  deltaX: inspectorOption("curve-dx", fallback: -9),
                                                  deltaY: inspectorOption("curve-dy", fallback: -13)) {
                            report.directProbe.append("Dispatched real Edit Curvature drag on visible neckline at (\(startX),\(startY))")
                            try? await Task.sleep(for: .milliseconds(1000))
                            await captureCLO(to: folder, report: &report)
                            preserve("clo-native-curvature-after.png")
                            _ = clo.activate(options: [])
                            let (undone, message) = pressCLOEditUndo(appElement)
                            report.directProbe.append(message)
                            if undone {
                                try? await Task.sleep(for: .milliseconds(1000))
                                await captureCLO(to: folder, report: &report)
                                preserve("clo-native-curvature-undo.png")
                            } else { report.warnings.append("Curvature Undo not verified") }
                        } else { report.warnings.append("Curvature drag was not dispatched") }
                    } else { report.warnings.append("Edit Curvature could not activate") }
                } else { report.warnings.append("Curvature probe blocked: copied garment required") }
            }
            if CommandLine.arguments.contains("--probe-fixture-drag-curve-point") {
                let windows = (attribute(appElement, kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                if windows.count == 1, let window = windows.first,
                   cloHasCopiedFixture(window), clo.activate(options: []),
                   pressCLO2DMenuTool(appElement, name: "Edit Curve Point").0 {
                    try? await Task.sleep(for: .milliseconds(500))
                    let screenshotFile = folder.appendingPathComponent("clo-property-editor-reference.png")
                    func preserve(_ name: String) {
                        let output = folder.appendingPathComponent(name)
                        try? FileManager.default.removeItem(at: output)
                        try? FileManager.default.copyItem(at: screenshotFile, to: output)
                    }
                    await captureCLO(to: folder, report: &report)
                    preserve("clo-native-curve-point-drag-before.png")
                    let targetX = inspectorOption("free-point-x", fallback: 830)
                    let targetY = inspectorOption("free-point-y", fallback: 435)
                    let deltaX = inspectorOption("free-point-dx", fallback: -10)
                    let deltaY = inspectorOption("free-point-dy", fallback: 8)
                    if dragCopiedPatternPoint(window, localX: targetX, localY: targetY,
                                              deltaX: deltaX, deltaY: deltaY) {
                        report.directProbe.append("Dragged selected Edit Curve Point at (\(targetX),\(targetY)) by (\(deltaX),\(deltaY)) screen pixels on copied garment")
                        try? await Task.sleep(for: .milliseconds(950))
                        await captureCLO(to: folder, report: &report)
                        preserve("clo-native-curve-point-drag-after.png")
                        _ = clo.activate(options: [])
                        let (undid, message) = pressCLOEditUndo(appElement)
                        report.directProbe.append(message)
                        if undid {
                            try? await Task.sleep(for: .milliseconds(950))
                            await captureCLO(to: folder, report: &report)
                            preserve("clo-native-curve-point-drag-undone.png")
                        } else { report.warnings.append("Curve point Undo was unavailable") }
                    } else { report.warnings.append("Curve point drag was not dispatched") }
                } else { report.warnings.append("Curve point drag requires copied garment and Edit Curve Point mode") }
            }
            if CommandLine.arguments.contains("--probe-fixture-point-drag") || CommandLine.arguments.contains("--probe-fixture-point-menu-undo") {
                let windows = (attribute(appElement, kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                if windows.count == 1, let window = windows.first, cloHasCopiedFixture(window),
                   clo.activate(options: []),
                   (clickCLOControl(window, name: "Edit Pattern") || pressCLO2DMenuTool(appElement, name: "Edit Pattern").0) {
                    try? await Task.sleep(for: .milliseconds(800))
                    let screenshotFile = folder.appendingPathComponent("clo-property-editor-reference.png")
                    func preserve(_ name: String) {
                        let output = folder.appendingPathComponent(name)
                        try? FileManager.default.removeItem(at: output)
                        try? FileManager.default.copyItem(at: screenshotFile, to: output)
                        try? FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: output.path)
                    }
                    await captureCLO(to: folder, report: &report)
                    preserve("clo-native-direct-before-drag.png")
                    let menuUndoProbe = CommandLine.arguments.contains("--probe-fixture-point-menu-undo")
                    let dragWorked = menuUndoProbe
                        ? dragCopiedPatternPoint(window, localX: 795, localY: 427, deltaX: -12, deltaY: -7)
                        : dragCopiedPatternPoint(window)
                    if dragWorked {
                        report.directProbe.append(menuUndoProbe
                            ? "Dragged real left shoulder anchor (-12,-7) in copied CLO garment"
                            : "Dispatched 22px/9px live CLO Edit Pattern shoulder-anchor drag on copied garment")
                        try? await Task.sleep(for: .milliseconds(1200))
                        await captureCLO(to: folder, report: &report)
                        preserve("clo-native-direct-after-drag.png")
                        _ = clo.activate(options: [])
                        try? await Task.sleep(for: .milliseconds(350))
                        let menuResult = menuUndoProbe ? pressCLOEditUndo(appElement) : (false, "")
                        let undoWorked = menuUndoProbe ? menuResult.0 : undoCLOTestGesture()
                        if menuUndoProbe { report.directProbe.append(menuResult.1) }
                        if undoWorked {
                            report.directProbe.append(menuUndoProbe ? "Executed CLO Edit > Undo command" : "Dispatched Command-Z to undo copied garment gesture")
                            try? await Task.sleep(for: .milliseconds(1200))
                            await captureCLO(to: folder, report: &report)
                            preserve("clo-native-direct-after-undo.png")
                        } else { report.warnings.append("Could not send undo command") }
                    } else { report.warnings.append("Copied garment anchor drag was not dispatched") }
                } else { report.warnings.append("Copied garment test blocked: wrong active file, wrong window count, or edit tool unavailable") }
            }
            if CommandLine.arguments.contains("--probe-fixture-curve-handle") {
                let windows = (attribute(appElement,kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                if windows.count == 1, let window = windows.first, cloHasCopiedFixture(window),
                   clo.activate(options:[]) {
                    try? await Task.sleep(for: .milliseconds(400))
                    let screenshotFile = folder.appendingPathComponent("clo-property-editor-reference.png")
                    func preserve(_ name: String) {
                        let output = folder.appendingPathComponent(name)
                        try? FileManager.default.removeItem(at: output)
                        try? FileManager.default.copyItem(at: screenshotFile, to: output)
                        try? FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: output.path)
                    }
                    await captureCLO(to: folder,report:&report)
                    preserve("clo-native-curve-before.png")
                    if dragCopiedPatternPoint(window,localX:852,localY:241,deltaX:-15,deltaY:-16) {
                        report.directProbe.append("Dragged visible neckline curve control by (-15,-16) pixels in copied CLO garment")
                        try? await Task.sleep(for:.milliseconds(850))
                        await captureCLO(to: folder,report:&report)
                        preserve("clo-native-curve-after.png")
                        _ = clo.activate(options:[])
                        try? await Task.sleep(for:.milliseconds(350))
                        if undoCLOTestGesture() {
                            report.directProbe.append("Focused CLO and invoked Undo for test neckline curve gesture")
                            try? await Task.sleep(for:.milliseconds(950))
                            await captureCLO(to: folder,report:&report)
                            preserve("clo-native-curve-undone.png")
                        } else { report.warnings.append("Curve edit Undo was not dispatched") }
                    } else { report.warnings.append("Curve control drag was not dispatched") }
                } else { report.warnings.append("Curve probe blocked: only the copied T-shirt may be edited") }
            }
            if CommandLine.arguments.contains("--probe-fixture-undo-only") {
                let windows = (attribute(appElement, kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                if windows.count == 1, let window = windows.first, cloHasCopiedFixture(window),
                   clo.activate(options: []) {
                    try? await Task.sleep(for: .milliseconds(500))
                    if undoCLOTestGesture() {
                        report.directProbe.append("Focused live CLO window and dispatched Undo on copied garment")
                        try? await Task.sleep(for: .milliseconds(900))
                    } else { report.warnings.append("Focused undo could not be dispatched") }
                } else { report.warnings.append("Undo-only blocked: the copied T-shirt is not the sole visible document") }
            }
            if CommandLine.arguments.contains("--probe-fixture-segment") || CommandLine.arguments.contains("--probe-fixture-neckline") {
                let windows = (attribute(appElement, kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                if windows.count == 1, let window = windows.first, cloHasCopiedFixture(window),
                   clo.activate(options: []) {
                    try? await Task.sleep(for: .milliseconds(350))
                    let neckline = CommandLine.arguments.contains("--probe-fixture-neckline")
                    let x: CGFloat = neckline ? 855 : 800
                    let y: CGFloat = neckline ? 225 : 206
                    if clickCLOWindowPoint(window,relativeX:x,relativeY:y) {
                        report.directProbe.append("Clicked CLO 2D copied fixture \(neckline ? "neckline curve" : "shoulder segment") at (\(x),\(y))")
                        try? await Task.sleep(for:.milliseconds(750))
                    } else { report.warnings.append("Could not select copied fixture segment") }
                } else { report.warnings.append("Segment probe blocked: only the copied T-shirt is permitted") }
            }
            if CommandLine.arguments.contains("--confirm-open-fixture") || CommandLine.arguments.contains("--confirm-open-garment") {
                let windows = (attribute(appElement, kAXWindowsAttribute as CFString) as? [AXUIElement]) ?? []
                if let dialog = windows.first(where: { stringAttribute($0,kAXTitleAttribute as CFString) == "Dialog" }),
                   findCLOControl(dialog,name:"Open") != nil,
                   findCLOControl(dialog,name:"OK") != nil,
                   pressCLODialogControl(dialog,name:"Open") {
                    try? await Task.sleep(for: .milliseconds(250))
                    if pressCLODialogControl(dialog,name:"OK") {
                        report.directProbe.append("Confirmed CLO Open Garment dialog in Open mode")
                        try? await Task.sleep(for: .seconds(3))
                    } else { report.warnings.append("Fixture dialog OK failed") }
                } else { report.warnings.append("Expected Open Garment dialog was not present") }
            }
            if CommandLine.arguments.contains("--probe-edit-pattern") || CommandLine.arguments.contains("--probe-select-point") {
                if clo.activate(options: []),
                   let windows = attribute(appElement, kAXWindowsAttribute as CFString) as? [AXUIElement],
                   let window = windows.first,
                   clickCLOControl(window, name: "Edit Pattern") {
                    report.directProbe.append("Activated CLO 2D Edit Pattern toolbar control")
                    try? await Task.sleep(for: .milliseconds(750))
                    if CommandLine.arguments.contains("--probe-select-point") {
                        // The user-loaded Male_T-shirt.zpac, verified by the
                        // native inspector screenshot at 1512x900. The center
                        // neckline anchor appears at local (929,385). Click
                        // selects it only; geometry and document are unchanged.
                        if clickCLOWindowPoint(window, relativeX: 929, relativeY: 385) {
                            report.directProbe.append("Clicked visible center-neckline anchor in existing 2D pattern")
                            try? await Task.sleep(for: .milliseconds(850))
                        } else { report.warnings.append("2D anchor selection probe was not dispatched") }
                    }
                } else { report.warnings.append("2D Edit Pattern control could not be activated") }
            }
            if CommandLine.arguments.contains("--select-fabric") {
                if clo.activate(options: []),
                   selectExistingFabricForInspection(appElement) {
                    try? await Task.sleep(for: .milliseconds(800))
                } else {
                    report.warnings.append("CLO FABRIC 1 row was not safely selectable")
                }
            }
            if CommandLine.arguments.contains("--scroll-property") {
                if clo.activate(options:[]), scrollLivePropertyEditor(appElement) {
                    try? await Task.sleep(for:.milliseconds(700))
                } else {
                    report.warnings.append("CLO Property Editor was not scrollable via AX position")
                }
            }
            if let windows = attribute(appElement, kAXWindowsAttribute as CFString) as? [AXUIElement] {
                report.cloWindowCount = windows.count
                AXUIElementSetMessagingTimeout(appElement, 2)
                var budget = 3000
                for window in windows.prefix(5) where budget > 0 {
                    report.cloWindows.append(scan(window, depth: 0, budget: &budget))
                }
            } else {
                report.warnings.append("CLO Accessibility window tree unavailable")
            }
        }
        await captureCLO(to: folder, report: &report)
        let destination = folder.appendingPathComponent("latest-status.json")
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        if let data = try? encoder.encode(report) {
            try? data.write(to: destination, options: .atomic)
            try? FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: destination.path)
        }
        app.terminate(nil)
    }
}
