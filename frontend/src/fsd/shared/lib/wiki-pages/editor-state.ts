import type { SerializedEditorState } from "lexical";

const EMPTY_STATE = {
  root: {
    children: [
      {
        children: [],
        direction: null,
        format: "",
        indent: 0,
        type: "paragraph",
        version: 1,
      },
    ],
    direction: null,
    format: "",
    indent: 0,
    type: "root",
    version: 1,
  },
} as unknown as SerializedEditorState;

function hasNonEmptyRoot(
  state: SerializedEditorState | null | undefined,
): state is SerializedEditorState {
  if (!state || typeof state !== "object") {
    return false;
  }

  const root = (state as { root?: { type?: string; children?: unknown[] } }).root;
  return (
    root?.type === "root" &&
    Array.isArray(root.children) &&
    root.children.length > 0
  );
}

export function getEmptyEditorState(): SerializedEditorState {
  return structuredClone(EMPTY_STATE);
}

export function parseStoredEditorState(
  content: string | null | undefined,
): SerializedEditorState {
  if (!content) {
    return getEmptyEditorState();
  }

  try {
    const parsed = JSON.parse(content) as SerializedEditorState;
    return hasNonEmptyRoot(parsed) ? parsed : getEmptyEditorState();
  } catch {
    return getEmptyEditorState();
  }
}

export function stringifyEditorState(
  state: SerializedEditorState | null | undefined,
): string {
  if (!hasNonEmptyRoot(state)) {
    return JSON.stringify(getEmptyEditorState());
  }

  return JSON.stringify(state);
}

export function buildPageSignature(
  title: string,
  description: string | null | undefined,
  state: SerializedEditorState | null | undefined,
): string {
  return `${title}\n${description || ""}\n${stringifyEditorState(state)}`;
}
