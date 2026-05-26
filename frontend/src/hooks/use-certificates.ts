import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CertificateStatus } from "../constants/business";
import { certificateService } from "../services/certificate.service";

export function useMyCertificates(enabled = true) {
  return useQuery({
    queryKey: ["certificates", "me"],
    queryFn: () => certificateService.getMyCertificates(),
    enabled
  });
}

export function useVerifyCertificate(verificationCode: string | undefined) {
  return useQuery({
    queryKey: ["certificates", "verify", verificationCode],
    queryFn: () => certificateService.verifyCertificate(verificationCode!),
    enabled: Boolean(verificationCode)
  });
}

export function useCourseCertificates(courseId: string, page: number, status: CertificateStatus | "ALL", enabled = true) {
  const certificateStatus = status === "ALL" ? undefined : status;

  return useQuery({
    queryKey: ["courses", courseId, "certificates", page, status],
    queryFn: () => certificateService.getCourseCertificates(courseId, page, 20, certificateStatus),
    enabled: Boolean(courseId) && enabled
  });
}

export function useRevokeCertificate(courseId: string, page: number, status: CertificateStatus | "ALL") {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (certificateId: string) => certificateService.revokeCertificate(certificateId),
    onSuccess: async (certificate) => {
      await queryClient.invalidateQueries({ queryKey: ["courses", courseId, "certificates", page, status] });
      await queryClient.invalidateQueries({ queryKey: ["certificates", "verify", certificate.verificationCode] });
      await queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    }
  });
}

export function useRestoreCertificate(courseId: string, page: number, status: CertificateStatus | "ALL") {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (certificateId: string) => certificateService.restoreCertificate(certificateId),
    onSuccess: async (certificate) => {
      await queryClient.invalidateQueries({ queryKey: ["courses", courseId, "certificates", page, status] });
      await queryClient.invalidateQueries({ queryKey: ["certificates", "verify", certificate.verificationCode] });
      await queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    }
  });
}
