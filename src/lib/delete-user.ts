import { prisma } from "./prisma";
import { readdir, unlink } from "node:fs/promises";
import path from "node:path";
import { uploadDirectory } from "./uploads";

export async function deleteUser(userId: string) {
  const files = await prisma.$transaction(async (tx) => {
    const messages = await tx.message.findMany({
      where: { conversation: { OR: [{ participantAId: userId }, { participantBId: userId }] } },
      select: { id: true, fileUrl: true },
    });
    await tx.notification.deleteMany({ where: { messageId: { in: messages.map((m) => m.id) } } });
    await tx.conversation.deleteMany({ where: { OR: [{ participantAId: userId }, { participantBId: userId }] } });
    await tx.user.delete({ where: { id: userId } });
    return messages.flatMap((m) => m.fileUrl?.startsWith("/uploads/") ? [path.basename(m.fileUrl)] : []);
  });
  const owned = await readdir(uploadDirectory()).catch(() => [] as string[]);
  for (const name of new Set([...files, ...owned.filter((name) => name.startsWith(`${userId}-`))])) {
    if (!await prisma.message.count({ where: { fileUrl: `/uploads/${name}` } })) {
      await unlink(path.join(uploadDirectory(), name)).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") console.error("Private upload cleanup failed", error.code);
      });
    }
  }
}
