import type { WikiPage } from "./types";

export const FOLDER_MARKER = "__folder__";

export function isFolderPage(page: WikiPage): boolean {
  return page.mwsTableId === FOLDER_MARKER;
}
