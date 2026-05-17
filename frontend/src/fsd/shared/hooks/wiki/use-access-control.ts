"use client";

import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  useCreateRecords,
  useRecords,
  useUpdateRecords,
} from "@/fsd/shared/hooks/tables-mw";
import {
  accessSettingsToFields,
  type CommentPermission,
  type EditPermission,
  type PageAccessSettings,
  parseAccessSettings,
} from "@/fsd/shared/lib/wiki/access-control";

const ACCESS_DATASHEET_ID =
  process.env.NEXT_PUBLIC_WIKI_ACCESS_DATASHEET_ID || "";

// Hook to get page access settings
export function usePageAccess(pageId: string | null) {
  const { records, isLoading, error, refetch } = useRecords(
    ACCESS_DATASHEET_ID || null,
    { pageSize: 100 },
  );

  const settings = useMemo(() => {
    if (!pageId) return null;

    const pageSettings = records
      .map(parseAccessSettings)
      .find((s) => s.pageId === pageId);

    return pageSettings || null;
  }, [records, pageId]);

  return {
    settings,
    isLoading,
    error,
    refetch,
  };
}

// Hook to update page access
export function useUpdatePageAccess() {
  const { createRecords, isLoading: isCreating } = useCreateRecords();
  const { updateRecords, isLoading: isUpdating } = useUpdateRecords();

  const updateAccess = useCallback(
    async (params: {
      pageId: string;
      commentPermission?: CommentPermission;
      editPermission?: EditPermission;
      allowedUserIds?: string[];
    }): Promise<PageAccessSettings | null> => {
      if (!ACCESS_DATASHEET_ID) {
        toast.error("Access control datasheet not configured");
        return null;
      }

      // Check if settings already exist
      const { records } = await fetch(
        `/api/wiki/access?pageId=${params.pageId}`,
      )
        .then((r) => r.json())
        .catch(() => ({ records: [] }));

      const existing = records?.find(
        (r: { fields: Record<string, unknown> }) =>
          r.fields["Page ID"] === params.pageId,
      );

      const fields = accessSettingsToFields({
        pageId: params.pageId,
        commentPermission: params.commentPermission,
        editPermission: params.editPermission,
        allowedUserIds: params.allowedUserIds,
      });

      let result;

      if (existing) {
        result = await updateRecords(ACCESS_DATASHEET_ID, {
          records: [
            {
              recordId: existing.recordId,
              fields: fields as Record<
                string,
                string | number | boolean | null | undefined
              >,
            },
          ],
          fieldKey: "name",
        });
      } else {
        result = await createRecords(ACCESS_DATASHEET_ID, {
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
      }

      if (result?.success) {
        toast.success("Настройки доступа сохранены");
        return parseAccessSettings(
          result.data?.records?.[0] || { recordId: "", fields: {} },
        );
      } else {
        toast.error("Ошибка при сохранении настроек");
        return null;
      }
    },
    [createRecords, updateRecords],
  );

  return { updateAccess, isLoading: isCreating || isUpdating };
}
