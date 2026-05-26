import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { STUDIO_EDITOR_PANEL, STUDIO_LIST_STICKY, STUDIO_WORKSPACE_GRID } from "../lib/studio-layout";

type StudioWorkspaceProps = {
  list: ReactNode;
  editor: ReactNode;
  className?: string;
  listClassName?: string;
  editorClassName?: string;
};

export function StudioWorkspace({ list, editor, className, listClassName, editorClassName }: StudioWorkspaceProps) {
  return (
    <section className={cn(STUDIO_WORKSPACE_GRID, className)}>
      <div className={cn(STUDIO_LIST_STICKY, listClassName)}>{list}</div>
      <div className={cn(STUDIO_EDITOR_PANEL, editorClassName)}>{editor}</div>
    </section>
  );
}
