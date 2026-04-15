"use client";

import type { SerializedEditorState } from "lexical";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  useCreateRecords,
  useDeleteRecords,
  useRecords,
  useUpdateRecords,
} from "@/fsd/shared/hooks/tables-mw";
import {
  type CreateWikiPageRequest,
  extractLinksFromContent,
  generateSlug,
  parseWikiPage,
  type UpdateWikiPageRequest,
  type WikiHierarchy,
  type WikiPage,
  type WikiPageMetadata,
  wikiPageToFields,
} from "@/fsd/shared/lib/wiki/types";

// Constants
const WIKI_DATASHEET_ID = process.env.NEXT_PUBLIC_WIKI_DATASHEET_ID || "";
const _WIKI_LINKS_DATASHEET_ID =
  process.env.NEXT_PUBLIC_WIKI_LINKS_DATASHEET_ID || "";

// SWR fetcher for client-side data
const _fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
};

// Hook to get all wiki pages (metadata only)
export function useWikiPages(options?: {
  onlyPublished?: boolean;
  parentId?: string | null;
}) {
  const { records, isLoading, error, refetch } = useRecords(
    WIKI_DATASHEET_ID || null,
    { pageSize: 1000 },
  );

  const pages = useMemo(() => {
    const allPages = records.map(parseWikiPage);

    let filtered = allPages;

    if (options?.onlyPublished) {
      filtered = filtered.filter((p) => p.isPublished);
    }

    if (options?.parentId !== undefined) {
      filtered = filtered.filter((p) => p.parentId === options.parentId);
    }

    return filtered.sort((a, b) => b.updatedAt - a.updatedAt);
  }, [records, options?.onlyPublished, options?.parentId]);

  return {
    pages,
    isLoading,
    error,
    refetch,
  };
}

// Hook to get a single wiki page by slug
export function useWikiPage(slug: string | null) {
  const { pages, isLoading, error, refetch } = useWikiPages();

  const page = useMemo(() => {
    if (!slug) return null;
    return pages.find((p) => p.slug === slug) || null;
  }, [pages, slug]);

  return {
    page,
    isLoading,
    error,
    refetch,
  };
}

// Hook to get wiki page by ID
export function useWikiPageById(recordId: string | null) {
  const { pages, isLoading, error, refetch } = useWikiPages();

  const page = useMemo(() => {
    if (!recordId) return null;
    return pages.find((p) => p.recordId === recordId) || null;
  }, [pages, recordId]);

  return {
    page,
    isLoading,
    error,
    refetch,
  };
}

// Hook to create a new wiki page
export function useCreateWikiPage() {
  const { createRecords, isLoading } = useCreateRecords();

  const createPage = useCallback(
    async (request: CreateWikiPageRequest): Promise<WikiPage | null> => {
      if (!WIKI_DATASHEET_ID) {
        toast.error("Wiki datasheet not configured");
        return null;
      }

      const slug = request.slug || generateSlug(request.title);
      const now = Date.now();

      const fields = wikiPageToFields({
        title: request.title,
        slug,
        content: request.content || null,
        parentId: request.parentId || null,
        createdAt: now,
        updatedAt: now,
        isPublished: true,
      });

      const result = await createRecords(WIKI_DATASHEET_ID, {
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
        const newPage = parseWikiPage(result.data.records[0]);
        toast.success("Страница создана");
        return newPage;
      } else {
        toast.error("Ошибка при создании страницы");
        return null;
      }
    },
    [createRecords],
  );

  return { createPage, isLoading };
}

// Hook to update a wiki page
export function useUpdateWikiPage() {
  const { updateRecords, isLoading } = useUpdateRecords();

  const updatePage = useCallback(
    async (request: UpdateWikiPageRequest): Promise<WikiPage | null> => {
      if (!WIKI_DATASHEET_ID) {
        toast.error("Wiki datasheet not configured");
        return null;
      }

      const fields = wikiPageToFields({
        ...(request.title !== undefined && { title: request.title }),
        ...(request.slug !== undefined && { slug: request.slug }),
        ...(request.content !== undefined && { content: request.content }),
        ...(request.parentId !== undefined && { parentId: request.parentId }),
        ...(request.isPublished !== undefined && {
          isPublished: request.isPublished,
        }),
        updatedAt: Date.now(),
      });

      const result = await updateRecords(WIKI_DATASHEET_ID, {
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
        const updatedPage = parseWikiPage(result.data.records[0]);
        toast.success("Страница сохранена");
        return updatedPage;
      } else {
        toast.error("Ошибка при сохранении страницы");
        return null;
      }
    },
    [updateRecords],
  );

  return { updatePage, isLoading };
}

// Hook to delete a wiki page
export function useDeleteWikiPage() {
  const { deleteRecords, isLoading } = useDeleteRecords();

  const deletePage = useCallback(
    async (recordId: string): Promise<boolean> => {
      if (!WIKI_DATASHEET_ID) {
        toast.error("Wiki datasheet not configured");
        return false;
      }

      const success = await deleteRecords(WIKI_DATASHEET_ID, [recordId]);

      if (success) {
        toast.success("Страница удалена");
      } else {
        toast.error("Ошибка при удалении страницы");
      }

      return success;
    },
    [deleteRecords],
  );

  return { deletePage, isLoading };
}

// Hook to get backlinks (pages that link to a given page)
export function useWikiBacklinks(pageId: string | null) {
  const { pages, isLoading, error } = useWikiPages();

  const backlinks = useMemo(() => {
    if (!pageId) return [];

    const targetPage = pages.find((p) => p.recordId === pageId);
    if (!targetPage) return [];

    return pages.filter((sourcePage) => {
      if (sourcePage.recordId === pageId) return false;
      const links = extractLinksFromContent(sourcePage.content);
      return links.includes(targetPage.slug);
    });
  }, [pages, pageId]);

  return { backlinks, isLoading, error };
}

// Hook to get wiki hierarchy (tree structure)
export function useWikiHierarchy() {
  const { pages, isLoading, error } = useWikiPages({ onlyPublished: true });

  const hierarchy = useMemo<WikiHierarchy[]>(() => {
    const _pageMap = new Map(pages.map((p) => [p.recordId, p]));
    const childrenMap = new Map<string, WikiPageMetadata[]>();

    // Group children by parent
    pages.forEach((page) => {
      const parentId = page.parentId || "root";
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, []);
      }
      childrenMap.get(parentId)?.push({
        recordId: page.recordId,
        title: page.title,
        slug: page.slug,
        parentId: page.parentId,
        updatedAt: page.updatedAt,
        isPublished: page.isPublished,
      });
    });

    // Build tree recursively
    function buildTree(parentId: string | null): WikiHierarchy[] {
      const children = childrenMap.get(parentId || "root") || [];
      return children.map((child) => ({
        page: child,
        children: buildTree(child.recordId),
      }));
    }

    return buildTree(null);
  }, [pages]);

  return { hierarchy, isLoading, error };
}

// Hook for auto-save functionality
export function useAutoSave(
  pageId: string | null,
  content: SerializedEditorState | null,
  options?: {
    enabled?: boolean;
    interval?: number;
    onSave?: () => void;
  },
) {
  const { updatePage, isLoading } = useUpdateWikiPage();
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Track unsaved changes
  useEffect(() => {
    if (pageId && content) {
      setHasUnsavedChanges(true);
    }
  }, [content, pageId]);

  // Auto-save interval
  useEffect(() => {
    if (!options?.enabled || !pageId || !content || !hasUnsavedChanges) return;

    const interval = setInterval(async () => {
      const result = await updatePage({
        recordId: pageId,
        content,
      });

      if (result) {
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        options?.onSave?.();
      }
    }, options?.interval || 30000); // Default 30 seconds

    return () => clearInterval(interval);
  }, [
    options?.enabled,
    options?.interval,
    pageId,
    content,
    hasUnsavedChanges,
    updatePage,
    options?.onSave,
  ]);

  // Manual save
  const saveNow = useCallback(async (): Promise<boolean> => {
    if (!pageId || !content) return false;

    const result = await updatePage({
      recordId: pageId,
      content,
    });

    if (result) {
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      return true;
    }
    return false;
  }, [pageId, content, updatePage]);

  return {
    lastSaved,
    hasUnsavedChanges,
    isSaving: isLoading,
    saveNow,
  };
}
