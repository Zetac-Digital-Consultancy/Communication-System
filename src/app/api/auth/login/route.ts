import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { allowLogin, clearLoginAttempts } from "@/lib/login-limit";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json().catch(() => ({})) ?? {};

    if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password || email.length > 254 || Buffer.byteLength(password) > 72) {
      return NextResponse.json(
        { error: "E-Mail und Passwort erforderlich" },
        { status: 400 }
      );
    }

    if (!await allowLogin(email.toLowerCase().trim())) {
      return NextResponse.json({ error: "Zu viele Anmeldeversuche. Bitte in 15 Minuten erneut versuchen." }, { status: 429, headers: { "Retry-After": "900" } });
    }
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "Ungültige Anmeldedaten" },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json(
        { error: "Ungültige Anmeldedaten" },
        { status: 401 }
      );
    }

    await clearLoginAttempts(user.email);

    const session = await getSession();
    session.userId = user.id;
    session.email = user.email;
    session.name = user.name;
    session.role = user.role;
    session.isLoggedIn = true;
    session.sessionVersion = user.sessionVersion;
    await session.save();

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Ein Fehler ist aufgetreten" },
      { status: 500 }
    );
  }
}
