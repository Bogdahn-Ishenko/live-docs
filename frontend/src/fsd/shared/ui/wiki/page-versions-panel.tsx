"use client";

import { Clock, Eye, FileText, History, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import {
  usePageAllVersions,
  usePageVersion,
  usePageVersions,
  useRestorePageVersion,
} from "@/fsd/shared/hooks/wiki/use-page-versions";
import { cn } from "@/fsd/shared/lib/utils";
import type { WikiPageVersion } from "@/fsd/shared/lib/wiki-pages/types";
import { Avatar, AvatarFallback } from "@/fsd/shared/ui/avatar";
import { Badge } from "@/fsd/shared/ui/badge";
import { Button } from "@/fsd/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/fsd/shared/ui/dialog";
import { Input } from "@/fsd/shared/ui/input";
import { Label } from "@/fsd/shared/ui/label";
import { ScrollArea } from "@/fsd/shared/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/fsd/shared/ui/sheet";
import { Skeleton } from "@/fsd/shared/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/fsd/shared/ui/tabs";

function formatVersionDate(value: string | number): string {
  const date = typeof value === "string" ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    create: "Создание",
    edit: "Редактирование",
    delete: "Удаление",
    restore: "Восстановление",
    publish: "Публикация",
    unpublish: "Снятие с публикации",
  };
  return labels[action] || action;
}

function getActionBadgeVariant(
  action: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (action) {
    case "create":
      return "default";
    case "edit":
      return "secondary";
    case "delete":
      return "destructive";
    case "restore":
      return "outline";
    case "publish":
      return "default";
    default:
      return "outline";
  }
}

interface PageVersionsPanelProps {
  slug: string;
  isOpen: boolean;
  onClose: () => void;
  onRestore?: (restoredPage: {
    title: string;
    description: string | null;
    content: string | null;
    updatedAt: string;
  }) => void;
}

function VersionPreviewDialog({
  version,
  open,
  onOpenChange,
}: {
  version: WikiPageVersion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!version) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Версия от {formatVersionDate(version.createdAt)}
          </DialogTitle>
          <DialogDescription>
            {getActionLabel(version.action)} · {version.author}
            {version.comment ? ` · ${version.comment}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-muted-foreground">Заголовок</Label>
            <div className="text-lg font-semibold">{version.title}</div>
          </div>
          {version.description && (
            <div>
              <Label className="text-muted-foreground">Описание</Label>
              <div className="text-sm text-muted-foreground">
                {version.description}
              </div>
            </div>
          )}
          <div>
            <Label className="text-muted-foreground">Контент</Label>
            <div className="max-h-64 overflow-auto rounded-md border bg-muted/30 p-3 text-sm">
              {version.content ? (
                <pre className="whitespace-pre-wrap break-all">
                  {version.content.slice(0, 2000)}
                  {version.content.length > 2000 ? "…" : ""}
                </pre>
              ) : (
                <span className="text-muted-foreground italic">
                  Контент отсутствует
                </span>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RestoreDialog({
  version,
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: {
  version: WikiPageVersion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (comment: string) => void;
  isLoading: boolean;
}) {
  const [comment, setComment] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Восстановить версию</DialogTitle>
          <DialogDescription>
            Версия от {version ? formatVersionDate(version.createdAt) : ""}{" "}
            будет восстановлена как текущая.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="restore-comment">Комментарий (необязательно)</Label>
            <Input
              id="restore-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Например: откат до стабильной версии"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Отмена
          </Button>
          <Button
            onClick={() => {
              onConfirm(comment);
              setComment("");
            }}
            disabled={isLoading}
          >
            {isLoading ? "Восстановление..." : "Восстановить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VersionItem({
  version,
  isExpanded,
  onToggle,
  onPreview,
  onRestore,
  isRestoring,
}: {
  version: WikiPageVersion;
  isExpanded: boolean;
  onToggle: () => void;
  onPreview: () => void;
  onRestore: () => void;
  isRestoring: boolean;
}) {
  return (
    <div
      className={cn("border-b last:border-b-0", isExpanded && "bg-muted/40")}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-start gap-3">
          <Avatar className="size-8">
            <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground">
              {version.author.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <Badge
                variant={getActionBadgeVariant(version.action)}
                className="text-[10px]"
              >
                {getActionLabel(version.action)}
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1.5">
              <Clock className="size-3" />
              <span>{formatVersionDate(version.createdAt)}</span>
            </div>

            <div className="text-xs text-muted-foreground mt-0.5">
              {version.author}
            </div>

            {version.comment && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                {version.comment}
              </p>
            )}
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onPreview}
          >
            <Eye className="size-3.5 mr-2" />
            Просмотреть
          </Button>
          <Button
            variant="default"
            size="sm"
            className="w-full"
            onClick={onRestore}
            disabled={isRestoring}
          >
            <RotateCcw className="size-3.5 mr-2" />
            {isRestoring ? "Восстановление..." : "Восстановить версию"}
          </Button>
        </div>
      )}
    </div>
  );
}

export function PageVersionsPanel({
  slug,
  isOpen,
  onClose,
  onRestore,
}: PageVersionsPanelProps) {
  const [mode, setMode] = useState<"published" | "all">("published");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [previewVersion, setPreviewVersion] = useState<WikiPageVersion | null>(
    null,
  );
  const [restoreVersion, setRestoreVersion] = useState<WikiPageVersion | null>(
    null,
  );

  const published = usePageVersions(mode === "published" ? slug : null);
  const all = usePageAllVersions(mode === "all" ? slug : null);
  const { version: fetchedVersion } = usePageVersion(
    slug,
    expandedId ? String(expandedId) : null,
  );

  const { restore, isLoading: isRestoring } = useRestorePageVersion();

  const versions = mode === "published" ? published.versions : all.versions;
  const isLoading = mode === "published" ? published.isLoading : all.isLoading;

  const handlePreview = (version: WikiPageVersion) => {
    setPreviewVersion(version);
  };

  const handleRestore = async (comment: string) => {
    if (!restoreVersion) return;
    try {
      const restored = await restore(
        slug,
        restoreVersion.id,
        comment || undefined,
      );
      onRestore?.({
        title: restored.title,
        description: restored.description,
        content: restored.content,
        updatedAt: restored.updatedAt,
      });
      setRestoreVersion(null);
      // refresh lists
      void published.refetch();
      void all.refetch();
    } catch {
      // error is handled silently in this panel; parent may show toasts
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-[22rem] sm:w-[24rem] p-0 flex flex-col">
          <SheetHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="size-4" />
                <SheetTitle className="text-base">История изменений</SheetTitle>
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

          <Tabs
            value={mode}
            onValueChange={(v) => setMode(v as "published" | "all")}
            className="w-full"
          >
            <div className="px-4 pt-3 pb-1">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="published">Опубликованные</TabsTrigger>
                <TabsTrigger value="all">Все версии</TabsTrigger>
              </TabsList>
            </div>
          </Tabs>

          <div className="px-4 py-2 border-b bg-muted/30">
            <p className="text-xs text-muted-foreground">
              Выберите версию для просмотра или восстановления. Восстановление
              создаёт новую версию на основе выбранной.
            </p>
          </div>

          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="p-4 space-y-4">
                <div className="flex gap-3">
                  <Skeleton className="size-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Skeleton className="size-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Skeleton className="size-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Skeleton className="size-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              </div>
            ) : versions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <FileText className="size-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">История изменений пуста</p>
                <p className="text-xs mt-1">
                  {mode === "all"
                    ? "Нет опубликованных и черновых версий"
                    : "Нет опубликованных версий"}
                </p>
              </div>
            ) : (
              <div>
                {versions.map((version) => (
                  <VersionItem
                    key={version.id}
                    version={version}
                    isExpanded={expandedId === version.id}
                    onToggle={() =>
                      setExpandedId(
                        expandedId === version.id ? null : version.id,
                      )
                    }
                    onPreview={() => handlePreview(version)}
                    onRestore={() => setRestoreVersion(version)}
                    isRestoring={
                      isRestoring && restoreVersion?.id === version.id
                    }
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <VersionPreviewDialog
        version={previewVersion || fetchedVersion}
        open={!!previewVersion}
        onOpenChange={(open) => !open && setPreviewVersion(null)}
      />

      <RestoreDialog
        version={restoreVersion}
        open={!!restoreVersion}
        onOpenChange={(open) => !open && setRestoreVersion(null)}
        onConfirm={handleRestore}
        isLoading={isRestoring}
      />
    </>
  );
}
