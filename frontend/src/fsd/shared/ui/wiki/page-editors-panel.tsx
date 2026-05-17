"use client";

import { Trash2, UserPlus, Users, X } from "lucide-react";
import { useState } from "react";
import {
  useAddPageEditor,
  usePageEditors,
  useRemovePageEditor,
} from "@/fsd/shared/hooks/wiki/use-page-editors";
import { Avatar, AvatarFallback } from "@/fsd/shared/ui/avatar";
import { Button } from "@/fsd/shared/ui/button";
import { Input } from "@/fsd/shared/ui/input";
import { ScrollArea } from "@/fsd/shared/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/fsd/shared/ui/sheet";
import { Skeleton } from "@/fsd/shared/ui/skeleton";

interface PageEditorsPanelProps {
  slug: string;
  isOpen: boolean;
  onClose: () => void;
}

export function PageEditorsPanel({
  slug,
  isOpen,
  onClose,
}: PageEditorsPanelProps) {
  const { editors, isLoading, refetch } = usePageEditors(slug);
  const { add, isLoading: isAdding } = useAddPageEditor();
  const { remove, isLoading: isRemoving } = useRemovePageEditor();
  const [newUsername, setNewUsername] = useState("");

  const handleAdd = async () => {
    const trimmed = newUsername.trim();
    if (!trimmed) return;
    const success = await add(slug, trimmed);
    if (success) {
      setNewUsername("");
      void refetch();
    }
  };

  const handleRemove = async (username: string) => {
    const success = await remove(slug, username);
    if (success) {
      void refetch();
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[22rem] sm:w-[24rem] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="size-4" />
              <SheetTitle className="text-base">Редакторы страницы</SheetTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={onClose}
            >
              <X className="size-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="p-4 border-b space-y-3">
          <div className="flex gap-2">
            <Input
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void handleAdd();
                }
              }}
              placeholder="Имя пользователя"
              disabled={isAdding}
            />
            <Button
              onClick={() => void handleAdd()}
              disabled={isAdding || !newUsername.trim()}
              size="icon"
            >
              <UserPlus className="size-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Добавлять и удалять редакторов может только владелец страницы.
          </p>
        </div>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="p-4 space-y-4">
              <div className="flex gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <div className="flex gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </div>
          ) : editors.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Users className="size-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Нет редакторов</p>
              <p className="text-xs mt-1">Добавьте первого редактора выше</p>
            </div>
          ) : (
            <div className="divide-y">
              {editors.map((editor) => (
                <div
                  key={editor.username}
                  className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="size-8">
                      <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground">
                        {editor.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium truncate">
                      {editor.username}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:text-destructive"
                    onClick={() => void handleRemove(editor.username)}
                    disabled={isRemoving}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
