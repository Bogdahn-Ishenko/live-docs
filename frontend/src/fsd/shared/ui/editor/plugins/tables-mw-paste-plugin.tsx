'use client'
import { useEffect } from "react";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  COMMAND_PRIORITY_HIGH,
  PASTE_COMMAND,
} from "lexical";

import { $insertTablesMwNode } from "@/fsd/shared/ui/editor/nodes/tables-mw-node";
import { isTablesMwUrl, parseTablesMwUrl } from "@/fsd/shared/lib/tables-mw/url-utils";

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
        if (!isTablesMwUrl(trimmedText)) {
          return false; // Not our URL, let other handlers process it
        }

        // Parse URL to extract datasheetId and viewId
        const parsed = parseTablesMwUrl(trimmedText);
        if (!parsed) return false;

        // Prevent default paste behavior
        event.preventDefault();
        event.stopPropagation();

        // Insert TablesMwNode with parsed IDs and converted API URL
        editor.update(() => {
          $insertTablesMwNode(
            parsed.apiUrl,
            undefined, // spaceId
            parsed.datasheetId,
            parsed.viewId
          );
        });

        return true; // Handled
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor]);

  return null;
}
