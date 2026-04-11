'use client'
import { useEffect } from "react";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createParagraphNode,
  $createTextNode,
  COMMAND_PRIORITY_HIGH,
  PASTE_COMMAND,
} from "lexical";

import { $insertTablesMwNode } from "@/fsd/shared/ui/editor/nodes/tables-mw-node";

const TABLES_MW_URL_REGEX =
  /^https:\/\/tables\.mws\.ru\/fusion\/v1\/datasheets\/([^\/]+)\/records/;

export function TablesMwPastePlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      PASTE_COMMAND,
      (event: ClipboardEvent) => {
        const clipboardData = event.clipboardData;
        if (!clipboardData) return false;

        // Get pasted text
        const pastedText = clipboardData.getData("text/plain");
        if (!pastedText) return false;

        // Check if it's a tables.mws.ru URL
        const trimmedText = pastedText.trim();
        if (!TABLES_MW_URL_REGEX.test(trimmedText)) {
          return false; // Not our URL, let other handlers process it
        }

        // Prevent default paste behavior
        event.preventDefault();
        event.stopPropagation();

        // Insert TablesMwNode
        editor.update(() => {
          $insertTablesMwNode(trimmedText);
        });

        return true; // Handled
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor]);

  return null;
}
