function normalizeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

export function encodeSlugPath(slug: string): string {
  return encodeURIComponent(normalizeSlug(slug));
}
