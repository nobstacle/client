/**
 * Route-segment loading UI for the dashboard.
 *
 * In the App Router, without a `loading.tsx` boundary the router keeps the old
 * page fully rendered and "frozen" until the next route segment is completely
 * ready — which is why switching pages felt stuck. This Suspense fallback is
 * shown instantly on navigation so the app always feels responsive while the
 * next page's chunk/data loads.
 */
import { DashboardPageSkeleton } from "../../components/DashboardPageSkeleton";

export default function DashboardLoading() {
  return <DashboardPageSkeleton />;
}
