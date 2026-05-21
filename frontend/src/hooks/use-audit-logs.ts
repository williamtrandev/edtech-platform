import { useQuery } from "@tanstack/react-query";
import { auditService, type AuditLogListParams } from "../services/audit.service";

export function useAuditLogs(params: AuditLogListParams = {}) {
  return useQuery({
    queryKey: ["audit-logs", params],
    queryFn: () => auditService.getAuditLogs(params)
  });
}
