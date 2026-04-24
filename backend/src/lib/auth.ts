import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../env.js";

export type AuthPayload = {
  sub: string;
  email: string;
  role: string;
  type: "access" | "refresh";
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signAccessToken(sub: string, email: string, role: string) {
  return jwt.sign(
    { sub, email, role, type: "access" } satisfies AuthPayload,
    env.jwtSecret,
    { expiresIn: "8h" },
  );
}

export function signRefreshToken(sub: string, email: string, role: string) {
  return jwt.sign(
    { sub, email, role, type: "refresh" } satisfies AuthPayload,
    env.refreshSecret,
    { expiresIn: "7d" },
  );
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.jwtSecret) as AuthPayload;
}
