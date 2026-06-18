import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  findConversationBetween,
  getOrCreateConversation,
  isUserContact,
} from "@/lib/contacts";
import { de } from "@/lib/de";

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
    return NextResponse.json({ conversations: [] });
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
      participantA: { select: { id: true, name: true, email: true } },
      participantB: { select: { id: true, name: true, email: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          content: true,
          type: true,
          createdAt: true,
          senderId: true,
          readAt: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const unreadCounts = await Promise.all(
    conversations.map((conv) =>
      prisma.message.count({
        where: {
          conversationId: conv.id,
          senderId: { not: session.userId },
          readAt: null,
        },
      })
    )
  );

  const formatted = conversations.map((conv, index) => {
    const otherUser =
      conv.participantAId === session.userId
        ? conv.participantB
        : conv.participantA;
    const lastMessage = conv.messages[0] ?? null;

    return {
      id: conv.id,
      otherUser,
      lastMessage: lastMessage
        ? {
            id: lastMessage.id,
            content: lastMessage.content,
            type: lastMessage.type,
            createdAt: lastMessage.createdAt,
            senderId: lastMessage.senderId,
            isOwn: lastMessage.senderId === session.userId,
          }
        : null,
      updatedAt: conv.updatedAt,
      unreadCount: unreadCounts[index],
    };
  });

  return NextResponse.json({ conversations: formatted });
}

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { contactUserId } = await request.json();

  if (!contactUserId) {
    return NextResponse.json(
      { error: de.contacts.selectUser },
      { status: 400 }
    );
  }

  const isContact = await isUserContact(session.userId, contactUserId);
  if (!isContact) {
    return NextResponse.json(
      { error: de.contacts.notAContact },
      { status: 403 }
    );
  }

  const conversation = await getOrCreateConversation(
    session.userId,
    contactUserId
  );

  const otherUser = await prisma.user.findUnique({
    where: { id: contactUserId },
    select: { id: true, name: true, email: true },
  });

  return NextResponse.json({
    conversation: {
      id: conversation.id,
      otherUser,
    },
  });
}
