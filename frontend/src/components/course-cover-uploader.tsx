import { ImagePlus, Loader2, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toMediaUrl } from "../lib/media-url";

type CourseCoverUploaderProps = {
  id: string;
  value?: string | null;
  isUploading?: boolean;
  disabled?: boolean;
  error?: string;
  replaceLabel: string;
  removeLabel: string;
  uploadingLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  onFileChange: (file?: File) => void;
  onRemove?: () => void;
};

export function CourseCoverUploader({
  id,
  value,
  isUploading = false,
  disabled = false,
  error,
  replaceLabel,
  removeLabel,
  uploadingLabel,
  emptyTitle,
  emptyDescription,
  onFileChange,
  onRemove
}: CourseCoverUploaderProps) {
  const inputId = `${id}-input`;

  return (
    <div className="grid gap-2">
      <div className="group relative overflow-hidden rounded-lg border border-border/70 bg-muted/20">
        {value ? (
          <div className="aspect-video w-full">
            <img src={toMediaUrl(value)} alt="" className="size-full object-cover" />
          </div>
        ) : (
          <label
            htmlFor={inputId}
            className={cn(
              "grid aspect-video cursor-pointer place-items-center px-4 text-center transition-colors hover:bg-muted/40",
              disabled ? "pointer-events-none opacity-60" : undefined
            )}
          >
            <span className="grid justify-items-center gap-2">
              <span className="grid size-11 place-items-center rounded-full border border-border/70 bg-background">
                <ImagePlus className="size-5 text-muted-foreground" aria-hidden />
              </span>
              <span className="text-sm font-medium text-foreground">{emptyTitle}</span>
              <span className="max-w-72 text-xs leading-5 text-muted-foreground">{emptyDescription}</span>
            </span>
          </label>
        )}

        {value ? (
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-md border border-border/70 bg-background/95 p-1 shadow-sm backdrop-blur">
            <label
              htmlFor={inputId}
              className={cn(
                "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                disabled ? "pointer-events-none opacity-60" : undefined
              )}
              aria-label={replaceLabel}
              title={replaceLabel}
            >
              <UploadCloud className="size-4" aria-hidden />
              <span className="hidden sm:inline">{replaceLabel}</span>
            </label>
            {onRemove ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 rounded-md px-2 text-xs font-medium text-foreground hover:bg-accent hover:text-destructive"
                disabled={disabled}
                aria-label={removeLabel}
                title={removeLabel}
                onClick={onRemove}
              >
                <X className="size-4" aria-hidden />
                <span className="hidden sm:ml-1.5 sm:inline">{removeLabel}</span>
              </Button>
            ) : null}
          </div>
        ) : null}

        {isUploading ? (
          <div className="absolute inset-0 grid place-items-center bg-background/78 text-sm font-medium text-foreground backdrop-blur-sm">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {uploadingLabel}
            </span>
          </div>
        ) : null}
      </div>

      <input
        id={inputId}
        className="sr-only"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        disabled={disabled}
        onChange={(event) => {
          onFileChange(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
    </div>
  );
}
