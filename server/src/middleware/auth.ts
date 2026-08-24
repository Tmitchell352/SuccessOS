import type { NextFunction, Request, Response } from "express";
import { clientForToken } from "../supabase.js";

export type AuthedRequest = Request & { userId: string; accessToken: string };

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  if (!token) {
    res.status(401).json({ error: "Missing bearer token" });
    return;
  }
  const supabase = clientForToken(token);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }
  (req as unknown as AuthedRequest).userId = data.user.id;
  (req as unknown as AuthedRequest).accessToken = token;
  next();
}
