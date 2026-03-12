import jwt from "jsonwebtoken";
import type { JwtPayload } from "@/types";

const A = process.env.JWT_ACCESS_SECRET!;
const R = process.env.JWT_REFRESH_SECRET!;

export const signAccess   = (p: JwtPayload) => jwt.sign(p, A, { expiresIn: "15m" });
export const signRefresh  = (p: JwtPayload) => jwt.sign(p, R, { expiresIn: "7d" });
export const verifyAccess = (t: string)     => jwt.verify(t, A) as JwtPayload;
export const verifyRefresh= (t: string)     => jwt.verify(t, R) as JwtPayload;

export const bearerToken  = (h: string | null) => h?.startsWith("Bearer ") ? h.slice(7) : null;
