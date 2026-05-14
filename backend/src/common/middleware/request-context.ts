import { randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";
import { createLogger } from "../../config/logger";

const logger = createLogger("Request");

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
    const method = req.method;
    const path = req.originalUrl?.split("?")[0] ?? req.url;
    const status = res.statusCode;
    const duration = Date.now() - started;
    const logMessage = `${method} ${path} ${status} - ${duration}ms`;
    const meta = { reqId: requestId, userId: req.user?.id };

    if (status >= 500) {
      logger.error(logMessage, meta);
    } else if (status >= 400) {
      logger.warn(logMessage, meta);
    } else {
      logger.info(logMessage, meta);
    }
  });

  next();
}
