"use client";

import {
  Check,
  LoaderCircle,
  MoreHorizontal,
  Reply,
  ThumbsUp,
  X,
} from "lucide-react";
import {
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { cn } from "@/fsd/shared/lib/utils";
import { Button } from "@/fsd/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/fsd/shared/ui/dropdown-menu";
import { Textarea } from "@/fsd/shared/ui/textarea";

type Author = { id: string; name: string; color: string; handle: string };
type ThreadStatus = "open" | "resolved";
type ThreadComment = {
  id: string;
  author: Author;
  text: string;
  createdAt: string;
  edited: boolean;
  replyToId: string | null;
  likes: number;
  likedByMe: boolean;
  deleted: boolean;
};
type CommentThread = {
  id: string;
  quote: string;
  top: number;
  height: number;
  right: number;
  status: ThreadStatus;
  comments: ThreadComment[];
};
type SelectionDraft = {
  text: string;
  top: number;
  height: number;
  right: number;
};
type FrameBounds = {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
};
type PanelState = "idle" | "loading" | "ready" | "error";

function CommentGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className={cn("size-3.5", className)}
    >
      <path
        d="M3.09375 4.875C2.67954 4.875 2.34375 5.21079 2.34375 5.625C2.34375 6.03921 2.67954 6.375 3.09375 6.375C3.50796 6.375 3.84375 6.03921 3.84375 5.625C3.84375 5.21079 3.50796 4.875 3.09375 4.875Z"
        fill="currentColor"
      />
      <path
        d="M4.96875 5.625C4.96875 5.21079 5.30454 4.875 5.71875 4.875C6.13296 4.875 6.46875 5.21079 6.46875 5.625C6.46875 6.03921 6.13296 6.375 5.71875 6.375C5.30454 6.375 4.96875 6.03921 4.96875 5.625Z"
        fill="currentColor"
      />
      <path
        d="M8.34375 4.875C7.92954 4.875 7.59375 5.21079 7.59375 5.625C7.59375 6.03921 7.92954 6.375 8.34375 6.375C8.75796 6.375 9.09375 6.03921 9.09375 5.625C9.09375 5.21079 8.75796 4.875 8.34375 4.875Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M1.40625 1.875C0.888483 1.875 0.46875 2.29473 0.46875 2.8125V8.4375C0.46875 8.95527 0.888483 9.375 1.40625 9.375H3.96615L5.01805 10.5584C5.39098 10.9779 6.04652 10.9779 6.41945 10.5584L7.47135 9.375H10.0312C10.549 9.375 10.9688 8.95527 10.9688 8.4375V2.8125C10.9688 2.29473 10.549 1.875 10.0312 1.875H1.40625ZM1.59375 8.25V3H9.84375V8.25H7.38715C7.11936 8.25 6.86436 8.36451 6.68645 8.56466L5.71875 9.65333L4.75105 8.56466C4.57314 8.36451 4.31814 8.25 4.05035 8.25H1.59375Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ShareOutlinedGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={cn("size-4", className)}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18.0879 3.82236C18.5661 2.66547 17.408 1.5074 16.2511 1.98558L1.49429 8.08508C0.479449 8.50454 0.315469 9.87333 1.20252 10.5206L4.42016 12.8686C4.78766 13.1368 5.2622 13.2106 5.6938 13.0668L7.66319 12.4103L7.00673 14.3797C6.86286 14.8113 6.93668 15.2858 7.20486 15.6533L9.55286 18.871C10.2002 19.758 11.569 19.5941 11.9884 18.5792L18.0879 3.82236ZM2.98285 9.49866L15.9237 4.14975L10.5748 17.0906L8.86194 14.7433L9.73844 12.1138C10.1049 11.0145 9.059 9.96862 7.95965 10.3351L5.33017 11.2116L2.98285 9.49866Z"
        fill="currentColor"
      />
    </svg>
  );
}

const CURRENT_USER: Author = {
  id: "me",
  name: "Вы",
  handle: "you",
  color: "#57B9ED",
};
const STORAGE_PREFIX = "wikilive:threads";
const RAIL_OFFSET = 8;
const LANE_GAP = 24;
const COLLISION_GAP = 36;
const PANEL_INSET = 16;
const PANEL_GAP_FROM_MARKERS = 24;
const PANEL_GAP_FROM_CONTENT = 52;
const PANEL_MIN_WIDTH = 280;
const PANEL_MAX_WIDTH = 360;
const PANEL_FALLBACK_MIN_WIDTH = 220;
const SELECTION_MARKER_COLLISION_GAP = 48;
const MARKER_LINE_MIN_HEIGHT = 24;
const MARKER_LINE_MAX_HEIGHT = 120;
const COMMENT_MAX_LENGTH = 256;
const DRAFT_MIN_HEIGHT = 28;
const DRAFT_MAX_HEIGHT = 120;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function isClose(a: number, b: number, epsilon = 0.5) {
  return Math.abs(a - b) <= epsilon;
}

function id() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2, 12)}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function getCommentLabel(count: number) {
  const n = Math.abs(count);
  const last = n % 10;
  const lastTwo = n % 100;
  if (last === 1 && lastTwo !== 11) return `${count} комментарий`;
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14))
    return `${count} комментария`;
  return `${count} комментариев`;
}

function markerBadgeWidth(count: number) {
  if (count <= 0) return 20;
  return count > 9 ? 42 : 34;
}

function calculateLanes(threads: CommentThread[]) {
  const map = new Map<string, number>();
  const laneLastTop: number[] = [];
  const sorted = [...threads].sort((a, b) => a.top - b.top);
  for (const thread of sorted) {
    let lane = 0;
    while (
      lane < laneLastTop.length &&
      Math.abs(thread.top - laneLastTop[lane]) < COLLISION_GAP
    ) {
      lane += 1;
    }
    if (lane === laneLastTop.length) laneLastTop.push(thread.top);
    else laneLastTop[lane] = thread.top;
    map.set(thread.id, lane);
  }
  return map;
}

function readStorage(storageKey: string): CommentThread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as CommentThread[]) : [];
  } catch {
    return [];
  }
}

function createComment(text: string, replyToId: string | null): ThreadComment {
  return {
    id: id(),
    author: CURRENT_USER,
    text: text.trim(),
    createdAt: new Date().toISOString(),
    edited: false,
    replyToId,
    likes: 0,
    likedByMe: false,
    deleted: false,
  };
}

function getSelectionPayload(
  container: HTMLDivElement,
  panel: HTMLDivElement | null,
): SelectionDraft | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed)
    return null;
  const range = selection.getRangeAt(0);
  const selectedText = selection.toString().replaceAll(/\s+/g, " ").trim();
  if (!selectedText) return null;

  const ancestor = range.commonAncestorContainer;
  const node =
    ancestor.nodeType === Node.TEXT_NODE
      ? ancestor.parentElement
      : (ancestor as Element | null);
  if (!node || !container.contains(node) || panel?.contains(node)) return null;

  const rect = range.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  return {
    text: selectedText.slice(0, 220),
    top: clamp(rect.top - containerRect.top, 28, containerRect.height - 28),
    height: Math.max(rect.height, 18),
    right: clamp(rect.right - containerRect.left, 0, containerRect.width - 32),
  };
}

type MarkerProps = {
  id?: string;
  count: number;
  left: number;
  top: number;
  lineHeight: number;
  active: boolean;
  status: ThreadStatus;
  label: string;
  onClick: () => void;
  onHoverChange?: (id: string | null) => void;
};

function Marker({
  id,
  count,
  left,
  top,
  lineHeight,
  active,
  status,
  label,
  onClick,
  onHoverChange,
}: MarkerProps) {
  const hasComments = count > 0;
  const width = markerBadgeWidth(count);
  const badgeLeft = left + 8;
  const badgeTop = top;
  const lineTop = top;
  return (
    <>
      {hasComments ? (
        <div
          className={cn(
            "absolute w-[2px] rounded-full",
            status === "resolved" ? "bg-[#DDD8FB]" : "bg-[#D8D2FC]",
          )}
          style={{
            left,
            top: lineTop,
            height: Math.max(MARKER_LINE_MIN_HEIGHT, lineHeight - 4),
          }}
        />
      ) : null}
      <div
        className="absolute"
        style={{ left: badgeLeft, top: badgeTop, width }}
      >
        <div className="group relative flex justify-center">
          <button
            type="button"
            className={cn(
              "pointer-events-auto inline-flex items-center justify-center rounded-[8px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7BFF]/30",
              hasComments
                ? "h-7 gap-1 px-2 text-[11px] font-medium"
                : "size-5 rounded-[6px]",
              hasComments &&
                !active &&
                status === "open" &&
                "bg-[#8B7BFF] text-white hover:bg-[#CFC3FF] hover:text-[#6F58FF]",
              hasComments && active && "bg-[#D3C8FF] text-[#6F58FF]",
              hasComments &&
                status === "resolved" &&
                "bg-[#E7E2FF] text-white hover:bg-[#DBD3FF]",
              !hasComments &&
                "bg-transparent text-[#505762] hover:bg-[#EEE9FF] hover:text-[#6F58FF]",
            )}
            onClick={onClick}
            aria-label={label}
            onMouseEnter={() => {
              if (hasComments && id && onHoverChange) {
                onHoverChange(id);
              }
            }}
            onMouseLeave={() => {
              if (hasComments && onHoverChange) {
                onHoverChange(null);
              }
            }}
            onFocus={() => {
              if (hasComments && id && onHoverChange) {
                onHoverChange(id);
              }
            }}
            onBlur={() => {
              if (hasComments && onHoverChange) {
                onHoverChange(null);
              }
            }}
          >
            <CommentGlyph />
            {hasComments ? <span>{count}</span> : null}
          </button>
          <div className="pointer-events-none absolute -top-12 left-1/2 z-10 w-max -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100">
            <div className="relative rounded-[10px] bg-[#111216] px-3 py-2 text-[13px] font-medium text-white">
              {label}
              <span
                aria-hidden="true"
                className="absolute left-1/2 top-full -translate-x-1/2 border-x-[8px] border-x-transparent border-t-[8px] border-t-[#111216]"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function CommentThreadLauncher({
  children,
  storageKey = "default",
}: {
  children: ReactNode;
  storageKey?: string;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const draftTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const storage = useMemo(
    () => `${STORAGE_PREFIX}:${storageKey}`,
    [storageKey],
  );

  const [threads, setThreads] = useState<CommentThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [selectionDraft, setSelectionDraft] = useState<SelectionDraft | null>(
    null,
  );
  const [panelDraft, setPanelDraft] = useState<SelectionDraft | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [panelState, setPanelState] = useState<PanelState>("idle");
  const [draft, setDraft] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
  const [contentRight, setContentRight] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [frameBounds, setFrameBounds] = useState<FrameBounds | null>(null);

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? null,
    [threads, activeThreadId],
  );
  const lanes = useMemo(() => calculateLanes(threads), [threads]);

  useEffect(() => {
    setThreads(readStorage(storage));
  }, [storage]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storage, JSON.stringify(threads));
  }, [storage, threads]);

  const openThread = useCallback((threadId: string) => {
    setIsPanelOpen(true);
    setActiveThreadId(threadId);
    setPanelDraft(null);
    setSelectionDraft(null);
    setDraft("");
    setReplyToId(null);
    setEditingId(null);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setPanelState("ready");
  }, []);

  const updateGeometry = useCallback(() => {
    const container = rootRef.current;
    if (!(container instanceof HTMLElement)) return;
    const frame =
      container.querySelector("[data-comment-content-frame]") ??
      container.firstElementChild;
    if (!(frame instanceof HTMLElement)) return;
    const containerRect = container.getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();
    const nextContainerWidth = containerRect.width;
    const nextFrameBounds = {
      top: Math.max(frameRect.top - containerRect.top, 0),
      left: Math.max(frameRect.left - containerRect.left, 0),
      right: Math.max(containerRect.right - frameRect.right, 0),
      bottom: Math.max(containerRect.bottom - frameRect.bottom, 0),
      width: frameRect.width,
    };
    setContainerWidth((prev) =>
      isClose(prev, nextContainerWidth) ? prev : nextContainerWidth,
    );
    setFrameBounds((prev) => {
      if (
        prev &&
        isClose(prev.top, nextFrameBounds.top) &&
        isClose(prev.left, nextFrameBounds.left) &&
        isClose(prev.right, nextFrameBounds.right) &&
        isClose(prev.bottom, nextFrameBounds.bottom) &&
        isClose(prev.width, nextFrameBounds.width)
      ) {
        return prev;
      }
      return nextFrameBounds;
    });
    const content = container.querySelector(".ContentEditable__root");
    if (content instanceof HTMLElement) {
      const contentRect = content.getBoundingClientRect();
      const nextContentRight = clamp(
        contentRect.right - containerRect.left,
        0,
        frameRect.right - containerRect.left,
      );
      setContentRight((prev) =>
        prev !== null && isClose(prev, nextContentRight)
          ? prev
          : nextContentRight,
      );
    }
  }, []);

  useEffect(() => {
    const container = rootRef.current;
    if (!container) return;
    const onMouseUp = () =>
      window.setTimeout(
        () =>
          setSelectionDraft(getSelectionPayload(container, panelRef.current)),
        0,
      );
    const onKeyUp = () =>
      window.setTimeout(
        () =>
          setSelectionDraft(getSelectionPayload(container, panelRef.current)),
        0,
      );
    container.addEventListener("mouseup", onMouseUp);
    container.addEventListener("keyup", onKeyUp);
    return () => {
      container.removeEventListener("mouseup", onMouseUp);
      container.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    const container = rootRef.current;
    if (!container) return;
    updateGeometry();
    const observer = new ResizeObserver(updateGeometry);
    observer.observe(container);
    const content = container.querySelector(".ContentEditable__root");
    if (content instanceof HTMLElement) observer.observe(content);
    window.addEventListener("resize", updateGeometry);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateGeometry);
    };
  }, [updateGeometry]);

  const markers = useMemo(() => {
    if (contentRight === null) {
      return [];
    }
    return threads.map((thread) => {
      const lane = lanes.get(thread.id) ?? 0;
      const left = contentRight + RAIL_OFFSET + lane * LANE_GAP;
      const count = thread.comments.filter((item) => !item.deleted).length;
      return { thread, left, count };
    });
  }, [threads, lanes, contentRight]);

  const maxThreadMarkerEdge = useMemo(() => {
    const edges = markers.map((item) => {
      const badgeWidth = markerBadgeWidth(item.count);
      const badgeLeft = item.left + 8;
      return badgeLeft + badgeWidth;
    });
    return edges.length > 0 ? Math.max(...edges) : (contentRight ?? 0);
  }, [markers, contentRight]);

  const hasSelectionMarkerCollision = useMemo(() => {
    if (!selectionDraft) return false;
    return markers.some(
      ({ thread }) =>
        Math.abs(thread.top - selectionDraft.top) <
        SELECTION_MARKER_COLLISION_GAP,
    );
  }, [markers, selectionDraft]);

  const shouldShowSelectionMarker = useMemo(() => {
    if (!selectionDraft || contentRight === null) return false;
    if (hoveredMarkerId !== null) return false;
    if (hasSelectionMarkerCollision) return false;
    return true;
  }, [
    selectionDraft,
    contentRight,
    hoveredMarkerId,
    hasSelectionMarkerCollision,
  ]);

  const frameRight = frameBounds
    ? containerWidth - frameBounds.right
    : containerWidth;
  const panelRightEdge = frameRight - PANEL_INSET;
  const hardPanelLeftStart = (frameBounds?.left ?? 0) + PANEL_INSET;
  const contentPanelLeftStart = Math.max(
    hardPanelLeftStart,
    (contentRight ?? 0) + PANEL_GAP_FROM_CONTENT,
  );
  const preferredPanelLeftStart = Math.max(
    contentPanelLeftStart,
    maxThreadMarkerEdge + PANEL_GAP_FROM_MARKERS,
  );
  const preferredAvailable = panelRightEdge - preferredPanelLeftStart;
  const contentAvailable = panelRightEdge - contentPanelLeftStart;
  const maxPossibleWidth = Math.max(0, panelRightEdge - hardPanelLeftStart);
  const panelAvailable =
    preferredAvailable >= PANEL_MIN_WIDTH
      ? preferredAvailable
      : contentAvailable;
  const panelWidth = Math.max(
    0,
    Math.min(
      PANEL_MAX_WIDTH,
      maxPossibleWidth,
      Math.max(PANEL_FALLBACK_MIN_WIDTH, panelAvailable),
    ),
  );
  const panelLeft = panelRightEdge - panelWidth;

  const submitComment = () => {
    const text = draft.trim().slice(0, COMMENT_MAX_LENGTH);
    if (!text) return;
    if (panelDraft || selectionDraft) {
      const source = panelDraft ?? selectionDraft;
      if (!source) return;
      const next: CommentThread = {
        id: id(),
        quote: source.text,
        top: source.top,
        height: source.height,
        right: source.right,
        status: "open",
        comments: [createComment(text, null)],
      };
      setThreads((prev) => [...prev, next]);
      setActiveThreadId(next.id);
      setPanelDraft(null);
      setSelectionDraft(null);
      setIsPanelOpen(true);
      setPanelState("ready");
      setDraft("");
      window.requestAnimationFrame(resizeDraftTextarea);
      return;
    }
    if (!activeThreadId || activeThread?.status === "resolved") return;
    setThreads((prev) =>
      prev.map((thread) =>
        thread.id === activeThreadId
          ? {
              ...thread,
              comments: [...thread.comments, createComment(text, replyToId)],
            }
          : thread,
      ),
    );
    setDraft("");
    setReplyToId(null);
    window.requestAnimationFrame(resizeDraftTextarea);
  };

  const handleDraftKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitComment();
    }
  };

  const resizeDraftTextarea = useCallback(() => {
    const element = draftTextareaRef.current;
    if (!element) return;
    if (element.value.length === 0) {
      element.style.height = `${DRAFT_MIN_HEIGHT}px`;
      return;
    }
    element.style.height = "auto";
    element.style.height = `${clamp(
      element.scrollHeight,
      DRAFT_MIN_HEIGHT,
      DRAFT_MAX_HEIGHT,
    )}px`;
  }, []);

  const handleDraftChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(event.target.value.slice(0, COMMENT_MAX_LENGTH));
    window.requestAnimationFrame(resizeDraftTextarea);
  };

  return (
    <div
      ref={rootRef}
      className="relative flex h-full min-h-0 w-full flex-1 overflow-hidden"
    >
      {children}
      <div className="pointer-events-none absolute inset-0 z-30">
        {markers.map(({ thread, left, count }) => (
          <Marker
            id={thread.id}
            key={thread.id}
            count={count}
            left={left}
            top={thread.top}
            lineHeight={clamp(
              thread.height,
              MARKER_LINE_MIN_HEIGHT,
              MARKER_LINE_MAX_HEIGHT,
            )}
            active={activeThreadId === thread.id && isPanelOpen}
            status={thread.status}
            label={`Показать ${getCommentLabel(count)}`}
            onClick={() => openThread(thread.id)}
            onHoverChange={setHoveredMarkerId}
          />
        ))}
        {shouldShowSelectionMarker &&
        selectionDraft &&
        contentRight !== null ? (
          <Marker
            count={0}
            left={contentRight + RAIL_OFFSET}
            top={selectionDraft.top}
            lineHeight={clamp(
              selectionDraft.height,
              MARKER_LINE_MIN_HEIGHT,
              MARKER_LINE_MAX_HEIGHT,
            )}
            active={false}
            status="open"
            label="Начать обсуждение"
            onClick={() => {
              setActiveThreadId(null);
              setPanelDraft(selectionDraft);
              setSelectionDraft(null);
              setIsPanelOpen(true);
              setPanelState("ready");
              setReplyToId(null);
              setEditingId(null);
            }}
          />
        ) : null}
      </div>

      {isPanelOpen && panelWidth > 0 && frameBounds ? (
        <div
          className="pointer-events-none absolute z-20 hidden sm:block"
          style={{
            top: frameBounds.top + PANEL_INSET,
            left: panelLeft,
            width: panelWidth,
            bottom: frameBounds.bottom + PANEL_INSET,
          }}
        >
          <aside
            ref={panelRef}
            className="pointer-events-auto flex h-full w-full flex-col overflow-hidden rounded-[12px] border border-[#DDE1EB] bg-[#F5F6F9] shadow-[0_2px_10px_rgba(28,39,63,0.06)]"
          >
            <header className="border-b border-[#E3E6EF] px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-[16px] font-semibold text-[#2F3440]">
                    Комментарии
                  </h2>
                  <p className="mt-1 line-clamp-2 text-[12px] text-[#7F8798]">
                    {activeThread?.quote ??
                      panelDraft?.text ??
                      "Выберите место в тексте"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {activeThread ? (
                    <button
                      type="button"
                      className={cn(
                        "inline-flex size-6 items-center justify-center rounded-full transition-colors",
                        activeThread.status === "resolved"
                          ? "text-[#7D6EEA] hover:bg-[#ECE8FF]"
                          : "text-[#B2B8C8] hover:bg-[#EEF1F7] hover:text-[#7E8698]",
                      )}
                      onClick={() =>
                        setThreads((prev) =>
                          prev.map((thread) =>
                            thread.id === activeThread.id
                              ? {
                                  ...thread,
                                  status:
                                    thread.status === "open"
                                      ? "resolved"
                                      : "open",
                                }
                              : thread,
                          ),
                        )
                      }
                    >
                      <Check className="size-4" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="inline-flex size-6 items-center justify-center rounded-full text-[#BAC0CF] transition-colors hover:bg-[#EEF1F7] hover:text-[#7E8698]"
                    onClick={() => {
                      setIsPanelOpen(false);
                      setActiveThreadId(null);
                      setPanelDraft(null);
                    }}
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
            </header>

            <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {panelState === "loading" ? (
                <div className="flex h-full min-h-48 items-center justify-center">
                  <LoaderCircle className="size-10 animate-spin text-[#8B7BFF]" />
                </div>
              ) : null}
              {panelState === "error" ? (
                <div className="flex h-full min-h-48 flex-col items-center justify-center gap-3 text-center">
                  <p className="max-w-[180px] text-[13px] text-[#8A91A1]">
                    Не удалось загрузить комментарии. Попробуйте еще раз
                  </p>
                  <button
                    type="button"
                    className="inline-flex h-8 items-center rounded-[6px] bg-[#8B7BFF] px-3 text-[12px] font-medium text-white hover:bg-[#7A68F2]"
                    onClick={() => setPanelState("loading")}
                  >
                    Загрузить повторно
                  </button>
                </div>
              ) : null}
              {panelState === "ready" ? (
                (activeThread?.comments.length ?? 0) === 0 ? (
                  <div className="flex h-full min-h-48 items-center justify-center text-[14px] text-[#8E95A6]">
                    Нет комментариев
                  </div>
                ) : (
                  <div>
                    {activeThread?.comments.map((comment, index) => {
                      const reply = comment.replyToId
                        ? (activeThread.comments.find(
                            (item) => item.id === comment.replyToId,
                          ) ?? null)
                        : null;
                      const isEditing = editingId === comment.id;
                      return (
                        <article
                          key={comment.id}
                          className={cn(
                            "group/comment py-3",
                            index > 0 ? "border-t border-[#E1E6EE]" : "",
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className="mt-0.5 inline-flex size-7 items-center justify-center rounded-full text-[12px] font-medium text-white"
                              style={{
                                backgroundColor: comment.author.color,
                              }}
                            >
                              {initials(comment.author.name)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-[13px] font-medium text-[#2F3440]">
                                    {comment.author.name}
                                  </p>
                                  <p className="text-[11px] text-[#9AA2B3]">
                                    {formatDate(comment.createdAt)}
                                    {comment.edited ? " · изменено" : ""}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover/comment:opacity-100">
                                  <button
                                    type="button"
                                    className="inline-flex size-6 items-center justify-center rounded-[6px] text-[#8E95A6] hover:bg-[#EEF1F7]"
                                    onClick={() => setReplyToId(comment.id)}
                                  >
                                    <Reply className="size-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    className={cn(
                                      "inline-flex size-6 items-center justify-center rounded-[6px]",
                                      comment.likedByMe
                                        ? "text-[#7D6EEA] hover:bg-[#EBE7FF]"
                                        : "text-[#8E95A6] hover:bg-[#EEF1F7]",
                                    )}
                                    onClick={() =>
                                      setThreads((prev) =>
                                        prev.map((thread) =>
                                          thread.id === activeThread.id
                                            ? {
                                                ...thread,
                                                comments: thread.comments.map(
                                                  (item) =>
                                                    item.id === comment.id
                                                      ? {
                                                          ...item,
                                                          likedByMe:
                                                            !item.likedByMe,
                                                          likes: item.likedByMe
                                                            ? Math.max(
                                                                0,
                                                                item.likes - 1,
                                                              )
                                                            : item.likes + 1,
                                                        }
                                                      : item,
                                                ),
                                              }
                                            : thread,
                                        ),
                                      )
                                    }
                                  >
                                    <ThumbsUp className="size-3.5" />
                                  </button>
                                  {comment.author.id === "me" ? (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button
                                          type="button"
                                          className="inline-flex size-6 items-center justify-center rounded-[6px] text-[#8E95A6] hover:bg-[#EEF1F7]"
                                        >
                                          <MoreHorizontal className="size-3.5" />
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent
                                        align="end"
                                        className="min-w-[138px] rounded-[10px]"
                                      >
                                        <DropdownMenuItem
                                          onSelect={(event) => {
                                            event.preventDefault();
                                            setEditingId(comment.id);
                                            setEditingText(comment.text);
                                          }}
                                        >
                                          Редактировать
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          variant="destructive"
                                          onSelect={(event) => {
                                            event.preventDefault();
                                            setThreads((prev) =>
                                              prev.map((thread) =>
                                                thread.id === activeThread.id
                                                  ? {
                                                      ...thread,
                                                      comments:
                                                        thread.comments.map(
                                                          (item) =>
                                                            item.id ===
                                                            comment.id
                                                              ? {
                                                                  ...item,
                                                                  deleted: true,
                                                                  text: "Комментарий удален",
                                                                  edited: true,
                                                                }
                                                              : item,
                                                        ),
                                                    }
                                                  : thread,
                                              ),
                                            );
                                          }}
                                        >
                                          Удалить
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  ) : null}
                                </div>
                              </div>
                              {reply ? (
                                <div className="mt-2 rounded-[8px] border border-[#DADFEA] bg-white/80 px-2 py-1.5">
                                  <p className="text-[10px] text-[#8A90A1]">
                                    @{reply.author.handle}
                                  </p>
                                  <p className="truncate text-[11px] text-[#6B7284]">
                                    {reply.text}
                                  </p>
                                </div>
                              ) : null}
                              {isEditing ? (
                                <div className="mt-2 rounded-[10px] border border-[#DDE3EF] bg-white px-2 py-2">
                                  <Textarea
                                    rows={2}
                                    value={editingText}
                                    onChange={(event) =>
                                      setEditingText(
                                        event.target.value.slice(
                                          0,
                                          COMMENT_MAX_LENGTH,
                                        ),
                                      )
                                    }
                                    maxLength={COMMENT_MAX_LENGTH}
                                    className="min-h-14 resize-none border-0 bg-transparent px-0 py-0 text-[13px] text-[#2F3440] shadow-none placeholder:text-[#B2B8C5] focus-visible:border-0 focus-visible:ring-0"
                                  />
                                  <div className="mt-2 flex justify-end gap-2">
                                    <button
                                      type="button"
                                      className="inline-flex h-7 items-center rounded-[6px] px-2 text-[11px] text-[#7E8799] hover:bg-[#EEF1F7]"
                                      onClick={() => {
                                        setEditingId(null);
                                        setEditingText("");
                                      }}
                                    >
                                      Отмена
                                    </button>
                                    <button
                                      type="button"
                                      className="inline-flex h-7 items-center rounded-[6px] bg-[#E8ECF7] px-2 text-[11px] text-[#5D6681] hover:bg-[#DEE4F2]"
                                      onClick={() => {
                                        if (!editingText.trim()) return;
                                        setThreads((prev) =>
                                          prev.map((thread) =>
                                            thread.id === activeThread.id
                                              ? {
                                                  ...thread,
                                                  comments: thread.comments.map(
                                                    (item) =>
                                                      item.id === comment.id
                                                        ? {
                                                            ...item,
                                                            text: editingText
                                                              .trim()
                                                              .slice(
                                                                0,
                                                                COMMENT_MAX_LENGTH,
                                                              ),
                                                            edited: true,
                                                          }
                                                        : item,
                                                  ),
                                                }
                                              : thread,
                                          ),
                                        );
                                        setEditingId(null);
                                        setEditingText("");
                                      }}
                                    >
                                      Сохранить
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p
                                  className={cn(
                                    "mt-1 whitespace-pre-wrap break-words text-[13px] leading-5 text-[#444B5A]",
                                    comment.deleted
                                      ? "italic text-[#7D8597]"
                                      : "",
                                  )}
                                >
                                  {comment.text}
                                </p>
                              )}
                              {comment.likes > 0 ? (
                                <div className="mt-1 flex justify-end">
                                  <span className="inline-flex items-center gap-1 rounded-[6px] px-1.5 text-[12px] text-[#7D6EEA]">
                                    <span>{comment.likes}</span>
                                    <ThumbsUp className="size-3.5" />
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )
              ) : null}
            </div>

            <footer className="border-t border-[#E3E6EF] px-4 py-3">
              {replyToId && activeThread ? (
                <div className="mb-2 rounded-[8px] border border-[#DDE3EF] bg-white/80 px-2 py-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] text-[#8A90A1]">Ответ</p>
                      <p className="truncate text-[11px] text-[#6B7284]">
                        {activeThread.comments.find(
                          (item) => item.id === replyToId,
                        )?.text ?? ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex size-5 items-center justify-center rounded-full text-[#9AA2B3] hover:bg-[#EEF1F7]"
                      onClick={() => setReplyToId(null)}
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                </div>
              ) : null}
              {activeThread?.status === "resolved" ? (
                <p className="mb-2 rounded-[8px] bg-[#ECE8FF] px-2 py-1.5 text-[12px] text-[#6A5ED3]">
                  Ветка решена. Нажмите галочку вверху, чтобы снова открыть
                  обсуждение.
                </p>
              ) : null}
              <div className="flex items-end gap-2">
                <Textarea
                  ref={draftTextareaRef}
                  rows={1}
                  value={draft}
                  onChange={handleDraftChange}
                  onInput={resizeDraftTextarea}
                  onKeyDown={handleDraftKeyDown}
                  maxLength={COMMENT_MAX_LENGTH}
                  placeholder={
                    activeThread?.status === "resolved"
                      ? "Ветка отмечена как решенная"
                      : "Новый комментарий"
                  }
                  disabled={
                    panelState !== "ready" ||
                    activeThread?.status === "resolved"
                  }
                  className="min-h-6 max-h-[120px] resize-none overflow-y-hidden border-0 bg-transparent px-0 py-0 text-[13px] leading-5 text-[#5A6273] shadow-none placeholder:text-[#B2B8C5] focus-visible:border-0 focus-visible:ring-0"
                />
                <Button
                  type="button"
                  size="icon-sm"
                  className="mb-0.5 rounded-full bg-transparent text-[#798296] shadow-none hover:bg-[#EDEFF4] hover:text-[#636E82]"
                  onClick={submitComment}
                  disabled={
                    panelState !== "ready" ||
                    draft.trim().length === 0 ||
                    activeThread?.status === "resolved"
                  }
                >
                  <ShareOutlinedGlyph />
                </Button>
              </div>
            </footer>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
