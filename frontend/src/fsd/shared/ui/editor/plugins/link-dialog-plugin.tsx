'use client';

import { useState, useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $createLinkNode } from "@lexical/link";
import { $createTextNode, $getSelection, $isRangeSelection } from "lexical";
import { $insertNodeToNearestRoot } from "@lexical/utils";
import { Link, ExternalLink, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/fsd/shared/ui/dialog";
import { Button } from "@/fsd/shared/ui/button";
import { Input } from "@/fsd/shared/ui/input";
import { Label } from "@/fsd/shared/ui/label";
import { Switch } from "@/fsd/shared/ui/switch";

interface LinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialText?: string;
  initialUrl?: string;
}

export function LinkDialog({ isOpen, onClose, initialText = '', initialUrl = '' }: LinkDialogProps) {
  const [editor] = useLexicalComposerContext();
  const [text, setText] = useState(initialText);
  const [url, setUrl] = useState(initialUrl);
  const [openInNewTab, setOpenInNewTab] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setText(initialText);
      setUrl(initialUrl);
      setIsEditing(!!initialUrl);
    }
  }, [isOpen, initialText, initialUrl]);

  const handleSave = () => {
    if (!url) return;

    editor.update(() => {
      const selection = $getSelection();
      
      // Create link node
      const linkNode = $createLinkNode(url, {
        target: openInNewTab ? '_blank' : undefined,
        rel: openInNewTab ? 'noopener noreferrer' : undefined,
      });

      // Add text to link
      const textNode = $createTextNode(text || url);
      linkNode.append(textNode);

      // If there's a selection, replace it; otherwise insert at cursor
      if ($isRangeSelection(selection)) {
        selection.insertNodes([linkNode]);
      } else {
        // Insert at nearest root
        $insertNodeToNearestRoot(linkNode);
      }
    });

    handleClose();
  };

  const handleRemove = () => {
    // In real implementation, remove the link
    handleClose();
  };

  const handleClose = () => {
    setText('');
    setUrl('');
    setOpenInNewTab(true);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="size-5" />
            {isEditing ? 'Редактировать ссылку' : 'Вставить ссылку'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="link-text">Текст</Label>
            <Input
              id="link-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Текст ссылки"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="link-url">Ссылка</Label>
            <Input
              id="link-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              type="url"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="new-tab" className="flex items-center gap-2 cursor-pointer">
              <ExternalLink className="size-4 text-muted-foreground" />
              Открывать в новой вкладке
            </Label>
            <Switch
              id="new-tab"
              checked={openInNewTab}
              onCheckedChange={setOpenInNewTab}
            />
          </div>
        </div>

        <div className="flex justify-between">
          {isEditing && (
            <Button variant="destructive" onClick={handleRemove}>
              <Trash2 className="size-4 mr-2" />
              Удалить
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={handleClose}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={!url}>
              {isEditing ? 'Сохранить' : 'Вставить'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook to use link dialog
export function useLinkDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [initialText, setInitialText] = useState('');
  const [initialUrl, setInitialUrl] = useState('');

  const openDialog = (text?: string, url?: string) => {
    setInitialText(text || '');
    setInitialUrl(url || '');
    setIsOpen(true);
  };

  return {
    isOpen,
    setIsOpen,
    openDialog,
    LinkDialog: (
      <LinkDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        initialText={initialText}
        initialUrl={initialUrl}
      />
    ),
  };
}
