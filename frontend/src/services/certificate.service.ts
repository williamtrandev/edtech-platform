import type { CertificateStatus } from "../constants/business";
import { httpClient } from "../lib/http-client";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

type PaginatedResponse<T> = {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
};

export type Certificate = {
  id: string;
  userId: string;
  courseId: string;
  verificationCode: string;
  status: CertificateStatus;
  issuedAt: string;
  revokedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
  };
  course: {
    id: string;
    title: string;
    instructor: {
      id: string;
      email: string;
    };
  };
};

export const certificateService = {
  async getMyCertificates(): Promise<Certificate[]> {
    const response = await httpClient.get<ApiResponse<Certificate[]>>("/certificates/me");
    return response.data.data;
  },
  async getCourseCertificates(courseId: string, page = 1, limit = 20, status?: CertificateStatus): Promise<PaginatedResponse<Certificate>> {
    const response = await httpClient.get<ApiResponse<PaginatedResponse<Certificate>>>(`/courses/${courseId}/certificates`, {
      params: {
        page,
        limit,
        ...(status ? { status } : {})
      }
    });
    return response.data.data;
  },
  async verifyCertificate(verificationCode: string): Promise<Certificate> {
    const response = await httpClient.get<ApiResponse<Certificate>>(`/certificates/verify/${verificationCode}`);
    return response.data.data;
  },
  async revokeCertificate(certificateId: string): Promise<Certificate> {
    const response = await httpClient.post<ApiResponse<Certificate>>(`/certificates/${certificateId}/revocations`);
    return response.data.data;
  },
  async restoreCertificate(certificateId: string): Promise<Certificate> {
    const response = await httpClient.delete<ApiResponse<Certificate>>(`/certificates/${certificateId}/revocations`);
    return response.data.data;
  }
};
