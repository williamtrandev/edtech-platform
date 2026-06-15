import Editor from "@monaco-editor/react";
import { useTheme } from "../hooks/use-theme";
import { cn } from "@/lib/utils";

/** Maps our language ids onto Monaco's. */
const MONACO_LANGUAGE: Record<string, string> = {
  python: "python",
  javascript: "javascript",
  typescript: "typescript",
  go: "go",
  rust: "rust",
  java: "java",
  cpp: "cpp",
  sql: "sql",
  bash: "shell"
};

type CodeEditorProps = {
  value: string;
  language: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: number | string;
  className?: string;
  ariaLabel?: string;
  /** Drop the editor's own border/rounding/background when nested in a frame. */
  frameless?: boolean;
};

export function CodeEditor({ value, language, onChange, readOnly = false, height = 320, className, ariaLabel, frameless = false }: CodeEditorProps) {
  const { effectiveTheme } = useTheme();

  return (
    <div
      className={cn(frameless ? "overflow-hidden bg-transparent" : "overflow-hidden rounded-lg border border-border bg-card", className)}
      aria-label={ariaLabel}
    >
      <Editor
        height={height}
        language={MONACO_LANGUAGE[language] ?? "plaintext"}
        value={value}
        theme={effectiveTheme === "dark" ? "vs-dark" : "light"}
        onChange={(next) => onChange?.(next ?? "")}
        loading={<div className="grid h-full place-items-center font-mono text-xs text-muted-foreground">Loading editor...</div>}
        options={{
          readOnly,
          fontSize: 13,
          fontFamily: "var(--font-mono)",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbers: "on",
          tabSize: 2,
          padding: { top: 12, bottom: 12 },
          automaticLayout: true,
          scrollbar: { alwaysConsumeMouseWheel: false }
        }}
      />
    </div>
  );
}
