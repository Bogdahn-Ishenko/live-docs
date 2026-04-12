export type WikiPage = {
  id: number;
  title: string;
  description: string | null;
  slug: string;
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
};

export type LocalWikiDraft = {
  title: string;
  description?: string;
  content: string;
  updatedAt: number;
};
