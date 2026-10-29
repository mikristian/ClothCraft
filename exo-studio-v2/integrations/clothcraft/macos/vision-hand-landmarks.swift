// Apple Vision hand landmarks over newline-delimited JSON, macOS only.
// Input: {"image":"<JPEG base64>"}; output: {"landmarks":[{x,y} ...]}
// Camera frames stay in memory; no photos, identities or hand poses are saved.
import Foundation
import Vision
import ImageIO

let joints: [VNHumanHandPoseObservation.JointName] = [
  .wrist,
  .thumbCMC,.thumbMP,.thumbIP,.thumbTip,
  .indexMCP,.indexPIP,.indexDIP,.indexTip,
  .middleMCP,.middlePIP,.middleDIP,.middleTip,
  .ringMCP,.ringPIP,.ringDIP,.ringTip,
  .littleMCP,.littlePIP,.littleDIP,.littleTip,
]

func handle(_ line: String) -> [String: Any] {
  guard let json = line.data(using: .utf8),
        let request = try? JSONSerialization.jsonObject(with: json) as? [String: Any],
        let base64 = request["image"] as? String, base64.utf8.count < 600_000,
        let bytes = Data(base64Encoded: base64),
        let source = CGImageSourceCreateWithData(bytes as CFData, nil),
        let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
    return ["ok":false,"error":"Invalid in-memory JPEG frame"]
  }
  let detector = VNDetectHumanHandPoseRequest()
  detector.maximumHandCount = 1
  do {
    try VNImageRequestHandler(cgImage: image, options: [:]).perform([detector])
    guard let pose = detector.results?.first else { return ["ok":true,"landmarks":[]] }
    var points: [[String: Double]] = []
    for (index, joint) in joints.enumerated() {
      let point = try pose.recognizedPoint(joint)
      // Palm/index/thumb anchors are necessary for fabric pinch. Other hidden
      // fingers should not suppress a correctly seen thumb and index.
      if [0, 4, 5, 8, 9, 17].contains(index) && point.confidence < 0.15 {
        return ["ok":true,"landmarks":[]]
      }
      // Vision's 2D origin is bottom-left; MediaPipe's is top-left.
      points.append(["x":Double(point.location.x),"y":1-Double(point.location.y)])
    }
    return ["ok":true,"landmarks":points]
  } catch {
    return ["ok":false,"error":String(describing:error)]
  }
}

while let line = readLine() {
  let result = handle(line)
  if let json = try? JSONSerialization.data(withJSONObject:result, options:[.fragmentsAllowed,.sortedKeys]),
     let text = String(data:json,encoding:.utf8) { print(text) }
  else {print("{\"ok\":false,\"error\":\"Serialization failed\"}")}
  fflush(stdout)
}
