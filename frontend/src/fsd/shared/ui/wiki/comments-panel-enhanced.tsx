"use client";

import {
  Check,
  ChevronDown,
  ChevronUp,
  History,
  MessageSquare,
  RotateCcw,
  Send,
  Shield,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import {
  useComments,
  useCreateComment,
  useDeleteComment,
  useRestoreComment,
  useUpdateComment,
} from "@/fsd/shared/hooks/wiki";
import {
  usePageAccess,
  useUpdatePageAccess,
} from "@/fsd/shared/hooks/wiki/use-access-control";
import { cn } from "@/fsd/shared/lib/utils";
import {
  type CommentPermission,
  PERMISSION_LABELS,
} from "@/fsd/shared/lib/wiki/access-control";
import {
  formatCommentDate,
  type WikiComment,
} from "@/fsd/shared/lib/wiki/comments";
import { Avatar, AvatarFallback } from "@/fsd/shared/ui/avatar";
import { Button } from "@/fsd/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/fsd/shared/ui/dialog";
import { Label } from "@/fsd/shared/ui/label";
import { RadioGroup, RadioGroupItem } from "@/fsd/shared/ui/radio-group";
import { ScrollArea } from "@/fsd/shared/ui/scroll-area";
import { Skeleton } from "@/fsd/shared/ui/skeleton";
import { Switch } from "@/fsd/shared/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/fsd/shared/ui/tabs";
import { Textarea } from "@/fsd/shared/ui/textarea";

interface CommentsPanelProps {
  pageId: string | null;
  pageCreatorId?: string;
  currentUserId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  selectedText?: string;
  selection?: WikiComment["selection"];
  onClearSelection?: () => void;
}

// Comment thread item
function CommentThread({
  comment,
  onResolve,
  onDelete,
  onRestore,
  isResolving,
  isDeleting,
  isRestoring,
  showResolved,
}: {
  comment: WikiComment;
  onResolve: (id: string) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  isResolving: boolean;
  isDeleting: boolean;
  isRestoring: boolean;
  showResolved: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isDeleted = comment.content === "[deleted]";

  if (isDeleted && !showResolved) return null;

  return (
    <div
      className={cn(
        "border-b last:border-b-0",
        comment.resolved && !isDeleted && "opacity-60 bg-muted/30",
        isDeleted && "opacity-40 bg-red-50 dark:bg-red-950/10",
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="size-8">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {isDeleted ? "✕" : comment.author.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  "font-medium text-sm truncate",
                  isDeleted && "text-muted-foreground line-through",
                )}
              >
                {isDeleted ? "Удалено" : comment.author.name}
              </span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatCommentDate(comment.createdAt)}
              </span>
            </div>

            {comment.selection?.selectedText && !isDeleted && (
              <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-950/30 border-l-2 border-yellow-400 text-sm text-muted-foreground">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex items-center gap-1 w-full text-left"
                >
                  <span
                    className={cn(
                      "line-clamp-2",
                      isExpanded && "line-clamp-none",
                    )}
                  >
                    &ldquo;{comment.selection.selectedText}&rdquo;
                  </span>
                  {comment.selection.selectedText.length > 100 &&
                    (isExpanded ? (
                      <ChevronUp className="size-3 shrink-0" />
                    ) : (
                      <ChevronDown className="size-3 shrink-0" />
                    ))}
                </button>
              </div>
            )}

            {!isDeleted && (
              <p className="mt-2 text-sm whitespace-pre-wrap">
                {comment.content}
              </p>
            )}

            {isDeleted && (
              <p className="mt-2 text-sm text-muted-foreground italic">
                Комментарий удален
              </p>
            )}

            <div className="mt-2 flex items-center gap-2">
              {!isDeleted && !comment.resolved ? (
                <>
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive"
                    onClick={() => onDelete(comment.recordId)}
                    disabled={isDeleting}
                  >
                    <Trash2 className="size-3 mr-1" />
                    {isDeleting ? "Удаление..." : "Удалить"}
                  </Button>
                </>
              ) : isDeleted ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onRestore(comment.recordId)}
                  disabled={isRestoring}
                >
                  <RotateCcw className="size-3 mr-1" />
                  {isRestoring ? "Восстановление..." : "Восстановить"}
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
    </div>
  );
}

// Access settings dialog
function AccessSettingsDialog({
  pageId,
  currentPermission,
  onUpdate,
}: {
  pageId: string;
  currentPermission: CommentPermission;
  onUpdate: (permission: CommentPermission) => void;
}) {
  const [permission, setPermission] =
    useState<CommentPermission>(currentPermission);
  const { updateAccess, isLoading } = useUpdatePageAccess();

  const handleSave = async () => {
    const result = await updateAccess({
      pageId,
      commentPermission: permission,
    });
    if (result) {
      onUpdate(permission);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 text-xs">
          <Shield className="size-3 mr-1" />
          Доступ
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Доступ к комментариям</DialogTitle>
          <DialogDescription>
            Укажите, кто может добавлять комментарии к этой странице
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={permission}
          onValueChange={(v) => setPermission(v as CommentPermission)}
          className="gap-4 mt-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="everyone" id="everyone" />
            <Label htmlFor="everyone" className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              {PERMISSION_LABELS.everyone}
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <RadioGroupItem value="authenticated" id="authenticated" />
            <Label htmlFor="authenticated" className="flex items-center gap-2">
              <User className="size-4 text-muted-foreground" />
              {PERMISSION_LABELS.authenticated}
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <RadioGroupItem value="creator_only" id="creator_only" />
            <Label htmlFor="creator_only" className="flex items-center gap-2">
              <Shield className="size-4 text-muted-foreground" />
              {PERMISSION_LABELS.creator_only}
            </Label>
          </div>
        </RadioGroup>

        <div className="flex justify-end gap-2 mt-4">
          <Button
            onClick={handleSave}
            disabled={isLoading || permission === currentPermission}
          >
            {isLoading ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CommentsPanelEnhanced({
  pageId,
  pageCreatorId,
  currentUserId,
  isOpen,
  onClose,
  selectedText,
  selection,
  onClearSelection,
}: CommentsPanelProps) {
  const [newComment, setNewComment] = useState("");
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [showResolved, setShowResolved] = useState(false);
  const [_currentPermission, setCurrentPermission] =
    useState<CommentPermission>("everyone");

  const { comments, unresolvedCount, isLoading, refetch } = useComments(pageId);
  const { createComment, isLoading: isCreating } = useCreateComment();
  const { updateComment, isLoading: isResolving } = useUpdateComment();
  const { deleteComment, isLoading: isDeleting } = useDeleteComment();
  const { restoreComment, isLoading: isRestoring } = useRestoreComment();

  // Check permissions
  const { settings } = usePageAccess(pageId);
  const canUserComment =
    !settings ||
    settings.commentPermission === "everyone" ||
    (settings.commentPermission === "authenticated" && currentUserId) ||
    (settings.commentPermission === "creator_only" &&
      currentUserId === pageCreatorId);

  const isCreator = currentUserId === pageCreatorId;

  const activeComments = comments.filter(
    (c) => !c.resolved && c.content !== "[deleted]",
  );
  const resolvedComments = comments.filter(
    (c) => c.resolved && c.content !== "[deleted]",
  );
  const deletedComments = comments.filter((c) => c.content === "[deleted]");

  const historyCount = resolvedComments.length + deletedComments.length;

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
    if (success) refetch();
  };

  const handleDelete = async (commentId: string) => {
    const success = await deleteComment(commentId);
    if (success) refetch();
  };

  const handleRestore = async (commentId: string) => {
    const success = await restoreComment(commentId);
    if (success) refetch();
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
        <div className="flex items-center gap-1">
          {isCreator && pageId && (
            <AccessSettingsDialog
              pageId={pageId}
              currentPermission={settings?.commentPermission || "everyone"}
              onUpdate={setCurrentPermission}
            />
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "active" | "history")}
      >
        <TabsList className="w-full rounded-none border-b">
          <TabsTrigger value="active" className="flex-1">
            Активные ({activeComments.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1">
            История ({historyCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="m-0 flex-1 flex flex-col">
          {/* New comment input */}
          {selectedText && canUserComment && (
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

          {!canUserComment && (
            <div className="p-3 bg-muted/50 text-center text-sm text-muted-foreground">
              <Shield className="size-4 mx-auto mb-1" />
              Комментирование ограничено
            </div>
          )}

          {/* Active comments list */}
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
            ) : activeComments.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <MessageSquare className="size-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Нет активных комментариев</p>
                {!selectedText && canUserComment && (
                  <p className="text-xs mt-1">
                    Выделите текст и нажмите &ldquo;Добавить комментарий&rdquo;
                  </p>
                )}
              </div>
            ) : (
              <div>
                {activeComments.map((comment) => (
                  <CommentThread
                    key={comment.recordId}
                    comment={comment}
                    onResolve={handleResolve}
                    onDelete={handleDelete}
                    onRestore={handleRestore}
                    isResolving={isResolving}
                    isDeleting={isDeleting}
                    isRestoring={isRestoring}
                    showResolved={false}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="history" className="m-0 flex-1 flex flex-col">
          <div className="p-2 border-b bg-muted/30">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Switch
                checked={showResolved}
                onCheckedChange={setShowResolved}
              />
              <span>Показать удаленные</span>
            </label>
          </div>

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
            ) : historyCount === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <History className="size-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">История пуста</p>
              </div>
            ) : (
              <div>
                {/* Resolved comments */}
                {resolvedComments.map((comment) => (
                  <CommentThread
                    key={comment.recordId}
                    comment={comment}
                    onResolve={handleResolve}
                    onDelete={handleDelete}
                    onRestore={handleRestore}
                    isResolving={isResolving}
                    isDeleting={isDeleting}
                    isRestoring={isRestoring}
                    showResolved={showResolved}
                  />
                ))}

                {/* Deleted comments */}
                {showResolved &&
                  deletedComments.map((comment) => (
                    <CommentThread
                      key={comment.recordId}
                      comment={comment}
                      onResolve={handleResolve}
                      onDelete={handleDelete}
                      onRestore={handleRestore}
                      isResolving={isResolving}
                      isDeleting={isDeleting}
                      isRestoring={isRestoring}
                      showResolved={true}
                    />
                  ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
