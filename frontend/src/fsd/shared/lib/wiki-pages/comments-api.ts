export type ThreadStatus = "open" | "resolved";

export type CommentAuthor = {
  id: string;
  name: string;
  handle: string;
};

export type ThreadComment = {
  id: string;
  author: CommentAuthor;
  text: string;
  createdAt: string;
  edited: boolean;
  replyToId: string | null;
  likes: number;
  likedByMe: boolean;
  deleted: boolean;
};

export type CommentThread = {
  id: string;
  quote: string;
  top: number;
  height: number;
  right: number;
  status: ThreadStatus;
  comments: ThreadComment[];
};

type RawCommentThread = {
  id: number;
  quote: string;
  top: number | null;
  height: number | null;
  right: number | null;
  status: string;
  comments: Array<{
    id: number;
    author: CommentAuthor;
    text: string;
    createdAt: string;
    edited: boolean;
    replyToId: number | null;
    likes: number;
    likedByMe: boolean;
    deleted: boolean;
  }>;
};

type DemoActor = { id: string; name: string } | null;

function normalizeStatus(status: string): ThreadStatus {
  return status.toLowerCase() === "resolved" ? "resolved" : "open";
}

function isValidHttpHeaderValue(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code > 255 || code === 127 || code < 32) return false;
  }
  return true;
}

function mapThread(raw: RawCommentThread): CommentThread {
  return {
    id: String(raw.id),
    quote: raw.quote,
    top: raw.top ?? 0,
    height: raw.height ?? 20,
    right: raw.right ?? 0,
    status: normalizeStatus(raw.status),
    comments: raw.comments.map((item) => ({
      id: String(item.id),
      author: item.author,
      text: item.text,
      createdAt: item.createdAt,
      edited: item.edited,
      replyToId: item.replyToId === null ? null : String(item.replyToId),
      likes: item.likes ?? 0,
      likedByMe: item.likedByMe ?? false,
      deleted: item.deleted ?? false,
    })),
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | T
    | { error?: string }
    | null;

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? payload.error || "Ошибка запроса"
        : "Ошибка запроса";
    throw new Error(message);
  }

  return payload as T;
}

function headers(actor: DemoActor): HeadersInit {
  if (!actor) return {};
  const safeHeaders: Record<string, string> = {
    "x-demo-user": actor.id,
  };
  if (isValidHttpHeaderValue(actor.name)) {
    safeHeaders["x-demo-user-name"] = actor.name;
  }
  return safeHeaders;
}

export async function fetchCommentThreads(
  slug: string,
): Promise<CommentThread[]> {
  const response = await fetch(
    `/api/wiki/pages/${encodeURIComponent(slug)}/comments`,
    {
      method: "GET",
      cache: "no-store",
    },
  );
  const raw = await parseResponse<RawCommentThread[]>(response);
  return raw.map(mapThread);
}

export async function createCommentThread(
  slug: string,
  payload: {
    quote: string;
    text: string;
    top: number;
    height: number;
    right: number;
  },
  actor: DemoActor,
): Promise<CommentThread> {
  const response = await fetch(
    `/api/wiki/pages/${encodeURIComponent(slug)}/comments`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers(actor),
      },
      body: JSON.stringify(payload),
    },
  );
  return mapThread(await parseResponse<RawCommentThread>(response));
}

export async function importCommentThreads(
  slug: string,
  threads: CommentThread[],
  actor: DemoActor,
): Promise<CommentThread[]> {
  const response = await fetch(
    `/api/wiki/pages/${encodeURIComponent(slug)}/comments/import`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers(actor),
      },
      body: JSON.stringify({ threads }),
    },
  );
  const raw = await parseResponse<RawCommentThread[]>(response);
  return raw.map(mapThread);
}

export async function addCommentMessage(
  slug: string,
  threadId: string,
  payload: { text: string; replyToId: string | null },
  actor: DemoActor,
): Promise<CommentThread> {
  const response = await fetch(
    `/api/wiki/pages/${encodeURIComponent(slug)}/comments/${encodeURIComponent(threadId)}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers(actor),
      },
      body: JSON.stringify({
        text: payload.text,
        replyToId: payload.replyToId ? Number(payload.replyToId) : null,
      }),
    },
  );
  return mapThread(await parseResponse<RawCommentThread>(response));
}

export async function patchCommentThread(
  slug: string,
  threadId: string,
  payload: { status: "OPEN" | "RESOLVED" },
): Promise<CommentThread> {
  const response = await fetch(
    `/api/wiki/pages/${encodeURIComponent(slug)}/comments/${encodeURIComponent(threadId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
  return mapThread(await parseResponse<RawCommentThread>(response));
}

export async function patchCommentMessage(
  slug: string,
  threadId: string,
  messageId: string,
  payload: { text?: string; deleted?: boolean; likes?: number },
  actor: DemoActor,
): Promise<CommentThread> {
  const response = await fetch(
    `/api/wiki/pages/${encodeURIComponent(slug)}/comments/${encodeURIComponent(threadId)}/messages/${encodeURIComponent(messageId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...headers(actor),
      },
      body: JSON.stringify(payload),
    },
  );
  return mapThread(await parseResponse<RawCommentThread>(response));
}
