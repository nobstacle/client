/**
 * Route-segment loading UI for the dashboard.
 *
 * In the App Router, without a `loading.tsx` boundary the router keeps the old
 * page fully rendered and "frozen" until the next route segment is completely
 * ready — which is why switching pages felt stuck. This Suspense fallback is
 * shown instantly on navigation so the app always feels responsive while the
 * next page's chunk/data loads.
 */
export default function DashboardLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-[#3b5998]"
          role="status"
          aria-label="Loading"
        />
        <span className="text-sm text-gray-400">Loading…</span>
      </div>
    </div>
  );
}
