import { env } from "./config/env";
import { logger } from "./config/logger";
import { prisma } from "./config/prisma";
import { redisConnection } from "./config/redis";
import { initializeWorkers } from "./jobs";
import { createApp } from "./app";

const app = createApp();

const server = app.listen(env.PORT, () => {
  initializeWorkers();
  logger.info({ port: env.PORT }, "server_listening");
});

async function gracefulShutdown(signal: string) {
  logger.info({ signal }, "graceful_shutdown_start");
  server.close(async () => {
    await Promise.allSettled([prisma.$disconnect(), redisConnection.quit()]);
    logger.info("graceful_shutdown_complete");
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  void gracefulShutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void gracefulShutdown("SIGTERM");
});

process.on("unhandledRejection", (reason: unknown) => {
  logger.error({ err: reason }, "unhandled_rejection");
});

process.on("uncaughtException", (error: Error) => {
  logger.fatal({ err: error }, "uncaught_exception");
  process.exit(1);
});
