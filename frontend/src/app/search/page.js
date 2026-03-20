import { Suspense } from "react";
import SearchResultsPage from "@/components/search/SearchResultsPage";

/**
 * /search route — thin wrapper that provides the required Suspense boundary.
 * useSearchParams() in SearchResultsPage needs Suspense (Next.js App Router requirement).
 */
export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchResultsPage />
    </Suspense>
  );
}
