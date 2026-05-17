import { CheckCircle2, Link2, Loader2, UploadCloud, type LucideIcon } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { LessonFilePreview } from "./lesson-file-preview";

type LessonUploadFieldProps = {
  id: string;
  accept: string;
  disabled?: boolean;
  isUploading?: boolean;
  uploadedFileName?: string;
  title: string;
  description: string;
  chooseLabel: string;
  uploadingLabel: string;
  urlLabel: string;
  urlPlaceholder: string;
  previewUrl?: string;
  previewKind?: "resource" | "video";
  previewFileName?: string;
  previewMimeType?: string;
  previewTitle?: string;
  previewDescription?: string;
  openPreviewLabel?: string;
  previewUnavailableLabel?: string;
  previewLoadingLabel?: string;
  previewLoadFailedLabel?: string;
  previewEmptyLabel?: string;
  Icon: LucideIcon;
  onFileChange: (file?: File) => void;
  onUrlChange?: () => void;
  urlInputProps: InputHTMLAttributes<HTMLInputElement>;
};

export function LessonUploadField({
  id,
  accept,
  disabled = false,
  isUploading = false,
  uploadedFileName,
  title,
  description,
  chooseLabel,
  uploadingLabel,
  urlLabel,
  urlPlaceholder,
  previewUrl,
  previewKind = "resource",
  previewFileName,
  previewMimeType,
  previewTitle,
  previewDescription,
  openPreviewLabel,
  previewUnavailableLabel,
  previewLoadingLabel,
  previewLoadFailedLabel,
  previewEmptyLabel,
  Icon,
  onFileChange,
  onUrlChange,
  urlInputProps
}: LessonUploadFieldProps) {
  const fileInputId = `${id}-file`;
  const isDisabled = disabled || isUploading;
  const normalizedPreviewUrl = previewUrl?.trim();

  return (
    <div className="grid gap-3">
      <label
        htmlFor={fileInputId}
        className={cn(
          "group grid cursor-pointer gap-3 rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-4 transition-colors hover:border-foreground/60 hover:bg-muted/40",
          isDisabled ? "pointer-events-none opacity-60" : undefined
        )}
        onDragOver={(event) => {
          if (!isDisabled) {
            event.preventDefault();
          }
        }}
        onDrop={(event) => {
          if (isDisabled) {
            return;
          }

          event.preventDefault();
          onFileChange(event.dataTransfer.files?.[0]);
        }}
      >
        <span className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-md border border-border/70 bg-background text-muted-foreground transition-colors group-hover:text-foreground">
            {isUploading ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Icon className="size-5" aria-hidden />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-foreground">{isUploading ? uploadingLabel : title}</span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
            {uploadedFileName ? (
              <span className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-md border border-border/70 bg-background px-2 py-1 text-xs font-medium text-foreground">
                <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" aria-hidden />
                <span className="truncate">{uploadedFileName}</span>
              </span>
            ) : null}
          </span>
          <span className="hidden h-8 shrink-0 items-center rounded-md border border-border/70 bg-background px-2.5 text-xs font-medium text-foreground sm:inline-flex">
            <UploadCloud className="mr-1.5 size-3.5" aria-hidden />
            {chooseLabel}
          </span>
        </span>
      </label>

      <input
        id={fileInputId}
        className="sr-only"
        type="file"
        accept={accept}
        disabled={isDisabled}
        onChange={(event) => {
          onFileChange(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      <div className="grid gap-2">
        <label htmlFor={id} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Link2 className="size-3.5" aria-hidden />
          {urlLabel}
        </label>
        <Input
          id={id}
          placeholder={urlPlaceholder}
          disabled={disabled}
          {...urlInputProps}
          onChange={(event) => {
            onUrlChange?.();
            urlInputProps.onChange?.(event);
          }}
        />
      </div>

      {normalizedPreviewUrl ? (
        <LessonFilePreview
          url={normalizedPreviewUrl}
          kind={previewKind}
          fileName={previewFileName}
          mimeType={previewMimeType}
          title={previewTitle}
          description={previewDescription}
          openLabel={openPreviewLabel}
          unavailableLabel={previewUnavailableLabel}
          loadingLabel={previewLoadingLabel}
          loadFailedLabel={previewLoadFailedLabel}
          emptyLabel={previewEmptyLabel}
        />
      ) : null}
    </div>
  );
}
