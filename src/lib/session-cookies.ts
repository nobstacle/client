const isProduction = () => process.env.NODE_ENV === "production";

export function getAuthCookieDomain(): string | undefined {
  if (process.env.COOKIE_DOMAIN) return process.env.COOKIE_DOMAIN;
  if (isProduction()) return ".nobstacle.com";
  return undefined;
}

export function getSessionCookieName(): string {
  return isProduction()
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";
}

export function buildSessionCookie(token: string, maxAgeSeconds: number): string {
  const domain = getAuthCookieDomain();
  return [
    `${getSessionCookieName()}=${token}`,
    "Path=/",
    `Max-Age=${Math.max(1, maxAgeSeconds)}`,
    "HttpOnly",
    isProduction() ? "Secure" : null,
    isProduction() ? "SameSite=None" : "SameSite=Lax",
    domain ? `Domain=${domain}` : null,
  ]
    .filter(Boolean)
    .join("; ");
}

/** Expire every NextAuth cookie variant pairing or signOut may have created. */
export function expiredAuthCookieHeaders(): string[] {
  const names = [
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "next-auth.callback-url",
    "__Secure-next-auth.callback-url",
    "next-auth.csrf-token",
    "__Host-next-auth.csrf-token",
  ];

  const domains: Array<string | undefined> = [
    undefined,
    getAuthCookieDomain(),
    ".nobstacle.com",
    "nobstacle.com",
    "www.nobstacle.com",
  ];
  const uniqueDomains = [...new Set(domains)];

  const headers: string[] = [];

  for (const name of names) {
    const isHostCookie = name.startsWith("__Host-");
    const domainList = isHostCookie ? [undefined] : uniqueDomains;

    for (const domain of domainList) {
      const parts = [
        `${name}=`,
        "Path=/",
        "Max-Age=0",
        "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
        name.includes("callback-url") ? null : "HttpOnly",
        isProduction() || name.startsWith("__Secure") || isHostCookie ? "Secure" : null,
        isProduction() ? "SameSite=None" : "SameSite=Lax",
        domain ? `Domain=${domain}` : null,
      ].filter(Boolean);

      headers.push(parts.join("; "));
    }
  }

  return headers;
}

export function applyExpiredAuthCookies(headers: Headers): void {
  for (const cookie of expiredAuthCookieHeaders()) {
    headers.append("Set-Cookie", cookie);
  }
}
