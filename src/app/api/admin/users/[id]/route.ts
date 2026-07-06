import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePassword } from "@/lib/password.server";
import { de } from "@/lib/de";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: de.admin.unauthorized }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const {
    name,
    email,
    role,
    userType,
    isActive,
    password,
    generatePassword: shouldGenerate,
  } = body;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: de.admin.userNotFound }, { status: 404 });
  }

  if (id === session.userId && isActive === false) {
    return NextResponse.json(
      { error: de.admin.cannotDeactivateSelf },
      { status: 400 }
    );
  }

  if (id === session.userId && role === "USER") {
    return NextResponse.json(
      { error: de.admin.cannotDemoteSelf },
      { status: 400 }
    );
  }

  if (email) {
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findFirst({
      where: { email: normalizedEmail, NOT: { id } },
    });
    if (existing) {
      return NextResponse.json(
        { error: de.admin.emailExists },
        { status: 409 }
      );
    }
  }

  const updateData: {
    name?: string;
    email?: string;
    role?: "USER" | "ADMIN";
    userType?: "KUNDE" | "PARTNER";
    isActive?: boolean;
    password?: string;
  } = {};

  if (name?.trim()) updateData.name = name.trim();
  if (email?.trim()) updateData.email = email.toLowerCase().trim();
  if (role === "ADMIN" || role === "USER") updateData.role = role;
  if (userType === "KUNDE" || userType === "PARTNER")
    updateData.userType = userType;
  if (typeof isActive === "boolean") updateData.isActive = isActive;

  let plainPassword: string | null = null;
  if (shouldGenerate) {
    plainPassword = generatePassword();
    updateData.password = await bcrypt.hash(plainPassword, 12);
  } else if (password) {
    if (password.length < 6) {
      return NextResponse.json(
        { error: de.admin.passwordTooShort },
        { status: 400 }
      );
    }
    plainPassword = password;
    updateData.password = await bcrypt.hash(password, 12);
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      userType: true,
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    user: updated,
    credentials: plainPassword
      ? { email: updated.email, password: plainPassword }
      : null,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: de.admin.unauthorized }, { status: 403 });
  }

  const { id } = await params;

  if (id === session.userId) {
    return NextResponse.json(
      { error: de.admin.cannotDeleteSelf },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: de.admin.userNotFound }, { status: 404 });
  }

  const hard = request.nextUrl.searchParams.get("hard") === "true";

  if (hard) {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true, deleted: true });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive: false },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ user: updated, deactivated: true });
}
