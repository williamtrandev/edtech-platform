import { env } from "./config/env";
import { createLogger } from "./config/logger";
import { prisma } from "./config/prisma";
import { redisConnection } from "./config/redis";
import { initializeWorkers } from "./jobs";
import { createApp } from "./app";

const logger = createLogger("Server");

const app = createApp();

const server = app.listen(env.PORT, () => {
  initializeWorkers();
  logger.info(`Server is listening on port ${env.PORT}`);
});

async function gracefulShutdown(signal: string) {
  logger.info(`Graceful shutdown initiated (${signal})`);
  server.close(async () => {
    await Promise.allSettled([prisma.$disconnect(), redisConnection.quit()]);
    logger.info("Graceful shutdown complete");
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
  logger.error("Unhandled promise rejection", { error: reason });
});

process.on("uncaughtException", (error: Error) => {
  logger.error("Uncaught exception", { error: error.message });
  process.exit(1);
});
