/** Template kinds synced from API → Zustand for dashboard pages and header search. */
export type TemplateKind =
  | "text"
  | "image"
  | "video"
  | "slideshow"
  | "map"
  | "website"
  | "document"
  | "scroll"
  | "publicScroll"
  | "survey";

/** Types needed for header tag search + template shortcut picker send. */
export const HEADER_CATALOG_KINDS: readonly TemplateKind[] = [
  "text",
  "image",
  "video",
  "slideshow",
  "map",
  "website",
  "document",
  "scroll",
  "publicScroll",
];

const ROUTE_TEMPLATE_MAP: ReadonlyArray<{
  prefix: string;
  kinds: readonly TemplateKind[];
}> = [
  { prefix: "/dashboard/text", kinds: ["text"] },
  { prefix: "/dashboard/image", kinds: ["image"] },
  { prefix: "/dashboard/video", kinds: ["video"] },
  { prefix: "/dashboard/slideshow", kinds: ["slideshow"] },
  { prefix: "/dashboard/maps", kinds: ["map"] },
  { prefix: "/dashboard/website", kinds: ["website"] },
  { prefix: "/dashboard/documents", kinds: ["document"] },
  { prefix: "/dashboard/scroll", kinds: ["scroll"] },
  { prefix: "/dashboard/public", kinds: ["publicScroll"] },
  { prefix: "/dashboard/survey", kinds: ["survey"] },
];

export function getRouteTemplateKinds(pathname: string): TemplateKind[] {
  const match = ROUTE_TEMPLATE_MAP.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return match ? [...match.kinds] : [];
}

export function mergeEnabledTemplateKinds(options: {
  routeKinds: readonly TemplateKind[];
  headerCatalog: boolean;
}): Set<TemplateKind> {
  const enabled = new Set<TemplateKind>(options.routeKinds);

  if (options.headerCatalog) {
    for (const kind of HEADER_CATALOG_KINDS) {
      enabled.add(kind);
    }
  }

  return enabled;
}

export function isHeaderCatalogKind(kind: TemplateKind): boolean {
  return HEADER_CATALOG_KINDS.includes(kind);
}
