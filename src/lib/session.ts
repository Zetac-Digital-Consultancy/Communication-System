import { SessionOptions } from "iron-session";

export interface SessionData {
  userId: string;
  email: string;
  name: string;
  role: "ADMIN" | "USER";
  isLoggedIn: boolean;
  sessionVersion?: number;
}

export const defaultSession: SessionData = {
  userId: "",
  email: "",
  name: "",
  role: "USER",
  isLoggedIn: false,
};

function getSessionPassword(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set in .env and be at least 32 characters long."
    );
  }
  return secret;
}

function shouldUseSecureCookies(): boolean {
  if (process.env.COOKIE_SECURE === "true") return true;
  if (process.env.COOKIE_SECURE === "false") return false;

  const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) return appUrl.startsWith("https://");

  return process.env.NODE_ENV === "production";
}

export const sessionOptions: SessionOptions = {
  password: getSessionPassword(),
  cookieName: "communication_session",
  cookieOptions: {
    secure: shouldUseSecureCookies(),
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  },
};
