"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useWikiAuth } from "@/fsd/shared/hooks/wiki/use-wiki-auth";
import {
  createWikiPage,
  fetchWikiPages,
} from "@/fsd/shared/lib/wiki-pages/api";
import {
  getEmptyEditorState,
  stringifyEditorState,
} from "@/fsd/shared/lib/wiki-pages/editor-state";
import {
  FOLDER_MARKER,
  isFolderPage,
} from "@/fsd/shared/lib/wiki-pages/folders";
import type { WikiPage } from "@/fsd/shared/lib/wiki-pages/types";
import { Button } from "@/fsd/shared/ui/button";
import { Input } from "@/fsd/shared/ui/input";
import { Label } from "@/fsd/shared/ui/label";
import { WikiLoginDialog } from "@/fsd/shared/ui/wiki/login-dialog";

/**
 * Page for creating a new Wiki document.
 */
export default function WikiPageCreatePage() {
  const { isAuthenticated, logout } = useWikiAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFolder = searchParams.get("asFolder") === "1";
  const [title, setTitle] = useState("");
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [parentSlug, setParentSlug] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const submittingRef = useRef(false);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const parentFromQuery = searchParams.get("parent");
    if (parentFromQuery) {
      setParentSlug(parentFromQuery);
    }
  }, [searchParams]);

  useEffect(() => {
    const loadPages = async () => {
      try {
        const data = await fetchWikiPages();
        if (!isMountedRef.current) return;
        setPages(data);
      } catch {
        // Optional data for better UX, safe to ignore on failure.
      }
    };

    void loadPages();
  }, []);

  const onCreate = async () => {
    if (isSubmitting || submittingRef.current) return;

    try {
      submittingRef.current = true;
      setIsSubmitting(true);
      setError(null);

      const page = await createWikiPage({
        title: title.trim() || "Без названия",
        description: "",
        content: isFolder ? "" : stringifyEditorState(getEmptyEditorState()),
        mwsTableId: isFolder ? FOLDER_MARKER : null,
        parentSlug: parentSlug || null,
      });

      if (isFolder) {
        router.push("/wiki");
      } else {
        router.push(`/wiki/${page.slug}`);
      }
    } catch (createError) {
      if (isMountedRef.current) {
        setError(
          createError instanceof Error
            ? createError.message
            : "Не удалось создать документ",
        );
      }
    } finally {
      submittingRef.current = false;
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {isFolder ? "Новая папка WikiLive" : "Новый документ WikiLive"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/wiki">
            <Button variant="outline">К документам</Button>
          </Link>
          {isAuthenticated ? (
            <Button variant="ghost" onClick={() => void logout()}>
              Выйти
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setLoginOpen(true)}>
              Войти
            </Button>
          )}
        </div>
      </header>

      <section className="rounded-md border bg-card p-4 shadow-sm">
        <div className="space-y-2">
          <Label htmlFor="wiki-page-title">
            {isFolder ? "Название папки" : "Название документа"}
          </Label>
          <Input
            id="wiki-page-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Например: План квартала, Онбординг, API-гайд"
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void onCreate();
              }
            }}
          />
        </div>

        <div className="mt-4 space-y-2">
          <Label htmlFor="wiki-page-parent">Папка (родитель)</Label>
          <select
            id="wiki-page-parent"
            value={parentSlug}
            onChange={(event) => setParentSlug(event.target.value)}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Без папки</option>
            {pages.filter(isFolderPage).map((page) => (
              <option key={page.id} value={page.slug}>
                {page.title || page.slug}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="mt-3 text-sm font-medium text-destructive">{error}</p>
        )}

        <div className="mt-4">
          <Button onClick={() => void onCreate()} disabled={isSubmitting}>
            {isSubmitting
              ? "Создание..."
              : isFolder
                ? "Создать папку"
                : "Создать документ"}
          </Button>
        </div>
      </section>

      <WikiLoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </main>
  );
}
