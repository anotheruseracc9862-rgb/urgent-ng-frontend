/** Admin has no third-party scripts; media is fetched explicitly from one storage origin. */
export function contentSecurityPolicy(nonce: string, production: boolean, mediaOrigin?: string): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(production ? [] : ["'unsafe-eval'"])],
    // Radix positioning and React inline styles require style attributes, not inline scripts.
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "media-src": ["'self'", "blob:"],
    "font-src": ["'self'"],
    "connect-src": ["'self'", ...(mediaOrigin ? [new URL(mediaOrigin).origin] : []), ...(production ? [] : ["ws:"])],
    "frame-src": ["'none'"],
    "worker-src": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'none'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  return Object.entries(directives).map(([name, sources]) => `${name} ${sources.join(" ")}`).join("; ");
}

export function securityHeaders(production: boolean) {
  return [
    { key: "Referrer-Policy", value: "no-referrer" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Permissions-Policy", value: "geolocation=(), camera=(), microphone=(), payment=(), usb=()" },
    { key: "X-Robots-Tag", value: "noindex, nofollow" },
    ...(production ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
  ];
}
