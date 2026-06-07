import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_ROUTES = ["/api/", "/monkeychat/", "/monkeypost/", "/users/", "/posts/", "/search/", "/tos/"];

const BLOCKED_TRACKING_HEADERS = [
  "x-forwarded-for",
  "x-real-ip",
  "cf-connecting-ip",
  "true-client-ip",
  "x-cluster-client-ip",
];

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  BLOCKED_TRACKING_HEADERS.forEach((header) => {
    response.headers.delete(header);
  });


  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline'`,
    `style-src 'self' 'unsafe-inline'`,
`img-src 'self' data: blob: https://*.supabase.co https://cdn.jsdelivr.net`,
`connect-src 'self' https://*.supabase.co wss://*.supabase.co`,
`font-src 'self' https://*.supabase.co`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);

  response.headers.set(
    "Permissions-Policy",
    [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "interest-cohort=()",
      "browsing-topics=()",
      "attribution-reporting=()",
      "idle-detection=()",
      "usb=()",
    ].join(", ")
  );

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );

  response.headers.delete("x-powered-by");
  response.headers.delete("server");

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
