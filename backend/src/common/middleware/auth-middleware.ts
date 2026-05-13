import jwt, { JsonWebTokenError, NotBeforeError, TokenExpiredError } from "jsonwebtoken";
import * as jose from "jose";
import type { NextFunction, Request, Response } from "express";
import { env } from "../../config/env";
import { AppError } from "../errors/app-error";

type JwtPayload = {
  sub: string;
  email?: string;
  role?: "USER" | "INSTRUCTOR" | "ADMIN";
};

const SYMMETRIC_ALGS = ["HS256", "HS384", "HS512"] as const;

function isUserRole(value: unknown): value is JwtPayload["role"] {
  return value === "USER" || value === "INSTRUCTOR" || value === "ADMIN";
}

function pickRole(payload: jwt.JwtPayload | jose.JWTPayload): JwtPayload["role"] | undefined {
  if (isUserRole(payload.role)) {
    return payload.role;
  }
  const app = (payload as { app_metadata?: { role?: unknown } }).app_metadata?.role;
  if (isUserRole(app)) {
    return app;
  }
  const user = (payload as { user_metadata?: { role?: unknown } }).user_metadata?.role;
  if (isUserRole(user)) {
    return user;
  }
  return undefined;
}

function mapJwtLibError(err: unknown): AppError {
  if (err instanceof TokenExpiredError) {
    return new AppError("Session expired", 401, "TOKEN_EXPIRED");
  }
  if (err instanceof NotBeforeError) {
    return new AppError("Invalid or expired token", 401, "INVALID_TOKEN");
  }
  if (err instanceof JsonWebTokenError) {
    return new AppError("Invalid or expired token", 401, "INVALID_TOKEN");
  }
  return new AppError("Invalid or expired token", 401, "INVALID_TOKEN");
}

/** RFC 7235: auth scheme is case-insensitive; trim token (copy/paste / proxies). */
function parseBearerToken(authorization: string | string[] | undefined): string | null {
  const raw = Array.isArray(authorization) ? authorization[0] : authorization;
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  const match = /^Bearer\s+(\S+)/i.exec(trimmed);
  if (!match) {
    return null;
  }
  const token = match[1].trim();
  return token.length > 0 ? token : null;
}

const jwksByIssuer = new Map<string, jose.JWTVerifyGetKey>();

function assertTrustedIssuer(iss: string): void {
  if (!env.SUPABASE_URL) {
    throw new AppError(
      "Server configuration: set SUPABASE_URL (project URL) to verify RS256/ES256 Supabase JWTs",
      500,
      "AUTH_CONFIG"
    );
  }

  let expectedUrl: URL;
  try {
    expectedUrl = new URL(env.SUPABASE_URL);
  } catch {
    throw new AppError(
      "Server configuration: SUPABASE_URL must be a valid URL",
      500,
      "AUTH_CONFIG"
    );
  }

  const expectedHost = expectedUrl.hostname;
  const expectedProtocol = expectedUrl.protocol;

  let issUrl: URL;
  try {
    issUrl = new URL(iss);
  } catch {
    throw new AppError("Invalid or expired token", 401, "INVALID_TOKEN");
  }

  if (issUrl.protocol !== expectedProtocol) {
    throw new AppError("Invalid or expired token", 401, "INVALID_TOKEN");
  }

  if (issUrl.hostname !== expectedHost) {
    throw new AppError("Invalid or expired token", 401, "INVALID_TOKEN");
  }

  const path = issUrl.pathname.replace(/\/$/, "") || "/";
  if (path !== "/auth/v1") {
    throw new AppError("Invalid or expired token", 401, "INVALID_TOKEN");
  }
}

function getJwksForIssuer(iss: string): jose.JWTVerifyGetKey {
  let getter = jwksByIssuer.get(iss);
  if (!getter) {
    const base = iss.replace(/\/$/, "");
    getter = jose.createRemoteJWKSet(new URL(`${base}/.well-known/jwks.json`));
    jwksByIssuer.set(iss, getter);
  }
  return getter;
}

function verifySymmetric(token: string, alg: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, env.SUPABASE_JWT_SECRET, {
      algorithms: [alg as jwt.Algorithm]
    }) as jwt.JwtPayload;

    return {
      sub: String(decoded.sub ?? ""),
      email: typeof decoded.email === "string" ? decoded.email : undefined,
      role: pickRole(decoded)
    };
  } catch (err: unknown) {
    throw mapJwtLibError(err);
  }
}

async function verifyAsymmetric(token: string): Promise<JwtPayload> {
  let unverified: jose.JWTPayload;
  try {
    unverified = jose.decodeJwt(token);
  } catch {
    throw new AppError("Invalid or expired token", 401, "INVALID_TOKEN");
  }

  const iss = unverified.iss;
  if (typeof iss !== "string" || iss.length === 0) {
    throw new AppError("Invalid or expired token", 401, "INVALID_TOKEN");
  }

  assertTrustedIssuer(iss);

  try {
    const { payload } = await jose.jwtVerify(token, getJwksForIssuer(iss), {
      issuer: iss
    });
    return {
      sub: String(payload.sub ?? ""),
      email: typeof payload.email === "string" ? payload.email : undefined,
      role: pickRole(payload)
    };
  } catch (err: unknown) {
    if (err instanceof jose.errors.JWTExpired) {
      throw new AppError("Session expired", 401, "TOKEN_EXPIRED");
    }
    if (err instanceof jose.errors.JWTClaimValidationFailed) {
      throw new AppError("Invalid or expired token", 401, "INVALID_TOKEN");
    }
    throw new AppError("Invalid or expired token", 401, "INVALID_TOKEN");
  }
}

async function verifySupabaseAccessToken(token: string): Promise<JwtPayload> {
  let header: jose.ProtectedHeaderParameters;
  try {
    header = jose.decodeProtectedHeader(token);
  } catch {
    throw new AppError("Invalid or expired token", 401, "INVALID_TOKEN");
  }

  const rawAlg = typeof header.alg === "string" && header.alg.length > 0 ? header.alg : "HS256";
  const alg = rawAlg.toUpperCase();

  if ((SYMMETRIC_ALGS as readonly string[]).includes(alg as (typeof SYMMETRIC_ALGS)[number])) {
    return verifySymmetric(token, alg);
  }

  return verifyAsymmetric(token);
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const token = parseBearerToken(req.headers.authorization ?? req.get("Authorization"));
  console.log("token", token);
  if (!token) {
    next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    return;
  }

  void (async () => {
    try {
      const payload = await verifySupabaseAccessToken(token);
      const userId = String(payload.sub ?? "").trim();
      if (!userId) {
        next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
        return;
      }
      req.user = {
        id: userId,
        email: payload.email,
        role: payload.role
      };
      next();
    } catch (err: unknown) {
      if (err instanceof AppError) {
        next(err);
        return;
      }
      next(mapJwtLibError(err));
    }
  })();
}

export function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const token = parseBearerToken(req.headers.authorization ?? req.get("Authorization"));

  if (!token) {
    next();
    return;
  }

  void (async () => {
    try {
      const payload = await verifySupabaseAccessToken(token);
      const userId = String(payload.sub ?? "").trim();
      if (!userId) {
        next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
        return;
      }
      req.user = {
        id: userId,
        email: payload.email,
        role: payload.role
      };
      next();
    } catch (err: unknown) {
      if (err instanceof AppError) {
        next(err);
        return;
      }
      next(mapJwtLibError(err));
    }
  })();
}
