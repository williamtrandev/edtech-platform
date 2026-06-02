import { CERTIFICATE_PDF_JOB } from "../common/constants/certificate-pdf";
import { createQueue } from "./base.queue";

const queueName = "certificate-pdf";

export type CertificatePdfJobPayload = {
  certificateId: string;
};

export const certificatePdfQueue = createQueue(queueName);

export const certificatePdfJobOptions = {
  attempts: CERTIFICATE_PDF_JOB.attempts,
  backoff: {
    type: "exponential" as const,
    delay: CERTIFICATE_PDF_JOB.backoffDelayMs
  },
  removeOnComplete: true,
  removeOnFail: 100
};

export async function enqueueCertificatePdfJob(certificateId: string) {
  const jobId = `cert-pdf-${certificateId}`;
  const existing = await certificatePdfQueue.getJob(jobId);
  if (existing) {
    const state = await existing.getState();
    if (state === "failed") {
      await existing.retry("failed");
    }
    return;
  }

  await certificatePdfQueue.add(
    CERTIFICATE_PDF_JOB.name,
    { certificateId },
    {
      ...certificatePdfJobOptions,
      jobId
    }
  );
}
