import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata",
]);

function ipv4ToInt(address: string) {
  return address
    .split(".")
    .map((part) => Number(part))
    .reduce((value, part) => (value << 8) + part, 0) >>> 0;
}

function isIpv4InCidr(address: string, base: string, prefix: number) {
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return (ipv4ToInt(address) & mask) === (ipv4ToInt(base) & mask);
}

function isBlockedIpv4(address: string) {
  return (
    isIpv4InCidr(address, "0.0.0.0", 8) ||
    isIpv4InCidr(address, "10.0.0.0", 8) ||
    isIpv4InCidr(address, "100.64.0.0", 10) ||
    isIpv4InCidr(address, "127.0.0.0", 8) ||
    isIpv4InCidr(address, "169.254.0.0", 16) ||
    isIpv4InCidr(address, "172.16.0.0", 12) ||
    isIpv4InCidr(address, "192.0.0.0", 24) ||
    isIpv4InCidr(address, "192.0.2.0", 24) ||
    isIpv4InCidr(address, "192.88.99.0", 24) ||
    isIpv4InCidr(address, "192.168.0.0", 16) ||
    isIpv4InCidr(address, "198.18.0.0", 15) ||
    isIpv4InCidr(address, "198.51.100.0", 24) ||
    isIpv4InCidr(address, "203.0.113.0", 24) ||
    isIpv4InCidr(address, "224.0.0.0", 4)
  );
}

function isBlockedIpv6(address: string) {
  const normalized = address.toLowerCase();
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb") ||
    normalized.startsWith("ff")
  );
}

function isBlockedIp(address: string) {
  const version = isIP(address);
  if (version === 4) {
    return isBlockedIpv4(address);
  }

  if (version === 6) {
    return isBlockedIpv6(address);
  }

  return false;
}

export async function assertSafeOutboundUrl(input: URL) {
  if (!ALLOWED_PROTOCOLS.has(input.protocol)) {
    throw new Error("Only http(s) URLs are allowed");
  }

  const hostname = input.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith(".local")) {
    throw new Error("Blocked hostname");
  }

  if (isIP(hostname)) {
    if (isBlockedIp(hostname)) {
      throw new Error("Blocked IP address");
    }
    return;
  }

  const addresses = await lookup(hostname, { all: true });
  if (addresses.length === 0) {
    throw new Error("Hostname did not resolve");
  }

  for (const address of addresses) {
    if (isBlockedIp(address.address)) {
      throw new Error("Blocked resolved IP address");
    }
  }
}
