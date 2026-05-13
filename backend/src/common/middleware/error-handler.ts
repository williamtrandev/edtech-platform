import { NextFunction, Request, Response } from "express";
import { JsonWebTokenError, NotBeforeError, TokenExpiredError } from "jsonwebtoken";
import { ZodError } from "zod";
import { logger } from "../../config/logger";
import { AppError } from "../errors/app-error";

function requestLogFields(req: Request) {
  return {
    ...(req.requestId ? { reqId: req.requestId } : {}),
    method: req.method,
    path: req.originalUrl?.split("?")[0] ?? req.url
  };
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const base = requestLogFields(req);

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, ...base, code: err.code, status: err.statusCode }, err.message);
    } else if (err.statusCode >= 400) {
      logger.warn({ ...base, code: err.code, status: err.statusCode, message: err.message }, "app_error");
    } else {
      logger.info({ ...base, code: err.code, status: err.statusCode, message: err.message }, "app_error");
    }

    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message
      }
    });
    return;
  }

  if (err instanceof JsonWebTokenError || err instanceof TokenExpiredError || err instanceof NotBeforeError) {
    logger.warn({ ...base, errName: err.name, message: err.message }, "jwt_error");
    const expired = err instanceof TokenExpiredError;
    res.status(401).json({
      success: false,
      error: {
        code: expired ? "TOKEN_EXPIRED" : "INVALID_TOKEN",
        message: expired ? "Session expired" : "Invalid or expired token"
      }
    });
    return;
  }

  if (err instanceof ZodError) {
    const paths = err.issues.map((issue) => issue.path.join(".") || "(root)");
    logger.warn(
      {
        ...base,
        code: "VALIDATION_ERROR",
        issueCount: err.issues.length,
        paths
      },
      "validation_failed"
    );

    res.status(422).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: err.flatten()
      }
    });
    return;
  }

  logger.error({ err, ...base }, "unhandled_error");

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred"
    }
  });
}
