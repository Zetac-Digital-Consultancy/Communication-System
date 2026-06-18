import { prisma } from "@/lib/prisma";

export async function isUserContact(
  userId: string,
  contactUserId: string
): Promise<boolean> {
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

  return prisma.conversation.create({
    data: {
      participantAId,
      participantBId,
    },
  });
}
