import type { CertificateStatus } from "../constants/business";
import { ApiError } from "../lib/api-error";
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

export type CertificateSearchSuggestion = {
  term: string;
  score: number;
};

function getFilenameFromDisposition(disposition: unknown) {
  if (typeof disposition !== "string") {
    return "certificate.pdf";
  }
  const match = /filename="?(?<filename>[^";]+)"?/i.exec(disposition);
  return match?.groups?.filename ?? "certificate.pdf";
}

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
  async revokeCertificate(certificateId: string): Promise<Certificate> {
    const response = await httpClient.post<ApiResponse<Certificate>>(`/certificates/${certificateId}/revocations`);
    return response.data.data;
  },
  async restoreCertificate(certificateId: string): Promise<Certificate> {
    const response = await httpClient.delete<ApiResponse<Certificate>>(`/certificates/${certificateId}/revocations`);
    return response.data.data;
  },
  async downloadCertificatePdf(certificateId: string): Promise<{ blob: Blob; filename: string }> {
    const maxAttempts = 8;
    const retryDelayMs = 1200;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        const response = await httpClient.get<Blob>(`/certificates/${certificateId}/pdf`, {
          responseType: "blob"
        });
        return {
          blob: response.data,
          filename: getFilenameFromDisposition(response.headers["content-disposition"])
        };
      } catch (error) {
        const shouldRetry =
          error instanceof ApiError &&
          (error.code === "CERTIFICATE_PDF_PROCESSING" || error.statusCode === 503) &&
          attempt < maxAttempts - 1;
        if (!shouldRetry) {
          throw error;
        }

        await new Promise((resolve) => {
          setTimeout(resolve, retryDelayMs);
        });
      }
    }

    throw new ApiError("Certificate PDF is still generating", "CERTIFICATE_PDF_PROCESSING", 503);
  }
  ,
  async getCertificateSearchSuggestions(query: string, limit = 8): Promise<CertificateSearchSuggestion[]> {
    const response = await httpClient.get<ApiResponse<CertificateSearchSuggestion[]>>("/certificates/search-suggestions", {
      params: {
        q: query,
        limit
      }
    });
    return response.data.data;
  },
  async trackCertificateSearch(term: string): Promise<void> {
    await httpClient.post("/certificates/search-events", {
      term
    });
  }
};
