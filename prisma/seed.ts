import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { existsSync } from "node:fs";

// Explicit one-time bootstrap, never called by the server or Docker entrypoint.
if (existsSync(".env")) process.loadEnvFile(".env");
const prisma = new PrismaClient();

async function main() {
  const name = process.env.INITIAL_ADMIN_NAME?.trim();
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  if (!name || name.length > 100 || !email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !password || password.length < 12 || Buffer.byteLength(password) > 72) {
    throw new Error("Set INITIAL_ADMIN_NAME, INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD (12+ characters, max. 72 UTF-8 bytes). No default credentials are available.");
  }
  const hashedPassword = await bcrypt.hash(password, 12);
  await prisma.$transaction(async (tx) => {
    if (await tx.user.findFirst({ where: { role: "ADMIN" } })) {
      throw new Error("An administrator already exists. Use account management; bootstrap will not change existing accounts.");
    }
    await tx.user.create({ data: { name, email, password: hashedPassword, role: "ADMIN", userType: "PARTNER" } });
  });
  console.log("Administrator created. Remove INITIAL_ADMIN_PASSWORD from the environment after setup.");
}

main().catch((error: unknown) => {
  // Database errors may include query arguments. Do not log credentials.
  const message = error instanceof Error && (error.message.startsWith("Set INITIAL_ADMIN") || error.message.startsWith("An administrator"))
    ? error.message : "Administrator setup failed. Check configuration, database access and whether the email already exists.";
  console.error(message);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
