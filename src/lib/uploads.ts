import path from "node:path";

export const uploadDirectory = () => process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

// Never trust a multipart MIME header or the original filename extension.
export function detectMedia(bytes: Buffer): { extension: string; type: "IMAGE" | "VIDEO" } | null {
  if (bytes.length < 12) return null;
  if (bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return { extension: ".jpg", type: "IMAGE" };
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { extension: ".png", type: "IMAGE" };
  if (["GIF87a", "GIF89a"].includes(bytes.toString("ascii", 0, 6))) return { extension: ".gif", type: "IMAGE" };
  if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return { extension: ".webp", type: "IMAGE" };
  if (bytes.toString("ascii", 4, 8) === "ftyp") {
    const brand = bytes.toString("ascii", 8, 12);
    if (brand === "qt  ") return { extension: ".mov", type: "VIDEO" };
    if (["isom", "iso2", "mp41", "mp42", "avc1", "M4V "].includes(brand)) return { extension: ".mp4", type: "VIDEO" };
  }
  if (bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])) && bytes.subarray(0, 4096).includes(Buffer.from("webm"))) return { extension: ".webm", type: "VIDEO" };
  return null;
}

export function parseByteRange(range: string, size: number): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match || (!match[1] && !match[2]) || size <= 0) return null;
  if (!match[1]) {
    const suffix = Number(match[2]);
    return Number.isSafeInteger(suffix) && suffix > 0 ? { start: Math.max(0, size - suffix), end: size - 1 } : null;
  }
  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(requestedEnd) || start >= size || requestedEnd < start) return null;
  return { start, end: Math.min(requestedEnd, size - 1) };
}
