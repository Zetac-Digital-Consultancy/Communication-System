import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("demo1234", 12);

  const client = await prisma.user.upsert({
    where: { email: "kunde@beispiel.de" },
    update: {},
    create: {
      email: "kunde@beispiel.de",
      name: "Max Mustermann",
      password,
      avatar: null,
    },
  });

  const partner = await prisma.user.upsert({
    where: { email: "partner@beispiel.de" },
    update: {},
    create: {
      email: "partner@beispiel.de",
      name: "Anna Schmidt",
      password,
      avatar: null,
    },
  });

  const conversation = await prisma.conversation.upsert({
    where: {
      participantAId_participantBId: {
        participantAId: client.id,
        participantBId: partner.id,
      },
    },
    update: {},
    create: {
      participantAId: client.id,
      participantBId: partner.id,
    },
  });

  const existingMessages = await prisma.message.count({
    where: { conversationId: conversation.id },
  });

  if (existingMessages === 0) {
    await prisma.message.createMany({
      data: [
        {
          conversationId: conversation.id,
          senderId: partner.id,
          content: "Hallo! Schön, dass wir hier kommunizieren können.",
          type: "TEXT",
        },
        {
          conversationId: conversation.id,
          senderId: client.id,
          content: "Guten Tag! Ich freue mich auf unsere Zusammenarbeit.",
          type: "TEXT",
        },
      ],
    });
  }

  console.log("Datenbank erfolgreich initialisiert.");
  console.log("");
  console.log("Demo-Zugangsdaten:");
  console.log("  Kunde:   kunde@beispiel.de / demo1234");
  console.log("  Partner: partner@beispiel.de / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
