import { useEffect, useState } from "react";

import { Check, Copy } from "lucide-react";

import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { highlightCode } from "@/lib/highlight-code";

import { Button } from "./ui/button";

interface CodeViewerProps {
  code: string;
  language?: string;
  filename?: string;
}

export function CodeViewer({
  code,
  language = "tsx",
  filename,
}: CodeViewerProps) {
  const [html, setHtml] = useState<string>("");
  const { copyToClipboard, isCopied } = useCopyToClipboard();

  useEffect(() => {
    let cancelled = false;
    highlightCode(code, language).then((result) => {
      if (!cancelled) {
        setHtml(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [code, language]);

  return (
    <figure
      data-rehype-pretty-code-figure=""
      className="overflow-hidden rounded-xl border bg-code text-code-foreground flex flex-col h-[calc(100vh-60px)] min-h-72"
    >
      <figcaption className="flex h-12 shrink-0 items-center gap-2 border-b px-4 py-2 text-code-foreground [&_svg]:size-4 [&_svg]:text-code-foreground [&_svg]:opacity-70">
        <span className="text-sm font-medium">
          {filename ?? `index.${language}`}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => copyToClipboard(code)}
          >
            {isCopied ? <Check /> : <Copy />}
          </Button>
        </div>
      </figcaption>
      <div
        // biome-ignore lint/security/noDangerouslySetInnerHtml: shiki output is trusted
        dangerouslySetInnerHTML={{ __html: html }}
        className="no-scrollbar overflow-y-auto flex-1 text-[13px]"
      />
    </figure>
  );
}
