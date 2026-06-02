import { PrismaClient } from "@prisma/client";
import { AppError } from "../common/errors/app-error";
import { env } from "./env";

function rejectAuditMutation(operation: string): never {
  throw new AppError(`Audit logs are append-only (${operation})`, 409, "AUDIT_LOG_APPEND_ONLY");
}

export const prisma = new PrismaClient({
  log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
}).$extends({
  query: {
    auditLog: {
      update() {
        return rejectAuditMutation("update");
      },
      updateMany() {
        return rejectAuditMutation("updateMany");
      },
      delete() {
        return rejectAuditMutation("delete");
      },
      deleteMany() {
        return rejectAuditMutation("deleteMany");
      },
      upsert() {
        return rejectAuditMutation("upsert");
      }
    }
  }
}) as unknown as PrismaClient;

export type ExtendedPrismaClient = typeof prisma;
