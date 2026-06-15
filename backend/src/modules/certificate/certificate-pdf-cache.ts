import { redisConnection } from "../../config/redis";
import { CERTIFICATE_PDF_CACHE } from "../../common/constants/certificate-pdf";

function cacheKey(certificateId: string) {
  return `${CERTIFICATE_PDF_CACHE.keyPrefix}${certificateId}`;
}

export async function getCachedCertificatePdf(certificateId: string): Promise<Buffer | null> {
  const raw = await redisConnection.get(cacheKey(certificateId));
  if (!raw) {
    return null;
  }

  return Buffer.from(raw, "base64");
}

export async function setCachedCertificatePdf(certificateId: string, buffer: Buffer): Promise<void> {
  await redisConnection.set(cacheKey(certificateId), buffer.toString("base64"), "EX", CERTIFICATE_PDF_CACHE.ttlSeconds);
}

export async function deleteCachedCertificatePdf(certificateId: string): Promise<void> {
  await redisConnection.del(cacheKey(certificateId));
}
