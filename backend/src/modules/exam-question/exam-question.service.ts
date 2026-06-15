import { ExamQuestionType, Prisma } from "@prisma/client";
import { EXAM_QUESTION_TYPE } from "../../common/constants/business";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../../common/constants/audit";
import { AppError } from "../../common/errors/app-error";
import { assertCourseInstructor, canViewCourseAsStaff } from "../../common/auth/course-access";
import { AuditRepository } from "../audit/audit.repository";
import { CourseRepository } from "../course/course.repository";
import { ExamRepository } from "../exam/exam.repository";
import { ExamQuestionRepository } from "./exam-question.repository";

type ExamQuestionOption = {
  id: string;
  text: string;
};

type CodeTest = {
  name: string;
  input: string;
  expectedOutput: string;
  hidden: boolean;
};

type CodeQuestionPayload = {
  language: string;
  starterCode: string;
  solutionCode: string;
  instructions?: string | null;
  tests: CodeTest[];
};

/** Public, learner-visible slice of a CODE question (no solution, no hidden tests). */
type CodeConfig = {
  language: string;
  starterCode: string;
  instructions: string | null;
  sampleTests: Array<Pick<CodeTest, "name" | "input" | "expectedOutput">>;
};

/** Secret slice stored in `correctAnswers`: only selected during grading. */
type CodeSecret = {
  solutionCode: string;
  tests: CodeTest[];
};

type ExamQuestionPayload = {
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "FREE_TEXT" | "CODE";
  prompt: string;
  options: ExamQuestionOption[];
  correctAnswers: string[];
  code?: CodeQuestionPayload | null;
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
  codeConfig: Prisma.JsonValue | null;
  explanation: string | null;
  points: number;
  sortOrder: number;
};

/** Splits a CODE payload into its public (`codeConfig`) and secret (`correctAnswers`) parts. */
function buildCodeStorage(code: CodeQuestionPayload): { codeConfig: CodeConfig; correctAnswers: CodeSecret } {
  return {
    codeConfig: {
      language: code.language,
      starterCode: code.starterCode,
      instructions: code.instructions ?? null,
      sampleTests: code.tests
        .filter((test) => !test.hidden)
        .map(({ name, input, expectedOutput }) => ({ name, input, expectedOutput }))
    },
    correctAnswers: {
      solutionCode: code.solutionCode,
      tests: code.tests
    }
  };
}

export class ExamQuestionService {
  constructor(
    private readonly examQuestionRepository: ExamQuestionRepository,
    private readonly examRepository: ExamRepository,
    private readonly courseRepository: CourseRepository,
    private readonly auditRepository?: AuditRepository
  ) {}

  async listExamQuestions(user: Express.UserClaims | undefined, examId: string) {
    await this.assertCanViewExam(user, examId);
    return this.examQuestionRepository.findByExamId(examId);
  }

  async createExamQuestion(user: Express.UserClaims | undefined, examId: string, payload: ExamQuestionPayload) {
    await this.assertCanManageExam(user, examId);
    this.assertQuestionConfig(payload);

    const storage =
      payload.type === EXAM_QUESTION_TYPE.code && payload.code
        ? buildCodeStorage(payload.code)
        : null;

    try {
      const question = await this.examQuestionRepository.create({
        exam: { connect: { id: examId } },
        type: payload.type,
        prompt: payload.prompt,
        options: (storage ? [] : payload.options) as Prisma.InputJsonValue,
        correctAnswers: (storage ? storage.correctAnswers : payload.correctAnswers) as Prisma.InputJsonValue,
        ...(storage ? { codeConfig: storage.codeConfig as Prisma.InputJsonValue } : {}),
        explanation: payload.explanation || null,
        points: payload.points,
        sortOrder: payload.sortOrder
      });

      await this.auditRepository?.create({
        actor: { connect: { id: user!.id } },
        action: AUDIT_ACTION.examQuestionCreated,
        entityType: AUDIT_ENTITY_TYPE.examQuestion,
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

    const codeStorage =
      merged.type === EXAM_QUESTION_TYPE.code && merged.code ? buildCodeStorage(merged.code) : null;

    try {
      const updatedQuestion = await this.examQuestionRepository.update(questionId, {
        ...(payload.type !== undefined ? { type: payload.type } : {}),
        ...(payload.prompt !== undefined ? { prompt: payload.prompt } : {}),
        ...(codeStorage
          ? {
              options: [] as Prisma.InputJsonValue,
              correctAnswers: codeStorage.correctAnswers as Prisma.InputJsonValue,
              codeConfig: codeStorage.codeConfig as Prisma.InputJsonValue
            }
          : {
              ...(payload.options !== undefined ? { options: payload.options as Prisma.InputJsonValue } : {}),
              ...(payload.correctAnswers !== undefined ? { correctAnswers: payload.correctAnswers as Prisma.InputJsonValue } : {}),
              ...(payload.type !== undefined && payload.type !== EXAM_QUESTION_TYPE.code ? { codeConfig: Prisma.DbNull } : {})
            }),
        ...(payload.explanation !== undefined ? { explanation: payload.explanation || null } : {}),
        ...(payload.points !== undefined ? { points: payload.points } : {}),
        ...(payload.sortOrder !== undefined ? { sortOrder: payload.sortOrder } : {})
      });

      await this.auditRepository?.create({
        actor: { connect: { id: user!.id } },
        action: AUDIT_ACTION.examQuestionUpdated,
        entityType: AUDIT_ENTITY_TYPE.examQuestion,
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
      action: AUDIT_ACTION.examQuestionDeleted,
      entityType: AUDIT_ENTITY_TYPE.examQuestion,
      entityId: questionId,
      metadata: {
        examId: question.examId,
        type: question.type
      }
    });

    return deletedQuestion;
  }

  private async assertCanViewExam(user: Express.UserClaims | undefined, examId: string) {
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

    if (!canViewCourseAsStaff(user, course.instructorId)) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
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

    assertCourseInstructor(user, course.instructorId);
  }

  private mergeQuestion(question: StoredQuestion, payload: UpdateExamQuestionPayload): ExamQuestionPayload {
    const type = payload.type ?? question.type;
    return {
      type,
      prompt: payload.prompt ?? question.prompt,
      options: payload.options ?? this.parseJsonArray<ExamQuestionOption>(question.options),
      correctAnswers: payload.correctAnswers ?? this.parseJsonArray<string>(question.correctAnswers),
      code: payload.code ?? (type === EXAM_QUESTION_TYPE.code ? this.reconstructCode(question) : null),
      explanation: payload.explanation === undefined ? question.explanation : payload.explanation,
      points: payload.points ?? question.points,
      sortOrder: payload.sortOrder ?? question.sortOrder
    };
  }

  /** Rebuilds a CODE payload from its stored public (`codeConfig`) + secret (`correctAnswers`) parts. */
  private reconstructCode(question: StoredQuestion): CodeQuestionPayload | null {
    const config = question.codeConfig as CodeConfig | null;
    if (!config) {
      return null;
    }
    const secret = (question.correctAnswers as CodeSecret | null) ?? { solutionCode: "", tests: [] };
    return {
      language: config.language,
      starterCode: config.starterCode ?? "",
      solutionCode: secret.solutionCode ?? "",
      instructions: config.instructions ?? null,
      tests: Array.isArray(secret.tests) ? secret.tests : []
    };
  }

  private parseJsonArray<T>(value: Prisma.JsonValue | null): T[] {
    return Array.isArray(value) ? (value as T[]) : [];
  }

  private assertQuestionConfig(question: ExamQuestionPayload) {
    if (question.type === EXAM_QUESTION_TYPE.freeText) {
      return;
    }

    if (question.type === EXAM_QUESTION_TYPE.code) {
      if (!question.code || !question.code.tests.length) {
        throw new AppError("Code questions need a configuration with at least one test", 422, "EXAM_QUESTION_CODE_INVALID");
      }
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
