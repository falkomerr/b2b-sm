import {
  buildBackendApiUrl,
  createOrderAcceptanceGuardResponse,
  createBackendApiRequestHeaders,
  createBackendApiResponseHeaders,
} from "@/lib/backend-api-proxy";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

async function proxyRequest(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const url = buildBackendApiUrl(path, request.url);
  const method = request.method.toUpperCase();
  const orderAcceptanceGuardResponse = createOrderAcceptanceGuardResponse(method, path);

  if (orderAcceptanceGuardResponse) {
    return orderAcceptanceGuardResponse;
  }

  const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();

  const upstreamResponse = await fetch(url, {
    method,
    headers: createBackendApiRequestHeaders(request.headers),
    body,
    redirect: "manual",
    cache: "no-store",
  });

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: createBackendApiResponseHeaders(upstreamResponse.headers, path),
  });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
export const OPTIONS = proxyRequest;
export const HEAD = proxyRequest;
