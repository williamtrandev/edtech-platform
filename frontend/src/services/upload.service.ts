import { supabase } from "../lib/supabase";

export type UploadedFile = {
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
};

const STORAGE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || "edtech-uploads";
const COURSE_COVER_SIZE = {
  width: 1280,
  height: 720
} as const;
const LESSON_IMAGE_LIMIT = {
  width: 1600,
  height: 1200
} as const;

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load image"));
    };
    image.src = url;
  });
}

function createSafeFileName(fileName: string) {
  const normalizedName = fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return normalizedName || "upload";
}

function createStoragePath(folder: string, file: File) {
  const datePath = new Date().toISOString().slice(0, 10);
  const randomId = crypto.randomUUID();
  return `${folder}/${datePath}/${Date.now()}-${randomId}-${createSafeFileName(file.name)}`;
}

function getFileBaseName(file: File, fallback: string) {
  return file.name.replace(/\.[^.]+$/u, "") || fallback;
}

async function resizeImage(file: File, width: number, height: number) {
  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not resize image");
  }

  const sourceRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = width / height;
  const sourceWidth = sourceRatio > targetRatio ? image.naturalHeight * targetRatio : image.naturalWidth;
  const sourceHeight = sourceRatio > targetRatio ? image.naturalHeight : image.naturalWidth / targetRatio;
  const sourceX = (image.naturalWidth - sourceWidth) / 2;
  const sourceY = (image.naturalHeight - sourceHeight) / 2;

  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((nextBlob) => {
      if (nextBlob) {
        resolve(nextBlob);
      } else {
        reject(new Error("Could not encode image"));
      }
    }, "image/webp", 0.86);
  });

  const baseName = getFileBaseName(file, "cover");
  return new File([blob], `${baseName}.webp`, { type: "image/webp" });
}

async function resizeImageToFit(file: File, maxWidth: number, maxHeight: number) {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  if (file.type === "image/gif") {
    return file;
  }

  const image = await loadImage(file);
  const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);

  if (scale === 1 && file.type === "image/webp") {
    return file;
  }

  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not resize image");
  }

  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((nextBlob) => {
      if (nextBlob) {
        resolve(nextBlob);
      } else {
        reject(new Error("Could not encode image"));
      }
    }, "image/webp", 0.88);
  });

  const baseName = getFileBaseName(file, "lesson-image");
  return new File([blob], `${baseName}.webp`, { type: "image/webp" });
}

async function uploadToSupabase(file: File, folder: string): Promise<UploadedFile> {
  const path = createStoragePath(folder, file);
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data: publicUrlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(data.path);
  if (!publicUrlData.publicUrl) {
    throw new Error("Could not resolve uploaded file URL");
  }

  return {
    url: publicUrlData.publicUrl,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size
  };
}

export const uploadService = {
  async uploadFile(file: File, folder = "course-assets"): Promise<UploadedFile> {
    return uploadToSupabase(file, folder);
  },

  async uploadCourseCover(file: File): Promise<UploadedFile> {
    const resized = await resizeImage(file, COURSE_COVER_SIZE.width, COURSE_COVER_SIZE.height);
    return uploadToSupabase(resized, "course-covers");
  },

  async uploadLessonImage(file: File, onProgress?: (progress: number) => void): Promise<UploadedFile> {
    if (!file.type.startsWith("image/")) {
      throw new Error("Only image files are supported");
    }

    onProgress?.(15);
    const resized = await resizeImageToFit(file, LESSON_IMAGE_LIMIT.width, LESSON_IMAGE_LIMIT.height);
    onProgress?.(45);
    const uploaded = await uploadToSupabase(resized, "lesson-images");
    onProgress?.(100);
    return uploaded;
  }
};
