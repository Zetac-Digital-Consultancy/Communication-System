import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (!await requireAdmin()) return new NextResponse(null, { status: 403 });
  const reports = await prisma.abuseReport.findMany({ where: { resolved: false }, orderBy: { createdAt: "asc" }, take: 100,
    include: { reporter: { select: { name: true } }, reported: { select: { id: true, name: true, email: true } } } });
  return NextResponse.json({ reports });
}

export async function PATCH(request: NextRequest) {
  if (!await requireAdmin()) return new NextResponse(null, { status: 403 });
  const { id } = await request.json().catch(() => ({})) ?? {};
  if (typeof id !== "string") return new NextResponse(null, { status: 400 });
  await prisma.abuseReport.updateMany({ where: { id }, data: { resolved: true } });
  return NextResponse.json({ success: true });
}
