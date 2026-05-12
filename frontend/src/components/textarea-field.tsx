import * as React from "react";
import { cn } from "@/lib/utils";

const TextareaField = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      data-slot="textarea"
      className={cn(
        "min-h-[120px] w-full resize-y rounded-xl border border-input bg-transparent px-3 py-2.5 text-sm shadow-sm transition-[color,box-shadow,border-color] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/20",
        className
      )}
      {...props}
    />
  )
);
TextareaField.displayName = "TextareaField";

export { TextareaField };
