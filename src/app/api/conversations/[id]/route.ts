import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { de } from "@/lib/de";
import { isUserContact } from "@/lib/contacts";
import { stat } from "node:fs/promises";
import path from "node:path";
import { uploadDirectory } from "@/lib/uploads";

async function getOtherParticipantId(
  conversation: { participantAId: string; participantBId: string },
  userId: string
) {
  return conversation.participantAId === userId
    ? conversation.participantBId
    : conversation.participantAId;
}

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
      participantA: {
        select: { id: true, name: true, email: true, userType: true },
      },
      participantB: {
        select: { id: true, name: true, email: true, userType: true },
      },
    },
  });

  if (!conversation) {
    return NextResponse.json(
      { error: "Unterhaltung nicht gefunden" },
      { status: 404 }
    );
  }

  const otherUserId = await getOtherParticipantId(conversation, session.userId);
  const isContact = await isUserContact(session.userId, otherUserId);
  if (!isContact) {
    return NextResponse.json(
      { error: de.contacts.notAContact },
      { status: 403 }
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
  const body = await request.json().catch(() => ({})) ?? {};
  const { content, type = "TEXT", fileUrl, fileName } = body;
  if (!["TEXT", "IMAGE", "VIDEO"].includes(type) ||
      (content != null && (typeof content !== "string" || content.length > 10000)) ||
      (fileName != null && (typeof fileName !== "string" || fileName.length > 255)) ||
      (type === "TEXT" && (fileUrl != null || typeof content !== "string" || !content.trim()))) {
    return NextResponse.json({ error: "Ungültige Nachricht (max. 10.000 Zeichen)" }, { status: 400 });
  }
  if (type !== "TEXT") {
    const extension = type === "IMAGE" ? "jpg|png|gif|webp" : "mp4|webm|mov";
    const pattern = new RegExp(`^/uploads/${session.userId}-[a-f0-9-]{36}\\.(${extension})$`);
    if (typeof fileUrl !== "string" || !pattern.test(fileUrl) ||
        !await stat(path.join(uploadDirectory(), path.basename(fileUrl))).then((s) => s.isFile()).catch(() => false)) {
      return NextResponse.json({ error: "Ungültiger Anhang" }, { status: 400 });
    }
  }

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

  const otherUserId = await getOtherParticipantId(conversation, session.userId);
  const isContact = await isUserContact(session.userId, otherUserId);
  if (!isContact) {
    return NextResponse.json(
      { error: de.contacts.notAContact },
      { status: 403 }
    );
  }

  if (!content && !fileUrl) {
    return NextResponse.json(
      { error: "Nachricht darf nicht leer sein" },
      { status: 400 }
    );
  }

  const message = await prisma.$transaction(async (tx) => {
  const created = await tx.message.create({
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

  await tx.conversation.update({
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

  await tx.notification.create({
    data: {
      userId: recipientId,
      type: notificationType,
      title: notificationTitle,
      body: notificationBody,
      messageId: created.id,
    },
  });
  return created;
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
