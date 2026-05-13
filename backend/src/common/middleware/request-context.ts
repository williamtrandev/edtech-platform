import { randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";
import { logger } from "../../config/logger";

/**
 * Assigns a stable request id (from `X-Request-Id` or generated), echoes it on the response,
 * and logs one line per request when the response finishes (method, path, status, duration, user id).
 * Does not log headers or body (avoids leaking tokens).
 */
export function requestContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const headerId = req.headers["x-request-id"];
  const requestId =
    typeof headerId === "string" && headerId.trim().length > 0 ? headerId.trim() : randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  const started = Date.now();
  res.on("finish", () => {
    logger.info(
      {
        reqId: requestId,
        method: req.method,
        path: req.originalUrl?.split("?")[0] ?? req.url,
        status: res.statusCode,
        durationMs: Date.now() - started,
        userId: req.user?.id
      },
      "request_completed"
    );
  });

  next();
}
