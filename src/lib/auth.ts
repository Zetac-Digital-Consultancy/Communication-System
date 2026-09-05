import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { SessionData, sessionOptions } from "./session";
import { prisma } from "./prisma";

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) {
    return null;
  }
  // Cookie claims are a snapshot. Recheck revocation and privileges on every request.
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user?.isActive || session.sessionVersion !== user.sessionVersion) return null;
  session.role = user.role;
  session.name = user.name;
  session.email = user.email;
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (!session || session.role !== "ADMIN") {
    return null;
  }
  return session;
}
