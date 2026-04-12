import { Suspense } from "react";
import WikiListPage from "@/fsd/pages/wiki-page/wiki-list-page";
import WikiEditPage from "@/fsd/pages/wiki-page/wiki-edit-page";

interface WikiPageProps {
  params: Promise<{
    slug?: string[];
  }>;
  searchParams: Promise<{
    edit?: string;
  }>;
}

export async function generateMetadata({ params }: WikiPageProps) {
  const { slug } = await params;
  const pageSlug = slug?.[0] || "";
  
  if (!pageSlug) {
    return {
      title: "Wiki - Live Docs",
    };
  }
  
  return {
    title: `Редактирование: ${pageSlug} - Wiki`,
  };
}

export default async function WikiDynamicPage({ 
  params,
  searchParams 
}: WikiPageProps) {
  const { slug } = await params;
  const { edit } = await searchParams;
  
  const pageSlug = slug?.[0] || "";
  const isRoot = !pageSlug;
  const isNew = pageSlug === "new";
  const isEdit = edit === "true" || isNew || (!isRoot && !isNew);
  
  // Render list page for root
  if (isRoot) {
    return (
      <Suspense fallback={
        <div className="container mx-auto py-6 max-w-5xl">
          <div className="h-[calc(100vh-200px)] flex items-center justify-center">
            <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      }>
        <WikiListPage />
      </Suspense>
    );
  }
  
  // Render edit page
  return (
    <Suspense fallback={
      <div className="container mx-auto py-6 max-w-6xl">
        <div className="h-[calc(100vh-200px)] flex items-center justify-center">
          <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    }>
      <WikiEditPage slug={pageSlug} isNew={isNew} />
    </Suspense>
  );
}
