"use client";

import { Check, MessageSquare, Send, X } from "lucide-react";
import { useState } from "react";
import {
  useComments,
  useCreateComment,
  useUpdateComment,
} from "@/fsd/shared/hooks/wiki";
import { cn } from "@/fsd/shared/lib/utils";
import {
  formatCommentDate,
  type WikiComment,
} from "@/fsd/shared/lib/wiki/comments";
import { Avatar, AvatarFallback } from "@/fsd/shared/ui/avatar";
import { Button } from "@/fsd/shared/ui/button";
import { ScrollArea } from "@/fsd/shared/ui/scroll-area";
import { Skeleton } from "@/fsd/shared/ui/skeleton";
import { Textarea } from "@/fsd/shared/ui/textarea";

interface CommentsPanelProps {
  pageId: string | null;
  isOpen: boolean;
  onClose: () => void;
  selectedText?: string;
  selection?: WikiComment["selection"];
  onClearSelection?: () => void;
}

function CommentItem({
  comment,
  onResolve,
  isResolving,
}: {
  comment: WikiComment;
  onResolve: (id: string) => void;
  isResolving: boolean;
}) {
  return (
    <div
      className={cn(
        "p-4 border-b last:border-b-0",
        comment.resolved && "opacity-60 bg-muted/30",
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="size-8">
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {comment.author.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-sm truncate">
              {comment.author.name}
            </span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatCommentDate(comment.createdAt)}
            </span>
          </div>

          {comment.selection?.selectedText && (
            <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-950/30 border-l-2 border-yellow-400 text-sm text-muted-foreground line-clamp-2">
              &ldquo;{comment.selection.selectedText}&rdquo;
            </div>
          )}

          <p className="mt-2 text-sm whitespace-pre-wrap">{comment.content}</p>

          <div className="mt-2 flex items-center gap-2">
            {!comment.resolved ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => onResolve(comment.recordId)}
                disabled={isResolving}
              >
                <Check className="size-3 mr-1" />
                {isResolving ? "Сохранение..." : "Решить"}
              </Button>
            ) : (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <Check className="size-3" />
                Решено
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CommentsPanel({
  pageId,
  isOpen,
  onClose,
  selectedText,
  selection,
  onClearSelection,
}: CommentsPanelProps) {
  const [newComment, setNewComment] = useState("");
  const [showResolved, setShowResolved] = useState(false);

  const { comments, unresolvedCount, isLoading, refetch } = useComments(pageId);
  const { createComment, isLoading: isCreating } = useCreateComment();
  const { updateComment, isLoading: isResolving } = useUpdateComment();

  const filteredComments = showResolved
    ? comments
    : comments.filter((c) => !c.resolved);

  const handleSubmit = async () => {
    if (!newComment.trim() || !pageId) return;

    const success = await createComment({
      pageId,
      content: newComment,
      selection: selection || undefined,
    });

    if (success) {
      setNewComment("");
      onClearSelection?.();
      refetch();
    }
  };

  const handleResolve = async (commentId: string) => {
    const success = await updateComment({
      recordId: commentId,
      resolved: true,
    });

    if (success) {
      refetch();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="w-80 border-l bg-background flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4" />
          <h3 className="font-medium">Комментарии</h3>
          {unresolvedCount > 0 && (
            <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
              {unresolvedCount}
            </span>
          )}
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

      {/* New comment input */}
      {selectedText && (
        <div className="p-3 border-b bg-muted/30">
          <div className="text-xs text-muted-foreground mb-2">
            Комментарий к выделенному тексту:
          </div>
          <div className="p-2 bg-yellow-50 dark:bg-yellow-950/30 border-l-2 border-yellow-400 text-sm text-muted-foreground line-clamp-2 mb-2">
            &ldquo;{selectedText}&rdquo;
          </div>
          <Textarea
            placeholder="Напишите комментарий..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[80px] text-sm"
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" size="sm" onClick={onClearSelection}>
              Отмена
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!newComment.trim() || isCreating}
            >
              <Send className="size-3 mr-1" />
              {isCreating ? "Отправка..." : "Отправить"}
            </Button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="px-4 py-2 border-b flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {showResolved
            ? `Все (${comments.length})`
            : `Активные (${unresolvedCount})`}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setShowResolved(!showResolved)}
        >
          {showResolved ? "Скрыть решенные" : "Показать все"}
        </Button>
      </div>

      {/* Comments list */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredComments.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <MessageSquare className="size-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {showResolved ? "Нет комментариев" : "Нет активных комментариев"}
            </p>
            {!selectedText && (
              <p className="text-xs mt-1">
                Выделите текст и нажмите &ldquo;Добавить комментарий&rdquo;
              </p>
            )}
          </div>
        ) : (
          <div>
            {filteredComments.map((comment) => (
              <CommentItem
                key={comment.recordId}
                comment={comment}
                onResolve={handleResolve}
                isResolving={isResolving}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
