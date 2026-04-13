import WikiPageEditorPage from "@/fsd/pages/wiki/wiki-page-editor-page";

type Params = {
  params: Promise<{ slug: string }>;
};

function normalizeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

export default async function WikiPageRoute({ params }: Params) {
  const { slug: rawSlug } = await params;
  const slug = normalizeSlug(rawSlug);
  return <WikiPageEditorPage slug={slug} />;
}
