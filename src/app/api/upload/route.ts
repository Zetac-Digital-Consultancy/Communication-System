import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { requireAuth } from "@/lib/auth";
import { randomUUID } from "node:crypto";
import { detectMedia, uploadDirectory } from "@/lib/uploads";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    // Bound the actual stream, including chunked requests with no Content-Length.
    const maxBody = MAX_FILE_SIZE + 1024 * 1024;
    if (Number(request.headers.get("content-length")) > maxBody) return new NextResponse(null, { status: 413 });
    const reader = request.body?.getReader();
    if (!reader) return new NextResponse(null, { status: 400 });
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBody) { await reader.cancel(); return new NextResponse(null, { status: 413 }); }
      chunks.push(new Uint8Array(value));
    }
    const formData = await new Response(new Blob(chunks), {
      headers: { "Content-Type": request.headers.get("content-type") || "" },
    }).formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Keine Datei hochgeladen" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Datei ist zu groß (max. 50 MB)" },
        { status: 400 }
      );
    }

    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: "Ungültiger Dateityp" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const detected = detectMedia(buffer);
    if (!detected || detected.type !== (isImage ? "IMAGE" : "VIDEO")) {
      return NextResponse.json({ error: "Ungültiger Dateiinhalt" }, { status: 400 });
    }

    const fileName = `${session.userId}-${randomUUID()}${detected.extension}`;
    const uploadDir = uploadDirectory();

    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, fileName), buffer, { flag: "wx" });

    return NextResponse.json({
      fileUrl: `/uploads/${fileName}`,
      fileName: file.name,
      type: isImage ? "IMAGE" : "VIDEO",
    });
  } catch {
    return NextResponse.json(
      { error: "Upload fehlgeschlagen" },
      { status: 500 }
    );
  }
}
