import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { AppError } from "../../common/errors/app-error";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads");

const MIME_EXTENSION: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
  "text/plain": ".txt",
  "text/markdown": ".md",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov"
};

function extensionFor(fileName: string, mimeType: string) {
  const fromMime = MIME_EXTENSION[mimeType];
  if (fromMime) {
    return fromMime;
  }

  const ext = path.extname(fileName).toLowerCase();
  return ext && ext.length <= 12 ? ext : "";
}

function decodeDataUrl(dataUrl: string, mimeType: string) {
  const match = /^data:([^;]+);base64,(.+)$/u.exec(dataUrl);
  if (!match) {
    throw new AppError("Invalid upload payload", 422, "INVALID_UPLOAD");
  }

  const [, encodedMimeType, base64] = match;
  if (encodedMimeType !== mimeType) {
    throw new AppError("Upload MIME type mismatch", 422, "INVALID_UPLOAD_MIME");
  }

  const buffer = Buffer.from(base64, "base64");
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new AppError("Upload file is too large", 413, "UPLOAD_TOO_LARGE");
  }

  return buffer;
}

export class UploadService {
  async saveFile(payload: { fileName: string; mimeType: string; dataUrl: string }) {
    const buffer = decodeDataUrl(payload.dataUrl, payload.mimeType);
    const extension = extensionFor(payload.fileName, payload.mimeType);
    const storedName = `${Date.now()}-${randomUUID()}${extension}`;

    await mkdir(UPLOAD_ROOT, { recursive: true });
    await writeFile(path.join(UPLOAD_ROOT, storedName), buffer);

    return {
      url: `/uploads/${storedName}`,
      fileName: payload.fileName,
      mimeType: payload.mimeType,
      size: buffer.byteLength
    };
  }
}
