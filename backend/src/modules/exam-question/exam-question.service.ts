import { ExamQuestionType, Prisma } from "@prisma/client";
import { EXAM_QUESTION_TYPE, USER_ROLE } from "../../common/constants/business";
import { AppError } from "../../common/errors/app-error";
import { AuditRepository } from "../audit/audit.repository";
import { CourseRepository } from "../course/course.repository";
import { ExamRepository } from "../exam/exam.repository";
import { ExamQuestionRepository } from "./exam-question.repository";

type ExamQuestionOption = {
  id: string;
  text: string;
};

type ExamQuestionPayload = {
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "FREE_TEXT";
  prompt: string;
  options: ExamQuestionOption[];
  correctAnswers: string[];
  explanation?: string | null;
  points: number;
  sortOrder: number;
};

type UpdateExamQuestionPayload = Partial<ExamQuestionPayload>;

type StoredQuestion = {
  type: ExamQuestionType;
  prompt: string;
  options: Prisma.JsonValue | null;
  correctAnswers: Prisma.JsonValue | null;
  explanation: string | null;
  points: number;
  sortOrder: number;
};

export class ExamQuestionService {
  constructor(
    private readonly examQuestionRepository: ExamQuestionRepository,
    private readonly examRepository: ExamRepository,
    private readonly courseRepository: CourseRepository,
    private readonly auditRepository?: AuditRepository
  ) {}

  async listExamQuestions(user: Express.UserClaims | undefined, examId: string) {
    await this.assertCanManageExam(user, examId);
    return this.examQuestionRepository.findByExamId(examId);
  }

  async createExamQuestion(user: Express.UserClaims | undefined, examId: string, payload: ExamQuestionPayload) {
    await this.assertCanManageExam(user, examId);
    this.assertQuestionConfig(payload);

    try {
      const question = await this.examQuestionRepository.create({
        exam: { connect: { id: examId } },
        type: payload.type,
        prompt: payload.prompt,
        options: payload.options as Prisma.InputJsonValue,
        correctAnswers: payload.correctAnswers as Prisma.InputJsonValue,
        explanation: payload.explanation || null,
        points: payload.points,
        sortOrder: payload.sortOrder
      });

      await this.auditRepository?.create({
        actor: { connect: { id: user!.id } },
        action: "EXAM_QUESTION_CREATED",
        entityType: "ExamQuestion",
        entityId: question.id,
        metadata: {
          examId,
          type: question.type
        }
      });

      return question;
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError("Question order already exists in this exam", 409, "EXAM_QUESTION_SORT_ORDER_CONFLICT");
      }
      throw error;
    }
  }

  async updateExamQuestion(user: Express.UserClaims | undefined, questionId: string, payload: UpdateExamQuestionPayload) {
    const question = await this.examQuestionRepository.findById(questionId);
    if (!question) {
      throw new AppError("Question not found", 404, "EXAM_QUESTION_NOT_FOUND");
    }

    await this.assertCanManageExam(user, question.examId);

    const merged = this.mergeQuestion(question, payload);
    this.assertQuestionConfig(merged);

    try {
      const updatedQuestion = await this.examQuestionRepository.update(questionId, {
        ...(payload.type !== undefined ? { type: payload.type } : {}),
        ...(payload.prompt !== undefined ? { prompt: payload.prompt } : {}),
        ...(payload.options !== undefined ? { options: payload.options as Prisma.InputJsonValue } : {}),
        ...(payload.correctAnswers !== undefined ? { correctAnswers: payload.correctAnswers as Prisma.InputJsonValue } : {}),
        ...(payload.explanation !== undefined ? { explanation: payload.explanation || null } : {}),
        ...(payload.points !== undefined ? { points: payload.points } : {}),
        ...(payload.sortOrder !== undefined ? { sortOrder: payload.sortOrder } : {})
      });

      await this.auditRepository?.create({
        actor: { connect: { id: user!.id } },
        action: "EXAM_QUESTION_UPDATED",
        entityType: "ExamQuestion",
        entityId: questionId,
        metadata: {
          examId: question.examId,
          type: updatedQuestion.type
        }
      });

      return updatedQuestion;
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError("Question order already exists in this exam", 409, "EXAM_QUESTION_SORT_ORDER_CONFLICT");
      }
      throw error;
    }
  }

  async deleteExamQuestion(user: Express.UserClaims | undefined, questionId: string) {
    const question = await this.examQuestionRepository.findById(questionId);
    if (!question) {
      throw new AppError("Question not found", 404, "EXAM_QUESTION_NOT_FOUND");
    }

    await this.assertCanManageExam(user, question.examId);
    const deletedQuestion = await this.examQuestionRepository.delete(questionId, question.examId, question.sortOrder);
    await this.auditRepository?.create({
      actor: { connect: { id: user!.id } },
      action: "EXAM_QUESTION_DELETED",
      entityType: "ExamQuestion",
      entityId: questionId,
      metadata: {
        examId: question.examId,
        type: question.type
      }
    });

    return deletedQuestion;
  }

  private async assertCanManageExam(user: Express.UserClaims | undefined, examId: string) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const exam = await this.examRepository.findById(examId);
    if (!exam) {
      throw new AppError("Exam not found", 404, "EXAM_NOT_FOUND");
    }

    const course = await this.courseRepository.findById(exam.courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    const canManageCourse = user.role === USER_ROLE.admin || course.instructorId === user.id;
    if (!canManageCourse) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
  }

  private mergeQuestion(question: StoredQuestion, payload: UpdateExamQuestionPayload): ExamQuestionPayload {
    return {
      type: payload.type ?? question.type,
      prompt: payload.prompt ?? question.prompt,
      options: payload.options ?? this.parseJsonArray<ExamQuestionOption>(question.options),
      correctAnswers: payload.correctAnswers ?? this.parseJsonArray<string>(question.correctAnswers),
      explanation: payload.explanation === undefined ? question.explanation : payload.explanation,
      points: payload.points ?? question.points,
      sortOrder: payload.sortOrder ?? question.sortOrder
    };
  }

  private parseJsonArray<T>(value: Prisma.JsonValue | null): T[] {
    return Array.isArray(value) ? (value as T[]) : [];
  }

  private assertQuestionConfig(question: ExamQuestionPayload) {
    if (question.type === EXAM_QUESTION_TYPE.freeText) {
      return;
    }

    const optionIds = new Set(question.options.map((option) => option.id));
    if (question.options.length < 2 || optionIds.size !== question.options.length) {
      throw new AppError("Choice questions need unique options", 422, "EXAM_QUESTION_OPTIONS_INVALID");
    }

    if (!question.correctAnswers.length) {
      throw new AppError("Choice questions need at least one correct answer", 422, "EXAM_QUESTION_ANSWERS_INVALID");
    }

    if (question.type === EXAM_QUESTION_TYPE.singleChoice && question.correctAnswers.length !== 1) {
      throw new AppError("Single choice questions need exactly one correct answer", 422, "EXAM_QUESTION_ANSWERS_INVALID");
    }

    if (question.correctAnswers.some((answer) => !optionIds.has(answer))) {
      throw new AppError("Correct answers must match option IDs", 422, "EXAM_QUESTION_ANSWERS_INVALID");
    }
  }
}
