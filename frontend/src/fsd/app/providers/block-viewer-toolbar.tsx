import { Check, Terminal } from "lucide-react";

import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { useSearchParams } from "@/hooks/use-search-params";

import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";

export function BlockViewerToolbar() {
  const item = {
    name: "@shadcn-editor/editor-x",
    description:
      "A rich text editor built on Lexical with plugins, nodes, extensions, and toolbar support.",
  };
  const { copyToClipboard, isCopied } = useCopyToClipboard();
  const [params, setParams] = useSearchParams({ view: "preview" });
  const view = params.view as "preview" | "code";

  return (
    <div className="flex w-full shrink-0 overflow-x-auto items-center gap-2">
      <Tabs value={view} onValueChange={(value) => setParams({ view: value })}>
        <TabsList className="grid h-8! grid-cols-2 items-center rounded-lg p-1 *:data-[slot=tabs-trigger]:h-6 *:data-[slot=tabs-trigger]:rounded-sm *:data-[slot=tabs-trigger]:px-2 *:data-[slot=tabs-trigger]:text-xs">
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="code">Code</TabsTrigger>
        </TabsList>
      </Tabs>
      <Separator
        orientation="vertical"
        className="mx-2 h-5! mt-1.5 hidden xl:block"
      />
      <span className="flex-1 text-left text-sm font-medium hidden xl:block">
        {item.description?.replace(/\.$/, "")}
      </span>
      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="outline"
          className="w-fit gap-1 px-2 shadow-none"
          size="sm"
          onClick={() => {
            copyToClipboard(`npx shadcn@latest add ${item.name}`);
          }}
        >
          {isCopied ? <Check /> : <Terminal />}
          <span>npx shadcn add {item.name}</span>
        </Button>
      </div>
    </div>
  );
}
