"use client";

import type { SerializedEditorState } from "lexical";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  History,
  RotateCcw,
  X,
} from "lucide-react";
import { useState } from "react";
import { useVersions } from "@/fsd/shared/hooks/wiki";
import { cn } from "@/fsd/shared/lib/utils";
import {
  formatVersionDate,
  getActionLabel,
  type WikiPageVersion,
} from "@/fsd/shared/lib/wiki/versions";
import { Avatar, AvatarFallback } from "@/fsd/shared/ui/avatar";
import { Button } from "@/fsd/shared/ui/button";
import { ScrollArea } from "@/fsd/shared/ui/scroll-area";
import { Skeleton } from "@/fsd/shared/ui/skeleton";

interface VersionsPanelProps {
  pageId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onRestore?: (content: SerializedEditorState | null) => void;
  currentContent?: SerializedEditorState | null;
}

function VersionItem({
  version,
  isSelected,
  isExpanded,
  onToggle,
  onRestore,
  isRestoring,
}: {
  version: WikiPageVersion;
  isSelected: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onRestore: () => void;
  isRestoring: boolean;
}) {
  return (
    <div
      className={cn("border-b last:border-b-0", isSelected && "bg-primary/5")}
    >
      <button
        onClick={onToggle}
        className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-start gap-3">
          <Avatar className="size-7">
            <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground">
              {version.author.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-sm truncate">
                {getActionLabel(version.action)}
              </span>
              {isExpanded ? (
                <ChevronUp className="size-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground" />
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <Clock className="size-3" />
              <span>{formatVersionDate(version.createdAt)}</span>
            </div>

            <div className="text-xs text-muted-foreground mt-0.5">
              {version.author.name}
            </div>

            {version.description && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                {version.description}
              </p>
            )}
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onRestore}
            disabled={isRestoring}
          >
            <RotateCcw className="size-3 mr-2" />
            {isRestoring ? "Восстановление..." : "Восстановить версию"}
          </Button>
        </div>
      )}
    </div>
  );
}

export function VersionsPanel({
  pageId,
  isOpen,
  onClose,
  onRestore,
  currentContent,
}: VersionsPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const { versions, isLoading, refetch } = useVersions(pageId);

  const handleRestore = async (version: WikiPageVersion) => {
    if (!onRestore) return;

    setRestoringId(version.recordId);

    try {
      onRestore(version.content);
      // Save current state as new version before restoring
      // This would be implemented in the parent component
    } finally {
      setRestoringId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="w-80 border-l bg-background flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <History className="size-4" />
          <h3 className="font-medium">Машина времени</h3>
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

      {/* Info */}
      <div className="px-4 py-3 border-b bg-muted/30">
        <p className="text-xs text-muted-foreground">
          Здесь хранится история изменений страницы. Вы можете просмотреть любую
          версию и восстановить её.
        </p>
      </div>

      {/* Versions list */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-7 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : versions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <History className="size-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">История изменений пуста</p>
            <p className="text-xs mt-1">
              Версии сохраняются автоматически при редактировании
            </p>
          </div>
        ) : (
          <div>
            {versions.map((version, index) => (
              <VersionItem
                key={version.recordId}
                version={version}
                isSelected={index === 0}
                isExpanded={expandedId === version.recordId}
                onToggle={() =>
                  setExpandedId(
                    expandedId === version.recordId ? null : version.recordId,
                  )
                }
                onRestore={() => handleRestore(version)}
                isRestoring={restoringId === version.recordId}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
