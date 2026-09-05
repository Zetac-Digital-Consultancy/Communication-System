import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Demo seeding is disabled in production.");
  const password = await bcrypt.hash("demo1234", 12);

  const client = await prisma.user.upsert({
    where: { email: "kunde@beispiel.de" },
    update: { userType: "KUNDE" },
    create: {
      email: "kunde@beispiel.de",
      name: "Max Mustermann",
      password,
      avatar: null,
      role: "USER",
      userType: "KUNDE",
      isActive: true,
    },
  });

  const partner = await prisma.user.upsert({
    where: { email: "partner@beispiel.de" },
    update: { userType: "PARTNER" },
    create: {
      email: "partner@beispiel.de",
      name: "Anna Schmidt",
      password,
      avatar: null,
      role: "USER",
      userType: "PARTNER",
      isActive: true,
    },
  });

  const _admin = await prisma.user.upsert({
    where: { email: "admin@beispiel.de" },
    update: { role: "ADMIN", userType: "PARTNER", isActive: true },
    create: {
      email: "admin@beispiel.de",
      name: "Admin Benutzer",
      password: await bcrypt.hash("admin1234", 12),
      avatar: null,
      role: "ADMIN",
      userType: "PARTNER",
      isActive: true,
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

  await prisma.contact.upsert({
    where: {
      userId_contactUserId: {
        userId: client.id,
        contactUserId: partner.id,
      },
    },
    update: {},
    create: {
      userId: client.id,
      contactUserId: partner.id,
    },
  });

  await prisma.contact.upsert({
    where: {
      userId_contactUserId: {
        userId: partner.id,
        contactUserId: client.id,
      },
    },
    update: {},
    create: {
      userId: partner.id,
      contactUserId: client.id,
    },
  });

  console.log("Datenbank erfolgreich initialisiert.");
  console.log("");
  console.log("Demo-Zugangsdaten:");
  console.log("  Kunde:   kunde@beispiel.de / demo1234");
  console.log("  Partner: partner@beispiel.de / demo1234");
  console.log("  Admin:   admin@beispiel.de / admin1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
