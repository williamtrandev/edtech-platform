import { httpClient } from "../lib/http-client";
import type { UserRole } from "../constants/business";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type AuditLog = {
  id: string;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: unknown;
  createdAt: string;
  actor?: {
    id: string;
    email: string;
    role: UserRole;
  } | null;
};

export type PaginatedAuditLogs = {
  items: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
};

export type AuditLogListParams = {
  page?: number;
  limit?: number;
  search?: string;
  action?: string;
  entityType?: string;
};

export const auditService = {
  async getAuditLogs(params: AuditLogListParams = {}): Promise<PaginatedAuditLogs> {
    const response = await httpClient.get<ApiResponse<PaginatedAuditLogs>>("/audit-logs", {
      params: {
        ...(params.page ? { page: params.page } : {}),
        ...(params.limit ? { limit: params.limit } : {}),
        ...(params.search?.trim() ? { search: params.search.trim() } : {}),
        ...(params.action?.trim() ? { action: params.action.trim() } : {}),
        ...(params.entityType?.trim() ? { entityType: params.entityType.trim() } : {})
      }
    });
    return response.data.data;
  }
};
