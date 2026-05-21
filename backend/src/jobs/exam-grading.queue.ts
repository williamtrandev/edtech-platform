import { createQueue, createWorker } from "./base.queue";
import { ExamAttemptRepository } from "../modules/exam-attempt/exam-attempt.repository";
import { ExamGradingService } from "../modules/exam-attempt/exam-grading.service";

const queueName = "exam-grading";

export type ExamGradingJobPayload = {
  attemptId: string;
};

export const examGradingQueue = createQueue(queueName);

const examAttemptRepository = new ExamAttemptRepository();
const examGradingService = new ExamGradingService(examAttemptRepository);

export const examGradingWorker = createWorker(queueName, async (job) => {
  const payload = job.data as ExamGradingJobPayload;
  if (!payload.attemptId) {
    throw new Error("EXAM_GRADING_MISSING_ATTEMPT_ID");
  }

  await examGradingService.gradeAttempt(payload.attemptId);
});
