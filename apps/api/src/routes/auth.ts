import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@bluebex/db";
import {
  authOptional,
  clearSessionCookie,
  createSession,
  getSessionCookie,
  newSessionToken,
  revokeSession,
  setSessionCookie,
  type AuthedRequest,
  requireAuth,
} from "../lib/auth.js";

export const authRouter = Router();

authRouter.get("/me", authOptional, async (req: AuthedRequest, res) => {
  if (!req.user) return res.json({ user: null });
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, username: true, name: true, role: true, createdAt: true },
  });
  return res.json({ user });
});

authRouter.post("/login", async (req, res) => {
  const body = z.object({ username: z.string().min(1), password: z.string().min(1) }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { username: body.username } });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(body.password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = newSessionToken();
  const { expiresAt } = await createSession(user.id, token);
  setSessionCookie(res, token, expiresAt);

  return res.json({
    user: { id: user.id, username: user.username, name: user.name, role: user.role },
  });
});

authRouter.post("/logout", authOptional, async (req: AuthedRequest, res) => {
  const token = getSessionCookie(req);
  if (token) await revokeSession(String(token));
  clearSessionCookie(res);
  return res.json({ ok: true });
});

