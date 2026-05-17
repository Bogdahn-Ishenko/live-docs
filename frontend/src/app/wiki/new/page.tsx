import { Suspense } from "react";
import WikiPageCreatePage from "@/fsd/pages/wiki/wiki-page-create-page";

export default function WikiCreateRoute() {
  return (
    <Suspense fallback={null}>
      <WikiPageCreatePage />
    </Suspense>
  );
}
