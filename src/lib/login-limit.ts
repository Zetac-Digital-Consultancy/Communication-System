import { createHash } from "node:crypto";
import { prisma } from "./prisma";

// Persisted across restarts and shared by processes using the same database.
export async function allowLogin(email: string): Promise<boolean> {
  const key = createHash("sha256").update(email).digest("hex");
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    await tx.loginAttempt.deleteMany({ where: { expiresAt: { lte: now } } });
    const attempt = await tx.loginAttempt.upsert({
      where: { key },
      create: { key, count: 1, expiresAt: new Date(now.getTime() + 15 * 60 * 1000) },
      update: { count: { increment: 1 } },
    });
    return attempt.count <= 10;
  });
}
