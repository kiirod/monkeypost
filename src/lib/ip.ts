
import crypto from "crypto";

function anonymizeIPv4(ip: string): string {
  const parts = ip.split(".");
  if (parts.length !== 4) return "invalid-ipv4";
  parts[3] = "0";
  return parts.join(".");
}

function anonymizeIPv6(ip: string): string {
  const parts = ip.split(":");
  if (parts.length < 3) return "invalid-ipv6";
  const prefix = parts.slice(0, 3);
  const zeroes = new Array(8 - prefix.length).fill("0000");
  return [...prefix, ...zeroes].join(":");
}

export function anonymizeIP(ip: string): string {
  if (!ip) return "unknown";
  const cleaned = ip.split(",")[0].trim();
  return cleaned.includes(":") ? anonymizeIPv6(cleaned) : anonymizeIPv4(cleaned);
}

export function hashIP(ip: string, salt?: string): string {
  const dailySalt = salt ?? new Date().toISOString().slice(0, 10);
  return crypto
    .createHmac("sha256", dailySalt)
    .update(ip.split(",")[0].trim())
    .digest("hex")
    .slice(0, 16);
}

export function getClientIP(request: Request): string {
  const headers = request.headers;

  const candidates = [
    headers.get("cf-connecting-ip"),
    headers.get("x-real-ip"),
    headers.get("x-forwarded-for"),
  ];

  for (const candidate of candidates) {
    if (candidate) {
      const ip = candidate.split(",")[0].trim();
      if (ip) return ip;
    }
  }

  return "unknown";
}
