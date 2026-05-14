import path from "path";
import fs from "fs";
import winston from "winston";
import { env } from "./env";

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
          return `${timestamp} [${context || "Application"}] ${level}: ${message} ${
            Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ""
          }`;
        })
      )
    }),
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      format: winston.format.combine(winston.format.timestamp(), winston.format.json())
    }),
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
      format: winston.format.combine(winston.format.timestamp(), winston.format.json())
    })
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, "exceptions.log")
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, "rejections.log")
    })
  ]
});

/**
 * Create a context-specific child logger.
 *
 * @example
 * const log = createLogger("AuthService");
 * log.info("User logged in", { userId });
 * // Output: 2026-05-14T07:41:07.857Z [AuthService] info: User logged in { "userId": "abc" }
 */
export function createLogger(context: string) {
  return logger.child({ context });
}
