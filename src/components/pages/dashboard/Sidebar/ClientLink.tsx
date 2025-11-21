"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export const ClientLink = ({
  href,
  title,
  className,
  style,
}: {
  href: string;
  title: string;
  className?: string;
  style?: React.CSSProperties;
}) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams).toString();

  return (
    <Link
      href={`${href}?${params}`}
      className={className || `
        flex items-center gap-2 p-4 font-medium text-white
        ${pathname === href ? 'bg-[rgb(46,68,113)]' : 'bg-transparent'}
      `}
      style={style}
    >
      <span>{title}</span>
    </Link>
  );
};