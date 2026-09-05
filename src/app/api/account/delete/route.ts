import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { allowLogin } from "@/lib/login-limit";
import { deleteUser } from "@/lib/delete-user";

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return new NextResponse(null, { status: 401 });
  const { password } = await request.json().catch(() => ({})) ?? {};
  if (typeof password !== "string" || Buffer.byteLength(password) > 72) return new NextResponse(null, { status: 400 });
  if (!await allowLogin(session.email)) return NextResponse.json({ error: "Zu viele Versuche. Bitte in 15 Minuten erneut versuchen." }, { status: 429 });
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || !await bcrypt.compare(password, user.password)) return NextResponse.json({ error: "Passwort ist falsch." }, { status: 403 });
  // An admin transfers responsibility before deleting their own account.
  if (user.role === "ADMIN") return NextResponse.json({ error: "Bitte lassen Sie zuerst Ihre Administratorrolle von einem anderen Administrator übertragen." }, { status: 409 });
  await deleteUser(user.id);
  session.destroy();
  return NextResponse.json({ success: true });
}
