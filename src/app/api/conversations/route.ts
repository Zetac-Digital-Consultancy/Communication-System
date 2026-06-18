import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [
        { participantAId: session.userId },
        { participantBId: session.userId },
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
