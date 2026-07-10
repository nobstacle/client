"use client";

import Link from "next/link";

/**
 * ClientLink - Sidebar navigation link.
 *
 * KEY FIXES:
 * 1. Removed useSearchParams() and usePathname() from this component.
 *    Previously every sidebar item called these hooks independently (~20+ calls).
 *    Now the parent Sidebar computes searchParamsString once and passes it as a prop.
 * 2. Accepts `children` so the entire row content (icon + text) lives inside the
 *    <Link>, making every pixel of a menu row fully clickable.
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

  const hrefWithParams = searchParamsString
    ? `${href}?${searchParamsString}`
    : href;

  return (
    <Link
      href={hrefWithParams}
      className={className}
      style={style}
      onClick={onClick}
    >
      {children}
    </Link>
  );
};
