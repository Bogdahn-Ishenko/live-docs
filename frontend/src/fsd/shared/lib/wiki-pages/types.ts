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

export type WikiPageVersion = {
  id: number;
  pageId: number;
  title: string;
  description: string | null;
  content: string | null;
  author: string;
  createdAt: string;
  action: string;
  comment: string | null;
};

export type WikiPageDraft = {
  title: string;
  description: string | null;
  content: string | null;
  updatedAt: string;
};

export type WikiPageGraphNode = {
  slug: string;
  title: string;
};

export type WikiPageGraphEdge = {
  from: string;
  to: string;
};

export type WikiPageGraph = {
  nodes: WikiPageGraphNode[];
  edges: WikiPageGraphEdge[];
};

export type PageEditor = {
  username: string;
};
