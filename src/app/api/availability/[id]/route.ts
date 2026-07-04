import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { de } from "@/lib/de";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { id } = await params;

  const slot = await prisma.availabilitySlot.findUnique({ where: { id } });

  if (!slot || slot.userId !== session.userId) {
    return NextResponse.json(
      { error: de.calendar.slotNotFound },
      { status: 404 }
    );
  }

  await prisma.availabilitySlot.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
