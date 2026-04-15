'use client';

import { useCallback, useEffect, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $createTextNode, $getSelection, $isRangeSelection, TextNode } from "lexical";
import { $createLinkNode } from "@lexical/link";
import { createPortal } from "react-dom";

import { Command, CommandGroup, CommandItem, CommandList } from "@/fsd/shared/ui/command";
import { useWikiPages } from "@/fsd/shared/hooks/wiki";

// Wiki link trigger match
function findWikiLinkTrigger(text: string): { start: number; query: string } | null {
  // Look for [[ pattern
  const match = text.match(/\[\[([^\]]*)$/);
  if (match) {
    return {
      start: text.lastIndexOf("[["),
      query: match[1],
    };
  }
  return null;
}

export function WikiLinksPlugin() {
  const [editor] = useLexicalComposerContext();
  const { pages, isLoading } = useWikiPages();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [triggerStart, setTriggerStart] = useState(0);
  
  // Filter pages by query
  const filteredPages = pages.filter(page =>
    page.title.toLowerCase().includes(query.toLowerCase()) ||
    page.slug.toLowerCase().includes(query.toLowerCase())
  );
  
  // Check for wiki link trigger
  useEffect(() => {
    const unsubscribe = editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          setIsOpen(false);
          return;
        }
        
        const anchorNode = selection.anchor.getNode();
        if (!anchorNode || !(anchorNode instanceof TextNode)) {
          setIsOpen(false);
          return;
        }
        
        const text = anchorNode.getTextContent();
        const offset = selection.anchor.offset;
        const textBeforeCursor = text.slice(0, offset);
        
        const trigger = findWikiLinkTrigger(textBeforeCursor);
        
        if (trigger) {
          setQuery(trigger.query);
          setTriggerStart(trigger.start);
          
          // Calculate position
          const domSelection = window.getSelection();
          if (domSelection && domSelection.rangeCount > 0) {
            const range = domSelection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            setPosition({
              top: rect.bottom + window.scrollY + 8,
              left: rect.left + window.scrollX,
            });
          }
          
          setIsOpen(true);
        } else {
          setIsOpen(false);
        }
      });
    });
    
    return () => unsubscribe();
  }, [editor]);
  
  // Insert wiki link
  const insertWikiLink = useCallback((page: { slug: string; title: string }) => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      
      const anchorNode = selection.anchor.getNode();
      if (!(anchorNode instanceof TextNode)) return;
      
      const text = anchorNode.getTextContent();
      const offset = selection.anchor.offset;
      
      // Find the trigger
      const textBeforeCursor = text.slice(0, offset);
      const triggerIndex = textBeforeCursor.lastIndexOf("[[");
      
      if (triggerIndex === -1) return;
      
      // Remove the trigger and insert the link
      const beforeTrigger = text.slice(0, triggerIndex);
      const afterCursor = text.slice(offset);
      
      anchorNode.setTextContent(beforeTrigger);
      
      // Create link node with wiki URL
      const linkNode = $createLinkNode(`/wiki/${page.slug}`);
      const linkText = $createTextNode(page.title);
      linkNode.append(linkText);
      
      anchorNode.insertAfter(linkNode);
      
      if (afterCursor) {
        const afterNode = $createTextNode(afterCursor);
        linkNode.insertAfter(afterNode);
      }
      
      // Move cursor after the link
      linkNode.selectEnd();
    });
    
    setIsOpen(false);
  }, [editor]);
  
  // Create new page
  const createNewPage = useCallback(() => {
    if (!query.trim()) return;
    
    const slug = query.toLowerCase().replace(/\s+/g, "-");
    
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      
      const anchorNode = selection.anchor.getNode();
      if (!(anchorNode instanceof TextNode)) return;
      
      const text = anchorNode.getTextContent();
      const offset = selection.anchor.offset;
      
      const textBeforeCursor = text.slice(0, offset);
      const triggerIndex = textBeforeCursor.lastIndexOf("[[");
      
      if (triggerIndex === -1) return;
      
      const beforeTrigger = text.slice(0, triggerIndex);
      const afterCursor = text.slice(offset);
      
      anchorNode.setTextContent(beforeTrigger);
      
      // Create link node for new page
      const linkNode = $createLinkNode(`/wiki/${slug}`);
      const linkText = $createTextNode(query);
      linkNode.append(linkText);
      
      anchorNode.insertAfter(linkNode);
      
      if (afterCursor) {
        const afterNode = $createTextNode(afterCursor);
        linkNode.insertAfter(afterNode);
      }
      
      linkNode.selectEnd();
    });
    
    setIsOpen(false);
    
    // Open new page in new tab
    window.open(`/wiki/${slug}?edit=true`, '_blank');
  }, [editor, query]);
  
  if (!isOpen) return null;
  
  return createPortal(
    <div
      className="absolute z-50"
      style={{ top: position.top, left: position.left }}
    >
      <Command className="w-64 rounded-lg border shadow-md bg-popover">
        <CommandList>
          <CommandGroup heading="Страницы">
            {isLoading ? (
              <CommandItem disabled>Загрузка...</CommandItem>
            ) : filteredPages.length === 0 ? (
              <CommandItem disabled>Ничего не найдено</CommandItem>
            ) : (
              filteredPages.slice(0, 5).map((page) => (
                <CommandItem
                  key={page.recordId}
                  onSelect={() => insertWikiLink(page)}
                  className="cursor-pointer"
                >
                  <span className="flex-1">{page.title}</span>
                  <span className="text-xs text-muted-foreground">/{page.slug}</span>
                </CommandItem>
              ))
            )}
          </CommandGroup>
          {query && (
            <CommandGroup>
              <CommandItem onSelect={createNewPage} className="cursor-pointer text-primary">
                Создать страницу &quot;{query}&quot;
              </CommandItem>
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </div>,
    document.body
  );
}
