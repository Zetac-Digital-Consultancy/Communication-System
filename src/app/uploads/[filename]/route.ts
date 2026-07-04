import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";
import path from "path";

// Serves files from public/uploads that were added after the build.
// The production server only serves public/ assets that existed at build
// time, so runtime uploads need this handler.

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const safeName = path.basename(filename);
  const filePath = path.join(process.cwd(), "public", "uploads", safeName);

  let fileStat;
  try {
    fileStat = await stat(filePath);
  } catch {
    return NextResponse.json(
      { error: "Datei nicht gefunden" },
      { status: 404 }
    );
  }

  const ext = path.extname(safeName).toLowerCase();
  const contentType = MIME_TYPES[ext] ?? "application/octet-stream";

  const range = request.headers.get("range");
  const rangeMatch = range?.match(/bytes=(\d*)-(\d*)/);
  if (rangeMatch) {
    const start = rangeMatch[1] ? parseInt(rangeMatch[1], 10) : 0;
    const end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : fileStat.size - 1;

    if (start >= fileStat.size || start > end) {
      return new NextResponse(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${fileStat.size}` },
      });
    }

    const stream = Readable.toWeb(
      createReadStream(filePath, { start, end })
    ) as ReadableStream;

    return new NextResponse(stream, {
      status: 206,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(end - start + 1),
        "Content-Range": `bytes ${start}-${end}/${fileStat.size}`,
        "Accept-Ranges": "bytes",
      },
    });
  }

  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;

  return new NextResponse(stream, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(fileStat.size),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
