"use client";

import type { SerializedEditorState } from "lexical";
import { useCallback, useMemo } from "react";
import { useCreateRecords, useRecords } from "@/fsd/shared/hooks/tables-mw";
import {
  type CreateVersionRequest,
  parseVersion,
  versionToFields,
  type WikiPageVersion,
} from "@/fsd/shared/lib/wiki/versions";

const VERSIONS_DATASHEET_ID =
  process.env.NEXT_PUBLIC_WIKI_VERSIONS_DATASHEET_ID || "";

// Hook to get versions for a page
export function useVersions(pageId: string | null) {
  const { records, isLoading, error, refetch } = useRecords(
    VERSIONS_DATASHEET_ID || null,
    { pageSize: 100 },
  );

  const versions = useMemo(() => {
    const allVersions = records.map(parseVersion);

    if (!pageId) return [];

    return allVersions
      .filter((v) => v.pageId === pageId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [records, pageId]);

  return {
    versions,
    isLoading,
    error,
    refetch,
  };
}

// Hook to create a version
export function useCreateVersion() {
  const { createRecords, isLoading } = useCreateRecords();

  const createVersion = useCallback(
    async (request: CreateVersionRequest): Promise<WikiPageVersion | null> => {
      if (!VERSIONS_DATASHEET_ID) {
        // Silently fail if versions not configured
        return null;
      }

      // Get current user (mock for now)
      const currentUser = {
        id: "current-user",
        name: "Текущий пользователь",
      };

      const fields = versionToFields({
        pageId: request.pageId,
        content: request.content,
        author: currentUser,
        createdAt: Date.now(),
        action: request.action,
        description: request.description,
      });

      const result = await createRecords(VERSIONS_DATASHEET_ID, {
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
        return parseVersion(result.data.records[0]);
      }
      return null;
    },
    [createRecords],
  );

  return { createVersion, isLoading };
}

// Hook to save version on page edit
export function useAutoSaveVersion(
  pageId: string | null,
  content: SerializedEditorState | null,
) {
  const { createVersion } = useCreateVersion();

  const saveVersion = useCallback(
    async (action: string = "edit", description?: string) => {
      if (!pageId || !content) return null;

      return createVersion({
        pageId,
        content,
        action,
        description,
      });
    },
    [pageId, content, createVersion],
  );

  return { saveVersion };
}
