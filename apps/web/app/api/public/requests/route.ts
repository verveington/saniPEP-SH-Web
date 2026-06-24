export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const backendBaseUrl = readBackendBaseUrl();
  if (!backendBaseUrl) {
    return Response.json({ error: "public_request_api_not_configured" }, { status: 503 });
  }

  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  const backendResponse = await fetch(`${backendBaseUrl.replace(/\/$/, "")}/api/public/requests`, {
    method: "POST",
    headers: {
      "content-type": request.headers.get("content-type") ?? "application/json",
      origin,
    },
    body: await request.text(),
    cache: "no-store",
  });

  const headers = new Headers({
    "cache-control": "no-store",
    "content-type": backendResponse.headers.get("content-type") ?? "application/json",
  });

  return new Response(await backendResponse.text(), {
    status: backendResponse.status,
    headers,
  });
}

function readBackendBaseUrl() {
  return process.env.PORTAL_BACKEND_BASE_URL
    ?? process.env.NEXT_PUBLIC_PORTAL_BACKEND_URL
    ?? (process.env.NODE_ENV === "development" ? "http://localhost:4100" : undefined);
}
