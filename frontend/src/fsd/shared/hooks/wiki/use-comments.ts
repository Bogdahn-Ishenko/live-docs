"use client";

import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  useCreateRecords,
  useRecords,
  useUpdateRecords,
} from "@/fsd/shared/hooks/tables-mw";
import {
  type CreateCommentRequest,
  commentToFields,
  parseComment,
  type UpdateCommentRequest,
  type WikiComment,
} from "@/fsd/shared/lib/wiki/comments";

const COMMENTS_DATASHEET_ID =
  process.env.NEXT_PUBLIC_WIKI_COMMENTS_DATASHEET_ID || "";

// Hook to get comments for a page
export function useComments(pageId: string | null) {
  const { records, isLoading, error, refetch } = useRecords(
    COMMENTS_DATASHEET_ID || null,
    { pageSize: 1000 },
  );

  const comments = useMemo(() => {
    const allComments = records.map(parseComment);

    if (!pageId) return [];

    return allComments
      .filter((c) => c.pageId === pageId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [records, pageId]);

  const unresolvedCount = useMemo(
    () =>
      comments.filter((c) => !c.resolved && c.content !== "[deleted]").length,
    [comments],
  );

  return {
    comments,
    unresolvedCount,
    isLoading,
    error,
    refetch,
  };
}

// Hook to create a comment
export function useCreateComment() {
  const { createRecords, isLoading } = useCreateRecords();

  const createComment = useCallback(
    async (request: CreateCommentRequest): Promise<WikiComment | null> => {
      if (!COMMENTS_DATASHEET_ID) {
        toast.error("Comments datasheet not configured");
        return null;
      }

      const now = Date.now();

      // Get current user (mock for now)
      const currentUser = {
        id: "current-user",
        name: "Текущий пользователь",
      };

      const fields = commentToFields({
        pageId: request.pageId,
        content: request.content,
        author: currentUser,
        createdAt: now,
        resolved: false,
        selection: request.selection,
      });

      const result = await createRecords(COMMENTS_DATASHEET_ID, {
        records: [
          {
            fields: fields as Record<
              string,
              string | number | boolean | null | undefined
            >,
          },
        ],
        fieldKey: "name",
      });

      if (result?.success && result.data?.records?.[0]) {
        const newComment = parseComment(result.data.records[0]);
        toast.success("Комментарий добавлен");
        return newComment;
      } else {
        toast.error("Ошибка при добавлении комментария");
        return null;
      }
    },
    [createRecords],
  );

  return { createComment, isLoading };
}

// Hook to update a comment
export function useUpdateComment() {
  const { updateRecords, isLoading } = useUpdateRecords();

  const updateComment = useCallback(
    async (request: UpdateCommentRequest): Promise<WikiComment | null> => {
      if (!COMMENTS_DATASHEET_ID) {
        toast.error("Comments datasheet not configured");
        return null;
      }

      const fields = commentToFields({
        ...(request.content !== undefined && { content: request.content }),
        ...(request.resolved !== undefined && { resolved: request.resolved }),
        updatedAt: Date.now(),
      });

      const result = await updateRecords(COMMENTS_DATASHEET_ID, {
        records: [
          {
            recordId: request.recordId,
            fields: fields as Record<
              string,
              string | number | boolean | null | undefined
            >,
          },
        ],
        fieldKey: "name",
      });

      if (result?.success && result.data?.records?.[0]) {
        const updatedComment = parseComment(result.data.records[0]);
        toast.success(
          request.resolved ? "Комментарий решен" : "Комментарий обновлен",
        );
        return updatedComment;
      } else {
        toast.error("Ошибка при обновлении комментария");
        return null;
      }
    },
    [updateRecords],
  );

  return { updateComment, isLoading };
}

// Hook to delete a comment (soft delete - mark as [deleted])
export function useDeleteComment() {
  const { updateRecords, isLoading } = useUpdateRecords();

  const deleteComment = useCallback(
    async (commentId: string): Promise<boolean> => {
      if (!COMMENTS_DATASHEET_ID) {
        toast.error("Comments datasheet not configured");
        return false;
      }

      const fields = commentToFields({
        content: "[deleted]",
        updatedAt: Date.now(),
      });

      const result = await updateRecords(COMMENTS_DATASHEET_ID, {
        records: [
          {
            recordId: commentId,
            fields: fields as Record<
              string,
              string | number | boolean | null | undefined
            >,
          },
        ],
        fieldKey: "name",
      });

      if (result?.success) {
        toast.success("Комментарий удален");
        return true;
      } else {
        toast.error("Ошибка при удалении комментария");
        return false;
      }
    },
    [updateRecords],
  );

  return { deleteComment, isLoading };
}

// Hook to restore a deleted comment
export function useRestoreComment() {
  const { updateRecords, isLoading } = useUpdateRecords();

  const restoreComment = useCallback(
    async (commentId: string): Promise<boolean> => {
      if (!COMMENTS_DATASHEET_ID) {
        toast.error("Comments datasheet not configured");
        return false;
      }

      // Get original content from history/backup or use placeholder
      const fields = commentToFields({
        content: "[restored]", // In real implementation, you'd restore from backup
        updatedAt: Date.now(),
      });

      const result = await updateRecords(COMMENTS_DATASHEET_ID, {
        records: [
          {
            recordId: commentId,
            fields: fields as Record<
              string,
              string | number | boolean | null | undefined
            >,
          },
        ],
        fieldKey: "name",
      });

      if (result?.success) {
        toast.success("Комментарий восстановлен");
        return true;
      } else {
        toast.error("Ошибка при восстановлении комментария");
        return false;
      }
    },
    [updateRecords],
  );

  return { restoreComment, isLoading };
}
