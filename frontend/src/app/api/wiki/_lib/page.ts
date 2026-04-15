export function normalizePageShape(page: unknown) {
  if (!page || typeof page !== "object") {
    return page;
  }

  const raw = page as Record<string, unknown>;

  return {
    ...raw,
    description:
      typeof raw.description === "string" || raw.description === null
        ? raw.description
        : null,
    content:
      typeof raw.content === "string" || raw.content === null
        ? raw.content
        : null,
    mwsTableId:
      typeof raw.mwsTableId === "string" || raw.mwsTableId === null
        ? raw.mwsTableId
        : null,
    parentSlug:
      typeof raw.parentSlug === "string" || raw.parentSlug === null
        ? raw.parentSlug
        : null,
    ownerId:
      typeof raw.ownerId === "string" || raw.ownerId === null
        ? raw.ownerId
        : null,
  };
}

export function buildWritePayload(payload: unknown) {
  const source =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};

  const requestPayload: Record<string, unknown> = {
    title: typeof source.title === "string" ? source.title : "",
    content: typeof source.content === "string" ? source.content : "",
  };

  if ("description" in source) {
    requestPayload.description =
      typeof source.description === "string" || source.description === null
        ? source.description
        : null;
  }

  if ("mwsTableId" in source) {
    requestPayload.mwsTableId =
      typeof source.mwsTableId === "string" || source.mwsTableId === null
        ? source.mwsTableId
        : null;
  }

  if ("parentSlug" in source) {
    requestPayload.parentSlug =
      typeof source.parentSlug === "string" || source.parentSlug === null
        ? source.parentSlug
        : null;
  }

  return requestPayload;
}
