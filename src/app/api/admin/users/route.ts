import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePassword } from "@/lib/password.server";
import { de } from "@/lib/de";

function formatUser(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: de.admin.unauthorized }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ users: users.map(formatUser) });
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: de.admin.unauthorized }, { status: 403 });
  }

  const body = await request.json();
  const { name, email, password, role = "USER", generatePassword: shouldGenerate } =
    body;

  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json(
      { error: de.admin.nameEmailRequired },
      { status: 400 }
    );
  }

  const normalizedEmail = email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    return NextResponse.json(
      { error: de.admin.emailExists },
      { status: 409 }
    );
  }

  const plainPassword =
    shouldGenerate || !password ? generatePassword() : password;

  if (plainPassword.length < 6) {
    return NextResponse.json(
      { error: de.admin.passwordTooShort },
      { status: 400 }
    );
  }

  const hashedPassword = await bcrypt.hash(plainPassword, 12);

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: role === "ADMIN" ? "ADMIN" : "USER",
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    user: formatUser(user),
    credentials: {
      email: user.email,
      password: plainPassword,
    },
  });
}
