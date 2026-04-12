"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import type { DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis, restrictToWindowEdges } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { FileText, GripVertical, Plus, Share2 } from "lucide-react";

import { fetchWikiPages } from "@/fsd/shared/lib/wiki-pages/api";
import type { WikiPage } from "@/fsd/shared/lib/wiki-pages/types";
import { Button } from "@/fsd/shared/ui/button";

const LOCAL_ORDER_KEY = "wikilive:docs-order:v1";

function readSavedOrder(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_ORDER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is number => Number.isInteger(id)) : [];
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
    const p = map.get(id);
    if (p) { ordered.push(p); map.delete(id); }
  }
  return [...ordered, ...map.values()];
}

interface SortableTableRowProps {
  page: WikiPage;
  isOverlay?: boolean;
}

function SortableTableRow({ page, isOverlay }: SortableTableRowProps) {
  const router = useRouter();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (!isOverlay && !isDragging) router.push(`/wiki/${page.slug}`);
      }}
      className={`border-t transition-colors cursor-pointer group ${
        isDragging ? "opacity-30 bg-muted/50" : "hover:bg-muted/5 shadow-none"
      } ${isOverlay ? "bg-background shadow-xl opacity-100 table-row z-50 border ring-1 ring-primary/10" : ""}`}
    >
      <td className="w-12 px-3 py-4">
        <div className="flex items-center justify-center p-1 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors outline-none rounded-md w-fit">
          <GripVertical className="size-4" />
        </div>
      </td>
      <td className="px-4 py-4 min-w-[200px]">
        <div className="flex items-center gap-3">
          <span className={`font-medium text-foreground block truncate ${!isOverlay ? "group-hover:text-primary transition-colors" : ""}`}>
            {page.title}
          </span>
        </div>
      </td>
      <td className="w-1/3 px-4 py-4 text-muted-foreground text-sm truncate max-w-[350px]">
        {page.description || "—"}
      </td>
    </tr>
  );
}

/**
 * List of Wiki documents with drag-and-drop sorting.
 */
export default function WikiPagesPage() {
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const initialOrderRef = useRef<number[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const loadPages = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchWikiPages();
      const savedIds = readSavedOrder();
      const ordered = applySavedOrder(data, savedIds);
      setPages(ordered);
      saveOrder(ordered.map((p) => p.id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить документы");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadPages(); }, [loadPages]);

  const handleDragStart = (event: DragStartEvent) => {
    initialOrderRef.current = pages.map((p) => p.id);
    setActiveId(event.active.id as number);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const oldIndex = pages.findIndex((p) => p.id === active.id);
    const newIndex = pages.findIndex((p) => p.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const nextPages = arrayMove(pages, oldIndex, newIndex);
      setPages(nextPages);
      saveOrder(nextPages.map((p) => p.id));
    }
  };

  const activePage = useMemo(() => pages.find((p) => p.id === activeId), [activeId, pages]);

  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.4" } } }),
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-12">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight">WikiLive</h1>
          <p className="text-muted-foreground text-lg">Живые таблицы в тексте</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/workbench">
            <Button variant="outline" size="sm">Workbench</Button>
          </Link>
          <Link href="/wiki/new">
            <Button className="gap-2 shadow-sm">
              <Plus className="size-4" />
              Новый документ
            </Button>
          </Link>
        </div>
      </header>

      {isLoading && <div className="p-8 text-center text-muted-foreground animate-pulse">Загрузка документов...</div>}

      {!isLoading && error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-destructive flex items-center gap-3">
           <span className="font-semibold text-lg hover:underline cursor-pointer" onClick={() => void loadPages()}>
             ⚠️ {error}. Нажмите, чтобы повторить.
           </span>
        </div>
      )}

      {!isLoading && !error && pages.length === 0 && (
        <div className="rounded-xl border-2 border-dashed p-16 text-center space-y-4">
          <p className="text-muted-foreground text-lg">Документов пока нет. Создайте первый документ WikiLive!</p>
          <Link href="/wiki/new">
            <Button variant="secondary">Создать документ</Button>
          </Link>
        </div>
      )}

      {!isLoading && !error && pages.length > 0 && (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveId(null)}
            modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
          >
            <table className="table-fixed w-full text-sm text-left border-collapse">
              <thead className="bg-muted/30 border-b">
                <tr>
                  <th className="w-12 px-3 py-4" />
                  <th className="px-4 py-4 font-semibold text-foreground uppercase tracking-wider text-xs">Документ</th>
                  <th className="w-1/3 px-4 py-4 font-semibold text-foreground uppercase tracking-wider text-xs">Описание</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                <SortableContext items={pages} strategy={verticalListSortingStrategy}>
                  {pages.map((page) => (
                    <SortableTableRow key={page.id} page={page} />
                  ))}
                </SortableContext>
              </tbody>
            </table>
            <DragOverlay dropAnimation={dropAnimation}>
              {activePage ? (
                <table className="table-fixed w-full text-sm bg-background/95 backdrop-blur-sm shadow-2xl rounded-lg border">
                  <tbody>
                    <SortableTableRow page={activePage} isOverlay />
                  </tbody>
                </table>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}
    </main>
  );
}
