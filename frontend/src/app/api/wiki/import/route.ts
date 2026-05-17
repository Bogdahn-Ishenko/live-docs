import { type NextRequest, NextResponse } from "next/server";

import { CodeNode } from "@lexical/code";
import { HorizontalRuleNode } from "@lexical/extension";
import { createHeadlessEditor } from "@lexical/headless";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { $convertFromMarkdownString } from "@lexical/markdown";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";
import type { SerializedEditorState } from "lexical";

import {
  getWikiBackendBaseUrl,
  getWikiWriteAuthHeader,
} from "@/app/api/wiki/_lib/backend-config";
import { MARKDOWN_IMPORT_TRANSFORMERS } from "@/fsd/shared/ui/editor/transformers/markdown-import-transformers";
import { parseTablesMwUrl } from "@/fsd/shared/lib/tables-mw/url-utils";

export const runtime = "nodejs";

const IMPORT_API_URL = `${getWikiBackendBaseUrl()}/api/pages/import`;

type BackendImportPayload = {
  sourceFormat?: string;
  suggestedTitle?: string;
  markdown?: string;
  originalFileName?: string;
  importWarning?: string;
};

type SerializedTextNode = {
  detail: number;
  format: number;
  mode: "normal";
  style: string;
  text: string;
  type: "text";
  version: 1;
};

type SerializedParagraphNode = {
  children: SerializedTextNode[];
  direction: null;
  format: "";
  indent: 0;
  type: "paragraph";
  version: 1;
};

type RootWithChildren = {
  children: Array<Record<string, unknown>>;
} & Record<string, unknown>;

const TABLES_MW_URL_REGEXP =
  /^https:\/\/tables\.mws\.ru\/(?:workbench\/\S+|fusion\/v1\/datasheets\/\S+)$/;

function buildPlainTextEditorState(value: string): SerializedEditorState {
  const normalized = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  const children: SerializedParagraphNode[] =
    lines.length > 0
      ? lines.map((line) => ({
          children: line
            ? [
                {
                  detail: 0,
                  format: 0,
                  mode: "normal",
                  style: "",
                  text: line,
                  type: "text",
                  version: 1,
                },
              ]
            : [],
          direction: null,
          format: "",
          indent: 0,
          type: "paragraph",
          version: 1,
        }))
      : [
          {
            children: [],
            direction: null,
            format: "",
            indent: 0,
            type: "paragraph",
            version: 1,
          },
        ];

  return {
    root: {
      children,
      direction: null,
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  } as SerializedEditorState;
}

function markdownToEditorState(markdown: string): SerializedEditorState {
  if (!markdown.trim()) {
    return buildPlainTextEditorState("");
  }

  const editor = createHeadlessEditor({
    namespace: "wiki-import",
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      CodeNode,
      LinkNode,
      AutoLinkNode,
      TableNode,
      TableRowNode,
      TableCellNode,
      HorizontalRuleNode,
    ],
  });

  let nextState: SerializedEditorState | null = null;
  editor.update(
    () => {
      $convertFromMarkdownString(markdown, MARKDOWN_IMPORT_TRANSFORMERS, undefined, true);
      nextState = editor.getEditorState().toJSON();
    },
    {
      discrete: true,
    },
  );

  return nextState ?? buildPlainTextEditorState(markdown);
}

function toTablesMwSerializedNode(url: string): Record<string, unknown> | null {
  const parsed = parseTablesMwUrl(url);
  if (!parsed) {
    return null;
  }

  return {
    type: "tables-mw",
    url: parsed.apiUrl,
    datasheetId: parsed.datasheetId,
    viewId: parsed.viewId,
    version: 1,
  };
}

function mapTablesLinksToNodes(
  state: SerializedEditorState,
): SerializedEditorState {
  const root = state.root as RootWithChildren | undefined;
  if (
    !root ||
    typeof root !== "object" ||
    !("children" in root) ||
    !Array.isArray(root.children)
  ) {
    return state;
  }

  const children = root.children.map((child) => {
    if (
      child?.type !== "paragraph" ||
      !("children" in child) ||
      !Array.isArray(child.children) ||
      child.children.length !== 1
    ) {
      return child;
    }

    const first = child.children[0] as Record<string, unknown>;
    if (first?.type !== "text" || typeof first.text !== "string") {
      return child;
    }

    const maybeUrl = first.text.trim();
    if (!TABLES_MW_URL_REGEXP.test(maybeUrl)) {
      return child;
    }

    return (toTablesMwSerializedNode(maybeUrl) ?? child) as Record<
      string,
      unknown
    >;
  }) as unknown as SerializedEditorState["root"]["children"];

  return {
    ...state,
    root: {
      ...root,
      children,
    } as SerializedEditorState["root"],
  };
}

export async function POST(request: NextRequest) {
  try {
    const writeAuthHeader = getWikiWriteAuthHeader();
    if (!writeAuthHeader) {
      return NextResponse.json(
        {
          error: "На сервере не настроены учетные данные для записи",
        },
        { status: 500 },
      );
    }

    const incoming = await request.formData();
    const file = incoming.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error: "Файл не передан",
        },
        { status: 400 },
      );
    }

    const backendForm = new FormData();
    backendForm.set("file", file, file.name);

    const response = await fetch(IMPORT_API_URL, {
      method: "POST",
      headers: {
        Authorization: writeAuthHeader,
      },
      body: backendForm,
    });

    const payload = (await response.json().catch(() => null)) as
      | BackendImportPayload
      | { error?: string }
      | null;

    if (!response.ok) {
      return NextResponse.json(
        payload ?? {
          error: "Не удалось импортировать файл",
        },
        { status: response.status },
      );
    }

    const imported: BackendImportPayload =
      payload && typeof payload === "object"
        ? (payload as BackendImportPayload)
        : {};
    const markdown = typeof imported.markdown === "string" ? imported.markdown : "";

    let editorState: SerializedEditorState;
    try {
      editorState = markdownToEditorState(markdown);
    } catch {
      editorState = buildPlainTextEditorState(markdown);
    }
    editorState = mapTablesLinksToNodes(editorState);

    return NextResponse.json({
      sourceFormat:
        typeof imported.sourceFormat === "string"
          ? imported.sourceFormat
          : "markdown",
      suggestedTitle:
        typeof imported.suggestedTitle === "string"
          ? imported.suggestedTitle
          : "Imported document",
      originalFileName:
        typeof imported.originalFileName === "string"
          ? imported.originalFileName
          : file.name,
      markdown,
      importWarning:
        typeof imported.importWarning === "string"
          ? imported.importWarning
          : null,
      content: JSON.stringify(editorState),
    });
  } catch (error) {
    console.error("Wiki import failed:", error);
    const details =
      error instanceof Error ? error.message : "Unknown upstream error";
    return NextResponse.json(
      {
        error: "Не удалось импортировать файл: backend недоступен",
        details,
        backendUrl: getWikiBackendBaseUrl(),
      },
      { status: 502 },
    );
  }
}
