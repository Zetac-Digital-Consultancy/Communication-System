import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";
import path from "path";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseByteRange, uploadDirectory } from "@/lib/uploads";

// Private media is streamed only after checking conversation membership.

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
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const { filename } = await params;
  if (!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|gif|webp|mp4|webm|mov)$/.test(filename)) {
    return new NextResponse(null, { status: 404 });
  }
  const message = await prisma.message.findFirst({
    where: { fileUrl: `/uploads/${filename}`, conversation: { OR: [
      { participantAId: session.userId }, { participantBId: session.userId },
    ] } },
    select: { id: true },
  });
  if (!message && !filename.startsWith(`${session.userId}-`)) return new NextResponse(null, { status: 404 });
  const safeName = path.basename(filename);
  const filePath = path.join(uploadDirectory(), safeName);

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
  if (range) {
    const parsed = parseByteRange(range, fileStat.size);
    if (!parsed) {
      return new NextResponse(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${fileStat.size}` },
      });
    }
    const { start, end } = parsed;

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
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;

  return new NextResponse(stream, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(fileStat.size),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
