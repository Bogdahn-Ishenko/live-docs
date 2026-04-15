"use client";

import type { SerializedEditorState } from "lexical";
import { FileText, History, Trash2, Upload } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BlockViewerProvider } from "@/fsd/app/providers/block-viewer-provider";
import {
  useDeletePageDraft,
  usePageDraft,
  usePublishPageDraft,
  useSavePageDraft,
} from "@/fsd/shared/hooks/wiki/use-page-draft";
import { useWikiAuth } from "@/fsd/shared/hooks/wiki/use-wiki-auth";
import {
  fetchPageDraft,
  fetchWikiPage,
  updateWikiPage,
} from "@/fsd/shared/lib/wiki-pages/api";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/fsd/shared/ui/dropdown-menu";
import { SidebarProvider } from "@/fsd/shared/ui/sidebar";
import { WikiLoginDialog } from "@/fsd/shared/ui/wiki/login-dialog";
import { PageVersionsPanel } from "@/fsd/shared/ui/wiki/page-versions-panel";

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
  const { isAuthenticated, logout } = useWikiAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
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

  const { draft, refetch: refetchDraft, clearDraft } = usePageDraft(slug);
  const { save: saveDraft, isLoading: isSavingDraft } = useSavePageDraft();
  const { remove: deleteDraft, isLoading: isDeletingDraft } =
    useDeletePageDraft();
  const { publish: publishDraft, isLoading: isPublishingDraft } =
    usePublishPageDraft();

  const latestTitleRef = useRef(title);
  const latestDescriptionRef = useRef(description);
  const latestParentSlugRef = useRef(parentSlug);
  const latestEditorStateRef = useRef<SerializedEditorState | null>(null);
  const syncedSignatureRef = useRef<string>("");

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

      const [data, serverDraft] = await Promise.all([
        fetchWikiPage(slug),
        fetchPageDraft(slug).catch(() => null),
      ]);

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
      let usedDraftSource: "server" | "local" | null = null;

      if (serverDraft) {
        const draftState = parseStoredEditorState(serverDraft.content);
        const draftSignature = buildPageSignature(
          serverDraft.title,
          serverDraft.description,
          draftState,
        );
        const draftUpdatedAt = new Date(serverDraft.updatedAt).getTime();

        if (
          draftSignature !== remoteSignature &&
          draftUpdatedAt > remoteUpdatedAt
        ) {
          nextTitle = serverDraft.title;
          nextDescription = serverDraft.description || "";
          nextState = draftState;
          usedDraftSource = "server";
        }
      }

      if (!usedDraftSource) {
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
            usedDraftSource = "local";
          }
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
    if (!isAuthenticated) {
      clearLocalDraft(slug);
      if (saveStatus !== "idle") setSaveStatus("idle");
      return;
    }
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
  }, [
    isAuthenticated,
    title,
    description,
    parentSlug,
    editorState,
    page,
    saveStatus,
    slug,
  ]);

  const syncStatusText = useMemo(
    () => getSyncStatusText(saveStatus, lastSyncedAt),
    [lastSyncedAt, saveStatus],
  );

  const handleSaveDraft = useCallback(async () => {
    if (!page || !editorState) return;
    const normalizedTitle = resolveBaseTitle(title);
    const content = stringifyEditorState(editorState);
    await saveDraft(slug, {
      title: normalizedTitle,
      description,
      content,
    });
    await refetchDraft();
  }, [page, editorState, title, description, slug, saveDraft, refetchDraft]);

  const handlePublishDraft = useCallback(async () => {
    if (!page) return;
    const published = await publishDraft(slug);
    clearLocalDraft(slug);
    clearDraft();
    await refetchDraft();
    setPage(published);
    setTitle(published.title);
    setDescription(published.description || "");
    const state = parseStoredEditorState(published.content);
    setInitialEditorState(state);
    setEditorState(state);
    setEditorInstanceKey((v) => v + 1);
    syncedSignatureRef.current = buildPageSignature(
      published.title,
      published.description,
      state,
    );
    setLastSyncedAt(published.updatedAt);
  }, [page, slug, publishDraft, refetchDraft, clearDraft]);

  const handleDeleteDraft = useCallback(async () => {
    await deleteDraft(slug);
    clearLocalDraft(slug);
    clearDraft();
    await refetchDraft();
  }, [slug, deleteDraft, refetchDraft, clearDraft]);

  const handleRestoreVersion = useCallback(
    (restored: {
      title: string;
      description: string | null;
      content: string | null;
      updatedAt: string;
    }) => {
      setTitle(restored.title);
      setDescription(restored.description || "");
      const state = parseStoredEditorState(restored.content);
      setInitialEditorState(state);
      setEditorState(state);
      setEditorInstanceKey((v) => v + 1);
      setPage((prev) =>
        prev
          ? {
              ...prev,
              title: restored.title,
              description: restored.description,
              content: restored.content ?? prev.content,
              updatedAt: restored.updatedAt,
            }
          : prev,
      );
      setLastSyncedAt(restored.updatedAt);
      syncedSignatureRef.current = buildPageSignature(
        restored.title,
        restored.description,
        state,
      );
      clearLocalDraft(slug);
      void refetchDraft();
    },
    [slug, refetchDraft],
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
            <div className="flex items-center gap-3">
              <p className="text-xs font-medium text-muted-foreground/80">
                {syncStatusText}
              </p>
              {page && isAuthenticated && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setVersionsOpen(true)}
                    className="gap-1.5"
                  >
                    <History className="size-4" />
                    История
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-1.5">
                        <FileText className="size-4" />
                        Черновик
                        {draft && (
                          <span className="ml-1 inline-flex h-2 w-2 rounded-full bg-primary" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => void handleSaveDraft()}
                        disabled={isSavingDraft}
                      >
                        <Upload className="size-4 mr-2" />
                        {isSavingDraft ? "Сохранение..." : "Сохранить черновик"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => void handlePublishDraft()}
                        disabled={isPublishingDraft || !draft}
                      >
                        <FileText className="size-4 mr-2" />
                        {isPublishingDraft
                          ? "Публикация..."
                          : "Опубликовать черновик"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => void handleDeleteDraft()}
                        disabled={isDeletingDraft || !draft}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="size-4 mr-2" />
                        {isDeletingDraft ? "Удаление..." : "Удалить черновик"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
              {isAuthenticated ? (
                <Button variant="ghost" size="sm" onClick={() => void logout()}>
                  Выйти
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLoginOpen(true)}
                >
                  Войти
                </Button>
              )}
            </div>
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
                    readOnly={!isAuthenticated}
                    className="w-full border-0 bg-transparent p-0 text-lg font-semibold leading-tight text-foreground outline-none placeholder:text-muted-foreground/30 read-only:cursor-default"
                    placeholder="Без названия"
                  />
                  <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    readOnly={!isAuthenticated}
                    className="w-full border-0 bg-transparent p-0 text-xs leading-snug text-muted-foreground/60 outline-none placeholder:text-muted-foreground/30 read-only:cursor-default"
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
                />
              </CommentThreadLauncher>
            </div>
          )}

          <WikiLoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
          <PageVersionsPanel
            slug={slug}
            isOpen={versionsOpen}
            onClose={() => setVersionsOpen(false)}
            onRestore={handleRestoreVersion}
          />
        </main>
      </SidebarProvider>
    </BlockViewerProvider>
  );
}
