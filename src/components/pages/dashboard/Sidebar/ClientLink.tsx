"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useDashboardNavigation } from "../../../../context/DashboardNavigationProvider";

/**
 * ClientLink - Sidebar navigation link.
 *
 * KEY FIXES:
 * 1. Removed useSearchParams() and usePathname() from this component.
 *    Previously every sidebar item called these hooks independently (~20+ calls).
 *    Now the parent Sidebar computes searchParamsString once and passes it as a prop.
 * 2. Accepts `children` so the entire row content (icon + text) lives inside the
 *    <Link>, making every pixel of a menu row fully clickable.
 * 3. startNavigation() on click shows the content-area loader immediately.
 * 4. prefetch on mount (via Sidebar) and on hover so heavy routes feel instant.
 */
export const ClientLink = ({
  href,
  className,
  style,
  disabled,
  disabledReason,
  searchParamsString = "",
  onClick,
  children,
}: {
  href: string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  disabledReason?: string;
  searchParamsString?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) => {
  const router = useRouter();
  const { startNavigation } = useDashboardNavigation();

  const hrefWithParams = searchParamsString
    ? `${href}?${searchParamsString}`
    : href;

  const prefetchRoute = useCallback(() => {
    router.prefetch(hrefWithParams);
  }, [router, hrefWithParams]);

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        title={disabledReason || "This feature is disabled for your company."}
        className={className}
        style={style}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={hrefWithParams}
      prefetch={true}
      className={className}
      style={style}
      onMouseEnter={prefetchRoute}
      onFocus={prefetchRoute}
      onClick={() => {
        startNavigation(hrefWithParams);
        onClick?.();
      }}
    >
      {children}
    </Link>
  );
};
