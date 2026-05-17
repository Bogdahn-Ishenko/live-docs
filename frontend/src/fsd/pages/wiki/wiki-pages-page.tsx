"use client";

import type {
  CollisionDetection,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  restrictToVerticalAxis,
  restrictToWindowEdges,
} from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Ellipsis,
  FileText,
  Folder,
  FolderPlus,
  FolderTree,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useWikiAuth } from "@/fsd/shared/hooks/wiki/use-wiki-auth";
import {
  createWikiPage,
  deleteWikiPage,
  fetchWikiPages,
  updateWikiPage,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/fsd/shared/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/fsd/shared/ui/dropdown-menu";
import { WikiLoginDialog } from "@/fsd/shared/ui/wiki/login-dialog";
import { WikiPagesGraph } from "@/fsd/shared/ui/wiki/wiki-pages-graph";

const LOCAL_ORDER_KEY = "wikilive:docs-order:v3";

type TreeNode = {
  page: WikiPage;
  children: TreeNode[];
};

type VisibleRow = {
  page: WikiPage;
  depth: number;
  hasChildren: boolean;
};

type DropPlacement = "before" | "after" | "inside";
type DropZonePlacement = "before" | "after" | "inside";
type ParsedDropTarget = {
  pageId: number;
  placement: DropZonePlacement;
  explicitPlacement: boolean;
};

type ModalState = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: "default" | "destructive";
  onConfirm?: () => void | Promise<void>;
};

function getDropZoneId(pageId: number, placement: DropZonePlacement): string {
  return `page:${pageId}:${placement}`;
}

function parseDropTargetId(id: unknown): ParsedDropTarget | null {
  if (typeof id === "number" && Number.isInteger(id)) {
    return {
      pageId: id,
      placement: "after",
      explicitPlacement: false,
    };
  }

  if (typeof id !== "string") return null;

  const dropZoneMatch = id.match(/^page:(\d+):(before|after|inside)$/);
  if (dropZoneMatch) {
    return {
      pageId: Number(dropZoneMatch[1]),
      placement: dropZoneMatch[2] as DropZonePlacement,
      explicitPlacement: true,
    };
  }

  const pageId = Number(id);
  if (Number.isInteger(pageId) && String(pageId) === id) {
    return {
      pageId,
      placement: "after",
      explicitPlacement: false,
    };
  }

  return null;
}

function resolveDropPlacement(
  overPage: WikiPage,
  zonePlacement: DropZonePlacement,
): DropPlacement {
  if (zonePlacement === "inside" && isFolderPage(overPage)) {
    return "inside";
  }
  return zonePlacement === "before" ? "before" : "after";
}

function getNextDefaultTitle(pages: WikiPage[], baseTitle: string): string {
  const usedTitles = new Set(
    pages.map((page) => (page.title || "").trim().toLowerCase()),
  );
  if (!usedTitles.has(baseTitle.toLowerCase())) {
    return baseTitle;
  }

  let index = 1;
  while (true) {
    const candidate = `${baseTitle} (${index})`;
    if (!usedTitles.has(candidate.toLowerCase())) {
      return candidate;
    }
    index += 1;
  }
}

function readSavedOrder(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_ORDER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((id): id is number => Number.isInteger(id))
      : [];
  } catch {
    return [];
  }
}

function saveOrder(ids: number[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_ORDER_KEY, JSON.stringify(ids));
}

function applySavedOrder(pages: WikiPage[], savedIds: number[]): WikiPage[] {
  if (savedIds.length === 0) return pages;
  const map = new Map(pages.map((p) => [p.id, p] as const));
  const ordered: WikiPage[] = [];

  for (const id of savedIds) {
    const page = map.get(id);
    if (page) {
      ordered.push(page);
      map.delete(id);
    }
  }

  return [...ordered, ...map.values()];
}

function buildFolderTree(pages: WikiPage[]): TreeNode[] {
  const bySlug = new Map(pages.map((p) => [p.slug, p] as const));
  const folderSlugs = new Set(pages.filter(isFolderPage).map((p) => p.slug));
  const byParent = new Map<string | null, WikiPage[]>();

  for (const page of pages) {
    const parent =
      page.parentSlug &&
      folderSlugs.has(page.parentSlug) &&
      bySlug.has(page.parentSlug)
        ? page.parentSlug
        : null;
    const list = byParent.get(parent) ?? [];
    list.push(page);
    byParent.set(parent, list);
  }

  const build = (parentSlug: string | null): TreeNode[] => {
    const children = byParent.get(parentSlug) ?? [];
    return children.map((page) => ({
      page,
      children: isFolderPage(page) ? build(page.slug) : [],
    }));
  };

  return build(null);
}

function flattenVisibleRows(
  nodes: TreeNode[],
  expanded: Set<string>,
  depth = 0,
): VisibleRow[] {
  const rows: VisibleRow[] = [];

  for (const node of nodes) {
    const hasChildren = node.children.length > 0;
    rows.push({
      page: node.page,
      depth,
      hasChildren,
    });

    if (isFolderPage(node.page) && expanded.has(node.page.slug)) {
      rows.push(...flattenVisibleRows(node.children, expanded, depth + 1));
    }
  }

  return rows;
}

function isDescendantParent(
  candidateParentSlug: string | null,
  movingSlug: string,
  bySlug: Map<string, WikiPage>,
): boolean {
  let current = candidateParentSlug;
  const visited = new Set<string>();

  while (current && !visited.has(current)) {
    if (current === movingSlug) return true;
    visited.add(current);
    const page = bySlug.get(current);
    current = page?.parentSlug ?? null;
  }

  return false;
}

function collectDescendantSlugs(rootSlug: string, pages: WikiPage[]): string[] {
  const byParent = new Map<string, WikiPage[]>();
  for (const page of pages) {
    if (!page.parentSlug) continue;
    const list = byParent.get(page.parentSlug) ?? [];
    list.push(page);
    byParent.set(page.parentSlug, list);
  }

  const result: string[] = [];
  const visit = (slug: string) => {
    const children = byParent.get(slug) ?? [];
    for (const child of children) {
      visit(child.slug);
      result.push(child.slug);
    }
  };
  visit(rootSlug);
  return result;
}

function Row({
  row,
  expanded,
  onToggle,
  folders,
  editingId,
  editingTitle,
  onStartRename,
  onChangeEditingTitle,
  onCommitRename,
  onCancelRename,
  onMove,
  onCopyLink,
  onDelete,
  deletingId,
  overTarget,
  isOverlay,
  canManage,
}: {
  row: VisibleRow;
  expanded: Set<string>;
  onToggle: (slug: string) => void;
  folders: WikiPage[];
  editingId: number | null;
  editingTitle: string;
  onStartRename: (page: WikiPage) => void;
  onChangeEditingTitle: (value: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onMove: (page: WikiPage, parentSlug: string | null) => void;
  onCopyLink: (page: WikiPage) => void;
  onDelete: (page: WikiPage) => void;
  deletingId: number | null;
  overTarget: { pageId: number; placement: DropPlacement } | null;
  isOverlay?: boolean;
  canManage?: boolean;
}) {
  const router = useRouter();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: row.page.id,
    disabled: isOverlay,
  });

  const isFolder = isFolderPage(row.page);
  const isOpen = expanded.has(row.page.slug);
  const isEditing = editingId === row.page.id;
  const isOverRow = !isOverlay && overTarget?.pageId === row.page.id;
  const overPlacement = isOverRow ? overTarget?.placement : null;
  const { setNodeRef: setBeforeDropRef } = useDroppable({
    id: getDropZoneId(row.page.id, "before"),
    disabled: isOverlay,
  });
  const { setNodeRef: setInsideDropRef } = useDroppable({
    id: getDropZoneId(row.page.id, "inside"),
    disabled: isOverlay || !isFolder,
  });
  const { setNodeRef: setAfterDropRef } = useDroppable({
    id: getDropZoneId(row.page.id, "after"),
    disabled: isOverlay,
  });

  const handleRenameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onCommitRename();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      onCancelRename();
    }
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group relative flex items-center gap-3 rounded-md px-4 py-3 text-lg transition-colors ${
        isOverlay
          ? "bg-background/70 shadow-xl"
          : isDragging
            ? "bg-muted/20"
            : "hover:bg-muted/25"
      }`}
    >
      <div
        className="flex items-center gap-2"
        style={{ paddingLeft: `${Math.max(0, row.depth) * 22}px` }}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (isFolder) onToggle(row.page.slug);
          }}
          className="flex size-5 items-center justify-center rounded hover:bg-muted"
        >
          {isFolder ? (
            isOpen ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )
          ) : (
            <span className="size-4" />
          )}
        </button>

        {isFolder ? (
          <Folder className="size-5 text-muted-foreground" />
        ) : (
          <FileText className="size-5 text-muted-foreground" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        {isEditing ? (
          <input
            value={editingTitle}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => onChangeEditingTitle(event.target.value)}
            onBlur={() => onCommitRename()}
            onKeyDown={handleRenameKeyDown}
            className="h-9 w-full rounded-md border bg-background px-2 text-base font-semibold outline-none"
          />
        ) : (
          <button
            type="button"
            className={`w-full truncate text-left ${isFolder ? "font-semibold" : "font-medium"}`}
            title={row.page.title || row.page.slug}
            onDoubleClick={(event) => {
              event.stopPropagation();
              onStartRename(row.page);
            }}
            onClick={() => {
              if (isOverlay || isDragging) return;
              if (isFolder) {
                onToggle(row.page.slug);
                return;
              }
              router.push(`/wiki/${row.page.slug}`);
            }}
          >
            {row.page.title || "Без названия"}
          </button>
        )}
      </div>

      {!isOverlay && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 text-muted-foreground"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
              title="Действия"
            >
              <Ellipsis className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {canManage && (
              <DropdownMenuItem
                onClick={(event) => {
                  event.stopPropagation();
                  onStartRename(row.page);
                }}
              >
                <Pencil className="size-4" />
                Переименовать
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={(event) => {
                event.stopPropagation();
                onCopyLink(row.page);
              }}
            >
              <Copy className="size-4" />
              Скопировать ссылку
            </DropdownMenuItem>
            {canManage && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <FolderTree className="size-4" />
                  Переместить в
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem
                    onClick={(event) => {
                      event.stopPropagation();
                      onMove(row.page, null);
                    }}
                  >
                    В корень (без папки)
                  </DropdownMenuItem>
                  {folders
                    .filter((folder) => folder.slug !== row.page.slug)
                    .map((folder) => (
                      <DropdownMenuItem
                        key={folder.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          onMove(row.page, folder.slug);
                        }}
                      >
                        {folder.title || folder.slug}
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
            {canManage && <DropdownMenuSeparator />}
            {canManage && (
              <DropdownMenuItem
                variant="destructive"
                disabled={deletingId === row.page.id}
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(row.page);
                }}
              >
                <Trash2 className="size-4" />
                Удалить
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {!isOverlay ? (
        <>
          {isOverRow && overPlacement === "before" ? (
            <div className="pointer-events-none absolute inset-x-2 top-0 z-30 h-1 rounded-full bg-primary/80 shadow-[0_0_0_1px_hsl(var(--background))]" />
          ) : null}
          {isOverRow && overPlacement === "after" ? (
            <div className="pointer-events-none absolute inset-x-2 bottom-0 z-30 h-1 rounded-full bg-primary/80 shadow-[0_0_0_1px_hsl(var(--background))]" />
          ) : null}
          {isOverRow && overPlacement === "inside" ? (
            <div className="pointer-events-none absolute inset-1 z-20 rounded-md bg-primary/8 ring-2 ring-primary/55" />
          ) : null}
          <div
            ref={setBeforeDropRef}
            className="pointer-events-none absolute inset-x-2 top-0 z-20 h-2"
          />
          {isFolder ? (
            <div
              ref={setInsideDropRef}
              className="pointer-events-none absolute inset-x-2 top-2 bottom-2 z-10"
            />
          ) : null}
          <div
            ref={setAfterDropRef}
            className="pointer-events-none absolute inset-x-2 bottom-0 z-20 h-2"
          />
        </>
      ) : null}
    </div>
  );
}

export default function WikiPagesPage() {
  const { isAuthenticated, logout } = useWikiAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [overTarget, setOverTarget] = useState<{
    pageId: number;
    placement: DropPlacement;
  } | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isCreatingDocument, setIsCreatingDocument] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [modal, setModal] = useState<ModalState>({
    open: false,
    title: "",
    description: "",
  });
  const collisionDetection = useCallback<CollisionDetection>((args) => {
    const pointerHits = pointerWithin(args);
    return pointerHits.length > 0 ? pointerHits : rectIntersection(args);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const bySlug = useMemo(
    () => new Map(pages.map((p) => [p.slug, p] as const)),
    [pages],
  );

  const loadPages = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchWikiPages();
      const ordered = applySavedOrder(data, readSavedOrder());
      setPages(ordered);
      saveOrder(ordered.map((p) => p.id));
      setExpanded(new Set());
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось загрузить документы",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPages();
  }, [loadPages]);

  const tree = useMemo(() => buildFolderTree(pages), [pages]);
  const folders = useMemo(
    () => pages.filter((page) => isFolderPage(page)),
    [pages],
  );
  const visibleRows = useMemo(
    () => flattenVisibleRows(tree, expanded),
    [tree, expanded],
  );
  const activeRow = useMemo(
    () => visibleRows.find((row) => row.page.id === activeId) ?? null,
    [activeId, visibleRows],
  );

  const handleToggle = useCallback((slug: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  }, []);

  const handleDelete = useCallback(
    async (page: WikiPage) => {
      if (deletingId !== null) return;

      const descendantSlugs = collectDescendantSlugs(page.slug, pages);
      const totalToDelete = descendantSlugs.length + 1;
      const isCascadeDelete = descendantSlugs.length > 0;
      const itemWord = totalToDelete === 1 ? "элемент" : "элементов";

      setModal({
        open: true,
        title: isCascadeDelete
          ? "Удалить папку со всем содержимым?"
          : "Удалить элемент?",
        description: isCascadeDelete
          ? `Будет удалено ${totalToDelete} ${itemWord}, включая все вложенные документы и подпапки. Это действие нельзя отменить.`
          : `Элемент "${page.title}" будет удален без возможности восстановления.`,
        confirmLabel: "Удалить",
        confirmVariant: "destructive",
        onConfirm: async () => {
          try {
            setDeletingId(page.id);
            for (const slug of descendantSlugs) {
              await deleteWikiPage(slug);
            }
            await deleteWikiPage(page.slug);
            setPages((prev) => {
              const slugsToDelete = new Set([...descendantSlugs, page.slug]);
              const next = prev.filter((item) => !slugsToDelete.has(item.slug));
              saveOrder(next.map((item) => item.id));
              return next;
            });
          } catch (err) {
            setModal({
              open: true,
              title: "Ошибка удаления",
              description:
                err instanceof Error
                  ? err.message
                  : "Не удалось удалить элемент",
            });
          } finally {
            setDeletingId(null);
          }
        },
      });
    },
    [deletingId, pages],
  );

  const handleStartRename = useCallback((page: WikiPage) => {
    setEditingId(page.id);
    setEditingTitle(page.title || "");
  }, []);

  const handleCancelRename = useCallback(() => {
    setEditingId(null);
    setEditingTitle("");
  }, []);

  const handleCommitRename = useCallback(async () => {
    if (editingId === null) return;
    const page = pages.find((item) => item.id === editingId);
    if (!page) {
      handleCancelRename();
      return;
    }

    const title = editingTitle.trim();
    if (!title || title === page.title) {
      handleCancelRename();
      return;
    }

    try {
      const updated = await updateWikiPage(page.slug, {
        title,
        description: page.description,
        content: page.content ?? "",
        mwsTableId: page.mwsTableId,
        parentSlug: page.parentSlug,
      });

      setPages((prev) =>
        prev.map((item) =>
          item.id === page.id ? { ...item, ...updated } : item,
        ),
      );
      handleCancelRename();
    } catch (err) {
      setModal({
        open: true,
        title: "Ошибка переименования",
        description:
          err instanceof Error
            ? err.message
            : "Не удалось переименовать элемент",
      });
    }
  }, [editingId, editingTitle, handleCancelRename, pages]);

  const handleMove = useCallback(
    async (page: WikiPage, targetParentSlug: string | null) => {
      if (targetParentSlug === page.parentSlug) return;
      if (targetParentSlug === page.slug) {
        setModal({
          open: true,
          title: "Нельзя переместить",
          description: "Папку нельзя переместить внутрь самой себя.",
        });
        return;
      }
      if (
        isFolderPage(page) &&
        isDescendantParent(targetParentSlug, page.slug, bySlug)
      ) {
        setModal({
          open: true,
          title: "Нельзя переместить",
          description: "Нельзя переместить папку в саму себя или подпапку.",
        });
        return;
      }

      const prevPages = pages;
      const optimistic = pages.map((item) =>
        item.id === page.id ? { ...item, parentSlug: targetParentSlug } : item,
      );
      setPages(optimistic);

      try {
        const updated = await updateWikiPage(page.slug, {
          title: page.title,
          description: page.description,
          content: page.content ?? "",
          mwsTableId: page.mwsTableId,
          parentSlug: targetParentSlug,
        });
        setPages((current) =>
          current.map((item) =>
            item.id === page.id ? { ...item, ...updated } : item,
          ),
        );
      } catch (err) {
        setPages(prevPages);
        setModal({
          open: true,
          title: "Ошибка перемещения",
          description:
            err instanceof Error
              ? err.message
              : "Не удалось переместить элемент",
        });
      }
    },
    [bySlug, pages],
  );

  const handleCopyLink = useCallback((page: WikiPage) => {
    const url = `${window.location.origin}/wiki/${page.slug}`;
    void navigator.clipboard.writeText(url);
  }, []);

  const handleCreateInRoot = useCallback(
    async (asFolder: boolean) => {
      if (asFolder ? isCreatingFolder : isCreatingDocument) return;

      if (asFolder) {
        setIsCreatingFolder(true);
      } else {
        setIsCreatingDocument(true);
      }

      try {
        const title = getNextDefaultTitle(
          pages,
          asFolder ? "Новая папка" : "Новый документ",
        );
        const created = await createWikiPage({
          title,
          description: "",
          content: asFolder ? "" : stringifyEditorState(getEmptyEditorState()),
          mwsTableId: asFolder ? FOLDER_MARKER : null,
          parentSlug: null,
        });

        setPages((prev) => {
          const next = [created, ...prev];
          saveOrder(next.map((item) => item.id));
          return next;
        });
      } catch (err) {
        setModal({
          open: true,
          title: asFolder
            ? "Ошибка создания папки"
            : "Ошибка создания документа",
          description:
            err instanceof Error ? err.message : "Не удалось создать элемент",
        });
      } finally {
        if (asFolder) {
          setIsCreatingFolder(false);
        } else {
          setIsCreatingDocument(false);
        }
      }
    },
    [isCreatingDocument, isCreatingFolder, pages],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as number);
    setOverTarget(null);
  }, []);

  const resolvePlacement = useCallback(
    (
      event: Pick<DragEndEvent, "active" | "delta"> & {
        overRect: NonNullable<DragEndEvent["over"]>["rect"];
      },
      overPage: WikiPage,
      dropTarget: ParsedDropTarget,
    ): DropPlacement => {
      let placement: DropPlacement = resolveDropPlacement(
        overPage,
        dropTarget.placement,
      );
      if (!dropTarget.explicitPlacement) {
        const translatedRect = event.active.rect.current.translated;
        const initialRect = event.active.rect.current.initial;
        const currentRect = translatedRect ?? {
          top: (initialRect?.top ?? event.overRect.top) + event.delta.y,
          height: initialRect?.height ?? event.overRect.height,
        };
        const activeCenterY = currentRect.top + currentRect.height / 2;
        const overCenterY = event.overRect.top + event.overRect.height / 2;
        const folderInsideTop =
          event.overRect.top + event.overRect.height * 0.2;
        const folderInsideBottom =
          event.overRect.bottom - event.overRect.height * 0.2;

        if (
          isFolderPage(overPage) &&
          activeCenterY >= folderInsideTop &&
          activeCenterY <= folderInsideBottom
        ) {
          placement = "inside";
        } else {
          placement = activeCenterY < overCenterY ? "before" : "after";
        }
      }
      return placement;
    },
    [],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const dropTarget = parseDropTargetId(event.over?.id);
      if (!dropTarget || !event.over?.rect) {
        setOverTarget(null);
        return;
      }
      const overPage = pages.find((p) => p.id === dropTarget.pageId);
      if (!overPage) {
        setOverTarget(null);
        return;
      }
      const placement = resolvePlacement(
        {
          active: event.active,
          delta: event.delta,
          overRect: event.over.rect,
        },
        overPage,
        dropTarget,
      );
      setOverTarget({ pageId: dropTarget.pageId, placement });
    },
    [pages, resolvePlacement],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      setOverTarget(null);
      if (!isAuthenticated) return;
      const dropTarget = parseDropTargetId(over?.id);
      if (!dropTarget || active.id === dropTarget.pageId) return;

      const activePage = pages.find((p) => p.id === active.id);
      const overPage = pages.find((p) => p.id === dropTarget.pageId);
      if (!activePage || !overPage || !over?.rect) return;
      const placement = resolvePlacement(
        {
          active,
          delta: event.delta,
          overRect: over.rect,
        },
        overPage,
        dropTarget,
      );

      const targetParentSlug =
        placement === "inside" &&
        isFolderPage(overPage) &&
        overPage.id !== activePage.id
          ? overPage.slug
          : (overPage.parentSlug ?? null);

      if (targetParentSlug === activePage.slug) {
        setModal({
          open: true,
          title: "Нельзя переместить",
          description: "Папку нельзя вложить в саму себя.",
        });
        return;
      }
      if (
        isFolderPage(activePage) &&
        isDescendantParent(targetParentSlug, activePage.slug, bySlug)
      ) {
        setModal({
          open: true,
          title: "Нельзя переместить",
          description: "Нельзя вложить папку в саму себя или ее подпапку.",
        });
        return;
      }

      const oldPages = pages;
      const updatedPages = pages.map((page) =>
        page.id === activePage.id
          ? { ...page, parentSlug: targetParentSlug }
          : page,
      );

      const oldIndex = updatedPages.findIndex((p) => p.id === active.id);
      const newIndex = updatedPages.findIndex(
        (p) => p.id === dropTarget.pageId,
      );
      let nextPages = updatedPages;
      if (oldIndex !== -1 && newIndex !== -1) {
        let targetIndex = newIndex;
        if (placement === "after") {
          targetIndex = newIndex + 1;
        }
        if (oldIndex < targetIndex) {
          targetIndex -= 1;
        }
        targetIndex = Math.max(
          0,
          Math.min(updatedPages.length - 1, targetIndex),
        );
        nextPages = arrayMove(updatedPages, oldIndex, targetIndex);
      }

      setPages(nextPages);
      saveOrder(nextPages.map((p) => p.id));

      const parentChanged =
        (activePage.parentSlug ?? null) !== targetParentSlug;
      if (!parentChanged) return;

      try {
        const updated = await updateWikiPage(activePage.slug, {
          title: activePage.title,
          description: activePage.description,
          content: activePage.content ?? "",
          mwsTableId: activePage.mwsTableId,
          parentSlug: targetParentSlug,
        });

        setPages((prev) =>
          prev.map((p) => (p.id === activePage.id ? { ...p, ...updated } : p)),
        );
      } catch (err) {
        setPages(oldPages);
        saveOrder(oldPages.map((p) => p.id));
        setModal({
          open: true,
          title: "Ошибка перемещения",
          description:
            err instanceof Error
              ? err.message
              : "Не удалось переместить элемент",
        });
      }
    },
    [bySlug, isAuthenticated, pages, resolvePlacement],
  );

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-7 px-6 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-[0_0_30px_rgba(255,255,255,0.08)]">
            <Image
              src="/branding/logo.png"
              alt="WikiLive logo"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="space-y-1">
            <h1 className="text-5xl font-bold tracking-tight">WikiLive</h1>
            <p className="text-xl text-muted-foreground">Страницы и папки</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            className="gap-2"
            disabled={isCreatingDocument || isCreatingFolder}
            onClick={() => void handleCreateInRoot(false)}
          >
            <Plus className="size-4" />
            {isCreatingDocument ? "Создание..." : "Новый документ"}
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            disabled={isCreatingDocument || isCreatingFolder}
            onClick={() => void handleCreateInRoot(true)}
          >
            <FolderPlus className="size-4" />
            {isCreatingFolder ? "Создание..." : "Новая папка"}
          </Button>
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

      {isLoading && (
        <div className="p-8 text-center text-muted-foreground">Загрузка...</div>
      )}

      {!isLoading && error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          <button
            type="button"
            className="font-medium hover:underline"
            onClick={() => void loadPages()}
          >
            {error}. Нажми для повтора.
          </button>
        </div>
      )}

      {!isLoading && !error && tree.length === 0 && (
        <div className="rounded-xl border-2 border-dashed p-16 text-center text-muted-foreground">
          Документов пока нет.
        </div>
      )}

      {!isLoading && !error && tree.length > 0 && (
        <section className="rounded-xl border bg-card p-3 shadow-sm">
          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={(event) => void handleDragEnd(event)}
            onDragCancel={() => {
              setActiveId(null);
              setOverTarget(null);
            }}
            modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
          >
            <SortableContext
              items={visibleRows.map((row) => row.page.id)}
              strategy={verticalListSortingStrategy}
            >
              {visibleRows.map((row) => (
                <Row
                  key={row.page.id}
                  row={row}
                  expanded={expanded}
                  onToggle={handleToggle}
                  folders={folders}
                  editingId={editingId}
                  editingTitle={editingTitle}
                  onStartRename={handleStartRename}
                  onChangeEditingTitle={setEditingTitle}
                  onCommitRename={handleCommitRename}
                  onCancelRename={handleCancelRename}
                  onMove={handleMove}
                  onCopyLink={handleCopyLink}
                  onDelete={handleDelete}
                  deletingId={deletingId}
                  overTarget={overTarget}
                  canManage={isAuthenticated}
                />
              ))}
            </SortableContext>

            <DragOverlay>
              {activeRow ? (
                <div className="rounded-md border bg-background/70 p-1 opacity-55 shadow-2xl">
                  <Row
                    row={activeRow}
                    expanded={expanded}
                    onToggle={handleToggle}
                    folders={folders}
                    editingId={editingId}
                    editingTitle={editingTitle}
                    onStartRename={handleStartRename}
                    onChangeEditingTitle={setEditingTitle}
                    onCommitRename={handleCommitRename}
                    onCancelRename={handleCancelRename}
                    onMove={handleMove}
                    onCopyLink={handleCopyLink}
                    onDelete={handleDelete}
                    deletingId={deletingId}
                    overTarget={overTarget}
                    isOverlay
                    canManage={isAuthenticated}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </section>
      )}

      <Dialog
        open={modal.open}
        onOpenChange={(open) => setModal((prev) => ({ ...prev, open }))}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{modal.title}</DialogTitle>
            <DialogDescription>{modal.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            {modal.onConfirm ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setModal((prev) => ({ ...prev, open: false }))}
                >
                  Отмена
                </Button>
                <Button
                  variant={modal.confirmVariant ?? "default"}
                  onClick={async () => {
                    const action = modal.onConfirm;
                    setModal((prev) => ({ ...prev, open: false }));
                    if (action) {
                      await action();
                    }
                  }}
                >
                  {modal.confirmLabel ?? "Подтвердить"}
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setModal((prev) => ({ ...prev, open: false }))}
              >
                Ок
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!isLoading && !error && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">Граф связей страниц</h2>
          <WikiPagesGraph />
        </section>
      )}

      <WikiLoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </main>
  );
}
