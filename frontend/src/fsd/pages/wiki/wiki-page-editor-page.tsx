"use client";

import type { SerializedEditorState } from "lexical";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BlockViewerProvider } from "@/fsd/app/providers/block-viewer-provider";
import { fetchWikiPage, updateWikiPage } from "@/fsd/shared/lib/wiki-pages/api";
import {
  buildPageSignature,
  parseStoredEditorState,
  stringifyEditorState,
} from "@/fsd/shared/lib/wiki-pages/editor-state";
import type {
  LocalWikiDraft,
  WikiPage,
} from "@/fsd/shared/lib/wiki-pages/types";
import { Button } from "@/fsd/shared/ui/button";
import { CommentThreadLauncher } from "@/fsd/shared/ui/comment-thread-launcher";
import { SidebarProvider } from "@/fsd/shared/ui/sidebar";

const Editor = dynamic(
  () => import("@/fsd/shared/ui/blocks/editor-x").then((mod) => mod.Editor),
  { ssr: false },
);

type SaveStatus = "idle" | "loading" | "saving" | "saved" | "error";

function getDraftStorageKey(slug: string): string {
  return `wikilive:page-draft:${slug}`;
}

function readLocalDraft(slug: string): LocalWikiDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(getDraftStorageKey(slug));
    if (!raw) return null;
    return JSON.parse(raw) as LocalWikiDraft;
  } catch {
    return null;
  }
}

function writeLocalDraft(slug: string, draft: LocalWikiDraft): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getDraftStorageKey(slug), JSON.stringify(draft));
}

function clearLocalDraft(slug: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(getDraftStorageKey(slug));
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function getSyncStatusText(
  status: SaveStatus,
  lastSyncedAt: string | null,
): string {
  switch (status) {
    case "loading":
      return "Загрузка документа...";
    case "saving":
      return "Сохранение...";
    case "saved":
      return lastSyncedAt
        ? `Синхронизировано: ${formatDateTime(lastSyncedAt)}`
        : "Сохранено";
    case "error":
      return "Ошибка синхронизации";
    default:
      return lastSyncedAt
        ? `Без изменений · ${formatDateTime(lastSyncedAt)}`
        : "Без изменений";
  }
}

function resolveBaseTitle(title: string): string {
  const normalized = title.trim();
  return normalized.length > 0 ? normalized : "Без названия";
}

export default function WikiPageEditorPage({ slug }: { slug: string }) {
  const [page, setPage] = useState<WikiPage | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [parentSlug, setParentSlug] = useState("");
  const [initialEditorState, setInitialEditorState] =
    useState<SerializedEditorState | null>(null);
  const [editorState, setEditorState] = useState<SerializedEditorState | null>(
    null,
  );
  const [editorInstanceKey, setEditorInstanceKey] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("loading");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const latestTitleRef = useRef(title);
  const latestDescriptionRef = useRef(description);
  const latestParentSlugRef = useRef(parentSlug);
  const latestEditorStateRef = useRef<SerializedEditorState | null>(null);
  const syncedSignatureRef = useRef<string>("");
  const loadingSinceRef = useRef<number | null>(Date.now());
  const recoveryInFlightRef = useRef(false);

  useEffect(() => {
    latestTitleRef.current = title;
  }, [title]);
  useEffect(() => {
    latestDescriptionRef.current = description;
  }, [description]);
  useEffect(() => {
    latestParentSlugRef.current = parentSlug;
  }, [parentSlug]);
  useEffect(() => {
    latestEditorStateRef.current = editorState;
  }, [editorState]);

  const loadPage = useCallback(async () => {
    try {
      setSaveStatus("loading");
      setLoadError(null);

      const data = await fetchWikiPage(slug);

      const remoteState = parseStoredEditorState(data.content);
      const remoteSignature = buildPageSignature(
        data.title,
        data.description,
        remoteState,
      );
      const remoteUpdatedAt = new Date(data.updatedAt).getTime();

      let nextTitle = data.title;
      let nextDescription = data.description || "";
      let nextState = remoteState;

      const localDraft = readLocalDraft(slug);
      if (localDraft) {
        const draftState = parseStoredEditorState(localDraft.content);
        const draftSignature = buildPageSignature(
          localDraft.title,
          localDraft.description,
          draftState,
        );

        if (draftSignature === remoteSignature) {
          clearLocalDraft(slug);
        } else if (localDraft.updatedAt > remoteUpdatedAt) {
          nextTitle = localDraft.title;
          nextDescription = localDraft.description || "";
          nextState = draftState;
        }
      }

      setPage(data);
      setParentSlug(data.parentSlug || "");
      setTitle(nextTitle);
      setDescription(nextDescription);
      setInitialEditorState(nextState);
      setEditorState(nextState);
      setEditorInstanceKey((v) => v + 1);
      syncedSignatureRef.current = remoteSignature;
      setLastSyncedAt(data.updatedAt);
      setSaveStatus("idle");
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Не удалось загрузить документ",
      );
      setSaveStatus("error");
    }
  }, [slug]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  useEffect(() => {
    if (saveStatus === "loading") {
      if (loadingSinceRef.current === null) {
        loadingSinceRef.current = Date.now();
      }
      return;
    }
    loadingSinceRef.current = null;
  }, [saveStatus]);

  useEffect(() => {
    const recover = (reason: "pageshow" | "visibility" | "watchdog") => {
      const exportStartedAtRaw =
        typeof window !== "undefined"
          ? window.sessionStorage.getItem("wikilive:docx-export-started-at")
          : null;
      const exportStartedAt = exportStartedAtRaw
        ? Number(exportStartedAtRaw)
        : null;
      const fromRecentDocxExport =
        typeof exportStartedAt === "number" &&
        Number.isFinite(exportStartedAt) &&
        Date.now() - exportStartedAt < 5 * 60 * 1000;

      console.info("[wiki-editor][recover]", {
        reason,
        saveStatus,
        hasPage: Boolean(page),
        hasInitialEditorState: Boolean(initialEditorState),
        fromRecentDocxExport,
      });

      if (recoveryInFlightRef.current) return;
      if (document.visibilityState === "hidden") return;

      if (page && (initialEditorState || fromRecentDocxExport)) {
        setSaveStatus((prev) => {
          if (prev !== "loading") return prev;
          return lastSyncedAt ? "saved" : "idle";
        });
        return;
      }

      if (saveStatus !== "loading") return;

      const startedAt = loadingSinceRef.current ?? Date.now();
      const loadingTooLong = Date.now() - startedAt > 5000;

      if (loadingTooLong) {
        console.info("[wiki-editor][recover] loadPage() retry");
        recoveryInFlightRef.current = true;
        void loadPage().finally(() => {
          recoveryInFlightRef.current = false;
        });
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        recover("visibility");
      }
    };

    const onPageShow = () => {
      recover("pageshow");
    };

    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibility);

    const watchdog = window.setInterval(() => recover("watchdog"), 3000);

    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(watchdog);
    };
  }, [initialEditorState, lastSyncedAt, loadPage, page, saveStatus]);

  useEffect(() => {
    if (!page || !editorState || saveStatus === "loading") return;

    const normalizedTitle = resolveBaseTitle(title);
    const content = stringifyEditorState(editorState);
    const signature = buildPageSignature(
      normalizedTitle,
      description,
      editorState,
    );

    if (
      signature === syncedSignatureRef.current &&
      parentSlug === (page.parentSlug || "")
    ) {
      clearLocalDraft(slug);
      if (saveStatus !== "idle") setSaveStatus("idle");
      return;
    }

    writeLocalDraft(slug, {
      title: normalizedTitle,
      description,
      content,
      updatedAt: Date.now(),
    });

    setSaveStatus("saving");

    const timer = setTimeout(async () => {
      try {
        const updated = await updateWikiPage(page.slug, {
          title: normalizedTitle,
          description,
          content,
          mwsTableId: page.mwsTableId,
          parentSlug: parentSlug || null,
        });

        const serverState = parseStoredEditorState(updated.content);
        const serverSignature = buildPageSignature(
          updated.title,
          updated.description,
          serverState,
        );

        syncedSignatureRef.current = serverSignature;
        setPage(updated);
        setLastSyncedAt(updated.updatedAt);

        const latestState = latestEditorStateRef.current;
        if (latestState) {
          const currentSignature = buildPageSignature(
            resolveBaseTitle(latestTitleRef.current),
            latestDescriptionRef.current,
            latestState,
          );
          if (
            currentSignature === serverSignature &&
            latestParentSlugRef.current === (updated.parentSlug || "")
          ) {
            clearLocalDraft(slug);
            setSaveStatus("saved");
            return;
          }
        }
        setSaveStatus("saving");
      } catch {
        setSaveStatus("error");
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [title, description, parentSlug, editorState, page, saveStatus, slug]);

  const syncStatusText = useMemo(
    () => getSyncStatusText(saveStatus, lastSyncedAt),
    [lastSyncedAt, saveStatus],
  );

  return (
    <BlockViewerProvider>
      <SidebarProvider
        defaultOpen={true}
        className="bg-background text-foreground"
      >
        <main className="flex h-svh w-full flex-col gap-2 overflow-hidden px-2 py-2">
          <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-4 border-b bg-background/80 px-2 py-1 backdrop-blur">
            <div className="flex items-center gap-2">
              <Link href="/wiki">
                <Button variant="ghost" size="sm">
                  Все страницы
                </Button>
              </Link>
            </div>
            <p className="text-xs font-medium text-muted-foreground/80">
              {syncStatusText}
            </p>
          </header>

          {loadError && (
            <section className="mx-2 my-2 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {loadError}
            </section>
          )}

          {!loadError && page && (
            <div className="mb-0.5 mt-0.5 px-2">
              <div className="flex min-w-0 items-start gap-1.5">
                <Image
                  src="/icons/document.svg"
                  alt=""
                  aria-hidden
                  width={14}
                  height={14}
                  className="mt-0.5 size-[14px] shrink-0 opacity-80"
                />
                <div className="min-w-0 flex-1">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border-0 bg-transparent p-0 text-lg font-semibold leading-tight text-foreground outline-none placeholder:text-muted-foreground/30"
                    placeholder="Без названия"
                  />
                  <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full border-0 bg-transparent p-0 text-xs leading-snug text-muted-foreground/60 outline-none placeholder:text-muted-foreground/30"
                    placeholder="Добавить описание"
                  />
                </div>
              </div>
            </div>
          )}

          {!loadError && initialEditorState && (
            <div className="min-h-0 flex-1 px-2 pb-2">
              <CommentThreadLauncher storageKey={`wiki-${slug}`}>
                <Editor
                  key={`wiki-editor-${slug}-${editorInstanceKey}`}
                  editorSerializedState={initialEditorState}
                  onSerializedChange={setEditorState}
                  documentTitle={resolveBaseTitle(title)}
                  documentDescription={description}
                />
              </CommentThreadLauncher>
            </div>
          )}
        </main>
      </SidebarProvider>
    </BlockViewerProvider>
  );
}
