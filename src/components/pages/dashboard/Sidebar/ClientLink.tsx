"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export const ClientLink = ({
  href,
  title,
  className,
  style,
  disabled,
  disabledReason,
}: {
  href: string;
  title: string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  disabledReason?: string;
}) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams).toString();

  const linkClassName =
    className ||
    `
      flex items-center gap-2 p-4 font-medium text-white
      ${pathname === href ? 'bg-[rgb(46,68,113)]' : 'bg-transparent'}
    `;

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        title={disabledReason || "This feature is disabled for your company."}
        className={`${linkClassName} cursor-not-allowed opacity-50`}
        style={style}
      >
        <span className="flex w-full items-center justify-between gap-2">
          <span>{title}</span>
          <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/70">
            Disabled
          </span>
        </span>
      </span>
    );
  }

  return (
    <Link
      href={`${href}?${params}`}
      className={linkClassName}
      style={style}
    >
      <span>{title}</span>
    </Link>
  );
};
