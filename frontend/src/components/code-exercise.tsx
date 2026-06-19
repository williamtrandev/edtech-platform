import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, FlaskConical, Loader2, Lock, Play, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  /** Practice "Run" handler; when set (and not readOnly) a Run button appears. */
  onRun?: () => void;
  isRunning?: boolean;
  /** Result of the latest practice run against the public sample tests. */
  runResult?: CodeGradingResult | null;
  fileName?: string;
  height?: number;
  className?: string;
};

function OutputBlock({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <pre
      className={cn(
        "min-h-[36px] w-full overflow-x-auto rounded-lg bg-secondary/60 px-3 py-2.5 font-mono text-[12px] leading-relaxed text-foreground whitespace-pre-wrap break-all",
        className
      )}
    >
      {children}
    </pre>
  );
}

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
  onRun,
  isRunning = false,
  runResult,
  fileName,
  height = 280,
  className
}: CodeExerciseProps) {
  const { t } = useI18n();
  const resolvedFileName = fileName ?? `solution.${FILE_EXTENSION[language] ?? "txt"}`;
  // Graded result (final) takes priority over a practice run result.
  const shownResult = result ?? runResult ?? null;
  const showRun = Boolean(onRun) && !readOnly;

  const visibleTests = shownResult?.results.filter((r) => !r.hidden) ?? [];
  const hiddenTests = shownResult?.results.filter((r) => r.hidden) ?? [];
  const hiddenPassed = hiddenTests.filter((r) => r.passed).length;

  // Default to first failing test so the learner sees the failure immediately.
  const [activeTab, setActiveTab] = useState(0);
  useEffect(() => {
    if (!shownResult) return;
    const firstFail = visibleTests.findIndex((r) => !r.passed);
    setActiveTab(Math.max(0, firstFail));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownResult]);

  const selectedTest = visibleTests[activeTab];
  // Compile error is global — same code, same compiler failure for all tests.
  const compileError = shownResult?.results.find((r) => r.compileError)?.compileError ?? null;

  return (
    <div className={cn("grid gap-3", className)}>
      {instructions ? <p className="text-sm leading-6 text-muted-foreground">{instructions}</p> : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_24px_80px_-28px_rgba(0,0,0,0.55)]">
        {/* Title bar */}
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

        {/* Footer bar */}
        <div className="flex items-center gap-2 border-t border-border bg-secondary/40 px-4 py-2.5 font-mono text-[11px]">
          {shownResult ? (
            <>
              {shownResult.allPassed ? (
                <CheckCircle2 className="size-3.5 text-primary" aria-hidden />
              ) : (
                <XCircle className="size-3.5 text-destructive" aria-hidden />
              )}
              <span className={shownResult.allPassed ? "text-primary" : "text-destructive"}>
                {t("examAttempt.codeTestsPassed").replace("{passed}", String(shownResult.passed)).replace("{total}", String(shownResult.total))}
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
          {showRun ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="ml-auto h-7 rounded-md px-2.5 font-sans shadow-none"
              disabled={isRunning}
              onClick={onRun}
            >
              {isRunning ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Play className="size-3.5" aria-hidden />}
              {t("examAttempt.codeRun")}
            </Button>
          ) : null}
        </div>
      </div>

      {/* LeetCode-style result panel */}
      {shownResult ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {/* Section header */}
          <div
            className={cn(
              "flex items-center gap-2 border-b border-border px-4 py-3 font-mono text-[11px] uppercase tracking-wide",
              shownResult.allPassed ? "bg-primary/5 text-primary" : "bg-destructive/5 text-destructive"
            )}
          >
            {shownResult.allPassed ? (
              <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
            ) : (
              <XCircle className="size-3.5 shrink-0" aria-hidden />
            )}
            <span>{result ? t("examAttempt.codeResults") : t("examAttempt.codeRunResults")}</span>
            <span className="ml-auto">
              {t("examAttempt.codeTestsPassed").replace("{passed}", String(shownResult.passed)).replace("{total}", String(shownResult.total))}
            </span>
          </div>

          <div className="grid gap-4 p-4">
            {/* Compile error banner */}
            {compileError ? (
              <div className="grid gap-2">
                <div className="flex items-center gap-2 text-[12px] font-semibold text-destructive">
                  <AlertTriangle className="size-4 shrink-0" aria-hidden />
                  {t("examAttempt.codeCompileError")}
                </div>
                <OutputBlock className="text-destructive/90">{compileError.trim()}</OutputBlock>
              </div>
            ) : null}

            {/* Visible test tabs + detail (only when no compile error) */}
            {visibleTests.length > 0 && !compileError ? (
              <div className="grid gap-3">
                {/* Tab row */}
                <div className="flex flex-wrap gap-1.5">
                  {visibleTests.map((test, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setActiveTab(index)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[11px] transition-colors",
                        activeTab === index
                          ? test.passed
                            ? "border-primary/50 bg-primary/10 text-primary"
                            : "border-destructive/50 bg-destructive/10 text-destructive"
                          : "border-border bg-secondary/60 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span
                        className={cn("size-1.5 rounded-full", test.passed ? "bg-primary" : "bg-destructive")}
                        aria-hidden
                      />
                      {t("examAttempt.codeCase")} {index + 1}
                    </button>
                  ))}
                </div>

                {/* Selected test detail */}
                {selectedTest ? (
                  <div className="grid gap-3">
                    {/* Time limit exceeded */}
                    {selectedTest.timedOut ? (
                      <div className="flex items-center gap-2 rounded-lg border border-chart-3/30 bg-chart-3/10 px-3 py-2.5 text-[12px] font-semibold text-chart-3">
                        <Clock className="size-4 shrink-0" aria-hidden />
                        {t("examAttempt.codeTimedOut")}
                      </div>
                    ) : null}

                    {/* Input */}
                    {selectedTest.input != null ? (
                      <div className="grid gap-1.5">
                        <span className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {t("examAttempt.codeInput")}
                        </span>
                        <OutputBlock>{selectedTest.input || t("examAttempt.codeEmptyOutput")}</OutputBlock>
                      </div>
                    ) : null}

                    {/* Your output — runtime error (stderr) takes precedence over stdout */}
                    <div className="grid gap-1.5">
                      {selectedTest.stderr && !selectedTest.passed ? (
                        <>
                          <span className="font-mono text-[11px] font-semibold uppercase tracking-wide text-destructive">
                            {t("examAttempt.codeRuntimeError")}
                          </span>
                          <OutputBlock className="text-destructive/90">{selectedTest.stderr.trim()}</OutputBlock>
                        </>
                      ) : (
                        <>
                          <span
                            className={cn(
                              "font-mono text-[11px] font-semibold uppercase tracking-wide",
                              selectedTest.passed ? "text-primary" : "text-muted-foreground"
                            )}
                          >
                            {t("examAttempt.codeYourOutput")}
                          </span>
                          <OutputBlock className={selectedTest.passed ? "text-primary/90" : undefined}>
                            {selectedTest.stdout?.trim() || t("examAttempt.codeEmptyOutput")}
                          </OutputBlock>
                        </>
                      )}
                    </div>

                    {/* Expected — only shown when the test failed */}
                    {!selectedTest.passed && selectedTest.expectedOutput != null ? (
                      <div className="grid gap-1.5">
                        <span className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {t("examAttempt.codeExpected")}
                        </span>
                        <OutputBlock>{selectedTest.expectedOutput.trim() || t("examAttempt.codeEmptyOutput")}</OutputBlock>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* When compile error: show each visible test as failed in a flat list */}
            {compileError && visibleTests.length > 0 ? (
              <div className="grid gap-1.5">
                {visibleTests.map((test, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-2.5 py-2 font-mono text-[11px]"
                  >
                    <XCircle className="size-3.5 shrink-0 text-destructive" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-foreground">{test.name}</span>
                    <span className="shrink-0 uppercase text-destructive">{t("examAttempt.codeFail")}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Hidden tests summary */}
            {hiddenTests.length > 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2.5 font-mono text-[11px]">
                <Lock className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="text-muted-foreground">
                  {t("examAttempt.codeHiddenTestsSummary")
                    .replace("{passed}", String(hiddenPassed))
                    .replace("{total}", String(hiddenTests.length))}
                </span>
                <span
                  className={cn(
                    "ml-auto shrink-0 uppercase font-semibold",
                    hiddenPassed === hiddenTests.length ? "text-primary" : "text-destructive"
                  )}
                >
                  {hiddenPassed === hiddenTests.length ? t("examAttempt.codePass") : t("examAttempt.codeFail")}
                </span>
              </div>
            ) : null}
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
                  <span className="text-primary">{t("examAttempt.codeInput")}</span> {test.input || t("examAttempt.codeEmptyOutput")}
                </div>
                <div className="text-muted-foreground">
                  <span className="text-primary">{t("examAttempt.codeExpected")}</span> {test.expectedOutput || t("examAttempt.codeEmptyOutput")}
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
