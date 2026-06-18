import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { de } from "@/lib/de";
import { isUserContact } from "@/lib/contacts";

function getMessagePreview(
  type: string,
  content: string | null
): string {
  if (type === "IMAGE") return `📷 ${de.chat.image}`;
  if (type === "VIDEO") return `🎬 ${de.chat.video}`;
  return content?.slice(0, 100) ?? "";
}

export async function GET() {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const contactIds = await prisma.contact.findMany({
    where: { userId: session.userId },
    select: { contactUserId: true },
  });
  const contactUserIds = contactIds.map((c) => c.contactUserId);

  if (contactUserIds.length === 0) {
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }

  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [
        {
          participantAId: session.userId,
          participantBId: { in: contactUserIds },
        },
        {
          participantBId: session.userId,
          participantAId: { in: contactUserIds },
        },
      ],
    },
    include: {
      participantA: { select: { id: true, name: true } },
      participantB: { select: { id: true, name: true } },
      messages: {
        where: {
          senderId: { not: session.userId },
          readAt: null,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          sender: { select: { name: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const unreadCounts = await Promise.all(
    conversations
      .filter((conv) => conv.messages.length > 0)
      .map((conv) =>
        prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: session.userId },
            readAt: null,
          },
        })
      )
  );

  const unreadConversations = conversations.filter(
    (conv) => conv.messages.length > 0
  );

  const notifications = unreadConversations
    .map((conv, index) => {
      const message = conv.messages[0];
      const otherUserId =
        conv.participantAId === session.userId
          ? conv.participantBId
          : conv.participantAId;

      return {
        id: message.id,
        conversationId: conv.id,
        senderName: message.sender.name,
        preview: getMessagePreview(message.type, message.content),
        type: message.type,
        createdAt: message.createdAt,
        unreadCount: unreadCounts[index],
        contactUserId: otherUserId,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  return NextResponse.json({
    notifications,
    unreadCount: notifications.length,
  });
}

export async function PATCH(request: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { conversationId } = await request.json();

  if (conversationId) {
    const messageIds = await prisma.message.findMany({
      where: { conversationId },
      select: { id: true },
    });

    await prisma.notification.updateMany({
      where: {
        userId: session.userId,
        messageId: { in: messageIds.map((m) => m.id) },
        read: false,
      },
      data: { read: true },
    });
  } else {
    await prisma.notification.updateMany({
      where: { userId: session.userId, read: false },
      data: { read: true },
    });
  }

  return NextResponse.json({ success: true });
}
