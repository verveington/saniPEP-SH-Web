const validateCurrentEnv = process.argv.includes("--validate-current-env");

assertSiteUrl(undefined, { nodeEnv: "development" }, "http://localhost:3000");
assertSiteUrl("http://localhost:3000", { nodeEnv: "development" }, "http://localhost:3000");
assertSiteUrlThrows(undefined, { nodeEnv: "production" }, "NEXT_PUBLIC_SITE_URL");
assertSiteUrl("http://10.0.60.13:3000", { nodeEnv: "production" }, "http://10.0.60.13:3000");
assertSiteUrl("https://10.0.60.13:3000", { nodeEnv: "production" }, "https://10.0.60.13:3000");
assertSiteUrlThrows("http://localhost:3000", { nodeEnv: "production" }, "localhost");
assertSiteUrlThrows("http://10.0.60.13:3000", { publicDeployment: "true" }, "public https URL");
assertSiteUrlThrows("https://localhost:3000", { publicDeployment: "true" }, "localhost");
assertSiteUrlThrows("https://replace-with-owned-web-staging-host.invalid", { publicDeployment: "true" }, "placeholder");
assertSiteUrlThrows("http://localhost:3000/path", { nodeEnv: "development" }, "without path");

if (validateCurrentEnv) {
  resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL, {
    nodeEnv: process.env.NODE_ENV ?? "production",
    publicDeployment: process.env.PUBLIC_DEPLOYMENT,
  });
}

console.log("Web site URL check passed");

function assertSiteUrl(value, context, expected) {
  const actual = resolveSiteUrl(value, context);
  if (actual !== expected) {
    throw new Error(`Expected ${expected}, got ${actual}`);
  }
}

function assertSiteUrlThrows(value, context, expectedMessagePart) {
  try {
    resolveSiteUrl(value, context);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes(expectedMessagePart)) {
      throw new Error(`Expected error to include ${expectedMessagePart}, got ${message}`);
    }
    return;
  }
  throw new Error(`Expected NEXT_PUBLIC_SITE_URL=${value ?? ""} to be rejected`);
}

function resolveSiteUrl(value, context) {
  const requiresConfiguredUrl = context.publicDeployment === "true" || context.nodeEnv === "production";
  const requiresPublicUrl = context.publicDeployment === "true";
  const rawValue = value?.trim();

  if (!rawValue) {
    if (requiresConfiguredUrl) {
      throw new Error("NEXT_PUBLIC_SITE_URL must be set for production or public web builds.");
    }
    return "http://localhost:3000";
  }

  let parsed;
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

function assertPublicSiteUrl(url) {
  const host = url.hostname.toLowerCase().replace(/^\[(.*)\]$/, "$1");
  if (url.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_SITE_URL must be a public https URL when PUBLIC_DEPLOYMENT=true.");
  }
  if (isLocalOrPrivateHost(host) || isPlaceholderHost(host)) {
    throw new Error("NEXT_PUBLIC_SITE_URL must not use localhost, private IPs or placeholder domains when PUBLIC_DEPLOYMENT=true.");
  }
}

function assertInternalStagingSiteUrl(url) {
  const host = url.hostname.toLowerCase().replace(/^\[(.*)\]$/, "$1");
  if (host === "localhost" || host.endsWith(".localhost")) {
    throw new Error("NEXT_PUBLIC_SITE_URL must not use localhost for production web builds; use the internal staging IP or a public domain.");
  }
  if (isPlaceholderHost(host)) {
    throw new Error("NEXT_PUBLIC_SITE_URL must not use placeholder domains for production web builds.");
  }
}

function isLocalOrPrivateHost(host) {
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "::1" || host === "0:0:0:0:0:0:0:1") return true;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return isPrivateIpv4(host);
  if (host.includes(":")) return true;
  return false;
}

function isPrivateIpv4(host) {
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

function isPlaceholderHost(host) {
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
