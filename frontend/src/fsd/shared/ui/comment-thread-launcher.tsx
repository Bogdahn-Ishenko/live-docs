"use client";

import {
  Check,
  LoaderCircle,
  MoreHorizontal,
  Reply,
  ThumbsUp,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import {
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { cn } from "@/fsd/shared/lib/utils";
import {
  type CommentThread as ApiCommentThread,
  addCommentMessage,
  createCommentThread,
  fetchCommentThreads,
  importCommentThreads,
  patchCommentMessage,
  patchCommentThread,
} from "@/fsd/shared/lib/wiki-pages/comments-api";
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
type DemoActor = { id: string; name: string };

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
const DEMO_USER_ID_STORAGE_KEY = "wikilive:demo-user-id";
const DEMO_USER_NAME_STORAGE_KEY = "wikilive:demo-user-name";
const LIKED_COMMENTS_STORAGE_PREFIX = "wikilive:liked-comments";
const DEMO_USERS: DemoActor[] = [
  { id: "ivan", name: "Иван Иванов" },
  { id: "sergey", name: "Сергей Иванов" },
  { id: "anna", name: "Анна Карпова" },
];
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
const REMOTE_POLL_INTERVAL_MS = 3000;

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

function getAuthorColor(authorId: string) {
  const palette = [
    "#57B9ED",
    "#6F68E8",
    "#F4BE3A",
    "#5BC786",
    "#8D93A6",
    "#F19066",
  ];
  let hash = 0;
  for (let i = 0; i < authorId.length; i += 1) {
    hash = (hash << 5) - hash + authorId.charCodeAt(i);
    hash |= 0;
  }
  return palette[Math.abs(hash) % palette.length];
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

function normalizeThreadNumber(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

function getThreadSignature(thread: CommentThread): string {
  const visibleComments = thread.comments
    .filter((comment) => !comment.deleted && comment.text.trim().length > 0)
    .map((comment) => comment.text.trim())
    .join("||");

  return [
    thread.quote.trim(),
    Math.round(normalizeThreadNumber(thread.top, 0)),
    Math.round(normalizeThreadNumber(thread.height, 22)),
    Math.round(normalizeThreadNumber(thread.right, 0)),
    visibleComments,
  ].join("|");
}

function mapApiThreadToUi(thread: ApiCommentThread): CommentThread {
  return {
    ...thread,
    comments: thread.comments.map((comment) => ({
      ...comment,
      author: {
        ...comment.author,
        color: getAuthorColor(comment.author.id),
      },
    })),
  };
}

function getLikedCommentsStorageKey(actorId: string) {
  return `${LIKED_COMMENTS_STORAGE_PREFIX}:${actorId}`;
}

function readLikedComments(actorId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(
      getLikedCommentsStorageKey(actorId),
    );
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed.filter((item): item is string => typeof item === "string"),
    );
  } catch {
    return new Set();
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
  content: HTMLElement | null,
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
  const contentRect = content?.getBoundingClientRect();
  const scrollTop = content?.scrollTop ?? 0;
  const logicalTop = contentRect
    ? rect.top - contentRect.top + scrollTop
    : rect.top - containerRect.top;
  return {
    text: selectedText.slice(0, 220),
    top: Math.max(logicalTop, 0),
    height: Math.max(rect.height, 18),
    right: clamp(rect.right - containerRect.left, 0, containerRect.width - 32),
  };
}

function resolveEditorContentElement(
  container: HTMLElement,
): HTMLElement | null {
  const byLegacyClass = container.querySelector(".ContentEditable__root");
  if (byLegacyClass instanceof HTMLElement) return byLegacyClass;

  const frame = container.querySelector("[data-comment-content-frame]");
  if (frame instanceof HTMLElement) {
    const editableInFrame = frame.querySelector('[contenteditable="true"]');
    if (editableInFrame instanceof HTMLElement) return editableInFrame;
  }

  const editable = container.querySelector('[contenteditable="true"]');
  if (editable instanceof HTMLElement) return editable;

  return null;
}

type MarkerProps = {
  id?: string;
  count: number;
  left: number;
  top: number;
  lineHeight: number;
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
                status === "open" &&
                "bg-[#8B7BFF] text-white hover:bg-[#CFC3FF] hover:text-[#6F58FF]",
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
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLElement | null>(null);
  const draftTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const pollInFlightRef = useRef(false);
  const didAttemptLegacySyncRef = useRef(false);
  const storage = useMemo(
    () => `${STORAGE_PREFIX}:${storageKey}`,
    [storageKey],
  );
  const remoteCacheStorage = useMemo(
    () => `${STORAGE_PREFIX}:remote:${storageKey}`,
    [storageKey],
  );
  const pageSlug = useMemo(() => {
    if (storageKey.startsWith("wiki-")) {
      const byStorage = storageKey.slice(5).trim();
      if (byStorage.length > 0) return byStorage;
    }

    if (pathname.startsWith("/wiki/")) {
      const byPath = pathname.slice("/wiki/".length).trim();
      if (byPath.length > 0 && byPath.toLowerCase() !== "new") {
        try {
          return decodeURIComponent(byPath);
        } catch {
          return byPath;
        }
      }
    }

    return null;
  }, [pathname, storageKey]);
  const isRemoteMode = pageSlug !== null && pageSlug.length > 0;

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
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
  const [contentRight, setContentRight] = useState<number | null>(null);
  const [contentScrollTop, setContentScrollTop] = useState(0);
  const [contentTopOffset, setContentTopOffset] = useState(0);
  const [contentEl, setContentEl] = useState<HTMLElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [frameBounds, setFrameBounds] = useState<FrameBounds | null>(null);
  const [demoActor, setDemoActor] = useState<DemoActor>(DEMO_USERS[0]);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [likedCommentIds, setLikedCommentIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [pendingLikeIds, setPendingLikeIds] = useState<Set<string>>(
    () => new Set(),
  );
  const likedCommentIdsRef = useRef<Set<string>>(new Set());

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? null,
    [threads, activeThreadId],
  );
  const activeVisibleComments = useMemo(
    () => activeThread?.comments.filter((comment) => !comment.deleted) ?? [],
    [activeThread],
  );
  const editingComment = useMemo(
    () =>
      activeVisibleComments.find((comment) => comment.id === editingId) ?? null,
    [activeVisibleComments, editingId],
  );
  const lanes = useMemo(() => calculateLanes(threads), [threads]);
  const isMarkerGeometryReady =
    contentEl !== null && contentRight !== null && frameBounds !== null;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedId = window.localStorage.getItem(DEMO_USER_ID_STORAGE_KEY);
    const savedName = window.localStorage.getItem(DEMO_USER_NAME_STORAGE_KEY);
    if (!savedId || !savedName) return;
    setDemoActor({ id: savedId, name: savedName });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(DEMO_USER_ID_STORAGE_KEY, demoActor.id);
    window.localStorage.setItem(DEMO_USER_NAME_STORAGE_KEY, demoActor.name);
  }, [demoActor]);

  useEffect(() => {
    setLikedCommentIds(readLikedComments(demoActor.id));
  }, [demoActor.id]);

  useEffect(() => {
    likedCommentIdsRef.current = likedCommentIds;
  }, [likedCommentIds]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      getLikedCommentsStorageKey(demoActor.id),
      JSON.stringify([...likedCommentIds]),
    );
  }, [demoActor.id, likedCommentIds]);

  useEffect(() => {
    if (isRemoteMode) return;
    setThreads(readStorage(storage));
  }, [isRemoteMode, storage]);

  useEffect(() => {
    if (isRemoteMode || typeof window === "undefined") return;
    window.localStorage.setItem(storage, JSON.stringify(threads));
  }, [isRemoteMode, storage, threads]);

  const applyThreadUpdate = useCallback(
    (updater: SetStateAction<CommentThread[]>) => {
      setThreads((prev) => {
        const next =
          typeof updater === "function"
            ? (updater as (threads: CommentThread[]) => CommentThread[])(prev)
            : updater;
        return next;
      });
    },
    [],
  );

  const getLikeKey = useCallback(
    (threadId: string, messageId: string) =>
      `${storageKey}:${threadId}:${messageId}`,
    [storageKey],
  );

  const applyLikedState = useCallback(
    (thread: CommentThread): CommentThread => ({
      ...thread,
      comments: thread.comments.map((comment) => ({
        ...comment,
        likedByMe: likedCommentIdsRef.current.has(
          getLikeKey(thread.id, comment.id),
        ),
      })),
    }),
    [getLikeKey],
  );

  const syncLocalThreadsToRemote = useCallback(
    async (remoteThreads: CommentThread[]): Promise<CommentThread[] | null> => {
      if (!isRemoteMode || !pageSlug) return null;

      const legacyThreads = readStorage(storage);
      const cachedRemoteThreads = readStorage(remoteCacheStorage);
      const localCandidates = [...legacyThreads, ...cachedRemoteThreads];
      if (localCandidates.length === 0) return null;

      const knownSignatures = new Set(remoteThreads.map(getThreadSignature));
      const importCandidates: CommentThread[] = [];

      for (const localThread of localCandidates) {
        const signature = getThreadSignature(localThread);
        if (knownSignatures.has(signature)) continue;

        const visibleComments = localThread.comments.filter(
          (comment) => !comment.deleted && comment.text.trim().length > 0,
        );
        if (visibleComments.length === 0) continue;

        importCandidates.push({
          ...localThread,
          quote: localThread.quote.slice(0, 220),
          top: normalizeThreadNumber(localThread.top, 0),
          height: Math.round(
            clamp(normalizeThreadNumber(localThread.height, 22), 0, 400),
          ),
          right: Math.max(
            0,
            Math.round(normalizeThreadNumber(localThread.right, 0)),
          ),
          comments: visibleComments.map((comment) => ({
            ...comment,
            text: comment.text.trim().slice(0, COMMENT_MAX_LENGTH),
          })),
        });
        knownSignatures.add(signature);
      }

      if (importCandidates.length === 0) return null;

      const imported = await importCommentThreads(
        pageSlug,
        importCandidates,
        demoActor,
      );
      window.localStorage.removeItem(remoteCacheStorage);
      return imported.map(mapApiThreadToUi);
    },
    [demoActor, isRemoteMode, pageSlug, remoteCacheStorage, storage],
  );

  const reloadThreads = useCallback(async () => {
    if (!isRemoteMode || !pageSlug) return;
    try {
      const loaded = await fetchCommentThreads(pageSlug);
      let mapped = loaded.map(mapApiThreadToUi);
      if (!didAttemptLegacySyncRef.current) {
        didAttemptLegacySyncRef.current = true;
        try {
          const imported = await syncLocalThreadsToRemote(mapped);
          if (imported) mapped = imported;
        } catch (error) {
          console.error("Wiki comments legacy sync failed:", error);
        }
      }
      if (!isMountedRef.current) return;
      applyThreadUpdate(mapped.map(applyLikedState));
      setPanelState("ready");
      setPanelError(null);
    } catch (error) {
      if (!isMountedRef.current) return;
      setPanelState("error");
      setPanelError(error instanceof Error ? error.message : "Ошибка загрузки");
    }
  }, [
    applyLikedState,
    applyThreadUpdate,
    isRemoteMode,
    pageSlug,
    syncLocalThreadsToRemote,
  ]);

  useEffect(() => {
    if (!isRemoteMode) return;
    void reloadThreads();
  }, [isRemoteMode, reloadThreads]);

  useEffect(() => {
    if (!isRemoteMode || !isPanelOpen) return;
    const poll = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (pollInFlightRef.current) return;
      pollInFlightRef.current = true;
      void reloadThreads().finally(() => {
        pollInFlightRef.current = false;
      });
    }, REMOTE_POLL_INTERVAL_MS);
    return () => window.clearInterval(poll);
  }, [isRemoteMode, isPanelOpen, reloadThreads]);

  useEffect(() => {
    if (!isRemoteMode) {
      setPanelState("ready");
      setPanelError(null);
    }
  }, [isRemoteMode]);

  useEffect(() => {
    if (panelDraft) return;
    if (threads.length === 0) {
      if (activeThreadId !== null) setActiveThreadId(null);
      return;
    }

    const activeThread =
      activeThreadId === null
        ? null
        : (threads.find((thread) => thread.id === activeThreadId) ?? null);
    const activeHasVisibleComments =
      activeThread?.comments.some((comment) => !comment.deleted) ?? false;
    if (activeThread && activeHasVisibleComments) return;

    const threadWithVisibleComments = [...threads]
      .reverse()
      .find((thread) => thread.comments.some((comment) => !comment.deleted));
    if (!threadWithVisibleComments) {
      if (activeThreadId !== null) setActiveThreadId(null);
      return;
    }
    if (threadWithVisibleComments.id !== activeThreadId) {
      setActiveThreadId(threadWithVisibleComments.id);
    }
  }, [threads, activeThreadId, panelDraft]);

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
    const content = resolveEditorContentElement(container);
    if (content) {
      contentRef.current = content;
      setContentEl((prev) => (prev === content ? prev : content));
      const contentRect = content.getBoundingClientRect();
      setContentTopOffset(contentRect.top - containerRect.top);
      setContentScrollTop(content.scrollTop);
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
    } else {
      setContentEl((prev) => (prev === null ? prev : null));
      // Fallback for first render when editor DOM is not yet mounted.
      const fallbackRight = clamp(
        frameRect.right - containerRect.left - 24,
        0,
        frameRect.right - containerRect.left,
      );
      setContentTopOffset(0);
      setContentScrollTop(0);
      setContentRight((prev) =>
        prev !== null && isClose(prev, fallbackRight) ? prev : fallbackRight,
      );
    }
  }, []);

  useEffect(() => {
    const container = rootRef.current;
    if (!container) return;
    const onMouseUp = () =>
      window.setTimeout(
        () =>
          setSelectionDraft(
            getSelectionPayload(
              container,
              contentRef.current,
              panelRef.current,
            ),
          ),
        0,
      );
    const onKeyUp = () =>
      window.setTimeout(
        () =>
          setSelectionDraft(
            getSelectionPayload(
              container,
              contentRef.current,
              panelRef.current,
            ),
          ),
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
    const handleGeometry = () => updateGeometry();
    handleGeometry();
    const rafId = window.requestAnimationFrame(handleGeometry);
    const timeoutId = window.setTimeout(handleGeometry, 0);

    const observer = new ResizeObserver(handleGeometry);
    observer.observe(container);

    const content = resolveEditorContentElement(container);
    if (content) {
      observer.observe(content);
    }

    const mutationObserver = new MutationObserver(handleGeometry);
    mutationObserver.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    window.addEventListener("resize", handleGeometry);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
      observer.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("resize", handleGeometry);
    };
  }, [updateGeometry]);

  useEffect(() => {
    const content = contentEl ?? contentRef.current;
    if (!(content instanceof HTMLElement)) return;
    contentRef.current = content;
    const onScroll = () => setContentScrollTop(content.scrollTop);
    onScroll();
    content.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      content.removeEventListener("scroll", onScroll);
    };
  }, [contentEl]);

  const markers = useMemo(() => {
    if (!isMarkerGeometryReady || contentRight === null) return [];

    return threads
      .map((thread) => {
        const lane = lanes.get(thread.id) ?? 0;
        const count = thread.comments.filter((item) => !item.deleted).length;
        if (count === 0) return null;
        const left = contentRight + RAIL_OFFSET + lane * LANE_GAP;
        const displayedTop = contentTopOffset + thread.top - contentScrollTop;
        return { thread, left, count, displayedTop };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [
    threads,
    lanes,
    contentRight,
    contentScrollTop,
    contentTopOffset,
    isMarkerGeometryReady,
  ]);

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
    if (!isMarkerGeometryReady) return false;
    if (isPanelOpen) return false;
    if (hoveredMarkerId !== null) return false;
    if (hasSelectionMarkerCollision) return false;
    return true;
  }, [
    selectionDraft,
    contentRight,
    isMarkerGeometryReady,
    isPanelOpen,
    hoveredMarkerId,
    hasSelectionMarkerCollision,
  ]);
  const selectionMarkerLeft = useMemo(() => {
    if (!selectionDraft || contentRight === null) return 0;
    const width = markerBadgeWidth(0);
    const unclampedLeft = contentRight + RAIL_OFFSET;
    const maxLeft = Math.max(0, containerWidth - width - 24);
    return clamp(unclampedLeft, 0, maxLeft);
  }, [selectionDraft, contentRight, containerWidth]);
  const selectionMarkerTop = useMemo(() => {
    if (!selectionDraft) return 0;
    return contentTopOffset + selectionDraft.top - contentScrollTop;
  }, [selectionDraft, contentTopOffset, contentScrollTop]);

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

  const submitComment = async () => {
    const text = draft.trim().slice(0, COMMENT_MAX_LENGTH);
    if (!text) return;
    if (editingId) {
      if (!activeThreadId || !activeThread) return;
      if (isRemoteMode && pageSlug) {
        try {
          const updated = await patchCommentMessage(
            pageSlug,
            activeThreadId,
            editingId,
            { text },
            demoActor,
          );
          applyThreadUpdate((prev) =>
            prev.map((thread) =>
              thread.id === activeThreadId
                ? applyLikedState(mapApiThreadToUi(updated))
                : thread,
            ),
          );
          setPanelError(null);
        } catch (error) {
          setPanelError(
            error instanceof Error
              ? error.message
              : "Не удалось сохранить комментарий",
          );
          return;
        }
      } else {
        applyThreadUpdate((prev) =>
          prev.map((thread) =>
            thread.id === activeThreadId
              ? {
                  ...thread,
                  comments: thread.comments.map((item) =>
                    item.id === editingId
                      ? {
                          ...item,
                          text,
                          edited: true,
                        }
                      : item,
                  ),
                }
              : thread,
          ),
        );
      }
      setEditingId(null);
      setReplyToId(null);
      setDraft("");
      window.requestAnimationFrame(resizeDraftTextarea);
      return;
    }
    if (panelDraft || selectionDraft) {
      const source = panelDraft ?? selectionDraft;
      if (!source) return;
      if (isRemoteMode && pageSlug) {
        try {
          const created = await createCommentThread(
            pageSlug,
            {
              quote: source.text,
              text,
              top: source.top,
              height: source.height,
              right: source.right,
            },
            demoActor,
          );
          const next = applyLikedState(mapApiThreadToUi(created));
          applyThreadUpdate((prev) => [...prev, next]);
          setActiveThreadId(next.id);
          setPanelDraft(null);
          setSelectionDraft(null);
          setIsPanelOpen(true);
          setPanelState("ready");
          setPanelError(null);
          setDraft("");
          window.requestAnimationFrame(resizeDraftTextarea);
          return;
        } catch (error) {
          setPanelState("error");
          setPanelError(
            error instanceof Error
              ? error.message
              : "Не удалось создать комментарий",
          );
          return;
        }
      }

      const next: CommentThread = {
        id: id(),
        quote: source.text,
        top: source.top,
        height: source.height,
        right: source.right,
        status: "open",
        comments: [createComment(text, null)],
      };
      applyThreadUpdate((prev) => [...prev, next]);
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
    if (isRemoteMode && pageSlug) {
      try {
        const updated = await addCommentMessage(
          pageSlug,
          activeThreadId,
          { text, replyToId },
          demoActor,
        );
        applyThreadUpdate((prev) =>
          prev.map((thread) =>
            thread.id === activeThreadId
              ? applyLikedState(mapApiThreadToUi(updated))
              : thread,
          ),
        );
        setPanelState("ready");
        setPanelError(null);
      } catch (error) {
        setPanelState("error");
        setPanelError(
          error instanceof Error
            ? error.message
            : "Не удалось добавить комментарий",
        );
        return;
      }
    } else {
      applyThreadUpdate((prev) =>
        prev.map((thread) =>
          thread.id === activeThreadId
            ? {
                ...thread,
                comments: [...thread.comments, createComment(text, replyToId)],
              }
            : thread,
        ),
      );
    }
    setDraft("");
    setReplyToId(null);
    window.requestAnimationFrame(resizeDraftTextarea);
  };

  const deleteComment = async (comment: ThreadComment) => {
    if (!activeThread) return;
    const confirmed = window.confirm(
      "Удалить комментарий? Это действие нельзя отменить.",
    );
    if (!confirmed) return;

    if (editingId === comment.id) {
      setEditingId(null);
      setDraft("");
      window.requestAnimationFrame(resizeDraftTextarea);
    }
    setReplyToId((prev) => (prev === comment.id ? null : prev));

    if (isRemoteMode && pageSlug) {
      try {
        const updated = await patchCommentMessage(
          pageSlug,
          activeThread.id,
          comment.id,
          { deleted: true },
          demoActor,
        );
        applyThreadUpdate((prev) =>
          prev.map((thread) =>
            thread.id === activeThread.id
              ? applyLikedState(mapApiThreadToUi(updated))
              : thread,
          ),
        );
        setPanelError(null);
        void reloadThreads();
      } catch (error) {
        setPanelError(
          error instanceof Error
            ? error.message
            : "Не удалось удалить комментарий",
        );
      }
      return;
    }

    applyThreadUpdate((prev) =>
      prev.map((thread) =>
        thread.id === activeThread.id
          ? {
              ...thread,
              comments: thread.comments.map((item) =>
                item.id === comment.id
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
  };

  const handleDraftKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submitComment();
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
      <div
        className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
        style={{
          clipPath: `inset(${Math.max(0, contentTopOffset)}px 0 0 0)`,
        }}
      >
        {markers.map(({ thread, left, count, displayedTop }) => (
          <Marker
            id={thread.id}
            key={thread.id}
            count={count}
            left={left}
            top={displayedTop}
            lineHeight={clamp(
              thread.height,
              MARKER_LINE_MIN_HEIGHT,
              MARKER_LINE_MAX_HEIGHT,
            )}
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
            left={selectionMarkerLeft}
            top={selectionMarkerTop}
            lineHeight={clamp(
              selectionDraft.height,
              MARKER_LINE_MIN_HEIGHT,
              MARKER_LINE_MAX_HEIGHT,
            )}
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
          className="pointer-events-none absolute z-40 hidden sm:block"
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
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[11px] text-[#8E95A6]">
                      Пользователь:
                    </span>
                    <select
                      value={demoActor.id}
                      onChange={(event) => {
                        const next = DEMO_USERS.find(
                          (user) => user.id === event.target.value,
                        );
                        if (next) setDemoActor(next);
                      }}
                      className="h-6 rounded-[6px] border border-[#D9DEEA] bg-white px-2 text-[11px] text-[#5C6475]"
                    >
                      {DEMO_USERS.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </div>
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
                      onClick={async () => {
                        if (isRemoteMode && pageSlug) {
                          try {
                            const updated = await patchCommentThread(
                              pageSlug,
                              activeThread.id,
                              {
                                status:
                                  activeThread.status === "open"
                                    ? "RESOLVED"
                                    : "OPEN",
                              },
                            );
                            applyThreadUpdate((prev) =>
                              prev.map((thread) =>
                                thread.id === activeThread.id
                                  ? applyLikedState(mapApiThreadToUi(updated))
                                  : thread,
                              ),
                            );
                            setPanelState("ready");
                            setPanelError(null);
                          } catch (error) {
                            setPanelState("error");
                            setPanelError(
                              error instanceof Error
                                ? error.message
                                : "Не удалось обновить статус ветки",
                            );
                          }
                          return;
                        }
                        applyThreadUpdate((prev) =>
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
                        );
                      }}
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
                    {panelError ??
                      "Не удалось загрузить комментарии. Попробуйте еще раз"}
                  </p>
                  <button
                    type="button"
                    className="inline-flex h-8 items-center rounded-[6px] bg-[#8B7BFF] px-3 text-[12px] font-medium text-white hover:bg-[#7A68F2]"
                    onClick={() => {
                      setPanelState("loading");
                      if (isRemoteMode) {
                        void reloadThreads();
                      } else {
                        setPanelState("ready");
                      }
                    }}
                  >
                    Загрузить повторно
                  </button>
                </div>
              ) : null}
              {panelState === "ready" ? (
                activeVisibleComments.length === 0 || !activeThread ? (
                  <div className="flex h-full min-h-48 items-center justify-center text-[14px] text-[#8E95A6]">
                    Нет комментариев
                  </div>
                ) : (
                  <div>
                    {activeVisibleComments.map((comment, index) => {
                      const reply = comment.replyToId
                        ? (activeThread.comments.find(
                            (item) =>
                              item.id === comment.replyToId && !item.deleted,
                          ) ?? null)
                        : null;
                      const isEditing = editingId === comment.id;
                      const likeKey = getLikeKey(activeThread.id, comment.id);
                      const isLikePending = pendingLikeIds.has(likeKey);
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
                                    onClick={() => {
                                      setEditingId(null);
                                      setDraft("");
                                      setReplyToId(comment.id);
                                      window.requestAnimationFrame(
                                        resizeDraftTextarea,
                                      );
                                    }}
                                  >
                                    <Reply className="size-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    className={cn(
                                      "inline-flex size-6 items-center justify-center rounded-[6px]",
                                      isLikePending &&
                                        "pointer-events-none opacity-60",
                                      comment.likedByMe
                                        ? "text-[#7D6EEA] hover:bg-[#EBE7FF]"
                                        : "text-[#8E95A6] hover:bg-[#EEF1F7]",
                                    )}
                                    disabled={isLikePending}
                                    onClick={async () => {
                                      if (isLikePending) return;
                                      const likedByMe =
                                        likedCommentIds.has(likeKey);
                                      const nextLikes = likedByMe
                                        ? Math.max(0, comment.likes - 1)
                                        : comment.likes + 1;
                                      setPendingLikeIds((prev) => {
                                        const next = new Set(prev);
                                        next.add(likeKey);
                                        return next;
                                      });
                                      setLikedCommentIds((prev) => {
                                        const next = new Set(prev);
                                        if (likedByMe) next.delete(likeKey);
                                        else next.add(likeKey);
                                        return next;
                                      });
                                      applyThreadUpdate((prev) =>
                                        prev.map((thread) =>
                                          thread.id === activeThread.id
                                            ? {
                                                ...thread,
                                                comments: thread.comments.map(
                                                  (item) =>
                                                    item.id === comment.id
                                                      ? {
                                                          ...item,
                                                          likedByMe: !likedByMe,
                                                          likes: nextLikes,
                                                        }
                                                      : item,
                                                ),
                                              }
                                            : thread,
                                        ),
                                      );
                                      if (isRemoteMode && pageSlug) {
                                        try {
                                          const updated =
                                            await patchCommentMessage(
                                              pageSlug,
                                              activeThread.id,
                                              comment.id,
                                              { likes: nextLikes },
                                              demoActor,
                                            );
                                          applyThreadUpdate((prev) =>
                                            prev.map((thread) =>
                                              thread.id === activeThread.id
                                                ? applyLikedState(
                                                    mapApiThreadToUi(updated),
                                                  )
                                                : thread,
                                            ),
                                          );
                                          setPanelError(null);
                                        } catch (error) {
                                          setLikedCommentIds((prev) => {
                                            const next = new Set(prev);
                                            if (likedByMe) next.add(likeKey);
                                            else next.delete(likeKey);
                                            return next;
                                          });
                                          applyThreadUpdate((prev) =>
                                            prev.map((thread) =>
                                              thread.id === activeThread.id
                                                ? {
                                                    ...thread,
                                                    comments:
                                                      thread.comments.map(
                                                        (item) =>
                                                          item.id === comment.id
                                                            ? {
                                                                ...item,
                                                                likedByMe,
                                                                likes:
                                                                  comment.likes,
                                                              }
                                                            : item,
                                                      ),
                                                  }
                                                : thread,
                                            ),
                                          );
                                          setPanelError(
                                            error instanceof Error
                                              ? error.message
                                              : "Не удалось обновить лайк",
                                          );
                                        } finally {
                                          setPendingLikeIds((prev) => {
                                            const next = new Set(prev);
                                            next.delete(likeKey);
                                            return next;
                                          });
                                        }
                                        return;
                                      }
                                      setPendingLikeIds((prev) => {
                                        const next = new Set(prev);
                                        next.delete(likeKey);
                                        return next;
                                      });
                                    }}
                                  >
                                    <ThumbsUp className="size-3.5" />
                                  </button>
                                  {comment.author.id === demoActor.id ? (
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
                                            setReplyToId(null);
                                            setDraft(comment.text);
                                            window.requestAnimationFrame(() => {
                                              resizeDraftTextarea();
                                              draftTextareaRef.current?.focus();
                                            });
                                          }}
                                        >
                                          Редактировать
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          variant="destructive"
                                          onSelect={(event) => {
                                            event.preventDefault();
                                            void deleteComment(comment);
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
                              <p
                                className={cn(
                                  "mt-1 whitespace-pre-wrap break-words text-[13px] leading-5 text-[#444B5A]",
                                  comment.deleted
                                    ? "italic text-[#7D8597]"
                                    : "",
                                  isEditing ? "opacity-60" : "",
                                )}
                              >
                                {comment.text}
                              </p>
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
              {editingComment ? (
                <div className="mb-2 rounded-[8px] border border-[#DDE3EF] bg-white/80 px-2 py-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] text-[#8A90A1]">
                        Редактирование
                      </p>
                      <p className="truncate text-[11px] text-[#6B7284]">
                        {editingComment.text}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex size-5 items-center justify-center rounded-full text-[#9AA2B3] hover:bg-[#EEF1F7]"
                      onClick={() => {
                        setEditingId(null);
                        setDraft("");
                        window.requestAnimationFrame(resizeDraftTextarea);
                      }}
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                </div>
              ) : null}
              {!editingComment && replyToId && activeThread ? (
                <div className="mb-2 rounded-[8px] border border-[#DDE3EF] bg-white/80 px-2 py-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] text-[#8A90A1]">Ответ</p>
                      <p className="truncate text-[11px] text-[#6B7284]">
                        {activeThread.comments.find(
                          (item) => item.id === replyToId && !item.deleted,
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
                      : editingComment
                        ? "Редактировать комментарий"
                        : "Новый комментарий"
                  }
                  disabled={
                    panelState !== "ready" ||
                    activeThread?.status === "resolved"
                  }
                  className="min-h-6 max-h-[120px] resize-none overflow-y-hidden border-0 bg-transparent pl-2 pr-0 py-0 text-[13px] leading-5 text-[#5A6273] shadow-none placeholder:text-[#B2B8C5] focus-visible:border-0 focus-visible:ring-0"
                />
                <Button
                  type="button"
                  size="icon-sm"
                  className="mb-0.5 rounded-full bg-transparent text-[#798296] shadow-none hover:bg-[#EDEFF4] hover:text-[#636E82]"
                  onClick={() => void submitComment()}
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
