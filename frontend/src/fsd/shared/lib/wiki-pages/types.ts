export type WikiPage = {
  id: number;
  title: string;
  description: string | null;
  slug: string;
  parentSlug: string | null;
  content: string | null;
  mwsTableId: string | null;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpsertWikiPagePayload = {
  title: string;
  description?: string | null;
  content: string;
  mwsTableId?: string | null;
  parentSlug?: string | null;
};

export type LocalWikiDraft = {
  title: string;
  description?: string;
  content: string;
  updatedAt: number;
};
