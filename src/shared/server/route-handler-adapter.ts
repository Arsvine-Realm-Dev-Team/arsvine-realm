import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import type { NextApiRequest, NextApiResponse } from 'next';

type LegacyHandler = (request: NextApiRequest, response: NextApiResponse) => unknown | Promise<unknown>;
type HeaderValue = string | number | readonly string[];

interface RouteHandlerOptions {
  query?: Record<string, string>;
}

function parseCookies(rawCookie: string | null): Record<string, string> {
  if (!rawCookie) return {};
  return Object.fromEntries(rawCookie.split(';').flatMap((part) => {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (!rawName || rawValue.length === 0) return [];
    return [[rawName, decodeURIComponent(rawValue.join('='))]];
  }));
}

/**
 * Temporary server-only bridge used while Pages API modules are converted to Route Handlers.
 * It deliberately exposes only the NextApi surface used by this repository and keeps all
 * existing auth, rate-limit, and cache semantics in their audited server modules.
 */
export async function runLegacyApiHandler(
  handler: LegacyHandler,
  request: Request,
  options: RouteHandlerOptions = {},
): Promise<NextResponse> {
  const url = new URL(request.url);
  const headers = new Headers();
  let statusCode = 200;
  let body: unknown = null;

  let parsedBody: unknown = undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const contentType = request.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      try {
        parsedBody = await request.json();
      } catch {
        parsedBody = undefined;
      }
    }
  }

  const query = Object.fromEntries(url.searchParams.entries());
  Object.assign(query, options.query);
  const apiRequest = {
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    query,
    body: parsedBody,
    cookies: parseCookies(request.headers.get('cookie')),
    socket: { remoteAddress: request.headers.get('x-real-ip') ?? undefined },
  } as unknown as NextApiRequest;

  const apiResponse = {
    setHeader(name: string, value: HeaderValue) {
      headers.set(name, Array.isArray(value) ? value.join(', ') : String(value));
      return apiResponse;
    },
    getHeader(name: string) {
      return headers.get(name) ?? undefined;
    },
    status(code: number) {
      statusCode = code;
      return apiResponse;
    },
    json(value: unknown) {
      body = value;
      return apiResponse;
    },
    send(value: unknown) {
      body = value;
      return apiResponse;
    },
    async revalidate(path: string) {
      revalidatePath(path);
    },
  } as unknown as NextApiResponse;

  await handler(apiRequest, apiResponse);
  return NextResponse.json(body, { status: statusCode, headers });
}
