import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { prisma } from "@bluebex/db";

export type AuthedRequest = Request & { user?: { id: string; role: "ADMIN" | "USER" } };

const COOKIE_NAME = "bb_session";
const SESSION_DAYS = 30;

function sha256Base64Url(input: string) {
  return crypto.createHash("sha256").update(input).digest("base64url");
}

export function newSessionToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export async function createSession(userId: string, token: string) {
  const tokenHash = sha256Base64Url(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { userId, tokenHash, expiresAt } });
  return { expiresAt };
}

export function setSessionCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

export async function authOptional(req: AuthedRequest, _res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return next();

  const tokenHash = sha256Base64Url(String(token));
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, role: true } } },
  });
  if (!session) return next();
  if (session.expiresAt.getTime() <= Date.now()) return next();

  req.user = { id: session.user.id, role: session.user.role };
  return next();
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  return next();
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  if (req.user.role !== "ADMIN") return res.status(403).json({ error: "Admin only" });
  return next();
}

export async function revokeSession(token: string) {
  const tokenHash = sha256Base64Url(token);
  await prisma.session.deleteMany({ where: { tokenHash } });
}

export function getSessionCookie(req: AuthedRequest) {
  return req.cookies?.[COOKIE_NAME] as string | undefined;
}

