import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { redisConnection } from "./config/redis";
import { initializeWorkers } from "./jobs";
import { createApp } from "./app";

const app = createApp();

const server = app.listen(env.PORT, () => {
  initializeWorkers();
  console.info(`[server] listening on port ${env.PORT}`);
});

async function gracefulShutdown(signal: string) {
  console.info(`[server] received ${signal}, shutting down gracefully`);
  server.close(async () => {
    await Promise.allSettled([prisma.$disconnect(), redisConnection.quit()]);
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  void gracefulShutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void gracefulShutdown("SIGTERM");
});
