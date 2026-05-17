import { Editor } from "@tinymce/tinymce-react";
import type { Editor as TinyMceEditor } from "tinymce";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTheme } from "../features/preferences/theme-context";
import { useI18n } from "../i18n";
import { createLessonTinyMceInit } from "../lib/tinymce-lesson-config";
import { uploadService } from "../services/upload.service";

type LessonRichTextEditorProps = {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  onContentReaderChange?: (reader: (() => string) | null) => void;
};

type TinyMceBlobInfo = {
  blob: () => Blob;
  filename: () => string;
};

type TinyMceUploadProgress = (progress: number) => void;

const tinymceApiKey = import.meta.env.VITE_TINYMCE_API_KEY;

export function LessonRichTextEditor({ value, placeholder, onChange, onBlur, onContentReaderChange }: LessonRichTextEditorProps) {
  const { effectiveTheme } = useTheme();
  const { t } = useI18n();
  const editorId = useId().replace(/:/g, "");
  const editorRef = useRef<TinyMceEditor | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const isDark = effectiveTheme === "dark";

  const editorInit = useMemo(
    () => ({
      ...createLessonTinyMceInit(placeholder, isDark),
      images_upload_handler: async (blobInfo: TinyMceBlobInfo, progress: TinyMceUploadProgress) => {
        const blob = blobInfo.blob();
        const file = new File([blob], blobInfo.filename(), {
          type: blob.type || "image/png"
        });
        const uploaded = await uploadService.uploadLessonImage(file, progress);
        return uploaded.url;
      }
    }),
    [placeholder, isDark]
  );

  useEffect(() => {
    setIsReady(false);
    setHasLoadError(false);
  }, [isDark]);

  useEffect(() => {
    return () => {
      onContentReaderChange?.(null);
    };
    // Keep current reader stable while parent form re-renders during typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!tinymceApiKey) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        Missing <code className="font-mono text-xs">VITE_TINYMCE_API_KEY</code>. Add API key from{" "}
        <a className="underline" href="https://www.tiny.cloud/auth/signup/" target="_blank" rel="noreferrer">
          tiny.cloud
        </a>
        .
      </div>
    );
  }

  return (
    <div className="lesson-rich-editor relative min-h-[520px] min-w-0 max-w-full">
      {!isReady && !hasLoadError ? (
        <div className="mb-2 rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground" role="status" aria-live="polite">
          {t("courseDetail.editorLoading")}
        </div>
      ) : null}
      {hasLoadError ? (
        <div className="grid min-h-[520px] place-items-center rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <div className="grid justify-items-center gap-3 text-center">
            <p>{t("courseDetail.editorLoadFailed")}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-md"
              onClick={() => {
                setIsReady(false);
                setHasLoadError(false);
                setRetryCount((value) => value + 1);
              }}
            >
              {t("courseDetail.editorRetry")}
            </Button>
          </div>
        </div>
      ) : (
        <Editor
          key={`${isDark ? "dark" : "light"}-${retryCount}`}
          id={`lesson-rich-editor-${editorId}`}
          apiKey={tinymceApiKey}
          value={value}
          onEditorChange={(content, editor) => {
            editorRef.current = editor;
            onChange(content);
          }}
          onBlur={(_event, editor) => {
            const content = editor.getContent();
            editorRef.current = editor;
            onChange(content);
            onBlur();
          }}
          onInit={(_event, editor) => {
            editorRef.current = editor;
            onContentReaderChange?.(() => editor.getContent());
            setIsReady(true);
          }}
          onScriptsLoadError={() => setHasLoadError(true)}
          scriptLoading={{ async: false, defer: true }}
          init={editorInit}
        />
      )}
    </div>
  );
}
