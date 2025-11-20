"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";

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
  const router = useRouter();
  const params = new URLSearchParams(searchParams).toString();

  // Special handling for documentDownload to avoid flashing
  const isDocumentRoute = href === '/dashboard/documentDownload';

  const handleClick = (e: React.MouseEvent) => {
    if (isDocumentRoute) {
      e.preventDefault();
      router.push(`${href}?${params}`);
    }
  };

  return (
    <Link
      href={`${href}?${params}`}
      prefetch={false}
      onClick={handleClick}
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