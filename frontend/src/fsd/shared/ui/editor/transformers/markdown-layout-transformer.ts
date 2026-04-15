import type { ElementTransformer } from "@lexical/markdown";
import type { LexicalNode } from "lexical";

import {
  $isLayoutContainerNode,
  LayoutContainerNode,
} from "@/fsd/shared/ui/editor/nodes/layout-container-node";
import {
  $isLayoutItemNode,
  LayoutItemNode,
} from "@/fsd/shared/ui/editor/nodes/layout-item-node";

export const LAYOUT_CONTAINER: ElementTransformer = {
  dependencies: [LayoutContainerNode],
  export: (node: LexicalNode) => {
    if (!$isLayoutContainerNode(node)) {
      return null;
    }
    return "## Колонки";
  },
  regExp: /^##\s+Колонки\s*$/i,
  replace: () => {},
  type: "element",
};

export const LAYOUT_ITEM: ElementTransformer = {
  dependencies: [LayoutItemNode],
  export: (node: LexicalNode) => {
    if (!$isLayoutItemNode(node)) {
      return null;
    }
    const index = node.getIndexWithinParent() + 1;
    return `### Колонка ${index}`;
  },
  regExp: /^###\s+Колонка(?:\s+\d+)?\s*$/i,
  replace: () => {},
  type: "element",
};
