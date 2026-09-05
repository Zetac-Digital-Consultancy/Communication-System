import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await requireAuth();
  if (!session) return new NextResponse(null, { status: 401 });
  const blocks = await prisma.userBlock.findMany({ where: { blockerId: session.userId },
    select: { blocked: { select: { id: true, name: true } } } });
  return NextResponse.json({ blocks: blocks.map((b) => b.blocked) });
}

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return new NextResponse(null, { status: 401 });
  const { userId, action, reason } = await request.json().catch(() => ({})) ?? {};
  if (typeof userId !== "string" || userId === session.userId || !["block", "unblock", "report"].includes(action)) {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }
  if (action === "unblock") {
    await prisma.userBlock.deleteMany({ where: { blockerId: session.userId, blockedId: userId } });
    return NextResponse.json({ success: true });
  }
  const conversation = await prisma.conversation.findFirst({ where: { OR: [
    { participantAId: session.userId, participantBId: userId },
    { participantBId: session.userId, participantAId: userId },
  ] } });
  if (!conversation) return new NextResponse(null, { status: 404 });
  if (action === "report") {
    if (typeof reason !== "string" || !reason.trim() || reason.length > 2000) {
      return NextResponse.json({ error: "Bitte einen Grund angeben (max. 2.000 Zeichen)." }, { status: 400 });
    }
    const existing = await prisma.abuseReport.findFirst({ where: { reporterId: session.userId, reportedId: userId, resolved: false } });
    if (!existing) await prisma.abuseReport.create({ data: { reporterId: session.userId, reportedId: userId, reason: reason.trim() } });
  } else {
    await prisma.$transaction(async (tx) => {
      await tx.userBlock.upsert({ where: { blockerId_blockedId: { blockerId: session.userId, blockedId: userId } },
        update: {}, create: { blockerId: session.userId, blockedId: userId } });
      await tx.contact.deleteMany({ where: { OR: [
        { userId: session.userId, contactUserId: userId }, { userId, contactUserId: session.userId },
      ] } });
    });
  }
  return NextResponse.json({ success: true });
}
