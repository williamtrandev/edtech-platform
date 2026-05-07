import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { AppError } from "../errors/app-error";

type JwtPayload = {
  sub: string;
  email?: string;
  role?: "USER" | "ADMIN";
};

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const token = authHeader.replace("Bearer ", "");
  const decoded = jwt.verify(token, env.SUPABASE_JWT_SECRET) as JwtPayload;

  if (!decoded.sub) {
    throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  }

  req.user = {
    id: decoded.sub,
    email: decoded.email,
    role: decoded.role
  };

  next();
}
