import { ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toMediaUrl } from "../lib/media-url";

type CourseCoverFrameProps = {
  src?: string | null;
  alt?: string;
  className?: string;
  emptyLabel: string;
};

export function CourseCoverFrame({ src, alt = "", className, emptyLabel }: CourseCoverFrameProps) {
  return (
    <div className={cn("flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg border border-border/70 bg-muted/20", className)}>
      {src ? (
        <img src={toMediaUrl(src)} alt={alt} className="size-full object-cover" />
      ) : (
        <div className="grid place-items-center gap-2 text-center text-muted-foreground">
          <ImagePlus className="mx-auto size-6" aria-hidden />
          <span className="text-xs font-medium">{emptyLabel}</span>
        </div>
      )}
    </div>
  );
}
