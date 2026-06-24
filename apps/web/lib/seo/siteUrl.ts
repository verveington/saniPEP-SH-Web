const developmentSiteUrl = "http://localhost:3000";

type SiteUrlContext = {
  nodeEnv?: string;
  publicDeployment?: string;
};

export function getSiteUrl() {
  return resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL, {
    nodeEnv: process.env.NODE_ENV,
    publicDeployment: process.env.PUBLIC_DEPLOYMENT,
  });
}

export function resolveSiteUrl(value: string | undefined, context: SiteUrlContext) {
  const requiresConfiguredUrl = context.publicDeployment === "true" || context.nodeEnv === "production";
  const requiresPublicUrl = context.publicDeployment === "true";
  const rawValue = value?.trim();

  if (!rawValue) {
    if (requiresConfiguredUrl) {
      throw new Error("NEXT_PUBLIC_SITE_URL must be set for production or public web builds.");
    }
    return developmentSiteUrl;
  }

  let parsed: URL;
  try {
    parsed = new URL(rawValue);
  } catch {
    throw new Error("NEXT_PUBLIC_SITE_URL must be an absolute URL.");
  }

  if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error("NEXT_PUBLIC_SITE_URL must contain only scheme and host, without path, query or hash.");
  }

  if (requiresPublicUrl) {
    assertPublicSiteUrl(parsed);
  } else if (context.nodeEnv === "production") {
    assertInternalStagingSiteUrl(parsed);
  }

  return parsed.origin.replace(/\/+$/, "");
}

function assertPublicSiteUrl(url: URL) {
  const host = url.hostname.toLowerCase().replace(/^\[(.*)\]$/, "$1");
  if (url.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_SITE_URL must be a public https URL when PUBLIC_DEPLOYMENT=true.");
  }
  if (isLocalOrPrivateHost(host) || isPlaceholderHost(host)) {
    throw new Error("NEXT_PUBLIC_SITE_URL must not use localhost, private IPs or placeholder domains when PUBLIC_DEPLOYMENT=true.");
  }
}

function assertInternalStagingSiteUrl(url: URL) {
  const host = url.hostname.toLowerCase().replace(/^\[(.*)\]$/, "$1");
  if (host === "localhost" || host.endsWith(".localhost")) {
    throw new Error("NEXT_PUBLIC_SITE_URL must not use localhost for production web builds; use the internal staging IP or a public domain.");
  }
  if (isPlaceholderHost(host)) {
    throw new Error("NEXT_PUBLIC_SITE_URL must not use placeholder domains for production web builds.");
  }
}

function isLocalOrPrivateHost(host: string) {
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "::1" || host === "0:0:0:0:0:0:0:1") return true;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return isPrivateIpv4(host);
  if (host.includes(":")) return true;
  return false;
}

function isPrivateIpv4(host: string) {
  const parts = host.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [first, second] = parts;
  return first === 10
    || first === 127
    || first === 0
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168);
}

function isPlaceholderHost(host: string) {
  return host.includes("replace-with")
    || host.includes("placeholder")
    || host.includes("example-sanitaetshaus")
    || host === "example.com"
    || host.endsWith(".example.com")
    || host.endsWith(".example")
    || host.endsWith(".invalid")
    || host.endsWith(".test")
    || host.endsWith(".local")
    || host.endsWith(".internal");
}
