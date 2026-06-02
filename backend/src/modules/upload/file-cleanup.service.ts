import { readdir, stat, unlink } from "fs/promises";
import path from "path";
import { FILE_CLEANUP_JOB, UPLOAD_STORAGE } from "../../common/constants/upload";
import { prisma } from "../../config/prisma";
import { createLogger } from "../../config/logger";

const log = createLogger("FileCleanupService");

const UPLOAD_ROOT = path.resolve(process.cwd(), UPLOAD_STORAGE.directoryName);
const UPLOAD_PATH_PATTERN = /\/uploads\/([^\s"'<>]+)/gu;

function collectUploadPathsFromText(value: string | null | undefined, paths: Set<string>) {
  if (!value) {
    return;
  }

  for (const match of value.matchAll(UPLOAD_PATH_PATTERN)) {
    const fileName = match[1]?.replace(/^\/+/, "");
    if (fileName) {
      paths.add(fileName);
    }
  }
}

export type FileCleanupResult = {
  scannedFiles: number;
  referencedFiles: number;
  deletedFiles: number;
  freedBytes: number;
  skippedRecent: number;
};

export class FileCleanupService {
  async collectReferencedFileNames(): Promise<Set<string>> {
    const referenced = new Set<string>();
    const [courses, assignments, submissions, lessons] = await Promise.all([
      prisma.course.findMany({ select: { coverImageUrl: true } }),
      prisma.assignment.findMany({ select: { attachmentUrl: true } }),
      prisma.assignmentSubmission.findMany({ select: { attachmentUrl: true } }),
      prisma.lesson.findMany({ select: { content: true } })
    ]);

    for (const course of courses) {
      collectUploadPathsFromText(course.coverImageUrl, referenced);
    }
    for (const assignment of assignments) {
      collectUploadPathsFromText(assignment.attachmentUrl, referenced);
    }
    for (const submission of submissions) {
      collectUploadPathsFromText(submission.attachmentUrl, referenced);
    }
    for (const lesson of lessons) {
      collectUploadPathsFromText(lesson.content, referenced);
    }

    return referenced;
  }

  async removeOrphanUploads(): Promise<FileCleanupResult> {
    const referenced = await this.collectReferencedFileNames();
    const minAgeMs = FILE_CLEANUP_JOB.minFileAgeMs;
    const now = Date.now();

    let scannedFiles = 0;
    let deletedFiles = 0;
    let freedBytes = 0;
    let skippedRecent = 0;

    let diskFiles: string[] = [];
    try {
      diskFiles = await readdir(UPLOAD_ROOT);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return {
          scannedFiles: 0,
          referencedFiles: referenced.size,
          deletedFiles: 0,
          freedBytes: 0,
          skippedRecent: 0
        };
      }
      throw error;
    }

    for (const fileName of diskFiles) {
      if (fileName.startsWith(".")) {
        continue;
      }

      scannedFiles += 1;
      if (referenced.has(fileName)) {
        continue;
      }

      const absolutePath = path.join(UPLOAD_ROOT, fileName);
      const fileStat = await stat(absolutePath);
      if (!fileStat.isFile()) {
        continue;
      }

      if (now - fileStat.mtimeMs < minAgeMs) {
        skippedRecent += 1;
        continue;
      }

      await unlink(absolutePath);
      deletedFiles += 1;
      freedBytes += fileStat.size;
      log.info("Deleted orphan upload", { fileName, size: fileStat.size });
    }

    return {
      scannedFiles,
      referencedFiles: referenced.size,
      deletedFiles,
      freedBytes,
      skippedRecent
    };
  }
}
