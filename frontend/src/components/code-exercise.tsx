import { CheckCircle2, FlaskConical, Lock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n, type I18nKey } from "../i18n";
import type { CodeGradingResult } from "../services/exam.service";
import { CodeEditor } from "./code-editor";

const FILE_EXTENSION: Record<string, string> = {
  python: "py",
  javascript: "js",
  typescript: "ts",
  go: "go",
  rust: "rs",
  java: "java",
  cpp: "cpp",
  sql: "sql",
  bash: "sh"
};

export type CodeExerciseSampleTest = {
  name: string;
  input: string;
  expectedOutput: string;
};

type CodeExerciseProps = {
  language: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  instructions?: string | null;
  sampleTests?: CodeExerciseSampleTest[];
  /** Per-test grading feedback, shown after the attempt is graded. */
  result?: CodeGradingResult | null;
  fileName?: string;
  height?: number;
  className?: string;
};

/**
 * Terminal-window framed coding exercise, styled to match the marketing landing
 * page's CodeWindow (window dots, mono filename bar, green accents).
 */
export function CodeExercise({
  language,
  value,
  onChange,
  readOnly = false,
  instructions,
  sampleTests = [],
  result,
  fileName,
  height = 280,
  className
}: CodeExerciseProps) {
  const { t } = useI18n();
  const resolvedFileName = fileName ?? `solution.${FILE_EXTENSION[language] ?? "txt"}`;

  return (
    <div className={cn("grid gap-3", className)}>
      {instructions ? <p className="text-sm leading-6 text-muted-foreground">{instructions}</p> : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_24px_80px_-28px_rgba(0,0,0,0.55)]">
        <div className="flex items-center gap-2 border-b border-border bg-secondary/60 px-4 py-2.5">
          <span className="size-3 rounded-full bg-destructive/70" aria-hidden />
          <span className="size-3 rounded-full bg-chart-3/70" aria-hidden />
          <span className="size-3 rounded-full bg-primary/70" aria-hidden />
          <span className="ml-2 font-mono text-xs text-muted-foreground">{resolvedFileName}</span>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-mono text-[11px] text-primary">
            {readOnly ? <Lock className="size-3" aria-hidden /> : null}
            {t(`codeLanguage.${language}` as I18nKey)}
          </span>
        </div>

        <CodeEditor language={language} value={value} onChange={onChange} readOnly={readOnly} height={height} frameless ariaLabel={t("examAttempt.codeEditorLabel")} />

        <div className="flex items-center gap-2 border-t border-border bg-secondary/40 px-4 py-2.5 font-mono text-[11px]">
          {result ? (
            <>
              {result.allPassed ? (
                <CheckCircle2 className="size-3.5 text-primary" aria-hidden />
              ) : (
                <XCircle className="size-3.5 text-destructive" aria-hidden />
              )}
              <span className={result.allPassed ? "text-primary" : "text-destructive"}>
                {t("examAttempt.codeTestsPassed").replace("{passed}", String(result.passed)).replace("{total}", String(result.total))}
              </span>
            </>
          ) : (
            <>
              <FlaskConical className="size-3.5 text-primary" aria-hidden />
              <span className="text-muted-foreground">
                {sampleTests.length > 0
                  ? t("examAttempt.codeSampleTestsCount").replace("{count}", String(sampleTests.length))
                  : t("examAttempt.codeManualNote")}
              </span>
            </>
          )}
        </div>
      </div>

      {result ? (
        <div className="grid gap-1.5">
          <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">{t("examAttempt.codeResults")}</span>
          <div className="grid gap-1.5">
            {result.results.map((test, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded-lg border border-border bg-card/60 px-2.5 py-2 font-mono text-[11px]"
              >
                {test.passed ? (
                  <CheckCircle2 className="size-3.5 shrink-0 text-primary" aria-hidden />
                ) : (
                  <XCircle className="size-3.5 shrink-0 text-destructive" aria-hidden />
                )}
                <span className="min-w-0 flex-1 truncate text-foreground">{test.hidden ? t("examAttempt.codeHiddenTest") : test.name}</span>
                <span className={cn("shrink-0 uppercase", test.passed ? "text-primary" : "text-destructive")}>
                  {test.passed ? t("examAttempt.codePass") : t("examAttempt.codeFail")}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : sampleTests.length > 0 ? (
        <div className="grid gap-1.5">
          <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">{t("examAttempt.codeSampleTests")}</span>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {sampleTests.map((test, index) => (
              <div key={index} className="grid gap-1 rounded-lg border border-border bg-card/60 p-2.5 font-mono text-[11px]">
                <span className="text-foreground">{test.name}</span>
                <div className="text-muted-foreground">
                  <span className="text-primary">{t("examAttempt.codeInput")}</span> {test.input || "—"}
                </div>
                <div className="text-muted-foreground">
                  <span className="text-primary">{t("examAttempt.codeExpected")}</span> {test.expectedOutput || "—"}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">{t("examAttempt.codeManualNote")}</p>
        </div>
      ) : null}
    </div>
  );
}
