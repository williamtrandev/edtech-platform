import type { ExamQuestionOption } from "../services/exam.service";

export function toQuestionOptionId(index: number) {
  return String.fromCharCode(65 + index);
}

export function parseQuestionOptions(value: string | undefined) {
  return (value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const explicitIdMatch = /^([A-Za-z0-9]{1,6})[\).:-]\s+(.+)$/.exec(line);
      return {
        id: explicitIdMatch ? explicitIdMatch[1].toUpperCase() : toQuestionOptionId(index),
        text: explicitIdMatch ? explicitIdMatch[2].trim() : line
      };
    });
}

export function formatQuestionOptions(options: ExamQuestionOption[] | null | undefined) {
  return (options ?? []).map((option) => `${option.id}. ${option.text}`).join("\n");
}

export function parseCorrectAnswers(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((answer) => answer.trim().toUpperCase())
    .filter(Boolean);
}
