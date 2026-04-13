"use client";

import type { SerializedEditorState } from "lexical";
import dynamic from "next/dynamic";

import { BlockViewerProvider } from "@/fsd/app/providers/block-viewer-provider";
import { BlockViewerToolbar } from "@/fsd/app/providers/block-viewer-toolbar";
import { useLocalStorage } from "@/fsd/shared/hooks/use-local-storage";
import { useSearchParams } from "@/fsd/shared/hooks/use-search-params";
import { CommentThreadLauncher } from "@/fsd/shared/ui/comment-thread-launcher";
import { SidebarProvider } from "@/fsd/shared/ui/sidebar";

const EDITOR_STATE_KEY = "live-docs-editor-state";

const Editor = dynamic(
  () => import("@/fsd/shared/ui/blocks/editor-x").then((mod) => mod.Editor),
  { ssr: false },
);

function GeneratedCodeViewer() {
  return <div>markdown</div>;
}

function EditorWithPersistence() {
  const [savedState, setSavedState] = useLocalStorage<
    SerializedEditorState | undefined
  >(EDITOR_STATE_KEY, undefined);

  return (
    <Editor
      editorSerializedState={savedState}
      onSerializedChange={setSavedState}
    />
  );
}

export default function WorkbenchPage() {
  const [params] = useSearchParams({ view: "preview" });
  const view = params.view as "preview" | "code";

  return (
    <BlockViewerProvider>
      <SidebarProvider
        defaultOpen={true}
        className="bg-background text-foreground"
      >
        <div className="flex h-svh w-full flex-col gap-2 overflow-hidden py-2 pr-1">
          <BlockViewerToolbar />
          {view === "preview" ? (
            <CommentThreadLauncher storageKey="workbench">
              <EditorWithPersistence />
            </CommentThreadLauncher>
          ) : (
            <GeneratedCodeViewer />
          )}
        </div>
      </SidebarProvider>
    </BlockViewerProvider>
  );
}
