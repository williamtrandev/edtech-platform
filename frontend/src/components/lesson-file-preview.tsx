import { ExternalLink, FileText, ImageIcon, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { filePreviewService } from "../services/file-preview.service";

type PreviewType = "image" | "pdf" | "text" | "video" | "link";

type LessonFilePreviewProps = {
  url: string;
  kind: "resource" | "video";
  fileName?: string;
  mimeType?: string;
  title?: string;
  description?: string;
  openLabel?: string;
  unavailableLabel?: string;
  loadingLabel?: string;
  loadFailedLabel?: string;
  emptyLabel?: string;
};

function getPreviewType(url: string, kind: "resource" | "video", fileName?: string, mimeType?: string): PreviewType {
  const cleanUrl = url.split("?")[0]?.toLowerCase() ?? "";
  const cleanName = fileName?.toLowerCase() ?? "";
  const candidate = `${cleanName} ${cleanUrl}`;
  const cleanMimeType = mimeType?.toLowerCase() ?? "";

  if (kind === "video" || cleanMimeType.startsWith("video/")) {
    return "video";
  }

  if (cleanMimeType.startsWith("image/") || /\.(png|jpe?g|gif|webp|avif|svg)\b/u.test(candidate)) {
    return "image";
  }

  if (cleanMimeType === "application/pdf" || /\.pdf\b/u.test(candidate)) {
    return "pdf";
  }

  if (
    cleanMimeType.startsWith("text/") ||
    cleanMimeType === "application/json" ||
    /\.(md|markdown|txt|csv|json)\b/u.test(candidate)
  ) {
    return "text";
  }

  return "link";
}

export function LessonFilePreview({
  url,
  kind,
  fileName,
  mimeType,
  title,
  description,
  openLabel,
  unavailableLabel,
  loadingLabel,
  loadFailedLabel,
  emptyLabel
}: LessonFilePreviewProps) {
  const normalizedUrl = url.trim();
  const previewType = useMemo(() => getPreviewType(normalizedUrl, kind, fileName, mimeType), [fileName, kind, mimeType, normalizedUrl]);
  const [textContent, setTextContent] = useState("");
  const [textStatus, setTextStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  useEffect(() => {
    if (!normalizedUrl || previewType !== "text") {
      setTextContent("");
      setTextStatus("idle");
      return;
    }

    const controller = new AbortController();
    setTextStatus("loading");

    filePreviewService
      .getTextPreview(normalizedUrl, controller.signal)
      .then((content) => {
        setTextContent(content);
        setTextStatus("success");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setTextContent("");
        setTextStatus("error");
      });

    return () => controller.abort();
  }, [normalizedUrl, previewType]);

  if (!normalizedUrl) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border/70 bg-background">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-3 py-2.5">
        <div className="min-w-0">
          {title ? <p className="text-sm font-medium text-foreground">{title}</p> : null}
          {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {openLabel ? (
          <a
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border/70 px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/60"
            href={normalizedUrl}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink className="size-3.5" aria-hidden />
            {openLabel}
          </a>
        ) : null}
      </div>

      {previewType === "video" ? <video className="aspect-video w-full bg-black" controls src={normalizedUrl} /> : null}

      {previewType === "image" ? (
        <div className="grid max-h-96 place-items-center bg-muted/20 p-3">
          <img className="max-h-80 max-w-full rounded-md object-contain" src={normalizedUrl} alt="" />
        </div>
      ) : null}

      {previewType === "pdf" ? <iframe className="h-96 w-full bg-muted/20" src={normalizedUrl} title={title} /> : null}

      {previewType === "text" ? (
        <div className="max-h-96 overflow-auto bg-muted/20 p-4">
          {textStatus === "loading" ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {loadingLabel}
            </div>
          ) : null}
          {textStatus === "error" ? <p className="text-sm text-muted-foreground">{loadFailedLabel}</p> : null}
          {textStatus === "success" && textContent.trim() ? (
            <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-6 text-foreground">{textContent}</pre>
          ) : null}
          {textStatus === "success" && !textContent.trim() ? <p className="text-sm text-muted-foreground">{emptyLabel}</p> : null}
        </div>
      ) : null}

      {previewType === "link" ? (
        <div className="flex items-start gap-3 bg-muted/20 p-4 text-sm text-muted-foreground">
          <span className="grid size-9 shrink-0 place-items-center rounded-md border border-border/70 bg-background">
            {kind === "resource" ? <FileText className="size-4" aria-hidden /> : <ImageIcon className="size-4" aria-hidden />}
          </span>
          <p className="min-w-0 flex-1 break-words">{unavailableLabel}</p>
        </div>
      ) : null}
    </div>
  );
}
