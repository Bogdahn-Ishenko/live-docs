'use client'
import { BlockViewerProvider, useBlockViewer } from "@/fsd/app/providers/block-viewer-provider";
import { BlockViewerSidebar } from "@/fsd/app/providers/block-viewer-sidebar";
import { BlockViewerToolbar } from "@/fsd/app/providers/block-viewer-toolbar";
import { CodeViewer } from "@/fsd/app/providers/code-viewer";
import { useSearchParams } from "@/fsd/shared/hooks/use-search-params";
import { generateEditorCode } from "@/fsd/shared/lib/generate-editor-code";
import { Editor } from "@/fsd/shared/ui/blocks/editor-x";
import { SidebarInset, SidebarProvider } from "@/fsd/shared/ui/sidebar";
import { useMemo } from "react";

function GeneratedCodeViewer() {
  // const state = useBlockViewer();
  // const code = useMemo(() => generateEditorCode(state), [state]);
  // return <CodeViewer code={code} filename="editor-x.tsx" />;
  return <div>markdown</div>
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
        {/* <BlockViewerSidebar /> */}
        {/* <SidebarInset> */}
          {/* <div className="flex flex-col gap-2 min-h-svh py-2 pr-1 md:w-[calc(100vw-260px)]"> */}
          <div className="flex flex-col gap-2 min-h-svh py-2 pr-1 w-full">
            <BlockViewerToolbar />
            {view === "preview" ? (
              <Editor />
            ) : (
              <GeneratedCodeViewer />
            )}
          </div>
        {/* </SidebarInset> */}
      </SidebarProvider>
    </BlockViewerProvider>
  );
}
