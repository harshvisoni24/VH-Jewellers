import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { PrismaClient, Role } from "@prisma/client";
import { env } from "../config/env";

export const prisma = new PrismaClient();
export interface AuthUser { id: string; role: Role }
declare module "express-serve-static-core" { interface Request { user?: AuthUser } }

/** Role is re-read from the database on every request, never trusted from the token alone. */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.token as string | undefined;
    if (!token) return res.status(401).json({ error: "Please log in to continue." });
    const { sub } = jwt.verify(token, env.JWT_SECRET) as { sub: string };
    const user = await prisma.user.findUnique({ where: { id: sub }, select: { id: true, role: true, isActive: true } });
    if (!user || !user.isActive) return res.status(401).json({ error: "Session expired." });
    req.user = { id: user.id, role: user.role };
    next();
  } catch {
    res.status(401).json({ error: "Session expired." });
  }
}

export const requireRole = (role: Role) => (req: Request, res: Response, next: NextFunction) =>
  req.user?.role === role ? next() : res.status(403).json({ error: "You don't have access to this area." });
