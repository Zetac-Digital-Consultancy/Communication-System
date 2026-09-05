import { prisma } from "@/lib/prisma";

export async function isUserContact(
  userId: string,
  contactUserId: string
): Promise<boolean> {
  if (await isBlocked(userId, contactUserId)) return false;
  const contact = await prisma.contact.findUnique({
    where: {
      userId_contactUserId: {
        userId,
        contactUserId,
      },
    },
  });
  return !!contact;
}

export async function isBlocked(userId: string, otherId: string): Promise<boolean> {
  return !!await prisma.userBlock.findFirst({ where: { OR: [
    { blockerId: userId, blockedId: otherId }, { blockerId: otherId, blockedId: userId },
  ] } });
}

export async function findConversationBetween(
  userId1: string,
  userId2: string
) {
  return prisma.conversation.findFirst({
    where: {
      OR: [
        { participantAId: userId1, participantBId: userId2 },
        { participantAId: userId2, participantBId: userId1 },
      ],
    },
  });
}

export async function getOrCreateConversation(
  userId1: string,
  userId2: string
) {
  const existing = await findConversationBetween(userId1, userId2);
  if (existing) return existing;

  const [participantAId, participantBId] = [userId1, userId2].sort();

  return prisma.conversation.upsert({
    where: { participantAId_participantBId: { participantAId, participantBId } },
    update: {},
    create: {
      participantAId,
      participantBId,
    },
  });
}
