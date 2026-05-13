import pino from "pino";
import { env } from "./env";

const usePrettyTransport =
  env.LOG_PRETTY === "true" || (env.LOG_PRETTY === undefined && env.NODE_ENV === "development");

export const logger = usePrettyTransport
  ? pino({
      level: env.LOG_LEVEL,
      base: { service: "edtech-backend" },
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss",
          ignore: "pid,hostname",
          singleLine: true,
          messageKey: "msg"
        }
      }
    })
  : pino({
      level: env.LOG_LEVEL,
      base: { service: "edtech-backend" },
      timestamp: pino.stdTimeFunctions.isoTime
    });
