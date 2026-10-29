import AppKit
import WebKit
import CryptoKit

// Strictly opt-in. An isolated website-data store avoids the designer's saved garments.
final class NativeWebAcceptance: NSObject, WKNavigationDelegate, WKDownloadDelegate {
    private weak var web: WKWebView?
    private let output: URL
    private var finished = false
    private var watchdog: Timer?
    private var firstLoad = true
    private var firstPieceCount = 0
    private var expectedDownloads: [String] = [".dxf", ".pdf", ".svg", ".xml", ".zip"]
    private var finishedDownloads: [String: [String: Any]] = [:]
    private var pendingDownloads = Set<String>()
    private var downloadFailure: String?
    private var finalJSReport: [String: Any]?
    private let downloadsDirectory: URL

    init(web: WKWebView, output: URL) {
        self.web = web
        self.output = output
        self.downloadsDirectory = output.deletingLastPathComponent().appendingPathComponent(output.deletingPathExtension().lastPathComponent + "-downloads", isDirectory:true)
        try? FileManager.default.createDirectory(at:self.downloadsDirectory,withIntermediateDirectories:true)
        super.init()
        web.navigationDelegate = self
        watchdog = Timer.scheduledTimer(withTimeInterval: 45, repeats: false) { [weak self] _ in
            self?.complete(["pass": false, "error": "WebKit acceptance timed out"])
        }
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, preferences: WKWebpagePreferences, decisionHandler: @escaping (WKNavigationActionPolicy, WKWebpagePreferences) -> Void) {
        if navigationAction.shouldPerformDownload { decisionHandler(.download, preferences) }
        else { decisionHandler(.allow, preferences) }
    }

    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) {
        download.delegate = self
    }
    func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) {
        download.delegate = self
    }
    func download(_ download: WKDownload, decideDestinationUsing response: URLResponse, suggestedFilename: String, completionHandler: @escaping (URL?) -> Void) {
        let name = URL(fileURLWithPath:suggestedFilename).lastPathComponent
        guard expectedDownloads.contains(where:{name.hasSuffix($0)}), !name.contains("/") else {
            downloadFailure = "Unexpected download file: \(name)"
            completionHandler(nil)
            return
        }
        pendingDownloads.insert(name)
        let destination=downloadsDirectory.appendingPathComponent(name)
        completionHandler(FileManager.default.fileExists(atPath:destination.path) ? nil : destination)
    }
    func downloadDidFinish(_ download: WKDownload) {
        let names = (try? FileManager.default.contentsOfDirectory(atPath: downloadsDirectory.path)) ?? []
        for name in names where pendingDownloads.contains(name) {
            let file=downloadsDirectory.appendingPathComponent(name)
            if let bytes=try? Data(contentsOf:file), bytes.count>20 {
                let hash=SHA256.hash(data:bytes).map {String(format:"%02x",$0)}.joined()
                finishedDownloads[name] = ["bytes":bytes.count,"sha256":hash,"validSignature":Self.signature(bytes,name:name)]
                pendingDownloads.remove(name)
            }
        }
        finalizeIfReady()
    }
    func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
        downloadFailure = error.localizedDescription
        finalizeIfReady()
    }
    private static func signature(_ bytes: Data,name:String) -> Bool {
        if name.hasSuffix(".pdf") {return bytes.starts(with:Data("%PDF-".utf8))}
        if name.hasSuffix(".zip") {return bytes.starts(with:[0x50,0x4b,0x03,0x04])}
        if name.hasSuffix(".dxf") {return String(decoding:bytes.prefix(256),as:UTF8.self).contains("SECTION")}
        if name.hasSuffix(".svg") {return String(decoding:bytes.prefix(400),as:UTF8.self).contains("<svg")}
        if name.hasSuffix(".xml") {return String(decoding:bytes.prefix(400),as:UTF8.self).contains("<?xml")}
        return false
    }
    private func finalizeIfReady() {
        guard let report=finalJSReport else{return}
        let allPresent = expectedDownloads.allSatisfy { ext in finishedDownloads.contains(where: {$0.key.hasSuffix(ext)}) }
        if !allPresent && downloadFailure == nil { return }
        var result=report
        result["downloads"] = finishedDownloads
        result["actualDownloadVerified"] = allPresent && downloadFailure == nil && finishedDownloads.values.allSatisfy { $0["validSignature"] as? Bool == true }
        result["pass"] = (report["pass"] as? Bool == true) && (result["actualDownloadVerified"] as? Bool == true)
        if let downloadFailure {result["downloadError"] = downloadFailure}
        complete(result)
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        complete(["pass": false, "error": "WebKit navigation failed: \(error.localizedDescription)"])
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        complete(["pass": false, "error": "WebKit provisional navigation failed: \(error.localizedDescription)"])
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        if !firstLoad {
            verifyReopen(webView)
            return
        }
        firstLoad = false
        let script = """
        (async function () {
          const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
          const deadline = Date.now() + 20000;
          while (Date.now() < deadline && !document.querySelector('.pattern-canvas')) await sleep(150);
          const canvas = document.querySelector('.pattern-canvas');
          if (!canvas) return { pass:false, error:'Pattern canvas did not mount', body:document.body.innerText.slice(0,300) };
          window.dispatchEvent(new CustomEvent('garment-studio-native-action', {detail:'file.save'}));
          await sleep(1500);
          const before = JSON.parse(localStorage.getItem('garment-studio-tee-first-fit-project-v2') || 'null');
          if (!before || !Array.isArray(before.pieces) || !before.pieces.length) return {pass:false,error:'Tee test project missing',url:location.href,keys:Object.keys(localStorage),body:document.body.innerText.slice(0,250),notifications:[...document.querySelectorAll('[role=status]')].map(x=>x.textContent).slice(0,6),statusText:document.body.innerText.slice(-1000)};
          const first = before.pieces[0];
          if (!Array.isArray(first.points) || !first.points.length) return {pass:false,error:'Tee pattern has no editable points'};
          window.dispatchEvent(new CustomEvent('garment-studio-native-action', {detail:'file.save'}));
          await sleep(600);
          const saved = JSON.parse(localStorage.getItem('garment-studio-tee-first-fit-project-v2') || 'null');
          if (!saved || JSON.stringify(saved.pieces) !== JSON.stringify(before.pieces)) return {pass:false,error:'Save failed to retain project cutlines'};
          const grade = document.querySelector('[aria-label="CLO-style workspace layout presets"]');
          if (!grade) return {pass:false,error:'Workspace layout presets missing'};
          grade.value='gradingStudio';
          grade.dispatchEvent(new Event('change',{bubbles:true}));
          await sleep(800);
          const hasGrade = !!document.querySelector('.grade-point-table');
          const hasCanvas = !!document.querySelector('.pattern-canvas');
          const row = document.querySelector('.grade-point-row');
          const auto = [...(row?.querySelectorAll('button') || [])].find(button => button.textContent.trim() === 'AUTO');
          if (!auto) return {pass:false,error:'AUTO point control not found'};
          auto.click();
          await sleep(400);
          const x = document.querySelector('[aria-label="Point 1 X grade increment in centimeters per size"]');
          const y = document.querySelector('[aria-label="Point 1 Y grade increment in centimeters per size"]');
          if (!x || !y) return {pass:false,error:'Custom grade inputs missing'};
          const change = (field, value) => {
            const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
            setter.call(field,String(value));
            field.dispatchEvent(new Event('input',{bubbles:true}));
            field.dispatchEvent(new Event('change',{bubbles:true}));
            field.dispatchEvent(new Event('blur',{bubbles:true}));
          };
          change(x,-1.25); await sleep(150); change(y,0.75); await sleep(300);
          window.dispatchEvent(new CustomEvent('garment-studio-native-action',{detail:'file.save'}));
          await sleep(850);
          const edited = JSON.parse(localStorage.getItem('garment-studio-tee-first-fit-project-v2') || 'null');
          const matching = edited?.pieces?.flatMap(piece => piece.points.map(point => point.gradeRule)).find(rule => rule?.enabled && rule.dxPerSize === -1.25 && rule.dyPerSize === 0.75);
          if (!matching) return {pass:false,error:'Edited grading values were not saved',gradeRules:edited?.pieces?.flatMap(piece=>piece.points.map(point=>point.gradeRule)).filter(Boolean).slice(0,3)};
          return {pass:hasGrade && hasCanvas, saved:true, gradeVisible:hasGrade, canvasVisible:hasCanvas, pieceCount:edited.pieces.length, gradeX:-1.25, gradeY:0.75};
        })().then(result => JSON.stringify(result))
        """
        webView.callAsyncJavaScript("return await " + script, arguments: [:], in: nil, in: .page) { [weak self] result in
            switch result {
            case .success(let value):
                if let json = value as? String, let data = json.data(using: .utf8), let report = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    if report["pass"] as? Bool == true, let count = report["pieceCount"] as? Int {
                        self?.firstPieceCount = count
                        webView.reload()
                    } else { self?.complete(report) }
                } else { self?.complete(["pass": false, "error": "Invalid acceptance response"]) }
            case .failure(let error):
                self?.complete(["pass": false, "error": "WebKit acceptance JS failed: \(error.localizedDescription)"])
            }
        }
    }

    private func verifyReopen(_ webView: WKWebView) {
        let script = """
        (async function () {
          const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
          const deadline = Date.now() + 15000;
          while(Date.now() < deadline && !document.querySelector('.pattern-canvas')) await sleep(100);
          const stored = JSON.parse(localStorage.getItem('garment-studio-tee-first-fit-project-v2') || 'null');
          const matching = stored?.pieces?.flatMap(piece => piece.points.map(point => point.gradeRule)).find(rule => rule?.enabled && rule.dxPerSize === -1.25 && rule.dyPerSize === 0.75);
          const choices=[...document.querySelectorAll('select')];
          const production = choices.find(select=>[...select.options].some(option=>option.value==='Production'));
          if (production) { production.value='Production'; production.dispatchEvent(new Event('change',{bubbles:true})); }
          await sleep(500);
          const suffixes=['.dxf','.pdf','.svg','.xml','.zip'];
          const labels=['EXPORT DXF','EXPORT TRUE-SCALE MARKER PDF','EXPORT TRUE-SCALE MARKER SVG','EXPORT BOM','EXPORT FACTORY PACKAGE'];
          const clicked=[];
          for(let i=0;i<labels.length;i++) {
            const button=[...document.querySelectorAll('button')].find(b=>b.textContent.includes(labels[i]));
            if(!button) continue;
            button.click();clicked.push(suffixes[i]);await sleep(320);
          }
          return JSON.stringify({pass:!!stored && Array.isArray(stored.pieces) && !!document.querySelector('.pattern-canvas') && !!matching && clicked.length===5,reopened:true,gradingPreserved:!!matching,pieceCount:stored?.pieces?.length ?? 0,canvasVisible:!!document.querySelector('.pattern-canvas'),clicked,actualDownloadVerified:false});
        })()
        """
        webView.callAsyncJavaScript("return await " + script, arguments: [:], in: nil, in: .page) { [weak self] result in
            switch result {
            case .success(let value):
                guard let json=value as? String, let data=json.data(using:.utf8), var report=(try? JSONSerialization.jsonObject(with:data)) as? [String:Any] else {
                    self?.complete(["pass":false,"error":"Reopen result invalid"]); return
                }
                report["pass"] = (report["pass"] as? Bool == true) && (report["pieceCount"] as? Int == self?.firstPieceCount)
                report["saved"] = true
                self?.expectedDownloads = [".dxf", ".pdf", ".svg", ".xml", ".zip"]
                self?.finalJSReport = report
                self?.finalizeIfReady()
            case .failure(let error): self?.complete(["pass":false,"error":"Reopen JS failed: \(error.localizedDescription)"])
            }
        }
    }

    private func complete(_ result: [String: Any]) {
        guard !finished else { return }
        finished = true
        watchdog?.invalidate()
        var report = result
        report["runtime"] = "native-macos-wkwebview"
        report["isolatedTestSession"] = true
        let data = (try? JSONSerialization.data(withJSONObject: report, options: [.prettyPrinted, .sortedKeys])) ?? Data("{\"pass\":false}".utf8)
        try? data.write(to: output, options: .atomic)
        NSLog("Native WebKit acceptance: %@", String(decoding:data,as:UTF8.self))
        NSApp.terminate(nil)
    }
}
