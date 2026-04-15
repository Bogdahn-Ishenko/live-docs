import type { ElementTransformer } from "@lexical/markdown";
import type { LexicalNode } from "lexical";

import {
  $createTablesMwNode,
  $isTablesMwNode,
  TablesMwNode,
} from "@/fsd/shared/ui/editor/nodes/tables-mw-node";
import { parseTablesMwUrl } from "@/fsd/shared/lib/tables-mw/url-utils";

const TABLES_MW_LINE_REGEXP =
  /^https:\/\/tables\.mws\.ru\/(?:workbench\/\S+|fusion\/v1\/datasheets\/\S+)\s?$/;
const TABLES_MW_PLACEHOLDER_REGEXP =
  /^\[\[TABLES_MW:(https:\/\/tables\.mws\.ru\/.+)\]\]\s?$/i;

function extractTablesMwUrl(value: string): string | null {
  const trimmed = value.trim();
  const placeholderMatch = trimmed.match(TABLES_MW_PLACEHOLDER_REGEXP);
  if (placeholderMatch?.[1]) {
    return placeholderMatch[1];
  }
  if (TABLES_MW_LINE_REGEXP.test(trimmed)) {
    return trimmed;
  }
  return null;
}

export const TABLES_MW: ElementTransformer = {
  dependencies: [TablesMwNode],
  export: (node: LexicalNode) => {
    if (!$isTablesMwNode(node)) {
      return null;
    }

    return `[[TABLES_MW:${node.getUrl()}]]`;
  },
  regExp: /^(?:\[\[TABLES_MW:https:\/\/tables\.mws\.ru\/.+\]\]|https:\/\/tables\.mws\.ru\/(?:workbench\/\S+|fusion\/v1\/datasheets\/\S+))\s?$/i,
  replace: (parentNode, _1, match) => {
    const rawUrl = extractTablesMwUrl(match[0]);
    if (!rawUrl) {
      return;
    }
    const parsed = parseTablesMwUrl(rawUrl);
    if (!parsed) {
      return;
    }

    const node = $createTablesMwNode(
      parsed.apiUrl,
      undefined,
      parsed.datasheetId,
      parsed.viewId,
    );
    parentNode.replace(node);
    node.selectNext();
  },
  type: "element",
};
