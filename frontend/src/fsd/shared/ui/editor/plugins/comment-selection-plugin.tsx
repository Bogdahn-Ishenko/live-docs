'use client';

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getSelection, $isRangeSelection } from "lexical";
import { MessageSquarePlus } from "lucide-react";

import { Button } from "@/fsd/shared/ui/button";
import type { WikiComment } from "@/fsd/shared/lib/wiki/comments";

interface CommentSelectionPluginProps {
  onAddComment: (selectedText: string, selection: WikiComment['selection']) => void;
}

export function CommentSelectionPlugin({ onAddComment }: CommentSelectionPluginProps) {
  const [editor] = useLexicalComposerContext();
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState("");
  const [selectionData, setSelectionData] = useState<WikiComment['selection'] | null>(null);
  
  useEffect(() => {
    const handleSelectionChange = () => {
      editor.getEditorState().read(() => {
        const selection = $getSelection();
        
        if (!$isRangeSelection(selection) || selection.isCollapsed()) {
          setIsVisible(false);
          return;
        }
        
        const text = selection.getTextContent().trim();
        if (!text || text.length < 2) {
          setIsVisible(false);
          return;
        }
        
        // Get DOM selection for positioning
        const domSelection = window.getSelection();
        if (!domSelection || domSelection.rangeCount === 0) {
          setIsVisible(false);
          return;
        }
        
        const range = domSelection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        setPosition({
          top: rect.bottom + window.scrollY + 8,
          left: rect.left + window.scrollX + rect.width / 2 - 60,
        });
        
        setSelectedText(text);
        setSelectionData({
          anchorKey: selection.anchor.key,
          anchorOffset: selection.anchor.offset,
          focusKey: selection.focus.key,
          focusOffset: selection.focus.offset,
          selectedText: text,
        });
        
        setIsVisible(true);
      });
    };
    
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [editor]);
  
  const handleClick = useCallback(() => {
    if (selectionData) {
      onAddComment(selectedText, selectionData);
      setIsVisible(false);
      
      // Clear selection
      window.getSelection()?.removeAllRanges();
    }
  }, [onAddComment, selectedText, selectionData]);
  
  if (!isVisible) return null;
  
  return createPortal(
    <div
      className="absolute z-50 bg-popover border rounded-lg shadow-lg p-2 flex items-center gap-2"
      style={{ top: position.top, left: position.left }}
    >
      <Button 
        size="sm" 
        className="h-8 gap-1"
        onClick={handleClick}
      >
        <MessageSquarePlus className="size-4" />
        Комментировать
      </Button>
    </div>,
    document.body
  );
}
