"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  addPageEditor,
  fetchPageEditors,
  removePageEditor,
} from "@/fsd/shared/lib/wiki-pages/api";
import type { PageEditor } from "@/fsd/shared/lib/wiki-pages/types";

export function usePageEditors(slug: string | null) {
  const [editors, setEditors] = useState<PageEditor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!slug) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchPageEditors(slug);
      setEditors(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ошибка загрузки редакторов",
      );
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { editors, isLoading, error, refetch };
}

export function useAddPageEditor() {
  const [isLoading, setIsLoading] = useState(false);

  const add = useCallback(
    async (slug: string, username: string): Promise<PageEditor | null> => {
      setIsLoading(true);
      try {
        const data = await addPageEditor(slug, username);
        toast.success(`Редактор ${username} добавлен`);
        return data;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Ошибка при добавлении редактора";
        toast.error(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return { add, isLoading };
}

export function useRemovePageEditor() {
  const [isLoading, setIsLoading] = useState(false);

  const remove = useCallback(
    async (slug: string, username: string): Promise<boolean> => {
      setIsLoading(true);
      try {
        await removePageEditor(slug, username);
        toast.success(`Редактор ${username} удалён`);
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Ошибка при удалении редактора";
        toast.error(message);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return { remove, isLoading };
}
