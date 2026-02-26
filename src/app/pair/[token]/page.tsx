import { redirect } from "next/navigation";

interface PairPageProps {
  params: { token: string };
}

/**
 * /pair/[token]
 *
 * Public page — no authentication required (middleware allows it through).
 * Immediately hands off to the server-side login API which:
 *   1. Validates the pairing token
 *   2. Issues a guest JWT
 *   3. Creates a NextAuth session
 *   4. Redirects to /client?station=<N>
 */
export default function PairPage({ params }: PairPageProps) {
  redirect(`/api/pairing/login?token=${params.token}`);
}