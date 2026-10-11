// Background remover for the cutout images, using the macOS Vision framework
// (no downloads, runs offline). Usage:
//   swiftc -O tools/remove-bg.swift -o /tmp/remove-bg
//   /tmp/remove-bg <input-folder> <output-folder> [maxPixels=1400]
// For every .jpg/.jpeg/.png/.webp/.heic in the input folder it writes a PNG with a
// transparent background, trimmed to the subject: small margin on top and sides,
// and ZERO margin at the bottom so the object sits flush on the section edge.
import Foundation
import Vision
import CoreImage
import CoreImage.CIFilterBuiltins
import UniformTypeIdentifiers

let args = CommandLine.arguments
guard args.count >= 3 else {
    print("usage: remove-bg <input-folder> <output-folder> [maxPixels]")
    exit(1)
}
let inDir = URL(fileURLWithPath: args[1])
let outDir = URL(fileURLWithPath: args[2])
let maxPixels = args.count > 3 ? CGFloat(Double(args[3]) ?? 1400) : 1400
try FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)

let context = CIContext(options: [.useSoftwareRenderer: false])
let exts: Set<String> = ["jpg", "jpeg", "png", "webp", "heic"]
let files = try FileManager.default.contentsOfDirectory(at: inDir, includingPropertiesForKeys: nil)
    .filter { exts.contains($0.pathExtension.lowercased()) }
    .sorted { $0.lastPathComponent < $1.lastPathComponent }

func alphaBounds(_ cg: CGImage) -> CGRect? {
    let w = cg.width, h = cg.height
    var data = [UInt8](repeating: 0, count: w * h * 4)
    guard let ctx = CGContext(data: &data, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4,
                              space: CGColorSpaceCreateDeviceRGB(),
                              bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return nil }
    ctx.draw(cg, in: CGRect(x: 0, y: 0, width: w, height: h))
    var minX = w, minY = h, maxX = -1, maxY = -1
    for y in 0..<h {
        for x in 0..<w where data[(y * w + x) * 4 + 3] > 24 {
            if x < minX { minX = x }
            if x > maxX { maxX = x }
            if y < minY { minY = y }
            if y > maxY { maxY = y }
        }
    }
    if maxX < 0 { return nil }
    // CGContext rows run bottom-up here, so minY is the bottom edge of the subject.
    return CGRect(x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1)
}

var ok = 0, failed = 0
for file in files {
    let name = file.deletingPathExtension().lastPathComponent
    do {
        guard let input = CIImage(contentsOf: file, options: [.applyOrientationProperty: true]) else {
            throw NSError(domain: "bg", code: 1, userInfo: [NSLocalizedDescriptionKey: "cannot read image"])
        }
        let handler = VNImageRequestHandler(ciImage: input)
        let request = VNGenerateForegroundInstanceMaskRequest()
        try handler.perform([request])
        guard let result = request.results?.first, !result.allInstances.isEmpty else {
            throw NSError(domain: "bg", code: 2, userInfo: [NSLocalizedDescriptionKey: "no foreground subject found"])
        }
        let buffer = try result.generateMaskedImage(ofInstances: result.allInstances, from: handler, croppedToInstancesExtent: false)
        var cutout = CIImage(cvPixelBuffer: buffer)
        guard let full = context.createCGImage(cutout, from: cutout.extent),
              let box = alphaBounds(full) else {
            throw NSError(domain: "bg", code: 3, userInfo: [NSLocalizedDescriptionKey: "empty mask"])
        }
        // trim: 2% margin on top and sides, none at the bottom (flush)
        let mx = box.width * 0.02, my = box.height * 0.02
        let x0 = max(0, box.minX - mx), x1 = min(CGFloat(full.width), box.maxX + mx)
        let yBottom = box.minY                         // flush
        let yTop = min(CGFloat(full.height), box.maxY + my)
        let crop = CGRect(x: x0, y: yBottom, width: x1 - x0, height: yTop - yBottom)
        cutout = cutout.cropped(to: CGRect(x: cutout.extent.minX + crop.minX, y: cutout.extent.minY + crop.minY,
                                           width: crop.width, height: crop.height))
        // normalise origin and downscale for the web
        cutout = cutout.transformed(by: CGAffineTransform(translationX: -cutout.extent.minX, y: -cutout.extent.minY))
        let longest = max(cutout.extent.width, cutout.extent.height)
        if longest > maxPixels {
            let scale = maxPixels / longest
            let f = CIFilter.lanczosScaleTransform()
            f.inputImage = cutout; f.scale = Float(scale); f.aspectRatio = 1
            cutout = f.outputImage ?? cutout
        }
        let outURL = outDir.appendingPathComponent(name + ".png")
        try context.writePNGRepresentation(of: cutout, to: outURL, format: .RGBA8,
                                           colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!)
        let kb = (try? FileManager.default.attributesOfItem(atPath: outURL.path)[.size] as? Int ?? 0) ?? 0
        print("ok      \(name).png  \(Int(cutout.extent.width))x\(Int(cutout.extent.height))  \(kb / 1024) KB")
        ok += 1
    } catch {
        print("FAILED  \(name): \(error.localizedDescription)")
        failed += 1
    }
}
print("\ndone: \(ok) processed, \(failed) failed")
exit(failed == 0 ? 0 : 2)
