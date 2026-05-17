import { z } from "zod";

export const uploadFileSchema = z.object({
  body: z.object({
    fileName: z.string().min(1).max(255),
    mimeType: z.string().min(1).max(120),
    dataUrl: z.string().min(1)
  })
});
