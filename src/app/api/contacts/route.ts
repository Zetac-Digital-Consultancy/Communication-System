import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findConversationBetween } from "@/lib/contacts";
import { de } from "@/lib/de";

function getMessagePreview(type: string, content: string | null): string {
  if (type === "IMAGE") return `📷 ${de.chat.image}`;
  if (type === "VIDEO") return `🎬 ${de.chat.video}`;
  return content?.slice(0, 100) ?? "";
}

export async function GET() {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const contacts = await prisma.contact.findMany({
    where: { userId: session.userId },
    include: {
      contactUser: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const formatted = await Promise.all(
    contacts.map(async (contact) => {
      const conversation = await findConversationBetween(
        session.userId,
        contact.contactUserId
      );

      let lastMessage = null;
      let unreadCount = 0;

      if (conversation) {
        const latest = await prisma.message.findFirst({
          where: { conversationId: conversation.id },
          orderBy: { createdAt: "desc" },
          select: {
            content: true,
            type: true,
            createdAt: true,
            senderId: true,
          },
        });

        if (latest) {
          lastMessage = {
            preview: getMessagePreview(latest.type, latest.content),
            createdAt: latest.createdAt,
            isOwn: latest.senderId === session.userId,
          };
        }

        unreadCount = await prisma.message.count({
          where: {
            conversationId: conversation.id,
            senderId: { not: session.userId },
            readAt: null,
          },
        });
      }

      return {
        id: contact.id,
        user: contact.contactUser,
        conversationId: conversation?.id ?? null,
        lastMessage,
        unreadCount,
      };
    })
  );

  return NextResponse.json({ contacts: formatted });
}

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const body = await request.json();
  const { userId, email } = body;

  let contactUserId = userId as string | undefined;

  if (!contactUserId && email) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json(
        { error: de.contacts.userNotFound },
        { status: 404 }
      );
    }
    contactUserId = user.id;
  }

  if (!contactUserId) {
    return NextResponse.json(
      { error: de.contacts.selectUser },
      { status: 400 }
    );
  }

  if (contactUserId === session.userId) {
    return NextResponse.json(
      { error: de.contacts.cannotAddSelf },
      { status: 400 }
    );
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: contactUserId },
    select: { id: true, name: true, email: true, isActive: true },
  });

  if (!targetUser || !targetUser.isActive) {
    return NextResponse.json(
      { error: de.contacts.userNotFound },
      { status: 404 }
    );
  }

  const existing = await prisma.contact.findUnique({
    where: {
      userId_contactUserId: {
        userId: session.userId,
        contactUserId,
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: de.contacts.alreadyAdded },
      { status: 409 }
    );
  }

  const contact = await prisma.contact.create({
    data: {
      userId: session.userId,
      contactUserId,
    },
    include: {
      contactUser: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({
    contact: {
      id: contact.id,
      user: contact.contactUser,
      conversationId: null,
      lastMessage: null,
      unreadCount: 0,
    },
  });
}
