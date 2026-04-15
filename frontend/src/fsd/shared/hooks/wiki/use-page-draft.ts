"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deletePageDraft,
  fetchPageDraft,
  publishPageDraft,
  savePageDraft,
} from "@/fsd/shared/lib/wiki-pages/api";
import type {
  WikiPage,
  WikiPageDraft,
} from "@/fsd/shared/lib/wiki-pages/types";

export function usePageDraft(slug: string | null) {
  const [draft, setDraft] = useState<WikiPageDraft | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!slug) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchPageDraft(slug);
      setDraft(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ошибка загрузки черновика",
      );
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const clearDraft = useCallback(() => {
    setDraft(null);
  }, []);

  return { draft, isLoading, error, refetch, clearDraft };
}

export function useSavePageDraft() {
  const [isLoading, setIsLoading] = useState(false);

  const save = useCallback(
    async (
      slug: string,
      payload: { title: string; description?: string | null; content: string },
    ): Promise<WikiPageDraft> => {
      setIsLoading(true);
      try {
        const data = await savePageDraft(slug, payload);
        return data;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return { save, isLoading };
}

export function useDeletePageDraft() {
  const [isLoading, setIsLoading] = useState(false);

  const remove = useCallback(async (slug: string): Promise<void> => {
    setIsLoading(true);
    try {
      await deletePageDraft(slug);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { remove, isLoading };
}

export function usePublishPageDraft() {
  const [isLoading, setIsLoading] = useState(false);

  const publish = useCallback(
    async (slug: string, comment?: string): Promise<WikiPage> => {
      setIsLoading(true);
      try {
        const data = await publishPageDraft(slug, comment);
        return data;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return { publish, isLoading };
}
