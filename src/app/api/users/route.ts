import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const existingContactIds = await prisma.contact.findMany({
    where: { userId: session.userId },
    select: { contactUserId: true },
  });

  const excludeIds = [
    session.userId,
    ...existingContactIds.map((c) => c.contactUserId),
  ];

  const users = await prisma.user.findMany({
    where: {
      id: { notIn: excludeIds },
      isActive: true,
      blocks: { none: { blockedId: session.userId } },
      blockedBy: { none: { blockerId: session.userId } },
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ users });
}
