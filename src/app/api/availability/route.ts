import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { de } from "@/lib/de";
import { isUserContact } from "@/lib/contacts";
import { validFields } from "@/lib/validation";

function toSlotDto(slot: {
  id: string;
  userId: string;
  start: Date;
  end: Date;
  type: "FREE" | "BUSY";
  note: string | null;
}) {
  return {
    id: slot.id,
    userId: slot.userId,
    start: slot.start.toISOString(),
    end: slot.end.toISOString(),
    type: slot.type,
    note: slot.note,
  };
}

export async function GET(request: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const targetUserId = searchParams.get("userId") || session.userId;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  // Only Kunden have a calendar
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { userType: true },
  });
  if (!targetUser || targetUser.userType !== "KUNDE") {
    return NextResponse.json(
      { error: de.calendar.noCalendar },
      { status: 404 }
    );
  }

  // Admins can view every calendar; others only their own and their contacts'
  if (targetUserId !== session.userId && session.role !== "ADMIN") {
    const isContact = await isUserContact(session.userId, targetUserId);
    if (!isContact) {
      return NextResponse.json(
        { error: de.contacts.notAContact },
        { status: 403 }
      );
    }
  }

  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;

  const slots = await prisma.availabilitySlot.findMany({
    where: {
      userId: targetUserId,
      ...(fromDate && !isNaN(fromDate.getTime()) ? { end: { gt: fromDate } } : {}),
      ...(toDate && !isNaN(toDate.getTime()) ? { start: { lt: toDate } } : {}),
    },
    orderBy: { start: "asc" },
  });

  return NextResponse.json({ slots: slots.map(toSlotDto) });
}

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  // Only Kunden manage a calendar
  const currentUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { userType: true },
  });
  if (!currentUser || currentUser.userType !== "KUNDE") {
    return NextResponse.json(
      { error: de.calendar.onlyKunde },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  if (!validFields(body, { start: 40, end: 40, type: 4, note: 200 }) || !body.start || !body.end) {
    return NextResponse.json({ error: de.calendar.invalidTime }, { status: 400 });
  }
  const { start, end, type, note } = body;

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json(
      { error: de.calendar.invalidTime },
      { status: 400 }
    );
  }

  if (endDate <= startDate) {
    return NextResponse.json(
      { error: de.calendar.endBeforeStart },
      { status: 400 }
    );
  }

  if (type !== "FREE" && type !== "BUSY") {
    return NextResponse.json(
      { error: de.calendar.invalidType },
      { status: 400 }
    );
  }

  const slot = await prisma.availabilitySlot.create({
    data: {
      userId: session.userId,
      start: startDate,
      end: endDate,
      type,
      note: typeof note === "string" && note.trim() ? note.trim().slice(0, 200) : null,
    },
  });

  return NextResponse.json({ slot: toSlotDto(slot) });
}
