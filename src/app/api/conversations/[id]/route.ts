import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { de } from "@/lib/de";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { id } = await params;

  const conversation = await prisma.conversation.findFirst({
    where: {
      id,
      OR: [
        { participantAId: session.userId },
        { participantBId: session.userId },
      ],
    },
    include: {
      participantA: { select: { id: true, name: true, email: true } },
      participantB: { select: { id: true, name: true, email: true } },
    },
  });

  if (!conversation) {
    return NextResponse.json(
      { error: "Unterhaltung nicht gefunden" },
      { status: 404 }
    );
  }

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "asc" },
    include: {
      sender: { select: { id: true, name: true } },
    },
  });

  await prisma.message.updateMany({
    where: {
      conversationId: id,
      senderId: { not: session.userId },
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  const messageIds = await prisma.message.findMany({
    where: { conversationId: id },
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

  const otherUser =
    conversation.participantAId === session.userId
      ? conversation.participantB
      : conversation.participantA;

  return NextResponse.json({
    conversation: {
      id: conversation.id,
      otherUser,
      messages: messages.map((m) => ({
        id: m.id,
        content: m.content,
        type: m.type,
        fileUrl: m.fileUrl,
        fileName: m.fileName,
        createdAt: m.createdAt,
        senderId: m.senderId,
        senderName: m.sender.name,
        isOwn: m.senderId === session.userId,
      })),
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { content, type = "TEXT", fileUrl, fileName } = body;

  const conversation = await prisma.conversation.findFirst({
    where: {
      id,
      OR: [
        { participantAId: session.userId },
        { participantBId: session.userId },
      ],
    },
    include: {
      participantA: { select: { id: true, name: true } },
      participantB: { select: { id: true, name: true } },
    },
  });

  if (!conversation) {
    return NextResponse.json(
      { error: "Unterhaltung nicht gefunden" },
      { status: 404 }
    );
  }

  if (!content && !fileUrl) {
    return NextResponse.json(
      { error: "Nachricht darf nicht leer sein" },
      { status: 400 }
    );
  }

  const message = await prisma.message.create({
    data: {
      conversationId: id,
      senderId: session.userId,
      content: content || null,
      type,
      fileUrl: fileUrl || null,
      fileName: fileName || null,
    },
    include: {
      sender: { select: { id: true, name: true } },
    },
  });

  await prisma.conversation.update({
    where: { id },
    data: { updatedAt: new Date() },
  });

  const recipientId =
    conversation.participantAId === session.userId
      ? conversation.participantBId
      : conversation.participantAId;

  const notificationType =
    type === "IMAGE" ? "IMAGE" : type === "VIDEO" ? "VIDEO" : "MESSAGE";

  const notificationTitle =
    notificationType === "IMAGE"
      ? de.notifications.newImage
      : notificationType === "VIDEO"
        ? de.notifications.newVideo
        : de.notifications.newMessage;

  const notificationBody =
    type === "TEXT"
      ? (content?.slice(0, 100) ?? "")
      : type === "IMAGE"
        ? `${de.chat.image} ${de.notifications.from} ${session.name}`
        : `${de.chat.video} ${de.notifications.from} ${session.name}`;

  await prisma.notification.create({
    data: {
      userId: recipientId,
      type: notificationType,
      title: notificationTitle,
      body: notificationBody,
      messageId: message.id,
    },
  });

  return NextResponse.json({
    message: {
      id: message.id,
      content: message.content,
      type: message.type,
      fileUrl: message.fileUrl,
      fileName: message.fileName,
      createdAt: message.createdAt,
      senderId: message.senderId,
      senderName: message.sender.name,
      isOwn: true,
    },
  });
}
