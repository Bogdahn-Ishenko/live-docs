"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchPageAllVersions,
  fetchPageVersion,
  fetchPageVersions,
  restorePageVersion,
} from "@/fsd/shared/lib/wiki-pages/api";
import type {
  WikiPage,
  WikiPageVersion,
} from "@/fsd/shared/lib/wiki-pages/types";

export function usePageVersions(slug: string | null) {
  const [versions, setVersions] = useState<WikiPageVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!slug) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchPageVersions(slug);
      setVersions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки версий");
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { versions, isLoading, error, refetch };
}

export function usePageAllVersions(slug: string | null) {
  const [versions, setVersions] = useState<WikiPageVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!slug) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchPageAllVersions(slug);
      setVersions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки версий");
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { versions, isLoading, error, refetch };
}

export function usePageVersion(slug: string | null, versionId: string | null) {
  const [version, setVersion] = useState<WikiPageVersion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!slug || !versionId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchPageVersion(slug, versionId);
      setVersion(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки версии");
    } finally {
      setIsLoading(false);
    }
  }, [slug, versionId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { version, isLoading, error, refetch };
}

export function useRestorePageVersion() {
  const [isLoading, setIsLoading] = useState(false);

  const restore = useCallback(
    async (
      slug: string,
      versionId: number | string,
      comment?: string,
    ): Promise<WikiPage> => {
      setIsLoading(true);
      try {
        const data = await restorePageVersion(slug, versionId, comment);
        return data;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return { restore, isLoading };
}
